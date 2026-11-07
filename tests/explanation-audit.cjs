'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const ctx={window:{}};
for(const p of ['cards.js','explanations.js','punctuation.js','adapted-cards.js','prefix-explanations.js'])vm.runInNewContext(fs.readFileSync(p,'utf8'),ctx);
const all=[...ctx.window.EGE_CARDS,...ctx.window.EGE_PUNCTUATION,...ctx.window.EGE_ADAPTED_CARDS];
const old=new Map(all.map(c=>[c.id,{hint:c.explanation||ctx.window.EGE_HINTS.get(c.id)||'',answer:JSON.stringify(c.answer),options:JSON.stringify(c.options)}]));
vm.runInNewContext(fs.readFileSync('audited-explanations.js','utf8'),ctx);
let changed=0;const byTask={};
for(const c of all){assert.equal(JSON.stringify(c.answer),old.get(c.id).answer,c.id);assert.equal(JSON.stringify(c.options),old.get(c.id).options,c.id);const h=c.explanation||ctx.window.EGE_HINTS.get(c.id)||'';if(h!==old.get(c.id).hint){assert(h.length>15);changed++;byTask[c.task]=(byTask[c.task]||0)+1;}if(c.task===10)assert.equal(h,old.get(c.id).hint,'Preserve PRE/PRI audit');}
const find=w=>all.find(c=>c.task===9&&c.before+c.answer+c.after===w);
assert.match(find('старожил').explanation,/стАрый/);
assert.match(find('сторожил').explanation,/стОрож/);
assert.match(find('вождение').explanation,/суффикс -ени-/);
assert.match(find('платяной').explanation,/плАтье/);
for(const [task,word,part]of [[11,'беседовать','беседую'],[12,'бреющий','исключение'],[15,'воспитана','результат действия'],[15,'воспитанна','качество'],[14,'вблизи','наречие']]){
 const c=all.find(c=>c.task===task&&(c.spelling||c.before+c.answer+c.after)===word);assert(c,word);assert(c.explanation.includes(part),word);
}
assert(changed>1000);
console.log(JSON.stringify({scanned:all.length,changed,byTask}));
vm.runInNewContext(fs.readFileSync('test/bank.js','utf8'),ctx);
const examAnswers=ctx.window.EGE_EXAM_BANK.map(q=>JSON.stringify(q.answers));
vm.runInNewContext(fs.readFileSync('exam-explanations.js','utf8'),ctx);
assert.deepEqual(ctx.window.EGE_EXAM_BANK.map(q=>JSON.stringify(q.answers)),examAnswers);
assert.match(ctx.window.EGE_EXAM_BANK.find(q=>q.id==='doshchinsky-2027-v1-q23').explanation,/НЕ соответствующие/);
assert.match(ctx.window.EGE_EXAM_BANK.find(q=>q.id==='doshchinsky-2027-v1-q24').explanation,/ОШИБОЧНЫЕ/);
console.log('OK: exam reviews retain answer keys and explain reversed instructions correctly.');
