import django.template
import fcdjangoutils.widgettagmiddleware
import random

register = django.template.Library()

def make_id():
    chars = '0123456789abcdef'
    return ''.join(random.choice(chars) for i in range(20))

@register.inclusion_tag("routeedit/tag_routeicon.html", takes_context=True)
def routeicon(context, route, editfield=None):
    map_id = editfield
    if map_id is None: map_id = make_id()
    return {'STATIC_URL': context['STATIC_URL'], 'map_id': map_id, 'route':route, 'editable':editfield is not None}

@register.inclusion_tag("routeedit/tag_routeselector.html", takes_context=True)
def routeselector(context, name, queryset, value = None, editable = True):
    return {'STATIC_URL': context['STATIC_URL'], 'name': name, 'queryset': queryset, 'value':value, 'editable':editable}
