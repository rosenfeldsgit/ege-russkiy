from django.contrib import admin
from django import forms
from django.db.models import Max
from .models import Task,Rule,Record,Card,Exam

class ContentForm(forms.ModelForm):
    answers_text=forms.CharField(label='Допустимые ответы — каждый с новой строки',widget=forms.Textarea(attrs={'rows':3}),required=False)
    options_text=forms.CharField(label='Кнопки выбора — каждая с новой строки',widget=forms.Textarea(attrs={'rows':3}),required=False)
    parts_text=forms.CharField(label='Части предложения — каждая с новой строки',widget=forms.Textarea(attrs={'rows':5}),required=False)
    positions_text=forms.CharField(label='Правильные позиции через запятую (от 0)',required=False)
    class Meta:
        model=Record
        exclude=['answers','options','parts','positions']
        widgets={'prompt':forms.Textarea(attrs={'rows':5}),'passage':forms.Textarea(attrs={'rows':8}),'before':forms.Textarea(attrs={'rows':2}),'after':forms.Textarea(attrs={'rows':2}),'context':forms.Textarea(attrs={'rows':2}),'explanation':forms.Textarea(attrs={'rows':3})}
    def __init__(self,*args,**kwargs):
        super().__init__(*args,**kwargs)
        if self.instance.pk:
            for name in ['answers','options','parts']:self.fields[name+'_text'].initial='\n'.join(getattr(self.instance,name))
            self.fields['positions_text'].initial=', '.join(map(str,self.instance.positions))
    def clean(self):
        data=super().clean()
        for name in ['answers','options','parts']:
            setattr(self.instance,name,[line.strip() for line in data.get(name+'_text','').splitlines() if line.strip()])
        try:self.instance.positions=[int(x.strip()) for x in data.get('positions_text','').split(',') if x.strip()]
        except ValueError:self.add_error('positions_text','Укажите целые числа через запятую.')
        return data
    def _update_errors(self,errors):
        if hasattr(errors,'error_dict'):
            mapped={}
            for key,value in errors.error_dict.items():
                key=key+'_text' if key in ['answers','options','parts','positions'] else key
                mapped[key if key in self.fields else '__all__']=value
            errors=forms.ValidationError(mapped)
        super()._update_errors(errors)

class BaseAdmin(admin.ModelAdmin):
    form=ContentForm
    list_display=['id','title','task','active','updated']
    list_filter=['task','active']
    search_fields=['title','prompt','explanation','legacy_id']
    readonly_fields=['id','updated']
    actions=['unpublish']
    def get_queryset(self,request):return super().get_queryset(request).filter(category=self.category)
    def save_model(self,request,obj,form,change):
        obj.category=self.category
        super().save_model(request,obj,form,change)
    def get_form(self,request,obj=None,**kwargs):
        base=super().get_form(request,obj,**kwargs)
        category=self.category
        class WithCategory(base):
            def __init__(self,*args,**kwargs):
                super().__init__(*args,**kwargs);self.instance.category=category
        return WithCategory
    @admin.action(description='Снять выбранные материалы с публикации')
    def unpublish(self,request,queryset):queryset.update(active=False)
    def has_delete_permission(self,request,obj=None):return False

@admin.register(Card)
class CardAdmin(BaseAdmin):
    category='card'
    fieldsets=[('Карточка',{'fields':['id','task','title','active','kind','instruction','prompt','context']}),('Выбор ответа',{'fields':['before','after','spelling','answer','options_text'],'description':'Для буквы: слово «пр…брежный», до «пр», после «брежный», ответ «и», кнопки «е» и «и». Для ударения: слово строчными, до и после ударной гласной, сама гласная в поле написания.'}),('Пунктуация',{'fields':['parts_text','positions_text','mark'],'classes':['collapse']}),('Пояснение и источник',{'fields':['rule','explanation','source','updated']})]
@admin.register(Exam)
class ExamAdmin(BaseAdmin):
    category='exam'
    fieldsets=[('Задание',{'fields':['id','task','title','active','source','group_key','passage','prompt']}),('Ответ',{'fields':['answer_type','answers_text']}),('Объяснение',{'fields':['rule','explanation','updated']})]
@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display=['number','title','max_primary']
    def get_changeform_initial_data(self,request):return {'number':(Task.objects.aggregate(n=Max('number'))['n'] or 0)+1}
    def has_delete_permission(self,request,obj=None):return False
    def get_readonly_fields(self,request,obj=None):return ['number'] if obj else []
admin.site.register(Rule)
admin.site.site_header='Ѣ — управление заданиями'
admin.site.site_title='Ѣ · Админка'
admin.site.index_title='Карточки, пробники и пояснения'
