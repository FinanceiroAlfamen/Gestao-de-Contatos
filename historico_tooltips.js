// Históricos vinculados aos dados de cada tabela, sem ler valores formatados do DOM.
let tableHistoryContext=null,tableHistorySequence=0;
const tableHistories=new Map();
function withTableHistory(context,render){const previous=tableHistoryContext;tableHistoryContext=context;try{return render()}finally{tableHistoryContext=previous}}
const rankingWithoutHistory=ranking,monthlyWithoutHistory=monthly;
ranking=function(rs,key,cot=false){return withTableHistory({kind:'ranking',rs,key,cot},()=>rankingWithoutHistory(rs,key,cot))};
monthly=function(rs,old,m,mode){return withTableHistory({kind:'monthly',rs,old,mode},()=>monthlyWithoutHistory(rs,old,m,mode))};
function registerTableHistory(headers,values){
  if(!tableHistoryContext)return '';
  const id='history-'+(++tableHistorySequence);
  tableHistories.set(id,{...tableHistoryContext,headers,labels:values.map(row=>String(row[0]).replace(/^\d+\.\s*/,'')),year:+$('#year').value,clinic:$('#clinic').value,months:chosenMonths()});
  if(tableHistories.size>1500)tableHistories.delete(tableHistories.keys().next().value);
  return id;
}
function historyMetric(header){
  const fields={'Leads':'leads','Leads ano anterior':'leads','Leads ano atual':'leads','Cotáveis':'cotaveis','Não cotáveis':'nao_cotaveis','Verificar':'verificar','Agendados':'agendados','Agend. cot.':'ag_cot','Compareceram':'compareceu','Compareceu':'compareceu','Comp. cot.':'comp_cot','Aguardando':'aguardando','Cancelou':'cancelou','Devolução':'devolucao','Não comp.':'faltou','Sem conclusão':'sem_conclusao'};
  const ratios={'% cotáveis':['cotaveis','leads'],'% agend.':['agendados','leads'],'% agend. cot.':['ag_cot','cotaveis'],'Conversão final':['compareceu','leads'],'Conversão cot.':['comp_cot','cotaveis'],'% presença / agendados':['compareceu','agendados'],'% presença / agend. cot.':['comp_cot','ag_cot'],'% faltas':['faltou','agendados']};
  return fields[header]?{field:fields[header]}:ratios[header]?{ratio:ratios[header]}:header==='Variação'?{variation:true}:header==='Soma status'?{sum:true}:null;
}
function historySeries(context,column,rowIndex){
  const header=context.headers[column],metric=historyMetric(header);if(!metric)return null;
  let rs=context.rs,old=context.old||[],entity=context.clinic||'Rede completa';
  if(context.kind==='ranking'){
    const entityName=rowIndex>=0?context.labels[rowIndex]:null,names=new Set(context.labels);
    rs=rows.filter(r=>r.year===context.year&&(!context.clinic||r.clinic===context.clinic)&&context.months.includes(r.month)&&(entityName?r[context.key]===entityName:names.has(r[context.key])));
    entity=entityName||(context.key==='clinic'?'Clínicas do ranking':'Atendentes do ranking');
  }else{
    const clinics=[...new Set(rs.map(r=>r.clinic))],staff=[...new Set(rs.map(r=>r.staff))];
    if(staff.length===1)entity=staff[0];else if(clinics.length===1)entity=clinics[0];
  }
  const previous=header==='Leads ano anterior',year=previous?context.year-1:context.year;
  const points=context.months.map(month=>{
    const current=total(rs.filter(r=>r.month===month)),priorTotal=total(old.filter(r=>r.month===month));let value;
    if(previous)value=context.year===2025?null:priorTotal.leads;
    else if(metric.variation)value=priorTotal.leads?(current.leads-priorTotal.leads)/priorTotal.leads*100:null;
    else if(metric.ratio)value=current[metric.ratio[1]]?current[metric.ratio[0]]/current[metric.ratio[1]]*100:null;
    else if(metric.sum)value=['aguardando','cancelou','compareceu','devolucao','faltou','sem_conclusao'].reduce((sum,k)=>sum+current[k],0);
    else value=current[metric.field];
    return {month,value};
  });
  const color=COLORS[entity]||(previous?'var(--muted)':/agend/i.test(header)?'var(--metric-scheduled)':/compare|presença|convers/i.test(header)?'var(--metric-attended)':/cot/i.test(header)?'var(--metric-qualified)':'var(--metric-leads)');
  return {title:entity+' · '+header,header,entity,year,points,percent:!!(metric.ratio||metric.variation),color,months:context.months};
}
const historyNumber=(value,percent)=>value===null?'n.d.':percent?value.toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})+'%':n(value);
function historyChart(model){
  const width=900,height=255,left=58,right=22,top=34,bottom=53,plotH=height-top-bottom,plotW=width-left-right,values=model.points.map(p=>p.value).filter(v=>v!==null);
  const min=Math.min(0,...values),max=Math.max(1,...values),range=max-min,pad=range*.12,lo=min<0?min-pad:0,hi=max+pad,step=plotW/Math.max(1,model.points.length-1),x=i=>model.points.length===1?left+plotW/2:left+i*step,y=v=>top+(hi-v)/(hi-lo)*plotH;
  let svg=`<svg class="history-chart" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(model.title)}: evolução mensal em ${model.year}">`;
  for(let i=0;i<4;i++){const value=lo+(hi-lo)*i/3,cy=y(value);svg+=`<line x1="${left}" y1="${cy}" x2="${width-right}" y2="${cy}" stroke="var(--border)"/><text x="${left-9}" y="${cy+4}" text-anchor="end" fill="var(--muted)" font-size="10">${esc(historyNumber(value,model.percent))}</text>`;}
  let path='',continuing=false;model.points.forEach((point,i)=>{if(point.value===null){continuing=false;return}path+=`${continuing?'L':'M'}${x(i)},${y(point.value)} `;continuing=true});
  svg+=`<path d="${path}" fill="none" stroke="${model.color}" stroke-width="2.5" stroke-linejoin="round"/>`;
  model.points.forEach((point,i)=>{const px=x(i);svg+=`<line x1="${px}" x2="${px}" y1="${top}" y2="${height-bottom}" stroke="var(--border)" stroke-dasharray="3 5"/><text x="${px}" y="${height-17}" text-anchor="middle" font-size="11" fill="var(--muted)">${M[point.month-1].slice(0,3)}</text>`;if(point.value!==null)svg+=`<circle cx="${px}" cy="${y(point.value)}" r="4" fill="${model.color}"><title>${esc(M[point.month-1]+': '+historyNumber(point.value,model.percent))}</title></circle><text x="${px}" y="${y(point.value)-12}" text-anchor="middle" font-size="11" font-weight="700" fill="var(--text)">${esc(historyNumber(point.value,model.percent))}</text>`;});
  return svg+'</svg>';
}
function historyDelta(previous,current,percent){if(previous===null||current===null)return {text:'n.d.',tone:'neutral',note:'Sem base de comparação'};const delta=current-previous;return {text:(delta>0?'+':'')+(percent?delta.toLocaleString('pt-BR',{maximumFractionDigits:1})+' p.p.':n(delta)),tone:delta>0?'positive':delta<0?'negative':'neutral',note:delta>0?'Aumento':delta<0?'Redução':'Sem variação'};}
function historyContent(model){
  const comparisons=model.points.slice(1).map((point,i)=>{const previous=model.points[i],delta=historyDelta(previous.value,point.value,model.percent);return `<div class="history-delta"><b>${M[previous.month-1].slice(0,3)} → ${M[point.month-1].slice(0,3)}</b><strong class="history-${delta.tone}">${esc(delta.text)}</strong><small>${delta.note}</small></div>`}).join('');
  return `<div class="history-heading"><i style="background:${model.color}"></i><strong>${esc(model.title)}</strong></div><p class="history-sub">${model.year} · ${model.months.map(m=>M[m-1]).join(', ')} · ${model.percent?'Taxas calculadas mês a mês':'Volumes mensais'}.</p>${historyChart(model)}<div class="history-delta-title">VARIAÇÃO ENTRE MESES</div><div class="history-deltas">${comparisons||'<small>Apenas um mês selecionado.</small>'}</div><p class="history-foot">${model.percent?'Diferenças das taxas expressas em pontos percentuais.':'Diferenças expressas em quantidades.'} n.d. indica ausência de denominador. Clique na célula para fixar; Esc fecha.</p>`;
}
function bindTableHistories(){
  if(window.tableHistoriesBound)return;window.tableHistoriesBound=true;
  let tip=null,active=null,model=null,pinned=false,expanded=false,openTimer=null,closeTimer=null;
  function ensure(){if(tip)return tip;tip=document.createElement('div');tip.id='tableHistoryTip';tip.className='table-history-tip hidden';tip.setAttribute('role','dialog');tip.setAttribute('aria-label','Evolução mensal da tabela');document.body.append(tip);tip.addEventListener('pointerenter',()=>clearTimeout(closeTimer));tip.addEventListener('pointerleave',scheduleClose);tip.addEventListener('click',async event=>{const action=event.target.closest('[data-history-action]')?.dataset.historyAction;if(action==='close')close();if(action==='pin'){pinned=!pinned;updateButtons()}if(action==='expand'){expanded=!expanded;pinned=true;tip.classList.toggle('history-expanded',expanded);updateButtons()}if(action==='copy'){try{await copyHistoryImage(model);event.target.closest('button').setAttribute('title','Imagem copiada ou salva')}catch{event.target.closest('button').setAttribute('title','Não foi possível copiar a imagem')}}});return tip;}
  function updateButtons(){const button=tip.querySelector('[data-history-action="pin"]');button?.setAttribute('aria-pressed',String(pinned));button?.setAttribute('title',pinned?'Desafixar':'Fixar');tip.querySelector('[data-history-action="expand"]')?.setAttribute('aria-label',expanded?'Reduzir gráfico':'Ampliar gráfico');}
  function close(){clearTimeout(openTimer);clearTimeout(closeTimer);tip?.classList.add('hidden');tip?.classList.remove('history-expanded');active=null;model=null;pinned=false;expanded=false;}
  function scheduleClose(){clearTimeout(closeTimer);if(!pinned)closeTimer=setTimeout(close,220);}
  function open(cell,fix=false){clearTimeout(openTimer);clearTimeout(closeTimer);if(pinned&&cell!==active&&!fix)return;if(active===cell){if(fix){pinned=!pinned;updateButtons()}return}const context=tableHistories.get(cell.dataset.history);if(!context)return;const next=historySeries(context,+cell.dataset.historyCol,+cell.dataset.historyRow);if(!next)return;model=next;active=cell;pinned=fix;expanded=false;ensure();tip.classList.remove('history-expanded');tip.innerHTML=`<div class="history-actions"><button type="button" data-history-action="copy" title="Copiar como imagem" aria-label="Copiar como imagem">▣</button><button type="button" data-history-action="pin" title="Fixar" aria-label="Fixar tooltip" aria-pressed="${pinned}">⌖</button><button type="button" data-history-action="expand" title="Ampliar" aria-label="Ampliar gráfico">↗</button><button type="button" data-history-action="close" title="Fechar" aria-label="Fechar">×</button></div>${historyContent(model)}`;tip.classList.remove('hidden');const rect=cell.getBoundingClientRect(),box=tip.getBoundingClientRect(),vw=document.documentElement.clientWidth,vh=window.innerHeight;tip.style.left=Math.max(12,Math.min(vw-box.width-12,rect.left))+'px';tip.style.top=Math.max(12,Math.min(vh-box.height-12,rect.bottom+12))+'px';updateButtons();}
  document.addEventListener('pointerover',event=>{const cell=event.target.closest?.('[data-history]');if(!cell)return;clearTimeout(closeTimer);if(cell===active)return;clearTimeout(openTimer);openTimer=setTimeout(()=>open(cell),150)});
  document.addEventListener('pointerout',event=>{const cell=event.target.closest?.('[data-history]');if(cell&&!cell.contains(event.relatedTarget)){clearTimeout(openTimer);scheduleClose()}});
  document.addEventListener('focusin',event=>{const cell=event.target.closest?.('[data-history]');if(cell)open(cell)});
  document.addEventListener('focusout',event=>{if(event.target.closest?.('[data-history]')&&!tip?.contains(event.relatedTarget))scheduleClose()});
  document.addEventListener('click',event=>{const cell=event.target.closest?.('td[data-history]');if(cell)open(cell,true);else if(tip&&!tip.contains(event.target)&&!event.target.closest?.('th[data-history]'))close()});
  document.addEventListener('keydown',event=>{if(event.key==='Escape')close();if(event.key==='Enter'&&event.target.matches?.('td[data-history]')){event.preventDefault();open(event.target,true)}});
  document.addEventListener('change',event=>{if(!tip?.contains(event.target))close()});
  window.addEventListener('scroll',()=>{if(!pinned)close()},{passive:true});window.addEventListener('resize',close);window.addEventListener('beforeprint',close);
}
async function copyHistoryImage(model){
  const style=getComputedStyle(document.documentElement),resolve=text=>text.replace(/var\((--[\w-]+)\)/g,(_,key)=>style.getPropertyValue(key).trim()||'#14385b');
  const chart=historyChart(model).replace(/^<svg[^>]*>/,'').replace(/<\/svg>$/,'');
  const svg=resolve(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="510" viewBox="0 0 950 400"><rect width="950" height="400" fill="var(--surface)"/><g font-family="Arial,sans-serif"><text x="25" y="31" font-size="17" font-weight="700" fill="var(--text)">${esc(model.title)}</text><text x="25" y="55" font-size="12" fill="var(--muted)">${model.year} · Evolução mensal</text><g transform="translate(25,65)">${chart}</g><text x="25" y="350" font-size="11" fill="var(--muted)">${esc(model.points.map(p=>M[p.month-1].slice(0,3)+': '+historyNumber(p.value,model.percent)).join(' · '))}</text></g></svg>`);
  const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));
  try{const img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url});const canvas=document.createElement('canvas');canvas.width=1800;canvas.height=765;canvas.getContext('2d').drawImage(img,0,0,1800,765);const png=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(navigator.clipboard?.write&&typeof ClipboardItem!=='undefined')await navigator.clipboard.write([new ClipboardItem({'image/png':png})]);else{const link=document.createElement('a'),download=URL.createObjectURL(png);link.href=download;link.download='evolucao-mensal.png';link.click();setTimeout(()=>URL.revokeObjectURL(download),1000)}}finally{URL.revokeObjectURL(url)}
}
bindTableHistories();
