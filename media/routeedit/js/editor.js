/* IE fix. (should place this in a ) */
if (!('map' in Array.prototype)) {
    Array.prototype.map= function(mapper, that /*opt*/) {
        var other= new Array(this.length);
        for (var i= 0, n= this.length; i<n; i++)
            if (i in this)
                other[i]= mapper.call(that, this[i], i, this);
        return other;
    };
}


function latLngInArray(latLng, arr) {
  var res = false;
  $.each(arr, function (index, item) {
    if (latLng.equals(item)) res = true;
  });
  return res;
}

/* A generic object system */
function Obj() {};
Obj.prototype.idSeq = 0;
Obj.prototype.create = function () {
  var F = function () {};
  F.prototype = this;
  var res = new F();
  res.id = Obj.idSeq++;
  return res;
};
Obj.prototype.subclassinit = function (name) { this.__name__ = name; }
Obj.prototype.subclass = function () {
  var cls = this.create();
  cls.subclassinit.apply(cls, arguments);
  return cls;
};
Obj.prototype.init = function () {}
Obj.prototype.instanciate = function () {
  var obj = this.create();
  obj.init.apply(obj, arguments);
  return obj;
};
Obj = new Obj();


/* Map objects */
MapObj = Obj.subclass('MapObj');
MapObj.setMap = function (map) {
  this.mapObj.setMap(map);
}
MapObj.addListener = function (name, fn) {
 var mapObj = this;
 return google.maps.event.addListener(this.mapObj, name, function (ev) { return fn.call(mapObj, ev); });
}

/* Polyline med avseende på object */
Polyline = MapObj.subclass('Polyline');
Polyline.options = {'strokeColor':'#ff0000'}
Polyline.init = function (options) {
  MapObj.init.call(this);
  this.mapObj = new google.maps.Polyline({});
  this.options = Polyline.options;
  this.setOptions(options);
}
Polyline.setMap = function (map) {
  this.mapObj.setMap(map);
}
Polyline.getPath = function () {
  return this.mapObj.getPath();
}
Polyline.setPath = function (path) {
  this.mapObj.setPath(path);
}
Polyline.getOptions = function () {
  return this.options;
}
Polyline.setOptions = function (options) {
  for (var key in options) {
    this.options[key] = options[key];
  }
  this.mapObj.setOptions(this.options);
}
Polyline.copy = function (map) {
  var options = {};
  for (var key in this.options) {
    options[key] = this.options[key];
  }
  options.map = map;
  var res = Polyline.instanciate(options);
  res.mapObj.setPath(this.mapObj.getPath());
  return res;
};
Polyline.getBounds = function () {
  var bounds = new google.maps.LatLngBounds();

  $.each(this.getPath().getArray(), function (index, latLng) {
    bounds.extend(latLng);
  });

  return bounds;
}
Polyline.getPathAsString = function () {
  return $.toJSON(
    this.getPath().getArray().map(
      function (latLng) {
        return [latLng.lat(), latLng.lng()];
      }
    )
  );
}
Polyline.setPathFromString = function (path) {
  this.setPath(
    eval(path).map(
      function (latLng) {
        return new google.maps.LatLng(latLng[0], latLng[1]);
      }
    )
  );
}
Polyline.getDistance = function () {
  var path = this.getPath().getArray();
  var distance = 0;
  for (i = 1; i < path.length; i++) {
    distance += google.maps.geometry.spherical.computeDistanceBetween(path[i-1], path[i]);
  };
  return distance;
}


/* An editor mode */
Mode = Obj.subclass('Mode');
Mode.init = function (editor) {
  Obj.init.call(this);
  this.editor = editor;
  this.listeners = [];
}
Mode.enable = function () {
  // console.log({"enable": this.__name__});
};
Mode.disable = function () {
  // console.log({"disable": this.__name__});
  $.each(this.listeners, function () {
    google.maps.event.removeListener(this);
  });
  this.listeners = [];
};
Mode.done = function () {};
Mode.cancel = function () {};


/* Generic object selector */
Selector = Mode.subclass('Selector');
Selector.enable = function () {
  Mode.enable.call(this);
  var selector = this;
  $.each(this.editor.objects, function (i, obj) {
    selector.listeners.push(obj.addListener('click', function (ev) {
      mode = this.editorMode.instanciate(selector.editor, this);
      selector.editor.push(mode);
    }));
  });
//  this.editor.editButtonsContainer.find("#startPolyline").show();
}
Selector.disable = function () {
  Mode.disable.call(this);
//  this.editor.editButtonsContainer.find("#startPolyline").hide();
}

PolylineMode = Mode.subclass('PolylineMode');
PolylineMode.init = function (editor, polyline) {
  this.polyline = polyline;
  this.markers = [];
  Mode.init.call(this, editor);
}
PolylineMode.enable = function () {
  Mode.enable.call(this);
  this.oldOptions = this.polyline.getOptions();
  this.polyline.setOptions({'strokeColor':'#0000ff'});
  var polylineMode = this;

  this.polyline.getPath().forEach(function (latLng, index) {
    var marker = new google.maps.Marker({'map': polylineMode.editor.map, 'draggable': true, 'position': latLng, 'icon': polylineMode.editor.waypointIcon});
    marker.index = index;
    polylineMode.markers.push(marker);
  });
  this.drawHeightCurve();
}
PolylineMode.disable = function () {
  Mode.disable.call(this);

  this.polyline.setOptions(this.oldOptions);

  var polylineEditor = this;
  $.each(this.markers, function (i, marker) {
    marker.setMap(null);
  });
  this.markers = [];

  this.clearHeightCurve();
}
PolylineMode.drawHeightCurve = function () {
  var polylineMode = this;

  if (this.polyline.getPath().getArray().length > 1 ) {
    var pathArray = this.polyline.getPath().getArray();
    var locations = [];
    var pathLocationIndexes = [];
    var prev = null
    // Fixme: This could be more even (distance-based)...
    $.each(pathArray, function(index, latLng) {
      if (index  > 0) {
        for (i = 1; i < 10; i++) {
	  a = i / 10;
          locations.push(new google.maps.LatLng((1-a)*prev.lat() + a*latLng.lat(),
						(1-a)*prev.lng() + a*latLng.lng()));
        }
      }
      prev  = latLng;
      pathLocationIndexes.push(locations.length);
      locations.push(latLng);
    });

    elevationService.getElevationForLocations({'locations': locations}, function (elevations, status) {
	var path = polylineMode.polyline.getPath();
	var sampleElevationData = [];
	var cornerElevationData = [];
	var distance = 0;
	var prev = path.getArray()[0];
	$.each(elevations, function (index, item) {
	  distance += google.maps.geometry.spherical.computeDistanceBetween(prev, item.location) / 1000.0;
	  prev = item.location;
	  sampleElevationData.push([distance, item.elevation]);
	  if ($.inArray(index, pathLocationIndexes) != -1) {
	    cornerElevationData.push([distance, item.elevation]);
          }
	});

	polylineMode.editor.plot.setData([{'lines':{'show':true}, 'data':sampleElevationData},
					  {'points':{'show':true}, 'data':cornerElevationData}]);
	polylineMode.editor.plot.setupGrid();
	polylineMode.editor.plot.draw();
    });
 } else {
   this.clearHeightCurve();
 }
}
PolylineMode.clearHeightCurve = function () {
  this.editor.plot.setData([]);
  this.editor.plot.setupGrid();
  this.editor.plot.draw();
}


PolylineEditor = PolylineMode.subclass('PolylineEditor');
PolylineEditor.enable = function () {
  PolylineMode.enable.call(this);
  polylineEditor = this;
  polylineEditor.listeners.push(google.maps.event.addListener(polylineEditor.editor.map, 'click', function (ev) {
    polylineEditor.editor.pop('cancel');
  }));

  var polylineEditor = this;

  $.each(this.markers, function (index, marker) {
    polylineEditor.listeners.push(google.maps.event.addListener(marker, 'drag', function (ev) {
      polylineEditor.polyline.getPath().setAt(marker.index, ev.latLng);
    }));
    polylineEditor.listeners.push(google.maps.event.addListener(marker, 'dragend', function (ev) {
      polylineEditor.drawHeightCurve();
    }));

    polylineEditor.listeners.push(google.maps.event.addListener(marker, 'dblclick', function (ev) {
      polylineEditor.polyline.getPath().removeAt(marker.index);
      polylineEditor.editor.update();
    }));
  });

  polylineEditor.listeners.push(this.polyline.addListener('click', function (ev) {
    var prev = null;
    var bestDiff = null;
    var bestIndex = null;
    polylineEditor.polyline.getPath().forEach(function (latLng, index) {
      if (prev != null) {
	// This should be on one line... prev, ev.latLng, latLng
	// We assume that: The earth is flat (enought), and there is no date-line / coordinate wraparound. This is sooo true... for Norway

	var a = (ev.latLng.lat() - prev.lat()) / (latLng.lat() - prev.lat());
	var b = (ev.latLng.lng() - prev.lng()) / (latLng.lng() - prev.lng());
	var diff = Math.abs(a - b);

	if (diff < 0.1 && (bestDiff == null || bestDiff > diff)) {
	  bestIndex = index;
	  bestDiff = diff;
	}
      }
      prev = latLng;
    });
    if (bestIndex == null)
      throw "Unable to find clicked route segment! This is probably a rounding error, or maybe the earth is actually round...";
    polylineEditor.polyline.getPath().insertAt(bestIndex, ev.latLng);
    polylineEditor.editor.update();
  }));
  this.editor.editButtonsContainer.find("#addPoints").show();
}
PolylineEditor.disable = function () {
  PolylineMode.disable.call(this);
  this.editor.editButtonsContainer.find("#addPoints").hide();
}
PolylineEditor.addPoints = function () {
  this.editor.pop('done');
  this.editor.push(PolylinePointAdder.instanciate(this.editor, this.polyline));
}
// Register the mode as default mode for objects of type Polyline
Polyline.editorMode = PolylineEditor;


/* Add new points to end of Polyline */
PolylinePointAdder = PolylineMode.subclass('PolylinePointAdder');
PolylinePointAdder.enable = function () {
  PolylineMode.enable.call(this);
  var polylineAdder = this;
  this.listeners.push(google.maps.event.addListener(this.editor.map, 'click', function (ev) {
    polylineAdder.polyline.getPath().push(ev.latLng);
    var marker = new google.maps.Marker({'map': polylineAdder.editor.map, 'position': ev.latLng, 'icon': polylineAdder.editor.waypointIcon});
    polylineAdder.markers.push(marker);
    polylineAdder.drawHeightCurve();
  }));
  this.editor.editButtonsContainer.find("#editPoints").show();
}
PolylinePointAdder.disable = function () {
  PolylineMode.disable.call(this);
  this.editor.editButtonsContainer.find("#editPoints").hide();
}
PolylinePointAdder.editPoints = function () {
  this.editor.pop('done');
  this.editor.push(PolylineEditor.instanciate(this.editor, this.polyline));
}


/* Add a new Polyline */
PolylineAdder = PolylinePointAdder.subclass('PolylineAdder');
PolylineAdder.init = function (editor, options) {
  options.map = editor.map;
  polyline = Polyline.instanciate(options);
  PolylinePointAdder.init.call(this, editor, polyline);
}
PolylineAdder.enable = function () {
  PolylinePointAdder.enable.call(this);
  this.editor.editButtonsContainer.find("#cancel").show();
}
PolylineAdder.disable = function () {
  PolylinePointAdder.disable.call(this);
  this.editor.editButtonsContainer.find("#cancel").hide();
}
PolylineAdder.done = function () {
  PolylinePointAdder.done.call(this);
  this.editor.objects.push(this.polyline);
}
PolylineAdder.cancel = function () {
  PolylinePointAdder.cancel.call(this);
  this.polyline.setMap(null);
}


Control = Obj.subclass('Control');
Control.init = function (map) {
  Obj.init.call(this);
  var control = this;

  this.waypointIcon = new google.maps.MarkerImage(routeEditStaticFiles + '/img/waypoint.png', new google.maps.Size(16, 16), new google.maps.Point(0, 0), new google.maps.Point(8, 8));
  this.objects = [];
  this.map = map;
}
Control.copyFrom = function (other) {
  var editorControl = this;
  this.objects = other.objects.map(function (obj) {
    return obj.copy(editorControl.map);
  });
}
Control.update = function () { }
Control.center = function () {
  var bounds = new google.maps.LatLngBounds();

  if (this.objects.length) {
    $.each(this.objects, function (index, obj) {
      bounds.union(obj.getBounds());
    });
    this.map.fitBounds(bounds);
  }
}

EditorControl = Control.subclass('EditorControl');
EditorControl.init = function (map, plot) {
 Control.init.call(this, map);
  var editorControl = this;
  this.plot = plot;
  this.editButtonsContainer = $("" +
  "  <div id='editorcontainer'>" +
  "    <span class='editbutton' id='done'><span>Done</span></span>" +
  "    <span class='editbutton' id='cancel'><span>Cancel</span></span>" +
  "    <span class='editbutton' id='startPolyline'><span>New</span></span>" +
  "    <span class='editbutton' id='addPoints'><span>Add to end</span></span>" +
  "    <span class='editbutton' id='editPoints'><span>Modify existing points</span></span>" +
  "  </div>" +
  "");
  this.editButtonsContainer.find("#done").click(function (ev) { return editorControl.done(ev); });
  this.editButtonsContainer.find("#cancel").click(function (ev) { return editorControl.cancel(ev); });
  this.editButtonsContainer.find("#startPolyline").click(function (ev) { return editorControl.startPolyLine(ev); });
  this.editButtonsContainer.find("#addPoints").click(function (ev) { return editorControl.addPoints(ev); });
  this.editButtonsContainer.find("#editPoints").click(function (ev) { return editorControl.editPoints(ev); });

  this.map.controls[google.maps.ControlPosition.TOP_LEFT].push(this.editButtonsContainer[0]);

  this.actions = [Selector.instanciate(this)];
  this.actions[0].enable();
}
EditorControl.currentAction = function () {
 return this.actions[this.actions.length - 1];
}
EditorControl.disable = function (mode) {
  this.currentAction().disable();
}
EditorControl.enable = function (mode) {
  this.currentAction().enable();
}
EditorControl.update = function (mode) {
  this.disable();
  this.enable();
}
EditorControl.push = function (mode) {
  this.disable();
  this.actions.push(mode);
  this.enable();
}
EditorControl.pop = function (method, args) {
  this.disable();
  mode = this.actions.pop();
  mode[method].apply(mode, args);
  this.enable();
}
EditorControl.done = function (ev) {
  this.pop('done');
}
EditorControl.cancel = function (ev) {
  this.pop('cancel');
}
EditorControl.startPolyLine = function (ev) {
  var polyline = Polyline.instanciate({'map': this.map});
  this.objects.push(polyline);
  this.push(PolylinePointAdder.instanciate(this, polyline));
}
EditorControl.addPoints = function (ev) {
  this.currentAction().addPoints();
}
EditorControl.editPoints = function (ev) {
  this.currentAction().editPoints();
}
EditorControl.copyFrom = function (other) {
  Control.copyFrom.call(this, other);
  this.update();
}
EditorControl.edit = function (view) {
  this.view = view;
  this.copyFrom(view)
  this.center();
}
EditorControl.save = function () {
  this.view.copyFrom(this);
  this.view.center();
}


ViewerControl = Control.subclass('ViewerControl');
ViewerControl.init = function (map) {
  Control.init.call(this, map);
  var viewerControl = this;
  this.editButtonsContainer = $("" +
  "  <div id='editorcontainer'>" +
  "    <span class='editbutton' id='"+this.id+"edit'><span>Edit</span></span>" +
  "  </div>" +
  "");
  this.editButtonsContainer.find("#"+this.id+"edit").click(function (ev) { return viewerControl.edit(ev); });

  this.map.controls[google.maps.ControlPosition.TOP_LEFT].push(this.editButtonsContainer[0]);
}

$(document).ready(function() {
  elevationService = new google.maps.ElevationService();
});
