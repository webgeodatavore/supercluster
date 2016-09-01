'use strict';

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

var markers = new ol.layer.Image({
   source: new ol.source.ImageVector({
     source: new ol.source.Vector(),
     style: createClusterIcon
   })
 })

map.addLayer(markers);

var worker = new Worker('worker.js');
var ready = false;

worker.onmessage = function (e) {
    if (e.data.ready) {
        ready = true;
        update();
    } else {
        markers.getSource().getSource().clear();
        var geojsonObject = {
            "type": "FeatureCollection",
            "features": e.data
        };
        var features = (new ol.format.GeoJSON()).readFeatures(geojsonObject, {
            dataProjection: 'EPSG:4326',
            featureProjection: 'EPSG:3857',
        });
        markers.getSource().getSource().addFeatures(features);
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

var iconStyle = new ol.style.Style({
    image: new ol.style.Icon(/** @type {olx.style.IconOptions} */ ({
        anchor: [0.5, 40],
        anchorXUnits: 'fraction',
        anchorYUnits: 'pixels',
        src: 'http://cdn.leafletjs.com/leaflet/v1.0.0-beta.2/images/marker-icon.png'
    }))
});

var textStroke = new ol.style.Stroke({
    color: '#fff',
    width: 1
});

var textFill = new ol.style.Fill({
    color: '#000'
});

var clusterStylesConfig = {
    'small': {
        rgba_bg: [181, 226, 140, 0.6],
        rgba_fg: [110, 204, 57, 0.6]
    },
    'medium': {
        rgba_bg: [241, 211, 87, 0.6],
        rgba_fg: [240, 194, 12, 0.6]
    },
    'large': {
        rgba_bg: [253, 156, 115, 0.6],
        rgba_fg: [241, 128, 23, 0.6]
    }
};

function createClusterIcon(feature, resolution) {
    if (!feature.get('cluster')) {
        return iconStyle;
    }
    if (feature.get('point_count')) {
        // create styles...
        var count = feature.get('point_count');
        var size =
            count < 100 ? 'small' :
            count < 1000 ? 'medium' : 'large';
        return [
            new ol.style.Style({
                image: new ol.style.Circle({
                    radius: 20,
                    fill: new ol.style.Fill({
                        color: 'rgba(' + clusterStylesConfig[size].rgba_bg.join(',') + ')'
                    })
                })
            }),
            new ol.style.Style({
                image: new ol.style.Circle({
                    radius: 15,
                    fill: new ol.style.Fill({
                        color: 'rgba(' + clusterStylesConfig[size].rgba_fg.join(',') + ')'
                    })
                }),
                text: new ol.style.Text({
                      font: '12px "Helvetica Neue", Arial, Helvetica, sans-serif',
                      text: '' + feature.get('point_count'),
                      fill: textFill
                })
            })
        ];
    }
};
