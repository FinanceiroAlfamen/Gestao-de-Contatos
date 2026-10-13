from pathlib import Path
from collections import Counter
from datetime import datetime,timedelta
import openpyxl,json
root=Path(__file__).resolve().parents[1]
expected={'BH':(215,1068,1283),'CAMPINAS':(107,375,482),'CURITIBA':(152,474,626),'POA':(118,484,602)}
staff={'KELVER':(114,412,526),'PEDRO':(2,2,4),'VILMAR':(99,654,753),'JOSEPH':(7,37,44),'LEANDRO':(100,338,438),'JEAN':(152,474,626),'HENRIQUE':(118,484,602)}
wb=openpyxl.load_workbook(root/'Base de Dados'/'dados 2026.xlsx',read_only=True,data_only=True)
clinics={},{}
by_clinic={};by_staff={};months=Counter();last=None
for row in wb.active.iter_rows(min_row=2,values_only=True):
    if not any(row):continue
    clinic,kind,situation,via,dt,conclusion,media,attendant,lead,ref=row
    if isinstance(dt,(int,float)):dt=datetime(1899,12,30)+timedelta(days=dt)
    elif isinstance(dt,str):
        try:dt=datetime.fromisoformat(dt[:10])
        except ValueError:
            import re
            parts=re.search(r'(\d+) de (\w+) de (\d+)',dt.lower());names=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];dt=datetime(int(parts[3]),names.index(parts[2])+1,int(parts[1]))
    months[dt.month]+=1;last=max(last,dt) if last else dt
    if dt.month==9:
        scheduled=situation=='AGENDADO'
        for target,key in [(by_clinic,clinic),(by_staff,attendant or 'SEM ATENDENTE')]:
            target.setdefault(key,[0,0,0]);target[key][0 if scheduled else 1]+=1;target[key][2]+=1
wb.close()
differences=[]
for label,actual,control in [('clínica',by_clinic,expected),('atendente',by_staff,staff)]:
    for name in set(actual)|set(control):
        if tuple(actual.get(name,[0,0,0]))!=control.get(name,(0,0,0)):differences.append({'tipo':label,'nome':name,'planilha':actual.get(name),'print':control.get(name)})
totals=[sum(values[i] for values in by_clinic.values()) for i in range(3)]
if totals!=[592,2401,2993]:differences.append({'tipo':'total','planilha':totals,'print':[592,2401,2993]})
result={'meses':dict(sorted(months.items())),'ultimo_contato':last.date().isoformat(),'setembro_clinicas':by_clinic,'setembro_atendentes':by_staff,'total_setembro':totals,'divergencias_print':differences,'fonte':'dados 2026.xlsx, leitura independente openpyxl; print usado somente como controle'}
(root/'verificacao'/'conferencia_setembro_2026.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(result,ensure_ascii=False))
if differences:raise SystemExit('Divergência entre a planilha e o print. Não corrigir números por substituição.')
if any(month>9 for month in months):raise SystemExit('Ainda há contatos após setembro na planilha.')
