function routeSelectRouteToOption(route, selectedRoute) {
  var info = {'id':route.id, 'description': route.description, 'distance': Math.round(route.distance/10) / 100, 'selected': ''};
  if (typeof(selectedRoute) != 'undefined' && selectedRoute == info.id)
    info.selected = "selected='selected'";
  res = $("<option value='%(id)s' %(selected)s>%(description)s (%(distance)skm)</option>".format(info));
  res.data('route', route);
  return res;
}

function emptyRouteOption() {
  return "<option value=''>" + gettext('No route') + "</option>";
}

$.prototype.makeRouteSelect = function (opts) {
  /* Make sure the selectmenu is always initialized with this set of parameters. */
  function createSelectmenu(elem) {
    elem.selectmenu({
      width: 180,
      select: function(e, ui) {
        if (ui.value == "new") {
          routeEditDialog.open({
            'open': function (control) {
             control.makeNew();
            },

            'save': function (control) {
              // console.log("BEFORE Saving to server.");
              control.saveToServer("new", function (data) {
                // console.log({"CALLBACK Saving to server. data=": data});

                routeOptgroup.append(routeSelectRouteToOption(data.route));
                routeSelectBox.val(data.route.id);
                routeSelectBox.change();
                routeSelectBox.selectmenu("destroy");
                createSelectmenu(routeSelectBox);
              });
            },

            'cancel': function (control) { }
          });
        }
      }
    });
  }
  
  opts.name_id = "routeedit-"+fcdjangoutils.nameToId(opts.name);

  var newRouteLink = $("<a id='" + opts.name_id + "_new' href='#' class='routeedit-new-route'>" + gettext('New route') + "</a>");
  var routeSelectBox = $("<select id='" + opts.name_id + "_select' name='" + opts.name + "' />")

  var routeOptgroup = $('<optgroup/>', {label: gettext('Existing routes')});

  routeSelectBox
    .append(
      $('<optgroup/>')
        .append($("<option />", {val: '', text: gettext('No route')}))
        .append($("<option />", {val: 'new', text: gettext('Create new')}))
    ).append(routeOptgroup);

  $.each(opts.queryset, function (index, item) {
    routeOptgroup.append(routeSelectRouteToOption(item, opts.value));
  });

  var routeBox = $("<div />")
    .append(routeSelectBox);

  this.html(routeBox);
  createSelectmenu(routeSelectBox);

//  this.find("#%(name_id)s_select".format(opts)).selectmenu();


//  this.find("#%(name_id)s_edit".format(opts)).click(function () {
//    routeEditDialog.open({
//      'open': function (control) {
//        control.loadFromServer($("#%(name_id)s_select".format(opts)).val());
//      },
//      'save': function (control) {
//        control.saveToServer($("#%(name_id)s_select".format(opts)).val());
//      },
//      'cancel': function (control) {
//      }
//    });
//  }).hide();  // Hide the edit button for now...

//  this.find("#%(name_id)s_new".format(opts)).click(function () {
//  newRouteLink.click(function () {
//    return false;
//  });
  return routeSelectBox;
}
