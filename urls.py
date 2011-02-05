from django.conf.urls.defaults import *

from routeedit import views

urlpatterns = patterns('',
    url(r'^examples/edit/(?P<id>.*)$', 'routeedit.views.examples_edit'),
    url(r'^examples/select$', 'routeedit.views.examples_select'),
    url(r'^ajax/load/(?P<id>.*)$', 'routeedit.views.load'),
    url(r'^ajax/save/(?P<id>.*)$', 'routeedit.views.save'),
)
