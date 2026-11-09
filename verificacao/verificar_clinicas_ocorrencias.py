from pathlib import Path
import json,openpyxl
root=Path(__file__).resolve().parents[1]
audit=json.loads((root/'verificacao'/'auditoria.json').read_text(encoding='utf-8'))
verified=0
for filename in {item['arquivo'] for item in audit['issues']}:
    targets={}
    for item in audit['issues']:
        if item['arquivo']==filename:targets.setdefault(item['linha'],[]).append(item)
    wb=openpyxl.load_workbook(root/'Base de Dados'/filename,read_only=True,data_only=True)
    for line,row in enumerate(wb.active.iter_rows(values_only=True),1):
        if line in targets:
            for item in targets[line]:
                assert row[0]==item['clinica'],(filename,line,item['clinica'],row[0])
                assert str(row[9])==str(item['ref']),(filename,line,'REF')
                verified+=1
    wb.close()
assert verified==len(audit['issues'])
print(json.dumps({'ocorrencias_com_clinica_e_REF_conferidas_na_planilha':verified,'linhas_distintas':len({(x['arquivo'],x['linha']) for x in audit['issues']})}))
