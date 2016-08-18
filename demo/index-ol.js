'use strict';

/*global ol */

var map = new ol.Map({
    target: 'map',
    view: new ol.View({
        center: [0, 0],
        zoom: 2
    })
});

map.addLayer(new ol.layer.Tile({
    source: new ol.source.OSM()
}));

var markers = new ol.layer.Vector({
    source: new ol.source.Vector()
});
map.addLayer(markers);

// var markers = L.geoJson(null, {
//     pointToLayer: createClusterIcon
// }).addTo(map);

var worker = new Worker('worker.js');
var ready = false;

worker.onmessage = function (e) {
    if (e.data.ready) {
        ready = true;
        update();
    } else {
        markers.getSource().clear();
        var geojsonObject = {
          "type": "FeatureCollection",
          "features": e.data
        };
        var features = (new ol.format.GeoJSON()).readFeatures(geojsonObject, {
           dataProjection: 'EPSG:4326',
           featureProjection: 'EPSG:3857',
        });
        markers.getSource().addFeatures(features);
    }
};

function update() {
    if (!ready) return;
    var bounds = ol.proj.transformExtent(
        map.getView().calculateExtent(map.getSize()),
        'EPSG:3857',
        'EPSG:4326'
    );
    worker.postMessage({
        bbox: bounds,
        zoom: map.getView().getZoom()
    });
}

map.on('moveend', update);

function createClusterIcon(feature, latlng) {
    if (!feature.properties.cluster) return L.marker(latlng);

    var count = feature.properties.point_count;
    var size =
        count < 100 ? 'small' :
        count < 1000 ? 'medium' : 'large';
    var icon = L.divIcon({
        html: '<div><span>' + feature.properties.point_count_abbreviated + '</span></div>',
        className: 'marker-cluster marker-cluster-' + size,
        iconSize: L.point(40, 40)
    });
    return L.marker(latlng, {icon: icon});
}
