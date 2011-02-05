from django.db import models
from django.utils.translation import ugettext_lazy as _
import django.contrib.auth.models

class Route(models.Model):
    creator = models.ForeignKey(django.contrib.auth.models.User, related_name='routes')
    date_created = django.db.models.DateTimeField(_('Created at'), auto_now=True)
    description = models.TextField(_('Description'))
    distance = models.FloatField(_('Distance'))
    path = models.TextField(_('Path')) # Note: This is json-encoded data!

    def __unicode__(self):
        return "%s (%.2fkm)" % (self.description, self.distance / 1000.0)
