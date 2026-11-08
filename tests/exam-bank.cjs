'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const root=path.join(__dirname,'..'),ctx={window:{}};
for(const file of ['exam-config.js','test/bank.js','test/bank-manifest.js'])vm.runInNewContext(fs.readFileSync(path.join(root,file),'utf8'),ctx);
const bank=[...ctx.window.EGE_EXAM_BANK];
for(let v=3;v<=36;v++){
 const data=JSON.parse(fs.readFileSync(path.join(root,`test/doshchinsky-2027/v${v}.json`),'utf8'));
 assert.equal(data.questions.length,26);
 for(const p of Object.values(data.passages)){assert(p.text.length>250);assert(!p.blocks);}
 for(const q of data.questions){
  assert.equal(q.source.variant,v);assert.equal(q.displayId,(v-1)*26+q.task);assert(q.prompt.length>25);
  assert.equal(q.maxPrimary,[8,22].includes(q.task)?2:1);assert(q.answers.length);assert(q.answers.every(a=>typeof a==='string'&&a.length));
  if(q.answerType==='matching')for(const a of q.answers)assert(/^[1-9]{5}$/.test(a)&&new Set(a).size===5,`${q.id}: ${a}`);
  if(q.answerType==='set')for(const a of q.answers)assert(/^[1-9]+$/.test(a)&&new Set(a).size===a.length,`${q.id}: ${a}`);
  if(q.answerType==='number')assert(q.answers.every(a=>/^\d+$/.test(a)));
  assert.equal(q.passageKey,q.task<=3?'first':q.task>=23?'last':null);
  const pp=data.passages[q.passageKey];
  assert(!q.presentation,'Only ordinary text belongs in the question bank');
  assert(!/<(?:img|script)|data:image|maskImage|\.png/.test(q.prompt+(pp?.text||'')));
  bank.push({...q,passage:pp?.text||''});
 }
}
assert.equal(bank.length,936);assert.equal(new Set(bank.map(q=>q.id)).size,936);assert.equal(new Set(bank.map(q=>q.displayId)).size,936);
assert.equal(ctx.window.EGE_EXAM_MANIFEST.length,884);
for(let task=1;task<=26;task++)assert.equal(bank.filter(q=>q.task===task).length,36);
for(let v=1;v<=36;v++)assert.equal(bank.filter(q=>q.source.variant===v).reduce((sum,q)=>sum+q.maxPrimary,0),28);
// Exercise the actual scoring implementation, including multi-digit sentence numbers.
const js=fs.readFileSync(path.join(root,'test/test.js'),'utf8');
const a=js.indexOf('  const normalize ='),b=js.indexOf('  function selection()');
const scoring={};vm.runInNewContext(js.slice(a,b)+'\nthis.score=score;',scoring);
for(const q of bank)for(const answer of q.answers){assert.equal(scoring.score(q,answer),q.maxPrimary,q.id);assert.equal(scoring.score(q,''),0);}
const matching=bank.find(q=>q.answerType==='matching'),correct=matching.answers[0];
assert.equal(scoring.score(matching,'0'+correct.slice(1)),0);
assert.equal(scoring.score(matching,correct.slice(0,4)),1);
assert.equal(scoring.score(bank.find(q=>q.id==='doshchinsky-2027-v21-q26'),'6357'),1);
assert.equal(bank.find(q=>q.id==='doshchinsky-2027-v11-q8').answers[0],'74158');
assert(bank.find(q=>q.id==='doshchinsky-2027-v3-q7').prompt.includes('НЕДРЫ'),'Preserve the deliberate incorrect form');
assert(bank.find(q=>q.id==='doshchinsky-2027-v3-q15').prompt.includes('бессо(3)ых'));
for(const q of bank.filter(q=>q.source.variant>=3&&q.task===26)) {
 const nums=[...q.passage.matchAll(/\((\d{1,2})\)/g)].map(m=>Number(m[1]));
 assert(nums.length>10,q.id);for(let n=1;n<=Math.max(...nums);n++)assert(nums.includes(n),`${q.id}: missing sentence ${n}`);
}
console.log('936 questions, 36 variants, keys, text-only content, scoring and shared passages: OK');
(async()=>{
 const calls=[];const context={window:{},Map,Set,Promise,fetch:async url=>{calls.push(url);return {ok:true,json:async()=>JSON.parse(fs.readFileSync(path.join(root,'test',url),'utf8'))};}};
 vm.runInNewContext(fs.readFileSync(path.join(root,'test/bank-loader.js'),'utf8'),context);
 const loader=context.window.EGE_EXAM_LOADER;
 const loaded=await Promise.all(ctx.window.EGE_EXAM_MANIFEST.map(q=>loader.load(q)));
 assert.equal(loaded.length,884);assert.equal(calls.length,34,'one request per variant, including parallel calls');
 assert(loaded.every(q=>q.task<=3||q.task>=23?q.passage.length>250:!q.passage));
 const selectionCode=js.slice(js.indexOf('    const variants = {};'),js.indexOf('    const questions = await Promise.all'));
 for(let i=0;i<50;i++){
  const selectionContext={numbers:Array.from({length:26},(_,i)=>i+1),bank,randomItem:xs=>xs[Math.floor(Math.random()*xs.length)]};
  vm.runInNewContext(selectionCode+'\nthis.selected=selected;',selectionContext);
  for(const group of [[1,2,3],[23,24,25,26]])assert.equal(new Set(selectionContext.selected.filter(q=>group.includes(q.task)).map(q=>q.source.variant)).size,1);
 }
 console.log('Lazy loading, parallel request cache, random shared-text grouping: OK');
})().catch(error=>{console.error(error);process.exitCode=1;});
