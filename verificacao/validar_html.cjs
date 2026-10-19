const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync('dashboard_leads.html', 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
if (scripts.length !== 1) throw new Error(`Esperado um script, encontrados ${scripts.length}`);
new vm.Script(scripts[0][1]);
const match = html.match(/const D=(\{[\s\S]*?\});\s*const M=/);
if (!match) throw new Error('Dados incorporados ausentes');
const d = JSON.parse(match[1]);
if (d.rows.length === 0 || d.sources.length !== 2) throw new Error('Dados/fontes ausentes');
for (const [y, rows] of [[2025, d.rows.filter(r => r[0].startsWith('2025-'))], [2026, d.rows.filter(r => r[0].startsWith('2026-'))]]) {
  const t = rows.reduce((a, r) => a + r[3 + d.fields.indexOf('leads')], 0);
  const check = d.checks.find(x => x.ano === y);
  if (t !== check.leads) throw new Error(`${y}: ${t} linhas agregadas versus ${check.leads} leads de controle`);
}
if (html.includes('__DATA__')) throw new Error('Placeholder de geração');
for (const path of ['assets/logo.png', 'assets/simbolo.png', 'assets/Prompt-Regular.ttf', 'assets/Prompt-Medium.ttf', 'historico.html', 'verificacao/comparacao_historica.html']) if (!fs.existsSync(path)) throw new Error(`Arquivo relacionado ausente: ${path}`);
class Element {
  constructor(id) { this.id=id; this.dataset={};this.style={setProperty(){}}; this._html=''; this._text=''; this.listeners={}; this.attrs={}; this.classList={set:new Set(),toggle:(x,on)=>on?this.classList.set.add(x):this.classList.set.delete(x),contains:x=>this.classList.set.has(x),add:x=>this.classList.set.add(x),remove:x=>this.classList.set.delete(x)}; this.value=id==='year'?'2026':id==='clinic'?'':id==='team'?'all':''; }
  set innerHTML(v){this._html=v;if(this.id==='month'){const o=[...v.matchAll(/<option value="(\d+)"([^>]*)>/g)];this.value=(o.find(x=>x[2].includes('selected'))||o[0]||[])[1]||'';}}
  get innerHTML(){return this._html;}
  set textContent(v){this._text=v;}
  get textContent(){return this._text;}
  addEventListener(k,fn){this.listeners[k]=fn;}
  setAttribute(k,v){this.attrs[k]=v;}
  getAttribute(k){return this.attrs[k];}
  querySelectorAll(){return [];}
  querySelector(){return null;}
  showModal(){this.open=true;}
  close(){this.open=false;}
  click(){this.listeners.click?.();}
}
const elements=new Map(), element=id=>{if(!elements.has(id))elements.set(id,new Element(id));return elements.get(id);};
const nav=['overview','clinics','staff','method'].map(v=>{const e=new Element('nav');e.dataset={view:v};return e;});
const document={documentElement:new Element('root'),addEventListener(){},querySelector:s=>s.includes(' ')?null:element(s.replace(/^#/,'')),querySelectorAll:s=>s==='nav button'?nav:[]};
const win={listeners:{},addEventListener(k,fn){this.listeners[k]=fn;},print(){}};
const context=vm.createContext({document,window:win,Intl,Date,Math,Number,Set,setTimeout,clearTimeout});
vm.runInContext(scripts[0][1],context);
if (!element('overview').innerHTML.includes('Evolução mensal')) throw new Error('Visão da rede não foi montada');
if (!element('method').innerHTML.includes('REF únicas')) throw new Error('Conferência não foi montada');
element('year').value='2025';element('year').listeners.change();
if (!element('context').textContent.includes('2025') || element('context').textContent.includes('Comparação até')) throw new Error('Corte/período anual incorreto');
element('year').value='2026';element('year').listeners.change();element('clinic').value='BH';element('clinic').listeners.change();
if (!element('clinics').innerHTML.includes('Desempenho por clínica')) throw new Error('Visão por clínica não responde aos filtros');
nav.find(x=>x.dataset.view==='staff').listeners.click();
if (element('staff').classList.contains('hidden')) throw new Error('Navegação da equipe não funciona');
element('themeToggle').click();if(document.documentElement.dataset.theme!=='dark')throw Error('Tema escuro');
element('themeToggle').click();if(document.documentElement.dataset.theme!=='light')throw Error('Tema claro');
for(const [input,expected] of [['31.266',31266],['19,9%',19.9],['06/10/2026',20261006],['n.d.',null]])if(vm.runInContext(`numericValue(${JSON.stringify(input)})`,context)!==expected)throw Error('Ordenação brasileira: '+input);
if(!vm.runInContext("table(['Data'],[['2026-10-06']])",context).includes('06/10/2026'))throw Error('Data brasileira');
if(vm.runInContext("trend(subset(2025,10,''),2025,10,'')",context).includes('2024'))throw Error('Série inexistente de 2024');
element('clinic').value='';vm.runInContext('selectedMonths=[3,6];draw()',context);
const range=vm.runInContext("subset(2026,6,'')",context);if(range.some(r=>![3,6].includes(r.month))||!range.length)throw Error('Intervalo de meses');
const priorRange=vm.runInContext("prior(2026,6,'')",context);if(priorRange.some(r=>![3,6].includes(r.month)))throw Error('Comparação do mesmo intervalo');
if(element('overview').innerHTML.includes('<td>Janeiro</td>')||!element('overview').innerHTML.includes('<td>Março</td>'))throw Error('Tabela do intervalo');
for(const metric of ['leads','cotaveis','agendados','compareceu']){
  vm.runInContext(`chartMetric=${JSON.stringify(metric)};draw()`,context);
  const markup=vm.runInContext("trend(subset(2026,6,''),2026,6,'')",context);
  const json=markup.match(/data-trend='([^']+)'/)[1].replace(/&quot;/g,'"');const model=JSON.parse(json);
  if(model.now.length!==2||model.monthLabels[0]!=='Março')throw Error('Meses no gráfico');
  const sum=range.reduce((a,r)=>a+r[metric],0);if(model.now.reduce((a,b)=>a+b,0)!==sum)throw Error('Indicador no gráfico: '+metric);
}
vm.runInContext("chartMetric='leads';volumeScope='main';draw()",context);const limited=element('staff').innerHTML;
vm.runInContext("volumeScope='all';draw()",context);const all=element('staff').innerHTML;
if(!limited.includes('grupos e')||all.includes('grupos e'))throw Error('Alternância do volume da equipe');
vm.runInContext('setMonths();draw()',context);if(vm.runInContext('total(subset(2026,monthTo(),"")).leads',context)!==d.checks.find(x=>x.ano===2026).leads)throw Error('Todos os meses');
vm.runInContext('selectedMonths=[6];draw()',context);if(vm.runInContext('subset(2026,6,"").some(r=>r.month!==6)',context))throw Error('Mês individual');vm.runInContext('setMonths();draw()',context);
if(html.includes('id="monthStart"')||html.includes('id="resetMonths"'))throw Error('Filtros antigos presentes');
if(html.includes('GESTÃO COMERCIAL')||html.includes('id="effectsPreview"')||html.includes('id="stamp"'))throw Error('Elementos removidos ainda presentes');
if(!element('overview').innerHTML.includes('Comparecimentos ÷ agendamentos × 100'))throw Error('Explicação de presença');
const previous=fs.readFileSync('versao-anterior/dashboard_leads.html','utf8').match(/const D=(\{[\s\S]*?\});\s*const M=/);
const original=JSON.parse(previous[1]);const comparable=JSON.parse(JSON.stringify(d));comparable.issues.forEach(x=>delete x.clinica);if(JSON.stringify(original.rows.filter(r=>r[0].startsWith('2025-')))!==JSON.stringify(comparable.rows.filter(r=>r[0].startsWith('2025-'))))throw Error('Base 2025 alterada');if(d.issues.some(x=>!x.clinica))throw Error('Clínica ausente na ocorrência');
function row(name,value,total=false){const r=new Element('row');r._text=name+' '+value;r.cells=[{textContent:name},{textContent:value}];r.dataset.originalOrder=name==='Curitiba'?'0':'1';if(total)r.classList.add('total');return r;}
const rows=[row('Curitiba','1.234'),row('São Paulo','98'),row('Acumulado','1.332',true)];
const headings=[new Element('th'),new Element('th')];
const body={rows,querySelector:s=>s==='.total'?rows.find(r=>r.classList.contains('total')):null,insertBefore(r,anchor){rows.splice(rows.indexOf(r),1);rows.splice(anchor?rows.indexOf(anchor):rows.length,0,r);}};
const grid={tBodies:[body],tHead:{rows:[{cells:headings}]},querySelector(){return null;}};
const lineCount=new Element('count');const wrapper={querySelector:s=>s==='table'?grid:lineCount};
context.testWrapper=wrapper;context.testTh=headings[1];
vm.runInContext('sortTable(testWrapper,1,testTh)',context);
if(rows[0].cells[0].textContent!=='Curitiba'||rows[2].cells[0].textContent!=='Acumulado')throw Error('Ordenação decrescente e total fixo');
vm.runInContext('sortTable(testWrapper,1,testTh)',context);
if(rows[0].cells[0].textContent!=='São Paulo')throw Error('Ordenação crescente');
vm.runInContext("updateTableSearch(testWrapper,'sao')",context);
if(rows[0].hidden||!rows[1].hidden||rows[2].hidden||!lineCount.textContent.startsWith('1 linhas'))throw Error('Busca sem acentos');
vm.runInContext("updateTableSearch(testWrapper,'')",context);
if(rows.some(r=>r.hidden))throw Error('Limpeza de busca');
console.log('Busca sem acentos, ordenação crescente/decrescente e preservação do acumulado: OK.');
console.log('Base 2025 preservada; base 2026 atualizada; temas, seleção de meses, quatro indicadores, filtro de volume e ordenação verificados em DOM simulado.');
console.log(JSON.stringify({js:'compilado e executado',gruposDiarios:d.rows.length,fontes:d.sources.length,problemasAuditados:d.issues.length,abas:'rede, clínica, equipe e método',filtros:'2025, 2026 e clínica',sizeBytes:Buffer.byteLength(html)}));
const chartSample={year:2026,label:'Leads recebidos',now:Array.from({length:10},(_,i)=>1000+i*100),previous:Array.from({length:10},(_,i)=>1200+i*100),monthLabels:['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out']};
for(const width of [260,900]){const host={dataset:{trend:JSON.stringify(chartSample)},markup:'',getBoundingClientRect:()=>({width}),querySelector:()=>null,querySelectorAll:()=>[],insertAdjacentHTML(position,markup){this.markup+=markup}};context.chartHost=host;vm.runInContext('renderTrend(chartHost)',context);const labels=[...host.markup.matchAll(/<text class="chart-data-label"[^>]*>/g)];if(labels.length!==20)throw Error('Rótulos ausentes');const bars=[...host.markup.matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)"[^>]+fill="([^"]+)"/g)];if(bars.length!==labels.length)throw Error('Pares de barras e rótulos');labels.forEach((label,i)=>{const tag=label[0],x=+tag.match(/ x="([\d.]+)"/)[1],y=+tag.match(/ y="([\d.]+)"/)[1],bar=bars[i];if(Math.abs(x-(+bar[1]+ +bar[3]/2))>.001||y>=+bar[2]||!tag.includes('fill:'+(i%2===0?'var(--muted)':bar[4])))throw Error('Alinhamento ou cor do rótulo');});if(!host.markup.includes('>1.200</text>')||!host.markup.includes('>1.000</text>'))throw Error('Valores dos dois anos');}
console.log('Rótulos dos dois anos: valor, alinhamento sobre cada barra e cor conferidos.');

const colored=vm.runInContext("table(['Variação','% agend.','Compareceram','Agendados','Leads','% presença'],[['+10,0%','20,0%','100','200','1.000','50,0%'],['-5,0%','15,0%','50','100','800','50,0%']])",context);
for(const marker of ['variation-positive','variation-negative','rate-scheduled','count-attended','count-scheduled','count-leads','% presença / agendados'])if(!colored.includes(marker))throw Error('Destaque ausente: '+marker);

if(!html.includes('<h1>GESTÃO DE CONTATOS</h1>')||html.includes('<p class="header-subtitle">')||!html.includes('<footer>Diemes Felipe Corrêa • AlfaMen • Gestão de Contatos</footer>'))throw Error('Título ou rodapé');

if(html.indexOf('id="themeToggle"')>html.indexOf('id="print"')||!html.includes('id="themeHint"'))throw Error('Posição do tema ou dica');

for(const metric of ['leads','cotaveis','agendados','compareceu']){context.metricForTest=metric;const parts=vm.runInContext("clinicParticipation(subset(2026,monthTo(),''),metricForTest)",context);if(parts.some((p,i)=>i&&p.value>parts[i-1].value))throw Error('Ordem da participação');const sum=parts.reduce((a,p)=>a+p.value,0),target=vm.runInContext("total(subset(2026,monthTo(),''))[metricForTest]",context);if(sum!==target)throw Error('Total da participação');if(target&&Math.abs(parts.reduce((a,p)=>a+p.share,0)-100)>.000001)throw Error('Percentual da participação');}
if(d.rows.some(r=>r[0].startsWith('2026-')&&+r[0].slice(5,7)>9))throw Error('Outubro ainda na base');console.log('Participação dos quatro indicadores: ordem, contagens e percentuais conferidos.');
const tipCards=['leads','cotaveis','agendados','compareceu'].map(metric=>{const card=new Element('tip-card');card.dataset.kpiMetric=metric;return card});
Element.prototype.getBoundingClientRect=function(){return this.id==='participationTip'?{width:340,height:280}:{left:10,top:100,bottom:260,width:280,height:160}};
const savedQueryAll=document.querySelectorAll;document.querySelectorAll=s=>s==='[data-kpi-metric]'?tipCards:savedQueryAll(s);document.createElement=()=>new Element('created');document.documentElement.clientWidth=1000;win.innerHeight=900;
vm.runInContext('bindParticipationTips()',context);
for(const card of tipCards){card.listeners.pointerenter({pointerType:'mouse'});if(element('participationTip').classList.contains('hidden')||!element('participationTip').innerHTML.includes('PARTICIPAÇÃO POR CLÍNICA')||element('participationTip').innerHTML.includes('R$'))throw Error('Dica de participação');card.listeners.pointerleave({pointerType:'mouse'});if(element('participationTip').classList.contains('hidden'))throw Error('Dica fechou antes da travessia até o painel');card.listeners.focus();if(element('participationTip').classList.contains('hidden'))throw Error('Dica por teclado');card.listeners.keydown({key:'Escape'});if(!element('participationTip').classList.contains('hidden'))throw Error('Escape na dica');}
console.log('Dicas dos quatro cartões: mouse, foco e Escape conferidos em DOM simulado.');
for(const previous of [[],[1000,1000,800]]){
 const sample={year:2026,type:'lines',now:[1000,990,1200],previous,label:'Leads',color:'var(--metric-leads)',monthLabels:['Janeiro','Fevereiro','Março']};
 const host={dataset:{trend:JSON.stringify(sample)},markup:'',getBoundingClientRect:()=>({width:400}),querySelector:()=>null,querySelectorAll:()=>[],insertAdjacentHTML(position,markup){this.markup+=markup}};
 context.lineHost=host;vm.runInContext('renderTrend(lineHost)',context);
 const points=[...host.markup.matchAll(/<circle cx="([\d.]+)" cy="([\d.]+)"[^>]+fill="([^"]+)"/g)],labels=[...host.markup.matchAll(/<text class="chart-data-label"[^>]*>/g)],paths=[...host.markup.matchAll(/<path class="chart-series-line"/g)];
 if(paths.length!==(previous.length?2:1)||points.length!==sample.now.length*paths.length||labels.length!==points.length||host.markup.includes('<rect x='))throw Error('Séries e pontos das linhas');
 labels.forEach((label,i)=>{if(+label[0].match(/ x="([\d.]+)"/)[1]!==+points[i][1])throw Error('Mês desalinhado na linha');});
 if(previous.length){const y=labels.slice(0,2).map(label=>+label[0].match(/ y="([\d.]+)"/)[1]);if(Math.abs(y[0]-y[1])<25)throw Error('Rótulos próximos sobrepostos');}
}
vm.runInContext("chartType='lines';draw()",context);
if(!element('overview').innerHTML.includes('id="chartType"')||!element('overview').innerHTML.includes('&quot;type&quot;:&quot;lines&quot;')&&!element('overview').innerHTML.includes('"type":"lines"'))throw Error('Seleção de linhas');
vm.runInContext("chartType='bars';draw()",context);
console.log('Barras e linhas: seletor, séries dos dois anos, pontos mensais e afastamento de rótulos conferidos.');
for(const type of ['bars','lines']){
 const guide=new Element('guide'),tip=new Element('chart-tip'),mark=new Element('mark');mark.dataset.month='1';mark.getBoundingClientRect=()=>({x:200,y:100,width:10});
 const host={dataset:{trend:JSON.stringify({year:2026,type,now:[100,200],previous:[200,100],color:'var(--metric-attended)',monthLabels:['Jan','Fev']})},getBoundingClientRect:()=>({width:900,height:300,x:0,y:0}),querySelector:s=>s==='.chart-tip'?tip:s==='.chart-month-guide'?guide:null,querySelectorAll:()=>[mark],insertAdjacentHTML(){}};
 context.guideHost=host;vm.runInContext('renderTrend(guideHost)',context);mark.listeners.pointerenter({clientX:200});
 if((type==='lines'&&(guide.attrs.visibility!=='visible'||guide.attrs.x1!==guide.attrs.x2))||(type==='bars'&&guide.attrs.visibility==='visible')||!tip.innerHTML.includes('var(--metric-attended)')||!tip.innerHTML.includes('var(--rate-attended)'))throw Error('Guia e tooltip do mês');
 mark.listeners.pointerleave();if(guide.attrs.visibility!=='hidden')throw Error('Guia não ocultada');
 mark.listeners.focus({});mark.listeners.keydown({key:'Escape'});if(guide.attrs.visibility!=='hidden')throw Error('Guia por teclado');
}
if(!html.includes('--metric-attended:#70b7ff')||!html.includes('stroke-dasharray="5 5"'))throw Error('Contraste noturno ou tracejado');
console.log('Guia mensal nas barras e linhas: mouse, foco, saída e Escape conferidos; azul noturno presente.');

if(!html.includes('class="chart-month-region"')||!html.includes('height="'+'${height-20}'+'"'))throw Error('Regiões dos meses ausentes');
Element.prototype.showModal=function(){this.open=true};Element.prototype.close=function(){this.open=false};
const printDetail=new Element('print-detail');printDetail.open=false;const previousQueries=document.querySelectorAll;let printSelector='';
document.querySelectorAll=s=>{if(s.endsWith(' details')){printSelector=s;return [printDetail]}return previousQueries(s)};
vm.runInContext("show('staff')",context);element('print').listeners.click();
if(!element('printDialog').open||element('printTabName').textContent!=='Por atendente')throw Error('Janela ou aba de impressão');
vm.runInContext("printScope='all';preparePrint()",context);
if(document.documentElement.dataset.printScope!=='all'||printSelector!=='main section details'||!printDetail.open)throw Error('Preparação completa');
vm.runInContext('restorePrint()',context);if(printDetail.open||document.documentElement.dataset.printScope)throw Error('Restauração da impressão');
vm.runInContext("printScope='selected';preparePrint()",context);
if(printSelector!=='#staff details'||element('staff').attrs['data-print-selected']!=='true'||element('overview').attrs['data-print-selected']!=='false')throw Error('Impressão da aba');
vm.runInContext('restorePrint()',context);document.querySelectorAll=previousQueries;
console.log('Impressão: janela, nome da aba, escopo completo/selecionado e restauração dos detalhes conferidos.');
if(!html.includes('class="clinic-filter"')||!html.includes('class="year-filter"')||!html.includes('class="context hidden" hidden'))throw Error('Filtros ou contexto');
const head=html.slice(html.indexOf('<header class="brand-header"'),html.indexOf('</header>'));
if(!head.includes('id="print"')||!head.includes('id="themeToggle"')||head.includes('>Imprimir / salvar PDF</button>'))throw Error('Ícones do cabeçalho');
const navMarkup=html.slice(html.indexOf('<nav id="reportNavigation"'),html.indexOf('</nav>'));
if((navMarkup.match(/class="tab-icon"/g)||[]).length!==4||!navMarkup.includes('stroke="#00b69c"'))throw Error('Ícones das abas');
console.log('Navegação AlfaMen: filtros em dois níveis, quatro ícones, botões no cabeçalho e contexto oculto conferidos.');
vm.runInContext("$('#year').value='2026';$('#clinic').value='';selectedMonths=null;draw()",context);
const historyCheck=vm.runInContext(`(()=>{
 const current=subset(2026,9,''),old=prior(2026,9,''),ctx={kind:'monthly',rs:current,old,headers:['Mês','Leads ano atual','Leads ano anterior','Variação','% presença / agendados'],year:2026,clinic:'',months:chosenMonths()};
 const leads=historySeries(ctx,1,0),previous=historySeries(ctx,2,0),presence=historySeries(ctx,4,0);
 if(leads.points.length!==9||leads.points[8].value!==2993||leads.points.reduce((s,p)=>s+p.value,0)!==30870)throw Error('Histórico mensal de leads');
 if(previous.year!==2025||previous.points[8].value!==total(rows.filter(r=>r.year===2025&&r.month===9)).leads)throw Error('Ano anterior no histórico');
 const september=total(current.filter(r=>r.month===9));if(Math.abs(presence.points[8].value-september.compareceu/september.agendados*100)>.000001)throw Error('Taxa mensal de presença');
 const ranked={kind:'ranking',rs:current.filter(r=>r.month===9),key:'clinic',labels:['BH'],headers:['Clínica','Leads','Agendados'],year:2026,clinic:'',months:chosenMonths()};
 const bh=historySeries(ranked,1,0);if(bh.points.length!==9||bh.points[8].value!==1283||historySeries(ranked,2,0).points[8].value!==215)throw Error('Ranking deve recuperar o histórico da clínica');
 const qualified={...ranked,key:'staff',labels:['KELVER'],headers:['Atendente','Conversão cot.','% presença / agend. cot.']};
 const staff=historySeries(qualified,1,0),staffPresence=historySeries(qualified,2,0),t=total(current.filter(r=>r.staff==='KELVER'&&r.month===9));
 if(staff.points[8].value!==(t.cotaveis?t.comp_cot/t.cotaveis*100:null)||staffPresence.points[8].value!==(t.ag_cot?t.comp_cot/t.ag_cot*100:null))throw Error('Cotáveis do atendente');
 if(historyDelta(10,12,true).text!=='+2 p.p.'||historyDelta(null,12,false).text!=='n.d.')throw Error('Pontos percentuais ou ausência de base');
 if(!historyChart({...leads,points:[{month:1,value:null},{month:2,value:0},{month:3,value:10}]}).includes('>0</text>'))throw Error('Zero omitido');
 return {meses:leads.points.length,setembroRede:leads.points[8].value,setembroBH:bh.points[8].value};
})()`,context);
console.log('Históricos conferidos por fonte, ano, clínica, atendente e denominadores:',JSON.stringify(historyCheck));
if(!element('overview').innerHTML.includes('data-history=')||!element('clinics').innerHTML.includes('data-history=')||!element('staff').innerHTML.includes('data-history='))throw Error('Históricos ausentes nas abas');
const historyEvents={};document.addEventListener=(name,handler)=>historyEvents[name]=handler;
let renderedHistory=null;document.body={append:node=>{renderedHistory=node}};document.createElement=()=>new Element('history-created');Element.prototype.contains=function(node){return node===this};
win.tableHistoriesBound=false;vm.runInContext('bindTableHistories()',context);
const historyId=vm.runInContext("[...tableHistories].find(([id,c])=>c.kind==='monthly'&&c.headers[2]==='Leads ano atual')[0]",context);
const historyCell=new Element('history-cell');historyCell.dataset={history:historyId,historyCol:'2',historyRow:'0'};historyCell.closest=()=>historyCell;
historyEvents.focusin({target:historyCell});if(!renderedHistory||renderedHistory.classList.contains('hidden')||!renderedHistory.innerHTML.includes('VARIAÇÃO ENTRE MESES'))throw Error('Abertura do histórico por foco');
const stablePosition=renderedHistory.style.left+'|'+renderedHistory.style.top;historyEvents.focusin({target:historyCell});if(stablePosition!==renderedHistory.style.left+'|'+renderedHistory.style.top)throw Error('Tooltip se deslocou na mesma célula');
historyEvents.click({target:historyCell});renderedHistory.listeners.click({target:{closest:()=>({dataset:{historyAction:'expand'}})}});if(!renderedHistory.classList.contains('history-expanded'))throw Error('Ampliação do histórico');
historyEvents.keydown({key:'Escape',target:historyCell});if(!renderedHistory.classList.contains('hidden'))throw Error('Escape no histórico');
for(const card of tipCards){card.listeners.focus();if(parseFloat(element('participationTip').style.top)<card.getBoundingClientRect().bottom+10)throw Error('Participação deve ficar abaixo do cartão');card.listeners.blur();}
console.log('Tooltips: posição estável, participação abaixo do cartão, foco, fixação, ampliação e Escape conferidos.');
vm.runInContext('window.participationController.close()',context);
const participationTimers=new Map();let participationTimerId=0;context.setTimeout=fn=>{const id=++participationTimerId;participationTimers.set(id,fn);return id};context.clearTimeout=id=>participationTimers.delete(id);
const participationPanel=element('participationTip'),firstCard=tipCards[0],secondCard=tipCards[1];
firstCard.listeners.pointerenter({pointerType:'mouse'});const fixedBelow=participationPanel.style.top;
firstCard.listeners.pointerleave({pointerType:'mouse'});if(participationPanel.classList.contains('hidden')||participationTimers.size!==1)throw Error('Intervalo para alcançar tooltip');
participationPanel.listeners.pointerenter();if(participationTimers.size||participationPanel.classList.contains('hidden'))throw Error('Permanência dentro do tooltip');
firstCard.listeners.pointerenter({pointerType:'mouse'});if(participationPanel.style.top!==fixedBelow)throw Error('Tooltip moveu dentro do mesmo cartão');
firstCard.listeners.pointerleave({pointerType:'mouse'});secondCard.listeners.pointerenter({pointerType:'mouse'});if(participationTimers.size||participationPanel.classList.contains('hidden')||!participationPanel.innerHTML.includes('LEADS COTÁVEIS'))throw Error('Troca direta entre cartões');
participationPanel.listeners.pointerleave({relatedTarget:null});for(const fn of [...participationTimers.values()])fn();if(!participationPanel.classList.contains('hidden'))throw Error('Fechamento ao sair do conjunto');
context.setTimeout=setTimeout;context.clearTimeout=clearTimeout;
console.log('Cartões: tooltip fixo, passagem até o painel, permanência no painel e troca de indicador sem desaparecimento conferidos.');
