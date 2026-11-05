'use strict';
(() => {
 // ФИПИ, Орфоэпический список – 2026. Прописная гласная отмечает ударение.
 const stressWords = `аэропОрты бАнты бОроду бухгАлтеров вероисповЕдание водопровОд газопровОд граждАнство 
дефИс дешевИзна диспансЕр договорЁнность докумЕнт досУг еретИк жалюзИ 
знАчимость Иксы каталОг квартАл киломЕтр кОнусов корЫсть крАны 
кремЕнь кремнЯ лЕкторов лОктя локтЕй лыжнЯ мЕстностей намЕрение 
нЕдруг недУг некролОг нЕнависть нефтепровОд новостЕй нОгтя ногтЕй 
Отзыв отзЫв Отрочество партЕр портфЕль придАное призЫв свЁкла 
сирОты созЫв сосредотОчение срЕдства стАтуя столЯр тамОжня тОрты 
тУфля цемЕнт цЕнтнер цепОчка шАрфы шофЁр экспЕрт вернА 
знАчимый красИвее красИвейший кУхонный ловкА мозаИчный оптОвый прозорлИвый 
прозорлИва слИвовый бралА бралАсь взялА взялАсь влилАсь ворвалАсь 
воспринЯть воспринялА воссоздалА вручИт гналА гналАсь добралА добралАсь 
дождалАсь дозвонИтся дозИровать ждалА закУпорить занЯть зАнял занялА 
зАняли заперлА запломбировАть защемИт звалА звонИт кАшлянуть клАла 
клЕить крАлась кровоточИть лгалА лилА лилАсь наделИт надорвалАсь 
назвалАсь накренИтся налилА нарвалА начАть нАчал началА нАчали 
обзвонИт облегчИть облегчИт облилАсь обнялАсь обогналА ободралА ободрИть 
ободрИт ободрИться ободрИтся обострИть одолжИть одолжИт озлОбить оклЕить 
окружИт опОшлить освЕдомиться освЕдомится отбылА отдалА откУпорить отозвалА 
отозвалАсь перезвонИт перелилА плодоносИть пломбировАть повторИт позвалА позвонИт 
полилА положИть положИл понЯть понялА послАла прибЫть прИбыл 
прибылА прИбыли принЯть прИнял принялА прИняли рвалА сверлИт 
снялА создалА сорвалА убралА углубИть укрепИт чЕрпать щемИт 
щЁлкать довезЁнный зАгнутый зАнятый занятА зАпертый заселЁнный заселенА 
кровоточАщий нажИвший налИвший нанЯвшийся начАвший нАчатый низведЁнный облегчЁнный 
ободрЁнный обострЁнный отключЁнный повторЁнный поделЁнный понЯвший прИнятый принятА 
приручЁнный прожИвший снятА сОгнутый углублЁнный закУпорив начАв начАвшись 
отдАв понЯв прибЫв создАв вОвремя дОверху дОнизу дОсуха 
зАсветло надОлго ненадОлго`.trim().split(/\s+/);
 const stressCards = stressWords.map(form => {
   const position = form.search(/[АЕЁИОУЫЭЮЯ]/);
   const word = form.toLowerCase();
   const context = form === 'Отзыв' ? 'о книге' : form === 'отзЫв' ? 'посла из страны' : '';
   return { id: 'stress-' + form, task: 4, kind: 'stress', prompt: word,
     before: word.slice(0, position), after: word.slice(position + 1),
     spelling: word[position] + (word[position] === 'ё' ? '' : '\u0301'),
     answer: String(position), context };
 });
 const cards = [...(window.EGE_CARDS || []), ...stressCards];
 const $=id=>document.getElementById(id);
 const sections=[['all','Все подряд'],...Array.from({length:7},(_,i)=>[String(i+9),String(i+9)]),['stress','Ударение']];
 let pool=[],current=null,timer=null,locked=false,correct=0,wrong=0;
 const mistakes=new Map();
 const random=n=>Math.floor(Math.random()*n);
 function shuffle(items){const a=[...items];for(let i=a.length-1;i>0;i--){const j=random(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
 function solution(node,c){node.replaceChildren(document.createTextNode(c.before));const m=document.createElement('mark');m.textContent=c.spelling||c.answer;node.append(m,document.createTextNode(c.after));}
 function showStress(card) {
   const word = $('word');
   word.replaceChildren();
   const letters = [...card.prompt];
   const vowels = letters.filter(letter => /[аеёиоуыэюя]/.test(letter)).length;
   word.style.setProperty('--units', vowels * 1.5 + (letters.length - vowels) * 0.8);
   letters.forEach((letter, index) => {
     if (!/[аеёиоуыэюя]/.test(letter)) {
       word.append(document.createTextNode(letter));
       return;
     }
     const button = document.createElement('button');
     button.type = 'button';
     button.className = 'option vowel';
     button.dataset.value = String(index);
     button.textContent = letter === 'ё' ? 'е' : letter;
     button.setAttribute('aria-label', 'Ударение на ' + button.textContent + ', позиция ' + (index + 1));
     button.addEventListener('click', () => answer(button.dataset.value));
     word.append(button);
   });
 }
 function choices() {
   return (current?.kind === 'stress' ? $('word') : $('options')).querySelectorAll('button');
 }
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
  $('word').classList.toggle('stress-word', current.kind === 'stress');
  if (current.kind === 'stress') {
    showStress(current);
    return;
  }
  (current.kind==='join'?current.options:shuffle(current.options)).forEach(value=>{const b=document.createElement('button');b.type='button';b.className='option'+((current.kind==='spelling'||current.kind==='join')?' phrase':'');b.textContent=value==='∅'?'нет буквы':value;b.dataset.value=value;b.addEventListener('click',()=>answer(value));$('options').append(b);});
 }
 function answer(value){
  if(locked||!current)return;locked=true;
  const good=value===current.answer;
  if(good)correct++;else{wrong++;if(!mistakes.has(current.id)){mistakes.set(current.id,current);const li=document.createElement('li'),w=document.createElement('div');w.className='mistake-word';solution(w,current);li.append(w);if(current.context){const s=document.createElement('small');s.textContent=current.context;li.append(s);}$('mistake-list').prepend(li);}$('empty').hidden=true;}
  $('correct').textContent=correct;$('wrong').textContent=wrong;
  for(const b of choices()){b.disabled=true;if(b.dataset.value===current.answer)b.classList.add('right');else if(b.dataset.value===value)b.classList.add('wrong');}
  if (current.kind === 'stress') {
    const right = $('word').querySelector('.right');
    right.textContent = current.prompt[Number(current.answer)];
  } else solution($('word'),current);
  $('feedback').textContent=good?'Верно!':'Вы ошиблись.';$('feedback').className='feedback'+(good?'':' error');
  timer=setTimeout(chooseNext,good?600:1200);
 }
 function select(id){
  clearTimeout(timer);timer=null;current=null;locked=false;$('instruction').hidden=true;
  correct=wrong=0;mistakes.clear();$('correct').textContent='0';$('wrong').textContent='0';$('mistake-list').replaceChildren();$('empty').hidden=false;
  for(const b of $('sections').children)b.setAttribute('aria-pressed',String(b.dataset.section===id));
  pool = id === 'all' ? cards : id === 'stress' ? stressCards : cards.filter(c => c.task === Number(id));
  if(!pool.length){$('word').textContent='Не удалось загрузить карточки';$('context').textContent='Проверьте, что файл cards.js находится рядом с index.html.';$('skip').hidden=true;return;}
  chooseNext();
 }
 sections.forEach(([id,label])=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.dataset.section=id;b.setAttribute('aria-label',/^\d+$/.test(id)?`Задание ${id}`:label);b.addEventListener('click',()=>select(id));$('sections').append(b);});
 $('skip').addEventListener('click',chooseNext);
 document.addEventListener('keydown',e=>{if(e.altKey||e.ctrlKey||e.metaKey||e.repeat||locked)return;const n=Number(e.key);if(n>=1&&n<=9){const b=choices()[n-1];if(b){e.preventDefault();b.click();}}});
 select('all');
})();
