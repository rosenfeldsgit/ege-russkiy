'use strict';
(() => {
 const cards=window.EGE_CARDS||[];
 const $=id=>document.getElementById(id);
 const sections=[['all','Все подряд'],...Array.from({length:7},(_,i)=>[String(i+9),String(i+9)]),['stress','Ударения']];
 let pool=[],current=null,timer=null,locked=false,correct=0,wrong=0;
 let selectedRows=new Set();
 const mistakes=new Map();
 const random=n=>Math.floor(Math.random()*n);
 function shuffle(items){const a=[...items];for(let i=a.length-1;i>0;i--){const j=random(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
 function solution(node,c){
  if(c.kind==='multirow'){node.textContent=c.solution||('Правильные строки: '+c.answer.join(', '));return;}
  node.replaceChildren(document.createTextNode(c.before||''));
  const m=document.createElement('mark');m.textContent=c.answer;node.append(m,document.createTextNode(c.after||''));
 }
 function renderMistake(c){
  const li=document.createElement('li'),w=document.createElement('div');w.className='mistake-word';
  if(c.kind==='multirow'){w.textContent=c.question+' · '+c.solution;}
  else solution(w,c);
  li.append(w);
  if(c.context){const s=document.createElement('small');s.textContent=c.context;li.append(s);}
  $('mistake-list').prepend(li);
 }
 function chooseNext(){
  clearTimeout(timer);timer=null;locked=false;selectedRows.clear();
  if(!pool.length)return;
  const available=pool.length>1?pool.filter(c=>c.id!==current?.id):pool;
  current=available[random(available.length)];
  const multi=current.kind==='multirow';
  const instruction=$('instruction');
  instruction.textContent=multi?current.prompt:(current.kind==='spelling'?'Выбери написание':'');
  instruction.hidden=!instruction.textContent;
  $('word').textContent=multi?current.question:(current.kind==='spelling'?(current.prompt||''):current.prompt);
  $('word').classList.toggle('long',multi||current.prompt.length>23||current.kind==='spelling');
  $('context').textContent=current.context||'';
  $('feedback').textContent='';$('feedback').className='feedback';
  $('task-label').textContent='Задание '+current.task;
  $('options').classList.toggle('multirow',multi);
  $('options').replaceChildren();
  $('check-answer').hidden=!multi;
  shuffle(current.options).forEach(item=>{
   const value=multi?item.value:item;
   const b=document.createElement('button');b.type='button';b.className='option'+(current.kind==='spelling'?' phrase':'');
   b.textContent=multi?item.value+') '+item.text:(value==='∅'?'нет буквы':value);b.dataset.value=value;
   b.addEventListener('click',()=>multi?toggleRow(value,b):answer(value));$('options').append(b);
  });
 }
 function record(isGood){
  locked=true;
  if(isGood)correct++;else{wrong++;if(!mistakes.has(current.id)){mistakes.set(current.id,current);renderMistake(current);}$('empty').hidden=true;}
  $('correct').textContent=correct;$('wrong').textContent=wrong;
  $('feedback').textContent=isGood?'Верно!':'Вы ошиблись.';
  $('feedback').className='feedback'+(isGood?'':' error');
  timer=setTimeout(chooseNext,isGood?650:1200);
 }
 function answer(value){
  if(locked||!current)return;
  const good=value===current.answer;
  for(const b of $('options').children){b.disabled=true;if(b.dataset.value===current.answer)b.classList.add('right');else if(b.dataset.value===value)b.classList.add('wrong');}
  solution($('word'),current);
  $('instruction').hidden=true;
  record(good);
 }
 function toggleRow(value,button){
  if(locked)return;
  if(selectedRows.has(value)){selectedRows.delete(value);button.classList.remove('selected');}
  else{selectedRows.add(value);button.classList.add('selected');}
 }
 function checkAnswer(){
  if(locked||!current||current.kind!=='multirow')return;
  const expected=[...current.answer].sort(),chosen=[...selectedRows].sort();
  const good=expected.length===chosen.length&&expected.every((v,i)=>v===chosen[i]);
  for(const b of $('options').children){
   const isRight=current.answer.includes(b.dataset.value),isChosen=selectedRows.has(b.dataset.value);
   b.disabled=true;b.classList.remove('selected');
   if(isRight)b.classList.add('right');else if(isChosen)b.classList.add('wrong');
  }
  $('instruction').hidden=true;
  $('word').textContent=current.solution;
  record(good);
 }
 function select(id){
  clearTimeout(timer);timer=null;current=null;locked=false;selectedRows.clear();
  correct=wrong=0;mistakes.clear();$('correct').textContent='0';$('wrong').textContent='0';$('mistake-list').replaceChildren();$('empty').hidden=false;
  for(const b of $('sections').children)b.setAttribute('aria-pressed',String(b.dataset.section===id));
  const planned=id==='stress';document.querySelector('.ticket').classList.toggle('planned',planned);
  document.querySelector('.scores').hidden=planned;$('mistakes').hidden=planned;$('skip').hidden=planned;
  $('check-answer').hidden=true;$('instruction').hidden=true;
  if(planned){pool=[];$('word').textContent='в разработке…';$('word').classList.remove('long');$('context').textContent='';$('options').replaceChildren();$('feedback').textContent='';$('task-label').textContent='Ударения';return;}
  pool=id==='all'?cards:cards.filter(c=>c.task===Number(id));
  if(!pool.length){$('word').textContent='Не удалось загрузить карточки';$('context').textContent='Проверьте, что файл cards.js находится рядом с index.html.';$('skip').hidden=true;return;}
  chooseNext();
 }
 sections.forEach(([id,label])=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.dataset.section=id;b.setAttribute('aria-label',/^\d+$/.test(id)?'Задание '+id:label);b.addEventListener('click',()=>select(id));$('sections').append(b);});
 $('skip').addEventListener('click',chooseNext);
 $('check-answer').addEventListener('click',checkAnswer);
 document.addEventListener('keydown',e=>{
  if(e.altKey||e.ctrlKey||e.metaKey||e.repeat||locked)return;
  const n=Number(e.key);if(n>=1&&n<=5){
   if(current?.kind==='multirow'){const b=[...$('options').children].find(x=>x.dataset.value===String(n));if(b){e.preventDefault();toggleRow(String(n),b);}}
   else if(n<=4){const b=$('options').children[n-1];if(b){e.preventDefault();b.click();}}
  }
  if(e.key==='Enter'&&current?.kind==='multirow'){e.preventDefault();checkAnswer();}
 });
 select('all');
})();