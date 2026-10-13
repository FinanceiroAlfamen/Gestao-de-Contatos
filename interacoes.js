// Camada de apresentação. Não altera registros, fórmulas, filtros ou fontes.
let tableSequence=0;
const reducedMotion=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches||false;
const storage={get(key){try{return localStorage.getItem(key)}catch{return null}},set(key,value){try{localStorage.setItem(key,value)}catch{}}};
let currentMotion='suave';
const themePreference=storage.get('alfamen-leads-theme');
let currentTheme=themePreference||((window.matchMedia?.('(prefers-color-scheme: dark)').matches)?'dark':'light');
document.documentElement.dataset.theme=currentTheme;
document.documentElement.dataset.motion=currentMotion;
let revealObserver=null,resizeObserver=null,counterFrames=new Map(),toastTimer=null;
const chartModels=new WeakMap();

function formatDate(value){return new Intl.DateTimeFormat('pt-BR',{timeZone:'UTC'}).format(new Date(value+'T12:00:00Z'))}
function table(headers,values,cls=''){
  const id='table-'+(++tableSequence),count=values.filter(r=>r[0]!=='Acumulado').length;
  const display=(value)=>/^\d{4}-\d{2}-\d{2}$/.test(String(value))?formatDate(value):String(value??'');
  headers=headers.map(h=>h==='% presença'?'% presença / agendados':h==='% presença cot.'?'% presença / agend. cot.':h);
  const cell=(value,index)=>{const heading=headers[index]||'',text=display(value),classes=[];if(heading==='Variação'){const v=numericValue(text);classes.push('variation-cell',v===null?'':v>0?'variation-positive':v<0?'variation-negative':'variation-neutral');}else if(text.includes('%')){classes.push('rate-cell',/presença/i.test(heading)?'rate-presence':/agend/i.test(heading)?'rate-scheduled':/convers/i.test(heading)?'rate-attended':'rate-qualified');}else if(/leads|cotáveis|agend|comparec|comp\. cot/i.test(heading)&&/^\d/.test(text)){classes.push('count-cell',/agend/i.test(heading)?'count-scheduled':/comparec|comp\. cot/i.test(heading)?'count-attended':/cotáveis/i.test(heading)?'count-qualified':'count-leads');}return `<td${classes.length?' class="'+classes.join(' ')+'"':''}>${esc(text)}</td>`;};
  return `<div class="report-table" data-table-id="${id}"><div class="table-tools no-print"><label class="table-search" for="search-${id}">Buscar nesta tabela<input id="search-${id}" type="search" data-table-search placeholder="Nome, mês ou valor" autocomplete="off"></label><div class="table-actions"><span class="table-count" aria-live="polite">${count} linhas</span><button class="copy-table" type="button" data-copy-table>Copiar tabela</button></div></div><div class="table-wrap" tabindex="0" aria-label="Tabela rolável de ${esc(headers[0])}"><table id="${id}" class="${cls}"><thead><tr>${headers.map((h,i)=>`<th scope="col" aria-sort="none"><button class="sort-control" type="button" data-sort-col="${i}" aria-label="Ordenar por ${esc(h)}">${esc(h)}</button></th>`).join('')}</tr></thead><tbody>${values.map((r,rowIndex)=>`<tr data-original-order="${rowIndex}"${r[0]==='Acumulado'?' class="total"':''}>${r.map(cell).join('')}</tr>`).join('')}${count?'':`<tr class="empty-row"><td colspan="${headers.length}">Nenhum registro nesta seleção.</td></tr>`}</tbody></table></div></div>`;
}

function trend(rs,y,m,c){
  const now=Array.from({length:m},(_,i)=>total(rs.filter(r=>r.month===i+1)).leads);
  const previous=y===2026?Array.from({length:m},(_,i)=>total(prior(y,m,c).filter(r=>r.month===i+1)).leads):[];
  return `<div class="legend">${y===2026?`<span style="--c:var(--previous-series)"><i></i>${y-1}</span>`:''}<span style="--c:var(--brand-blue)"><i></i>${y}</span></div><div class="chart-host" data-trend='${esc(JSON.stringify({year:y,now,previous}))}'><div class="chart-tip hidden" role="tooltip"></div></div>`;
}
function renderTrend(host){
  const model=JSON.parse(host.dataset.trend),labels=model.monthLabels||M,availableWidth=Math.round(host.getBoundingClientRect().width||750),valueWidth=Math.max(...[...model.now,...model.previous].map(v=>n(v).length*6.2),22)+10,width=Math.max(260,availableWidth,Math.ceil(model.now.length*(model.previous.length?2:1)*(valueWidth+6)+77)),height=availableWidth<480?260:300;
  const left=62,right=15,top=model.previous.length?52:36,bottom=51,plotHeight=height-top-bottom,plotWidth=width-left-right,step=plotWidth/model.now.length;
  const peak=Math.max(...model.now,...model.previous,1),unit=Math.pow(10,Math.floor(Math.log10(peak))),ceiling=Math.ceil(peak/unit)*unit;
  let svg=`<svg class="chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(model.label||'Leads recebidos')} por mês, ${model.year}${model.previous.length?' comparado com 2025':''}"><title>${esc(model.label||'Leads recebidos')} por mês</title><desc>${model.now.map((v,i)=>labels[i]+': '+n(v)+' em '+model.year).join('. ')}</desc><text x="${left}" y="12" font-size="11">VOLUME</text>`;
  for(let i=0;i<=3;i++){let value=ceiling*i/3,y=top+plotHeight-plotHeight*i/3;svg+=`<line x1="${left}" y1="${y}" x2="${width-right}" y2="${y}" stroke="var(--border)" stroke-width="1"/><text x="${left-10}" y="${y+4}" text-anchor="end" font-size="11">${n(Math.round(value))}</text>`;}
  const skip=width<480?Math.ceil(model.now.length/4):width<650?Math.ceil(model.now.length/7):1;
  const lineChart=model.type==='lines';
  if(lineChart){const series=model.previous.length?[model.previous,model.now]:[model.now];series.forEach((values,j)=>{const color=model.previous.length&&j===0?'var(--previous-series)':model.color||'var(--brand-blue)',path=values.map((value,i)=>`${i?'L':'M'} ${left+(i+.5)*step} ${top+plotHeight-value/ceiling*plotHeight}`).join(' ');svg+=`<path class="chart-series-line" d="${path}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;});}
  // Cada rótulo acompanha o mês e o valor da sua série.
  model.now.forEach((v,i)=>{
    const baseX=left+i*step,series=model.previous.length?[model.previous[i],v]:[v],slot=step/series.length,barWidth=Math.min(30,slot*.65);
    series.forEach((value,j)=>{const center=lineChart?baseX+step/2:baseX+slot*(j+.5),x=center-barWidth/2,h=value/ceiling*plotHeight,color=model.previous.length&&j===0?'var(--previous-series)':model.color||'var(--brand-blue)',year=model.previous.length&&j===0?model.year-1:model.year,pointY=top+plotHeight-h,close=lineChart&&series.length===2&&Math.abs(series[0]-series[1])/ceiling*plotHeight<30,labelY=pointY+(close&&j===1?20:-10),aria=`${labels[i]} ${year}: ${n(value)} ${esc(model.label||'contatos')}`;svg+=lineChart?`<circle cx="${center}" cy="${pointY}" r="4.5" fill="${color}" data-month="${i}" tabindex="0" aria-label="${aria}"/>`:`<rect x="${x}" y="${pointY}" width="${barWidth}" height="${h}" rx="3" fill="${color}" data-month="${i}" tabindex="0" aria-label="${aria}"/>`;svg+=`<text class="chart-data-label" data-label-year="${year}" x="${center}" y="${lineChart?labelY:pointY-8}" text-anchor="middle" style="fill:${model.previous.length&&j===0?'var(--muted)':color}!important" aria-label="${labels[i]} ${year}: ${n(value)}">${n(value)}</text>`;});
    if(i%skip===0||i===model.now.length-1)svg+=`<text x="${baseX+step/2}" y="${height-25}" text-anchor="middle" font-size="12">${labels[i].slice(0,3)}</text>`;
  });
  if(lineChart)svg+=`<line class="chart-month-guide" x1="0" x2="0" y1="${top}" y2="${top+plotHeight}" visibility="hidden" stroke="var(--chart-guide)" stroke-width="1.5" stroke-dasharray="5 5" pointer-events="none" aria-hidden="true"/>`;
  model.now.forEach((value,i)=>{svg+=`<rect class="chart-month-region" x="${left+i*step}" y="20" width="${step}" height="${height-20}" fill="transparent" pointer-events="all" data-month="${i}" aria-hidden="true"/>`;});
  svg+='</svg>';svg=svg.replace('class="chart-svg"','class="chart-svg" style="width:'+width+'px;min-width:'+width+'px"');
  const tip=host.querySelector('.chart-tip');
  host.querySelector('.chart-svg')?.remove();host.querySelector('.chart-label-note')?.remove();host.insertAdjacentHTML('afterbegin',svg);host.insertAdjacentHTML('beforeend',`<p class="chart-label-note">Valores ${lineChart?'junto a cada ponto':'acima de cada barra'}, nas cores de ${model.previous.length?`${model.year-1} e ${model.year}`:model.year}.${width>availableWidth?' Deslize o gráfico horizontalmente para ver todos os meses.':''}</p>`);
  chartModels.set(host,model);
  const guide=host.querySelector('.chart-month-guide'),hideTip=()=>{tip?.classList.add('hidden');guide?.setAttribute('visibility','hidden')};
  const marks=host.querySelectorAll('[data-month]');
  for(const mark of marks){
    const reveal=(event)=>{
      const i=+mark.dataset.month,area=host.getBoundingClientRect(),markBounds=mark.getBoundingClientRect(),monthX=left+(i+.5)*step;
      if(lineChart){guide?.setAttribute('x1',monthX);guide?.setAttribute('x2',monthX);guide?.setAttribute('visibility','visible');}
      const change=variation(model.now[i],model.previous[i]),changeValue=numericValue(change),changeColor=typeof changeValue==='number'&&changeValue!==0?(changeValue>0?'var(--rate-attended)':'var(--negative)'):'var(--muted)',currentColor=model.color||'var(--brand-blue)';
      tip.innerHTML=`<b>${labels[i]} · ${esc(model.label||'Leads')}</b>${model.previous.length?`<div class="line"><span style="color:var(--muted)">${model.year-1}</span><i style="color:var(--muted);font-weight:700">${n(model.previous[i])}</i></div>`:''}<div class="line"><span style="color:${currentColor};font-weight:700">${model.year}</span><i style="color:${currentColor};font-weight:700">${n(model.now[i])}</i></div>${model.previous.length?`<div class="line"><span>Variação</span><i style="color:${changeColor};font-weight:700">${change}</i></div>`:''}`;
      tip.classList.remove('hidden');let x=(event.clientX||markBounds.x+markBounds.width/2)-area.x;
      const scroll=host.scrollLeft||0;tip.style.left=(scroll+Math.max(4,Math.min(area.width-tip.offsetWidth-4,x+12)))+'px';tip.style.top=Math.max(12,Math.min(area.height-tip.offsetHeight-10,markBounds.y-area.y-30))+'px';
    };
    mark.addEventListener('pointerenter',reveal);mark.addEventListener('focus',reveal);
    mark.addEventListener('pointerleave',hideTip);mark.addEventListener('blur',hideTip);
    mark.addEventListener('keydown',event=>{if(event.key==='Escape')hideTip()});
    mark.addEventListener('click',reveal);
  }
}

function numericValue(text){
  const t=text.trim();if(t==='n.d.')return null;
  if(M.includes(t))return M.indexOf(t)+1;
  if(/^[+-]?\d[\d.\s]*(?:,\d+)?%?$/.test(t))return Number(t.replace(/\./g,'').replace(/\s|%/g,'').replace(',','.'));
  if(/^\d{2}\/\d{2}\/\d{4}$/.test(t)){const [d,m,y]=t.split('/');return Number(y+m+d)}
  return t.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
}
function updateTableSearch(wrapper,query){
  const normalized=query.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
  let visible=0;const table=wrapper.querySelector('table');
  for(const tr of table.tBodies[0].rows){if(tr.classList.contains('empty-row')||tr.classList.contains('search-empty'))continue;const searchable=tr.textContent.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');const keep=tr.classList.contains('total')||searchable.includes(normalized);tr.hidden=!keep;if(keep&&!tr.classList.contains('total'))visible++;}
  wrapper.querySelector('.table-count').textContent=`${visible} linhas${query?' encontradas':''}`;
  let empty=table.querySelector('.search-empty');if(!visible&&query&&!empty){empty=table.tBodies[0].insertRow();empty.className='search-empty';const cell=empty.insertCell();cell.colSpan=table.tHead.rows[0].cells.length;cell.textContent='Nenhuma linha corresponde à busca.';}else if(visible||!query)empty?.remove();
}
function sortTable(wrapper,column,th){
  const previousDirection=th.getAttribute('aria-sort'),tableHeader=th.textContent||'',isChronological=column===0||/data|contato/i.test(tableHeader),direction=previousDirection==='ascending'?'descending':previousDirection==='descending'?'ascending':isChronological?'ascending':'descending',factor=direction==='ascending'?1:-1;
  const table=wrapper.querySelector('table'),body=table.tBodies[0],list=[...body.rows].filter(r=>!r.classList.contains('total')&&!r.classList.contains('empty-row')&&!r.classList.contains('search-empty'));
  list.sort((a,b)=>{let av=numericValue(a.cells[column].textContent),bv=numericValue(b.cells[column].textContent);if(av===null)return bv===null?0:1;if(bv===null)return -1;let cmp=typeof av==='number'&&typeof bv==='number'?av-bv:String(av).localeCompare(String(bv),'pt-BR',{numeric:true});return cmp*factor||(+a.dataset.originalOrder-+b.dataset.originalOrder);});
  const fixed=body.querySelector('.total')||body.querySelector('.search-empty');for(const r of list)body.insertBefore(r,fixed);
  for(const cell of table.tHead.rows[0].cells)cell.setAttribute('aria-sort','none');th.setAttribute('aria-sort',direction);
}
async function copyText(text){
  try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(text);}else{const box=document.createElement('textarea');box.value=text;box.style.position='fixed';box.style.opacity='0';document.body.append(box);box.select();if(!document.execCommand('copy'))throw Error('clipboard');box.remove();}toast('Tabela copiada com cabeçalhos e linhas visíveis.');}catch{toast('A cópia foi bloqueada pelo navegador. Selecione a tabela para copiar.');}
}
function toast(message){clearTimeout(toastTimer);$('#toast').textContent=message;$('#toast').classList.remove('hidden');toastTimer=setTimeout(()=>$('#toast').classList.add('hidden'),4000)}

// Contadores são somente uma transição visual. O valor final sempre corresponde ao cálculo original.
function animateCounters(){
  finishCounters();
  const values=[$('#cards')?.querySelectorAll('strong')].filter(Boolean).flatMap(x=>[...x]);
  for(const node of values){
    const target=Number(node.textContent.replace(/\./g,'').replace(',','.'));if(!Number.isFinite(target))continue;
    node.dataset.finalValue=String(target);node.setAttribute('aria-label',n(target));
    if(reducedMotion()||typeof requestAnimationFrame==='undefined')continue;
    const start=performance.now(),from=Math.round(target*.78),duration=680;
    function frame(time){const p=Math.min(1,(time-start)/duration),eased=1-Math.pow(1-p,3);node.textContent=n(Math.round(from+(target-from)*eased));if(p<1&&node.isConnected)counterFrames.set(node,requestAnimationFrame(frame));else{node.textContent=n(target);counterFrames.delete(node)}}
    counterFrames.set(node,requestAnimationFrame(frame));
  }
}
function finishCounters(){for(const [node,id] of counterFrames){cancelAnimationFrame(id);if(node.dataset.finalValue)node.textContent=n(+node.dataset.finalValue)}counterFrames.clear();}
function revealVisible(){
  const section=$('#'+view);if(!section||reducedMotion())return;
  if(typeof IntersectionObserver==='undefined')return;
  if(!revealObserver)revealObserver=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){entry.target.classList.remove('reveal-pending');entry.target.classList.add('reveal-in');revealObserver.unobserve(entry.target)}},{threshold:.04});
  section.querySelectorAll('.panel').forEach((node,i)=>{if(node.dataset.revealed)return;node.dataset.revealed='true';node.classList.add('reveal-pending');node.style.transitionDelay=Math.min(i*40,120)+'ms';revealObserver.observe(node)});
}
function show(v){
  view=v;['overview','clinics','staff','method'].forEach(id=>{const active=id===v;$('#'+id).classList.toggle('hidden',!active);$('#'+id).setAttribute('aria-hidden',String(!active));});
  document.querySelectorAll('nav button').forEach(b=>{const active=b.dataset.view===v;b.classList.toggle('active',active);b.setAttribute('aria-selected',String(active));b.setAttribute('aria-pressed',String(active));b.tabIndex=active?0:-1;});
  $('#cards').classList.toggle('hidden',v==='method');revealVisible();
  if(v==='overview')document.querySelectorAll('.chart-host').forEach(renderTrend);
}
function enhanceUI(){
  document.querySelectorAll('a[href="historico.html"]').forEach(a=>{a.href='#';a.removeAttribute('target');a.dataset.archive='history';});
  document.querySelectorAll('a[href="verificacao/comparacao_historica.html"]').forEach(a=>{a.href='#';a.removeAttribute('target');a.dataset.archive='comparison';});
  document.querySelectorAll('a[href="LEIA-ME.md"]').forEach(a=>{a.href='#';a.dataset.archive='instructions';});
  if(+$('#year').value===2025){const caption=$('#overview .chart-host')?.closest('.panel')?.querySelector('.sub');if(caption)caption.textContent='Volume de contatos por mês. A base de 2024 não foi fornecida.';}
  animateCounters();revealVisible();
  if(typeof ResizeObserver!=='undefined'){
    resizeObserver?.disconnect();resizeObserver=new ResizeObserver(entries=>{for(const entry of entries){if(entry.target.matches('.chart-host'))renderTrend(entry.target);else document.documentElement.style.setProperty('--header-height',entry.target.getBoundingClientRect().height+'px');}});
    document.querySelectorAll('.chart-host,.brand-header').forEach(el=>resizeObserver.observe(el));
  }
  if(!reducedMotion()&&typeof requestAnimationFrame!=='undefined')document.querySelectorAll('#overview .bar i').forEach(bar=>{bar.style.transform='scaleX(0)';requestAnimationFrame(()=>requestAnimationFrame(()=>bar.style.transform='scaleX(1)'));});
}
function openArchive(kind){
  const content={history:$('#embeddedHistory'),comparison:$('#embeddedComparison'),instructions:$('#embeddedInstructions')}[kind];
  if(!content)return;$('#archiveContent').innerHTML=content.innerHTML;$('#archiveTitle').textContent={history:'Relatórios e pareceres anteriores',comparison:'Reconciliação histórica',instructions:'Como atualizar o relatório'}[kind];
  for(const link of $('#archiveContent').querySelectorAll('a')){
    const filename=link.getAttribute('href')?.split('/').pop();
    if(PdfDocs[filename]){const bytes=Uint8Array.from(atob(PdfDocs[filename]),c=>c.charCodeAt(0));link.href=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));link.target='_blank';link.rel='noopener';}
    else if(/dashboard_leads\.html$/.test(link.getAttribute('href')||'')){link.href='#';link.addEventListener('click',event=>{event.preventDefault();$('#archiveDialog').close();});}
  }
  $('#archiveDialog').showModal();standardizeClinicNames();
}
function refreshTheme(){document.documentElement.dataset.theme=currentTheme;const button=$('#themeToggle');button.setAttribute('aria-pressed',String(currentTheme==='dark'));const themeLabel=currentTheme==='dark'?'Ativar modo claro':'Ativar modo noturno';button.setAttribute('aria-label',themeLabel);$('#themeHint').textContent=themeLabel;button.innerHTML=currentTheme==='dark'?'<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.4 1.4m11.2 11.2L19 19M5 19l1.4-1.4M17.6 6.4 19 5"/></svg>':'<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M20.6 14A9 9 0 0 1 10 3.4 9 9 0 1 0 20.6 14Z"/></svg>';}
refreshTheme();
$('#themeToggle').addEventListener('click',()=>{currentTheme=currentTheme==='light'?'dark':'light';storage.set('alfamen-leads-theme',currentTheme);refreshTheme();});
document.querySelectorAll('[data-close-dialog]').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
document.addEventListener('input',event=>{if(event.target.matches('[data-table-search]'))updateTableSearch(event.target.closest('.report-table'),event.target.value)});
document.addEventListener('click',event=>{
  const sort=event.target.closest('[data-sort-col]');if(sort){sortTable(sort.closest('.report-table'),+sort.dataset.sortCol,sort.closest('th'));return}
  const copy=event.target.closest('[data-copy-table]');if(copy){const table=copy.closest('.report-table').querySelector('table'),text=[...table.rows].filter(r=>!r.hidden&&!r.classList.contains('search-empty')).map(r=>[...r.cells].map(c=>c.textContent.trim()).join('\t')).join('\n');copyText(text);return}
  const archive=event.target.closest('[data-archive]');if(archive){event.preventDefault();openArchive(archive.dataset.archive);}
});
$('#reportNavigation').addEventListener('keydown',event=>{const buttons=[...document.querySelectorAll('nav button')],index=buttons.indexOf(document.activeElement);let next;if(event.key==='ArrowRight')next=(index+1)%buttons.length;else if(event.key==='ArrowLeft')next=(index+buttons.length-1)%buttons.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=buttons.length-1;else return;event.preventDefault();show(buttons[next].dataset.view);buttons[next].focus();});
window.addEventListener('scroll',()=>$('#backTop').classList.toggle('hidden',window.scrollY<450),{passive:true});$('#backTop').addEventListener('click',()=>window.scrollTo({top:0,behavior:reducedMotion()?'instant':'smooth'}));
window.addEventListener('beforeprint',finishCounters);
document.addEventListener('toggle',event=>{if(event.target.tagName==='DETAILS'&&event.target.open)event.target.querySelectorAll('.reveal-pending').forEach(el=>el.classList.remove('reveal-pending'))},true);
