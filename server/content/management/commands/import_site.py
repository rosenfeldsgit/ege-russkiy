import json,subprocess
from django.core.management.base import BaseCommand
from django.db import transaction,connection
from django.core.management.color import no_style
from django.conf import settings
from content.models import Task,Record

class Command(BaseCommand):
    help='Однократно импортирует существующие JS-базы. Повторный запуск не перезаписывает правки администратора.'
    @transaction.atomic
    def handle(self,*args,**kwargs):
        script=r'''
const fs=require('fs'),vm=require('vm');const ctx={window:{}};
for(const p of ['exam-config.js','cards.js','explanations.js','punctuation.js','adapted-cards.js','test/bank.js','prefix-explanations.js','audited-explanations.js','exam-explanations.js','reasoned-explanations.js']){if(fs.existsSync(p))vm.runInNewContext(fs.readFileSync(p,'utf8'),ctx);}
for(let v=3;v<=36;v++){
  const file=`test/doshchinsky-2027/v${v}.json`;
  if(!fs.existsSync(file))continue;
  const data=JSON.parse(fs.readFileSync(file,'utf8'));
  for(const q of data.questions){const p=data.passages[q.passageKey];ctx.window.EGE_EXAM_BANK.push({...q,passage:p?.text||'',});}
}
const app=fs.readFileSync('app.js','utf8');
const words=app.match(/const stressWords = `([\s\S]*?)`\.trim/)[1].trim().split(/\s+/);
const stress=words.map(form=>{const pos=form.search(/[АЕЁИОУЫЭЮЯ]/),word=form.toLowerCase();return {id:'stress-'+form,task:4,kind:'stress',prompt:word,before:word.slice(0,pos),after:word.slice(pos+1),spelling:word[pos],answer:String(pos),context:form==='Отзыв'?'о книге':form==='отзЫв'?'посла из страны':''};});
const choices=JSON.parse(app.match(/const wordChoiceCards = (\[[\s\S]*?\n \]);/)[1]);
process.stdout.write(JSON.stringify({tasks:ctx.window.EGE_EXAM_CONFIG.tasks,exams:ctx.window.EGE_EXAM_BANK,cards:[...choices,...ctx.window.EGE_CARDS.map(c=>({...c,explanation:c.explanation||ctx.window.EGE_HINTS?.get(c.id)||''})),...stress,...ctx.window.EGE_PUNCTUATION,...(ctx.window.EGE_ADAPTED_CARDS||[])]}));
'''
        data=json.loads(subprocess.check_output(['node','-e',script],cwd=settings.ROOT,text=True))
        for n,t in data['tasks'].items():Task.objects.get_or_create(number=int(n),defaults={'title':f'Задание {n}','max_primary':t['maxPrimary']})
        for q in data['exams']:
            if Record.objects.filter(legacy_id=q['id']).exists():continue
            Record.objects.create(id=q['displayId'] if not Record.objects.filter(pk=q['displayId']).exists() else None,legacy_id=q['id'],category='exam',task=Task.objects.get(number=q['task']),title=q['prompt'][:160],active=True,source=q['source']['title'],group_key='legacy-'+str(q['source']['variant']),prompt=q['prompt'],passage=q.get('passage',''),answers=q['answers'],answer_type=q['answerType'],explanation=q.get('explanation',''))
        for sql in connection.ops.sequence_reset_sql(no_style(),[Record]):
            with connection.cursor() as cursor:cursor.execute(sql)
        for c in data['cards']:
            if Record.objects.filter(legacy_id=c['id']).exists():continue
            k=c.get('kind','letter')
            Record.objects.create(legacy_id=c['id'],category='card',task=Task.objects.get(number=c['task']),title=(c.get('prompt') or c.get('before') or c['id'])[:160],active=True,source=c.get('source',''),prompt=c.get('prompt','') or (c.get('before','')+'___'+c.get('after','')),kind=k,instruction=c.get('instruction',''),before=c.get('before',''),after=c.get('after',''),context=c.get('context',''),spelling=c.get('spelling',''),answer=str(c.get('answer','')) if k!='punctuation' else '',options=c.get('options',[]),parts=c.get('parts',[]),positions=c.get('answer',[]) if k=='punctuation' else [],mark=c.get('mark',','),explanation=c.get('explanation',''))
        self.stdout.write(self.style.SUCCESS(f'Готово: {Record.objects.count()} материалов.'))
