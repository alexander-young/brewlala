<?php
/**
 * Author: Ole Fredrik Lie
 * URL: http://olefredrik.com
 *
 * FoundationPress functions and definitions
 *
 * Set up the theme and provides some helper functions, which are used in the
 * theme as custom template tags. Others are attached to action and filter
 * hooks in WordPress to change core functionality.
 *
 * @link https://codex.wordpress.org/Theme_Development
 * @package FoundationPress
 * @since FoundationPress 1.0.0
 */

 function search_breweries_by_geo( $lat, $lng ){
  
  global $wpdb;

  $earth_radius = 3959;
  $distance = 15;

  $results = $wpdb->prepare("
  SELECT DISTINCT
          p.ID,
          p.post_title,
          name.meta_value as name,
          street.meta_value as street,
          latitude.meta_value as latitude,
          longitude.meta_value as longitude,
          city.meta_value as city,
          brewery_type.meta_value as brewery_type,
          ( %d * acos(
          cos( radians( %s ) )
          * cos( radians( latitude.meta_value ) )
          * cos( radians( longitude.meta_value ) - radians( %s ) )
          + sin( radians( %s ) )
          * sin( radians( latitude.meta_value ) )
          ) )
          AS distance
      FROM $wpdb->posts p
      INNER JOIN $wpdb->postmeta latitude ON p.ID = latitude.post_id
      INNER JOIN $wpdb->postmeta longitude ON p.ID = longitude.post_id
      INNER JOIN $wpdb->postmeta name ON p.ID = name.post_id
      INNER JOIN $wpdb->postmeta street ON p.ID = street.post_id
      INNER JOIN $wpdb->postmeta city ON p.ID = city.post_id
      INNER JOIN $wpdb->postmeta brewery_type ON p.ID = brewery_type.post_id
      WHERE 1 = 1
      AND p.post_type = 'brewery'
      AND p.post_status = 'publish'
      AND latitude.meta_key = 'latitude'
      AND longitude.meta_key = 'longitude'
      AND name.meta_key = 'name'
      AND street.meta_key = 'street'
      AND city.meta_key = 'city'
      AND brewery_type.meta_key = 'brewery_type'
      HAVING distance < %s
      ORDER BY distance ASC",
      $earth_radius,
      $lat,
      $lng,
      $lat,
      $distance
      );

  $nearbyLocations = $wpdb->get_results($results);

  return $nearbyLocations;

 }



add_action('wp_ajax_nopriv_autocomplete_breweries', 'autocomplete_breweries');
add_action('wp_ajax_autocomplete_breweries', 'autocomplete_breweries');
function autocomplete_breweries(){
  global $wpdb;

  $text_so_far = $wpdb->esc_like( $_GET['text_so_far'] ) . '%';
  $results = $wpdb->get_results( $wpdb->prepare(
    "SELECT 
      city, state_id, lat, lng 
    FROM 
      us_cities
    WHERE 
      city
    LIKE 
      %s
    AND
      population IS NOT NULL
    ORDER BY 
      population 
    DESC
    LIMIT
      5
    ",
    $text_so_far
  ) );

  ob_start();

  require get_stylesheet_directory() . '/template-parts/autocomplete.php';

  wp_send_json_success( [
    'html' => ob_get_clean(),
    'results' => $results,
  ] );
}

add_action('wp_ajax_nopriv_search_breweries', 'search_breweries');
add_action('wp_ajax_search_breweries', 'search_breweries');
function search_breweries(){

  $lat = $_POST['lat'];
  $lng = $_POST['lng'];

  
  $breweries = search_breweries_by_geo( $lat, $lng );
  
  ob_start();

  require get_stylesheet_directory() . '/template-parts/cards-brewery.php';

  wp_send_json_success( [ 'html' => ob_get_clean(), 'results' => $breweries ] );

}

function register_brewery_cpt() {
  register_post_type( 'brewery', array(
    'label' => 'Breweries',
    'public' => true,
    'capability_type' => 'post',
  ));
}
add_action( 'init', 'register_brewery_cpt' );



function clear_breweries_from_db() {
  
  global $wpdb;

  $wpdb->query("DELETE FROM wp_posts WHERE post_type='brewery'");
  $wpdb->query("DELETE FROM wp_postmeta WHERE post_id NOT IN (SELECT id FROM wp_posts);");
  $wpdb->query("DELETE FROM wp_term_relationships WHERE object_id NOT IN (SELECT id FROM wp_posts)");

}
// clear_breweries_from_db();



// if ( ! wp_next_scheduled( 'update_brewery_list' ) ) {
//   wp_schedule_event( time(), 'weekly', 'update_brewery_list' );
// }
add_action( 'update_brewery_list', 'get_breweries_from_api' );
add_action( 'wp_ajax_nopriv_get_breweries_from_api', 'get_breweries_from_api' );
add_action( 'wp_ajax_get_breweries_from_api', 'get_breweries_from_api' );
function get_breweries_from_api() {

  $current_page = ( ! empty( $_POST['current_page'] ) ) ? $_POST['current_page'] : 1;
  $breweries = [];

  // Should return an array of objects
  $results = wp_remote_retrieve_body( wp_remote_get('https://api.openbrewerydb.org/breweries/?page=' . $current_page . '&per_page=50') );

  // turn it into a PHP array from JSON string
  $results = json_decode( $results );   
  
  // Either the API is down or something else spooky happened. Just be done.
  if( ! is_array( $results ) || empty( $results ) ){
    return false;
  }

  $breweries[] = $results;

  foreach( $breweries[0] as $brewery ){
    
    $brewery_slug = slugify( $brewery->name . '-' . $brewery->id );     

    $existing_brewery = get_page_by_path( $brewery_slug, 'OBJECT', 'brewery' );

    if( $existing_brewery === null  ){
      
      $inserted_brewery = wp_insert_post( [
        'post_name' => $brewery_slug,
        'post_title' => $brewery_slug,
        'post_type' => 'brewery',
        'post_status' => 'publish'
      ] );

      if( is_wp_error( $inserted_brewery ) || $inserted_brewery === 0 ) {
        // die('Could not insert brewery: ' . $brewery_slug);
        // error_log( 'Could not insert brewery: ' . $brewery_slug );
        continue;
      }

      // add meta fields
      $fillable = [
        'field_5cbcd9b769ec4' => 'name',
        'field_5cbcd9cbead4e' => 'brewery_type',
        'field_5cbcd9d720328' => 'street',
        'field_5cbcd9dc20329' => 'city',
        'field_5cbcd9e02032a' => 'state',
        'field_5cbcd9e62032b' => 'postal_code',
        'field_5cbcd9f22032c' => 'country',
        'field_5cbcda0ab4375' => 'longitude',
        'field_5cbcda11b4376' => 'latitude',
        'field_5cbcda18b4377' => 'phone',
        'field_5cbcda2f35476' => 'website',
        'field_5cbcda3535477' => 'updated_at',
      ];

      foreach( $fillable as $key => $name ) {
        update_field( $key, $brewery->$name, $inserted_brewery );
      }

      
    } else {
      
      $existing_brewery_id = $existing_brewery->ID;
      $exisiting_brewerey_timestamp = get_field('updated_at', $existing_brewery_id);

      if( $brewery->updated_at >= $exisiting_brewerey_timestamp ){

        $fillable = [
          'field_5cbcd9b769ec4' => 'name',
          'field_5cbcd9cbead4e' => 'brewery_type',
          'field_5cbcd9d720328' => 'street',
          'field_5cbcd9dc20329' => 'city',
          'field_5cbcd9e02032a' => 'state',
          'field_5cbcd9e62032b' => 'postal_code',
          'field_5cbcd9f22032c' => 'country',
          'field_5cbcda0ab4375' => 'longitude',
          'field_5cbcda11b4376' => 'latitude',
          'field_5cbcda18b4377' => 'phone',
          'field_5cbcda2f35476' => 'website',
          'field_5cbcda3535477' => 'updated_at',
        ];

        foreach( $fillable as $key => $name ){
          update_field( $name, $brewery->$name, $existing_brewery_id);
        }

      }

    }

  }
  
  $current_page = $current_page + 1;
  wp_remote_post( admin_url('admin-ajax.php?action=get_breweries_from_api'), [
    'blocking' => false,
    'sslverify' => false, // we are sending this to ourselves, so trust it.
    'body' => [
      'current_page' => $current_page
    ]
  ] );
  
}


function slugify($text){

  // remove unwanted characters
  $text = preg_replace('~[^-\w]+~', '', $text);

  // trim
  $text = trim($text, '-');

  // remove duplicate -
  $text = preg_replace('~-+~', '-', $text);

  // lowercase
  $text = strtolower($text);

  if (empty($text)) {
    return 'n-a';
  }

  return $text;
}


/** Various clean up functions */
require_once( 'library/cleanup.php' );

/** Required for Foundation to work properly */
require_once( 'library/foundation.php' );

/** Format comments */
require_once( 'library/class-foundationpress-comments.php' );

/** Register all navigation menus */
require_once( 'library/navigation.php' );

/** Add menu walkers for top-bar and off-canvas */
require_once( 'library/class-foundationpress-top-bar-walker.php' );
require_once( 'library/class-foundationpress-mobile-walker.php' );

/** Create widget areas in sidebar and footer */
require_once( 'library/widget-areas.php' );

/** Return entry meta information for posts */
require_once( 'library/entry-meta.php' );

/** Enqueue scripts */
require_once( 'library/enqueue-scripts.php' );

/** Add theme support */
require_once( 'library/theme-support.php' );

/** Add Nav Options to Customer */
require_once( 'library/custom-nav.php' );

/** Change WP's sticky post class */
require_once( 'library/sticky-posts.php' );

/** Configure responsive image sizes */
require_once( 'library/responsive-images.php' );

/** Gutenberg editor support */
require_once( 'library/gutenberg.php' );

/** If your site requires protocol relative url's for theme assets, uncomment the line below */
// require_once( 'library/class-foundationpress-protocol-relative-theme-assets.php' );
