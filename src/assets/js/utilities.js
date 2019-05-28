import axios from 'axios';
import mapboxgl from 'mapbox-gl';
import map from './brew-map';

const ajax_url = "https://wpbrew.local/wp-admin/admin-ajax.php";
const search_input = document.getElementById('search-text');

export const toggle_loading_beer = () => {

  let loading_beer = document.getElementById('loading-beer');

  if (loading_beer.style.display === "none") {
    loading_beer.style.display = "block";
  } else {
    loading_beer.style.display = "none";
  }

}

export const toggle_autocomplete_dropdown = () => {

  let loading_beer = document.getElementById('autocomplete-results');

  if (loading_beer.style.display === "none") {
    loading_beer.style.display = "block";
  } else {
    loading_beer.style.display = "none";
  }

}

export const clearResults = () => {
  let container = document.getElementById('brewery-container');
  container.innerHTML = "";
}

export const flyToStore = currentFeature => {
  map.flyTo({
    center: currentFeature.geometry.coordinates,
    zoom: 15
  });
}

export const createPopUp = currentFeature => {
  var popUps = document.getElementsByClassName('mapboxgl-popup');
  // Check if there is already a popup on the map and if so, remove it
  if (popUps[0]) popUps[0].remove();

  var popup = new mapboxgl.Popup({ closeOnClick: false })
    .setLngLat(currentFeature.geometry.coordinates)
    .setHTML(`
      <strong>${currentFeature.properties.name}</strong>
      <p>${currentFeature.properties.city} - ${parseFloat(currentFeature.properties.distance).toFixed(2)}mi</p>
    `)
    .addTo(map);
}

export const autocomplete_cities = (e) => {
  const search_text = document.getElementById('search-text').value.trim();
  if (search_text !== "" && search_text.length > 2) {
    axios.get(`${ajax_url}?action=autocomplete_breweries&text_so_far=${search_input.value}`).then((response) => {
      const results_container = document.getElementById('autocomplete-results');
      results_container.style.display = "block";
      results_container.innerHTML = response.data.data.html;
    });
  }
}

export const displayResults = (response, user_location = []) => {

  const container = document.getElementById('brewery-container');
  const breweries = response.data.data.results;

  clearResults();

  if (!response.data.success) {
    container.innerHTML = response.data.data.html;
    return;
  }

  const locations = {
    "type": "FeatureCollection",
    "features": []
  };

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

  if (user_location.length !== 0) {
    bounds.extend(user_location);
    new mapboxgl.Marker()
      .setLngLat(user_location)
      .addTo(map);
  }

  map.fitBounds(bounds, {
    'padding': 75
  });

  container.innerHTML = response.data.data.html;  


  const cards = document.querySelectorAll('.brewery-card');

  cards.forEach((card) => {
    card.addEventListener('click', function (e) {
      // Update the currentFeature to the store associated with the clicked link
      var clickedListing = locations.features[e.currentTarget.dataset.position];
      console.log(clickedListing);
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

    }
  });


}
