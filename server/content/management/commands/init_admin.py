import getpass,secrets
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.management.base import BaseCommand,CommandError
class Command(BaseCommand):
    help='Создает администратора. Пароль вводится скрыто; пустой ввод создаёт случайный пароль.'
    def add_arguments(self,parser):parser.add_argument('--username',default='admin')
    def handle(self,*args,**options):
        User=get_user_model();username=options['username']
        if User.objects.filter(username=username).exists():raise CommandError('Логин уже существует. Используйте changepassword для смены пароля.')
        password=getpass.getpass('Пароль (Enter — сгенерировать): ')
        generated=not password
        if generated:password=secrets.token_urlsafe(18)
        validate_password(password)
        User.objects.create_superuser(username=username,password=password,email='')
        self.stdout.write(self.style.SUCCESS('Администратор создан: '+username))
        if generated:self.stdout.write('Сохраните пароль: '+password)
