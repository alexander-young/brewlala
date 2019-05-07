<?php
/*
Template Name: Front
*/
get_header();
?>
<div class="grid-container search">
	<div class="grid-x grid-margin-x align-center">
		<div class="cell medium-6">
			<div class="input-group">
				<input 
				class="input-group-field" 
				id="search-text" 
				placeholder="Start Typing..." 
				type="text"
				autocomplete="off"
				value="<?= ( ! empty( $_GET['brew_search'] ) ) ? $_GET['brew_search'] : ""; ?>" />
				<div id="autocomplete-results"></div>
			</div>
		</div>
	</div>
</div>
<div class="content">
	<div class="grid-x grid-margin-x medium-margin-collapse">
		<div class="cell medium-9">
			<div id="map"></div>
		</div>
		<div class="cell medium-3">
			<?php get_template_part('template-parts/loading-beer', ''); ?>
			<div id="brewery-container"></div>
		</div>
	</div>
</div>
<?php get_footer(); ?>
