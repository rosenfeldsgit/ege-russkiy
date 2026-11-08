from django.test import TestCase,Client
from django.contrib.auth import get_user_model
from .models import Task,Card,Exam,Record

class AdminFlow(TestCase):
    def setUp(self):
        self.task=Task.objects.create(number=11,title='Суффиксы')
        self.user=get_user_model().objects.create_superuser('owner','', 'test-only-password-283')
    def test_anonymous_cannot_change_content(self):
        self.assertEqual(self.client.get('/admin/content/card/add/').status_code,302)
        self.assertEqual(self.client.post('/admin/content/card/add/',{}).status_code,302)
        self.assertEqual(Record.objects.count(),0)
    def card_data(self):
        return dict(task=self.task.pk,title='Беседовать',active='on',kind='letter',prompt='бесед…вать',before='бесед',after='вать',spelling='о',answer='о',options_text='о\nы',explanation='Беседую → -ова-.',mark=',',answer_type='word',_save='Сохранить')
    def test_create_edit_publish_and_hide(self):
        self.client.force_login(self.user)
        response=self.client.post('/admin/content/card/add/',self.card_data())
        self.assertEqual(response.status_code,302,response.context and response.context['adminform'].form.errors)
        card=Card.objects.get()
        self.assertEqual(card.category,'card');self.assertIsNotNone(card.pk)
        payload=self.client.get('/content.js').content.decode()
        self.assertIn('Беседую',payload);self.assertIn(f'db-{card.pk}',payload)
        data=self.card_data();data['explanation']='Мое новое пояснение'
        self.assertEqual(self.client.post(f'/admin/content/card/{card.pk}/change/',data).status_code,302)
        card.refresh_from_db();self.assertEqual(card.explanation,data['explanation'])
        data.pop('active');self.client.post(f'/admin/content/card/{card.pk}/change/',data)
        self.assertNotIn('Мое новое пояснение',self.client.get('/content.js').content.decode())
    def test_bad_choices_are_rejected(self):
        self.client.force_login(self.user);data=self.card_data();data['options_text']='е\nи'
        r=self.client.post('/admin/content/card/add/',data)
        self.assertEqual(r.status_code,200);self.assertContains(r,'Нужны минимум две разные кнопки')
        self.assertEqual(Record.objects.count(),0)
    def test_exam_and_new_task(self):
        self.client.force_login(self.user)
        data=dict(task=self.task.pk,title='Тест',active='on',prompt='Выберите ответ',answers_text='135',answer_type='set',explanation='Пояснение',source='Мой сборник',_save='Сохранить')
        r=self.client.post('/admin/content/exam/add/',data)
        self.assertEqual(r.status_code,302,r.context and r.context['adminform'].form.errors)
        self.assertEqual(Exam.objects.get().answers,['135'])
        self.assertEqual(self.client.post('/admin/content/task/add/',dict(number=28,title='Новая тема',max_primary=1,_save='Сохранить')).status_code,302)
        self.assertTrue(Task.objects.filter(number=28).exists())
    def test_csrf_and_private_files(self):
        client=Client(enforce_csrf_checks=True);client.force_login(self.user)
        self.assertEqual(client.post('/admin/content/card/add/',self.card_data()).status_code,403)
        self.assertEqual(client.get('/server/data/ege.sqlite3').status_code,404)
        self.assertEqual(client.get('/server/ege/settings.py').status_code,404)
    def test_password_login_and_stable_ids(self):
        self.assertNotEqual(self.user.password,'test-only-password-283')
        self.assertFalse(self.client.login(username='owner',password='wrong'))
        self.assertTrue(self.client.login(username='owner',password='test-only-password-283'))
        self.assertEqual(self.client.get('/admin/').status_code,200)
        self.client.post('/admin/content/card/add/',self.card_data())
        first=Card.objects.get();first_id=first.pk
        self.client.post('/admin/content/card/add/',self.card_data())
        self.assertEqual(Card.objects.values('pk').distinct().count(),2)
        first.refresh_from_db();self.assertEqual(first.pk,first_id)

    def test_public_explanations_are_served(self):
        for path in ['prefix-explanations.js','audited-explanations.js','exam-explanations.js','reasoned-explanations.js']:
            response=self.client.get('/'+path)
            self.assertEqual(response.status_code,200,path)
            response.close()

class BookImport(TestCase):
    def test_import_preserves_existing_ids_and_is_repeatable(self):
        from django.core.management import call_command
        from io import StringIO
        task=Task.objects.create(number=11,title='Суффиксы')
        original=Record.objects.create(id=53,category='card',task=task,title='Своё',prompt='Моя карточка',legacy_id='school-owned',explanation='Мой текст')
        call_command('import_site',stdout=StringIO())
        self.assertEqual(Record.objects.filter(category='exam').count(),936)
        original.refresh_from_db();self.assertEqual(original.prompt,'Моя карточка')
        imported=Record.objects.get(legacy_id='doshchinsky-2027-v3-q1')
        self.assertNotEqual(imported.pk,53);self.assertGreater(len(imported.passage),250)
        total=Record.objects.count();imported.explanation='Учитель отредактировал';imported.save()
        call_command('import_site',stdout=StringIO())
        self.assertEqual(Record.objects.count(),total)
        imported.refresh_from_db();self.assertEqual(imported.explanation,'Учитель отредактировал')
    def test_book_assets_are_public_but_paths_are_bounded(self):
        for path in ['test/bank-manifest.js','test/bank-loader.js','test/doshchinsky-2027/v36.json']:
            response=self.client.get('/'+path);self.assertEqual(response.status_code,200,path);response.close()
        for path in ['test/doshchinsky-2027/v37.json','test/assets/doshchinsky-2027/p300.png','test/assets/doshchinsky-2027/p999.png','test/assets/doshchinsky-2027/../../../server/ege/settings.py']:
            self.assertEqual(self.client.get('/'+path).status_code,404)
