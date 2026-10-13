from pathlib import Path
import hashlib, json, subprocess, sys
import openpyxl

root = Path(__file__).resolve().parents[1]
html = root / 'dashboard_leads.html'
before = hashlib.sha256(html.read_bytes()).hexdigest()
run = subprocess.run([sys.executable, '-X', 'utf8', 'atualizar_relatorio.py'], cwd=root, capture_output=True, text=True, encoding='utf-8')
if run.returncode:
    raise RuntimeError(run.stdout + run.stderr)
after = hashlib.sha256(html.read_bytes()).hexdigest()
if before != after:
    raise AssertionError('A regeneração idêntica alterou o HTML')
body = html.read_text(encoding='utf-8').split('const D=', 1)[1].split(';\nconst M=', 1)[0]
data = json.loads(body)
totals = {}
for year in (2025, 2026):
    book = openpyxl.load_workbook(root / 'Base de Dados' / f'dados {year}.xlsx', read_only=True, data_only=True)
    sheet = book.active
    rows = sheet.values
    header = next(rows)
    ref_index = header.index('REF')
    count, refs = 0, set()
    for row in rows:
        if any(row):
            count += 1
            refs.add(row[ref_index])
    book.close()
    control = next(x for x in data['checks'] if x['ano'] == year)
    assert count == control['leads'], (year, count, control['leads'])
    assert len(refs) == count == control['refs_unicas'], (year, len(refs), count)
    totals[year] = count
print(json.dumps({'byte_a_byte': before == after, 'contatos_reconciliados_com_excel': totals}, ensure_ascii=False))
