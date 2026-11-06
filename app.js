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
     spelling: word[position],
     answer: String(position), context };
 });
 const wordChoiceCards = [
   {
     "id": "task1-50641",
     "task": 1,
     "kind": "word-choice",
     "instruction": "Подберите притяжательное местоимение",
     "before": "Даль знал мысли и чаяния простых людей, ",
     "after": " психологию.",
     "answer": "их",
     "options": [
       "их",
       "его",
       "свою"
     ],
     "explanation": "Психологию чью? Простых людей → их. «Свою» относилось бы к самому Далю."
   },
   {
     "id": "task1-50675",
     "task": 1,
     "kind": "word-choice",
     "instruction": "Подберите условный союз",
     "before": "",
     "after": " человек высший смысл видит в куске прожаренного мяса, то ему подвиг Гумбольдта покажется вздорным сумасбродством.",
     "answer": "Если",
     "options": [
       "Если",
       "Хотя",
       "Поскольку"
     ],
     "explanation": "«Если …, то …» — условие и его следствие. «Хотя» выражает уступку, «поскольку» — причину."
   }
 ];
 const stableId = id => 200000 + [...id].reduce((hash, c) => (Math.imul(hash, 31) + c.codePointAt(0)) >>> 0, 0);
 const managed = window.EGE_MANAGED || {cards:[],disabled:[],tasks:{}};
 const overrides = new Map(managed.cards.map(c => [c.id,c]));
 const staticCards = [...wordChoiceCards, ...(window.EGE_ADAPTED_CARDS || []), ...(window.EGE_CARDS || []), ...stressCards, ...(window.EGE_PUNCTUATION || [])];
 const staticIds = new Set(staticCards.map(c=>c.id));
 const cards = [...staticCards,...managed.cards.filter(c=>!staticIds.has(c.id))].filter(c => !managed.disabled.includes(c.id)).map(c => overrides.get(c.id) || c).map(card => ({ ...card, displayId: card.displayId || stableId(card.id), maxPrimary: (managed.tasks[card.task] || window.EGE_EXAM_CONFIG.tasks[card.task] || {maxPrimary:1}).maxPrimary }));
 const $=id=>document.getElementById(id);
 const sections=[['all','Все подряд'],['1','1'],...Array.from({length:7},(_,i)=>[String(i+9),String(i+9)]),['stress','Ударение'],['punctuation','Пунктуация']];
 for (const task of Object.values(managed.tasks)) { if (!sections.some(s=>s[0]===String(task.number)) && cards.some(c=>c.task===task.number)) sections.splice(sections.length-2,0,[String(task.number),String(task.number)]); }
 let pool=[],current=null,timer=null,locked=false,correct=0,wrong=0;
 const mistakes=new Map();
 let selectedSlots = new Set();
 const random=n=>Math.floor(Math.random()*n);
 function shuffle(items){const a=[...items];for(let i=a.length-1;i>0;i--){const j=random(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
 function solution(node,c){if(c.kind === 'punctuation'){node.replaceChildren();c.parts.forEach((part,index)=>{node.append(document.createTextNode(part));if(index<c.parts.length-1){if(c.answer.includes(index)){const m=document.createElement('mark');m.textContent=c.mark==='—'?' —':c.mark;node.append(m);}node.append(document.createTextNode(' '));}});return;}node.replaceChildren(document.createTextNode(c.before));const m=document.createElement('mark');m.textContent=c.spelling||c.answer;node.append(m,document.createTextNode(c.after));}
 function addExplanation(item, word, card) {
   let hint = card.explanation || window.EGE_HINTS?.get(card.id);
   if (card.kind === 'stress' && !hint) {
     const syllable = (card.before.match(/[аеёиоуыэюя]/g) || []).length + 1;
     hint = 'Словарное ударение падает на ' + syllable + '-й слог: ' +
       card.before + card.spelling.toUpperCase() + card.after + '.';
   }
   if (!hint) return;
   const note = document.createElement('p');
   note.className = 'rule-note';
   note.id = 'rule-' + card.id;
   note.textContent = hint;
   note.hidden = true;
   const toggle = document.createElement('button');
   toggle.type = 'button';
   toggle.className = 'rule-toggle';
   toggle.textContent = 'ⓘ';
   toggle.setAttribute('aria-label', 'Пояснение к ' + (card.kind === 'punctuation' ? 'предложению' : 'слову «' + (card.kind === 'stress' ? card.prompt : card.spelling || card.before + card.answer + card.after) + '»') );
   toggle.setAttribute('aria-controls', note.id);
   toggle.setAttribute('aria-expanded', 'false');
   toggle.addEventListener('click', () => {
     note.hidden = !note.hidden;
     toggle.setAttribute('aria-expanded', String(!note.hidden));
   });
   word.append(toggle);
   item.append(note);
 }
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

 function showPunctuation(card) {
   const word = $('word');
   word.replaceChildren();
   selectedSlots = new Set();
   card.parts.forEach((part, index) => {
     word.append(document.createTextNode(part));
     if (index === card.parts.length - 1) return;
     const button = document.createElement('button');
     button.type = 'button';
     button.className = 'option punct-slot';
     button.dataset.value = String(index);
     button.textContent = '·';
     button.setAttribute('aria-label', ({',':'Запятая',':':'Двоеточие','—':'Тире'}[card.mark]) + ' после «' + part + '»');
     button.setAttribute('aria-pressed', 'false');
     button.addEventListener('click', () => {
       if (locked) return;
       if (selectedSlots.has(index)) selectedSlots.delete(index);
       else selectedSlots.add(index);
       const selected = selectedSlots.has(index);
       button.textContent = selected ? card.mark : '·';
       button.classList.toggle('selected', selected);
       button.setAttribute('aria-pressed', String(selected));
     });
     word.append(document.createTextNode(' '), button, document.createTextNode(' '));
   });
 }
 function choices() {
   return (['stress', 'punctuation'].includes(current?.kind) ? $('word') : $('options')).querySelectorAll('button');
 }
 function chooseNext(){
  clearTimeout(timer);timer=null;locked=false;
  if(!pool.length)return;
  // Uniform independent draws; exclude only the immediately preceding card.
  const available=pool.length>1?pool.filter(c=>c.id!==current?.id):pool;
  current=available[random(available.length)];
  const punctuation = current.kind === 'punctuation';
  const phrase=['spelling','join','word-choice'].includes(current.kind);
  $('instruction').textContent=current.instruction || (phrase?'Выбери написание':'');
  $('instruction').hidden=!(phrase || punctuation);
  $('check-answer').hidden=!punctuation;
  $('check-answer').disabled=false;
  $('word').classList.toggle('punctuation-word', punctuation);
  $('word').textContent=current.kind==='word-choice'?current.before+'___'+current.after:current.kind==='spelling'?(current.context||current.prompt):current.prompt;
  $('word').classList.toggle('sentence',phrase);
  $('word').classList.toggle('long',(current.prompt || '').length>23||current.kind==='spelling');
  $('context').textContent=current.kind==='spelling'?'':current.context || '';
  $('feedback').textContent='';$('feedback').className='feedback';
  $('task-label').textContent=`Задание ${current.task}`;
  $('options').replaceChildren();
  $('word').classList.toggle('stress-word', current.kind === 'stress');
  if (punctuation) {
    showPunctuation(current);
    return;
  }
  if (current.kind === 'stress') {
    showStress(current);
    return;
  }
  (current.kind==='join'?current.options:shuffle(current.options)).forEach(value=>{const b=document.createElement('button');b.type='button';b.className='option'+(phrase?' phrase':'');b.textContent=value==='∅'?'нет буквы':value;b.dataset.value=value;b.addEventListener('click',()=>answer(value));$('options').append(b);});
 }
 function answer(value){
  if(locked||!current)return;locked=true;
  const punctuation = current.kind === 'punctuation';
  const good=punctuation ? selectedSlots.size===current.answer.length && current.answer.every(index=>selectedSlots.has(index)) : value===current.answer;
  $('check-answer').disabled=true;
  if(good)correct++;else{wrong++;if(!mistakes.has(current.id)){mistakes.set(current.id,current);const li=document.createElement('li'),w=document.createElement('div');w.className='mistake-word';solution(w,current);li.append(w);if(current.context){const s=document.createElement('small');s.textContent=current.context;li.append(s);}addExplanation(li,w,current);$('mistake-list').prepend(li);}$('empty').hidden=true;}
  $('correct').textContent=correct;$('wrong').textContent=wrong;
  for(const b of choices()){b.disabled=true;if(punctuation){const index=Number(b.dataset.value);const expected=current.answer.includes(index);b.textContent=expected || selectedSlots.has(index) ? current.mark : '·';b.classList.add(expected===selectedSlots.has(index)?'right':'wrong');continue;}if(b.dataset.value===current.answer)b.classList.add('right');else if(b.dataset.value===value)b.classList.add('wrong');}
  if (current.kind === 'stress') {
    const right = $('word').querySelector('.right');
    right.textContent = current.prompt[Number(current.answer)];
  } else if (!punctuation) solution($('word'),current);
  $('feedback').textContent=good ? (punctuation && !current.answer.length ? 'Верно! ' + ({',':'Запятые',':':'Двоеточия','—':'Тире'}[current.mark]) + ' не нужны.' : 'Верно!') : 'Вы ошиблись.';$('feedback').className='feedback'+(good?'':' error');
  timer=setTimeout(chooseNext,punctuation ? (good?1800:3000) : good?600:1200);
 }
 function select(id){
  clearTimeout(timer);timer=null;current=null;locked=false;$('instruction').hidden=true;
  correct=wrong=0;mistakes.clear();$('correct').textContent='0';$('wrong').textContent='0';$('mistake-list').replaceChildren();$('empty').hidden=false;
  for(const b of $('sections').children)b.setAttribute('aria-pressed',String(b.dataset.section===id));
  pool = id === 'all' ? cards : id === 'stress' ? cards.filter(c => c.kind === 'stress') : id === 'punctuation' ? cards.filter(c => c.kind === 'punctuation') : cards.filter(c => c.task === Number(id));
  if(!pool.length){$('word').textContent='Не удалось загрузить карточки';$('context').textContent='Проверьте, что файл cards.js находится рядом с index.html.';$('skip').hidden=true;return;}
  chooseNext();
 }
 sections.forEach(([id,label])=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.dataset.section=id;b.setAttribute('aria-label',/^\d+$/.test(id)?`Задание ${id}`:label);b.addEventListener('click',()=>select(id));$('sections').append(b);});
 $('check-answer').addEventListener('click', () => { if (current?.kind === 'punctuation') answer(); });
 $('skip').addEventListener('click',chooseNext);
 document.addEventListener('keydown',e=>{if(e.altKey||e.ctrlKey||e.metaKey||e.repeat||locked)return;if (e.key === 'Enter' && current?.kind === 'punctuation' && e.target?.tagName !== 'BUTTON') { e.preventDefault(); answer(); return; }const n=Number(e.key);if(n>=1&&n<=9){const b=choices()[n-1];if(b){e.preventDefault();b.click();}}});
 select('all');
})();


