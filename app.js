'use strict';
(() => {
 const cards=window.EGE_CARDS||[];
 const $=id=>document.getElementById(id);
 const sections=[['all','Все подряд'],...Array.from({length:7},(_,i)=>[String(i+9),String(i+9)]),['stress','Ударения']];
 let pool=[],current=null,timer=null,locked=false,correct=0,wrong=0;
 const mistakes=new Map();
 const random=n=>Math.floor(Math.random()*n);
 function shuffle(items){const a=[...items];for(let i=a.length-1;i>0;i--){const j=random(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
 function solution(node,c){node.replaceChildren(document.createTextNode(c.before));const m=document.createElement('mark');m.textContent=c.spelling||c.answer;node.append(m,document.createTextNode(c.after));}
 function chooseNext(){
  clearTimeout(timer);timer=null;locked=false;
  if(!pool.length)return;
  // Uniform independent draws; exclude only the immediately preceding card.
  const available=pool.length>1?pool.filter(c=>c.id!==current?.id):pool;
  current=available[random(available.length)];
  const phrase=current.kind==='spelling'||current.kind==='join';
  $('instruction').textContent=phrase?'Выбери написание':'';
  $('instruction').hidden=!phrase;
  $('word').textContent=current.kind==='spelling'?(current.context||current.prompt):current.prompt;
  $('word').classList.toggle('sentence',phrase);
  $('word').classList.toggle('long',current.prompt.length>23||current.kind==='spelling');
  $('context').textContent=current.kind==='spelling'?'':current.context;
  $('feedback').textContent='';$('feedback').className='feedback';
  $('task-label').textContent=`Задание ${current.task}`;
  $('options').replaceChildren();
  (current.kind==='join'?current.options:shuffle(current.options)).forEach(value=>{const b=document.createElement('button');b.type='button';b.className='option'+((current.kind==='spelling'||current.kind==='join')?' phrase':'');b.textContent=value==='∅'?'нет буквы':value;b.dataset.value=value;b.addEventListener('click',()=>answer(value));$('options').append(b);});
 }
 function answer(value){
  if(locked||!current)return;locked=true;
  const good=value===current.answer;
  if(good)correct++;else{wrong++;if(!mistakes.has(current.id)){mistakes.set(current.id,current);const li=document.createElement('li'),w=document.createElement('div');w.className='mistake-word';solution(w,current);li.append(w);if(current.context){const s=document.createElement('small');s.textContent=current.context;li.append(s);}$('mistake-list').prepend(li);}$('empty').hidden=true;}
  $('correct').textContent=correct;$('wrong').textContent=wrong;
  for(const b of $('options').children){b.disabled=true;if(b.dataset.value===current.answer)b.classList.add('right');else if(b.dataset.value===value)b.classList.add('wrong');}
  solution($('word'),current);
  $('feedback').textContent=good?'Верно!':'Вы ошиблись.';$('feedback').className='feedback'+(good?'':' error');
  timer=setTimeout(chooseNext,good?600:1200);
 }
 function select(id){
  clearTimeout(timer);timer=null;current=null;locked=false;$('instruction').hidden=true;
  correct=wrong=0;mistakes.clear();$('correct').textContent='0';$('wrong').textContent='0';$('mistake-list').replaceChildren();$('empty').hidden=false;
  for(const b of $('sections').children)b.setAttribute('aria-pressed',String(b.dataset.section===id));
  const planned=id==='stress';document.querySelector('.ticket').classList.toggle('planned',planned);
  document.querySelector('.scores').hidden=planned;$('mistakes').hidden=planned;$('skip').hidden=planned;
  if(planned){pool=[];$('word').textContent='в разработке…';$('word').classList.remove('long','sentence');$('context').textContent='';$('options').replaceChildren();$('feedback').textContent='';$('task-label').textContent='Ударения';return;}
  pool=id==='all'?cards:cards.filter(c=>c.task===Number(id));
  if(!pool.length){$('word').textContent='Не удалось загрузить карточки';$('context').textContent='Проверьте, что файл cards.js находится рядом с index.html.';$('skip').hidden=true;return;}
  chooseNext();
 }
 sections.forEach(([id,label])=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.dataset.section=id;b.setAttribute('aria-label',/^\d+$/.test(id)?`Задание ${id}`:label);b.addEventListener('click',()=>select(id));$('sections').append(b);});
 $('skip').addEventListener('click',chooseNext);
 document.addEventListener('keydown',e=>{if(e.altKey||e.ctrlKey||e.metaKey||e.repeat||locked)return;const n=Number(e.key);if(n>=1&&n<=4){const b=$('options').children[n-1];if(b){e.preventDefault();b.click();}}});
 select('all');
})();
