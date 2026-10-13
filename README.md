# Gestão de Contatos — AlfaMen

Relatório: https://financeiroalfamen.github.io/Gestao-de-Contatos/

Dashboard autossuficiente, com filtros, rankings, evolução mensal em barras/linhas, modo noturno e impressão completa ou por aba.

## Atualizar

1. Atualize somente `Base de Dados/dados 2025.xlsx` e `Base de Dados/dados 2026.xlsx`.
2. Execute `python atualizar_relatorio.py`.
3. Copie `dashboard_leads.html` para `index.html`.
4. Confira com `node verificacao/validar_html.cjs` e publique as alterações na branch `main`.

O GitHub Actions publica somente `index.html` no GitHub Pages. As planilhas e os PDFs originais ficam preservados como fontes do projeto. Consulte `LEIA-ME.md` para as definições dos indicadores.