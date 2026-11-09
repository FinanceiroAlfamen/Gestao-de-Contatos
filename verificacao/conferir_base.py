"""Confere todos os grupos e indicadores do HTML com uma leitura independente das planilhas."""
from argparse import ArgumentParser
from collections import Counter, defaultdict
from datetime import date, datetime
from pathlib import Path
import hashlib
import json
import re

from openpyxl import load_workbook
from openpyxl.utils.datetime import from_excel

ROOT = Path(__file__).resolve().parents[1]
MONTHS = 'janeiro fevereiro março abril maio junho julho agosto setembro outubro novembro dezembro'.split()
STATUS = {'COMPARECEU': 'compareceu', 'NÃO COMPARECEU': 'faltou', 'CANCELOU': 'cancelou', 'DEVOLUÇÃO': 'devolucao', 'AGUARDANDO': 'aguardando', None: 'sem_conclusao'}


def extract(path):
    return json.loads(path.read_text(encoding='utf-8').split('const D=', 1)[1].split(';\nconst M=', 1)[0])


def day(value, epoch):
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    if isinstance(value, (float, int)):
        return from_excel(value, epoch).date()
    match = re.search(r'(\d+) de (\w+) de (\d{4})', value.lower())
    if match:
        return date(int(match[3]), MONTHS.index(match[2]) + 1, int(match[1]))
    return date.fromisoformat(value[:10])


data = extract(ROOT / 'dashboard_leads.html')
parser = ArgumentParser(description=__doc__)
parser.add_argument('--baseline', type=Path, help='HTML anterior para comparar revisões históricas')
args = parser.parse_args()
embedded = {tuple(r[:3]): r[3:] for r in data['rows']}
assert len(embedded) == len(data['rows'])
groups, monthly, october_clinics, october_staff = (defaultdict(Counter) for _ in range(4))
issues = Counter()
for year in (2025, 2026):
    path = ROOT / 'Base de Dados' / f'dados {year}.xlsx'
    book = load_workbook(path, read_only=True, data_only=True)
    refs, dates = set(), []
    for line, row in enumerate(book.active.values, 1):
        if not any(row) or (row[4], row[9]) == ('DATA DO CONTATO', 'REF'):
            continue
        clinic, _, situation, _, dt, outcome, _, staff, qualification, ref = [v.strip() if isinstance(v, str) else v for v in row]
        dt = day(dt, book.epoch)
        assert dt.year == year and ref is not None and ref != '' and ref not in refs, (year, line)
        refs.add(ref)
        dates.append(dt)
        counts = Counter(leads=1)
        counts[{'COTÁVEL': 'cotaveis', 'NÃO COTÁVEL': 'nao_cotaveis', 'VERIFICAR MOTIVO': 'verificar'}[qualification]] += 1
        if situation == 'AGENDADO':
            counts.update(['agendados', STATUS[outcome]])
            if qualification == 'COTÁVEL':
                counts['ag_cot'] += 1
                counts['comp_cot'] += outcome == 'COMPARECEU'
        else:
            assert situation == 'NÃO AGENDADO'
        issues[year, line] += sum((not staff, qualification == 'VERIFICAR MOTIVO', situation != 'AGENDADO' and bool(outcome)))
        groups[dt.isoformat(), clinic, staff or 'SEM ATENDENTE'].update(counts)
        monthly[dt.isoformat()[:7]].update(counts)
        if (year, dt.month) == (2026, 10):
            october_clinics[clinic].update(counts)
            october_staff[staff or 'SEM ATENDENTE'].update(counts)
    book.close()
    source = next(s for s in data['sources'] if s['arquivo'] == path.name)
    assert (len(refs), min(dates).isoformat(), max(dates).isoformat(), hashlib.sha256(path.read_bytes()).hexdigest()) == (source['linhas'], source['inicio'], source['fim'], source['sha256'])
    annual = sum((v for k, v in monthly.items() if k.startswith(str(year))), Counter())
    check = next(c for c in data['checks'] if c['ano'] == year)
    assert len(refs) == check['refs_unicas']
    assert all(annual[field] == value for field, value in check.items() if field not in {'ano', 'refs_unicas'})
assert groups.keys() == embedded.keys()
for key, counts in groups.items():
    assert [counts[field] for field in data['fields']] == embedded[key], key
assert +issues == Counter((int(i['arquivo'][6:10]), i['linha']) for i in data['issues'])
result = {'grupos_reconciliados': len(groups), 'meses': dict(sorted(monthly.items())), 'outubro_por_clinica': october_clinics, 'outubro_por_atendente': october_staff, 'ocorrencias': len(data['issues'])}
if args.baseline:
    old = extract(args.baseline)
    old_groups = {tuple(r[:3]): r[3:] for r in old['rows']}
    cutoff = max(s['fim'] for s in old['sources'])
    historical = {k for k in embedded.keys() | old_groups.keys() if k[0] <= cutoff}
    changed = Counter(k[0][:7] for k in historical if embedded.get(k) != old_groups.get(k))
    result['grupos_historicos_alterados'] = dict(sorted(changed.items()))
(ROOT / 'verificacao' / 'conferencia_outubro_2026.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({'grupos_reconciliados': len(groups), 'outubro_2026': monthly['2026-10'], 'ocorrencias': len(data['issues'])}, ensure_ascii=False))
