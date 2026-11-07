const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const ctx={window:{}};
for(const p of ['cards.js','explanations.js','punctuation.js','adapted-cards.js','prefix-explanations.js','audited-explanations.js'])vm.runInNewContext(fs.readFileSync(p,'utf8'),ctx);
const all=[...ctx.window.EGE_CARDS,...ctx.window.EGE_ADAPTED_CARDS];
const old=new Map(all.map(c=>[c.id,{hint:c.explanation||ctx.window.EGE_HINTS.get(c.id)||'',answer:JSON.stringify(c.answer),options:JSON.stringify(c.options)}]));
vm.runInNewContext(fs.readFileSync('reasoned-explanations.js','utf8'),ctx);
let count=0;
for(const c of all){assert.equal(JSON.stringify(c.answer),old.get(c.id).answer);assert.equal(JSON.stringify(c.options),old.get(c.id).options);const hint=c.explanation||ctx.window.EGE_HINTS.get(c.id)||'';if(hint!==old.get(c.id).hint){count++;assert(hint.length>40);assert([14,15].includes(c.task));}}
for(const [word,rule] of [['студёный','несовершенного вида'],['русско-китайского','равноправные основы'],['вбок','пространственное наречие'],['труженик','суффикс -еник-'],['вдвоём','собирательное числительное']]){
 const c=all.find(c=>(c.spelling||c.before+c.answer+c.after)===word);assert(c&&c.explanation.includes(rule),word);
}
const bare=all.filter(c=>[14,15].includes(c.task)&&/^Запомни(ть)? (слитное|раздельное|дефисное|одну|написание)/.test(c.explanation||ctx.window.EGE_HINTS.get(c.id)||''));
assert.equal(bare.length,0);
console.log(`OK: ${count} explanations expanded; no bare memorization notes in tasks 14–15; answer keys unchanged.`);
