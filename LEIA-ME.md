# Acompanhamento de leads AlfaMen

Abra **dashboard_leads.html** em um navegador. O arquivo gerado é autossuficiente e funciona sem internet: fontes, imagens, dados, histórico, reconciliação e PDFs estão incorporados. Use os filtros de ano, meses e clínica. No menu Meses, escolha um mês, vários meses separados ou Todos os meses. A comparação com 2025 usa exatamente os mesmos meses, incluindo o corte do último mês parcial. Ao desmarcar o último mês individual, o filtro volta a todos. As abas apresentam a rede, as clínicas, os atendentes e o método de cálculo. Os detalhes individuais se expandem ao clicar no nome. A impressão considera a aba ativa e expande seus detalhes.

O ícone de lua/sol alterna o modo claro/escuro e lembra a escolha quando o navegador permite armazenamento local. O zoom suave e a sombra estão aplicados aos cartões, rankings e tabelas. A preferência do sistema por movimento reduzido desativa animações. Os menus têm abertura em cascata e navegação por teclado. Cada tabela oferece busca, ordenação por coluna e cópia das linhas visíveis, mantendo os acumulados da seleção completa. A primeira ordenação das colunas de volume e taxa é decrescente; clicar novamente inverte a ordem.

No gráfico de evolução mensal, escolha leads recebidos, cotáveis, agendamentos ou comparecimentos. Na equipe, o filtro inicial exibe atendentes com volume igual ou superior à média dos atendentes nomeados na seleção de período, clínica e escopo. Mostrar todos os volumes restaura os demais, inclusive SEM ATENDENTE. Esse filtro altera apenas rankings e detalhes da equipe; os totais da rede continuam completos. Não significa vínculo, atividade atual ou qualidade do atendente.

Presença = comparecimentos ÷ agendamentos × 100. Conversão final = comparecimentos ÷ leads × 100. Nos cotáveis, numeradores e denominadores usam somente COTÁVEL. Os pareceres descrevem os números e o contexto da seleção, sem atribuir causas não demonstradas.

## Atualizar os dados

1. Atualize e salve `Base de Dados/dados 2025.xlsx` e `Base de Dados/dados 2026.xlsx`, mantendo as dez colunas e uma única aba de dados em cada arquivo.
2. Execute `ATUALIZAR_RELATORIO.cmd` com duplo clique.
3. Confira a mensagem de conclusão, recarregue o HTML e consulte **Método e conferência**.

Essas são as **únicas fontes de atualização dos indicadores**. O arquivo de contatos do Power BI não é lido, executado ou utilizado pelo gerador. O abastecimento das planilhas é uma etapa externa a este projeto. Os PDFs anteriores são referências históricas, nunca fontes para completar números faltantes.

O atualizador usa Python 3.10 ou superior, sem bibliotecas adicionais. O atalho tenta primeiro o Python incluído no ambiente Codex e depois o comando `py -3`. Em outro computador, instale Python e execute `python atualizar_relatorio.py` na pasta do projeto. Não é necessário Excel instalado. O relatório já gerado abre mesmo sem Python.

## Regras de cálculo

- Cada linha com REF única representa um contato. Não se presume que cada contato corresponda a uma pessoa diferente. Internet e offline entram nos totais.
- A data de contato define o período. O relatório mede os desfechos associados aos contatos desse período, sem afirmar que as consultas aconteceram no mesmo mês.
- Agendado: SITUAÇÃO = AGENDADO. Comparecimento: CONCLUSÃO = COMPARECEU entre os agendados.
- Cotável: LEAD = COTÁVEL. Numeradores de agendados e comparecimentos cotáveis recebem o mesmo filtro. NÃO COTÁVEL e VERIFICAR MOTIVO são categorias distintas.
- Agendamento = agendados/leads; conversão = comparecimentos/leads; presença = comparecimentos/agendados. Acumulados usam razões dos totais. Denominador zero é exibido como n.d.
- A última data disponível limita o mês mais recente. Na comparação anual, o ano anterior é cortado no mesmo dia. A cobertura observada não comprova fechamento. Não há base de 2024.
- Nenhum atendente é removido da base por suposta inatividade. O filtro inicial pode ocultar grupos de baixo volume na equipe, com opção para mostrar todos. Há filtro opcional dos 11 nomes do relatório anterior. SEM ATENDENTE preserva contatos sem responsável informado.
- Os rankings são descritivos. Carteira, perfil dos leads e tempo para conclusão não são controlados estatisticamente. Taxas com pouco volume exigem leitura conjunta da contagem.

## Conferência e preservação

O gerador valida cabeçalhos, categorias, ano, REF não vazia e não duplicada, e a soma dos desfechos. Problemas estruturais interrompem a atualização antes de substituir o HTML. Ocorrências conhecidas de qualidade são mantidas e exibidas com linha e REF para revisão na planilha. A auditoria JSON contém totais e SHA-256 das fontes. As planilhas originais não são modificadas.

`historico.html` preserva a transcrição completa dos 35 conteúdos de página e dá acesso aos PDFs originais. `verificacao/comparacao_historica.html` documenta a conferência inicial de 2.730 valores mensais das análises individuais, com 875 divergências frente à base atual. Essa conferência é uma fotografia da implantação, não uma auditoria que se atualiza ao clicar no atalho. Diferenças podem refletir revisões posteriores na base. Rankings e totais dos PDFs são preservados no acervo; a conferência de 2.730 valores refere-se especificamente às linhas mensais das análises individuais.

Os pareceres históricos contêm inconsistências internas, como POA em 15,1% na prosa versus 14,9% na tabela e numeradores gerais usados em alguns textos sobre cotáveis. O painel recalcula as análises; não propaga esses valores. Alegações de maturidade, disciplina ou causalidade permanecem como pareceres herdados no acervo, sem tratá-las como conclusões provadas.

## Identidade e manutenção

Paleta e tipografia Prompt vieram da identidade visual fornecida. O cabeçalho usa a mesma padronagem do projeto de boletos, confirmada no vídeo fornecido, com degradê e movimento do fundo. Os logotipos oficiais não recebem transformações. Há fontes Prompt Regular, Medium e Bold incorporadas, logotipo branco na tela e versão oficial para fundo claro na impressão. Tons de status e de contraste são complementos documentados em `DIAGNOSTICO_VISUAL.md`.

Edite `relatorio.template.html` para mudar a estrutura, `design.css`, `acentos.css` e `ajustes-finais.css` para a aparência e `interacoes.js` e `aprimoramento.js` para os controles, depois execute o atualizador. Os principais tokens de marca, temas, espaçamento, raio e movimento estão no início de `design.css`. Não edite apenas `dashboard_leads.html`, pois ele é regenerado. Para visualizar ou compartilhar basta o HTML; para atualizar, guarde o projeto completo. A versão anterior foi preservada em `versao-anterior`. `preparar_acervo.py` é uma ferramenta de implantação e usa pypdf e os caminhos das referências locais; não é necessária para atualizações rotineiras.

## Validação de apresentação

A estrutura responsiva e as regras de impressão estão implementadas. A inspeção visual interativa do HTML local não pôde ser concluída nesta execução: o navegador integrado bloqueou o protocolo file por política de segurança. Não houve tentativa de contornar esse bloqueio. A validação automatizada cobre cálculos, geração de seções e alterações dos filtros; a aparência final e a paginação impressa devem ser conferidas ao abrir o arquivo no navegador local.


As ocorrências da base incluem clínica, arquivo, linha Excel e REF. Variações positivas são verdes, negativas vermelhas e zero neutro; percentuais estão em negrito. Presença nos cabeçalhos é explicitamente sobre os agendados.


O título é GESTÃO DE CONTATOS, sem subtítulo. O rodapé é Diemes Felipe Corrêa • AlfaMen • Gestão de Contatos. No gráfico comparativo, os rótulos apresentam o ano anterior na linha superior e o atual na inferior; em pouco espaço alguns pares são omitidos, mantendo consulta de todos os valores nas barras. A aparência mais discreta e os percentuais dos cartões são ajustados em `equilibrio.css`.


Os rótulos atuais ficam acima de cada barra, na cor da série correspondente, sem empilhar os valores dos anos. O gráfico preserva uma largura mínima para todos os rótulos e permite rolagem horizontal quando necessário. O controle do tema fica antes da impressão, com indicação por mouse e foco do teclado.


Paleta dos gráficos: ano anterior cinza claro #D6DCE2; leads azul #168CF5; cotáveis verde vivo #18D568; agendamentos laranja AlfaMen #E7500F; comparecimentos azul-marinho oficial #14385B. Os nomes e as bordas das clínicas seguem a imagem fornecida: BH #168CF5, Campinas #082CBD, Curitiba #F26633 e POA #078633. Belo Horizonte e Porto Alegre recebem as mesmas cores de BH e POA. Nomes recebem fundo claro no tema escuro para preservar a leitura. Os rótulos usam somente a cor das barras e negrito, sem contorno ou sombra.


As barras do ano anterior permanecem cinza claro; somente seus rótulos usam cinza escuro no modo claro e cinza legível adaptado no modo escuro. Comparecimentos usam o azul-marinho oficial #14385B.


A base 2026 foi atualizada após o fechamento informado de janeiro a setembro; outubro foi retirado da fonte pelo responsável. Setembro foi conferido por clínica e atendente com o print fornecido. Os cartões iniciais apresentam participação por clínica em ordem decrescente, usando contagens do indicador selecionado, sem dados financeiros da imagem de referência. A dica aparece com mouse, foco do teclado ou toque. Os rótulos principais dos cartões e os rótulos à esquerda nas unidades estão em maiúsculas.
