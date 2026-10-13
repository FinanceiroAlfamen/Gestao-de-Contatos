from pathlib import Path
from html.parser import HTMLParser
import json,re,base64,hashlib
root=Path(__file__).resolve().parents[1]
text=(root/'dashboard_leads.html').read_text(encoding='utf-8')
class Resources(HTMLParser):
    def __init__(self):super().__init__();self.resources=[];self.ids=[]
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if 'id' in a:self.ids.append(a['id'])
        if tag in ('img','script','link') and (a.get('src') or a.get('href')):self.resources.append(a.get('src') or a.get('href'))
p=Resources();p.feed(text)
assert all(x.startswith('data:') for x in p.resources),p.resources
assert len(p.ids)==len(set(p.ids)),'IDs duplicados no documento inicial'
css=(root/'design.css').read_text(encoding='utf-8')
for token in ['@media print','prefers-reduced-motion','focus-visible','1024px','768px','1440px']:
    assert token in css,token
assert re.search(r'@media\s*\(max-width:\s*600px\)',css),'Regra que cobre largura 360 ausente'
pdfs=json.loads(re.search(r'const PdfDocs=(\{.*?\});',text).group(1))
for name,content in pdfs.items():assert base64.b64decode(content)==(root/'Base de Dados'/'HISTÓRICO - PROJETO ANTERIOR'/name).read_bytes()
for asset in ['logo.png','logo-impressao.png','padronagem-cabecalho.png','Prompt-Regular.ttf','Prompt-Medium.ttf','Prompt-Bold.ttf']:
    assert base64.b64encode((root/'assets'/asset).read_bytes()).decode() in text,asset
def luminance(h):
    c=[int(h[i:i+2],16)/255 for i in (1,3,5)]
    c=[x/12.92 if x<=.04045 else ((x+.055)/1.055)**2.4 for x in c]
    return sum(x*y for x,y in zip(c,[.2126,.7152,.0722]))
def contrast(a,b):
    x,y=sorted([luminance(a),luminance(b)])
    return (y+.05)/(x+.05)
pairs=[('#203c50','#ffffff'),('#526c7c','#ffffff'),('#ad3a09','#ffffff'),('#edf4f7','#18364b'),('#bfd0da','#18364b'),('#ffac84','#18364b'),('#ffffff','#14385b')]
ratios=[round(contrast(a,b),2) for a,b in pairs]
assert all(r>=4.5 for r in ratios),ratios
result={'recursos_externos':0,'pdfs_originais_integralmente_incorporados':len(pdfs),'contraste_pares_principais':ratios,'regras_responsivas_e_impressao':'presentes; inspeção visual pendente','sha256_html':hashlib.sha256(text.encode()).hexdigest()}
(root/'verificacao'/'apresentacao.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(result,ensure_ascii=False))
