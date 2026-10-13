// Participação usa o mesmo indicador, período e clínica dos cartões. Não usa os valores financeiros da referência.
function clinicParticipation(rs,metric){const denominator=total(rs)[metric];return group(rs,'clinic').map(unit=>({clinic:unit.name,value:unit[metric],share:denominator?unit[metric]/denominator*100:null})).sort((a,b)=>b.value-a.value||a.clinic.localeCompare(b.clinic));}
function bindParticipationTips(){
  if(typeof document.createElement!=='function')return;
  let tip=$('#participationTip');if(!tip){tip=document.createElement('div');tip.id='participationTip';tip.className='participation-tip hidden';tip.setAttribute('role','tooltip');document.body.append(tip);}
  let active=null;
  const close=()=>{tip.classList.add('hidden');active=null;};
  function open(card){
    active=card;const metric=card.dataset.kpiMetric,rs=subset(+$('#year').value,monthTo(),$('#clinic').value),units=clinicParticipation(rs,metric),denominator=total(rs)[metric];
    tip.innerHTML=`<div class="participation-title">PARTICIPAÇÃO POR CLÍNICA</div><div class="participation-metric">${METRICS[metric].label.toUpperCase()}</div>${units.map(unit=>`<div class="participation-row"><div class="participation-unit"><i style="background:${COLORS[unit.clinic]||'var(--brand-blue)'}"></i><span class="clinic-name" style="--clinic-color:${COLORS[unit.clinic]||'var(--brand-blue)'}">${esc(unit.clinic)}</span><b>${pct(unit.value,denominator)}</b></div><div class="participation-count">${n(unit.value)} de ${n(denominator)}</div></div>`).join('')||'<p>Nenhum registro nesta seleção.</p>'}<div class="participation-foot">Percentual sobre o total deste cartão, no período e nas clínicas selecionados.</div>`;
    tip.classList.remove('hidden');const rect=card.getBoundingClientRect(),box=tip.getBoundingClientRect(),vw=document.documentElement.clientWidth,vh=window.innerHeight;
    tip.style.left=Math.max(12,Math.min(vw-box.width-12,rect.left+(rect.width-box.width)/2))+'px';tip.style.top=Math.max(12,Math.min(vh-box.height-12,rect.bottom+10))+'px';
  }
  document.querySelectorAll('[data-kpi-metric]').forEach(card=>{card.tabIndex=0;card.setAttribute('aria-describedby','participationTip');card.addEventListener('pointerenter',event=>{if(event.pointerType!=='touch')open(card)});card.addEventListener('pointerleave',event=>{if(event.pointerType!=='touch')close()});card.addEventListener('focus',()=>open(card));card.addEventListener('blur',close);card.addEventListener('click',()=>open(card));card.addEventListener('keydown',event=>{if(event.key==='Escape')close();});});
  if(!window.participationTipEvents){window.addEventListener('scroll',close,{passive:true});window.addEventListener('resize',close);window.addEventListener('beforeprint',close);window.participationTipEvents=true;}
  close();
}
