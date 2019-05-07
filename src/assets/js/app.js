import { debounce } from 'throttle-debounce';
import axios from 'axios';

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

let search_input = document.getElementById('search-text');

const toggle_loading_beer = () => {

  let loading_beer = document.getElementById('loading-beer');

  if (loading_beer.style.display === "none") {
    loading_beer.style.display = "block";
  } else {
    loading_beer.style.display = "none";
  }

}

const toggle_autocomplete_dropdown = () => {

  let loading_beer = document.getElementById('autocomplete-results');

  if (loading_beer.style.display === "none") {
    loading_beer.style.display = "block";
  } else {
    loading_beer.style.display = "none";
  }

}


window.onload = () => {

  if("geolocation" in navigator){
    
    navigator.geolocation.getCurrentPosition( (position) => {

      console.log({position});

      let data = new FormData();
      data.append('action', 'search_breweries');
      data.append('lat', position.coords.latitude);
      data.append('lng', position.coords.longitude);

      toggle_loading_beer();
      axios.post(`https://wpbrew.local/wp-admin/admin-ajax.php`, data).then(response => {
        toggle_loading_beer();
        displayResults( response );
      });

    }); 

  };

};

const clearResults = () => {
  let container = document.getElementById('brewery-container');
  container.innerHTML = "";
}

document.addEventListener('click', function (e) {
  if (e.target && e.target.classList.contains('autocomplete-city')) {

    let data = new FormData();
    data.append('action', 'search_breweries');
    data.append('lat', e.target.dataset.lat);
    data.append('lng', e.target.dataset.lng);

    search_input.value = e.target.dataset.city;

    clearResults();
    toggle_loading_beer();
    toggle_autocomplete_dropdown();
    axios.post(`https://wpbrew.local/wp-admin/admin-ajax.php`, data).then(response => {
      toggle_loading_beer();
      displayResults(response);
    });

  }
});

const displayResults = (response) => {

  clearResults();

  if (!response.data.success) {
    container.innerHTML = response.data.data.html;
    return;
  }

  const locations = {
    "type": "FeatureCollection",
    "features": []
  };

  const breweries = response.data.data.results;

  breweries.forEach((brew) => {

    const {
      latitude,
      longitude
    } = brew;

    if (latitude !== null && longitude !== null) {
      locations.features.push({
        "type": "Feature",
        "geometry": {
          "type": "Point",
          "coordinates": [
            longitude,
            latitude
          ]
        },
        "properties": brew
      });
    }


  });

  // update map with new locations
  map.getSource("breweries").setData(locations);

  // center around markers
  const bounds = new mapboxgl.LngLatBounds();
  locations.features.forEach((feature) => {
    bounds.extend(feature.geometry.coordinates);
  });
  map.fitBounds(bounds, {
    'padding': 75
  });

  let container = document.getElementById('brewery-container');
  container.innerHTML = response.data.data.html;

  // Add an event listener for the links in the sidebar listing
  const cards = document.querySelectorAll('.brewery-card');

  cards.forEach((card) => {
    card.addEventListener('click', function (e) {
      // Update the currentFeature to the store associated with the clicked link
      var clickedListing = locations.features[e.currentTarget.dataset.position];
      // 1. Fly to the point associated with the clicked link
      flyToStore(clickedListing);
      // 2. Close all other popups and display popup for clicked store
      createPopUp(clickedListing);
      // 3. Highlight listing in sidebar (and remove highlight for all other listings)
      var activeItem = document.getElementsByClassName('active');
      if (activeItem[0]) {
        activeItem[0].classList.remove('active');
      }
      this.classList.add('active');
    });
  });

  // Add an event listener for when a user clicks on the map
  map.on('click', function (e) {
    // Query all the rendered points in the view
    var features = map.queryRenderedFeatures(e.point, {
      layers: ['locations']
    });
    if (features.length) {
      var clickedPoint = features[0];
      // 1. Fly to the point
      flyToStore(clickedPoint);
      // 2. Close all other popups and display popup for clicked store
      createPopUp(clickedPoint);
      // 3. Highlight listing in sidebar (and remove highlight for all other listings)
      var activeItem = document.getElementsByClassName('active');
      if (activeItem[0]) {
        activeItem[0].classList.remove('active');
      }

      // Find the index of the store.features that corresponds to the clickedPoint that fired the event listener
      let selectedFeature = clickedPoint.properties.street;
      let selectedFeatureIndex = 0;

      for (var i = 0; i < locations.features.length; i++) {
        if (locations.features[i].properties.street === selectedFeature) {
          selectedFeatureIndex = i;
        }
      }

      // Select the correct list item using the found index and add the active class
      let listing = document.getElementById('brewery-' + selectedFeatureIndex);
      listing.classList.add('active');
      console.log({
        selectedFeatureIndex
      });

    }
  });


}

const autocomplete_cities = ( e ) => {
  const search_text = search_input.value.trim();
  if ( search_text !== "" && search_text.length > 2  ){
    axios.get(`https://wpbrew.local/wp-admin/admin-ajax.php?action=autocomplete_breweries&text_so_far=${search_input.value}`).then( (response) => {
      const results_container = document.getElementById('autocomplete-results');
      results_container.style.display = "block";
      results_container.innerHTML = response.data.data.html;
    });
  }
}

search_input.addEventListener('keyup', debounce(100, autocomplete_cities));
// search_input.addEventListener('keyup', autocomplete_cities);
window.addEventListener('load', () => {
  if( search_input.value !== "" ){
    search_breweries();
  }
});


function flyToStore(currentFeature) {
  map.flyTo({
    center: currentFeature.geometry.coordinates,
    zoom: 15
  });
}

function createPopUp(currentFeature) {
  var popUps = document.getElementsByClassName('mapboxgl-popup');
  // Check if there is already a popup on the map and if so, remove it
  if (popUps[0]) popUps[0].remove();

  var popup = new mapboxgl.Popup({ closeOnClick: false })
    .setLngLat(currentFeature.geometry.coordinates)
    .setHTML(`
      <strong>${currentFeature.properties.name}</strong>
      <p>${currentFeature.properties.city}</p>
    `)
    .addTo(map);
}