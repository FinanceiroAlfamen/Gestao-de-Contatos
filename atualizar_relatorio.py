"""Atualiza o HTML exclusivamente a partir de dados 2025.xlsx e dados 2026.xlsx.
Python 3.10+, apenas biblioteca padrão. Não abre Power BI nem PDFs.
"""
from pathlib import Path
from collections import Counter,defaultdict
from datetime import datetime,date,timedelta
import json,zipfile,xml.etree.ElementTree as ET,re,hashlib,base64,html as html_tools

ROOT=Path(__file__).resolve().parent
NS={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
MONTHS='janeiro fevereiro março abril maio junho julho agosto setembro outubro novembro dezembro'.split()
HEADERS=['CLÍNICA','TIPO','SITUAÇÃO','CONTATO VIA','DATA DO CONTATO','CONCLUSÃO','MÍDIA','ATENDENTE','LEAD','REF']

def read_xlsx(path):
    with zipfile.ZipFile(path) as z:
        strings=[]
        if 'xl/sharedStrings.xml' in z.namelist():
            strings=[''.join(x.itertext()) for x in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('s:si',NS)]
        sheets=[x for x in z.namelist() if re.fullmatch(r'xl/worksheets/sheet\d+\.xml',x)]
        if len(sheets)!=1: raise ValueError(f'{path.name}: esperada uma única aba de dados.')
        for row in ET.fromstring(z.read(sheets[0])).findall('.//s:sheetData/s:row',NS):
            vals=[None]*10
            for c in row:
                letters=re.match('[A-Z]+',c.attrib['r'])[0]; col=0
                for ch in letters: col=col*26+ord(ch)-64
                v=c.find('s:v',NS); typ=c.attrib.get('t')
                if typ=='s': value=strings[int(v.text)] if v is not None else None
                elif typ=='inlineStr': value=''.join(c.find('s:is',NS).itertext())
                else: value=v.text if v is not None else None
                if col<=10: vals[col-1]=value.strip() if isinstance(value,str) else value
                elif value is not None: raise ValueError('Coluna adicional não prevista: '+c.attrib['r'])
            yield int(row.attrib['r']),vals

def parse_date(value):
    m=re.search(r'(\d{1,2}) de (\w+) de (\d{4})',str(value).lower())
    if m: return date(int(m[3]),MONTHS.index(m[2])+1,int(m[1]))
    try: return date.fromisoformat(str(value)[:10])
    except ValueError: return date(1899,12,30)+timedelta(days=float(value))

def build():
    groups=defaultdict(Counter);sources=[];issues=[];checks=[]
    for year in [2025,2026]:
        path=ROOT/'Base de Dados'/f'dados {year}.xlsx'
        rows=iter(read_xlsx(path));_,header=next(rows)
        if header!=HEADERS: raise ValueError(f'Cabeçalhos alterados em {path.name}: {header}')
        refs=set(); dates=[];totals=Counter();count=0
        for line,row in rows:
            if not any(row):continue
            clinic,kind,situation,via,dt,conclusion,media,attendant,lead,ref=row
            dt=parse_date(dt)
            if dt.year!=year: raise ValueError(f'{path.name}, linha {line}: ano incorreto')
            if not ref or ref in refs: raise ValueError(f'{path.name}, linha {line}: REF vazia ou duplicada {ref}')
            refs.add(ref);dates.append(dt);count+=1
            if not clinic: raise ValueError(f'Clínica vazia na linha {line}')
            if situation not in ['AGENDADO','NÃO AGENDADO']:raise ValueError(f'Situação desconhecida na linha {line}')
            if lead not in ['COTÁVEL','NÃO COTÁVEL','VERIFICAR MOTIVO']:raise ValueError(f'Qualificação desconhecida na linha {line}')
            if conclusion not in [None,'COMPARECEU','NÃO COMPARECEU','CANCELOU','DEVOLUÇÃO','AGUARDANDO']:raise ValueError(f'Conclusão desconhecida na linha {line}')
            key=(dt.isoformat(),clinic,attendant or 'SEM ATENDENTE');g=groups[key]
            g['leads']+=1;totals['leads']+=1
            q=lead=='COTÁVEL';g['cotaveis']+=q;g['nao_cotaveis']+=lead=='NÃO COTÁVEL';g['verificar']+=lead=='VERIFICAR MOTIVO'
            scheduled=situation=='AGENDADO';g['agendados']+=scheduled;totals['agendados']+=scheduled
            g['ag_cot']+=scheduled and q
            status={'COMPARECEU':'compareceu','NÃO COMPARECEU':'faltou','CANCELOU':'cancelou','DEVOLUÇÃO':'devolucao','AGUARDANDO':'aguardando',None:'sem_conclusao'}[conclusion]
            if scheduled:
                g[status]+=1;totals[status]+=1
                g['comp_cot']+=q and conclusion=='COMPARECEU'
            if not scheduled and conclusion:
                issues.append({'arquivo':path.name,'clinica':clinic,'linha':line,'ref':ref,'motivo':f'{situation} com conclusão {conclusion}. Excluído dos desfechos de agenda; permanece em leads.'})
            if lead=='VERIFICAR MOTIVO':issues.append({'arquivo':path.name,'clinica':clinic,'linha':line,'ref':ref,'motivo':'Qualificação VERIFICAR MOTIVO, mantida separada de não cotável.'})
            if not attendant:issues.append({'arquivo':path.name,'clinica':clinic,'linha':line,'ref':ref,'motivo':'Atendente ausente; incluído em SEM ATENDENTE.'})
        assert totals['agendados']==sum(totals[k] for k in ['compareceu','faltou','cancelou','devolucao','aguardando','sem_conclusao'])
        sources.append({'arquivo':path.name,'linhas':count,'inicio':min(dates).isoformat(),'fim':max(dates).isoformat(),'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
        checks.append({'ano':year,**totals,'refs_unicas':len(refs)})
    fields=['leads','cotaveis','nao_cotaveis','verificar','agendados','compareceu','ag_cot','comp_cot','aguardando','cancelou','devolucao','faltou','sem_conclusao']
    data={'sources':sources,'issues':issues,'checks':checks,'fields':fields,'rows':[[*k,*[v[f] for f in fields]] for k,v in sorted(groups.items())]}
    output=ROOT/'dashboard_leads.html'
    html=(ROOT/'relatorio.template.html').read_text(encoding='utf-8').replace('__DATA__',json.dumps(data,ensure_ascii=False).replace('</','<\\/'))
    html=html.replace('__STYLES__','\n'.join((ROOT/name).read_text(encoding='utf-8-sig') for name in ['design.css','acentos.css','ajustes-finais.css','equilibrio.css','participacao.css'])).replace('__UI_SCRIPT__',(ROOT/'interacoes.js').read_text(encoding='utf-8')).replace('__REFINEMENT_SCRIPT__',(ROOT/'aprimoramento.js').read_text(encoding='utf-8')+'\n'+(ROOT/'participacao.js').read_text(encoding='utf-8'))
    def source_body(path):
        text=path.read_text(encoding='utf-8')
        return text[text.index('<h1>'):].replace('</html>','')
    html=html.replace('__HISTORY_BODY__',source_body(ROOT/'historico.html')).replace('__COMPARISON_BODY__',source_body(ROOT/'verificacao'/'comparacao_historica.html'))
    html=html.replace('__INSTRUCTIONS_BODY__','<pre>'+html_tools.escape((ROOT/'LEIA-ME.md').read_text(encoding='utf-8'))+'</pre>')
    # PDFs são incorporados apenas como acervo documental. Nenhum indicador lê seus números.
    pdfs={p.name:base64.b64encode(p.read_bytes()).decode('ascii') for p in (ROOT/'Base de Dados'/'HISTÓRICO - PROJETO ANTERIOR').glob('*.pdf')}
    html=html.replace('__PDF_DOCS__',json.dumps(pdfs,ensure_ascii=False))
    for asset in ['logo.png','logo-impressao.png','simbolo.png','padronagem-cabecalho.png','Prompt-Regular.ttf','Prompt-Medium.ttf','Prompt-Bold.ttf']:
        kind='font/ttf' if asset.endswith('.ttf') else 'image/png'
        uri='data:'+kind+';base64,'+base64.b64encode((ROOT/'assets'/asset).read_bytes()).decode('ascii')
        html=html.replace('assets/'+asset,uri)
    if re.search(r'__[A-Z_]+__',html):raise ValueError('Marcador de geração não substituído.')
    output.with_suffix('.tmp').write_text(html,encoding='utf-8');output.with_suffix('.tmp').replace(output)
    (ROOT/'verificacao'/'auditoria.json').write_text(json.dumps({k:v for k,v in data.items() if k!='rows'},ensure_ascii=False,indent=2),encoding='utf-8')
    print('Relatório atualizado:',output)
    print(json.dumps(checks,ensure_ascii=False));print(len(issues),'ocorrências registradas na auditoria.')

if __name__=='__main__':build()
