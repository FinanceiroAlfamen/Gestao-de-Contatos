// Participação usa o mesmo indicador, período e clínica dos cartões. Não usa os valores financeiros da referência.
function clinicParticipation(rs,metric){const denominator=total(rs)[metric];return group(rs,'clinic').map(unit=>({clinic:unit.name,value:unit[metric],share:denominator?unit[metric]/denominator*100:null})).sort((a,b)=>b.value-a.value||a.clinic.localeCompare(b.clinic));}
function bindParticipationTips(){
  if(typeof document.createElement!=='function')return;
  let tip=$('#participationTip');if(!tip){tip=document.createElement('div');tip.id='participationTip';tip.className='participation-tip hidden';tip.setAttribute('role','tooltip');document.body.append(tip);}
  if(window.participationController){window.participationController.bind();return;}
  let active=null,closeTimer=null;
  const cancelClose=()=>{clearTimeout(closeTimer);closeTimer=null;};
  const close=()=>{cancelClose();tip.classList.add('hidden');active=null;};
  const scheduleClose=event=>{const next=event?.relatedTarget;if(next&&(tip.contains(next)||active?.contains(next))){cancelClose();return;}cancelClose();closeTimer=setTimeout(close,320);};
  function open(card){
    cancelClose();if(active===card&&!tip.classList.contains('hidden'))return;
    active=card;const metric=card.dataset.kpiMetric,rs=subset(+$('#year').value,monthTo(),$('#clinic').value),units=clinicParticipation(rs,metric),denominator=total(rs)[metric];
    tip.innerHTML=`<div class="participation-title">PARTICIPAÇÃO POR CLÍNICA</div><div class="participation-metric">${METRICS[metric].label.toUpperCase()}</div>${units.map(unit=>`<div class="participation-row"><div class="participation-unit"><i style="background:${COLORS[unit.clinic]||'var(--brand-blue)'}"></i><span class="clinic-name" style="--clinic-color:${COLORS[unit.clinic]||'var(--brand-blue)'}">${esc(unit.clinic)}</span><b>${pct(unit.value,denominator)}</b></div><div class="participation-count">${n(unit.value)} de ${n(denominator)}</div></div>`).join('')||'<p>Nenhum registro nesta seleção.</p>'}<div class="participation-foot">Percentual sobre o total deste cartão, no período e nas clínicas selecionados.</div>`;
    tip.classList.remove('hidden');positionTooltip(tip,card.getBoundingClientRect(),{preferBelow:true,center:true});
  }
  const bind=()=>document.querySelectorAll('[data-kpi-metric]').forEach(card=>{if(card.dataset.participationBound)return;card.dataset.participationBound='true';card.tabIndex=0;card.setAttribute('aria-describedby','participationTip');card.addEventListener('pointerenter',event=>{if(event.pointerType!=='touch')open(card)});card.addEventListener('pointerleave',event=>{if(event.pointerType!=='touch')scheduleClose(event)});card.addEventListener('focus',()=>open(card));card.addEventListener('blur',scheduleClose);card.addEventListener('click',()=>open(card));card.addEventListener('keydown',event=>{if(event.key==='Escape')close();});});
  tip.addEventListener('pointerenter',cancelClose);tip.addEventListener('pointerleave',scheduleClose);
  document.addEventListener('pointermove',event=>{
    if(!active||active.contains(event.target))return;
    if(event.target.closest?.('button,a,input,select,summary,[data-history]')){close();return;}
    const box=tip.getBoundingClientRect();
    if(event.clientX>=box.left&&event.clientX<=box.right&&event.clientY>=box.top&&event.clientY<=box.bottom)cancelClose();
    else if(!closeTimer)scheduleClose();
  });
  tip.addEventListener('focusin',cancelClose);tip.addEventListener('focusout',scheduleClose);
  tip.addEventListener('keydown',event=>{if(event.key==='Escape')close()});
  window.addEventListener('scroll',close,{passive:true});window.addEventListener('resize',close);window.addEventListener('beforeprint',close);
  window.participationController={bind,close};bind();close();
}
