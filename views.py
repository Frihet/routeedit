from django.shortcuts import render_to_response, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.template import RequestContext
import routeedit.models
from django.http import HttpResponseRedirect
from django.core.urlresolvers import reverse
import fcdjangoutils.jsonview

def examples_edit(request, id):
    route = None
    if id != "new":
        route = routeedit.models.Route.objects.get(id=id)

    if 'save' in request.POST:
        if not route:
            route = routeedit.models.Route()
        route.description = request.POST['description']
        route.path = request.POST['path']
        route.save()
        return HttpResponseRedirect(reverse('routeedit.views.examples_edit', kwargs={'id':route.id}))
 
    return render_to_response(
        "routeedit/examples/routeedit.html", {'route': route},
        context_instance=RequestContext(request))


def examples_select(request):
    return render_to_response(
        "routeedit/examples/routeselect.html", {'queryset': routeedit.models.Route.objects.all()},
        context_instance=RequestContext(request))

@fcdjangoutils.jsonview.json_view
def load(request, id):
    return {'route': routeedit.models.Route.objects.get(id=id)}

@fcdjangoutils.jsonview.json_view
def save(request, id):
    if id == "new":
        route = routeedit.models.Route()
    else:
        route = routeedit.models.Route.objects.get(id=id)

    route.creator = request.user
    route.description = request.POST['description']
    route.path = request.POST['path']
    route.distance = float(request.POST['distance'])
    route.save()

    return {'route': route}
