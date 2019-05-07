<?php
if( ! empty( $results ) ){
  foreach ($results as $city):
    if (empty($city->lat) || empty($city->lng)) continue;
    ?>
      <button class="autocomplete-city" data-lat="<?= $city->lat; ?>" data-lng="<?= $city->lng; ?>" data-city="<?= $city->city; ?>">
        <i class="material-icons">gps_not_fixed</i>
        <span><?= $city->city . ', ' . $city->state_id; ?></span>
      </button>
    <?php
  endforeach;
} else {
  echo '<strong>No Results Found.</strong>';
}
