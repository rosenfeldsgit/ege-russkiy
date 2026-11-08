import json,re
from django.http import HttpResponse,FileResponse,Http404
from django.conf import settings
from .models import Record,Task

def content_js(request):
    rows=Record.objects.select_related('task','rule')
    payload={'cards':[r.payload() for r in rows.filter(category='card',active=True)],'exams':[r.payload() for r in rows.filter(category='exam',active=True)],'disabled':[r.legacy_id for r in rows.filter(active=False).exclude(legacy_id=None)],'tasks':{str(t.number):{'number':t.number,'title':t.title,'maxPrimary':t.max_primary} for t in Task.objects.all()}}
    response=HttpResponse('window.EGE_MANAGED = '+json.dumps(payload,ensure_ascii=False)+';',content_type='application/javascript; charset=utf-8')
    response['Cache-Control']='no-store'
    return response

PUBLIC_FILES={'index.html','app.js','styles.css','favicon.svg','cards.js','explanations.js','punctuation.js','adapted-cards.js','exam-config.js','prefix-explanations.js','audited-explanations.js','exam-explanations.js','reasoned-explanations.js','test/index.html','test/test.css','test/test.js','test/bank.js','test/bank-manifest.js','test/bank-loader.js'}
def public_file(request,path='index.html'):
    if path in ('','test/'):path=path+'index.html'
    variant=re.fullmatch(r'test/doshchinsky-2027/v(\d+)\.json',path)
    if not (path in PUBLIC_FILES or variant and 3<=int(variant[1])<=36):raise Http404
    file=settings.ROOT/path
    if not file.is_file():raise Http404
    types={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json; charset=utf-8','.png':'image/png'}
    return FileResponse(file.open('rb'),content_type=types.get(file.suffix,'application/octet-stream'))
