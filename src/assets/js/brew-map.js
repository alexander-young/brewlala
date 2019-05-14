import mapboxgl from 'mapbox-gl';

mapboxgl.accessToken = 'pk.eyJ1Ijoid3BjYXN0cyIsImEiOiJjanV4NjhzcWkwano3NDNwdmM5bDBxZzJ1In0.QqIPG1r_J23p8TEZPVaNVQ';

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/dark-v10',
  center: [
    "-111.875021142025",
    "40.7563910792927"
  ],
  zoom: 16
});

// Add zoom and rotation controls to the map.
map.addControl(new mapboxgl.NavigationControl());

map.on('load', (e) => {

  map.addSource("breweries", {
    type: "geojson",
    data: {
      "type": "FeatureCollection",
      "features": []
    }
  });

  // Add the data to your map as a layer
  map.addLayer({
    id: 'locations',
    type: 'symbol',
    // Add a GeoJSON source containing place coordinates and information.
    source: "breweries",
    zoom: 14,
    layout: {
      'icon-image': 'beer-15',
      'icon-allow-overlap': true,
      'icon-size': 2
    }
  });
});

export default map;
