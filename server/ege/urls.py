from django.contrib import admin
from django.urls import path,re_path
from content.views import content_js,public_file
urlpatterns=[path('admin/',admin.site.urls),path('content.js',content_js),path('',public_file),path('test/',public_file,{'path':'test/'}),re_path(r'^(?P<path>.+)$',public_file)]
