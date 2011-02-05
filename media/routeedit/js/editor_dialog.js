$(document).ready(function() {
  var Dialog = Obj.subclass('Control');
  Dialog.init = function () {
    Obj.init.call(this);
    this.editorControl = null;
    this.callbacks = null;
  }
  Dialog.open = function (callbacks) {
    this.callbacks = callbacks;
    $('#routeedit_dialog').dialog('open');
  }
  Dialog.makeNew = function () {
    $("#routeedit_dialog_description").val('');
    this.editorControl.startPolyLine();
  }
  Dialog.loadFromServer = function (id) {
    var control = this;
    $.ajax({
      'url': routeEditUrlLoad.format({'id':id}),
      'dataType': 'json',
      'success': function(data) {
	var polyline = Polyline.instanciate({'map':control.editorControl.map});
	polyline.setPathFromString(data.route.path);
	$("#routeedit_dialog_description").val(data.route.description);
	control.editorControl.objects = [polyline];
	control.editorControl.push(polyline.editorMode.instanciate(control.editorControl, polyline));
	control.editorControl.center();
      }
    });
  }
  Dialog.saveToServer = function (id, callback) {
    var control = this;
    $.ajax({
      'url': routeEditUrlSave.format({'id':id}),
      'type': 'POST',
      'dataType': 'json',
      'data': {
        'description': $("#routeedit_dialog_description").val(),
	'path': control.editorControl.objects[0].getPathAsString(),
	'distance': control.editorControl.objects[0].getDistance()
      },
      'success': function(data) {
        if (typeof(callback) != 'undefined')
          callback(data);
      },
      'error': function(XMLHttpRequest, textStatus, errorThrown) {
        console.log('textStatus: ' + textStatus + 'errorThrown: ' + errorThrown);
      }
    });
  }

  // This is a singleton...
  routeEditDialog = Dialog.instanciate();

  $("#routeedit_dialog").find('.routeedit_dialog_input_field').validate();

  $("#routeedit_dialog").dialog({
    bgiframe: true,
    autoOpen: false,
    modal: true,
    title: gettext('Edit route'),
    //show: 'fade',
    width: 800,
    height: 500,
    buttons: {
      'Cancel': function() {
        $(this).dialog('close');
        routeEditDialog.callbacks.cancel(routeEditDialog);
      },
      'Save': function() {
        var valid = true;
        $('.ui-dialog:has(#routeedit_dialog) .ui-dialog-buttonpane #error').remove();
        if (routeEditDialog.editorControl.objects[0].getPath().getArray().length < 2) {
  	  $('.ui-dialog:has(#routeedit_dialog) .ui-dialog-buttonpane').prepend("<span id='error'>Please click in the map to add some points to your route first</span>");
 	  valid = false;
        }
        if (!$('#routeedit_dialog .routeedit_dialog_input_field').valid()) {
	  valid = false;
        }
	if (valid) {
	  $(this).dialog('close');
	  routeEditDialog.callbacks.save(routeEditDialog);
        }
      }
    },
    open: function(event, ui) {
      var map = new google.maps.Map($( "#routeedit_dialog_map_canvas")[0], {
        zoom: 10,
        center: new google.maps.LatLng(59.968927831023535, 10.699465698242197),
        mapTypeId: google.maps.MapTypeId.ROADMAP
      });
      var plot = $.plot($("#routeedit_dialog_chart_canvas"), []);
      routeEditDialog.editorControl = EditorControl.instanciate(map, plot);
      routeEditDialog.callbacks.open(routeEditDialog);
    }
  });
});
