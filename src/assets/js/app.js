import { debounce } from 'throttle-debounce';
import axios from 'axios';
import map from './brew-map';
import {
  toggle_autocomplete_dropdown,
  toggle_loading_beer,
  clearResults,
  flyToStore,
  createPopUp,
  autocomplete_cities,
  displayResults
} from './utilities';


const ajax_url = "https://wpbrew.local/wp-admin/admin-ajax.php";
const search_input = document.getElementById('search-text');

window.onload = () => {

  if("geolocation" in navigator){
    
    navigator.geolocation.getCurrentPosition( (position) => {

      console.log({position});

      const lat = position.coords.latitude.toString();
      const lng = position.coords.longitude.toString();

      let data = new FormData();
      data.append('action', 'search_breweries');
      data.append('lat', lat);
      data.append('lng', lng);
      
      toggle_loading_beer();
      axios.post(`${ajax_url}`, data).then(response => {
        toggle_loading_beer();
        displayResults(response, [lng, lat]);
      });

    }, (error) => {
      console.log({error});
    }); 

  };

};



document.addEventListener('click', function (e) {
  if (e.target && e.target.classList.contains('autocomplete-city')) {

    let data = new FormData();
    data.append('action', 'search_breweries');
    data.append('lat', e.target.dataset.lat);
    data.append('lng', e.target.dataset.lng);

    let city_state = e.target.querySelector('span');
    search_input.value = city_state.innerText;

    clearResults();
    toggle_loading_beer();
    toggle_autocomplete_dropdown();
    axios.post(`${ajax_url}`, data).then(response => {
      toggle_loading_beer();
      displayResults(response);
    });

  }
});

search_input.addEventListener('keyup', debounce(100, autocomplete_cities));
window.addEventListener('load', () => {
  if( search_input.value !== "" ){
    search_breweries();
  }
});


