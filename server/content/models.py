from django.db import models
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator,MaxValueValidator

class Task(models.Model):
    number=models.PositiveSmallIntegerField('Номер ЕГЭ',unique=True,validators=[MinValueValidator(1)])
    title=models.CharField('Название',max_length=160)
    max_primary=models.PositiveSmallIntegerField('Максимальный первичный балл',default=1,validators=[MinValueValidator(1),MaxValueValidator(22)])
    class Meta:
        ordering=['number'];verbose_name='номер задания';verbose_name_plural='Номера заданий'
    def __str__(self):return f'{self.number}. {self.title}'

class Rule(models.Model):
    title=models.CharField('Название',max_length=180)
    text=models.TextField('Краткое пояснение')
    class Meta:verbose_name='правило';verbose_name_plural='Правила и пояснения'
    def __str__(self):return self.title

class Record(models.Model):
    # One database sequence assigns IDs across both content types atomically.
    category=models.CharField('Формат',max_length=8,choices=[('card','Карточка'),('exam','Пробник')])
    legacy_id=models.CharField(max_length=180,unique=True,null=True,blank=True,editable=False)
    task=models.ForeignKey(Task,on_delete=models.PROTECT,verbose_name='Номер задания')
    title=models.CharField('Название для поиска',max_length=180)
    active=models.BooleanField('Опубликовано',default=False)
    source=models.CharField('Источник',max_length=250,blank=True)
    rule=models.ForeignKey(Rule,on_delete=models.SET_NULL,null=True,blank=True,verbose_name='Общее правило')
    explanation=models.TextField('Свое пояснение (приоритет над общим правилом)',blank=True)
    prompt=models.TextField('Условие / слово с пропуском')
    passage=models.TextField('Текст к заданию',blank=True)
    group_key=models.CharField('Группа общего текста',max_length=160,blank=True,help_text='Одинаковое значение у связанных заданий 1–3 или 23–26, например text-a. Для независимого задания оставьте пустым.')
    answer_type=models.CharField('Проверка ответа',max_length=12,default='word',choices=[('word','Слово'),('set','Набор цифр'),('matching','Соответствие (5 цифр)'),('number','Число')])
    answers=models.JSONField('Допустимые ответы',default=list,blank=True)
    kind=models.CharField('Вид карточки',max_length=16,default='letter',choices=[('letter','Пропущенная буква'),('stress','Ударение'),('word-choice','Слово в контексте'),('spelling','Выбор написания'),('join','Слитно / раздельно / дефис'),('punctuation','Пунктуация')])
    instruction=models.CharField('Короткая инструкция',max_length=250,blank=True)
    before=models.TextField('До пропуска / ударной гласной',blank=True)
    after=models.TextField('После пропуска / ударной гласной',blank=True)
    context=models.TextField('Уточняющий контекст',blank=True)
    spelling=models.CharField('Правильное написание для показа',max_length=400,blank=True)
    answer=models.CharField('Правильный вариант карточки',max_length=400,blank=True)
    options=models.JSONField('Кнопки выбора',default=list,blank=True)
    parts=models.JSONField('Части предложения между кнопками',default=list,blank=True)
    positions=models.JSONField('Номера правильных позиций, начиная с 0',default=list,blank=True)
    mark=models.CharField('Знак пунктуации',max_length=1,default=',')
    updated=models.DateTimeField(auto_now=True)
    class Meta:verbose_name='материал';verbose_name_plural='Материалы'
    def __str__(self):return f'#{self.pk or "новый"} — {self.title}'
    def clean(self):
        errors={}
        if self.active and not (self.explanation.strip() or self.rule_id):errors['explanation']='Добавьте свое пояснение или выберите правило.'
        if self.category=='exam':
            if not isinstance(self.answers,list) or not self.answers or not all(isinstance(v,str) and v.strip() for v in self.answers):errors['answers']='Нужен хотя бы один непустой ответ.'
            elif self.answer_type=='matching' and any(len(a)!=5 or not a.isdigit() or '0' in a for a in self.answers):errors['answers']='Нужно ровно пять цифр от 1 до 9.'
            elif self.answer_type in ('set','number') and any(not a.isdigit() for a in self.answers):errors['answers']='Допускаются только цифры.'
            if self.answer_type=='matching' and self.task_id and self.task.max_primary!=2:errors['answer_type']='Частичное оценивание соответствует максимуму 2 балла.'
        elif self.kind=='punctuation':
            if not isinstance(self.parts,list) or len(self.parts)<2 or not all(isinstance(x,str) for x in self.parts):errors['parts']='Не менее двух текстовых частей.'
            if not isinstance(self.positions,list) or any(type(x)!=int or x<0 or x>=len(self.parts)-1 for x in self.positions) or len(set(self.positions))!=len(self.positions):errors['positions']='Позиции должны быть уникальными и находиться между частями.'
            if self.mark not in [',',':','—']:errors['mark']='Выберите запятую, двоеточие или тире.'
        elif self.kind=='stress':
            if self.before+self.spelling+self.after!=self.prompt or self.spelling not in 'аеёиоуыэюя' or len(self.spelling)!=1:errors['spelling']='Укажите одну ударную гласную. До + гласная + после должны составлять слово строчными буквами.'
        elif not isinstance(self.options,list) or len(self.options)<2 or not all(isinstance(x,str) and x for x in self.options) or len(set(self.options))!=len(self.options) or self.answer not in self.options:
            errors['options']='Нужны минимум две разные кнопки, включая правильный ответ.'
        if errors:raise ValidationError(errors)
    def payload(self):
        base={'id':self.legacy_id or f'db-{self.pk}','displayId':self.pk,'task':self.task.number,'maxPrimary':self.task.max_primary,'explanation':self.explanation or (self.rule.text if self.rule else '')}
        if self.category=='exam':return {**base,'prompt':self.prompt,'passage':self.passage,'answers':self.answers,'answerType':self.answer_type,'source':{'title':self.source,'variant':self.group_key or f'item-{self.pk}'}}
        return {**base,'kind':self.kind,'instruction':self.instruction,'prompt':self.prompt,'before':self.before,'after':self.after,'context':self.context,'spelling':self.spelling,'answer':self.positions if self.kind=='punctuation' else str(len(self.before)) if self.kind=='stress' else self.answer,'options':self.options,'parts':self.parts,'mark':self.mark}

class Card(Record):
    class Meta:proxy=True;verbose_name='карточка';verbose_name_plural='Карточки'
class Exam(Record):
    class Meta:proxy=True;verbose_name='задание пробника';verbose_name_plural='Задания пробников'
