import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_users_messenger_type" AS ENUM('telegram', 'whatsapp', 'max', 'viber', 'other');
  CREATE TYPE "public"."enum_media_kind" AS ENUM('photo', 'illustration', 'background', 'scheme', 'document');
  CREATE TYPE "public"."enum_pages_blk_hero_buttons_kind" AS ENUM('quiz', 'form', 'link', 'download');
  CREATE TYPE "public"."enum_pages_blk_hero_buttons_variant" AS ENUM('primary', 'secondary', 'ghost');
  CREATE TYPE "public"."enum_pages_blk_hero_buttons_form_key" AS ENUM('drawing', 'callback', 'sample', 'load', 'contacts', 'full');
  CREATE TYPE "public"."enum_pages_blk_hero_buttons_link_type" AS ENUM('doc', 'custom');
  CREATE TYPE "public"."enum_pages_blk_hero_variant" AS ENUM('ctHero', 'p5Top', 'home');
  CREATE TYPE "public"."enum_pages_blk_hero_terms_mode" AS ENUM('full', 'short');
  CREATE TYPE "public"."enum_pages_blk_text_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_pages_blk_text_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_pages_blk_text_width" AS ENUM('narrow', 'normal', 'wide');
  CREATE TYPE "public"."enum_pages_blk_table_table_cols_align" AS ENUM('left', 'center', 'right');
  CREATE TYPE "public"."enum_pages_blk_table_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_pages_blk_table_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_pages_blk_table_table_role" AS ENUM('parameters', 'comparison', 'schemes', 'other');
  CREATE TYPE "public"."enum_pages_blk_table_table_mobile_mode" AS ENUM('cards', 'pairs');
  CREATE TYPE "public"."enum_pages_blk_steps_items_link_type" AS ENUM('doc', 'custom');
  CREATE TYPE "public"."enum_pages_blk_steps_buttons_kind" AS ENUM('quiz', 'form', 'link', 'download');
  CREATE TYPE "public"."enum_pages_blk_steps_buttons_variant" AS ENUM('primary', 'secondary', 'ghost');
  CREATE TYPE "public"."enum_pages_blk_steps_buttons_form_key" AS ENUM('drawing', 'callback', 'sample', 'load', 'contacts', 'full');
  CREATE TYPE "public"."enum_pages_blk_steps_buttons_link_type" AS ENUM('doc', 'custom');
  CREATE TYPE "public"."enum_pages_blk_steps_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_pages_blk_steps_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_pages_blk_steps_variant" AS ENUM('horizontal', 'vertical');
  CREATE TYPE "public"."enum_pages_blk_callout_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_pages_blk_callout_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_pages_blk_callout_tone" AS ENUM('warning', 'info');
  CREATE TYPE "public"."enum_pages_blk_terms_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_pages_blk_terms_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_pages_blk_terms_mode" AS ENUM('global', 'globalShort', 'custom');
  CREATE TYPE "public"."enum_pages_blk_terms_variant" AS ENUM('bar', 'plain');
  CREATE TYPE "public"."enum_pages_blk_cards_items_link_type" AS ENUM('doc', 'custom');
  CREATE TYPE "public"."enum_pages_blk_cards_items_tone" AS ENUM('default', 'negative', 'accent');
  CREATE TYPE "public"."enum_pages_blk_cards_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_pages_blk_cards_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_pages_blk_cards_layout" AS ENUM('g3', 'g4', 'ctCards', 'p5Cards', 'seg');
  CREATE TYPE "public"."enum_pages_blk_coll_cards_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_pages_blk_coll_cards_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_pages_blk_coll_cards_source" AS ENUM('glassTypes', 'processingServices', 'constructions', 'thicknesses', 'articles');
  CREATE TYPE "public"."enum_pages_blk_coll_cards_mode" AS ENUM('all', 'manual', 'group');
  CREATE TYPE "public"."enum_pages_blk_coll_cards_group" AS ENUM('constructions', 'glazing', 'mirrors', 'hardware');
  CREATE TYPE "public"."enum_pages_blk_coll_cards_columns" AS ENUM('3', '4');
  CREATE TYPE "public"."enum_pages_blk_prices_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_pages_blk_prices_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_pages_blk_prices_variant" AS ENUM('table', 'cards', 'both');
  CREATE TYPE "public"."enum_pages_blk_faq_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_pages_blk_faq_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_pages_blk_faq_mode" AS ENUM('doc', 'inline');
  CREATE TYPE "public"."enum_pages_blk_cta_buttons_kind" AS ENUM('quiz', 'form', 'link', 'download');
  CREATE TYPE "public"."enum_pages_blk_cta_buttons_variant" AS ENUM('primary', 'secondary', 'ghost');
  CREATE TYPE "public"."enum_pages_blk_cta_buttons_form_key" AS ENUM('drawing', 'callback', 'sample', 'load', 'contacts', 'full');
  CREATE TYPE "public"."enum_pages_blk_cta_buttons_link_type" AS ENUM('doc', 'custom');
  CREATE TYPE "public"."enum_pages_blk_cta_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_pages_blk_cta_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_pages_blk_cta_variant" AS ENUM('buttons', 'banner', 'strip', 'split');
  CREATE TYPE "public"."enum_pages_blk_cta_tone" AS ENUM('light', 'primaryDark');
  CREATE TYPE "public"."enum_pages_blk_cta_link_type" AS ENUM('doc', 'custom');
  CREATE TYPE "public"."enum_pages_blk_compare_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_pages_blk_compare_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_pages_blk_compare_foot_link_type" AS ENUM('doc', 'custom');
  CREATE TYPE "public"."enum_pages_blk_download_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_pages_blk_download_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_pages_blk_download_variant" AS ENUM('list', 'card');
  CREATE TYPE "public"."enum_pages_blk_holes_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_pages_blk_holes_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_pages_blk_holes_default_thickness" AS ENUM('4', '5', '6', '8', '10', '12', '15', '19');
  CREATE TYPE "public"."enum_pages_blk_weight_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_pages_blk_weight_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_pages_blk_weight_default_mode" AS ENUM('single', 'triplex');
  CREATE TYPE "public"."enum_pages_blk_form_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_pages_blk_form_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_pages_blk_form_form_key" AS ENUM('drawing', 'callback', 'sample', 'load', 'contacts', 'full');
  CREATE TYPE "public"."enum_pages_blk_form_variant" AS ENUM('card', 'inline', 'page');
  CREATE TYPE "public"."enum_pages_blk_snippet_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_pages_blk_snippet_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_pages_blk_stats_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_pages_blk_stats_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_pages_blk_stats_variant" AS ENUM('glass', 'tiles', 'plain');
  CREATE TYPE "public"."enum_pages_blk_objects_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_pages_blk_objects_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_pages_blk_objects_mode" AS ENUM('featured', 'byProduct', 'manual');
  CREATE TYPE "public"."enum_pages_blk_articles_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_pages_blk_articles_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_pages_blk_articles_mode" AS ENUM('featured', 'latest', 'manual');
  CREATE TYPE "public"."enum_pages_blk_wdw_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_pages_blk_wdw_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_pages_blk_systems_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_pages_blk_systems_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_pages_blk_systems_source" AS ENUM('doc', 'inline');
  CREATE TYPE "public"."enum_pages_blk_systems_layout" AS ENUM('cards', 'table');
  CREATE TYPE "public"."enum_pages_blk_gallery_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_pages_blk_gallery_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_pages_blk_gallery_layout" AS ENUM('grid', 'slider');
  CREATE TYPE "public"."enum_pages_blk_two_cols_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_pages_blk_two_cols_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_pages_blk_links_items_link_type" AS ENUM('doc', 'custom');
  CREATE TYPE "public"."enum_pages_blk_links_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_pages_blk_links_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_pages_blk_links_variant" AS ENUM('chips', 'bridge', 'buttons');
  CREATE TYPE "public"."enum_pages_blk_contacts_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_pages_blk_contacts_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_pages_blk_requisites_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_pages_blk_requisites_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_pages_blk_team_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_pages_blk_team_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_pages_blk_team_empty_behavior" AS ENUM('hide', 'message');
  CREATE TYPE "public"."enum_pages_blk_quiz_cta_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_pages_blk_quiz_cta_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_pages_blk_quiz_cta_prefill_type" AS ENUM('tempered', 'triplex', 'partitions', 'railings', 'shower', 'canopies', 'facade', 'shopfronts', 'verandas', 'mirrors', 'other');
  CREATE TYPE "public"."enum_pages_blk_quiz_cta_prefill_thickness" AS ENUM('4', '5', '6', '8', '10', '12', '15', '19');
  CREATE TYPE "public"."enum_pages_blk_quiz_cta_prefill_kind" AS ENUM('clear', 'low-iron', 'matte', 'tinted', 'painted', 'ribbed', 'bent');
  CREATE TYPE "public"."enum_pages_blk_quiz_cta_prefill_secondary_form" AS ENUM('drawing', 'load', 'sample', 'none');
  CREATE TYPE "public"."enum_pages_template" AS ENUM('home', 'hub', 'service', 'segment', 'company', 'contacts', 'legal', 'listing', 'tool', 'generic');
  CREATE TYPE "public"."enum_pages_quiz_prefill_type" AS ENUM('tempered', 'triplex', 'partitions', 'railings', 'shower', 'canopies', 'facade', 'shopfronts', 'verandas', 'mirrors', 'other');
  CREATE TYPE "public"."enum_pages_quiz_prefill_thickness" AS ENUM('4', '5', '6', '8', '10', '12', '15', '19');
  CREATE TYPE "public"."enum_pages_quiz_prefill_kind" AS ENUM('clear', 'low-iron', 'matte', 'tinted', 'painted', 'ribbed', 'bent');
  CREATE TYPE "public"."enum_pages_quiz_prefill_secondary_form" AS ENUM('drawing', 'load', 'sample', 'none');
  CREATE TYPE "public"."enum_pages_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__pages_blk_hero_v_buttons_kind" AS ENUM('quiz', 'form', 'link', 'download');
  CREATE TYPE "public"."enum__pages_blk_hero_v_buttons_variant" AS ENUM('primary', 'secondary', 'ghost');
  CREATE TYPE "public"."enum__pages_blk_hero_v_buttons_form_key" AS ENUM('drawing', 'callback', 'sample', 'load', 'contacts', 'full');
  CREATE TYPE "public"."enum__pages_blk_hero_v_buttons_link_type" AS ENUM('doc', 'custom');
  CREATE TYPE "public"."enum__pages_blk_hero_v_variant" AS ENUM('ctHero', 'p5Top', 'home');
  CREATE TYPE "public"."enum__pages_blk_hero_v_terms_mode" AS ENUM('full', 'short');
  CREATE TYPE "public"."enum__pages_blk_text_v_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__pages_blk_text_v_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum__pages_blk_text_v_width" AS ENUM('narrow', 'normal', 'wide');
  CREATE TYPE "public"."enum__pages_blk_table_table_cols_v_align" AS ENUM('left', 'center', 'right');
  CREATE TYPE "public"."enum__pages_blk_table_v_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__pages_blk_table_v_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum__pages_blk_table_v_table_role" AS ENUM('parameters', 'comparison', 'schemes', 'other');
  CREATE TYPE "public"."enum__pages_blk_table_v_table_mobile_mode" AS ENUM('cards', 'pairs');
  CREATE TYPE "public"."enum__pages_blk_steps_v_items_link_type" AS ENUM('doc', 'custom');
  CREATE TYPE "public"."enum__pages_blk_steps_v_buttons_kind" AS ENUM('quiz', 'form', 'link', 'download');
  CREATE TYPE "public"."enum__pages_blk_steps_v_buttons_variant" AS ENUM('primary', 'secondary', 'ghost');
  CREATE TYPE "public"."enum__pages_blk_steps_v_buttons_form_key" AS ENUM('drawing', 'callback', 'sample', 'load', 'contacts', 'full');
  CREATE TYPE "public"."enum__pages_blk_steps_v_buttons_link_type" AS ENUM('doc', 'custom');
  CREATE TYPE "public"."enum__pages_blk_steps_v_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__pages_blk_steps_v_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum__pages_blk_steps_v_variant" AS ENUM('horizontal', 'vertical');
  CREATE TYPE "public"."enum__pages_blk_callout_v_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__pages_blk_callout_v_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum__pages_blk_callout_v_tone" AS ENUM('warning', 'info');
  CREATE TYPE "public"."enum__pages_blk_terms_v_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__pages_blk_terms_v_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum__pages_blk_terms_v_mode" AS ENUM('global', 'globalShort', 'custom');
  CREATE TYPE "public"."enum__pages_blk_terms_v_variant" AS ENUM('bar', 'plain');
  CREATE TYPE "public"."enum__pages_blk_cards_v_items_link_type" AS ENUM('doc', 'custom');
  CREATE TYPE "public"."enum__pages_blk_cards_v_items_tone" AS ENUM('default', 'negative', 'accent');
  CREATE TYPE "public"."enum__pages_blk_cards_v_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__pages_blk_cards_v_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum__pages_blk_cards_v_layout" AS ENUM('g3', 'g4', 'ctCards', 'p5Cards', 'seg');
  CREATE TYPE "public"."enum__pages_blk_coll_cards_v_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__pages_blk_coll_cards_v_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum__pages_blk_coll_cards_v_source" AS ENUM('glassTypes', 'processingServices', 'constructions', 'thicknesses', 'articles');
  CREATE TYPE "public"."enum__pages_blk_coll_cards_v_mode" AS ENUM('all', 'manual', 'group');
  CREATE TYPE "public"."enum__pages_blk_coll_cards_v_group" AS ENUM('constructions', 'glazing', 'mirrors', 'hardware');
  CREATE TYPE "public"."enum__pages_blk_coll_cards_v_columns" AS ENUM('3', '4');
  CREATE TYPE "public"."enum__pages_blk_prices_v_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__pages_blk_prices_v_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum__pages_blk_prices_v_variant" AS ENUM('table', 'cards', 'both');
  CREATE TYPE "public"."enum__pages_blk_faq_v_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__pages_blk_faq_v_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum__pages_blk_faq_v_mode" AS ENUM('doc', 'inline');
  CREATE TYPE "public"."enum__pages_blk_cta_v_buttons_kind" AS ENUM('quiz', 'form', 'link', 'download');
  CREATE TYPE "public"."enum__pages_blk_cta_v_buttons_variant" AS ENUM('primary', 'secondary', 'ghost');
  CREATE TYPE "public"."enum__pages_blk_cta_v_buttons_form_key" AS ENUM('drawing', 'callback', 'sample', 'load', 'contacts', 'full');
  CREATE TYPE "public"."enum__pages_blk_cta_v_buttons_link_type" AS ENUM('doc', 'custom');
  CREATE TYPE "public"."enum__pages_blk_cta_v_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__pages_blk_cta_v_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum__pages_blk_cta_v_variant" AS ENUM('buttons', 'banner', 'strip', 'split');
  CREATE TYPE "public"."enum__pages_blk_cta_v_tone" AS ENUM('light', 'primaryDark');
  CREATE TYPE "public"."enum__pages_blk_cta_v_link_type" AS ENUM('doc', 'custom');
  CREATE TYPE "public"."enum__pages_blk_compare_v_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__pages_blk_compare_v_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum__pages_blk_compare_v_foot_link_type" AS ENUM('doc', 'custom');
  CREATE TYPE "public"."enum__pages_blk_download_v_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__pages_blk_download_v_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum__pages_blk_download_v_variant" AS ENUM('list', 'card');
  CREATE TYPE "public"."enum__pages_blk_holes_v_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__pages_blk_holes_v_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum__pages_blk_holes_v_default_thickness" AS ENUM('4', '5', '6', '8', '10', '12', '15', '19');
  CREATE TYPE "public"."enum__pages_blk_weight_v_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__pages_blk_weight_v_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum__pages_blk_weight_v_default_mode" AS ENUM('single', 'triplex');
  CREATE TYPE "public"."enum__pages_blk_form_v_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__pages_blk_form_v_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum__pages_blk_form_v_form_key" AS ENUM('drawing', 'callback', 'sample', 'load', 'contacts', 'full');
  CREATE TYPE "public"."enum__pages_blk_form_v_variant" AS ENUM('card', 'inline', 'page');
  CREATE TYPE "public"."enum__pages_blk_snippet_v_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__pages_blk_snippet_v_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum__pages_blk_stats_v_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__pages_blk_stats_v_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum__pages_blk_stats_v_variant" AS ENUM('glass', 'tiles', 'plain');
  CREATE TYPE "public"."enum__pages_blk_objects_v_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__pages_blk_objects_v_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum__pages_blk_objects_v_mode" AS ENUM('featured', 'byProduct', 'manual');
  CREATE TYPE "public"."enum__pages_blk_articles_v_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__pages_blk_articles_v_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum__pages_blk_articles_v_mode" AS ENUM('featured', 'latest', 'manual');
  CREATE TYPE "public"."enum__pages_blk_wdw_v_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__pages_blk_wdw_v_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum__pages_blk_systems_v_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__pages_blk_systems_v_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum__pages_blk_systems_v_source" AS ENUM('doc', 'inline');
  CREATE TYPE "public"."enum__pages_blk_systems_v_layout" AS ENUM('cards', 'table');
  CREATE TYPE "public"."enum__pages_blk_gallery_v_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__pages_blk_gallery_v_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum__pages_blk_gallery_v_layout" AS ENUM('grid', 'slider');
  CREATE TYPE "public"."enum__pages_blk_two_cols_v_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__pages_blk_two_cols_v_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum__pages_blk_links_v_items_link_type" AS ENUM('doc', 'custom');
  CREATE TYPE "public"."enum__pages_blk_links_v_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__pages_blk_links_v_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum__pages_blk_links_v_variant" AS ENUM('chips', 'bridge', 'buttons');
  CREATE TYPE "public"."enum__pages_blk_contacts_v_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__pages_blk_contacts_v_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum__pages_blk_requisites_v_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__pages_blk_requisites_v_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum__pages_blk_team_v_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__pages_blk_team_v_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum__pages_blk_team_v_empty_behavior" AS ENUM('hide', 'message');
  CREATE TYPE "public"."enum__pages_blk_quiz_cta_v_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__pages_blk_quiz_cta_v_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum__pages_blk_quiz_cta_v_prefill_type" AS ENUM('tempered', 'triplex', 'partitions', 'railings', 'shower', 'canopies', 'facade', 'shopfronts', 'verandas', 'mirrors', 'other');
  CREATE TYPE "public"."enum__pages_blk_quiz_cta_v_prefill_thickness" AS ENUM('4', '5', '6', '8', '10', '12', '15', '19');
  CREATE TYPE "public"."enum__pages_blk_quiz_cta_v_prefill_kind" AS ENUM('clear', 'low-iron', 'matte', 'tinted', 'painted', 'ribbed', 'bent');
  CREATE TYPE "public"."enum__pages_blk_quiz_cta_v_prefill_secondary_form" AS ENUM('drawing', 'load', 'sample', 'none');
  CREATE TYPE "public"."enum__pages_v_version_template" AS ENUM('home', 'hub', 'service', 'segment', 'company', 'contacts', 'legal', 'listing', 'tool', 'generic');
  CREATE TYPE "public"."enum__pages_v_version_quiz_prefill_type" AS ENUM('tempered', 'triplex', 'partitions', 'railings', 'shower', 'canopies', 'facade', 'shopfronts', 'verandas', 'mirrors', 'other');
  CREATE TYPE "public"."enum__pages_v_version_quiz_prefill_thickness" AS ENUM('4', '5', '6', '8', '10', '12', '15', '19');
  CREATE TYPE "public"."enum__pages_v_version_quiz_prefill_kind" AS ENUM('clear', 'low-iron', 'matte', 'tinted', 'painted', 'ribbed', 'bent');
  CREATE TYPE "public"."enum__pages_v_version_quiz_prefill_secondary_form" AS ENUM('drawing', 'load', 'sample', 'none');
  CREATE TYPE "public"."enum__pages_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_articles_tools_link_type" AS ENUM('doc', 'custom');
  CREATE TYPE "public"."enum_articles_commercial_link_link_type" AS ENUM('doc', 'custom');
  CREATE TYPE "public"."enum_articles_cta_card_form_key" AS ENUM('drawing', 'load', 'callback');
  CREATE TYPE "public"."enum_articles_quiz_prefill_type" AS ENUM('tempered', 'triplex', 'partitions', 'railings', 'shower', 'canopies', 'facade', 'shopfronts', 'verandas', 'mirrors', 'other');
  CREATE TYPE "public"."enum_articles_quiz_prefill_thickness" AS ENUM('4', '5', '6', '8', '10', '12', '15', '19');
  CREATE TYPE "public"."enum_articles_quiz_prefill_kind" AS ENUM('clear', 'low-iron', 'matte', 'tinted', 'painted', 'ribbed', 'bent');
  CREATE TYPE "public"."enum_articles_quiz_prefill_secondary_form" AS ENUM('drawing', 'load', 'sample', 'none');
  CREATE TYPE "public"."enum_articles_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__articles_v_version_tools_link_type" AS ENUM('doc', 'custom');
  CREATE TYPE "public"."enum__articles_v_version_commercial_link_link_type" AS ENUM('doc', 'custom');
  CREATE TYPE "public"."enum__articles_v_version_cta_card_form_key" AS ENUM('drawing', 'load', 'callback');
  CREATE TYPE "public"."enum__articles_v_version_quiz_prefill_type" AS ENUM('tempered', 'triplex', 'partitions', 'railings', 'shower', 'canopies', 'facade', 'shopfronts', 'verandas', 'mirrors', 'other');
  CREATE TYPE "public"."enum__articles_v_version_quiz_prefill_thickness" AS ENUM('4', '5', '6', '8', '10', '12', '15', '19');
  CREATE TYPE "public"."enum__articles_v_version_quiz_prefill_kind" AS ENUM('clear', 'low-iron', 'matte', 'tinted', 'painted', 'ribbed', 'bent');
  CREATE TYPE "public"."enum__articles_v_version_quiz_prefill_secondary_form" AS ENUM('drawing', 'load', 'sample', 'none');
  CREATE TYPE "public"."enum__articles_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_objects_quiz_prefill_type" AS ENUM('tempered', 'triplex', 'partitions', 'railings', 'shower', 'canopies', 'facade', 'shopfronts', 'verandas', 'mirrors', 'other');
  CREATE TYPE "public"."enum_objects_quiz_prefill_thickness" AS ENUM('4', '5', '6', '8', '10', '12', '15', '19');
  CREATE TYPE "public"."enum_objects_quiz_prefill_kind" AS ENUM('clear', 'low-iron', 'matte', 'tinted', 'painted', 'ribbed', 'bent');
  CREATE TYPE "public"."enum_objects_quiz_prefill_secondary_form" AS ENUM('drawing', 'load', 'sample', 'none');
  CREATE TYPE "public"."enum_objects_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__objects_v_version_quiz_prefill_type" AS ENUM('tempered', 'triplex', 'partitions', 'railings', 'shower', 'canopies', 'facade', 'shopfronts', 'verandas', 'mirrors', 'other');
  CREATE TYPE "public"."enum__objects_v_version_quiz_prefill_thickness" AS ENUM('4', '5', '6', '8', '10', '12', '15', '19');
  CREATE TYPE "public"."enum__objects_v_version_quiz_prefill_kind" AS ENUM('clear', 'low-iron', 'matte', 'tinted', 'painted', 'ribbed', 'bent');
  CREATE TYPE "public"."enum__objects_v_version_quiz_prefill_secondary_form" AS ENUM('drawing', 'load', 'sample', 'none');
  CREATE TYPE "public"."enum__objects_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_thicknesses_blk_hero_buttons_kind" AS ENUM('quiz', 'form', 'link', 'download');
  CREATE TYPE "public"."enum_thicknesses_blk_hero_buttons_variant" AS ENUM('primary', 'secondary', 'ghost');
  CREATE TYPE "public"."enum_thicknesses_blk_hero_buttons_form_key" AS ENUM('drawing', 'callback', 'sample', 'load', 'contacts', 'full');
  CREATE TYPE "public"."enum_thicknesses_blk_hero_buttons_link_type" AS ENUM('doc', 'custom');
  CREATE TYPE "public"."enum_thicknesses_blk_hero_variant" AS ENUM('ctHero', 'p5Top', 'home');
  CREATE TYPE "public"."enum_thicknesses_blk_hero_terms_mode" AS ENUM('full', 'short');
  CREATE TYPE "public"."enum_thicknesses_blk_text_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_thicknesses_blk_text_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_thicknesses_blk_text_width" AS ENUM('narrow', 'normal', 'wide');
  CREATE TYPE "public"."enum_thicknesses_blk_table_table_cols_align" AS ENUM('left', 'center', 'right');
  CREATE TYPE "public"."enum_thicknesses_blk_table_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_thicknesses_blk_table_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_thicknesses_blk_table_table_role" AS ENUM('parameters', 'comparison', 'schemes', 'other');
  CREATE TYPE "public"."enum_thicknesses_blk_table_table_mobile_mode" AS ENUM('cards', 'pairs');
  CREATE TYPE "public"."enum_thicknesses_blk_steps_items_link_type" AS ENUM('doc', 'custom');
  CREATE TYPE "public"."enum_thicknesses_blk_steps_buttons_kind" AS ENUM('quiz', 'form', 'link', 'download');
  CREATE TYPE "public"."enum_thicknesses_blk_steps_buttons_variant" AS ENUM('primary', 'secondary', 'ghost');
  CREATE TYPE "public"."enum_thicknesses_blk_steps_buttons_form_key" AS ENUM('drawing', 'callback', 'sample', 'load', 'contacts', 'full');
  CREATE TYPE "public"."enum_thicknesses_blk_steps_buttons_link_type" AS ENUM('doc', 'custom');
  CREATE TYPE "public"."enum_thicknesses_blk_steps_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_thicknesses_blk_steps_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_thicknesses_blk_steps_variant" AS ENUM('horizontal', 'vertical');
  CREATE TYPE "public"."enum_thicknesses_blk_callout_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_thicknesses_blk_callout_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_thicknesses_blk_callout_tone" AS ENUM('warning', 'info');
  CREATE TYPE "public"."enum_thicknesses_blk_terms_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_thicknesses_blk_terms_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_thicknesses_blk_terms_mode" AS ENUM('global', 'globalShort', 'custom');
  CREATE TYPE "public"."enum_thicknesses_blk_terms_variant" AS ENUM('bar', 'plain');
  CREATE TYPE "public"."enum_thicknesses_blk_cards_items_link_type" AS ENUM('doc', 'custom');
  CREATE TYPE "public"."enum_thicknesses_blk_cards_items_tone" AS ENUM('default', 'negative', 'accent');
  CREATE TYPE "public"."enum_thicknesses_blk_cards_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_thicknesses_blk_cards_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_thicknesses_blk_cards_layout" AS ENUM('g3', 'g4', 'ctCards', 'p5Cards', 'seg');
  CREATE TYPE "public"."enum_thicknesses_blk_coll_cards_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_thicknesses_blk_coll_cards_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_thicknesses_blk_coll_cards_source" AS ENUM('glassTypes', 'processingServices', 'constructions', 'thicknesses', 'articles');
  CREATE TYPE "public"."enum_thicknesses_blk_coll_cards_mode" AS ENUM('all', 'manual', 'group');
  CREATE TYPE "public"."enum_thicknesses_blk_coll_cards_group" AS ENUM('constructions', 'glazing', 'mirrors', 'hardware');
  CREATE TYPE "public"."enum_thicknesses_blk_coll_cards_columns" AS ENUM('3', '4');
  CREATE TYPE "public"."enum_thicknesses_blk_prices_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_thicknesses_blk_prices_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_thicknesses_blk_prices_variant" AS ENUM('table', 'cards', 'both');
  CREATE TYPE "public"."enum_thicknesses_blk_faq_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_thicknesses_blk_faq_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_thicknesses_blk_faq_mode" AS ENUM('doc', 'inline');
  CREATE TYPE "public"."enum_thicknesses_blk_cta_buttons_kind" AS ENUM('quiz', 'form', 'link', 'download');
  CREATE TYPE "public"."enum_thicknesses_blk_cta_buttons_variant" AS ENUM('primary', 'secondary', 'ghost');
  CREATE TYPE "public"."enum_thicknesses_blk_cta_buttons_form_key" AS ENUM('drawing', 'callback', 'sample', 'load', 'contacts', 'full');
  CREATE TYPE "public"."enum_thicknesses_blk_cta_buttons_link_type" AS ENUM('doc', 'custom');
  CREATE TYPE "public"."enum_thicknesses_blk_cta_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_thicknesses_blk_cta_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_thicknesses_blk_cta_variant" AS ENUM('buttons', 'banner', 'strip', 'split');
  CREATE TYPE "public"."enum_thicknesses_blk_cta_tone" AS ENUM('light', 'primaryDark');
  CREATE TYPE "public"."enum_thicknesses_blk_cta_link_type" AS ENUM('doc', 'custom');
  CREATE TYPE "public"."enum_thicknesses_blk_compare_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_thicknesses_blk_compare_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_thicknesses_blk_compare_foot_link_type" AS ENUM('doc', 'custom');
  CREATE TYPE "public"."enum_thicknesses_blk_download_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_thicknesses_blk_download_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_thicknesses_blk_download_variant" AS ENUM('list', 'card');
  CREATE TYPE "public"."enum_thicknesses_blk_holes_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_thicknesses_blk_holes_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_thicknesses_blk_holes_default_thickness" AS ENUM('4', '5', '6', '8', '10', '12', '15', '19');
  CREATE TYPE "public"."enum_thicknesses_blk_weight_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_thicknesses_blk_weight_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_thicknesses_blk_weight_default_mode" AS ENUM('single', 'triplex');
  CREATE TYPE "public"."enum_thicknesses_blk_form_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_thicknesses_blk_form_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_thicknesses_blk_form_form_key" AS ENUM('drawing', 'callback', 'sample', 'load', 'contacts', 'full');
  CREATE TYPE "public"."enum_thicknesses_blk_form_variant" AS ENUM('card', 'inline', 'page');
  CREATE TYPE "public"."enum_thicknesses_blk_snippet_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_thicknesses_blk_snippet_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_thicknesses_blk_stats_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_thicknesses_blk_stats_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_thicknesses_blk_stats_variant" AS ENUM('glass', 'tiles', 'plain');
  CREATE TYPE "public"."enum_thicknesses_blk_objects_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_thicknesses_blk_objects_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_thicknesses_blk_objects_mode" AS ENUM('featured', 'byProduct', 'manual');
  CREATE TYPE "public"."enum_thicknesses_blk_articles_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_thicknesses_blk_articles_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_thicknesses_blk_articles_mode" AS ENUM('featured', 'latest', 'manual');
  CREATE TYPE "public"."enum_thicknesses_blk_wdw_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_thicknesses_blk_wdw_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_thicknesses_blk_systems_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_thicknesses_blk_systems_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_thicknesses_blk_systems_source" AS ENUM('doc', 'inline');
  CREATE TYPE "public"."enum_thicknesses_blk_systems_layout" AS ENUM('cards', 'table');
  CREATE TYPE "public"."enum_thicknesses_blk_gallery_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_thicknesses_blk_gallery_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_thicknesses_blk_gallery_layout" AS ENUM('grid', 'slider');
  CREATE TYPE "public"."enum_thicknesses_blk_two_cols_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_thicknesses_blk_two_cols_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_thicknesses_blk_links_items_link_type" AS ENUM('doc', 'custom');
  CREATE TYPE "public"."enum_thicknesses_blk_links_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_thicknesses_blk_links_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_thicknesses_blk_links_variant" AS ENUM('chips', 'bridge', 'buttons');
  CREATE TYPE "public"."enum_thicknesses_blk_contacts_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_thicknesses_blk_contacts_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_thicknesses_blk_requisites_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_thicknesses_blk_requisites_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_thicknesses_blk_team_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_thicknesses_blk_team_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_thicknesses_blk_team_empty_behavior" AS ENUM('hide', 'message');
  CREATE TYPE "public"."enum_thicknesses_blk_quiz_cta_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_thicknesses_blk_quiz_cta_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_thicknesses_blk_quiz_cta_prefill_type" AS ENUM('tempered', 'triplex', 'partitions', 'railings', 'shower', 'canopies', 'facade', 'shopfronts', 'verandas', 'mirrors', 'other');
  CREATE TYPE "public"."enum_thicknesses_blk_quiz_cta_prefill_thickness" AS ENUM('4', '5', '6', '8', '10', '12', '15', '19');
  CREATE TYPE "public"."enum_thicknesses_blk_quiz_cta_prefill_kind" AS ENUM('clear', 'low-iron', 'matte', 'tinted', 'painted', 'ribbed', 'bent');
  CREATE TYPE "public"."enum_thicknesses_blk_quiz_cta_prefill_secondary_form" AS ENUM('drawing', 'load', 'sample', 'none');
  CREATE TYPE "public"."enum_thicknesses_quiz_prefill_type" AS ENUM('tempered', 'triplex', 'partitions', 'railings', 'shower', 'canopies', 'facade', 'shopfronts', 'verandas', 'mirrors', 'other');
  CREATE TYPE "public"."enum_thicknesses_quiz_prefill_thickness" AS ENUM('4', '5', '6', '8', '10', '12', '15', '19');
  CREATE TYPE "public"."enum_thicknesses_quiz_prefill_kind" AS ENUM('clear', 'low-iron', 'matte', 'tinted', 'painted', 'ribbed', 'bent');
  CREATE TYPE "public"."enum_thicknesses_quiz_prefill_secondary_form" AS ENUM('drawing', 'load', 'sample', 'none');
  CREATE TYPE "public"."enum_glass_types_variants_swatch_kind" AS ENUM('color', 'image', 'pattern');
  CREATE TYPE "public"."enum_glass_types_tables_cols_align" AS ENUM('left', 'center', 'right');
  CREATE TYPE "public"."enum_glass_types_tables_role" AS ENUM('parameters', 'comparison', 'schemes', 'other');
  CREATE TYPE "public"."enum_glass_types_tables_mobile_mode" AS ENUM('cards', 'pairs');
  CREATE TYPE "public"."enum_glass_types_applications_link_type" AS ENUM('doc', 'custom');
  CREATE TYPE "public"."enum_glass_types_related_links_link_type" AS ENUM('doc', 'custom');
  CREATE TYPE "public"."enum_glass_types_blk_hero_buttons_kind" AS ENUM('quiz', 'form', 'link', 'download');
  CREATE TYPE "public"."enum_glass_types_blk_hero_buttons_variant" AS ENUM('primary', 'secondary', 'ghost');
  CREATE TYPE "public"."enum_glass_types_blk_hero_buttons_form_key" AS ENUM('drawing', 'callback', 'sample', 'load', 'contacts', 'full');
  CREATE TYPE "public"."enum_glass_types_blk_hero_buttons_link_type" AS ENUM('doc', 'custom');
  CREATE TYPE "public"."enum_glass_types_blk_hero_variant" AS ENUM('ctHero', 'p5Top', 'home');
  CREATE TYPE "public"."enum_glass_types_blk_hero_terms_mode" AS ENUM('full', 'short');
  CREATE TYPE "public"."enum_glass_types_blk_text_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_glass_types_blk_text_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_glass_types_blk_text_width" AS ENUM('narrow', 'normal', 'wide');
  CREATE TYPE "public"."enum_glass_types_blk_table_table_cols_align" AS ENUM('left', 'center', 'right');
  CREATE TYPE "public"."enum_glass_types_blk_table_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_glass_types_blk_table_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_glass_types_blk_table_table_role" AS ENUM('parameters', 'comparison', 'schemes', 'other');
  CREATE TYPE "public"."enum_glass_types_blk_table_table_mobile_mode" AS ENUM('cards', 'pairs');
  CREATE TYPE "public"."enum_glass_types_blk_steps_items_link_type" AS ENUM('doc', 'custom');
  CREATE TYPE "public"."enum_glass_types_blk_steps_buttons_kind" AS ENUM('quiz', 'form', 'link', 'download');
  CREATE TYPE "public"."enum_glass_types_blk_steps_buttons_variant" AS ENUM('primary', 'secondary', 'ghost');
  CREATE TYPE "public"."enum_glass_types_blk_steps_buttons_form_key" AS ENUM('drawing', 'callback', 'sample', 'load', 'contacts', 'full');
  CREATE TYPE "public"."enum_glass_types_blk_steps_buttons_link_type" AS ENUM('doc', 'custom');
  CREATE TYPE "public"."enum_glass_types_blk_steps_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_glass_types_blk_steps_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_glass_types_blk_steps_variant" AS ENUM('horizontal', 'vertical');
  CREATE TYPE "public"."enum_glass_types_blk_callout_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_glass_types_blk_callout_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_glass_types_blk_callout_tone" AS ENUM('warning', 'info');
  CREATE TYPE "public"."enum_glass_types_blk_terms_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_glass_types_blk_terms_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_glass_types_blk_terms_mode" AS ENUM('global', 'globalShort', 'custom');
  CREATE TYPE "public"."enum_glass_types_blk_terms_variant" AS ENUM('bar', 'plain');
  CREATE TYPE "public"."enum_glass_types_blk_cards_items_link_type" AS ENUM('doc', 'custom');
  CREATE TYPE "public"."enum_glass_types_blk_cards_items_tone" AS ENUM('default', 'negative', 'accent');
  CREATE TYPE "public"."enum_glass_types_blk_cards_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_glass_types_blk_cards_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_glass_types_blk_cards_layout" AS ENUM('g3', 'g4', 'ctCards', 'p5Cards', 'seg');
  CREATE TYPE "public"."enum_glass_types_blk_coll_cards_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_glass_types_blk_coll_cards_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_glass_types_blk_coll_cards_source" AS ENUM('glassTypes', 'processingServices', 'constructions', 'thicknesses', 'articles');
  CREATE TYPE "public"."enum_glass_types_blk_coll_cards_mode" AS ENUM('all', 'manual', 'group');
  CREATE TYPE "public"."enum_glass_types_blk_coll_cards_group" AS ENUM('constructions', 'glazing', 'mirrors', 'hardware');
  CREATE TYPE "public"."enum_glass_types_blk_coll_cards_columns" AS ENUM('3', '4');
  CREATE TYPE "public"."enum_glass_types_blk_prices_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_glass_types_blk_prices_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_glass_types_blk_prices_variant" AS ENUM('table', 'cards', 'both');
  CREATE TYPE "public"."enum_glass_types_blk_faq_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_glass_types_blk_faq_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_glass_types_blk_faq_mode" AS ENUM('doc', 'inline');
  CREATE TYPE "public"."enum_glass_types_blk_cta_buttons_kind" AS ENUM('quiz', 'form', 'link', 'download');
  CREATE TYPE "public"."enum_glass_types_blk_cta_buttons_variant" AS ENUM('primary', 'secondary', 'ghost');
  CREATE TYPE "public"."enum_glass_types_blk_cta_buttons_form_key" AS ENUM('drawing', 'callback', 'sample', 'load', 'contacts', 'full');
  CREATE TYPE "public"."enum_glass_types_blk_cta_buttons_link_type" AS ENUM('doc', 'custom');
  CREATE TYPE "public"."enum_glass_types_blk_cta_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_glass_types_blk_cta_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_glass_types_blk_cta_variant" AS ENUM('buttons', 'banner', 'strip', 'split');
  CREATE TYPE "public"."enum_glass_types_blk_cta_tone" AS ENUM('light', 'primaryDark');
  CREATE TYPE "public"."enum_glass_types_blk_cta_link_type" AS ENUM('doc', 'custom');
  CREATE TYPE "public"."enum_glass_types_blk_compare_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_glass_types_blk_compare_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_glass_types_blk_compare_foot_link_type" AS ENUM('doc', 'custom');
  CREATE TYPE "public"."enum_glass_types_blk_download_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_glass_types_blk_download_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_glass_types_blk_download_variant" AS ENUM('list', 'card');
  CREATE TYPE "public"."enum_glass_types_blk_holes_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_glass_types_blk_holes_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_glass_types_blk_holes_default_thickness" AS ENUM('4', '5', '6', '8', '10', '12', '15', '19');
  CREATE TYPE "public"."enum_glass_types_blk_weight_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_glass_types_blk_weight_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_glass_types_blk_weight_default_mode" AS ENUM('single', 'triplex');
  CREATE TYPE "public"."enum_glass_types_blk_form_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_glass_types_blk_form_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_glass_types_blk_form_form_key" AS ENUM('drawing', 'callback', 'sample', 'load', 'contacts', 'full');
  CREATE TYPE "public"."enum_glass_types_blk_form_variant" AS ENUM('card', 'inline', 'page');
  CREATE TYPE "public"."enum_glass_types_blk_snippet_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_glass_types_blk_snippet_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_glass_types_blk_stats_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_glass_types_blk_stats_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_glass_types_blk_stats_variant" AS ENUM('glass', 'tiles', 'plain');
  CREATE TYPE "public"."enum_glass_types_blk_objects_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_glass_types_blk_objects_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_glass_types_blk_objects_mode" AS ENUM('featured', 'byProduct', 'manual');
  CREATE TYPE "public"."enum_glass_types_blk_articles_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_glass_types_blk_articles_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_glass_types_blk_articles_mode" AS ENUM('featured', 'latest', 'manual');
  CREATE TYPE "public"."enum_glass_types_blk_wdw_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_glass_types_blk_wdw_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_glass_types_blk_systems_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_glass_types_blk_systems_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_glass_types_blk_systems_source" AS ENUM('doc', 'inline');
  CREATE TYPE "public"."enum_glass_types_blk_systems_layout" AS ENUM('cards', 'table');
  CREATE TYPE "public"."enum_glass_types_blk_gallery_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_glass_types_blk_gallery_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_glass_types_blk_gallery_layout" AS ENUM('grid', 'slider');
  CREATE TYPE "public"."enum_glass_types_blk_two_cols_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_glass_types_blk_two_cols_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_glass_types_blk_links_items_link_type" AS ENUM('doc', 'custom');
  CREATE TYPE "public"."enum_glass_types_blk_links_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_glass_types_blk_links_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_glass_types_blk_links_variant" AS ENUM('chips', 'bridge', 'buttons');
  CREATE TYPE "public"."enum_glass_types_blk_contacts_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_glass_types_blk_contacts_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_glass_types_blk_requisites_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_glass_types_blk_requisites_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_glass_types_blk_team_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_glass_types_blk_team_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_glass_types_blk_team_empty_behavior" AS ENUM('hide', 'message');
  CREATE TYPE "public"."enum_glass_types_blk_quiz_cta_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_glass_types_blk_quiz_cta_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_glass_types_blk_quiz_cta_prefill_type" AS ENUM('tempered', 'triplex', 'partitions', 'railings', 'shower', 'canopies', 'facade', 'shopfronts', 'verandas', 'mirrors', 'other');
  CREATE TYPE "public"."enum_glass_types_blk_quiz_cta_prefill_thickness" AS ENUM('4', '5', '6', '8', '10', '12', '15', '19');
  CREATE TYPE "public"."enum_glass_types_blk_quiz_cta_prefill_kind" AS ENUM('clear', 'low-iron', 'matte', 'tinted', 'painted', 'ribbed', 'bent');
  CREATE TYPE "public"."enum_glass_types_blk_quiz_cta_prefill_secondary_form" AS ENUM('drawing', 'load', 'sample', 'none');
  CREATE TYPE "public"."enum_glass_types_url_base" AS ENUM('zakalennoe-steklo', 'root');
  CREATE TYPE "public"."enum_glass_types_quiz_prefill_type" AS ENUM('tempered', 'triplex', 'partitions', 'railings', 'shower', 'canopies', 'facade', 'shopfronts', 'verandas', 'mirrors', 'other');
  CREATE TYPE "public"."enum_glass_types_quiz_prefill_thickness" AS ENUM('4', '5', '6', '8', '10', '12', '15', '19');
  CREATE TYPE "public"."enum_glass_types_quiz_prefill_kind" AS ENUM('clear', 'low-iron', 'matte', 'tinted', 'painted', 'ribbed', 'bent');
  CREATE TYPE "public"."enum_glass_types_quiz_prefill_secondary_form" AS ENUM('drawing', 'load', 'sample', 'none');
  CREATE TYPE "public"."enum_glass_types_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__glass_types_v_version_variants_swatch_kind" AS ENUM('color', 'image', 'pattern');
  CREATE TYPE "public"."enum__glass_types_tables_cols_v_align" AS ENUM('left', 'center', 'right');
  CREATE TYPE "public"."enum__glass_types_v_version_tables_role" AS ENUM('parameters', 'comparison', 'schemes', 'other');
  CREATE TYPE "public"."enum__glass_types_v_version_tables_mobile_mode" AS ENUM('cards', 'pairs');
  CREATE TYPE "public"."enum__glass_types_v_version_applications_link_type" AS ENUM('doc', 'custom');
  CREATE TYPE "public"."enum__glass_types_v_version_related_links_link_type" AS ENUM('doc', 'custom');
  CREATE TYPE "public"."enum__glass_types_blk_hero_v_buttons_kind" AS ENUM('quiz', 'form', 'link', 'download');
  CREATE TYPE "public"."enum__glass_types_blk_hero_v_buttons_variant" AS ENUM('primary', 'secondary', 'ghost');
  CREATE TYPE "public"."enum__glass_types_blk_hero_v_buttons_form_key" AS ENUM('drawing', 'callback', 'sample', 'load', 'contacts', 'full');
  CREATE TYPE "public"."enum__glass_types_blk_hero_v_buttons_link_type" AS ENUM('doc', 'custom');
  CREATE TYPE "public"."enum__glass_types_blk_hero_v_variant" AS ENUM('ctHero', 'p5Top', 'home');
  CREATE TYPE "public"."enum__glass_types_blk_hero_v_terms_mode" AS ENUM('full', 'short');
  CREATE TYPE "public"."enum__glass_types_blk_text_v_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__glass_types_blk_text_v_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum__glass_types_blk_text_v_width" AS ENUM('narrow', 'normal', 'wide');
  CREATE TYPE "public"."enum__glass_types_blk_table_table_cols_v_align" AS ENUM('left', 'center', 'right');
  CREATE TYPE "public"."enum__glass_types_blk_table_v_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__glass_types_blk_table_v_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum__glass_types_blk_table_v_table_role" AS ENUM('parameters', 'comparison', 'schemes', 'other');
  CREATE TYPE "public"."enum__glass_types_blk_table_v_table_mobile_mode" AS ENUM('cards', 'pairs');
  CREATE TYPE "public"."enum__glass_types_blk_steps_v_items_link_type" AS ENUM('doc', 'custom');
  CREATE TYPE "public"."enum__glass_types_blk_steps_v_buttons_kind" AS ENUM('quiz', 'form', 'link', 'download');
  CREATE TYPE "public"."enum__glass_types_blk_steps_v_buttons_variant" AS ENUM('primary', 'secondary', 'ghost');
  CREATE TYPE "public"."enum__glass_types_blk_steps_v_buttons_form_key" AS ENUM('drawing', 'callback', 'sample', 'load', 'contacts', 'full');
  CREATE TYPE "public"."enum__glass_types_blk_steps_v_buttons_link_type" AS ENUM('doc', 'custom');
  CREATE TYPE "public"."enum__glass_types_blk_steps_v_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__glass_types_blk_steps_v_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum__glass_types_blk_steps_v_variant" AS ENUM('horizontal', 'vertical');
  CREATE TYPE "public"."enum__glass_types_blk_callout_v_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__glass_types_blk_callout_v_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum__glass_types_blk_callout_v_tone" AS ENUM('warning', 'info');
  CREATE TYPE "public"."enum__glass_types_blk_terms_v_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__glass_types_blk_terms_v_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum__glass_types_blk_terms_v_mode" AS ENUM('global', 'globalShort', 'custom');
  CREATE TYPE "public"."enum__glass_types_blk_terms_v_variant" AS ENUM('bar', 'plain');
  CREATE TYPE "public"."enum__glass_types_blk_cards_v_items_link_type" AS ENUM('doc', 'custom');
  CREATE TYPE "public"."enum__glass_types_blk_cards_v_items_tone" AS ENUM('default', 'negative', 'accent');
  CREATE TYPE "public"."enum__glass_types_blk_cards_v_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__glass_types_blk_cards_v_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum__glass_types_blk_cards_v_layout" AS ENUM('g3', 'g4', 'ctCards', 'p5Cards', 'seg');
  CREATE TYPE "public"."enum__glass_types_blk_coll_cards_v_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__glass_types_blk_coll_cards_v_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum__glass_types_blk_coll_cards_v_source" AS ENUM('glassTypes', 'processingServices', 'constructions', 'thicknesses', 'articles');
  CREATE TYPE "public"."enum__glass_types_blk_coll_cards_v_mode" AS ENUM('all', 'manual', 'group');
  CREATE TYPE "public"."enum__glass_types_blk_coll_cards_v_group" AS ENUM('constructions', 'glazing', 'mirrors', 'hardware');
  CREATE TYPE "public"."enum__glass_types_blk_coll_cards_v_columns" AS ENUM('3', '4');
  CREATE TYPE "public"."enum__glass_types_blk_prices_v_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__glass_types_blk_prices_v_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum__glass_types_blk_prices_v_variant" AS ENUM('table', 'cards', 'both');
  CREATE TYPE "public"."enum__glass_types_blk_faq_v_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__glass_types_blk_faq_v_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum__glass_types_blk_faq_v_mode" AS ENUM('doc', 'inline');
  CREATE TYPE "public"."enum__glass_types_blk_cta_v_buttons_kind" AS ENUM('quiz', 'form', 'link', 'download');
  CREATE TYPE "public"."enum__glass_types_blk_cta_v_buttons_variant" AS ENUM('primary', 'secondary', 'ghost');
  CREATE TYPE "public"."enum__glass_types_blk_cta_v_buttons_form_key" AS ENUM('drawing', 'callback', 'sample', 'load', 'contacts', 'full');
  CREATE TYPE "public"."enum__glass_types_blk_cta_v_buttons_link_type" AS ENUM('doc', 'custom');
  CREATE TYPE "public"."enum__glass_types_blk_cta_v_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__glass_types_blk_cta_v_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum__glass_types_blk_cta_v_variant" AS ENUM('buttons', 'banner', 'strip', 'split');
  CREATE TYPE "public"."enum__glass_types_blk_cta_v_tone" AS ENUM('light', 'primaryDark');
  CREATE TYPE "public"."enum__glass_types_blk_cta_v_link_type" AS ENUM('doc', 'custom');
  CREATE TYPE "public"."enum__glass_types_blk_compare_v_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__glass_types_blk_compare_v_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum__glass_types_blk_compare_v_foot_link_type" AS ENUM('doc', 'custom');
  CREATE TYPE "public"."enum__glass_types_blk_download_v_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__glass_types_blk_download_v_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum__glass_types_blk_download_v_variant" AS ENUM('list', 'card');
  CREATE TYPE "public"."enum__glass_types_blk_holes_v_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__glass_types_blk_holes_v_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum__glass_types_blk_holes_v_default_thickness" AS ENUM('4', '5', '6', '8', '10', '12', '15', '19');
  CREATE TYPE "public"."enum__glass_types_blk_weight_v_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__glass_types_blk_weight_v_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum__glass_types_blk_weight_v_default_mode" AS ENUM('single', 'triplex');
  CREATE TYPE "public"."enum__glass_types_blk_form_v_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__glass_types_blk_form_v_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum__glass_types_blk_form_v_form_key" AS ENUM('drawing', 'callback', 'sample', 'load', 'contacts', 'full');
  CREATE TYPE "public"."enum__glass_types_blk_form_v_variant" AS ENUM('card', 'inline', 'page');
  CREATE TYPE "public"."enum__glass_types_blk_snippet_v_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__glass_types_blk_snippet_v_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum__glass_types_blk_stats_v_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__glass_types_blk_stats_v_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum__glass_types_blk_stats_v_variant" AS ENUM('glass', 'tiles', 'plain');
  CREATE TYPE "public"."enum__glass_types_blk_objects_v_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__glass_types_blk_objects_v_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum__glass_types_blk_objects_v_mode" AS ENUM('featured', 'byProduct', 'manual');
  CREATE TYPE "public"."enum__glass_types_blk_articles_v_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__glass_types_blk_articles_v_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum__glass_types_blk_articles_v_mode" AS ENUM('featured', 'latest', 'manual');
  CREATE TYPE "public"."enum__glass_types_blk_wdw_v_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__glass_types_blk_wdw_v_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum__glass_types_blk_systems_v_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__glass_types_blk_systems_v_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum__glass_types_blk_systems_v_source" AS ENUM('doc', 'inline');
  CREATE TYPE "public"."enum__glass_types_blk_systems_v_layout" AS ENUM('cards', 'table');
  CREATE TYPE "public"."enum__glass_types_blk_gallery_v_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__glass_types_blk_gallery_v_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum__glass_types_blk_gallery_v_layout" AS ENUM('grid', 'slider');
  CREATE TYPE "public"."enum__glass_types_blk_two_cols_v_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__glass_types_blk_two_cols_v_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum__glass_types_blk_links_v_items_link_type" AS ENUM('doc', 'custom');
  CREATE TYPE "public"."enum__glass_types_blk_links_v_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__glass_types_blk_links_v_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum__glass_types_blk_links_v_variant" AS ENUM('chips', 'bridge', 'buttons');
  CREATE TYPE "public"."enum__glass_types_blk_contacts_v_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__glass_types_blk_contacts_v_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum__glass_types_blk_requisites_v_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__glass_types_blk_requisites_v_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum__glass_types_blk_team_v_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__glass_types_blk_team_v_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum__glass_types_blk_team_v_empty_behavior" AS ENUM('hide', 'message');
  CREATE TYPE "public"."enum__glass_types_blk_quiz_cta_v_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__glass_types_blk_quiz_cta_v_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum__glass_types_blk_quiz_cta_v_prefill_type" AS ENUM('tempered', 'triplex', 'partitions', 'railings', 'shower', 'canopies', 'facade', 'shopfronts', 'verandas', 'mirrors', 'other');
  CREATE TYPE "public"."enum__glass_types_blk_quiz_cta_v_prefill_thickness" AS ENUM('4', '5', '6', '8', '10', '12', '15', '19');
  CREATE TYPE "public"."enum__glass_types_blk_quiz_cta_v_prefill_kind" AS ENUM('clear', 'low-iron', 'matte', 'tinted', 'painted', 'ribbed', 'bent');
  CREATE TYPE "public"."enum__glass_types_blk_quiz_cta_v_prefill_secondary_form" AS ENUM('drawing', 'load', 'sample', 'none');
  CREATE TYPE "public"."enum__glass_types_v_version_url_base" AS ENUM('zakalennoe-steklo', 'root');
  CREATE TYPE "public"."enum__glass_types_v_version_quiz_prefill_type" AS ENUM('tempered', 'triplex', 'partitions', 'railings', 'shower', 'canopies', 'facade', 'shopfronts', 'verandas', 'mirrors', 'other');
  CREATE TYPE "public"."enum__glass_types_v_version_quiz_prefill_thickness" AS ENUM('4', '5', '6', '8', '10', '12', '15', '19');
  CREATE TYPE "public"."enum__glass_types_v_version_quiz_prefill_kind" AS ENUM('clear', 'low-iron', 'matte', 'tinted', 'painted', 'ribbed', 'bent');
  CREATE TYPE "public"."enum__glass_types_v_version_quiz_prefill_secondary_form" AS ENUM('drawing', 'load', 'sample', 'none');
  CREATE TYPE "public"."enum__glass_types_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_processing_services_tables_cols_align" AS ENUM('left', 'center', 'right');
  CREATE TYPE "public"."enum_processing_services_tables_role" AS ENUM('parameters', 'comparison', 'schemes', 'other');
  CREATE TYPE "public"."enum_processing_services_tables_mobile_mode" AS ENUM('cards', 'pairs');
  CREATE TYPE "public"."enum_processing_services_callouts_tone" AS ENUM('warning', 'info');
  CREATE TYPE "public"."enum_processing_services_related_links_link_type" AS ENUM('doc', 'custom');
  CREATE TYPE "public"."enum_processing_services_blk_hero_buttons_kind" AS ENUM('quiz', 'form', 'link', 'download');
  CREATE TYPE "public"."enum_processing_services_blk_hero_buttons_variant" AS ENUM('primary', 'secondary', 'ghost');
  CREATE TYPE "public"."enum_processing_services_blk_hero_buttons_form_key" AS ENUM('drawing', 'callback', 'sample', 'load', 'contacts', 'full');
  CREATE TYPE "public"."enum_processing_services_blk_hero_buttons_link_type" AS ENUM('doc', 'custom');
  CREATE TYPE "public"."enum_processing_services_blk_hero_variant" AS ENUM('ctHero', 'p5Top', 'home');
  CREATE TYPE "public"."enum_processing_services_blk_hero_terms_mode" AS ENUM('full', 'short');
  CREATE TYPE "public"."enum_processing_services_blk_text_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_processing_services_blk_text_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_processing_services_blk_text_width" AS ENUM('narrow', 'normal', 'wide');
  CREATE TYPE "public"."enum_processing_services_blk_table_table_cols_align" AS ENUM('left', 'center', 'right');
  CREATE TYPE "public"."enum_processing_services_blk_table_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_processing_services_blk_table_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_processing_services_blk_table_table_role" AS ENUM('parameters', 'comparison', 'schemes', 'other');
  CREATE TYPE "public"."enum_processing_services_blk_table_table_mobile_mode" AS ENUM('cards', 'pairs');
  CREATE TYPE "public"."enum_processing_services_blk_steps_items_link_type" AS ENUM('doc', 'custom');
  CREATE TYPE "public"."enum_processing_services_blk_steps_buttons_kind" AS ENUM('quiz', 'form', 'link', 'download');
  CREATE TYPE "public"."enum_processing_services_blk_steps_buttons_variant" AS ENUM('primary', 'secondary', 'ghost');
  CREATE TYPE "public"."enum_processing_services_blk_steps_buttons_form_key" AS ENUM('drawing', 'callback', 'sample', 'load', 'contacts', 'full');
  CREATE TYPE "public"."enum_processing_services_blk_steps_buttons_link_type" AS ENUM('doc', 'custom');
  CREATE TYPE "public"."enum_processing_services_blk_steps_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_processing_services_blk_steps_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_processing_services_blk_steps_variant" AS ENUM('horizontal', 'vertical');
  CREATE TYPE "public"."enum_processing_services_blk_callout_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_processing_services_blk_callout_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_processing_services_blk_callout_tone" AS ENUM('warning', 'info');
  CREATE TYPE "public"."enum_processing_services_blk_terms_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_processing_services_blk_terms_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_processing_services_blk_terms_mode" AS ENUM('global', 'globalShort', 'custom');
  CREATE TYPE "public"."enum_processing_services_blk_terms_variant" AS ENUM('bar', 'plain');
  CREATE TYPE "public"."enum_processing_services_blk_cards_items_link_type" AS ENUM('doc', 'custom');
  CREATE TYPE "public"."enum_processing_services_blk_cards_items_tone" AS ENUM('default', 'negative', 'accent');
  CREATE TYPE "public"."enum_processing_services_blk_cards_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_processing_services_blk_cards_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_processing_services_blk_cards_layout" AS ENUM('g3', 'g4', 'ctCards', 'p5Cards', 'seg');
  CREATE TYPE "public"."enum_processing_services_blk_coll_cards_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_processing_services_blk_coll_cards_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_processing_services_blk_coll_cards_source" AS ENUM('glassTypes', 'processingServices', 'constructions', 'thicknesses', 'articles');
  CREATE TYPE "public"."enum_processing_services_blk_coll_cards_mode" AS ENUM('all', 'manual', 'group');
  CREATE TYPE "public"."enum_processing_services_blk_coll_cards_group" AS ENUM('constructions', 'glazing', 'mirrors', 'hardware');
  CREATE TYPE "public"."enum_processing_services_blk_coll_cards_columns" AS ENUM('3', '4');
  CREATE TYPE "public"."enum_processing_services_blk_prices_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_processing_services_blk_prices_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_processing_services_blk_prices_variant" AS ENUM('table', 'cards', 'both');
  CREATE TYPE "public"."enum_processing_services_blk_faq_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_processing_services_blk_faq_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_processing_services_blk_faq_mode" AS ENUM('doc', 'inline');
  CREATE TYPE "public"."enum_processing_services_blk_cta_buttons_kind" AS ENUM('quiz', 'form', 'link', 'download');
  CREATE TYPE "public"."enum_processing_services_blk_cta_buttons_variant" AS ENUM('primary', 'secondary', 'ghost');
  CREATE TYPE "public"."enum_processing_services_blk_cta_buttons_form_key" AS ENUM('drawing', 'callback', 'sample', 'load', 'contacts', 'full');
  CREATE TYPE "public"."enum_processing_services_blk_cta_buttons_link_type" AS ENUM('doc', 'custom');
  CREATE TYPE "public"."enum_processing_services_blk_cta_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_processing_services_blk_cta_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_processing_services_blk_cta_variant" AS ENUM('buttons', 'banner', 'strip', 'split');
  CREATE TYPE "public"."enum_processing_services_blk_cta_tone" AS ENUM('light', 'primaryDark');
  CREATE TYPE "public"."enum_processing_services_blk_cta_link_type" AS ENUM('doc', 'custom');
  CREATE TYPE "public"."enum_processing_services_blk_compare_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_processing_services_blk_compare_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_processing_services_blk_compare_foot_link_type" AS ENUM('doc', 'custom');
  CREATE TYPE "public"."enum_processing_services_blk_download_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_processing_services_blk_download_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_processing_services_blk_download_variant" AS ENUM('list', 'card');
  CREATE TYPE "public"."enum_processing_services_blk_holes_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_processing_services_blk_holes_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_processing_services_blk_holes_default_thickness" AS ENUM('4', '5', '6', '8', '10', '12', '15', '19');
  CREATE TYPE "public"."enum_processing_services_blk_weight_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_processing_services_blk_weight_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_processing_services_blk_weight_default_mode" AS ENUM('single', 'triplex');
  CREATE TYPE "public"."enum_processing_services_blk_form_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_processing_services_blk_form_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_processing_services_blk_form_form_key" AS ENUM('drawing', 'callback', 'sample', 'load', 'contacts', 'full');
  CREATE TYPE "public"."enum_processing_services_blk_form_variant" AS ENUM('card', 'inline', 'page');
  CREATE TYPE "public"."enum_processing_services_blk_snippet_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_processing_services_blk_snippet_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_processing_services_blk_stats_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_processing_services_blk_stats_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_processing_services_blk_stats_variant" AS ENUM('glass', 'tiles', 'plain');
  CREATE TYPE "public"."enum_processing_services_blk_objects_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_processing_services_blk_objects_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_processing_services_blk_objects_mode" AS ENUM('featured', 'byProduct', 'manual');
  CREATE TYPE "public"."enum_processing_services_blk_articles_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_processing_services_blk_articles_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_processing_services_blk_articles_mode" AS ENUM('featured', 'latest', 'manual');
  CREATE TYPE "public"."enum_processing_services_blk_wdw_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_processing_services_blk_wdw_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_processing_services_blk_systems_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_processing_services_blk_systems_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_processing_services_blk_systems_source" AS ENUM('doc', 'inline');
  CREATE TYPE "public"."enum_processing_services_blk_systems_layout" AS ENUM('cards', 'table');
  CREATE TYPE "public"."enum_processing_services_blk_gallery_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_processing_services_blk_gallery_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_processing_services_blk_gallery_layout" AS ENUM('grid', 'slider');
  CREATE TYPE "public"."enum_processing_services_blk_two_cols_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_processing_services_blk_two_cols_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_processing_services_blk_links_items_link_type" AS ENUM('doc', 'custom');
  CREATE TYPE "public"."enum_processing_services_blk_links_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_processing_services_blk_links_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_processing_services_blk_links_variant" AS ENUM('chips', 'bridge', 'buttons');
  CREATE TYPE "public"."enum_processing_services_blk_contacts_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_processing_services_blk_contacts_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_processing_services_blk_requisites_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_processing_services_blk_requisites_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_processing_services_blk_team_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_processing_services_blk_team_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_processing_services_blk_team_empty_behavior" AS ENUM('hide', 'message');
  CREATE TYPE "public"."enum_processing_services_blk_quiz_cta_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_processing_services_blk_quiz_cta_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_processing_services_blk_quiz_cta_prefill_type" AS ENUM('tempered', 'triplex', 'partitions', 'railings', 'shower', 'canopies', 'facade', 'shopfronts', 'verandas', 'mirrors', 'other');
  CREATE TYPE "public"."enum_processing_services_blk_quiz_cta_prefill_thickness" AS ENUM('4', '5', '6', '8', '10', '12', '15', '19');
  CREATE TYPE "public"."enum_processing_services_blk_quiz_cta_prefill_kind" AS ENUM('clear', 'low-iron', 'matte', 'tinted', 'painted', 'ribbed', 'bent');
  CREATE TYPE "public"."enum_processing_services_blk_quiz_cta_prefill_secondary_form" AS ENUM('drawing', 'load', 'sample', 'none');
  CREATE TYPE "public"."enum_processing_services_quiz_prefill_type" AS ENUM('tempered', 'triplex', 'partitions', 'railings', 'shower', 'canopies', 'facade', 'shopfronts', 'verandas', 'mirrors', 'other');
  CREATE TYPE "public"."enum_processing_services_quiz_prefill_thickness" AS ENUM('4', '5', '6', '8', '10', '12', '15', '19');
  CREATE TYPE "public"."enum_processing_services_quiz_prefill_kind" AS ENUM('clear', 'low-iron', 'matte', 'tinted', 'painted', 'ribbed', 'bent');
  CREATE TYPE "public"."enum_processing_services_quiz_prefill_secondary_form" AS ENUM('drawing', 'load', 'sample', 'none');
  CREATE TYPE "public"."enum_constructions_tables_cols_align" AS ENUM('left', 'center', 'right');
  CREATE TYPE "public"."enum_constructions_tables_role" AS ENUM('parameters', 'comparison', 'schemes', 'other');
  CREATE TYPE "public"."enum_constructions_tables_mobile_mode" AS ENUM('cards', 'pairs');
  CREATE TYPE "public"."enum_constructions_blk_hero_buttons_kind" AS ENUM('quiz', 'form', 'link', 'download');
  CREATE TYPE "public"."enum_constructions_blk_hero_buttons_variant" AS ENUM('primary', 'secondary', 'ghost');
  CREATE TYPE "public"."enum_constructions_blk_hero_buttons_form_key" AS ENUM('drawing', 'callback', 'sample', 'load', 'contacts', 'full');
  CREATE TYPE "public"."enum_constructions_blk_hero_buttons_link_type" AS ENUM('doc', 'custom');
  CREATE TYPE "public"."enum_constructions_blk_hero_variant" AS ENUM('ctHero', 'p5Top', 'home');
  CREATE TYPE "public"."enum_constructions_blk_hero_terms_mode" AS ENUM('full', 'short');
  CREATE TYPE "public"."enum_constructions_blk_text_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_constructions_blk_text_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_constructions_blk_text_width" AS ENUM('narrow', 'normal', 'wide');
  CREATE TYPE "public"."enum_constructions_blk_table_table_cols_align" AS ENUM('left', 'center', 'right');
  CREATE TYPE "public"."enum_constructions_blk_table_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_constructions_blk_table_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_constructions_blk_table_table_role" AS ENUM('parameters', 'comparison', 'schemes', 'other');
  CREATE TYPE "public"."enum_constructions_blk_table_table_mobile_mode" AS ENUM('cards', 'pairs');
  CREATE TYPE "public"."enum_constructions_blk_steps_items_link_type" AS ENUM('doc', 'custom');
  CREATE TYPE "public"."enum_constructions_blk_steps_buttons_kind" AS ENUM('quiz', 'form', 'link', 'download');
  CREATE TYPE "public"."enum_constructions_blk_steps_buttons_variant" AS ENUM('primary', 'secondary', 'ghost');
  CREATE TYPE "public"."enum_constructions_blk_steps_buttons_form_key" AS ENUM('drawing', 'callback', 'sample', 'load', 'contacts', 'full');
  CREATE TYPE "public"."enum_constructions_blk_steps_buttons_link_type" AS ENUM('doc', 'custom');
  CREATE TYPE "public"."enum_constructions_blk_steps_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_constructions_blk_steps_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_constructions_blk_steps_variant" AS ENUM('horizontal', 'vertical');
  CREATE TYPE "public"."enum_constructions_blk_callout_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_constructions_blk_callout_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_constructions_blk_callout_tone" AS ENUM('warning', 'info');
  CREATE TYPE "public"."enum_constructions_blk_terms_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_constructions_blk_terms_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_constructions_blk_terms_mode" AS ENUM('global', 'globalShort', 'custom');
  CREATE TYPE "public"."enum_constructions_blk_terms_variant" AS ENUM('bar', 'plain');
  CREATE TYPE "public"."enum_constructions_blk_cards_items_link_type" AS ENUM('doc', 'custom');
  CREATE TYPE "public"."enum_constructions_blk_cards_items_tone" AS ENUM('default', 'negative', 'accent');
  CREATE TYPE "public"."enum_constructions_blk_cards_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_constructions_blk_cards_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_constructions_blk_cards_layout" AS ENUM('g3', 'g4', 'ctCards', 'p5Cards', 'seg');
  CREATE TYPE "public"."enum_constructions_blk_coll_cards_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_constructions_blk_coll_cards_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_constructions_blk_coll_cards_source" AS ENUM('glassTypes', 'processingServices', 'constructions', 'thicknesses', 'articles');
  CREATE TYPE "public"."enum_constructions_blk_coll_cards_mode" AS ENUM('all', 'manual', 'group');
  CREATE TYPE "public"."enum_constructions_blk_coll_cards_group" AS ENUM('constructions', 'glazing', 'mirrors', 'hardware');
  CREATE TYPE "public"."enum_constructions_blk_coll_cards_columns" AS ENUM('3', '4');
  CREATE TYPE "public"."enum_constructions_blk_prices_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_constructions_blk_prices_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_constructions_blk_prices_variant" AS ENUM('table', 'cards', 'both');
  CREATE TYPE "public"."enum_constructions_blk_faq_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_constructions_blk_faq_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_constructions_blk_faq_mode" AS ENUM('doc', 'inline');
  CREATE TYPE "public"."enum_constructions_blk_cta_buttons_kind" AS ENUM('quiz', 'form', 'link', 'download');
  CREATE TYPE "public"."enum_constructions_blk_cta_buttons_variant" AS ENUM('primary', 'secondary', 'ghost');
  CREATE TYPE "public"."enum_constructions_blk_cta_buttons_form_key" AS ENUM('drawing', 'callback', 'sample', 'load', 'contacts', 'full');
  CREATE TYPE "public"."enum_constructions_blk_cta_buttons_link_type" AS ENUM('doc', 'custom');
  CREATE TYPE "public"."enum_constructions_blk_cta_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_constructions_blk_cta_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_constructions_blk_cta_variant" AS ENUM('buttons', 'banner', 'strip', 'split');
  CREATE TYPE "public"."enum_constructions_blk_cta_tone" AS ENUM('light', 'primaryDark');
  CREATE TYPE "public"."enum_constructions_blk_cta_link_type" AS ENUM('doc', 'custom');
  CREATE TYPE "public"."enum_constructions_blk_compare_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_constructions_blk_compare_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_constructions_blk_compare_foot_link_type" AS ENUM('doc', 'custom');
  CREATE TYPE "public"."enum_constructions_blk_download_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_constructions_blk_download_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_constructions_blk_download_variant" AS ENUM('list', 'card');
  CREATE TYPE "public"."enum_constructions_blk_holes_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_constructions_blk_holes_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_constructions_blk_holes_default_thickness" AS ENUM('4', '5', '6', '8', '10', '12', '15', '19');
  CREATE TYPE "public"."enum_constructions_blk_weight_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_constructions_blk_weight_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_constructions_blk_weight_default_mode" AS ENUM('single', 'triplex');
  CREATE TYPE "public"."enum_constructions_blk_form_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_constructions_blk_form_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_constructions_blk_form_form_key" AS ENUM('drawing', 'callback', 'sample', 'load', 'contacts', 'full');
  CREATE TYPE "public"."enum_constructions_blk_form_variant" AS ENUM('card', 'inline', 'page');
  CREATE TYPE "public"."enum_constructions_blk_snippet_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_constructions_blk_snippet_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_constructions_blk_stats_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_constructions_blk_stats_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_constructions_blk_stats_variant" AS ENUM('glass', 'tiles', 'plain');
  CREATE TYPE "public"."enum_constructions_blk_objects_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_constructions_blk_objects_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_constructions_blk_objects_mode" AS ENUM('featured', 'byProduct', 'manual');
  CREATE TYPE "public"."enum_constructions_blk_articles_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_constructions_blk_articles_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_constructions_blk_articles_mode" AS ENUM('featured', 'latest', 'manual');
  CREATE TYPE "public"."enum_constructions_blk_wdw_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_constructions_blk_wdw_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_constructions_blk_systems_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_constructions_blk_systems_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_constructions_blk_systems_source" AS ENUM('doc', 'inline');
  CREATE TYPE "public"."enum_constructions_blk_systems_layout" AS ENUM('cards', 'table');
  CREATE TYPE "public"."enum_constructions_blk_gallery_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_constructions_blk_gallery_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_constructions_blk_gallery_layout" AS ENUM('grid', 'slider');
  CREATE TYPE "public"."enum_constructions_blk_two_cols_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_constructions_blk_two_cols_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_constructions_blk_links_items_link_type" AS ENUM('doc', 'custom');
  CREATE TYPE "public"."enum_constructions_blk_links_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_constructions_blk_links_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_constructions_blk_links_variant" AS ENUM('chips', 'bridge', 'buttons');
  CREATE TYPE "public"."enum_constructions_blk_contacts_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_constructions_blk_contacts_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_constructions_blk_requisites_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_constructions_blk_requisites_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_constructions_blk_team_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_constructions_blk_team_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_constructions_blk_team_empty_behavior" AS ENUM('hide', 'message');
  CREATE TYPE "public"."enum_constructions_blk_quiz_cta_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_constructions_blk_quiz_cta_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum_constructions_blk_quiz_cta_prefill_type" AS ENUM('tempered', 'triplex', 'partitions', 'railings', 'shower', 'canopies', 'facade', 'shopfronts', 'verandas', 'mirrors', 'other');
  CREATE TYPE "public"."enum_constructions_blk_quiz_cta_prefill_thickness" AS ENUM('4', '5', '6', '8', '10', '12', '15', '19');
  CREATE TYPE "public"."enum_constructions_blk_quiz_cta_prefill_kind" AS ENUM('clear', 'low-iron', 'matte', 'tinted', 'painted', 'ribbed', 'bent');
  CREATE TYPE "public"."enum_constructions_blk_quiz_cta_prefill_secondary_form" AS ENUM('drawing', 'load', 'sample', 'none');
  CREATE TYPE "public"."enum_constructions_kind" AS ENUM('hub', 'construction');
  CREATE TYPE "public"."enum_constructions_group" AS ENUM('constructions', 'glazing', 'mirrors', 'hardware');
  CREATE TYPE "public"."enum_constructions_secondary_form_key" AS ENUM('drawing', 'load', 'none');
  CREATE TYPE "public"."enum_constructions_systems_layout" AS ENUM('cards', 'table');
  CREATE TYPE "public"."enum_constructions_quiz_prefill_type" AS ENUM('tempered', 'triplex', 'partitions', 'railings', 'shower', 'canopies', 'facade', 'shopfronts', 'verandas', 'mirrors', 'other');
  CREATE TYPE "public"."enum_constructions_quiz_prefill_thickness" AS ENUM('4', '5', '6', '8', '10', '12', '15', '19');
  CREATE TYPE "public"."enum_constructions_quiz_prefill_kind" AS ENUM('clear', 'low-iron', 'matte', 'tinted', 'painted', 'ribbed', 'bent');
  CREATE TYPE "public"."enum_constructions_quiz_prefill_secondary_form" AS ENUM('drawing', 'load', 'sample', 'none');
  CREATE TYPE "public"."enum_constructions_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__constructions_tables_cols_v_align" AS ENUM('left', 'center', 'right');
  CREATE TYPE "public"."enum__constructions_v_version_tables_role" AS ENUM('parameters', 'comparison', 'schemes', 'other');
  CREATE TYPE "public"."enum__constructions_v_version_tables_mobile_mode" AS ENUM('cards', 'pairs');
  CREATE TYPE "public"."enum__constructions_blk_hero_v_buttons_kind" AS ENUM('quiz', 'form', 'link', 'download');
  CREATE TYPE "public"."enum__constructions_blk_hero_v_buttons_variant" AS ENUM('primary', 'secondary', 'ghost');
  CREATE TYPE "public"."enum__constructions_blk_hero_v_buttons_form_key" AS ENUM('drawing', 'callback', 'sample', 'load', 'contacts', 'full');
  CREATE TYPE "public"."enum__constructions_blk_hero_v_buttons_link_type" AS ENUM('doc', 'custom');
  CREATE TYPE "public"."enum__constructions_blk_hero_v_variant" AS ENUM('ctHero', 'p5Top', 'home');
  CREATE TYPE "public"."enum__constructions_blk_hero_v_terms_mode" AS ENUM('full', 'short');
  CREATE TYPE "public"."enum__constructions_blk_text_v_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__constructions_blk_text_v_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum__constructions_blk_text_v_width" AS ENUM('narrow', 'normal', 'wide');
  CREATE TYPE "public"."enum__constructions_blk_table_table_cols_v_align" AS ENUM('left', 'center', 'right');
  CREATE TYPE "public"."enum__constructions_blk_table_v_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__constructions_blk_table_v_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum__constructions_blk_table_v_table_role" AS ENUM('parameters', 'comparison', 'schemes', 'other');
  CREATE TYPE "public"."enum__constructions_blk_table_v_table_mobile_mode" AS ENUM('cards', 'pairs');
  CREATE TYPE "public"."enum__constructions_blk_steps_v_items_link_type" AS ENUM('doc', 'custom');
  CREATE TYPE "public"."enum__constructions_blk_steps_v_buttons_kind" AS ENUM('quiz', 'form', 'link', 'download');
  CREATE TYPE "public"."enum__constructions_blk_steps_v_buttons_variant" AS ENUM('primary', 'secondary', 'ghost');
  CREATE TYPE "public"."enum__constructions_blk_steps_v_buttons_form_key" AS ENUM('drawing', 'callback', 'sample', 'load', 'contacts', 'full');
  CREATE TYPE "public"."enum__constructions_blk_steps_v_buttons_link_type" AS ENUM('doc', 'custom');
  CREATE TYPE "public"."enum__constructions_blk_steps_v_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__constructions_blk_steps_v_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum__constructions_blk_steps_v_variant" AS ENUM('horizontal', 'vertical');
  CREATE TYPE "public"."enum__constructions_blk_callout_v_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__constructions_blk_callout_v_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum__constructions_blk_callout_v_tone" AS ENUM('warning', 'info');
  CREATE TYPE "public"."enum__constructions_blk_terms_v_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__constructions_blk_terms_v_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum__constructions_blk_terms_v_mode" AS ENUM('global', 'globalShort', 'custom');
  CREATE TYPE "public"."enum__constructions_blk_terms_v_variant" AS ENUM('bar', 'plain');
  CREATE TYPE "public"."enum__constructions_blk_cards_v_items_link_type" AS ENUM('doc', 'custom');
  CREATE TYPE "public"."enum__constructions_blk_cards_v_items_tone" AS ENUM('default', 'negative', 'accent');
  CREATE TYPE "public"."enum__constructions_blk_cards_v_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__constructions_blk_cards_v_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum__constructions_blk_cards_v_layout" AS ENUM('g3', 'g4', 'ctCards', 'p5Cards', 'seg');
  CREATE TYPE "public"."enum__constructions_blk_coll_cards_v_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__constructions_blk_coll_cards_v_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum__constructions_blk_coll_cards_v_source" AS ENUM('glassTypes', 'processingServices', 'constructions', 'thicknesses', 'articles');
  CREATE TYPE "public"."enum__constructions_blk_coll_cards_v_mode" AS ENUM('all', 'manual', 'group');
  CREATE TYPE "public"."enum__constructions_blk_coll_cards_v_group" AS ENUM('constructions', 'glazing', 'mirrors', 'hardware');
  CREATE TYPE "public"."enum__constructions_blk_coll_cards_v_columns" AS ENUM('3', '4');
  CREATE TYPE "public"."enum__constructions_blk_prices_v_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__constructions_blk_prices_v_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum__constructions_blk_prices_v_variant" AS ENUM('table', 'cards', 'both');
  CREATE TYPE "public"."enum__constructions_blk_faq_v_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__constructions_blk_faq_v_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum__constructions_blk_faq_v_mode" AS ENUM('doc', 'inline');
  CREATE TYPE "public"."enum__constructions_blk_cta_v_buttons_kind" AS ENUM('quiz', 'form', 'link', 'download');
  CREATE TYPE "public"."enum__constructions_blk_cta_v_buttons_variant" AS ENUM('primary', 'secondary', 'ghost');
  CREATE TYPE "public"."enum__constructions_blk_cta_v_buttons_form_key" AS ENUM('drawing', 'callback', 'sample', 'load', 'contacts', 'full');
  CREATE TYPE "public"."enum__constructions_blk_cta_v_buttons_link_type" AS ENUM('doc', 'custom');
  CREATE TYPE "public"."enum__constructions_blk_cta_v_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__constructions_blk_cta_v_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum__constructions_blk_cta_v_variant" AS ENUM('buttons', 'banner', 'strip', 'split');
  CREATE TYPE "public"."enum__constructions_blk_cta_v_tone" AS ENUM('light', 'primaryDark');
  CREATE TYPE "public"."enum__constructions_blk_cta_v_link_type" AS ENUM('doc', 'custom');
  CREATE TYPE "public"."enum__constructions_blk_compare_v_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__constructions_blk_compare_v_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum__constructions_blk_compare_v_foot_link_type" AS ENUM('doc', 'custom');
  CREATE TYPE "public"."enum__constructions_blk_download_v_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__constructions_blk_download_v_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum__constructions_blk_download_v_variant" AS ENUM('list', 'card');
  CREATE TYPE "public"."enum__constructions_blk_holes_v_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__constructions_blk_holes_v_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum__constructions_blk_holes_v_default_thickness" AS ENUM('4', '5', '6', '8', '10', '12', '15', '19');
  CREATE TYPE "public"."enum__constructions_blk_weight_v_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__constructions_blk_weight_v_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum__constructions_blk_weight_v_default_mode" AS ENUM('single', 'triplex');
  CREATE TYPE "public"."enum__constructions_blk_form_v_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__constructions_blk_form_v_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum__constructions_blk_form_v_form_key" AS ENUM('drawing', 'callback', 'sample', 'load', 'contacts', 'full');
  CREATE TYPE "public"."enum__constructions_blk_form_v_variant" AS ENUM('card', 'inline', 'page');
  CREATE TYPE "public"."enum__constructions_blk_snippet_v_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__constructions_blk_snippet_v_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum__constructions_blk_stats_v_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__constructions_blk_stats_v_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum__constructions_blk_stats_v_variant" AS ENUM('glass', 'tiles', 'plain');
  CREATE TYPE "public"."enum__constructions_blk_objects_v_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__constructions_blk_objects_v_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum__constructions_blk_objects_v_mode" AS ENUM('featured', 'byProduct', 'manual');
  CREATE TYPE "public"."enum__constructions_blk_articles_v_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__constructions_blk_articles_v_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum__constructions_blk_articles_v_mode" AS ENUM('featured', 'latest', 'manual');
  CREATE TYPE "public"."enum__constructions_blk_wdw_v_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__constructions_blk_wdw_v_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum__constructions_blk_systems_v_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__constructions_blk_systems_v_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum__constructions_blk_systems_v_source" AS ENUM('doc', 'inline');
  CREATE TYPE "public"."enum__constructions_blk_systems_v_layout" AS ENUM('cards', 'table');
  CREATE TYPE "public"."enum__constructions_blk_gallery_v_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__constructions_blk_gallery_v_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum__constructions_blk_gallery_v_layout" AS ENUM('grid', 'slider');
  CREATE TYPE "public"."enum__constructions_blk_two_cols_v_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__constructions_blk_two_cols_v_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum__constructions_blk_links_v_items_link_type" AS ENUM('doc', 'custom');
  CREATE TYPE "public"."enum__constructions_blk_links_v_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__constructions_blk_links_v_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum__constructions_blk_links_v_variant" AS ENUM('chips', 'bridge', 'buttons');
  CREATE TYPE "public"."enum__constructions_blk_contacts_v_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__constructions_blk_contacts_v_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum__constructions_blk_requisites_v_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__constructions_blk_requisites_v_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum__constructions_blk_team_v_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__constructions_blk_team_v_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum__constructions_blk_team_v_empty_behavior" AS ENUM('hide', 'message');
  CREATE TYPE "public"."enum__constructions_blk_quiz_cta_v_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__constructions_blk_quiz_cta_v_background" AS ENUM('auto', 'bg', 'sf', 'dark', 'primaryDark');
  CREATE TYPE "public"."enum__constructions_blk_quiz_cta_v_prefill_type" AS ENUM('tempered', 'triplex', 'partitions', 'railings', 'shower', 'canopies', 'facade', 'shopfronts', 'verandas', 'mirrors', 'other');
  CREATE TYPE "public"."enum__constructions_blk_quiz_cta_v_prefill_thickness" AS ENUM('4', '5', '6', '8', '10', '12', '15', '19');
  CREATE TYPE "public"."enum__constructions_blk_quiz_cta_v_prefill_kind" AS ENUM('clear', 'low-iron', 'matte', 'tinted', 'painted', 'ribbed', 'bent');
  CREATE TYPE "public"."enum__constructions_blk_quiz_cta_v_prefill_secondary_form" AS ENUM('drawing', 'load', 'sample', 'none');
  CREATE TYPE "public"."enum__constructions_v_version_kind" AS ENUM('hub', 'construction');
  CREATE TYPE "public"."enum__constructions_v_version_group" AS ENUM('constructions', 'glazing', 'mirrors', 'hardware');
  CREATE TYPE "public"."enum__constructions_v_version_secondary_form_key" AS ENUM('drawing', 'load', 'none');
  CREATE TYPE "public"."enum__constructions_v_version_systems_layout" AS ENUM('cards', 'table');
  CREATE TYPE "public"."enum__constructions_v_version_quiz_prefill_type" AS ENUM('tempered', 'triplex', 'partitions', 'railings', 'shower', 'canopies', 'facade', 'shopfronts', 'verandas', 'mirrors', 'other');
  CREATE TYPE "public"."enum__constructions_v_version_quiz_prefill_thickness" AS ENUM('4', '5', '6', '8', '10', '12', '15', '19');
  CREATE TYPE "public"."enum__constructions_v_version_quiz_prefill_kind" AS ENUM('clear', 'low-iron', 'matte', 'tinted', 'painted', 'ribbed', 'bent');
  CREATE TYPE "public"."enum__constructions_v_version_quiz_prefill_secondary_form" AS ENUM('drawing', 'load', 'sample', 'none');
  CREATE TYPE "public"."enum__constructions_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_shower_configs_glass_thicknesses" AS ENUM('8', '10');
  CREATE TYPE "public"."enum_shower_configs_config_type" AS ENUM('straight-door', 'corner', 'trapezoid', 'walk-in', 'sliding', 'other');
  CREATE TYPE "public"."enum_shower_configs_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__shower_configs_v_version_glass_thicknesses" AS ENUM('8', '10');
  CREATE TYPE "public"."enum__shower_configs_v_version_config_type" AS ENUM('straight-door', 'corner', 'trapezoid', 'walk-in', 'sliding', 'other');
  CREATE TYPE "public"."enum__shower_configs_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_products_quiz_type" AS ENUM('tempered', 'triplex', 'partitions', 'railings', 'shower', 'canopies', 'facade', 'shopfronts', 'verandas', 'mirrors', 'other');
  CREATE TYPE "public"."enum_lead_files_kind" AS ENUM('dwg', 'dxf', 'pdf', 'png', 'jpeg');
  CREATE TYPE "public"."enum_lead_files_source" AS ENUM('quiz', 'form');
  CREATE TYPE "public"."enum_leads_flags" AS ENUM('small_volume', 'nonstandard_size', 'urgent', 'no_file', 'needs_docs');
  CREATE TYPE "public"."enum_leads_form_type" AS ENUM('quiz', 'drawing', 'callback', 'sample', 'load', 'contacts', 'full');
  CREATE TYPE "public"."enum_leads_role" AS ENUM('contractor', 'manufacturer', 'developer', 'designer', 'other');
  CREATE TYPE "public"."enum_leads_product_type" AS ENUM('tempered', 'triplex', 'partitions', 'railings', 'shower', 'canopies', 'facade', 'shopfronts', 'verandas', 'mirrors', 'other');
  CREATE TYPE "public"."enum_leads_duplicate_reason" AS ENUM('phone', 'email', 'both');
  CREATE TYPE "public"."enum__leads_v_version_flags" AS ENUM('small_volume', 'nonstandard_size', 'urgent', 'no_file', 'needs_docs');
  CREATE TYPE "public"."enum__leads_v_version_form_type" AS ENUM('quiz', 'drawing', 'callback', 'sample', 'load', 'contacts', 'full');
  CREATE TYPE "public"."enum__leads_v_version_role" AS ENUM('contractor', 'manufacturer', 'developer', 'designer', 'other');
  CREATE TYPE "public"."enum__leads_v_version_product_type" AS ENUM('tempered', 'triplex', 'partitions', 'railings', 'shower', 'canopies', 'facade', 'shopfronts', 'verandas', 'mirrors', 'other');
  CREATE TYPE "public"."enum__leads_v_version_duplicate_reason" AS ENUM('phone', 'email', 'both');
  CREATE TYPE "public"."enum_orders_status_history_status" AS ENUM('spec_agreed', 'in_production', 'packed', 'shipped', 'received');
  CREATE TYPE "public"."enum_orders_documents_kind" AS ENUM('spec', 'passport', 'certificate', 'other');
  CREATE TYPE "public"."enum_orders_current_status" AS ENUM('spec_agreed', 'in_production', 'packed', 'shipped', 'received');
  CREATE TYPE "public"."enum_order_files_kind" AS ENUM('photo', 'document');
  CREATE TYPE "public"."enum_redirects_code" AS ENUM('301', '308');
  CREATE TYPE "public"."enum_contacts_locations_type" AS ENUM('office', 'warehouse');
  CREATE TYPE "public"."enum_contacts_messengers_icon" AS ENUM('telegram', 'whatsapp', 'max', 'viber', 'vk', 'other');
  CREATE TYPE "public"."enum__contacts_v_version_locations_type" AS ENUM('office', 'warehouse');
  CREATE TYPE "public"."enum__contacts_v_version_messengers_icon" AS ENUM('telegram', 'whatsapp', 'max', 'viber', 'vk', 'other');
  CREATE TYPE "public"."enum_tech_params_tint_colors_key" AS ENUM('bronze', 'graphite', 'grey');
  CREATE TYPE "public"."enum_tech_params_delivery_cities_kind" AS ENUM('city', 'other', 'pickup');
  CREATE TYPE "public"."enum_tech_params_quiz_options_edges_only_for_types" AS ENUM('tempered', 'triplex', 'partitions', 'railings', 'shower', 'canopies', 'facade', 'shopfronts', 'verandas', 'mirrors', 'other');
  CREATE TYPE "public"."enum_site_settings_stop_words_kind" AS ENUM('stem', 'phrase', 'factory');
  CREATE TYPE "public"."enum_site_settings_order_statuses_key" AS ENUM('spec_agreed', 'in_production', 'packed', 'shipped', 'received');
  CREATE TYPE "public"."enum_navigation_top_bar_company_items_link_type" AS ENUM('doc', 'custom');
  CREATE TYPE "public"."enum_navigation_top_bar_segments_link_type" AS ENUM('doc', 'custom');
  CREATE TYPE "public"."enum_navigation_main_row_pills_key" AS ENUM('catalog', 'services');
  CREATE TYPE "public"."enum_navigation_main_row_links_link_type" AS ENUM('doc', 'custom');
  CREATE TYPE "public"."enum_navigation_section_row_items_link_type" AS ENUM('doc', 'custom');
  CREATE TYPE "public"."enum_nav_mega_columns_links_link_type" AS ENUM('doc', 'custom');
  CREATE TYPE "public"."enum_nav_mega_key" AS ENUM('catalog', 'services');
  CREATE TYPE "public"."enum_nav_mega_promo_card_button_kind" AS ENUM('quiz', 'link');
  CREATE TYPE "public"."enum_navigation_footer_columns_links_link_type" AS ENUM('doc', 'custom');
  CREATE TYPE "public"."enum_navigation_footer_bottom_links_link_type" AS ENUM('doc', 'custom');
  CREATE TYPE "public"."enum_snippets_items_cta_form_key" AS ENUM('sample', 'drawing', 'callback', 'load', 'contacts', 'none');
  CREATE TABLE "media" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"alt" varchar,
  	"caption" varchar,
  	"kind" "enum_media_kind" DEFAULT 'photo',
  	"is_placeholder" boolean DEFAULT false,
  	"generated_id" varchar,
  	"credit" varchar,
  	"source_url" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric,
  	"sizes_thumbnail_url" varchar,
  	"sizes_thumbnail_width" numeric,
  	"sizes_thumbnail_height" numeric,
  	"sizes_thumbnail_mime_type" varchar,
  	"sizes_thumbnail_filesize" numeric,
  	"sizes_thumbnail_filename" varchar,
  	"sizes_card_url" varchar,
  	"sizes_card_width" numeric,
  	"sizes_card_height" numeric,
  	"sizes_card_mime_type" varchar,
  	"sizes_card_filesize" numeric,
  	"sizes_card_filename" varchar,
  	"sizes_hero_url" varchar,
  	"sizes_hero_width" numeric,
  	"sizes_hero_height" numeric,
  	"sizes_hero_mime_type" varchar,
  	"sizes_hero_filesize" numeric,
  	"sizes_hero_filename" varchar,
  	"sizes_og_url" varchar,
  	"sizes_og_width" numeric,
  	"sizes_og_height" numeric,
  	"sizes_og_mime_type" varchar,
  	"sizes_og_filesize" numeric,
  	"sizes_og_filename" varchar
  );
  
  CREATE TABLE "pages_blk_hero_eyebrow" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "pages_blk_hero_buttons" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"kind" "enum_pages_blk_hero_buttons_kind" DEFAULT 'quiz',
  	"variant" "enum_pages_blk_hero_buttons_variant" DEFAULT 'primary',
  	"icon" varchar,
  	"form_key" "enum_pages_blk_hero_buttons_form_key",
  	"form_params" jsonb,
  	"link_type" "enum_pages_blk_hero_buttons_link_type" DEFAULT 'doc',
  	"link_url" varchar,
  	"link_new_tab" boolean,
  	"file_id" uuid
  );
  
  CREATE TABLE "pages_blk_hero_photos" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" uuid,
  	"caption" varchar
  );
  
  CREATE TABLE "pages_blk_hero_stats" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar,
  	"text" varchar
  );
  
  CREATE TABLE "pages_blk_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_pages_blk_hero_variant" DEFAULT 'ctHero',
  	"title_override" varchar,
  	"lead" jsonb,
  	"facts" varchar,
  	"strong" varchar,
  	"show_terms" boolean DEFAULT true,
  	"terms_mode" "enum_pages_blk_hero_terms_mode" DEFAULT 'full',
  	"image_id" uuid,
  	"image_alt" varchar,
  	"big_number" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blk_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_pages_blk_text_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_pages_blk_text_background" DEFAULT 'auto',
  	"content" jsonb,
  	"width" "enum_pages_blk_text_width" DEFAULT 'normal',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blk_table_table_cols" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"align" "enum_pages_blk_table_table_cols_align" DEFAULT 'left',
  	"numeric" boolean
  );
  
  CREATE TABLE "pages_blk_table_table_rows_cells" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar,
  	"positive" boolean,
  	"href" varchar
  );
  
  CREATE TABLE "pages_blk_table_table_rows" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"row_href" varchar
  );
  
  CREATE TABLE "pages_blk_table" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_pages_blk_table_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_pages_blk_table_background" DEFAULT 'auto',
  	"table_caption" varchar,
  	"table_role" "enum_pages_blk_table_table_role" DEFAULT 'parameters',
  	"table_mobile_mode" "enum_pages_blk_table_table_mobile_mode" DEFAULT 'cards',
  	"table_footnote" varchar,
  	"table_highlight_column" numeric,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blk_steps_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"text" varchar,
  	"link_label" varchar,
  	"link_type" "enum_pages_blk_steps_items_link_type" DEFAULT 'doc',
  	"link_url" varchar,
  	"link_new_tab" boolean
  );
  
  CREATE TABLE "pages_blk_steps_buttons" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"kind" "enum_pages_blk_steps_buttons_kind" DEFAULT 'quiz',
  	"variant" "enum_pages_blk_steps_buttons_variant" DEFAULT 'primary',
  	"icon" varchar,
  	"form_key" "enum_pages_blk_steps_buttons_form_key",
  	"form_params" jsonb,
  	"link_type" "enum_pages_blk_steps_buttons_link_type" DEFAULT 'doc',
  	"link_url" varchar,
  	"link_new_tab" boolean,
  	"file_id" uuid
  );
  
  CREATE TABLE "pages_blk_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_pages_blk_steps_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_pages_blk_steps_background" DEFAULT 'auto',
  	"variant" "enum_pages_blk_steps_variant" DEFAULT 'horizontal',
  	"footnote" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blk_callout_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"lead" varchar,
  	"text" jsonb
  );
  
  CREATE TABLE "pages_blk_callout" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_pages_blk_callout_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_pages_blk_callout_background" DEFAULT 'auto',
  	"tone" "enum_pages_blk_callout_tone" DEFAULT 'warning',
  	"icon" varchar,
  	"title" varchar,
  	"body" jsonb,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blk_terms_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"icon" varchar
  );
  
  CREATE TABLE "pages_blk_terms" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_pages_blk_terms_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_pages_blk_terms_background" DEFAULT 'auto',
  	"mode" "enum_pages_blk_terms_mode" DEFAULT 'global',
  	"variant" "enum_pages_blk_terms_variant" DEFAULT 'bar',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blk_cards_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"text" varchar,
  	"link_type" "enum_pages_blk_cards_items_link_type" DEFAULT 'doc',
  	"link_url" varchar,
  	"link_label" varchar,
  	"link_new_tab" boolean,
  	"image_id" uuid,
  	"icon" varchar,
  	"price_hint" varchar,
  	"tone" "enum_pages_blk_cards_items_tone" DEFAULT 'default'
  );
  
  CREATE TABLE "pages_blk_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_pages_blk_cards_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_pages_blk_cards_background" DEFAULT 'auto',
  	"layout" "enum_pages_blk_cards_layout" DEFAULT 'g3',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blk_coll_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_pages_blk_coll_cards_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_pages_blk_coll_cards_background" DEFAULT 'auto',
  	"source" "enum_pages_blk_coll_cards_source" DEFAULT 'glassTypes',
  	"mode" "enum_pages_blk_coll_cards_mode" DEFAULT 'all',
  	"group" "enum_pages_blk_coll_cards_group",
  	"columns" "enum_pages_blk_coll_cards_columns" DEFAULT '3',
  	"show_prices" boolean,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blk_prices" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_pages_blk_prices_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar DEFAULT 'ceny',
  	"background" "enum_pages_blk_prices_background" DEFAULT 'auto',
  	"variant" "enum_pages_blk_prices_variant" DEFAULT 'both',
  	"show_included" boolean DEFAULT true,
  	"show_caption" boolean DEFAULT true,
  	"show_promo" boolean,
  	"show_weight" boolean DEFAULT true,
  	"callout_from_conditions" boolean,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blk_faq_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" jsonb
  );
  
  CREATE TABLE "pages_blk_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_pages_blk_faq_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_pages_blk_faq_background" DEFAULT 'auto',
  	"mode" "enum_pages_blk_faq_mode" DEFAULT 'doc',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blk_cta_buttons" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"kind" "enum_pages_blk_cta_buttons_kind" DEFAULT 'quiz',
  	"variant" "enum_pages_blk_cta_buttons_variant" DEFAULT 'primary',
  	"icon" varchar,
  	"form_key" "enum_pages_blk_cta_buttons_form_key",
  	"form_params" jsonb,
  	"link_type" "enum_pages_blk_cta_buttons_link_type" DEFAULT 'doc',
  	"link_url" varchar,
  	"link_new_tab" boolean,
  	"file_id" uuid
  );
  
  CREATE TABLE "pages_blk_cta" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_pages_blk_cta_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_pages_blk_cta_background" DEFAULT 'auto',
  	"variant" "enum_pages_blk_cta_variant" DEFAULT 'buttons',
  	"tone" "enum_pages_blk_cta_tone" DEFAULT 'light',
  	"title" varchar,
  	"body" jsonb,
  	"side_text" varchar,
  	"link_type" "enum_pages_blk_cta_link_type" DEFAULT 'doc',
  	"link_url" varchar,
  	"link_label" varchar,
  	"link_new_tab" boolean,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blk_compare_rows" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"topic" varchar,
  	"left" varchar,
  	"right" varchar
  );
  
  CREATE TABLE "pages_blk_compare" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_pages_blk_compare_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_pages_blk_compare_background" DEFAULT 'auto',
  	"topic_title" varchar DEFAULT 'Этап',
  	"left_title" varchar DEFAULT 'Когда заказываете на заводе сами',
  	"right_title" varchar DEFAULT 'Когда через Inex Glass',
  	"foot_link_type" "enum_pages_blk_compare_foot_link_type" DEFAULT 'doc',
  	"foot_link_url" varchar,
  	"foot_link_label" varchar,
  	"foot_link_new_tab" boolean,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blk_download_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"description" varchar,
  	"file_id" uuid,
  	"file_missing" boolean
  );
  
  CREATE TABLE "pages_blk_download" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_pages_blk_download_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_pages_blk_download_background" DEFAULT 'auto',
  	"variant" "enum_pages_blk_download_variant" DEFAULT 'list',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blk_holes" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_pages_blk_holes_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_pages_blk_holes_background" DEFAULT 'auto',
  	"default_thickness" "enum_pages_blk_holes_default_thickness" DEFAULT '10',
  	"show_scheme" boolean DEFAULT true,
  	"note" varchar,
  	"cta_label" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blk_weight" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_pages_blk_weight_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_pages_blk_weight_background" DEFAULT 'auto',
  	"default_mode" "enum_pages_blk_weight_default_mode" DEFAULT 'single',
  	"show_table" boolean DEFAULT true,
  	"show_formula" boolean DEFAULT true,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blk_form_bullets" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "pages_blk_form" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_pages_blk_form_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_pages_blk_form_background" DEFAULT 'auto',
  	"form_key" "enum_pages_blk_form_form_key",
  	"variant" "enum_pages_blk_form_variant" DEFAULT 'card',
  	"show_contacts" boolean,
  	"submit_label" varchar,
  	"file_label" varchar,
  	"source_label" varchar,
  	"params" jsonb,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blk_snippet" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_pages_blk_snippet_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_pages_blk_snippet_background" DEFAULT 'auto',
  	"snippet_key" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blk_stats_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar,
  	"text" varchar
  );
  
  CREATE TABLE "pages_blk_stats" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_pages_blk_stats_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_pages_blk_stats_background" DEFAULT 'auto',
  	"variant" "enum_pages_blk_stats_variant" DEFAULT 'tiles',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blk_objects" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_pages_blk_objects_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_pages_blk_objects_background" DEFAULT 'auto',
  	"mode" "enum_pages_blk_objects_mode" DEFAULT 'featured',
  	"limit" numeric DEFAULT 4,
  	"product_id" uuid,
  	"show_all_link" boolean DEFAULT true,
  	"all_link_label" varchar DEFAULT 'Все объекты',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blk_articles" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_pages_blk_articles_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_pages_blk_articles_background" DEFAULT 'auto',
  	"mode" "enum_pages_blk_articles_mode" DEFAULT 'featured',
  	"limit" numeric DEFAULT 4,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blk_wdw_left" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "pages_blk_wdw_right" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "pages_blk_wdw" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_pages_blk_wdw_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_pages_blk_wdw_background" DEFAULT 'auto',
  	"left_title" varchar DEFAULT 'Inex Glass',
  	"right_title" varchar DEFAULT 'Ваша бригада',
  	"strip_enabled" boolean,
  	"strip_title" varchar,
  	"strip_text" varchar,
  	"strip_button_label" varchar,
  	"strip_url" varchar DEFAULT 'https://inex.su',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blk_systems_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"subtitle" varchar,
  	"where_fits" varchar,
  	"important" varchar,
  	"how_held" varchar,
  	"requires_in_glass" varchar,
  	"image_id" uuid,
  	"scheme_svg" varchar
  );
  
  CREATE TABLE "pages_blk_systems" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_pages_blk_systems_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_pages_blk_systems_background" DEFAULT 'auto',
  	"source" "enum_pages_blk_systems_source" DEFAULT 'doc',
  	"layout" "enum_pages_blk_systems_layout" DEFAULT 'cards',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blk_gallery_images" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" uuid,
  	"alt" varchar,
  	"caption" varchar
  );
  
  CREATE TABLE "pages_blk_gallery" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_pages_blk_gallery_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_pages_blk_gallery_background" DEFAULT 'auto',
  	"layout" "enum_pages_blk_gallery_layout" DEFAULT 'grid',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blk_two_cols" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_pages_blk_two_cols_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_pages_blk_two_cols_background" DEFAULT 'auto',
  	"left_heading" varchar,
  	"left_body" jsonb,
  	"right_heading" varchar,
  	"right_body" jsonb,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blk_links_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_type" "enum_pages_blk_links_items_link_type" DEFAULT 'doc',
  	"link_url" varchar,
  	"link_label" varchar,
  	"link_new_tab" boolean,
  	"description" varchar
  );
  
  CREATE TABLE "pages_blk_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_pages_blk_links_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_pages_blk_links_background" DEFAULT 'auto',
  	"variant" "enum_pages_blk_links_variant" DEFAULT 'chips',
  	"label" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blk_contacts" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_pages_blk_contacts_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_pages_blk_contacts_background" DEFAULT 'auto',
  	"show_map" boolean DEFAULT true,
  	"show_locations" boolean DEFAULT true,
  	"show_hours" boolean DEFAULT true,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blk_requisites" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_pages_blk_requisites_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar DEFAULT 'rekvizity',
  	"background" "enum_pages_blk_requisites_background" DEFAULT 'auto',
  	"show_download" boolean DEFAULT true,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blk_team" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_pages_blk_team_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_pages_blk_team_background" DEFAULT 'auto',
  	"limit" numeric,
  	"empty_behavior" "enum_pages_blk_team_empty_behavior" DEFAULT 'hide',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blk_quiz_cta" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_pages_blk_quiz_cta_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_pages_blk_quiz_cta_background" DEFAULT 'auto',
  	"text" varchar,
  	"button_label" varchar,
  	"prefill_type" "enum_pages_blk_quiz_cta_prefill_type",
  	"prefill_thickness" "enum_pages_blk_quiz_cta_prefill_thickness",
  	"prefill_kind" "enum_pages_blk_quiz_cta_prefill_kind",
  	"prefill_cta_label" varchar DEFAULT 'Рассчитать стоимость',
  	"prefill_secondary_form" "enum_pages_blk_quiz_cta_prefill_secondary_form" DEFAULT 'drawing',
  	"prefill_secondary_label" varchar DEFAULT 'Отправить чертёж',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" jsonb
  );
  
  CREATE TABLE "pages_legacy_urls" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"url" varchar
  );
  
  CREATE TABLE "pages" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"title" varchar,
  	"template" "enum_pages_template" DEFAULT 'generic',
  	"is_home" boolean,
  	"parent_id" uuid,
  	"path_prefix" varchar DEFAULT '/',
  	"slug" varchar,
  	"path" varchar,
  	"breadcrumb_label" varchar,
  	"published_at" timestamp(3) with time zone,
  	"seo_h1" varchar,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"seo_noindex" boolean DEFAULT false,
  	"seo_canonical" varchar,
  	"seo_og_image_id" uuid,
  	"quiz_prefill_type" "enum_pages_quiz_prefill_type",
  	"quiz_prefill_thickness" "enum_pages_quiz_prefill_thickness",
  	"quiz_prefill_kind" "enum_pages_quiz_prefill_kind",
  	"quiz_prefill_cta_label" varchar DEFAULT 'Рассчитать стоимость',
  	"quiz_prefill_secondary_form" "enum_pages_quiz_prefill_secondary_form" DEFAULT 'drawing',
  	"quiz_prefill_secondary_label" varchar DEFAULT 'Отправить чертёж',
  	"hide_conditions" boolean,
  	"hide_quiz_cta" boolean,
  	"document_version" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_pages_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "pages_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"pages_id" uuid,
  	"glass_types_id" uuid,
  	"thicknesses_id" uuid,
  	"processing_services_id" uuid,
  	"constructions_id" uuid,
  	"articles_id" uuid,
  	"objects_id" uuid
  );
  
  CREATE TABLE "_pages_blk_hero_v_eyebrow" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_blk_hero_v_buttons" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"label" varchar,
  	"kind" "enum__pages_blk_hero_v_buttons_kind" DEFAULT 'quiz',
  	"variant" "enum__pages_blk_hero_v_buttons_variant" DEFAULT 'primary',
  	"icon" varchar,
  	"form_key" "enum__pages_blk_hero_v_buttons_form_key",
  	"form_params" jsonb,
  	"link_type" "enum__pages_blk_hero_v_buttons_link_type" DEFAULT 'doc',
  	"link_url" varchar,
  	"link_new_tab" boolean,
  	"file_id" uuid,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_blk_hero_v_photos" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"image_id" uuid,
  	"caption" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_blk_hero_v_stats" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"value" varchar,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_blk_hero_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"variant" "enum__pages_blk_hero_v_variant" DEFAULT 'ctHero',
  	"title_override" varchar,
  	"lead" jsonb,
  	"facts" varchar,
  	"strong" varchar,
  	"show_terms" boolean DEFAULT true,
  	"terms_mode" "enum__pages_blk_hero_v_terms_mode" DEFAULT 'full',
  	"image_id" uuid,
  	"image_alt" varchar,
  	"big_number" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_blk_text_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum__pages_blk_text_v_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum__pages_blk_text_v_background" DEFAULT 'auto',
  	"content" jsonb,
  	"width" "enum__pages_blk_text_v_width" DEFAULT 'normal',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_blk_table_table_cols_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"label" varchar,
  	"align" "enum__pages_blk_table_table_cols_v_align" DEFAULT 'left',
  	"numeric" boolean,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_blk_table_table_rows_cells_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"value" varchar,
  	"positive" boolean,
  	"href" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_blk_table_table_rows_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"row_href" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_blk_table_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum__pages_blk_table_v_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum__pages_blk_table_v_background" DEFAULT 'auto',
  	"table_caption" varchar,
  	"table_role" "enum__pages_blk_table_v_table_role" DEFAULT 'parameters',
  	"table_mobile_mode" "enum__pages_blk_table_v_table_mobile_mode" DEFAULT 'cards',
  	"table_footnote" varchar,
  	"table_highlight_column" numeric,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_blk_steps_v_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"title" varchar,
  	"text" varchar,
  	"link_label" varchar,
  	"link_type" "enum__pages_blk_steps_v_items_link_type" DEFAULT 'doc',
  	"link_url" varchar,
  	"link_new_tab" boolean,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_blk_steps_v_buttons" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"label" varchar,
  	"kind" "enum__pages_blk_steps_v_buttons_kind" DEFAULT 'quiz',
  	"variant" "enum__pages_blk_steps_v_buttons_variant" DEFAULT 'primary',
  	"icon" varchar,
  	"form_key" "enum__pages_blk_steps_v_buttons_form_key",
  	"form_params" jsonb,
  	"link_type" "enum__pages_blk_steps_v_buttons_link_type" DEFAULT 'doc',
  	"link_url" varchar,
  	"link_new_tab" boolean,
  	"file_id" uuid,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_blk_steps_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum__pages_blk_steps_v_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum__pages_blk_steps_v_background" DEFAULT 'auto',
  	"variant" "enum__pages_blk_steps_v_variant" DEFAULT 'horizontal',
  	"footnote" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_blk_callout_v_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"lead" varchar,
  	"text" jsonb,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_blk_callout_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum__pages_blk_callout_v_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum__pages_blk_callout_v_background" DEFAULT 'auto',
  	"tone" "enum__pages_blk_callout_v_tone" DEFAULT 'warning',
  	"icon" varchar,
  	"title" varchar,
  	"body" jsonb,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_blk_terms_v_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"text" varchar,
  	"icon" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_blk_terms_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum__pages_blk_terms_v_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum__pages_blk_terms_v_background" DEFAULT 'auto',
  	"mode" "enum__pages_blk_terms_v_mode" DEFAULT 'global',
  	"variant" "enum__pages_blk_terms_v_variant" DEFAULT 'bar',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_blk_cards_v_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"title" varchar,
  	"text" varchar,
  	"link_type" "enum__pages_blk_cards_v_items_link_type" DEFAULT 'doc',
  	"link_url" varchar,
  	"link_label" varchar,
  	"link_new_tab" boolean,
  	"image_id" uuid,
  	"icon" varchar,
  	"price_hint" varchar,
  	"tone" "enum__pages_blk_cards_v_items_tone" DEFAULT 'default',
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_blk_cards_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum__pages_blk_cards_v_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum__pages_blk_cards_v_background" DEFAULT 'auto',
  	"layout" "enum__pages_blk_cards_v_layout" DEFAULT 'g3',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_blk_coll_cards_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum__pages_blk_coll_cards_v_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum__pages_blk_coll_cards_v_background" DEFAULT 'auto',
  	"source" "enum__pages_blk_coll_cards_v_source" DEFAULT 'glassTypes',
  	"mode" "enum__pages_blk_coll_cards_v_mode" DEFAULT 'all',
  	"group" "enum__pages_blk_coll_cards_v_group",
  	"columns" "enum__pages_blk_coll_cards_v_columns" DEFAULT '3',
  	"show_prices" boolean,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_blk_prices_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum__pages_blk_prices_v_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar DEFAULT 'ceny',
  	"background" "enum__pages_blk_prices_v_background" DEFAULT 'auto',
  	"variant" "enum__pages_blk_prices_v_variant" DEFAULT 'both',
  	"show_included" boolean DEFAULT true,
  	"show_caption" boolean DEFAULT true,
  	"show_promo" boolean,
  	"show_weight" boolean DEFAULT true,
  	"callout_from_conditions" boolean,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_blk_faq_v_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"question" varchar,
  	"answer" jsonb,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_blk_faq_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum__pages_blk_faq_v_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum__pages_blk_faq_v_background" DEFAULT 'auto',
  	"mode" "enum__pages_blk_faq_v_mode" DEFAULT 'doc',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_blk_cta_v_buttons" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"label" varchar,
  	"kind" "enum__pages_blk_cta_v_buttons_kind" DEFAULT 'quiz',
  	"variant" "enum__pages_blk_cta_v_buttons_variant" DEFAULT 'primary',
  	"icon" varchar,
  	"form_key" "enum__pages_blk_cta_v_buttons_form_key",
  	"form_params" jsonb,
  	"link_type" "enum__pages_blk_cta_v_buttons_link_type" DEFAULT 'doc',
  	"link_url" varchar,
  	"link_new_tab" boolean,
  	"file_id" uuid,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_blk_cta_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum__pages_blk_cta_v_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum__pages_blk_cta_v_background" DEFAULT 'auto',
  	"variant" "enum__pages_blk_cta_v_variant" DEFAULT 'buttons',
  	"tone" "enum__pages_blk_cta_v_tone" DEFAULT 'light',
  	"title" varchar,
  	"body" jsonb,
  	"side_text" varchar,
  	"link_type" "enum__pages_blk_cta_v_link_type" DEFAULT 'doc',
  	"link_url" varchar,
  	"link_label" varchar,
  	"link_new_tab" boolean,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_blk_compare_v_rows" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"topic" varchar,
  	"left" varchar,
  	"right" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_blk_compare_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum__pages_blk_compare_v_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum__pages_blk_compare_v_background" DEFAULT 'auto',
  	"topic_title" varchar DEFAULT 'Этап',
  	"left_title" varchar DEFAULT 'Когда заказываете на заводе сами',
  	"right_title" varchar DEFAULT 'Когда через Inex Glass',
  	"foot_link_type" "enum__pages_blk_compare_v_foot_link_type" DEFAULT 'doc',
  	"foot_link_url" varchar,
  	"foot_link_label" varchar,
  	"foot_link_new_tab" boolean,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_blk_download_v_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"title" varchar,
  	"description" varchar,
  	"file_id" uuid,
  	"file_missing" boolean,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_blk_download_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum__pages_blk_download_v_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum__pages_blk_download_v_background" DEFAULT 'auto',
  	"variant" "enum__pages_blk_download_v_variant" DEFAULT 'list',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_blk_holes_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum__pages_blk_holes_v_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum__pages_blk_holes_v_background" DEFAULT 'auto',
  	"default_thickness" "enum__pages_blk_holes_v_default_thickness" DEFAULT '10',
  	"show_scheme" boolean DEFAULT true,
  	"note" varchar,
  	"cta_label" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_blk_weight_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum__pages_blk_weight_v_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum__pages_blk_weight_v_background" DEFAULT 'auto',
  	"default_mode" "enum__pages_blk_weight_v_default_mode" DEFAULT 'single',
  	"show_table" boolean DEFAULT true,
  	"show_formula" boolean DEFAULT true,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_blk_form_v_bullets" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_blk_form_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum__pages_blk_form_v_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum__pages_blk_form_v_background" DEFAULT 'auto',
  	"form_key" "enum__pages_blk_form_v_form_key",
  	"variant" "enum__pages_blk_form_v_variant" DEFAULT 'card',
  	"show_contacts" boolean,
  	"submit_label" varchar,
  	"file_label" varchar,
  	"source_label" varchar,
  	"params" jsonb,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_blk_snippet_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum__pages_blk_snippet_v_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum__pages_blk_snippet_v_background" DEFAULT 'auto',
  	"snippet_key" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_blk_stats_v_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"value" varchar,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_blk_stats_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum__pages_blk_stats_v_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum__pages_blk_stats_v_background" DEFAULT 'auto',
  	"variant" "enum__pages_blk_stats_v_variant" DEFAULT 'tiles',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_blk_objects_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum__pages_blk_objects_v_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum__pages_blk_objects_v_background" DEFAULT 'auto',
  	"mode" "enum__pages_blk_objects_v_mode" DEFAULT 'featured',
  	"limit" numeric DEFAULT 4,
  	"product_id" uuid,
  	"show_all_link" boolean DEFAULT true,
  	"all_link_label" varchar DEFAULT 'Все объекты',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_blk_articles_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum__pages_blk_articles_v_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum__pages_blk_articles_v_background" DEFAULT 'auto',
  	"mode" "enum__pages_blk_articles_v_mode" DEFAULT 'featured',
  	"limit" numeric DEFAULT 4,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_blk_wdw_left_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_blk_wdw_right_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_blk_wdw_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum__pages_blk_wdw_v_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum__pages_blk_wdw_v_background" DEFAULT 'auto',
  	"left_title" varchar DEFAULT 'Inex Glass',
  	"right_title" varchar DEFAULT 'Ваша бригада',
  	"strip_enabled" boolean,
  	"strip_title" varchar,
  	"strip_text" varchar,
  	"strip_button_label" varchar,
  	"strip_url" varchar DEFAULT 'https://inex.su',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_blk_systems_v_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"name" varchar,
  	"subtitle" varchar,
  	"where_fits" varchar,
  	"important" varchar,
  	"how_held" varchar,
  	"requires_in_glass" varchar,
  	"image_id" uuid,
  	"scheme_svg" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_blk_systems_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum__pages_blk_systems_v_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum__pages_blk_systems_v_background" DEFAULT 'auto',
  	"source" "enum__pages_blk_systems_v_source" DEFAULT 'doc',
  	"layout" "enum__pages_blk_systems_v_layout" DEFAULT 'cards',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_blk_gallery_v_images" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"image_id" uuid,
  	"alt" varchar,
  	"caption" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_blk_gallery_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum__pages_blk_gallery_v_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum__pages_blk_gallery_v_background" DEFAULT 'auto',
  	"layout" "enum__pages_blk_gallery_v_layout" DEFAULT 'grid',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_blk_two_cols_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum__pages_blk_two_cols_v_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum__pages_blk_two_cols_v_background" DEFAULT 'auto',
  	"left_heading" varchar,
  	"left_body" jsonb,
  	"right_heading" varchar,
  	"right_body" jsonb,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_blk_links_v_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"link_type" "enum__pages_blk_links_v_items_link_type" DEFAULT 'doc',
  	"link_url" varchar,
  	"link_label" varchar,
  	"link_new_tab" boolean,
  	"description" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_blk_links_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum__pages_blk_links_v_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum__pages_blk_links_v_background" DEFAULT 'auto',
  	"variant" "enum__pages_blk_links_v_variant" DEFAULT 'chips',
  	"label" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_blk_contacts_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum__pages_blk_contacts_v_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum__pages_blk_contacts_v_background" DEFAULT 'auto',
  	"show_map" boolean DEFAULT true,
  	"show_locations" boolean DEFAULT true,
  	"show_hours" boolean DEFAULT true,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_blk_requisites_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum__pages_blk_requisites_v_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar DEFAULT 'rekvizity',
  	"background" "enum__pages_blk_requisites_v_background" DEFAULT 'auto',
  	"show_download" boolean DEFAULT true,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_blk_team_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum__pages_blk_team_v_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum__pages_blk_team_v_background" DEFAULT 'auto',
  	"limit" numeric,
  	"empty_behavior" "enum__pages_blk_team_v_empty_behavior" DEFAULT 'hide',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_blk_quiz_cta_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum__pages_blk_quiz_cta_v_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum__pages_blk_quiz_cta_v_background" DEFAULT 'auto',
  	"text" varchar,
  	"button_label" varchar,
  	"prefill_type" "enum__pages_blk_quiz_cta_v_prefill_type",
  	"prefill_thickness" "enum__pages_blk_quiz_cta_v_prefill_thickness",
  	"prefill_kind" "enum__pages_blk_quiz_cta_v_prefill_kind",
  	"prefill_cta_label" varchar DEFAULT 'Рассчитать стоимость',
  	"prefill_secondary_form" "enum__pages_blk_quiz_cta_v_prefill_secondary_form" DEFAULT 'drawing',
  	"prefill_secondary_label" varchar DEFAULT 'Отправить чертёж',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_version_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"question" varchar,
  	"answer" jsonb,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_version_legacy_urls" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"url" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"parent_id" uuid,
  	"version_title" varchar,
  	"version_template" "enum__pages_v_version_template" DEFAULT 'generic',
  	"version_is_home" boolean,
  	"version_parent_id" uuid,
  	"version_path_prefix" varchar DEFAULT '/',
  	"version_slug" varchar,
  	"version_path" varchar,
  	"version_breadcrumb_label" varchar,
  	"version_published_at" timestamp(3) with time zone,
  	"version_seo_h1" varchar,
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"version_seo_noindex" boolean DEFAULT false,
  	"version_seo_canonical" varchar,
  	"version_seo_og_image_id" uuid,
  	"version_quiz_prefill_type" "enum__pages_v_version_quiz_prefill_type",
  	"version_quiz_prefill_thickness" "enum__pages_v_version_quiz_prefill_thickness",
  	"version_quiz_prefill_kind" "enum__pages_v_version_quiz_prefill_kind",
  	"version_quiz_prefill_cta_label" varchar DEFAULT 'Рассчитать стоимость',
  	"version_quiz_prefill_secondary_form" "enum__pages_v_version_quiz_prefill_secondary_form" DEFAULT 'drawing',
  	"version_quiz_prefill_secondary_label" varchar DEFAULT 'Отправить чертёж',
  	"version_hide_conditions" boolean,
  	"version_hide_quiz_cta" boolean,
  	"version_document_version" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__pages_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "_pages_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"pages_id" uuid,
  	"glass_types_id" uuid,
  	"thicknesses_id" uuid,
  	"processing_services_id" uuid,
  	"constructions_id" uuid,
  	"articles_id" uuid,
  	"objects_id" uuid
  );
  
  CREATE TABLE "articles_tools" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"link_type" "enum_articles_tools_link_type" DEFAULT 'doc',
  	"link_url" varchar,
  	"link_new_tab" boolean
  );
  
  CREATE TABLE "articles" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"title" varchar,
  	"slug" varchar,
  	"path" varchar,
  	"date_published" timestamp(3) with time zone,
  	"date_modified" timestamp(3) with time zone,
  	"reading_time_minutes" numeric,
  	"featured_on_home" boolean,
  	"home_order" numeric,
  	"lead" jsonb,
  	"body" jsonb,
  	"hero_image_id" uuid,
  	"author_id" uuid,
  	"author_name" varchar DEFAULT 'Inex Glass',
  	"card_title" varchar,
  	"card_text" varchar,
  	"card_image_id" uuid,
  	"card_icon" varchar,
  	"card_price_hint" varchar,
  	"commercial_link_label" varchar,
  	"commercial_link_link_type" "enum_articles_commercial_link_link_type" DEFAULT 'doc',
  	"commercial_link_link_url" varchar,
  	"commercial_link_link_new_tab" boolean,
  	"cta_card_title" varchar,
  	"cta_card_text" varchar,
  	"cta_card_button_label" varchar,
  	"cta_card_form_key" "enum_articles_cta_card_form_key",
  	"seo_h1" varchar,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"seo_noindex" boolean DEFAULT false,
  	"seo_canonical" varchar,
  	"seo_og_image_id" uuid,
  	"quiz_prefill_type" "enum_articles_quiz_prefill_type",
  	"quiz_prefill_thickness" "enum_articles_quiz_prefill_thickness",
  	"quiz_prefill_kind" "enum_articles_quiz_prefill_kind",
  	"quiz_prefill_cta_label" varchar DEFAULT 'Рассчитать стоимость',
  	"quiz_prefill_secondary_form" "enum_articles_quiz_prefill_secondary_form" DEFAULT 'drawing',
  	"quiz_prefill_secondary_label" varchar DEFAULT 'Отправить чертёж',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_articles_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "articles_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"pages_id" uuid,
  	"glass_types_id" uuid,
  	"thicknesses_id" uuid,
  	"processing_services_id" uuid,
  	"constructions_id" uuid,
  	"articles_id" uuid,
  	"objects_id" uuid
  );
  
  CREATE TABLE "_articles_v_version_tools" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"label" varchar,
  	"link_type" "enum__articles_v_version_tools_link_type" DEFAULT 'doc',
  	"link_url" varchar,
  	"link_new_tab" boolean,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_articles_v" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"parent_id" uuid,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_path" varchar,
  	"version_date_published" timestamp(3) with time zone,
  	"version_date_modified" timestamp(3) with time zone,
  	"version_reading_time_minutes" numeric,
  	"version_featured_on_home" boolean,
  	"version_home_order" numeric,
  	"version_lead" jsonb,
  	"version_body" jsonb,
  	"version_hero_image_id" uuid,
  	"version_author_id" uuid,
  	"version_author_name" varchar DEFAULT 'Inex Glass',
  	"version_card_title" varchar,
  	"version_card_text" varchar,
  	"version_card_image_id" uuid,
  	"version_card_icon" varchar,
  	"version_card_price_hint" varchar,
  	"version_commercial_link_label" varchar,
  	"version_commercial_link_link_type" "enum__articles_v_version_commercial_link_link_type" DEFAULT 'doc',
  	"version_commercial_link_link_url" varchar,
  	"version_commercial_link_link_new_tab" boolean,
  	"version_cta_card_title" varchar,
  	"version_cta_card_text" varchar,
  	"version_cta_card_button_label" varchar,
  	"version_cta_card_form_key" "enum__articles_v_version_cta_card_form_key",
  	"version_seo_h1" varchar,
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"version_seo_noindex" boolean DEFAULT false,
  	"version_seo_canonical" varchar,
  	"version_seo_og_image_id" uuid,
  	"version_quiz_prefill_type" "enum__articles_v_version_quiz_prefill_type",
  	"version_quiz_prefill_thickness" "enum__articles_v_version_quiz_prefill_thickness",
  	"version_quiz_prefill_kind" "enum__articles_v_version_quiz_prefill_kind",
  	"version_quiz_prefill_cta_label" varchar DEFAULT 'Рассчитать стоимость',
  	"version_quiz_prefill_secondary_form" "enum__articles_v_version_quiz_prefill_secondary_form" DEFAULT 'drawing',
  	"version_quiz_prefill_secondary_label" varchar DEFAULT 'Отправить чертёж',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__articles_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "_articles_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"pages_id" uuid,
  	"glass_types_id" uuid,
  	"thicknesses_id" uuid,
  	"processing_services_id" uuid,
  	"constructions_id" uuid,
  	"articles_id" uuid,
  	"objects_id" uuid
  );
  
  CREATE TABLE "objects_spec" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"product" varchar,
  	"thickness" varchar,
  	"kind" varchar,
  	"triplex_formula" varchar,
  	"processing" varchar
  );
  
  CREATE TABLE "objects_chips" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "objects_photos" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" uuid,
  	"alt" varchar,
  	"caption" varchar
  );
  
  CREATE TABLE "objects_legacy_urls" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"url" varchar
  );
  
  CREATE TABLE "objects" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"name" varchar,
  	"slug" varchar,
  	"path" varchar,
  	"featured" boolean,
  	"sort_date" timestamp(3) with time zone,
  	"city_id" uuid,
  	"object_type_id" uuid,
  	"year" numeric,
  	"task" varchar,
  	"legacy_id" varchar,
  	"source_url" varchar,
  	"import_notes" varchar,
  	"seo_h1" varchar,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"seo_noindex" boolean DEFAULT false,
  	"seo_canonical" varchar,
  	"seo_og_image_id" uuid,
  	"quiz_prefill_type" "enum_objects_quiz_prefill_type",
  	"quiz_prefill_thickness" "enum_objects_quiz_prefill_thickness",
  	"quiz_prefill_kind" "enum_objects_quiz_prefill_kind",
  	"quiz_prefill_cta_label" varchar DEFAULT 'Рассчитать стоимость',
  	"quiz_prefill_secondary_form" "enum_objects_quiz_prefill_secondary_form" DEFAULT 'drawing',
  	"quiz_prefill_secondary_label" varchar DEFAULT 'Отправить чертёж',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_objects_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "objects_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"products_id" uuid,
  	"objects_id" uuid
  );
  
  CREATE TABLE "_objects_v_version_spec" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"product" varchar,
  	"thickness" varchar,
  	"kind" varchar,
  	"triplex_formula" varchar,
  	"processing" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_objects_v_version_chips" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_objects_v_version_photos" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"image_id" uuid,
  	"alt" varchar,
  	"caption" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_objects_v_version_legacy_urls" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"url" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_objects_v" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"parent_id" uuid,
  	"version_name" varchar,
  	"version_slug" varchar,
  	"version_path" varchar,
  	"version_featured" boolean,
  	"version_sort_date" timestamp(3) with time zone,
  	"version_city_id" uuid,
  	"version_object_type_id" uuid,
  	"version_year" numeric,
  	"version_task" varchar,
  	"version_legacy_id" varchar,
  	"version_source_url" varchar,
  	"version_import_notes" varchar,
  	"version_seo_h1" varchar,
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"version_seo_noindex" boolean DEFAULT false,
  	"version_seo_canonical" varchar,
  	"version_seo_og_image_id" uuid,
  	"version_quiz_prefill_type" "enum__objects_v_version_quiz_prefill_type",
  	"version_quiz_prefill_thickness" "enum__objects_v_version_quiz_prefill_thickness",
  	"version_quiz_prefill_kind" "enum__objects_v_version_quiz_prefill_kind",
  	"version_quiz_prefill_cta_label" varchar DEFAULT 'Рассчитать стоимость',
  	"version_quiz_prefill_secondary_form" "enum__objects_v_version_quiz_prefill_secondary_form" DEFAULT 'drawing',
  	"version_quiz_prefill_secondary_label" varchar DEFAULT 'Отправить чертёж',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__objects_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "_objects_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"products_id" uuid,
  	"objects_id" uuid
  );
  
  CREATE TABLE "team" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"name" varchar NOT NULL,
  	"role" varchar,
  	"area" varchar,
  	"photo_id" uuid,
  	"email" varchar,
  	"phone" varchar,
  	"order" numeric,
  	"hidden" boolean,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "thicknesses_faq_override" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question" varchar NOT NULL,
  	"answer" jsonb NOT NULL
  );
  
  CREATE TABLE "thicknesses_blk_hero_eyebrow" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "thicknesses_blk_hero_buttons" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"kind" "enum_thicknesses_blk_hero_buttons_kind" DEFAULT 'quiz',
  	"variant" "enum_thicknesses_blk_hero_buttons_variant" DEFAULT 'primary',
  	"icon" varchar,
  	"form_key" "enum_thicknesses_blk_hero_buttons_form_key",
  	"form_params" jsonb,
  	"link_type" "enum_thicknesses_blk_hero_buttons_link_type" DEFAULT 'doc',
  	"link_url" varchar,
  	"link_new_tab" boolean,
  	"file_id" uuid
  );
  
  CREATE TABLE "thicknesses_blk_hero_photos" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" uuid NOT NULL,
  	"caption" varchar
  );
  
  CREATE TABLE "thicknesses_blk_hero_stats" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "thicknesses_blk_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_thicknesses_blk_hero_variant" DEFAULT 'ctHero' NOT NULL,
  	"title_override" varchar,
  	"lead" jsonb,
  	"facts" varchar,
  	"strong" varchar,
  	"show_terms" boolean DEFAULT true,
  	"terms_mode" "enum_thicknesses_blk_hero_terms_mode" DEFAULT 'full',
  	"image_id" uuid,
  	"image_alt" varchar,
  	"big_number" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "thicknesses_blk_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_thicknesses_blk_text_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_thicknesses_blk_text_background" DEFAULT 'auto',
  	"content" jsonb NOT NULL,
  	"width" "enum_thicknesses_blk_text_width" DEFAULT 'normal',
  	"block_name" varchar
  );
  
  CREATE TABLE "thicknesses_blk_table_table_cols" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"align" "enum_thicknesses_blk_table_table_cols_align" DEFAULT 'left',
  	"numeric" boolean
  );
  
  CREATE TABLE "thicknesses_blk_table_table_rows_cells" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar,
  	"positive" boolean,
  	"href" varchar
  );
  
  CREATE TABLE "thicknesses_blk_table_table_rows" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"row_href" varchar
  );
  
  CREATE TABLE "thicknesses_blk_table" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_thicknesses_blk_table_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_thicknesses_blk_table_background" DEFAULT 'auto',
  	"table_caption" varchar,
  	"table_role" "enum_thicknesses_blk_table_table_role" DEFAULT 'parameters',
  	"table_mobile_mode" "enum_thicknesses_blk_table_table_mobile_mode" DEFAULT 'cards',
  	"table_footnote" varchar,
  	"table_highlight_column" numeric,
  	"block_name" varchar
  );
  
  CREATE TABLE "thicknesses_blk_steps_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"text" varchar,
  	"link_label" varchar,
  	"link_type" "enum_thicknesses_blk_steps_items_link_type" DEFAULT 'doc',
  	"link_url" varchar,
  	"link_new_tab" boolean
  );
  
  CREATE TABLE "thicknesses_blk_steps_buttons" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"kind" "enum_thicknesses_blk_steps_buttons_kind" DEFAULT 'quiz',
  	"variant" "enum_thicknesses_blk_steps_buttons_variant" DEFAULT 'primary',
  	"icon" varchar,
  	"form_key" "enum_thicknesses_blk_steps_buttons_form_key",
  	"form_params" jsonb,
  	"link_type" "enum_thicknesses_blk_steps_buttons_link_type" DEFAULT 'doc',
  	"link_url" varchar,
  	"link_new_tab" boolean,
  	"file_id" uuid
  );
  
  CREATE TABLE "thicknesses_blk_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_thicknesses_blk_steps_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_thicknesses_blk_steps_background" DEFAULT 'auto',
  	"variant" "enum_thicknesses_blk_steps_variant" DEFAULT 'horizontal',
  	"footnote" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "thicknesses_blk_callout_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"lead" varchar,
  	"text" jsonb
  );
  
  CREATE TABLE "thicknesses_blk_callout" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_thicknesses_blk_callout_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_thicknesses_blk_callout_background" DEFAULT 'auto',
  	"tone" "enum_thicknesses_blk_callout_tone" DEFAULT 'warning',
  	"icon" varchar,
  	"title" varchar,
  	"body" jsonb,
  	"block_name" varchar
  );
  
  CREATE TABLE "thicknesses_blk_terms_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"icon" varchar
  );
  
  CREATE TABLE "thicknesses_blk_terms" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_thicknesses_blk_terms_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_thicknesses_blk_terms_background" DEFAULT 'auto',
  	"mode" "enum_thicknesses_blk_terms_mode" DEFAULT 'global',
  	"variant" "enum_thicknesses_blk_terms_variant" DEFAULT 'bar',
  	"block_name" varchar
  );
  
  CREATE TABLE "thicknesses_blk_cards_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"text" varchar,
  	"link_type" "enum_thicknesses_blk_cards_items_link_type" DEFAULT 'doc',
  	"link_url" varchar,
  	"link_label" varchar,
  	"link_new_tab" boolean,
  	"image_id" uuid,
  	"icon" varchar,
  	"price_hint" varchar,
  	"tone" "enum_thicknesses_blk_cards_items_tone" DEFAULT 'default'
  );
  
  CREATE TABLE "thicknesses_blk_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_thicknesses_blk_cards_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_thicknesses_blk_cards_background" DEFAULT 'auto',
  	"layout" "enum_thicknesses_blk_cards_layout" DEFAULT 'g3',
  	"block_name" varchar
  );
  
  CREATE TABLE "thicknesses_blk_coll_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_thicknesses_blk_coll_cards_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_thicknesses_blk_coll_cards_background" DEFAULT 'auto',
  	"source" "enum_thicknesses_blk_coll_cards_source" DEFAULT 'glassTypes' NOT NULL,
  	"mode" "enum_thicknesses_blk_coll_cards_mode" DEFAULT 'all',
  	"group" "enum_thicknesses_blk_coll_cards_group",
  	"columns" "enum_thicknesses_blk_coll_cards_columns" DEFAULT '3',
  	"show_prices" boolean,
  	"block_name" varchar
  );
  
  CREATE TABLE "thicknesses_blk_prices" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_thicknesses_blk_prices_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar DEFAULT 'ceny',
  	"background" "enum_thicknesses_blk_prices_background" DEFAULT 'auto',
  	"variant" "enum_thicknesses_blk_prices_variant" DEFAULT 'both',
  	"show_included" boolean DEFAULT true,
  	"show_caption" boolean DEFAULT true,
  	"show_promo" boolean,
  	"show_weight" boolean DEFAULT true,
  	"callout_from_conditions" boolean,
  	"block_name" varchar
  );
  
  CREATE TABLE "thicknesses_blk_faq_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" jsonb
  );
  
  CREATE TABLE "thicknesses_blk_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_thicknesses_blk_faq_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_thicknesses_blk_faq_background" DEFAULT 'auto',
  	"mode" "enum_thicknesses_blk_faq_mode" DEFAULT 'doc',
  	"block_name" varchar
  );
  
  CREATE TABLE "thicknesses_blk_cta_buttons" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"kind" "enum_thicknesses_blk_cta_buttons_kind" DEFAULT 'quiz',
  	"variant" "enum_thicknesses_blk_cta_buttons_variant" DEFAULT 'primary',
  	"icon" varchar,
  	"form_key" "enum_thicknesses_blk_cta_buttons_form_key",
  	"form_params" jsonb,
  	"link_type" "enum_thicknesses_blk_cta_buttons_link_type" DEFAULT 'doc',
  	"link_url" varchar,
  	"link_new_tab" boolean,
  	"file_id" uuid
  );
  
  CREATE TABLE "thicknesses_blk_cta" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_thicknesses_blk_cta_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_thicknesses_blk_cta_background" DEFAULT 'auto',
  	"variant" "enum_thicknesses_blk_cta_variant" DEFAULT 'buttons',
  	"tone" "enum_thicknesses_blk_cta_tone" DEFAULT 'light',
  	"title" varchar,
  	"body" jsonb,
  	"side_text" varchar,
  	"link_type" "enum_thicknesses_blk_cta_link_type" DEFAULT 'doc',
  	"link_url" varchar,
  	"link_label" varchar,
  	"link_new_tab" boolean,
  	"block_name" varchar
  );
  
  CREATE TABLE "thicknesses_blk_compare_rows" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"topic" varchar NOT NULL,
  	"left" varchar,
  	"right" varchar
  );
  
  CREATE TABLE "thicknesses_blk_compare" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_thicknesses_blk_compare_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_thicknesses_blk_compare_background" DEFAULT 'auto',
  	"topic_title" varchar DEFAULT 'Этап',
  	"left_title" varchar DEFAULT 'Когда заказываете на заводе сами',
  	"right_title" varchar DEFAULT 'Когда через Inex Glass',
  	"foot_link_type" "enum_thicknesses_blk_compare_foot_link_type" DEFAULT 'doc',
  	"foot_link_url" varchar,
  	"foot_link_label" varchar,
  	"foot_link_new_tab" boolean,
  	"block_name" varchar
  );
  
  CREATE TABLE "thicknesses_blk_download_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"description" varchar,
  	"file_id" uuid,
  	"file_missing" boolean
  );
  
  CREATE TABLE "thicknesses_blk_download" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_thicknesses_blk_download_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_thicknesses_blk_download_background" DEFAULT 'auto',
  	"variant" "enum_thicknesses_blk_download_variant" DEFAULT 'list',
  	"block_name" varchar
  );
  
  CREATE TABLE "thicknesses_blk_holes" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_thicknesses_blk_holes_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_thicknesses_blk_holes_background" DEFAULT 'auto',
  	"default_thickness" "enum_thicknesses_blk_holes_default_thickness" DEFAULT '10',
  	"show_scheme" boolean DEFAULT true,
  	"note" varchar,
  	"cta_label" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "thicknesses_blk_weight" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_thicknesses_blk_weight_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_thicknesses_blk_weight_background" DEFAULT 'auto',
  	"default_mode" "enum_thicknesses_blk_weight_default_mode" DEFAULT 'single',
  	"show_table" boolean DEFAULT true,
  	"show_formula" boolean DEFAULT true,
  	"block_name" varchar
  );
  
  CREATE TABLE "thicknesses_blk_form_bullets" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "thicknesses_blk_form" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_thicknesses_blk_form_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_thicknesses_blk_form_background" DEFAULT 'auto',
  	"form_key" "enum_thicknesses_blk_form_form_key" NOT NULL,
  	"variant" "enum_thicknesses_blk_form_variant" DEFAULT 'card',
  	"show_contacts" boolean,
  	"submit_label" varchar,
  	"file_label" varchar,
  	"source_label" varchar,
  	"params" jsonb,
  	"block_name" varchar
  );
  
  CREATE TABLE "thicknesses_blk_snippet" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_thicknesses_blk_snippet_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_thicknesses_blk_snippet_background" DEFAULT 'auto',
  	"snippet_key" varchar NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "thicknesses_blk_stats_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "thicknesses_blk_stats" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_thicknesses_blk_stats_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_thicknesses_blk_stats_background" DEFAULT 'auto',
  	"variant" "enum_thicknesses_blk_stats_variant" DEFAULT 'tiles',
  	"block_name" varchar
  );
  
  CREATE TABLE "thicknesses_blk_objects" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_thicknesses_blk_objects_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_thicknesses_blk_objects_background" DEFAULT 'auto',
  	"mode" "enum_thicknesses_blk_objects_mode" DEFAULT 'featured',
  	"limit" numeric DEFAULT 4,
  	"product_id" uuid,
  	"show_all_link" boolean DEFAULT true,
  	"all_link_label" varchar DEFAULT 'Все объекты',
  	"block_name" varchar
  );
  
  CREATE TABLE "thicknesses_blk_articles" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_thicknesses_blk_articles_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_thicknesses_blk_articles_background" DEFAULT 'auto',
  	"mode" "enum_thicknesses_blk_articles_mode" DEFAULT 'featured',
  	"limit" numeric DEFAULT 4,
  	"block_name" varchar
  );
  
  CREATE TABLE "thicknesses_blk_wdw_left" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "thicknesses_blk_wdw_right" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "thicknesses_blk_wdw" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_thicknesses_blk_wdw_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_thicknesses_blk_wdw_background" DEFAULT 'auto',
  	"left_title" varchar DEFAULT 'Inex Glass',
  	"right_title" varchar DEFAULT 'Ваша бригада',
  	"strip_enabled" boolean,
  	"strip_title" varchar,
  	"strip_text" varchar,
  	"strip_button_label" varchar,
  	"strip_url" varchar DEFAULT 'https://inex.su',
  	"block_name" varchar
  );
  
  CREATE TABLE "thicknesses_blk_systems_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"subtitle" varchar,
  	"where_fits" varchar,
  	"important" varchar,
  	"how_held" varchar,
  	"requires_in_glass" varchar,
  	"image_id" uuid,
  	"scheme_svg" varchar
  );
  
  CREATE TABLE "thicknesses_blk_systems" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_thicknesses_blk_systems_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_thicknesses_blk_systems_background" DEFAULT 'auto',
  	"source" "enum_thicknesses_blk_systems_source" DEFAULT 'doc',
  	"layout" "enum_thicknesses_blk_systems_layout" DEFAULT 'cards',
  	"block_name" varchar
  );
  
  CREATE TABLE "thicknesses_blk_gallery_images" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" uuid NOT NULL,
  	"alt" varchar NOT NULL,
  	"caption" varchar
  );
  
  CREATE TABLE "thicknesses_blk_gallery" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_thicknesses_blk_gallery_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_thicknesses_blk_gallery_background" DEFAULT 'auto',
  	"layout" "enum_thicknesses_blk_gallery_layout" DEFAULT 'grid',
  	"block_name" varchar
  );
  
  CREATE TABLE "thicknesses_blk_two_cols" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_thicknesses_blk_two_cols_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_thicknesses_blk_two_cols_background" DEFAULT 'auto',
  	"left_heading" varchar,
  	"left_body" jsonb,
  	"right_heading" varchar,
  	"right_body" jsonb,
  	"block_name" varchar
  );
  
  CREATE TABLE "thicknesses_blk_links_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_type" "enum_thicknesses_blk_links_items_link_type" DEFAULT 'doc',
  	"link_url" varchar,
  	"link_label" varchar,
  	"link_new_tab" boolean,
  	"description" varchar
  );
  
  CREATE TABLE "thicknesses_blk_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_thicknesses_blk_links_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_thicknesses_blk_links_background" DEFAULT 'auto',
  	"variant" "enum_thicknesses_blk_links_variant" DEFAULT 'chips',
  	"label" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "thicknesses_blk_contacts" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_thicknesses_blk_contacts_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_thicknesses_blk_contacts_background" DEFAULT 'auto',
  	"show_map" boolean DEFAULT true,
  	"show_locations" boolean DEFAULT true,
  	"show_hours" boolean DEFAULT true,
  	"block_name" varchar
  );
  
  CREATE TABLE "thicknesses_blk_requisites" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_thicknesses_blk_requisites_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar DEFAULT 'rekvizity',
  	"background" "enum_thicknesses_blk_requisites_background" DEFAULT 'auto',
  	"show_download" boolean DEFAULT true,
  	"block_name" varchar
  );
  
  CREATE TABLE "thicknesses_blk_team" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_thicknesses_blk_team_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_thicknesses_blk_team_background" DEFAULT 'auto',
  	"limit" numeric,
  	"empty_behavior" "enum_thicknesses_blk_team_empty_behavior" DEFAULT 'hide',
  	"block_name" varchar
  );
  
  CREATE TABLE "thicknesses_blk_quiz_cta" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_thicknesses_blk_quiz_cta_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_thicknesses_blk_quiz_cta_background" DEFAULT 'auto',
  	"text" varchar,
  	"button_label" varchar,
  	"prefill_type" "enum_thicknesses_blk_quiz_cta_prefill_type",
  	"prefill_thickness" "enum_thicknesses_blk_quiz_cta_prefill_thickness",
  	"prefill_kind" "enum_thicknesses_blk_quiz_cta_prefill_kind",
  	"prefill_cta_label" varchar DEFAULT 'Рассчитать стоимость',
  	"prefill_secondary_form" "enum_thicknesses_blk_quiz_cta_prefill_secondary_form" DEFAULT 'drawing',
  	"prefill_secondary_label" varchar DEFAULT 'Отправить чертёж',
  	"block_name" varchar
  );
  
  CREATE TABLE "thicknesses" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"n" numeric NOT NULL,
  	"group_id" uuid NOT NULL,
  	"slug" varchar,
  	"path" varchar,
  	"weight_per_m2" numeric,
  	"indexable" boolean,
  	"kinds_text" varchar NOT NULL,
  	"can_paint" boolean,
  	"can_bend" boolean,
  	"size_text" varchar,
  	"lead_time_text" varchar,
  	"podbor_override" jsonb,
  	"obrabotka_override" jsonb,
  	"internal_applications" varchar,
  	"card_title" varchar,
  	"card_text" varchar,
  	"card_image_id" uuid,
  	"card_icon" varchar,
  	"card_price_hint" varchar,
  	"seo_h1" varchar,
  	"seo_title" varchar,
  	"seo_title_no_price" varchar,
  	"seo_description" varchar,
  	"seo_noindex" boolean DEFAULT false,
  	"seo_canonical" varchar,
  	"seo_og_image_id" uuid,
  	"quiz_prefill_type" "enum_thicknesses_quiz_prefill_type",
  	"quiz_prefill_thickness" "enum_thicknesses_quiz_prefill_thickness",
  	"quiz_prefill_kind" "enum_thicknesses_quiz_prefill_kind",
  	"quiz_prefill_cta_label" varchar DEFAULT 'Рассчитать стоимость',
  	"quiz_prefill_secondary_form" "enum_thicknesses_quiz_prefill_secondary_form" DEFAULT 'drawing',
  	"quiz_prefill_secondary_label" varchar DEFAULT 'Отправить чертёж',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "thicknesses_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"pages_id" uuid,
  	"glass_types_id" uuid,
  	"thicknesses_id" uuid,
  	"processing_services_id" uuid,
  	"constructions_id" uuid,
  	"articles_id" uuid,
  	"objects_id" uuid
  );
  
  CREATE TABLE "thickness_groups_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question" varchar NOT NULL,
  	"answer" jsonb NOT NULL
  );
  
  CREATE TABLE "thickness_groups" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"label" varchar NOT NULL,
  	"order" numeric,
  	"slug" varchar NOT NULL,
  	"podbor_text" jsonb NOT NULL,
  	"obrabotka_text" jsonb NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "glass_types_hero_photos" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" uuid,
  	"caption" varchar
  );
  
  CREATE TABLE "glass_types_variants" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"name" varchar,
  	"description" varchar,
  	"application" varchar,
  	"swatch_kind" "enum_glass_types_variants_swatch_kind" DEFAULT 'color',
  	"swatch_color" varchar,
  	"pattern_key" varchar,
  	"swatch_image_id" uuid
  );
  
  CREATE TABLE "glass_types_tables_cols" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"align" "enum_glass_types_tables_cols_align" DEFAULT 'left',
  	"numeric" boolean
  );
  
  CREATE TABLE "glass_types_tables_rows_cells" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar,
  	"positive" boolean,
  	"href" varchar
  );
  
  CREATE TABLE "glass_types_tables_rows" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"row_href" varchar
  );
  
  CREATE TABLE "glass_types_tables" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"lead" varchar,
  	"role" "enum_glass_types_tables_role" DEFAULT 'parameters',
  	"mobile_mode" "enum_glass_types_tables_mobile_mode" DEFAULT 'cards',
  	"footnote" varchar
  );
  
  CREATE TABLE "glass_types_important_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"lead" varchar,
  	"text" jsonb
  );
  
  CREATE TABLE "glass_types_limits_radius" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"thickness_from" numeric,
  	"thickness_to" numeric,
  	"min_radius" numeric
  );
  
  CREATE TABLE "glass_types_applications" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"description" varchar,
  	"link_type" "enum_glass_types_applications_link_type" DEFAULT 'doc',
  	"link_url" varchar,
  	"link_label" varchar,
  	"link_new_tab" boolean
  );
  
  CREATE TABLE "glass_types_related_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_type" "enum_glass_types_related_links_link_type" DEFAULT 'doc',
  	"link_url" varchar,
  	"link_label" varchar,
  	"link_new_tab" boolean,
  	"description" varchar
  );
  
  CREATE TABLE "glass_types_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" jsonb
  );
  
  CREATE TABLE "glass_types_blk_hero_eyebrow" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "glass_types_blk_hero_buttons" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"kind" "enum_glass_types_blk_hero_buttons_kind" DEFAULT 'quiz',
  	"variant" "enum_glass_types_blk_hero_buttons_variant" DEFAULT 'primary',
  	"icon" varchar,
  	"form_key" "enum_glass_types_blk_hero_buttons_form_key",
  	"form_params" jsonb,
  	"link_type" "enum_glass_types_blk_hero_buttons_link_type" DEFAULT 'doc',
  	"link_url" varchar,
  	"link_new_tab" boolean,
  	"file_id" uuid
  );
  
  CREATE TABLE "glass_types_blk_hero_photos" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" uuid,
  	"caption" varchar
  );
  
  CREATE TABLE "glass_types_blk_hero_stats" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar,
  	"text" varchar
  );
  
  CREATE TABLE "glass_types_blk_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_glass_types_blk_hero_variant" DEFAULT 'ctHero',
  	"title_override" varchar,
  	"lead" jsonb,
  	"facts" varchar,
  	"strong" varchar,
  	"show_terms" boolean DEFAULT true,
  	"terms_mode" "enum_glass_types_blk_hero_terms_mode" DEFAULT 'full',
  	"image_id" uuid,
  	"image_alt" varchar,
  	"big_number" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "glass_types_blk_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_glass_types_blk_text_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_glass_types_blk_text_background" DEFAULT 'auto',
  	"content" jsonb,
  	"width" "enum_glass_types_blk_text_width" DEFAULT 'normal',
  	"block_name" varchar
  );
  
  CREATE TABLE "glass_types_blk_table_table_cols" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"align" "enum_glass_types_blk_table_table_cols_align" DEFAULT 'left',
  	"numeric" boolean
  );
  
  CREATE TABLE "glass_types_blk_table_table_rows_cells" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar,
  	"positive" boolean,
  	"href" varchar
  );
  
  CREATE TABLE "glass_types_blk_table_table_rows" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"row_href" varchar
  );
  
  CREATE TABLE "glass_types_blk_table" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_glass_types_blk_table_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_glass_types_blk_table_background" DEFAULT 'auto',
  	"table_caption" varchar,
  	"table_role" "enum_glass_types_blk_table_table_role" DEFAULT 'parameters',
  	"table_mobile_mode" "enum_glass_types_blk_table_table_mobile_mode" DEFAULT 'cards',
  	"table_footnote" varchar,
  	"table_highlight_column" numeric,
  	"block_name" varchar
  );
  
  CREATE TABLE "glass_types_blk_steps_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"text" varchar,
  	"link_label" varchar,
  	"link_type" "enum_glass_types_blk_steps_items_link_type" DEFAULT 'doc',
  	"link_url" varchar,
  	"link_new_tab" boolean
  );
  
  CREATE TABLE "glass_types_blk_steps_buttons" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"kind" "enum_glass_types_blk_steps_buttons_kind" DEFAULT 'quiz',
  	"variant" "enum_glass_types_blk_steps_buttons_variant" DEFAULT 'primary',
  	"icon" varchar,
  	"form_key" "enum_glass_types_blk_steps_buttons_form_key",
  	"form_params" jsonb,
  	"link_type" "enum_glass_types_blk_steps_buttons_link_type" DEFAULT 'doc',
  	"link_url" varchar,
  	"link_new_tab" boolean,
  	"file_id" uuid
  );
  
  CREATE TABLE "glass_types_blk_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_glass_types_blk_steps_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_glass_types_blk_steps_background" DEFAULT 'auto',
  	"variant" "enum_glass_types_blk_steps_variant" DEFAULT 'horizontal',
  	"footnote" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "glass_types_blk_callout_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"lead" varchar,
  	"text" jsonb
  );
  
  CREATE TABLE "glass_types_blk_callout" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_glass_types_blk_callout_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_glass_types_blk_callout_background" DEFAULT 'auto',
  	"tone" "enum_glass_types_blk_callout_tone" DEFAULT 'warning',
  	"icon" varchar,
  	"title" varchar,
  	"body" jsonb,
  	"block_name" varchar
  );
  
  CREATE TABLE "glass_types_blk_terms_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"icon" varchar
  );
  
  CREATE TABLE "glass_types_blk_terms" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_glass_types_blk_terms_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_glass_types_blk_terms_background" DEFAULT 'auto',
  	"mode" "enum_glass_types_blk_terms_mode" DEFAULT 'global',
  	"variant" "enum_glass_types_blk_terms_variant" DEFAULT 'bar',
  	"block_name" varchar
  );
  
  CREATE TABLE "glass_types_blk_cards_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"text" varchar,
  	"link_type" "enum_glass_types_blk_cards_items_link_type" DEFAULT 'doc',
  	"link_url" varchar,
  	"link_label" varchar,
  	"link_new_tab" boolean,
  	"image_id" uuid,
  	"icon" varchar,
  	"price_hint" varchar,
  	"tone" "enum_glass_types_blk_cards_items_tone" DEFAULT 'default'
  );
  
  CREATE TABLE "glass_types_blk_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_glass_types_blk_cards_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_glass_types_blk_cards_background" DEFAULT 'auto',
  	"layout" "enum_glass_types_blk_cards_layout" DEFAULT 'g3',
  	"block_name" varchar
  );
  
  CREATE TABLE "glass_types_blk_coll_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_glass_types_blk_coll_cards_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_glass_types_blk_coll_cards_background" DEFAULT 'auto',
  	"source" "enum_glass_types_blk_coll_cards_source" DEFAULT 'glassTypes',
  	"mode" "enum_glass_types_blk_coll_cards_mode" DEFAULT 'all',
  	"group" "enum_glass_types_blk_coll_cards_group",
  	"columns" "enum_glass_types_blk_coll_cards_columns" DEFAULT '3',
  	"show_prices" boolean,
  	"block_name" varchar
  );
  
  CREATE TABLE "glass_types_blk_prices" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_glass_types_blk_prices_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar DEFAULT 'ceny',
  	"background" "enum_glass_types_blk_prices_background" DEFAULT 'auto',
  	"variant" "enum_glass_types_blk_prices_variant" DEFAULT 'both',
  	"show_included" boolean DEFAULT true,
  	"show_caption" boolean DEFAULT true,
  	"show_promo" boolean,
  	"show_weight" boolean DEFAULT true,
  	"callout_from_conditions" boolean,
  	"block_name" varchar
  );
  
  CREATE TABLE "glass_types_blk_faq_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" jsonb
  );
  
  CREATE TABLE "glass_types_blk_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_glass_types_blk_faq_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_glass_types_blk_faq_background" DEFAULT 'auto',
  	"mode" "enum_glass_types_blk_faq_mode" DEFAULT 'doc',
  	"block_name" varchar
  );
  
  CREATE TABLE "glass_types_blk_cta_buttons" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"kind" "enum_glass_types_blk_cta_buttons_kind" DEFAULT 'quiz',
  	"variant" "enum_glass_types_blk_cta_buttons_variant" DEFAULT 'primary',
  	"icon" varchar,
  	"form_key" "enum_glass_types_blk_cta_buttons_form_key",
  	"form_params" jsonb,
  	"link_type" "enum_glass_types_blk_cta_buttons_link_type" DEFAULT 'doc',
  	"link_url" varchar,
  	"link_new_tab" boolean,
  	"file_id" uuid
  );
  
  CREATE TABLE "glass_types_blk_cta" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_glass_types_blk_cta_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_glass_types_blk_cta_background" DEFAULT 'auto',
  	"variant" "enum_glass_types_blk_cta_variant" DEFAULT 'buttons',
  	"tone" "enum_glass_types_blk_cta_tone" DEFAULT 'light',
  	"title" varchar,
  	"body" jsonb,
  	"side_text" varchar,
  	"link_type" "enum_glass_types_blk_cta_link_type" DEFAULT 'doc',
  	"link_url" varchar,
  	"link_label" varchar,
  	"link_new_tab" boolean,
  	"block_name" varchar
  );
  
  CREATE TABLE "glass_types_blk_compare_rows" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"topic" varchar,
  	"left" varchar,
  	"right" varchar
  );
  
  CREATE TABLE "glass_types_blk_compare" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_glass_types_blk_compare_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_glass_types_blk_compare_background" DEFAULT 'auto',
  	"topic_title" varchar DEFAULT 'Этап',
  	"left_title" varchar DEFAULT 'Когда заказываете на заводе сами',
  	"right_title" varchar DEFAULT 'Когда через Inex Glass',
  	"foot_link_type" "enum_glass_types_blk_compare_foot_link_type" DEFAULT 'doc',
  	"foot_link_url" varchar,
  	"foot_link_label" varchar,
  	"foot_link_new_tab" boolean,
  	"block_name" varchar
  );
  
  CREATE TABLE "glass_types_blk_download_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"description" varchar,
  	"file_id" uuid,
  	"file_missing" boolean
  );
  
  CREATE TABLE "glass_types_blk_download" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_glass_types_blk_download_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_glass_types_blk_download_background" DEFAULT 'auto',
  	"variant" "enum_glass_types_blk_download_variant" DEFAULT 'list',
  	"block_name" varchar
  );
  
  CREATE TABLE "glass_types_blk_holes" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_glass_types_blk_holes_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_glass_types_blk_holes_background" DEFAULT 'auto',
  	"default_thickness" "enum_glass_types_blk_holes_default_thickness" DEFAULT '10',
  	"show_scheme" boolean DEFAULT true,
  	"note" varchar,
  	"cta_label" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "glass_types_blk_weight" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_glass_types_blk_weight_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_glass_types_blk_weight_background" DEFAULT 'auto',
  	"default_mode" "enum_glass_types_blk_weight_default_mode" DEFAULT 'single',
  	"show_table" boolean DEFAULT true,
  	"show_formula" boolean DEFAULT true,
  	"block_name" varchar
  );
  
  CREATE TABLE "glass_types_blk_form_bullets" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "glass_types_blk_form" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_glass_types_blk_form_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_glass_types_blk_form_background" DEFAULT 'auto',
  	"form_key" "enum_glass_types_blk_form_form_key",
  	"variant" "enum_glass_types_blk_form_variant" DEFAULT 'card',
  	"show_contacts" boolean,
  	"submit_label" varchar,
  	"file_label" varchar,
  	"source_label" varchar,
  	"params" jsonb,
  	"block_name" varchar
  );
  
  CREATE TABLE "glass_types_blk_snippet" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_glass_types_blk_snippet_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_glass_types_blk_snippet_background" DEFAULT 'auto',
  	"snippet_key" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "glass_types_blk_stats_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar,
  	"text" varchar
  );
  
  CREATE TABLE "glass_types_blk_stats" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_glass_types_blk_stats_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_glass_types_blk_stats_background" DEFAULT 'auto',
  	"variant" "enum_glass_types_blk_stats_variant" DEFAULT 'tiles',
  	"block_name" varchar
  );
  
  CREATE TABLE "glass_types_blk_objects" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_glass_types_blk_objects_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_glass_types_blk_objects_background" DEFAULT 'auto',
  	"mode" "enum_glass_types_blk_objects_mode" DEFAULT 'featured',
  	"limit" numeric DEFAULT 4,
  	"product_id" uuid,
  	"show_all_link" boolean DEFAULT true,
  	"all_link_label" varchar DEFAULT 'Все объекты',
  	"block_name" varchar
  );
  
  CREATE TABLE "glass_types_blk_articles" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_glass_types_blk_articles_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_glass_types_blk_articles_background" DEFAULT 'auto',
  	"mode" "enum_glass_types_blk_articles_mode" DEFAULT 'featured',
  	"limit" numeric DEFAULT 4,
  	"block_name" varchar
  );
  
  CREATE TABLE "glass_types_blk_wdw_left" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "glass_types_blk_wdw_right" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "glass_types_blk_wdw" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_glass_types_blk_wdw_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_glass_types_blk_wdw_background" DEFAULT 'auto',
  	"left_title" varchar DEFAULT 'Inex Glass',
  	"right_title" varchar DEFAULT 'Ваша бригада',
  	"strip_enabled" boolean,
  	"strip_title" varchar,
  	"strip_text" varchar,
  	"strip_button_label" varchar,
  	"strip_url" varchar DEFAULT 'https://inex.su',
  	"block_name" varchar
  );
  
  CREATE TABLE "glass_types_blk_systems_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"subtitle" varchar,
  	"where_fits" varchar,
  	"important" varchar,
  	"how_held" varchar,
  	"requires_in_glass" varchar,
  	"image_id" uuid,
  	"scheme_svg" varchar
  );
  
  CREATE TABLE "glass_types_blk_systems" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_glass_types_blk_systems_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_glass_types_blk_systems_background" DEFAULT 'auto',
  	"source" "enum_glass_types_blk_systems_source" DEFAULT 'doc',
  	"layout" "enum_glass_types_blk_systems_layout" DEFAULT 'cards',
  	"block_name" varchar
  );
  
  CREATE TABLE "glass_types_blk_gallery_images" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" uuid,
  	"alt" varchar,
  	"caption" varchar
  );
  
  CREATE TABLE "glass_types_blk_gallery" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_glass_types_blk_gallery_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_glass_types_blk_gallery_background" DEFAULT 'auto',
  	"layout" "enum_glass_types_blk_gallery_layout" DEFAULT 'grid',
  	"block_name" varchar
  );
  
  CREATE TABLE "glass_types_blk_two_cols" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_glass_types_blk_two_cols_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_glass_types_blk_two_cols_background" DEFAULT 'auto',
  	"left_heading" varchar,
  	"left_body" jsonb,
  	"right_heading" varchar,
  	"right_body" jsonb,
  	"block_name" varchar
  );
  
  CREATE TABLE "glass_types_blk_links_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_type" "enum_glass_types_blk_links_items_link_type" DEFAULT 'doc',
  	"link_url" varchar,
  	"link_label" varchar,
  	"link_new_tab" boolean,
  	"description" varchar
  );
  
  CREATE TABLE "glass_types_blk_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_glass_types_blk_links_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_glass_types_blk_links_background" DEFAULT 'auto',
  	"variant" "enum_glass_types_blk_links_variant" DEFAULT 'chips',
  	"label" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "glass_types_blk_contacts" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_glass_types_blk_contacts_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_glass_types_blk_contacts_background" DEFAULT 'auto',
  	"show_map" boolean DEFAULT true,
  	"show_locations" boolean DEFAULT true,
  	"show_hours" boolean DEFAULT true,
  	"block_name" varchar
  );
  
  CREATE TABLE "glass_types_blk_requisites" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_glass_types_blk_requisites_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar DEFAULT 'rekvizity',
  	"background" "enum_glass_types_blk_requisites_background" DEFAULT 'auto',
  	"show_download" boolean DEFAULT true,
  	"block_name" varchar
  );
  
  CREATE TABLE "glass_types_blk_team" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_glass_types_blk_team_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_glass_types_blk_team_background" DEFAULT 'auto',
  	"limit" numeric,
  	"empty_behavior" "enum_glass_types_blk_team_empty_behavior" DEFAULT 'hide',
  	"block_name" varchar
  );
  
  CREATE TABLE "glass_types_blk_quiz_cta" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_glass_types_blk_quiz_cta_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_glass_types_blk_quiz_cta_background" DEFAULT 'auto',
  	"text" varchar,
  	"button_label" varchar,
  	"prefill_type" "enum_glass_types_blk_quiz_cta_prefill_type",
  	"prefill_thickness" "enum_glass_types_blk_quiz_cta_prefill_thickness",
  	"prefill_kind" "enum_glass_types_blk_quiz_cta_prefill_kind",
  	"prefill_cta_label" varchar DEFAULT 'Рассчитать стоимость',
  	"prefill_secondary_form" "enum_glass_types_blk_quiz_cta_prefill_secondary_form" DEFAULT 'drawing',
  	"prefill_secondary_label" varchar DEFAULT 'Отправить чертёж',
  	"block_name" varchar
  );
  
  CREATE TABLE "glass_types" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"title" varchar,
  	"slug" varchar,
  	"url_base" "enum_glass_types_url_base" DEFAULT 'zakalennoe-steklo',
  	"path" varchar,
  	"breadcrumb_label" varchar,
  	"order" numeric,
  	"show_in_hub" boolean DEFAULT true,
  	"card_title" varchar,
  	"card_text" varchar,
  	"card_image_id" uuid,
  	"card_icon" varchar,
  	"card_price_hint" varchar,
  	"hero_image_id" uuid,
  	"intro" jsonb,
  	"variants_heading" varchar DEFAULT 'Варианты',
  	"variants_note" jsonb,
  	"variants_callout_title" varchar,
  	"variants_callout_body" jsonb,
  	"important_title" varchar DEFAULT 'Что важно знать до заказа',
  	"limits_thick_min" numeric,
  	"limits_thick_max" numeric,
  	"limits_size_min_w" numeric,
  	"limits_size_min_h" numeric,
  	"limits_size_max_w" numeric,
  	"limits_size_max_h" numeric,
  	"limits_notes" varchar,
  	"show_samples" boolean,
  	"samples_snippet_key" varchar DEFAULT 'samples',
  	"show_objects" boolean,
  	"objects_product_id" uuid,
  	"seo_h1" varchar,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"seo_noindex" boolean DEFAULT false,
  	"seo_canonical" varchar,
  	"seo_og_image_id" uuid,
  	"quiz_prefill_type" "enum_glass_types_quiz_prefill_type",
  	"quiz_prefill_thickness" "enum_glass_types_quiz_prefill_thickness",
  	"quiz_prefill_kind" "enum_glass_types_quiz_prefill_kind",
  	"quiz_prefill_cta_label" varchar DEFAULT 'Рассчитать стоимость',
  	"quiz_prefill_secondary_form" "enum_glass_types_quiz_prefill_secondary_form" DEFAULT 'drawing',
  	"quiz_prefill_secondary_label" varchar DEFAULT 'Отправить чертёж',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_glass_types_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "glass_types_numbers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"number" numeric,
  	"order" integer NOT NULL,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL
  );
  
  CREATE TABLE "glass_types_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"pages_id" uuid,
  	"glass_types_id" uuid,
  	"thicknesses_id" uuid,
  	"processing_services_id" uuid,
  	"constructions_id" uuid,
  	"articles_id" uuid,
  	"objects_id" uuid
  );
  
  CREATE TABLE "_glass_types_v_version_hero_photos" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"image_id" uuid,
  	"caption" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_glass_types_v_version_variants" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"key" varchar,
  	"name" varchar,
  	"description" varchar,
  	"application" varchar,
  	"swatch_kind" "enum__glass_types_v_version_variants_swatch_kind" DEFAULT 'color',
  	"swatch_color" varchar,
  	"pattern_key" varchar,
  	"swatch_image_id" uuid,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_glass_types_tables_cols_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"label" varchar,
  	"align" "enum__glass_types_tables_cols_v_align" DEFAULT 'left',
  	"numeric" boolean,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_glass_types_tables_rows_cells_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"value" varchar,
  	"positive" boolean,
  	"href" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_glass_types_tables_rows_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"row_href" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_glass_types_v_version_tables" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"lead" varchar,
  	"role" "enum__glass_types_v_version_tables_role" DEFAULT 'parameters',
  	"mobile_mode" "enum__glass_types_v_version_tables_mobile_mode" DEFAULT 'cards',
  	"footnote" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_glass_types_v_version_important_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"lead" varchar,
  	"text" jsonb,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_glass_types_v_version_limits_radius" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"thickness_from" numeric,
  	"thickness_to" numeric,
  	"min_radius" numeric,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_glass_types_v_version_applications" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"text" varchar,
  	"description" varchar,
  	"link_type" "enum__glass_types_v_version_applications_link_type" DEFAULT 'doc',
  	"link_url" varchar,
  	"link_label" varchar,
  	"link_new_tab" boolean,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_glass_types_v_version_related_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"link_type" "enum__glass_types_v_version_related_links_link_type" DEFAULT 'doc',
  	"link_url" varchar,
  	"link_label" varchar,
  	"link_new_tab" boolean,
  	"description" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_glass_types_v_version_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"question" varchar,
  	"answer" jsonb,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_glass_types_blk_hero_v_eyebrow" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_glass_types_blk_hero_v_buttons" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"label" varchar,
  	"kind" "enum__glass_types_blk_hero_v_buttons_kind" DEFAULT 'quiz',
  	"variant" "enum__glass_types_blk_hero_v_buttons_variant" DEFAULT 'primary',
  	"icon" varchar,
  	"form_key" "enum__glass_types_blk_hero_v_buttons_form_key",
  	"form_params" jsonb,
  	"link_type" "enum__glass_types_blk_hero_v_buttons_link_type" DEFAULT 'doc',
  	"link_url" varchar,
  	"link_new_tab" boolean,
  	"file_id" uuid,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_glass_types_blk_hero_v_photos" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"image_id" uuid,
  	"caption" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_glass_types_blk_hero_v_stats" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"value" varchar,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_glass_types_blk_hero_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"variant" "enum__glass_types_blk_hero_v_variant" DEFAULT 'ctHero',
  	"title_override" varchar,
  	"lead" jsonb,
  	"facts" varchar,
  	"strong" varchar,
  	"show_terms" boolean DEFAULT true,
  	"terms_mode" "enum__glass_types_blk_hero_v_terms_mode" DEFAULT 'full',
  	"image_id" uuid,
  	"image_alt" varchar,
  	"big_number" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_glass_types_blk_text_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum__glass_types_blk_text_v_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum__glass_types_blk_text_v_background" DEFAULT 'auto',
  	"content" jsonb,
  	"width" "enum__glass_types_blk_text_v_width" DEFAULT 'normal',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_glass_types_blk_table_table_cols_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"label" varchar,
  	"align" "enum__glass_types_blk_table_table_cols_v_align" DEFAULT 'left',
  	"numeric" boolean,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_glass_types_blk_table_table_rows_cells_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"value" varchar,
  	"positive" boolean,
  	"href" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_glass_types_blk_table_table_rows_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"row_href" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_glass_types_blk_table_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum__glass_types_blk_table_v_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum__glass_types_blk_table_v_background" DEFAULT 'auto',
  	"table_caption" varchar,
  	"table_role" "enum__glass_types_blk_table_v_table_role" DEFAULT 'parameters',
  	"table_mobile_mode" "enum__glass_types_blk_table_v_table_mobile_mode" DEFAULT 'cards',
  	"table_footnote" varchar,
  	"table_highlight_column" numeric,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_glass_types_blk_steps_v_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"title" varchar,
  	"text" varchar,
  	"link_label" varchar,
  	"link_type" "enum__glass_types_blk_steps_v_items_link_type" DEFAULT 'doc',
  	"link_url" varchar,
  	"link_new_tab" boolean,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_glass_types_blk_steps_v_buttons" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"label" varchar,
  	"kind" "enum__glass_types_blk_steps_v_buttons_kind" DEFAULT 'quiz',
  	"variant" "enum__glass_types_blk_steps_v_buttons_variant" DEFAULT 'primary',
  	"icon" varchar,
  	"form_key" "enum__glass_types_blk_steps_v_buttons_form_key",
  	"form_params" jsonb,
  	"link_type" "enum__glass_types_blk_steps_v_buttons_link_type" DEFAULT 'doc',
  	"link_url" varchar,
  	"link_new_tab" boolean,
  	"file_id" uuid,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_glass_types_blk_steps_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum__glass_types_blk_steps_v_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum__glass_types_blk_steps_v_background" DEFAULT 'auto',
  	"variant" "enum__glass_types_blk_steps_v_variant" DEFAULT 'horizontal',
  	"footnote" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_glass_types_blk_callout_v_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"lead" varchar,
  	"text" jsonb,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_glass_types_blk_callout_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum__glass_types_blk_callout_v_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum__glass_types_blk_callout_v_background" DEFAULT 'auto',
  	"tone" "enum__glass_types_blk_callout_v_tone" DEFAULT 'warning',
  	"icon" varchar,
  	"title" varchar,
  	"body" jsonb,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_glass_types_blk_terms_v_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"text" varchar,
  	"icon" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_glass_types_blk_terms_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum__glass_types_blk_terms_v_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum__glass_types_blk_terms_v_background" DEFAULT 'auto',
  	"mode" "enum__glass_types_blk_terms_v_mode" DEFAULT 'global',
  	"variant" "enum__glass_types_blk_terms_v_variant" DEFAULT 'bar',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_glass_types_blk_cards_v_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"title" varchar,
  	"text" varchar,
  	"link_type" "enum__glass_types_blk_cards_v_items_link_type" DEFAULT 'doc',
  	"link_url" varchar,
  	"link_label" varchar,
  	"link_new_tab" boolean,
  	"image_id" uuid,
  	"icon" varchar,
  	"price_hint" varchar,
  	"tone" "enum__glass_types_blk_cards_v_items_tone" DEFAULT 'default',
  	"_uuid" varchar
  );
  
  CREATE TABLE "_glass_types_blk_cards_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum__glass_types_blk_cards_v_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum__glass_types_blk_cards_v_background" DEFAULT 'auto',
  	"layout" "enum__glass_types_blk_cards_v_layout" DEFAULT 'g3',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_glass_types_blk_coll_cards_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum__glass_types_blk_coll_cards_v_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum__glass_types_blk_coll_cards_v_background" DEFAULT 'auto',
  	"source" "enum__glass_types_blk_coll_cards_v_source" DEFAULT 'glassTypes',
  	"mode" "enum__glass_types_blk_coll_cards_v_mode" DEFAULT 'all',
  	"group" "enum__glass_types_blk_coll_cards_v_group",
  	"columns" "enum__glass_types_blk_coll_cards_v_columns" DEFAULT '3',
  	"show_prices" boolean,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_glass_types_blk_prices_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum__glass_types_blk_prices_v_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar DEFAULT 'ceny',
  	"background" "enum__glass_types_blk_prices_v_background" DEFAULT 'auto',
  	"variant" "enum__glass_types_blk_prices_v_variant" DEFAULT 'both',
  	"show_included" boolean DEFAULT true,
  	"show_caption" boolean DEFAULT true,
  	"show_promo" boolean,
  	"show_weight" boolean DEFAULT true,
  	"callout_from_conditions" boolean,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_glass_types_blk_faq_v_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"question" varchar,
  	"answer" jsonb,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_glass_types_blk_faq_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum__glass_types_blk_faq_v_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum__glass_types_blk_faq_v_background" DEFAULT 'auto',
  	"mode" "enum__glass_types_blk_faq_v_mode" DEFAULT 'doc',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_glass_types_blk_cta_v_buttons" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"label" varchar,
  	"kind" "enum__glass_types_blk_cta_v_buttons_kind" DEFAULT 'quiz',
  	"variant" "enum__glass_types_blk_cta_v_buttons_variant" DEFAULT 'primary',
  	"icon" varchar,
  	"form_key" "enum__glass_types_blk_cta_v_buttons_form_key",
  	"form_params" jsonb,
  	"link_type" "enum__glass_types_blk_cta_v_buttons_link_type" DEFAULT 'doc',
  	"link_url" varchar,
  	"link_new_tab" boolean,
  	"file_id" uuid,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_glass_types_blk_cta_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum__glass_types_blk_cta_v_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum__glass_types_blk_cta_v_background" DEFAULT 'auto',
  	"variant" "enum__glass_types_blk_cta_v_variant" DEFAULT 'buttons',
  	"tone" "enum__glass_types_blk_cta_v_tone" DEFAULT 'light',
  	"title" varchar,
  	"body" jsonb,
  	"side_text" varchar,
  	"link_type" "enum__glass_types_blk_cta_v_link_type" DEFAULT 'doc',
  	"link_url" varchar,
  	"link_label" varchar,
  	"link_new_tab" boolean,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_glass_types_blk_compare_v_rows" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"topic" varchar,
  	"left" varchar,
  	"right" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_glass_types_blk_compare_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum__glass_types_blk_compare_v_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum__glass_types_blk_compare_v_background" DEFAULT 'auto',
  	"topic_title" varchar DEFAULT 'Этап',
  	"left_title" varchar DEFAULT 'Когда заказываете на заводе сами',
  	"right_title" varchar DEFAULT 'Когда через Inex Glass',
  	"foot_link_type" "enum__glass_types_blk_compare_v_foot_link_type" DEFAULT 'doc',
  	"foot_link_url" varchar,
  	"foot_link_label" varchar,
  	"foot_link_new_tab" boolean,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_glass_types_blk_download_v_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"title" varchar,
  	"description" varchar,
  	"file_id" uuid,
  	"file_missing" boolean,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_glass_types_blk_download_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum__glass_types_blk_download_v_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum__glass_types_blk_download_v_background" DEFAULT 'auto',
  	"variant" "enum__glass_types_blk_download_v_variant" DEFAULT 'list',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_glass_types_blk_holes_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum__glass_types_blk_holes_v_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum__glass_types_blk_holes_v_background" DEFAULT 'auto',
  	"default_thickness" "enum__glass_types_blk_holes_v_default_thickness" DEFAULT '10',
  	"show_scheme" boolean DEFAULT true,
  	"note" varchar,
  	"cta_label" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_glass_types_blk_weight_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum__glass_types_blk_weight_v_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum__glass_types_blk_weight_v_background" DEFAULT 'auto',
  	"default_mode" "enum__glass_types_blk_weight_v_default_mode" DEFAULT 'single',
  	"show_table" boolean DEFAULT true,
  	"show_formula" boolean DEFAULT true,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_glass_types_blk_form_v_bullets" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_glass_types_blk_form_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum__glass_types_blk_form_v_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum__glass_types_blk_form_v_background" DEFAULT 'auto',
  	"form_key" "enum__glass_types_blk_form_v_form_key",
  	"variant" "enum__glass_types_blk_form_v_variant" DEFAULT 'card',
  	"show_contacts" boolean,
  	"submit_label" varchar,
  	"file_label" varchar,
  	"source_label" varchar,
  	"params" jsonb,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_glass_types_blk_snippet_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum__glass_types_blk_snippet_v_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum__glass_types_blk_snippet_v_background" DEFAULT 'auto',
  	"snippet_key" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_glass_types_blk_stats_v_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"value" varchar,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_glass_types_blk_stats_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum__glass_types_blk_stats_v_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum__glass_types_blk_stats_v_background" DEFAULT 'auto',
  	"variant" "enum__glass_types_blk_stats_v_variant" DEFAULT 'tiles',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_glass_types_blk_objects_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum__glass_types_blk_objects_v_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum__glass_types_blk_objects_v_background" DEFAULT 'auto',
  	"mode" "enum__glass_types_blk_objects_v_mode" DEFAULT 'featured',
  	"limit" numeric DEFAULT 4,
  	"product_id" uuid,
  	"show_all_link" boolean DEFAULT true,
  	"all_link_label" varchar DEFAULT 'Все объекты',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_glass_types_blk_articles_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum__glass_types_blk_articles_v_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum__glass_types_blk_articles_v_background" DEFAULT 'auto',
  	"mode" "enum__glass_types_blk_articles_v_mode" DEFAULT 'featured',
  	"limit" numeric DEFAULT 4,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_glass_types_blk_wdw_left_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_glass_types_blk_wdw_right_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_glass_types_blk_wdw_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum__glass_types_blk_wdw_v_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum__glass_types_blk_wdw_v_background" DEFAULT 'auto',
  	"left_title" varchar DEFAULT 'Inex Glass',
  	"right_title" varchar DEFAULT 'Ваша бригада',
  	"strip_enabled" boolean,
  	"strip_title" varchar,
  	"strip_text" varchar,
  	"strip_button_label" varchar,
  	"strip_url" varchar DEFAULT 'https://inex.su',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_glass_types_blk_systems_v_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"name" varchar,
  	"subtitle" varchar,
  	"where_fits" varchar,
  	"important" varchar,
  	"how_held" varchar,
  	"requires_in_glass" varchar,
  	"image_id" uuid,
  	"scheme_svg" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_glass_types_blk_systems_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum__glass_types_blk_systems_v_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum__glass_types_blk_systems_v_background" DEFAULT 'auto',
  	"source" "enum__glass_types_blk_systems_v_source" DEFAULT 'doc',
  	"layout" "enum__glass_types_blk_systems_v_layout" DEFAULT 'cards',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_glass_types_blk_gallery_v_images" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"image_id" uuid,
  	"alt" varchar,
  	"caption" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_glass_types_blk_gallery_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum__glass_types_blk_gallery_v_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum__glass_types_blk_gallery_v_background" DEFAULT 'auto',
  	"layout" "enum__glass_types_blk_gallery_v_layout" DEFAULT 'grid',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_glass_types_blk_two_cols_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum__glass_types_blk_two_cols_v_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum__glass_types_blk_two_cols_v_background" DEFAULT 'auto',
  	"left_heading" varchar,
  	"left_body" jsonb,
  	"right_heading" varchar,
  	"right_body" jsonb,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_glass_types_blk_links_v_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"link_type" "enum__glass_types_blk_links_v_items_link_type" DEFAULT 'doc',
  	"link_url" varchar,
  	"link_label" varchar,
  	"link_new_tab" boolean,
  	"description" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_glass_types_blk_links_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum__glass_types_blk_links_v_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum__glass_types_blk_links_v_background" DEFAULT 'auto',
  	"variant" "enum__glass_types_blk_links_v_variant" DEFAULT 'chips',
  	"label" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_glass_types_blk_contacts_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum__glass_types_blk_contacts_v_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum__glass_types_blk_contacts_v_background" DEFAULT 'auto',
  	"show_map" boolean DEFAULT true,
  	"show_locations" boolean DEFAULT true,
  	"show_hours" boolean DEFAULT true,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_glass_types_blk_requisites_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum__glass_types_blk_requisites_v_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar DEFAULT 'rekvizity',
  	"background" "enum__glass_types_blk_requisites_v_background" DEFAULT 'auto',
  	"show_download" boolean DEFAULT true,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_glass_types_blk_team_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum__glass_types_blk_team_v_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum__glass_types_blk_team_v_background" DEFAULT 'auto',
  	"limit" numeric,
  	"empty_behavior" "enum__glass_types_blk_team_v_empty_behavior" DEFAULT 'hide',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_glass_types_blk_quiz_cta_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum__glass_types_blk_quiz_cta_v_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum__glass_types_blk_quiz_cta_v_background" DEFAULT 'auto',
  	"text" varchar,
  	"button_label" varchar,
  	"prefill_type" "enum__glass_types_blk_quiz_cta_v_prefill_type",
  	"prefill_thickness" "enum__glass_types_blk_quiz_cta_v_prefill_thickness",
  	"prefill_kind" "enum__glass_types_blk_quiz_cta_v_prefill_kind",
  	"prefill_cta_label" varchar DEFAULT 'Рассчитать стоимость',
  	"prefill_secondary_form" "enum__glass_types_blk_quiz_cta_v_prefill_secondary_form" DEFAULT 'drawing',
  	"prefill_secondary_label" varchar DEFAULT 'Отправить чертёж',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_glass_types_v" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"parent_id" uuid,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_url_base" "enum__glass_types_v_version_url_base" DEFAULT 'zakalennoe-steklo',
  	"version_path" varchar,
  	"version_breadcrumb_label" varchar,
  	"version_order" numeric,
  	"version_show_in_hub" boolean DEFAULT true,
  	"version_card_title" varchar,
  	"version_card_text" varchar,
  	"version_card_image_id" uuid,
  	"version_card_icon" varchar,
  	"version_card_price_hint" varchar,
  	"version_hero_image_id" uuid,
  	"version_intro" jsonb,
  	"version_variants_heading" varchar DEFAULT 'Варианты',
  	"version_variants_note" jsonb,
  	"version_variants_callout_title" varchar,
  	"version_variants_callout_body" jsonb,
  	"version_important_title" varchar DEFAULT 'Что важно знать до заказа',
  	"version_limits_thick_min" numeric,
  	"version_limits_thick_max" numeric,
  	"version_limits_size_min_w" numeric,
  	"version_limits_size_min_h" numeric,
  	"version_limits_size_max_w" numeric,
  	"version_limits_size_max_h" numeric,
  	"version_limits_notes" varchar,
  	"version_show_samples" boolean,
  	"version_samples_snippet_key" varchar DEFAULT 'samples',
  	"version_show_objects" boolean,
  	"version_objects_product_id" uuid,
  	"version_seo_h1" varchar,
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"version_seo_noindex" boolean DEFAULT false,
  	"version_seo_canonical" varchar,
  	"version_seo_og_image_id" uuid,
  	"version_quiz_prefill_type" "enum__glass_types_v_version_quiz_prefill_type",
  	"version_quiz_prefill_thickness" "enum__glass_types_v_version_quiz_prefill_thickness",
  	"version_quiz_prefill_kind" "enum__glass_types_v_version_quiz_prefill_kind",
  	"version_quiz_prefill_cta_label" varchar DEFAULT 'Рассчитать стоимость',
  	"version_quiz_prefill_secondary_form" "enum__glass_types_v_version_quiz_prefill_secondary_form" DEFAULT 'drawing',
  	"version_quiz_prefill_secondary_label" varchar DEFAULT 'Отправить чертёж',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__glass_types_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "_glass_types_v_numbers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"number" numeric,
  	"order" integer NOT NULL,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL
  );
  
  CREATE TABLE "_glass_types_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"pages_id" uuid,
  	"glass_types_id" uuid,
  	"thicknesses_id" uuid,
  	"processing_services_id" uuid,
  	"constructions_id" uuid,
  	"articles_id" uuid,
  	"objects_id" uuid
  );
  
  CREATE TABLE "processing_services_tables_cols" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"align" "enum_processing_services_tables_cols_align" DEFAULT 'left',
  	"numeric" boolean
  );
  
  CREATE TABLE "processing_services_tables_rows_cells" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar,
  	"positive" boolean,
  	"href" varchar
  );
  
  CREATE TABLE "processing_services_tables_rows" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"row_href" varchar
  );
  
  CREATE TABLE "processing_services_tables" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"lead" varchar,
  	"role" "enum_processing_services_tables_role" DEFAULT 'parameters',
  	"mobile_mode" "enum_processing_services_tables_mobile_mode" DEFAULT 'cards',
  	"footnote" varchar
  );
  
  CREATE TABLE "processing_services_important_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"lead" varchar,
  	"text" jsonb
  );
  
  CREATE TABLE "processing_services_callouts" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"tone" "enum_processing_services_callouts_tone" DEFAULT 'warning',
  	"title" varchar,
  	"body" jsonb
  );
  
  CREATE TABLE "processing_services_related_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_type" "enum_processing_services_related_links_link_type" DEFAULT 'doc',
  	"link_url" varchar,
  	"link_label" varchar,
  	"link_new_tab" boolean,
  	"description" varchar
  );
  
  CREATE TABLE "processing_services_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question" varchar NOT NULL,
  	"answer" jsonb NOT NULL
  );
  
  CREATE TABLE "processing_services_blk_hero_eyebrow" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "processing_services_blk_hero_buttons" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"kind" "enum_processing_services_blk_hero_buttons_kind" DEFAULT 'quiz',
  	"variant" "enum_processing_services_blk_hero_buttons_variant" DEFAULT 'primary',
  	"icon" varchar,
  	"form_key" "enum_processing_services_blk_hero_buttons_form_key",
  	"form_params" jsonb,
  	"link_type" "enum_processing_services_blk_hero_buttons_link_type" DEFAULT 'doc',
  	"link_url" varchar,
  	"link_new_tab" boolean,
  	"file_id" uuid
  );
  
  CREATE TABLE "processing_services_blk_hero_photos" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" uuid NOT NULL,
  	"caption" varchar
  );
  
  CREATE TABLE "processing_services_blk_hero_stats" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "processing_services_blk_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_processing_services_blk_hero_variant" DEFAULT 'ctHero' NOT NULL,
  	"title_override" varchar,
  	"lead" jsonb,
  	"facts" varchar,
  	"strong" varchar,
  	"show_terms" boolean DEFAULT true,
  	"terms_mode" "enum_processing_services_blk_hero_terms_mode" DEFAULT 'full',
  	"image_id" uuid,
  	"image_alt" varchar,
  	"big_number" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "processing_services_blk_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_processing_services_blk_text_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_processing_services_blk_text_background" DEFAULT 'auto',
  	"content" jsonb NOT NULL,
  	"width" "enum_processing_services_blk_text_width" DEFAULT 'normal',
  	"block_name" varchar
  );
  
  CREATE TABLE "processing_services_blk_table_table_cols" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"align" "enum_processing_services_blk_table_table_cols_align" DEFAULT 'left',
  	"numeric" boolean
  );
  
  CREATE TABLE "processing_services_blk_table_table_rows_cells" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar,
  	"positive" boolean,
  	"href" varchar
  );
  
  CREATE TABLE "processing_services_blk_table_table_rows" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"row_href" varchar
  );
  
  CREATE TABLE "processing_services_blk_table" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_processing_services_blk_table_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_processing_services_blk_table_background" DEFAULT 'auto',
  	"table_caption" varchar,
  	"table_role" "enum_processing_services_blk_table_table_role" DEFAULT 'parameters',
  	"table_mobile_mode" "enum_processing_services_blk_table_table_mobile_mode" DEFAULT 'cards',
  	"table_footnote" varchar,
  	"table_highlight_column" numeric,
  	"block_name" varchar
  );
  
  CREATE TABLE "processing_services_blk_steps_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"text" varchar,
  	"link_label" varchar,
  	"link_type" "enum_processing_services_blk_steps_items_link_type" DEFAULT 'doc',
  	"link_url" varchar,
  	"link_new_tab" boolean
  );
  
  CREATE TABLE "processing_services_blk_steps_buttons" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"kind" "enum_processing_services_blk_steps_buttons_kind" DEFAULT 'quiz',
  	"variant" "enum_processing_services_blk_steps_buttons_variant" DEFAULT 'primary',
  	"icon" varchar,
  	"form_key" "enum_processing_services_blk_steps_buttons_form_key",
  	"form_params" jsonb,
  	"link_type" "enum_processing_services_blk_steps_buttons_link_type" DEFAULT 'doc',
  	"link_url" varchar,
  	"link_new_tab" boolean,
  	"file_id" uuid
  );
  
  CREATE TABLE "processing_services_blk_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_processing_services_blk_steps_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_processing_services_blk_steps_background" DEFAULT 'auto',
  	"variant" "enum_processing_services_blk_steps_variant" DEFAULT 'horizontal',
  	"footnote" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "processing_services_blk_callout_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"lead" varchar,
  	"text" jsonb
  );
  
  CREATE TABLE "processing_services_blk_callout" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_processing_services_blk_callout_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_processing_services_blk_callout_background" DEFAULT 'auto',
  	"tone" "enum_processing_services_blk_callout_tone" DEFAULT 'warning',
  	"icon" varchar,
  	"title" varchar,
  	"body" jsonb,
  	"block_name" varchar
  );
  
  CREATE TABLE "processing_services_blk_terms_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"icon" varchar
  );
  
  CREATE TABLE "processing_services_blk_terms" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_processing_services_blk_terms_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_processing_services_blk_terms_background" DEFAULT 'auto',
  	"mode" "enum_processing_services_blk_terms_mode" DEFAULT 'global',
  	"variant" "enum_processing_services_blk_terms_variant" DEFAULT 'bar',
  	"block_name" varchar
  );
  
  CREATE TABLE "processing_services_blk_cards_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"text" varchar,
  	"link_type" "enum_processing_services_blk_cards_items_link_type" DEFAULT 'doc',
  	"link_url" varchar,
  	"link_label" varchar,
  	"link_new_tab" boolean,
  	"image_id" uuid,
  	"icon" varchar,
  	"price_hint" varchar,
  	"tone" "enum_processing_services_blk_cards_items_tone" DEFAULT 'default'
  );
  
  CREATE TABLE "processing_services_blk_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_processing_services_blk_cards_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_processing_services_blk_cards_background" DEFAULT 'auto',
  	"layout" "enum_processing_services_blk_cards_layout" DEFAULT 'g3',
  	"block_name" varchar
  );
  
  CREATE TABLE "processing_services_blk_coll_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_processing_services_blk_coll_cards_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_processing_services_blk_coll_cards_background" DEFAULT 'auto',
  	"source" "enum_processing_services_blk_coll_cards_source" DEFAULT 'glassTypes' NOT NULL,
  	"mode" "enum_processing_services_blk_coll_cards_mode" DEFAULT 'all',
  	"group" "enum_processing_services_blk_coll_cards_group",
  	"columns" "enum_processing_services_blk_coll_cards_columns" DEFAULT '3',
  	"show_prices" boolean,
  	"block_name" varchar
  );
  
  CREATE TABLE "processing_services_blk_prices" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_processing_services_blk_prices_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar DEFAULT 'ceny',
  	"background" "enum_processing_services_blk_prices_background" DEFAULT 'auto',
  	"variant" "enum_processing_services_blk_prices_variant" DEFAULT 'both',
  	"show_included" boolean DEFAULT true,
  	"show_caption" boolean DEFAULT true,
  	"show_promo" boolean,
  	"show_weight" boolean DEFAULT true,
  	"callout_from_conditions" boolean,
  	"block_name" varchar
  );
  
  CREATE TABLE "processing_services_blk_faq_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" jsonb
  );
  
  CREATE TABLE "processing_services_blk_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_processing_services_blk_faq_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_processing_services_blk_faq_background" DEFAULT 'auto',
  	"mode" "enum_processing_services_blk_faq_mode" DEFAULT 'doc',
  	"block_name" varchar
  );
  
  CREATE TABLE "processing_services_blk_cta_buttons" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"kind" "enum_processing_services_blk_cta_buttons_kind" DEFAULT 'quiz',
  	"variant" "enum_processing_services_blk_cta_buttons_variant" DEFAULT 'primary',
  	"icon" varchar,
  	"form_key" "enum_processing_services_blk_cta_buttons_form_key",
  	"form_params" jsonb,
  	"link_type" "enum_processing_services_blk_cta_buttons_link_type" DEFAULT 'doc',
  	"link_url" varchar,
  	"link_new_tab" boolean,
  	"file_id" uuid
  );
  
  CREATE TABLE "processing_services_blk_cta" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_processing_services_blk_cta_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_processing_services_blk_cta_background" DEFAULT 'auto',
  	"variant" "enum_processing_services_blk_cta_variant" DEFAULT 'buttons',
  	"tone" "enum_processing_services_blk_cta_tone" DEFAULT 'light',
  	"title" varchar,
  	"body" jsonb,
  	"side_text" varchar,
  	"link_type" "enum_processing_services_blk_cta_link_type" DEFAULT 'doc',
  	"link_url" varchar,
  	"link_label" varchar,
  	"link_new_tab" boolean,
  	"block_name" varchar
  );
  
  CREATE TABLE "processing_services_blk_compare_rows" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"topic" varchar NOT NULL,
  	"left" varchar,
  	"right" varchar
  );
  
  CREATE TABLE "processing_services_blk_compare" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_processing_services_blk_compare_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_processing_services_blk_compare_background" DEFAULT 'auto',
  	"topic_title" varchar DEFAULT 'Этап',
  	"left_title" varchar DEFAULT 'Когда заказываете на заводе сами',
  	"right_title" varchar DEFAULT 'Когда через Inex Glass',
  	"foot_link_type" "enum_processing_services_blk_compare_foot_link_type" DEFAULT 'doc',
  	"foot_link_url" varchar,
  	"foot_link_label" varchar,
  	"foot_link_new_tab" boolean,
  	"block_name" varchar
  );
  
  CREATE TABLE "processing_services_blk_download_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"description" varchar,
  	"file_id" uuid,
  	"file_missing" boolean
  );
  
  CREATE TABLE "processing_services_blk_download" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_processing_services_blk_download_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_processing_services_blk_download_background" DEFAULT 'auto',
  	"variant" "enum_processing_services_blk_download_variant" DEFAULT 'list',
  	"block_name" varchar
  );
  
  CREATE TABLE "processing_services_blk_holes" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_processing_services_blk_holes_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_processing_services_blk_holes_background" DEFAULT 'auto',
  	"default_thickness" "enum_processing_services_blk_holes_default_thickness" DEFAULT '10',
  	"show_scheme" boolean DEFAULT true,
  	"note" varchar,
  	"cta_label" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "processing_services_blk_weight" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_processing_services_blk_weight_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_processing_services_blk_weight_background" DEFAULT 'auto',
  	"default_mode" "enum_processing_services_blk_weight_default_mode" DEFAULT 'single',
  	"show_table" boolean DEFAULT true,
  	"show_formula" boolean DEFAULT true,
  	"block_name" varchar
  );
  
  CREATE TABLE "processing_services_blk_form_bullets" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "processing_services_blk_form" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_processing_services_blk_form_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_processing_services_blk_form_background" DEFAULT 'auto',
  	"form_key" "enum_processing_services_blk_form_form_key" NOT NULL,
  	"variant" "enum_processing_services_blk_form_variant" DEFAULT 'card',
  	"show_contacts" boolean,
  	"submit_label" varchar,
  	"file_label" varchar,
  	"source_label" varchar,
  	"params" jsonb,
  	"block_name" varchar
  );
  
  CREATE TABLE "processing_services_blk_snippet" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_processing_services_blk_snippet_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_processing_services_blk_snippet_background" DEFAULT 'auto',
  	"snippet_key" varchar NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "processing_services_blk_stats_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "processing_services_blk_stats" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_processing_services_blk_stats_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_processing_services_blk_stats_background" DEFAULT 'auto',
  	"variant" "enum_processing_services_blk_stats_variant" DEFAULT 'tiles',
  	"block_name" varchar
  );
  
  CREATE TABLE "processing_services_blk_objects" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_processing_services_blk_objects_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_processing_services_blk_objects_background" DEFAULT 'auto',
  	"mode" "enum_processing_services_blk_objects_mode" DEFAULT 'featured',
  	"limit" numeric DEFAULT 4,
  	"product_id" uuid,
  	"show_all_link" boolean DEFAULT true,
  	"all_link_label" varchar DEFAULT 'Все объекты',
  	"block_name" varchar
  );
  
  CREATE TABLE "processing_services_blk_articles" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_processing_services_blk_articles_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_processing_services_blk_articles_background" DEFAULT 'auto',
  	"mode" "enum_processing_services_blk_articles_mode" DEFAULT 'featured',
  	"limit" numeric DEFAULT 4,
  	"block_name" varchar
  );
  
  CREATE TABLE "processing_services_blk_wdw_left" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "processing_services_blk_wdw_right" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "processing_services_blk_wdw" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_processing_services_blk_wdw_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_processing_services_blk_wdw_background" DEFAULT 'auto',
  	"left_title" varchar DEFAULT 'Inex Glass',
  	"right_title" varchar DEFAULT 'Ваша бригада',
  	"strip_enabled" boolean,
  	"strip_title" varchar,
  	"strip_text" varchar,
  	"strip_button_label" varchar,
  	"strip_url" varchar DEFAULT 'https://inex.su',
  	"block_name" varchar
  );
  
  CREATE TABLE "processing_services_blk_systems_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"subtitle" varchar,
  	"where_fits" varchar,
  	"important" varchar,
  	"how_held" varchar,
  	"requires_in_glass" varchar,
  	"image_id" uuid,
  	"scheme_svg" varchar
  );
  
  CREATE TABLE "processing_services_blk_systems" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_processing_services_blk_systems_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_processing_services_blk_systems_background" DEFAULT 'auto',
  	"source" "enum_processing_services_blk_systems_source" DEFAULT 'doc',
  	"layout" "enum_processing_services_blk_systems_layout" DEFAULT 'cards',
  	"block_name" varchar
  );
  
  CREATE TABLE "processing_services_blk_gallery_images" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" uuid NOT NULL,
  	"alt" varchar NOT NULL,
  	"caption" varchar
  );
  
  CREATE TABLE "processing_services_blk_gallery" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_processing_services_blk_gallery_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_processing_services_blk_gallery_background" DEFAULT 'auto',
  	"layout" "enum_processing_services_blk_gallery_layout" DEFAULT 'grid',
  	"block_name" varchar
  );
  
  CREATE TABLE "processing_services_blk_two_cols" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_processing_services_blk_two_cols_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_processing_services_blk_two_cols_background" DEFAULT 'auto',
  	"left_heading" varchar,
  	"left_body" jsonb,
  	"right_heading" varchar,
  	"right_body" jsonb,
  	"block_name" varchar
  );
  
  CREATE TABLE "processing_services_blk_links_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_type" "enum_processing_services_blk_links_items_link_type" DEFAULT 'doc',
  	"link_url" varchar,
  	"link_label" varchar,
  	"link_new_tab" boolean,
  	"description" varchar
  );
  
  CREATE TABLE "processing_services_blk_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_processing_services_blk_links_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_processing_services_blk_links_background" DEFAULT 'auto',
  	"variant" "enum_processing_services_blk_links_variant" DEFAULT 'chips',
  	"label" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "processing_services_blk_contacts" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_processing_services_blk_contacts_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_processing_services_blk_contacts_background" DEFAULT 'auto',
  	"show_map" boolean DEFAULT true,
  	"show_locations" boolean DEFAULT true,
  	"show_hours" boolean DEFAULT true,
  	"block_name" varchar
  );
  
  CREATE TABLE "processing_services_blk_requisites" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_processing_services_blk_requisites_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar DEFAULT 'rekvizity',
  	"background" "enum_processing_services_blk_requisites_background" DEFAULT 'auto',
  	"show_download" boolean DEFAULT true,
  	"block_name" varchar
  );
  
  CREATE TABLE "processing_services_blk_team" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_processing_services_blk_team_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_processing_services_blk_team_background" DEFAULT 'auto',
  	"limit" numeric,
  	"empty_behavior" "enum_processing_services_blk_team_empty_behavior" DEFAULT 'hide',
  	"block_name" varchar
  );
  
  CREATE TABLE "processing_services_blk_quiz_cta" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_processing_services_blk_quiz_cta_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_processing_services_blk_quiz_cta_background" DEFAULT 'auto',
  	"text" varchar,
  	"button_label" varchar,
  	"prefill_type" "enum_processing_services_blk_quiz_cta_prefill_type",
  	"prefill_thickness" "enum_processing_services_blk_quiz_cta_prefill_thickness",
  	"prefill_kind" "enum_processing_services_blk_quiz_cta_prefill_kind",
  	"prefill_cta_label" varchar DEFAULT 'Рассчитать стоимость',
  	"prefill_secondary_form" "enum_processing_services_blk_quiz_cta_prefill_secondary_form" DEFAULT 'drawing',
  	"prefill_secondary_label" varchar DEFAULT 'Отправить чертёж',
  	"block_name" varchar
  );
  
  CREATE TABLE "processing_services" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"path" varchar,
  	"order" numeric,
  	"card_title" varchar,
  	"card_text" varchar,
  	"card_image_id" uuid,
  	"card_icon" varchar,
  	"card_price_hint" varchar,
  	"key_limit" varchar,
  	"hero_image_id" uuid,
  	"intro" jsonb,
  	"how_to_specify" jsonb,
  	"important_title" varchar DEFAULT 'Что важно знать до заказа',
  	"has_hole_calculator" boolean,
  	"cta_primary_label" varchar,
  	"cta_secondary_label" varchar,
  	"seo_h1" varchar,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"seo_noindex" boolean DEFAULT false,
  	"seo_canonical" varchar,
  	"seo_og_image_id" uuid,
  	"quiz_prefill_type" "enum_processing_services_quiz_prefill_type",
  	"quiz_prefill_thickness" "enum_processing_services_quiz_prefill_thickness",
  	"quiz_prefill_kind" "enum_processing_services_quiz_prefill_kind",
  	"quiz_prefill_cta_label" varchar DEFAULT 'Рассчитать стоимость',
  	"quiz_prefill_secondary_form" "enum_processing_services_quiz_prefill_secondary_form" DEFAULT 'drawing',
  	"quiz_prefill_secondary_label" varchar DEFAULT 'Отправить чертёж',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "processing_services_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"pages_id" uuid,
  	"glass_types_id" uuid,
  	"thicknesses_id" uuid,
  	"processing_services_id" uuid,
  	"constructions_id" uuid,
  	"articles_id" uuid,
  	"objects_id" uuid
  );
  
  CREATE TABLE "constructions_systems" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"subtitle" varchar,
  	"where_fits" varchar,
  	"important" varchar,
  	"how_held" varchar,
  	"requires_in_glass" varchar,
  	"image_id" uuid,
  	"scheme_svg" varchar
  );
  
  CREATE TABLE "constructions_profile_systems" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"note" varchar,
  	"url" varchar
  );
  
  CREATE TABLE "constructions_glass_bullets" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"body" jsonb
  );
  
  CREATE TABLE "constructions_tables_cols" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"align" "enum_constructions_tables_cols_align" DEFAULT 'left',
  	"numeric" boolean
  );
  
  CREATE TABLE "constructions_tables_rows_cells" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar,
  	"positive" boolean,
  	"href" varchar
  );
  
  CREATE TABLE "constructions_tables_rows" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"row_href" varchar
  );
  
  CREATE TABLE "constructions_tables" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"lead" varchar,
  	"role" "enum_constructions_tables_role" DEFAULT 'parameters',
  	"mobile_mode" "enum_constructions_tables_mobile_mode" DEFAULT 'cards',
  	"footnote" varchar
  );
  
  CREATE TABLE "constructions_who_does_what_wdw_left" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "constructions_who_does_what_wdw_right" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "constructions_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" jsonb
  );
  
  CREATE TABLE "constructions_blk_hero_eyebrow" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "constructions_blk_hero_buttons" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"kind" "enum_constructions_blk_hero_buttons_kind" DEFAULT 'quiz',
  	"variant" "enum_constructions_blk_hero_buttons_variant" DEFAULT 'primary',
  	"icon" varchar,
  	"form_key" "enum_constructions_blk_hero_buttons_form_key",
  	"form_params" jsonb,
  	"link_type" "enum_constructions_blk_hero_buttons_link_type" DEFAULT 'doc',
  	"link_url" varchar,
  	"link_new_tab" boolean,
  	"file_id" uuid
  );
  
  CREATE TABLE "constructions_blk_hero_photos" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" uuid,
  	"caption" varchar
  );
  
  CREATE TABLE "constructions_blk_hero_stats" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar,
  	"text" varchar
  );
  
  CREATE TABLE "constructions_blk_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_constructions_blk_hero_variant" DEFAULT 'ctHero',
  	"title_override" varchar,
  	"lead" jsonb,
  	"facts" varchar,
  	"strong" varchar,
  	"show_terms" boolean DEFAULT true,
  	"terms_mode" "enum_constructions_blk_hero_terms_mode" DEFAULT 'full',
  	"image_id" uuid,
  	"image_alt" varchar,
  	"big_number" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "constructions_blk_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_constructions_blk_text_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_constructions_blk_text_background" DEFAULT 'auto',
  	"content" jsonb,
  	"width" "enum_constructions_blk_text_width" DEFAULT 'normal',
  	"block_name" varchar
  );
  
  CREATE TABLE "constructions_blk_table_table_cols" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"align" "enum_constructions_blk_table_table_cols_align" DEFAULT 'left',
  	"numeric" boolean
  );
  
  CREATE TABLE "constructions_blk_table_table_rows_cells" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar,
  	"positive" boolean,
  	"href" varchar
  );
  
  CREATE TABLE "constructions_blk_table_table_rows" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"row_href" varchar
  );
  
  CREATE TABLE "constructions_blk_table" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_constructions_blk_table_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_constructions_blk_table_background" DEFAULT 'auto',
  	"table_caption" varchar,
  	"table_role" "enum_constructions_blk_table_table_role" DEFAULT 'parameters',
  	"table_mobile_mode" "enum_constructions_blk_table_table_mobile_mode" DEFAULT 'cards',
  	"table_footnote" varchar,
  	"table_highlight_column" numeric,
  	"block_name" varchar
  );
  
  CREATE TABLE "constructions_blk_steps_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"text" varchar,
  	"link_label" varchar,
  	"link_type" "enum_constructions_blk_steps_items_link_type" DEFAULT 'doc',
  	"link_url" varchar,
  	"link_new_tab" boolean
  );
  
  CREATE TABLE "constructions_blk_steps_buttons" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"kind" "enum_constructions_blk_steps_buttons_kind" DEFAULT 'quiz',
  	"variant" "enum_constructions_blk_steps_buttons_variant" DEFAULT 'primary',
  	"icon" varchar,
  	"form_key" "enum_constructions_blk_steps_buttons_form_key",
  	"form_params" jsonb,
  	"link_type" "enum_constructions_blk_steps_buttons_link_type" DEFAULT 'doc',
  	"link_url" varchar,
  	"link_new_tab" boolean,
  	"file_id" uuid
  );
  
  CREATE TABLE "constructions_blk_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_constructions_blk_steps_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_constructions_blk_steps_background" DEFAULT 'auto',
  	"variant" "enum_constructions_blk_steps_variant" DEFAULT 'horizontal',
  	"footnote" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "constructions_blk_callout_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"lead" varchar,
  	"text" jsonb
  );
  
  CREATE TABLE "constructions_blk_callout" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_constructions_blk_callout_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_constructions_blk_callout_background" DEFAULT 'auto',
  	"tone" "enum_constructions_blk_callout_tone" DEFAULT 'warning',
  	"icon" varchar,
  	"title" varchar,
  	"body" jsonb,
  	"block_name" varchar
  );
  
  CREATE TABLE "constructions_blk_terms_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"icon" varchar
  );
  
  CREATE TABLE "constructions_blk_terms" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_constructions_blk_terms_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_constructions_blk_terms_background" DEFAULT 'auto',
  	"mode" "enum_constructions_blk_terms_mode" DEFAULT 'global',
  	"variant" "enum_constructions_blk_terms_variant" DEFAULT 'bar',
  	"block_name" varchar
  );
  
  CREATE TABLE "constructions_blk_cards_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"text" varchar,
  	"link_type" "enum_constructions_blk_cards_items_link_type" DEFAULT 'doc',
  	"link_url" varchar,
  	"link_label" varchar,
  	"link_new_tab" boolean,
  	"image_id" uuid,
  	"icon" varchar,
  	"price_hint" varchar,
  	"tone" "enum_constructions_blk_cards_items_tone" DEFAULT 'default'
  );
  
  CREATE TABLE "constructions_blk_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_constructions_blk_cards_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_constructions_blk_cards_background" DEFAULT 'auto',
  	"layout" "enum_constructions_blk_cards_layout" DEFAULT 'g3',
  	"block_name" varchar
  );
  
  CREATE TABLE "constructions_blk_coll_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_constructions_blk_coll_cards_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_constructions_blk_coll_cards_background" DEFAULT 'auto',
  	"source" "enum_constructions_blk_coll_cards_source" DEFAULT 'glassTypes',
  	"mode" "enum_constructions_blk_coll_cards_mode" DEFAULT 'all',
  	"group" "enum_constructions_blk_coll_cards_group",
  	"columns" "enum_constructions_blk_coll_cards_columns" DEFAULT '3',
  	"show_prices" boolean,
  	"block_name" varchar
  );
  
  CREATE TABLE "constructions_blk_prices" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_constructions_blk_prices_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar DEFAULT 'ceny',
  	"background" "enum_constructions_blk_prices_background" DEFAULT 'auto',
  	"variant" "enum_constructions_blk_prices_variant" DEFAULT 'both',
  	"show_included" boolean DEFAULT true,
  	"show_caption" boolean DEFAULT true,
  	"show_promo" boolean,
  	"show_weight" boolean DEFAULT true,
  	"callout_from_conditions" boolean,
  	"block_name" varchar
  );
  
  CREATE TABLE "constructions_blk_faq_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" jsonb
  );
  
  CREATE TABLE "constructions_blk_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_constructions_blk_faq_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_constructions_blk_faq_background" DEFAULT 'auto',
  	"mode" "enum_constructions_blk_faq_mode" DEFAULT 'doc',
  	"block_name" varchar
  );
  
  CREATE TABLE "constructions_blk_cta_buttons" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"kind" "enum_constructions_blk_cta_buttons_kind" DEFAULT 'quiz',
  	"variant" "enum_constructions_blk_cta_buttons_variant" DEFAULT 'primary',
  	"icon" varchar,
  	"form_key" "enum_constructions_blk_cta_buttons_form_key",
  	"form_params" jsonb,
  	"link_type" "enum_constructions_blk_cta_buttons_link_type" DEFAULT 'doc',
  	"link_url" varchar,
  	"link_new_tab" boolean,
  	"file_id" uuid
  );
  
  CREATE TABLE "constructions_blk_cta" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_constructions_blk_cta_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_constructions_blk_cta_background" DEFAULT 'auto',
  	"variant" "enum_constructions_blk_cta_variant" DEFAULT 'buttons',
  	"tone" "enum_constructions_blk_cta_tone" DEFAULT 'light',
  	"title" varchar,
  	"body" jsonb,
  	"side_text" varchar,
  	"link_type" "enum_constructions_blk_cta_link_type" DEFAULT 'doc',
  	"link_url" varchar,
  	"link_label" varchar,
  	"link_new_tab" boolean,
  	"block_name" varchar
  );
  
  CREATE TABLE "constructions_blk_compare_rows" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"topic" varchar,
  	"left" varchar,
  	"right" varchar
  );
  
  CREATE TABLE "constructions_blk_compare" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_constructions_blk_compare_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_constructions_blk_compare_background" DEFAULT 'auto',
  	"topic_title" varchar DEFAULT 'Этап',
  	"left_title" varchar DEFAULT 'Когда заказываете на заводе сами',
  	"right_title" varchar DEFAULT 'Когда через Inex Glass',
  	"foot_link_type" "enum_constructions_blk_compare_foot_link_type" DEFAULT 'doc',
  	"foot_link_url" varchar,
  	"foot_link_label" varchar,
  	"foot_link_new_tab" boolean,
  	"block_name" varchar
  );
  
  CREATE TABLE "constructions_blk_download_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"description" varchar,
  	"file_id" uuid,
  	"file_missing" boolean
  );
  
  CREATE TABLE "constructions_blk_download" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_constructions_blk_download_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_constructions_blk_download_background" DEFAULT 'auto',
  	"variant" "enum_constructions_blk_download_variant" DEFAULT 'list',
  	"block_name" varchar
  );
  
  CREATE TABLE "constructions_blk_holes" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_constructions_blk_holes_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_constructions_blk_holes_background" DEFAULT 'auto',
  	"default_thickness" "enum_constructions_blk_holes_default_thickness" DEFAULT '10',
  	"show_scheme" boolean DEFAULT true,
  	"note" varchar,
  	"cta_label" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "constructions_blk_weight" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_constructions_blk_weight_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_constructions_blk_weight_background" DEFAULT 'auto',
  	"default_mode" "enum_constructions_blk_weight_default_mode" DEFAULT 'single',
  	"show_table" boolean DEFAULT true,
  	"show_formula" boolean DEFAULT true,
  	"block_name" varchar
  );
  
  CREATE TABLE "constructions_blk_form_bullets" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "constructions_blk_form" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_constructions_blk_form_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_constructions_blk_form_background" DEFAULT 'auto',
  	"form_key" "enum_constructions_blk_form_form_key",
  	"variant" "enum_constructions_blk_form_variant" DEFAULT 'card',
  	"show_contacts" boolean,
  	"submit_label" varchar,
  	"file_label" varchar,
  	"source_label" varchar,
  	"params" jsonb,
  	"block_name" varchar
  );
  
  CREATE TABLE "constructions_blk_snippet" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_constructions_blk_snippet_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_constructions_blk_snippet_background" DEFAULT 'auto',
  	"snippet_key" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "constructions_blk_stats_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar,
  	"text" varchar
  );
  
  CREATE TABLE "constructions_blk_stats" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_constructions_blk_stats_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_constructions_blk_stats_background" DEFAULT 'auto',
  	"variant" "enum_constructions_blk_stats_variant" DEFAULT 'tiles',
  	"block_name" varchar
  );
  
  CREATE TABLE "constructions_blk_objects" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_constructions_blk_objects_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_constructions_blk_objects_background" DEFAULT 'auto',
  	"mode" "enum_constructions_blk_objects_mode" DEFAULT 'featured',
  	"limit" numeric DEFAULT 4,
  	"product_id" uuid,
  	"show_all_link" boolean DEFAULT true,
  	"all_link_label" varchar DEFAULT 'Все объекты',
  	"block_name" varchar
  );
  
  CREATE TABLE "constructions_blk_articles" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_constructions_blk_articles_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_constructions_blk_articles_background" DEFAULT 'auto',
  	"mode" "enum_constructions_blk_articles_mode" DEFAULT 'featured',
  	"limit" numeric DEFAULT 4,
  	"block_name" varchar
  );
  
  CREATE TABLE "constructions_blk_wdw_left" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "constructions_blk_wdw_right" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "constructions_blk_wdw" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_constructions_blk_wdw_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_constructions_blk_wdw_background" DEFAULT 'auto',
  	"left_title" varchar DEFAULT 'Inex Glass',
  	"right_title" varchar DEFAULT 'Ваша бригада',
  	"strip_enabled" boolean,
  	"strip_title" varchar,
  	"strip_text" varchar,
  	"strip_button_label" varchar,
  	"strip_url" varchar DEFAULT 'https://inex.su',
  	"block_name" varchar
  );
  
  CREATE TABLE "constructions_blk_systems_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"subtitle" varchar,
  	"where_fits" varchar,
  	"important" varchar,
  	"how_held" varchar,
  	"requires_in_glass" varchar,
  	"image_id" uuid,
  	"scheme_svg" varchar
  );
  
  CREATE TABLE "constructions_blk_systems" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_constructions_blk_systems_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_constructions_blk_systems_background" DEFAULT 'auto',
  	"source" "enum_constructions_blk_systems_source" DEFAULT 'doc',
  	"layout" "enum_constructions_blk_systems_layout" DEFAULT 'cards',
  	"block_name" varchar
  );
  
  CREATE TABLE "constructions_blk_gallery_images" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" uuid,
  	"alt" varchar,
  	"caption" varchar
  );
  
  CREATE TABLE "constructions_blk_gallery" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_constructions_blk_gallery_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_constructions_blk_gallery_background" DEFAULT 'auto',
  	"layout" "enum_constructions_blk_gallery_layout" DEFAULT 'grid',
  	"block_name" varchar
  );
  
  CREATE TABLE "constructions_blk_two_cols" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_constructions_blk_two_cols_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_constructions_blk_two_cols_background" DEFAULT 'auto',
  	"left_heading" varchar,
  	"left_body" jsonb,
  	"right_heading" varchar,
  	"right_body" jsonb,
  	"block_name" varchar
  );
  
  CREATE TABLE "constructions_blk_links_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_type" "enum_constructions_blk_links_items_link_type" DEFAULT 'doc',
  	"link_url" varchar,
  	"link_label" varchar,
  	"link_new_tab" boolean,
  	"description" varchar
  );
  
  CREATE TABLE "constructions_blk_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_constructions_blk_links_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_constructions_blk_links_background" DEFAULT 'auto',
  	"variant" "enum_constructions_blk_links_variant" DEFAULT 'chips',
  	"label" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "constructions_blk_contacts" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_constructions_blk_contacts_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_constructions_blk_contacts_background" DEFAULT 'auto',
  	"show_map" boolean DEFAULT true,
  	"show_locations" boolean DEFAULT true,
  	"show_hours" boolean DEFAULT true,
  	"block_name" varchar
  );
  
  CREATE TABLE "constructions_blk_requisites" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_constructions_blk_requisites_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar DEFAULT 'rekvizity',
  	"background" "enum_constructions_blk_requisites_background" DEFAULT 'auto',
  	"show_download" boolean DEFAULT true,
  	"block_name" varchar
  );
  
  CREATE TABLE "constructions_blk_team" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_constructions_blk_team_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_constructions_blk_team_background" DEFAULT 'auto',
  	"limit" numeric,
  	"empty_behavior" "enum_constructions_blk_team_empty_behavior" DEFAULT 'hide',
  	"block_name" varchar
  );
  
  CREATE TABLE "constructions_blk_quiz_cta" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum_constructions_blk_quiz_cta_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum_constructions_blk_quiz_cta_background" DEFAULT 'auto',
  	"text" varchar,
  	"button_label" varchar,
  	"prefill_type" "enum_constructions_blk_quiz_cta_prefill_type",
  	"prefill_thickness" "enum_constructions_blk_quiz_cta_prefill_thickness",
  	"prefill_kind" "enum_constructions_blk_quiz_cta_prefill_kind",
  	"prefill_cta_label" varchar DEFAULT 'Рассчитать стоимость',
  	"prefill_secondary_form" "enum_constructions_blk_quiz_cta_prefill_secondary_form" DEFAULT 'drawing',
  	"prefill_secondary_label" varchar DEFAULT 'Отправить чертёж',
  	"block_name" varchar
  );
  
  CREATE TABLE "constructions_legacy_urls" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"url" varchar
  );
  
  CREATE TABLE "constructions" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"title" varchar,
  	"kind" "enum_constructions_kind" DEFAULT 'construction',
  	"group" "enum_constructions_group" DEFAULT 'constructions',
  	"parent_id" uuid,
  	"slug" varchar,
  	"path" varchar,
  	"breadcrumb_label" varchar,
  	"order" numeric,
  	"product_tag_id" uuid,
  	"card_title" varchar,
  	"card_text" varchar,
  	"card_image_id" uuid,
  	"card_icon" varchar,
  	"card_price_hint" varchar,
  	"hero_image_id" uuid,
  	"intro" jsonb,
  	"cta_primary_label" varchar,
  	"cta_secondary_label" varchar,
  	"secondary_form_key" "enum_constructions_secondary_form_key" DEFAULT 'drawing',
  	"systems_heading" varchar DEFAULT 'Какую систему выбрать',
  	"systems_layout" "enum_constructions_systems_layout" DEFAULT 'cards',
  	"glass_heading" varchar,
  	"risk_callout_enabled" boolean,
  	"risk_callout_title" varchar,
  	"risk_callout_body" jsonb,
  	"documents" jsonb,
  	"objects_heading" varchar,
  	"who_does_what_enabled" boolean,
  	"inex_su_bridge_enabled" boolean,
  	"inex_su_bridge_title" varchar,
  	"inex_su_bridge_text" varchar,
  	"inex_su_bridge_button_label" varchar,
  	"inex_su_bridge_url" varchar DEFAULT 'https://inex.su',
  	"snow_calc_block_enabled" boolean,
  	"snow_calc_block_title" varchar,
  	"snow_calc_block_body" jsonb,
  	"snow_calc_block_side_text" varchar,
  	"snow_calc_block_cta_label" varchar,
  	"snow_calc_block_form_params" jsonb,
  	"show_shower_configs" boolean,
  	"seo_h1" varchar,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"seo_noindex" boolean DEFAULT false,
  	"seo_canonical" varchar,
  	"seo_og_image_id" uuid,
  	"quiz_prefill_type" "enum_constructions_quiz_prefill_type",
  	"quiz_prefill_thickness" "enum_constructions_quiz_prefill_thickness",
  	"quiz_prefill_kind" "enum_constructions_quiz_prefill_kind",
  	"quiz_prefill_cta_label" varchar DEFAULT 'Рассчитать стоимость',
  	"quiz_prefill_secondary_form" "enum_constructions_quiz_prefill_secondary_form" DEFAULT 'drawing',
  	"quiz_prefill_secondary_label" varchar DEFAULT 'Отправить чертёж',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_constructions_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "constructions_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"pages_id" uuid,
  	"glass_types_id" uuid,
  	"thicknesses_id" uuid,
  	"processing_services_id" uuid,
  	"constructions_id" uuid,
  	"articles_id" uuid,
  	"objects_id" uuid
  );
  
  CREATE TABLE "_constructions_v_version_systems" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"name" varchar,
  	"subtitle" varchar,
  	"where_fits" varchar,
  	"important" varchar,
  	"how_held" varchar,
  	"requires_in_glass" varchar,
  	"image_id" uuid,
  	"scheme_svg" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_constructions_v_version_profile_systems" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"name" varchar,
  	"note" varchar,
  	"url" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_constructions_v_version_glass_bullets" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"body" jsonb,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_constructions_tables_cols_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"label" varchar,
  	"align" "enum__constructions_tables_cols_v_align" DEFAULT 'left',
  	"numeric" boolean,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_constructions_tables_rows_cells_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"value" varchar,
  	"positive" boolean,
  	"href" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_constructions_tables_rows_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"row_href" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_constructions_v_version_tables" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"lead" varchar,
  	"role" "enum__constructions_v_version_tables_role" DEFAULT 'parameters',
  	"mobile_mode" "enum__constructions_v_version_tables_mobile_mode" DEFAULT 'cards',
  	"footnote" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_constructions_who_does_what_wdw_left_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_constructions_who_does_what_wdw_right_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_constructions_v_version_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"question" varchar,
  	"answer" jsonb,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_constructions_blk_hero_v_eyebrow" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_constructions_blk_hero_v_buttons" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"label" varchar,
  	"kind" "enum__constructions_blk_hero_v_buttons_kind" DEFAULT 'quiz',
  	"variant" "enum__constructions_blk_hero_v_buttons_variant" DEFAULT 'primary',
  	"icon" varchar,
  	"form_key" "enum__constructions_blk_hero_v_buttons_form_key",
  	"form_params" jsonb,
  	"link_type" "enum__constructions_blk_hero_v_buttons_link_type" DEFAULT 'doc',
  	"link_url" varchar,
  	"link_new_tab" boolean,
  	"file_id" uuid,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_constructions_blk_hero_v_photos" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"image_id" uuid,
  	"caption" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_constructions_blk_hero_v_stats" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"value" varchar,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_constructions_blk_hero_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"variant" "enum__constructions_blk_hero_v_variant" DEFAULT 'ctHero',
  	"title_override" varchar,
  	"lead" jsonb,
  	"facts" varchar,
  	"strong" varchar,
  	"show_terms" boolean DEFAULT true,
  	"terms_mode" "enum__constructions_blk_hero_v_terms_mode" DEFAULT 'full',
  	"image_id" uuid,
  	"image_alt" varchar,
  	"big_number" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_constructions_blk_text_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum__constructions_blk_text_v_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum__constructions_blk_text_v_background" DEFAULT 'auto',
  	"content" jsonb,
  	"width" "enum__constructions_blk_text_v_width" DEFAULT 'normal',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_constructions_blk_table_table_cols_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"label" varchar,
  	"align" "enum__constructions_blk_table_table_cols_v_align" DEFAULT 'left',
  	"numeric" boolean,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_constructions_blk_table_table_rows_cells_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"value" varchar,
  	"positive" boolean,
  	"href" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_constructions_blk_table_table_rows_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"row_href" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_constructions_blk_table_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum__constructions_blk_table_v_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum__constructions_blk_table_v_background" DEFAULT 'auto',
  	"table_caption" varchar,
  	"table_role" "enum__constructions_blk_table_v_table_role" DEFAULT 'parameters',
  	"table_mobile_mode" "enum__constructions_blk_table_v_table_mobile_mode" DEFAULT 'cards',
  	"table_footnote" varchar,
  	"table_highlight_column" numeric,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_constructions_blk_steps_v_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"title" varchar,
  	"text" varchar,
  	"link_label" varchar,
  	"link_type" "enum__constructions_blk_steps_v_items_link_type" DEFAULT 'doc',
  	"link_url" varchar,
  	"link_new_tab" boolean,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_constructions_blk_steps_v_buttons" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"label" varchar,
  	"kind" "enum__constructions_blk_steps_v_buttons_kind" DEFAULT 'quiz',
  	"variant" "enum__constructions_blk_steps_v_buttons_variant" DEFAULT 'primary',
  	"icon" varchar,
  	"form_key" "enum__constructions_blk_steps_v_buttons_form_key",
  	"form_params" jsonb,
  	"link_type" "enum__constructions_blk_steps_v_buttons_link_type" DEFAULT 'doc',
  	"link_url" varchar,
  	"link_new_tab" boolean,
  	"file_id" uuid,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_constructions_blk_steps_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum__constructions_blk_steps_v_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum__constructions_blk_steps_v_background" DEFAULT 'auto',
  	"variant" "enum__constructions_blk_steps_v_variant" DEFAULT 'horizontal',
  	"footnote" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_constructions_blk_callout_v_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"lead" varchar,
  	"text" jsonb,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_constructions_blk_callout_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum__constructions_blk_callout_v_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum__constructions_blk_callout_v_background" DEFAULT 'auto',
  	"tone" "enum__constructions_blk_callout_v_tone" DEFAULT 'warning',
  	"icon" varchar,
  	"title" varchar,
  	"body" jsonb,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_constructions_blk_terms_v_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"text" varchar,
  	"icon" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_constructions_blk_terms_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum__constructions_blk_terms_v_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum__constructions_blk_terms_v_background" DEFAULT 'auto',
  	"mode" "enum__constructions_blk_terms_v_mode" DEFAULT 'global',
  	"variant" "enum__constructions_blk_terms_v_variant" DEFAULT 'bar',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_constructions_blk_cards_v_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"title" varchar,
  	"text" varchar,
  	"link_type" "enum__constructions_blk_cards_v_items_link_type" DEFAULT 'doc',
  	"link_url" varchar,
  	"link_label" varchar,
  	"link_new_tab" boolean,
  	"image_id" uuid,
  	"icon" varchar,
  	"price_hint" varchar,
  	"tone" "enum__constructions_blk_cards_v_items_tone" DEFAULT 'default',
  	"_uuid" varchar
  );
  
  CREATE TABLE "_constructions_blk_cards_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum__constructions_blk_cards_v_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum__constructions_blk_cards_v_background" DEFAULT 'auto',
  	"layout" "enum__constructions_blk_cards_v_layout" DEFAULT 'g3',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_constructions_blk_coll_cards_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum__constructions_blk_coll_cards_v_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum__constructions_blk_coll_cards_v_background" DEFAULT 'auto',
  	"source" "enum__constructions_blk_coll_cards_v_source" DEFAULT 'glassTypes',
  	"mode" "enum__constructions_blk_coll_cards_v_mode" DEFAULT 'all',
  	"group" "enum__constructions_blk_coll_cards_v_group",
  	"columns" "enum__constructions_blk_coll_cards_v_columns" DEFAULT '3',
  	"show_prices" boolean,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_constructions_blk_prices_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum__constructions_blk_prices_v_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar DEFAULT 'ceny',
  	"background" "enum__constructions_blk_prices_v_background" DEFAULT 'auto',
  	"variant" "enum__constructions_blk_prices_v_variant" DEFAULT 'both',
  	"show_included" boolean DEFAULT true,
  	"show_caption" boolean DEFAULT true,
  	"show_promo" boolean,
  	"show_weight" boolean DEFAULT true,
  	"callout_from_conditions" boolean,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_constructions_blk_faq_v_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"question" varchar,
  	"answer" jsonb,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_constructions_blk_faq_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum__constructions_blk_faq_v_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum__constructions_blk_faq_v_background" DEFAULT 'auto',
  	"mode" "enum__constructions_blk_faq_v_mode" DEFAULT 'doc',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_constructions_blk_cta_v_buttons" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"label" varchar,
  	"kind" "enum__constructions_blk_cta_v_buttons_kind" DEFAULT 'quiz',
  	"variant" "enum__constructions_blk_cta_v_buttons_variant" DEFAULT 'primary',
  	"icon" varchar,
  	"form_key" "enum__constructions_blk_cta_v_buttons_form_key",
  	"form_params" jsonb,
  	"link_type" "enum__constructions_blk_cta_v_buttons_link_type" DEFAULT 'doc',
  	"link_url" varchar,
  	"link_new_tab" boolean,
  	"file_id" uuid,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_constructions_blk_cta_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum__constructions_blk_cta_v_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum__constructions_blk_cta_v_background" DEFAULT 'auto',
  	"variant" "enum__constructions_blk_cta_v_variant" DEFAULT 'buttons',
  	"tone" "enum__constructions_blk_cta_v_tone" DEFAULT 'light',
  	"title" varchar,
  	"body" jsonb,
  	"side_text" varchar,
  	"link_type" "enum__constructions_blk_cta_v_link_type" DEFAULT 'doc',
  	"link_url" varchar,
  	"link_label" varchar,
  	"link_new_tab" boolean,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_constructions_blk_compare_v_rows" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"topic" varchar,
  	"left" varchar,
  	"right" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_constructions_blk_compare_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum__constructions_blk_compare_v_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum__constructions_blk_compare_v_background" DEFAULT 'auto',
  	"topic_title" varchar DEFAULT 'Этап',
  	"left_title" varchar DEFAULT 'Когда заказываете на заводе сами',
  	"right_title" varchar DEFAULT 'Когда через Inex Glass',
  	"foot_link_type" "enum__constructions_blk_compare_v_foot_link_type" DEFAULT 'doc',
  	"foot_link_url" varchar,
  	"foot_link_label" varchar,
  	"foot_link_new_tab" boolean,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_constructions_blk_download_v_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"title" varchar,
  	"description" varchar,
  	"file_id" uuid,
  	"file_missing" boolean,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_constructions_blk_download_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum__constructions_blk_download_v_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum__constructions_blk_download_v_background" DEFAULT 'auto',
  	"variant" "enum__constructions_blk_download_v_variant" DEFAULT 'list',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_constructions_blk_holes_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum__constructions_blk_holes_v_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum__constructions_blk_holes_v_background" DEFAULT 'auto',
  	"default_thickness" "enum__constructions_blk_holes_v_default_thickness" DEFAULT '10',
  	"show_scheme" boolean DEFAULT true,
  	"note" varchar,
  	"cta_label" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_constructions_blk_weight_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum__constructions_blk_weight_v_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum__constructions_blk_weight_v_background" DEFAULT 'auto',
  	"default_mode" "enum__constructions_blk_weight_v_default_mode" DEFAULT 'single',
  	"show_table" boolean DEFAULT true,
  	"show_formula" boolean DEFAULT true,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_constructions_blk_form_v_bullets" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_constructions_blk_form_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum__constructions_blk_form_v_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum__constructions_blk_form_v_background" DEFAULT 'auto',
  	"form_key" "enum__constructions_blk_form_v_form_key",
  	"variant" "enum__constructions_blk_form_v_variant" DEFAULT 'card',
  	"show_contacts" boolean,
  	"submit_label" varchar,
  	"file_label" varchar,
  	"source_label" varchar,
  	"params" jsonb,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_constructions_blk_snippet_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum__constructions_blk_snippet_v_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum__constructions_blk_snippet_v_background" DEFAULT 'auto',
  	"snippet_key" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_constructions_blk_stats_v_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"value" varchar,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_constructions_blk_stats_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum__constructions_blk_stats_v_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum__constructions_blk_stats_v_background" DEFAULT 'auto',
  	"variant" "enum__constructions_blk_stats_v_variant" DEFAULT 'tiles',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_constructions_blk_objects_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum__constructions_blk_objects_v_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum__constructions_blk_objects_v_background" DEFAULT 'auto',
  	"mode" "enum__constructions_blk_objects_v_mode" DEFAULT 'featured',
  	"limit" numeric DEFAULT 4,
  	"product_id" uuid,
  	"show_all_link" boolean DEFAULT true,
  	"all_link_label" varchar DEFAULT 'Все объекты',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_constructions_blk_articles_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum__constructions_blk_articles_v_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum__constructions_blk_articles_v_background" DEFAULT 'auto',
  	"mode" "enum__constructions_blk_articles_v_mode" DEFAULT 'featured',
  	"limit" numeric DEFAULT 4,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_constructions_blk_wdw_left_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_constructions_blk_wdw_right_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_constructions_blk_wdw_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum__constructions_blk_wdw_v_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum__constructions_blk_wdw_v_background" DEFAULT 'auto',
  	"left_title" varchar DEFAULT 'Inex Glass',
  	"right_title" varchar DEFAULT 'Ваша бригада',
  	"strip_enabled" boolean,
  	"strip_title" varchar,
  	"strip_text" varchar,
  	"strip_button_label" varchar,
  	"strip_url" varchar DEFAULT 'https://inex.su',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_constructions_blk_systems_v_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"name" varchar,
  	"subtitle" varchar,
  	"where_fits" varchar,
  	"important" varchar,
  	"how_held" varchar,
  	"requires_in_glass" varchar,
  	"image_id" uuid,
  	"scheme_svg" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_constructions_blk_systems_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum__constructions_blk_systems_v_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum__constructions_blk_systems_v_background" DEFAULT 'auto',
  	"source" "enum__constructions_blk_systems_v_source" DEFAULT 'doc',
  	"layout" "enum__constructions_blk_systems_v_layout" DEFAULT 'cards',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_constructions_blk_gallery_v_images" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"image_id" uuid,
  	"alt" varchar,
  	"caption" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_constructions_blk_gallery_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum__constructions_blk_gallery_v_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum__constructions_blk_gallery_v_background" DEFAULT 'auto',
  	"layout" "enum__constructions_blk_gallery_v_layout" DEFAULT 'grid',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_constructions_blk_two_cols_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum__constructions_blk_two_cols_v_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum__constructions_blk_two_cols_v_background" DEFAULT 'auto',
  	"left_heading" varchar,
  	"left_body" jsonb,
  	"right_heading" varchar,
  	"right_body" jsonb,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_constructions_blk_links_v_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"link_type" "enum__constructions_blk_links_v_items_link_type" DEFAULT 'doc',
  	"link_url" varchar,
  	"link_label" varchar,
  	"link_new_tab" boolean,
  	"description" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_constructions_blk_links_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum__constructions_blk_links_v_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum__constructions_blk_links_v_background" DEFAULT 'auto',
  	"variant" "enum__constructions_blk_links_v_variant" DEFAULT 'chips',
  	"label" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_constructions_blk_contacts_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum__constructions_blk_contacts_v_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum__constructions_blk_contacts_v_background" DEFAULT 'auto',
  	"show_map" boolean DEFAULT true,
  	"show_locations" boolean DEFAULT true,
  	"show_hours" boolean DEFAULT true,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_constructions_blk_requisites_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum__constructions_blk_requisites_v_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar DEFAULT 'rekvizity',
  	"background" "enum__constructions_blk_requisites_v_background" DEFAULT 'auto',
  	"show_download" boolean DEFAULT true,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_constructions_blk_team_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum__constructions_blk_team_v_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum__constructions_blk_team_v_background" DEFAULT 'auto',
  	"limit" numeric,
  	"empty_behavior" "enum__constructions_blk_team_v_empty_behavior" DEFAULT 'hide',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_constructions_blk_quiz_cta_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar,
  	"heading_level" "enum__constructions_blk_quiz_cta_v_heading_level" DEFAULT 'h2',
  	"sub" varchar,
  	"anchor_id" varchar,
  	"background" "enum__constructions_blk_quiz_cta_v_background" DEFAULT 'auto',
  	"text" varchar,
  	"button_label" varchar,
  	"prefill_type" "enum__constructions_blk_quiz_cta_v_prefill_type",
  	"prefill_thickness" "enum__constructions_blk_quiz_cta_v_prefill_thickness",
  	"prefill_kind" "enum__constructions_blk_quiz_cta_v_prefill_kind",
  	"prefill_cta_label" varchar DEFAULT 'Рассчитать стоимость',
  	"prefill_secondary_form" "enum__constructions_blk_quiz_cta_v_prefill_secondary_form" DEFAULT 'drawing',
  	"prefill_secondary_label" varchar DEFAULT 'Отправить чертёж',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_constructions_v_version_legacy_urls" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"url" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_constructions_v" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"parent_id" uuid,
  	"version_title" varchar,
  	"version_kind" "enum__constructions_v_version_kind" DEFAULT 'construction',
  	"version_group" "enum__constructions_v_version_group" DEFAULT 'constructions',
  	"version_parent_id" uuid,
  	"version_slug" varchar,
  	"version_path" varchar,
  	"version_breadcrumb_label" varchar,
  	"version_order" numeric,
  	"version_product_tag_id" uuid,
  	"version_card_title" varchar,
  	"version_card_text" varchar,
  	"version_card_image_id" uuid,
  	"version_card_icon" varchar,
  	"version_card_price_hint" varchar,
  	"version_hero_image_id" uuid,
  	"version_intro" jsonb,
  	"version_cta_primary_label" varchar,
  	"version_cta_secondary_label" varchar,
  	"version_secondary_form_key" "enum__constructions_v_version_secondary_form_key" DEFAULT 'drawing',
  	"version_systems_heading" varchar DEFAULT 'Какую систему выбрать',
  	"version_systems_layout" "enum__constructions_v_version_systems_layout" DEFAULT 'cards',
  	"version_glass_heading" varchar,
  	"version_risk_callout_enabled" boolean,
  	"version_risk_callout_title" varchar,
  	"version_risk_callout_body" jsonb,
  	"version_documents" jsonb,
  	"version_objects_heading" varchar,
  	"version_who_does_what_enabled" boolean,
  	"version_inex_su_bridge_enabled" boolean,
  	"version_inex_su_bridge_title" varchar,
  	"version_inex_su_bridge_text" varchar,
  	"version_inex_su_bridge_button_label" varchar,
  	"version_inex_su_bridge_url" varchar DEFAULT 'https://inex.su',
  	"version_snow_calc_block_enabled" boolean,
  	"version_snow_calc_block_title" varchar,
  	"version_snow_calc_block_body" jsonb,
  	"version_snow_calc_block_side_text" varchar,
  	"version_snow_calc_block_cta_label" varchar,
  	"version_snow_calc_block_form_params" jsonb,
  	"version_show_shower_configs" boolean,
  	"version_seo_h1" varchar,
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"version_seo_noindex" boolean DEFAULT false,
  	"version_seo_canonical" varchar,
  	"version_seo_og_image_id" uuid,
  	"version_quiz_prefill_type" "enum__constructions_v_version_quiz_prefill_type",
  	"version_quiz_prefill_thickness" "enum__constructions_v_version_quiz_prefill_thickness",
  	"version_quiz_prefill_kind" "enum__constructions_v_version_quiz_prefill_kind",
  	"version_quiz_prefill_cta_label" varchar DEFAULT 'Рассчитать стоимость',
  	"version_quiz_prefill_secondary_form" "enum__constructions_v_version_quiz_prefill_secondary_form" DEFAULT 'drawing',
  	"version_quiz_prefill_secondary_label" varchar DEFAULT 'Отправить чертёж',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__constructions_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "_constructions_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"pages_id" uuid,
  	"glass_types_id" uuid,
  	"thicknesses_id" uuid,
  	"processing_services_id" uuid,
  	"constructions_id" uuid,
  	"articles_id" uuid,
  	"objects_id" uuid
  );
  
  CREATE TABLE "shower_configs_glass_thicknesses" (
  	"order" integer NOT NULL,
  	"parent_id" uuid NOT NULL,
  	"value" "enum_shower_configs_glass_thicknesses",
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL
  );
  
  CREATE TABLE "shower_configs_gallery" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" uuid,
  	"alt" varchar
  );
  
  CREATE TABLE "shower_configs" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"name" varchar,
  	"slug" varchar,
  	"construction_id" uuid,
  	"config_type" "enum_shower_configs_config_type",
  	"image_id" uuid,
  	"description" varchar,
  	"order" numeric,
  	"legacy_url" varchar,
  	"legacy_id" varchar,
  	"source_url" varchar,
  	"import_notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_shower_configs_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_shower_configs_v_version_glass_thicknesses" (
  	"order" integer NOT NULL,
  	"parent_id" uuid NOT NULL,
  	"value" "enum__shower_configs_v_version_glass_thicknesses",
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL
  );
  
  CREATE TABLE "_shower_configs_v_version_gallery" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"image_id" uuid,
  	"alt" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_shower_configs_v" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"parent_id" uuid,
  	"version_name" varchar,
  	"version_slug" varchar,
  	"version_construction_id" uuid,
  	"version_config_type" "enum__shower_configs_v_version_config_type",
  	"version_image_id" uuid,
  	"version_description" varchar,
  	"version_order" numeric,
  	"version_legacy_url" varchar,
  	"version_legacy_id" varchar,
  	"version_source_url" varchar,
  	"version_import_notes" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__shower_configs_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "products" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"order" numeric,
  	"quiz_type" "enum_products_quiz_type",
  	"construction_id" uuid,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "object_types" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"order" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cities" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"region" varchar,
  	"order" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "lead_files" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"lead_id" uuid,
  	"original_name" varchar,
  	"kind" "enum_lead_files_kind",
  	"source" "enum_lead_files_source",
  	"sha256" varchar,
  	"size_bytes" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  CREATE TABLE "lead_statuses" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"order" numeric NOT NULL,
  	"color" varchar,
  	"is_default" boolean DEFAULT false,
  	"is_final" boolean DEFAULT false,
  	"requires_reason" boolean DEFAULT false,
  	"is_contract" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "leads_flags" (
  	"order" integer NOT NULL,
  	"parent_id" uuid NOT NULL,
  	"value" "enum_leads_flags",
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL
  );
  
  CREATE TABLE "leads_internal_comments" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"author_id" uuid,
  	"text" varchar NOT NULL,
  	"date" timestamp(3) with time zone
  );
  
  CREATE TABLE "leads" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"form_type" "enum_leads_form_type" NOT NULL,
  	"source_label" varchar,
  	"entry_page" varchar,
  	"page_url" varchar,
  	"referrer" varchar,
  	"utm_source" varchar,
  	"utm_medium" varchar,
  	"utm_campaign" varchar,
  	"utm_term" varchar,
  	"utm_content" varchar,
  	"utm_yclid" varchar,
  	"utm_gclid" varchar,
  	"utm_openstat" varchar,
  	"metrika_client_id" varchar,
  	"company" varchar,
  	"inn" varchar,
  	"name" varchar NOT NULL,
  	"phone" varchar NOT NULL,
  	"phone_raw" varchar,
  	"email" varchar,
  	"role" "enum_leads_role",
  	"city" varchar,
  	"area" numeric,
  	"product_type" "enum_leads_product_type",
  	"comment" varchar,
  	"answers" jsonb,
  	"answers_summary" varchar,
  	"estimate_from" numeric,
  	"estimate_price_date" timestamp(3) with time zone,
  	"estimate_shown" boolean DEFAULT false,
  	"status_id" uuid,
  	"status_changed_at" timestamp(3) with time zone,
  	"refuse_reason" varchar,
  	"assignee_id" uuid,
  	"is_duplicate" boolean DEFAULT false,
  	"duplicate_of_id" uuid,
  	"duplicate_reason" "enum_leads_duplicate_reason",
  	"consent_id" uuid,
  	"new_lead_notified_at" timestamp(3) with time zone,
  	"assignee_notified_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "leads_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"lead_files_id" uuid
  );
  
  CREATE TABLE "_leads_v_version_flags" (
  	"order" integer NOT NULL,
  	"parent_id" uuid NOT NULL,
  	"value" "enum__leads_v_version_flags",
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL
  );
  
  CREATE TABLE "_leads_v_version_internal_comments" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"author_id" uuid,
  	"text" varchar NOT NULL,
  	"date" timestamp(3) with time zone,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_leads_v" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"parent_id" uuid,
  	"version_form_type" "enum__leads_v_version_form_type" NOT NULL,
  	"version_source_label" varchar,
  	"version_entry_page" varchar,
  	"version_page_url" varchar,
  	"version_referrer" varchar,
  	"version_utm_source" varchar,
  	"version_utm_medium" varchar,
  	"version_utm_campaign" varchar,
  	"version_utm_term" varchar,
  	"version_utm_content" varchar,
  	"version_utm_yclid" varchar,
  	"version_utm_gclid" varchar,
  	"version_utm_openstat" varchar,
  	"version_metrika_client_id" varchar,
  	"version_company" varchar,
  	"version_inn" varchar,
  	"version_name" varchar NOT NULL,
  	"version_phone" varchar NOT NULL,
  	"version_phone_raw" varchar,
  	"version_email" varchar,
  	"version_role" "enum__leads_v_version_role",
  	"version_city" varchar,
  	"version_area" numeric,
  	"version_product_type" "enum__leads_v_version_product_type",
  	"version_comment" varchar,
  	"version_answers" jsonb,
  	"version_answers_summary" varchar,
  	"version_estimate_from" numeric,
  	"version_estimate_price_date" timestamp(3) with time zone,
  	"version_estimate_shown" boolean DEFAULT false,
  	"version_status_id" uuid,
  	"version_status_changed_at" timestamp(3) with time zone,
  	"version_refuse_reason" varchar,
  	"version_assignee_id" uuid,
  	"version_is_duplicate" boolean DEFAULT false,
  	"version_duplicate_of_id" uuid,
  	"version_duplicate_reason" "enum__leads_v_version_duplicate_reason",
  	"version_consent_id" uuid,
  	"version_new_lead_notified_at" timestamp(3) with time zone,
  	"version_assignee_notified_at" timestamp(3) with time zone,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_leads_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"lead_files_id" uuid
  );
  
  CREATE TABLE "orders_status_history" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"status" "enum_orders_status_history_status" NOT NULL,
  	"date" timestamp(3) with time zone NOT NULL,
  	"planned_date" timestamp(3) with time zone,
  	"note" varchar
  );
  
  CREATE TABLE "orders_pack_photos" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"photo_id" uuid NOT NULL,
  	"caption" varchar
  );
  
  CREATE TABLE "orders_documents" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"kind" "enum_orders_documents_kind",
  	"file_id" uuid NOT NULL
  );
  
  CREATE TABLE "orders" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"number" varchar,
  	"lead_id" uuid,
  	"company" varchar,
  	"composition" varchar,
  	"client_name" varchar,
  	"client_email" varchar,
  	"client_phone" varchar,
  	"notify_client" boolean DEFAULT true,
  	"manager_id" uuid,
  	"current_status" "enum_orders_current_status",
  	"client_comment_text" varchar,
  	"client_comment_updated_at" timestamp(3) with time zone,
  	"shipment_carrier" varchar,
  	"shipment_waybill" varchar,
  	"shipment_tracking_url" varchar,
  	"token_hash" varchar,
  	"token_created_at" timestamp(3) with time zone,
  	"token_reissue_count" numeric DEFAULT 0,
  	"revoked" boolean DEFAULT false,
  	"received_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone,
  	"last_notified_status" varchar,
  	"last_notified_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "order_files" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"kind" "enum_order_files_kind",
  	"caption" varchar,
  	"uploaded_by_id" uuid,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric,
  	"sizes_thumbnail_url" varchar,
  	"sizes_thumbnail_width" numeric,
  	"sizes_thumbnail_height" numeric,
  	"sizes_thumbnail_mime_type" varchar,
  	"sizes_thumbnail_filesize" numeric,
  	"sizes_thumbnail_filename" varchar,
  	"sizes_preview_url" varchar,
  	"sizes_preview_width" numeric,
  	"sizes_preview_height" numeric,
  	"sizes_preview_mime_type" varchar,
  	"sizes_preview_filesize" numeric,
  	"sizes_preview_filename" varchar
  );
  
  CREATE TABLE "consent_log" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"lead_id" uuid,
  	"form_type" varchar,
  	"consent_version" varchar,
  	"policy_version" varchar,
  	"consent_text" varchar,
  	"ip" varchar,
  	"user_agent" varchar,
  	"page_url" varchar,
  	"given_at" timestamp(3) with time zone,
  	"phone_hash" varchar,
  	"email_hash" varchar,
  	"anonymized_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "redirects" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"from" varchar NOT NULL,
  	"to" varchar NOT NULL,
  	"code" "enum_redirects_code" DEFAULT '301',
  	"active" boolean DEFAULT true,
  	"note" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "rate_limits" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"key" varchar NOT NULL,
  	"count" numeric DEFAULT 0 NOT NULL,
  	"window_start" timestamp(3) with time zone NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "prices_rows" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"thickness" numeric NOT NULL,
  	"price_from" numeric,
  	"on_request" boolean DEFAULT false,
  	"note" varchar
  );
  
  CREATE TABLE "prices_included" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "prices_extra" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "prices" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"price_date" timestamp(3) with time zone NOT NULL,
  	"stale_after_days" numeric DEFAULT 45 NOT NULL,
  	"caption" varchar DEFAULT 'Ориентировочная цена на {дата_цен}. Точная стоимость — в КП; цена в договоре фиксируется' NOT NULL,
  	"on_request_label" varchar DEFAULT 'по запросу' NOT NULL,
  	"stale_label" varchar DEFAULT 'Цена по расчёту' NOT NULL,
  	"included_title" varchar DEFAULT 'Входит в цену «от»' NOT NULL,
  	"extra_title" varchar DEFAULT 'Считается отдельно' NOT NULL,
  	"footnote" varchar DEFAULT 'Окончательная цена зависит от размеров, формы, обработки кромки, количества отверстий и объёма заказа.',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "_prices_v_version_rows" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"thickness" numeric NOT NULL,
  	"price_from" numeric,
  	"on_request" boolean DEFAULT false,
  	"note" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_prices_v_version_included" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"text" varchar NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_prices_v_version_extra" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"text" varchar NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_prices_v" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"version_price_date" timestamp(3) with time zone NOT NULL,
  	"version_stale_after_days" numeric DEFAULT 45 NOT NULL,
  	"version_caption" varchar DEFAULT 'Ориентировочная цена на {дата_цен}. Точная стоимость — в КП; цена в договоре фиксируется' NOT NULL,
  	"version_on_request_label" varchar DEFAULT 'по запросу' NOT NULL,
  	"version_stale_label" varchar DEFAULT 'Цена по расчёту' NOT NULL,
  	"version_included_title" varchar DEFAULT 'Входит в цену «от»' NOT NULL,
  	"version_extra_title" varchar DEFAULT 'Считается отдельно' NOT NULL,
  	"version_footnote" varchar DEFAULT 'Окончательная цена зависит от размеров, формы, обработки кромки, количества отверстий и объёма заказа.',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "promo" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"active" boolean DEFAULT false NOT NULL,
  	"text" varchar DEFAULT '−5% на закалённое стекло при заказе от 100 м²',
  	"badge_text" varchar,
  	"start_date" timestamp(3) with time zone,
  	"end_date" timestamp(3) with time zone,
  	"threshold_area" numeric DEFAULT 100 NOT NULL,
  	"discount_percent" numeric DEFAULT 5,
  	"link_url" varchar DEFAULT '/zakalennoe-steklo/#ceny' NOT NULL,
  	"quiz_hint" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "_promo_v" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"version_active" boolean DEFAULT false NOT NULL,
  	"version_text" varchar DEFAULT '−5% на закалённое стекло при заказе от 100 м²',
  	"version_badge_text" varchar,
  	"version_start_date" timestamp(3) with time zone,
  	"version_end_date" timestamp(3) with time zone,
  	"version_threshold_area" numeric DEFAULT 100 NOT NULL,
  	"version_discount_percent" numeric DEFAULT 5,
  	"version_link_url" varchar DEFAULT '/zakalennoe-steklo/#ceny' NOT NULL,
  	"version_quiz_hint" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "conditions_terms_bar" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL,
  	"icon" varchar DEFAULT 'check'
  );
  
  CREATE TABLE "conditions_terms_bar_short" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "conditions" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"min_order_m2" numeric DEFAULT 50 NOT NULL,
  	"min_order_text" varchar DEFAULT 'Заказы от 50 м²' NOT NULL,
  	"min_order_faq_text" varchar DEFAULT '50–100 м²' NOT NULL,
  	"lead_time_days" numeric DEFAULT 10 NOT NULL,
  	"triplex_lead_time_days" numeric DEFAULT 14 NOT NULL,
  	"lead_time_text" varchar DEFAULT 'Срок от 10 рабочих дней с даты договора' NOT NULL,
  	"triplex_lead_time_text" varchar DEFAULT 'Срок для триплекса — от 14 рабочих дней с даты договора' NOT NULL,
  	"kp_days_min" numeric DEFAULT 2 NOT NULL,
  	"kp_days_max" numeric DEFAULT 3 NOT NULL,
  	"kp_text" varchar DEFAULT 'КП в среднем за 2–3 рабочих дня' NOT NULL,
  	"price_fixed_text" varchar DEFAULT 'Цена в договоре фиксируется' NOT NULL,
  	"no_urgent_text" varchar DEFAULT 'Срочного изготовления нет' NOT NULL,
  	"no_install_text" varchar DEFAULT 'Монтаж не выполняем' NOT NULL,
  	"inline_text" varchar DEFAULT 'Заказы от 50 м², срок от 10 рабочих дней с даты договора, КП в среднем за 2–3 рабочих дня.' NOT NULL,
  	"callout_title" varchar DEFAULT 'Что нужно учесть' NOT NULL,
  	"callout" jsonb DEFAULT '{"root":{"type":"root","format":"","indent":0,"version":1,"direction":"ltr","children":[{"type":"paragraph","format":"","indent":0,"version":1,"direction":"ltr","textFormat":0,"textStyle":"","children":[{"type":"text","text":"Что нужно учесть: минимальный заказ — от 50 м². Размер одного стекла — от 150 × 300 до 3000 × 2000 мм. Срочного изготовления нет. Стекло заказчика не закаливаем.","format":0,"detail":0,"mode":"normal","style":"","version":1}]}]}}'::jsonb,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "contacts_phones" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"number" varchar NOT NULL,
  	"label" varchar,
  	"is_primary" boolean DEFAULT false
  );
  
  CREATE TABLE "contacts_emails" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"address" varchar NOT NULL,
  	"label" varchar,
  	"is_primary" boolean DEFAULT false
  );
  
  CREATE TABLE "contacts_locations_phones" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"number" varchar NOT NULL
  );
  
  CREATE TABLE "contacts_locations" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"type" "enum_contacts_locations_type" NOT NULL,
  	"title" varchar NOT NULL,
  	"city" varchar NOT NULL,
  	"address" varchar NOT NULL,
  	"postal_code" varchar,
  	"region" varchar,
  	"email" varchar,
  	"hours" varchar DEFAULT 'Пн–пт, 9:00–18:00' NOT NULL,
  	"lat" numeric,
  	"lng" numeric,
  	"map_url" varchar,
  	"local_business" boolean DEFAULT false
  );
  
  CREATE TABLE "contacts_messengers" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"url" varchar NOT NULL,
  	"icon" "enum_contacts_messengers_icon" DEFAULT 'other' NOT NULL
  );
  
  CREATE TABLE "contacts_same_as" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"url" varchar NOT NULL
  );
  
  CREATE TABLE "contacts" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"brand_name" varchar DEFAULT 'Inex Glass' NOT NULL,
  	"copyright_holder" varchar DEFAULT 'ИП Копылов А. М.' NOT NULL,
  	"work_hours_full" varchar DEFAULT 'Пн–пт, 9:00–18:00' NOT NULL,
  	"work_hours_short" varchar DEFAULT 'Пн–Пт 9–18' NOT NULL,
  	"call_prompt" varchar DEFAULT 'Звоните Пн–Пт 9–18' NOT NULL,
  	"inline_text" varchar DEFAULT '+7 (351) 247-05-57, sale@inex.su, пн–пт 9:00–18:00' NOT NULL,
  	"inex_su_url" varchar DEFAULT 'https://inex.su' NOT NULL,
  	"inex_su_footer_label" varchar DEFAULT 'Двери, лестницы и другие конструкции Inex — на inex.su' NOT NULL,
  	"inex_su_bridge_label" varchar DEFAULT 'Двери, лестницы и другие конструкции Inex — на inex.su' NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "_contacts_v_version_phones" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"number" varchar NOT NULL,
  	"label" varchar,
  	"is_primary" boolean DEFAULT false,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_contacts_v_version_emails" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"address" varchar NOT NULL,
  	"label" varchar,
  	"is_primary" boolean DEFAULT false,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_contacts_v_version_locations_phones" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"number" varchar NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_contacts_v_version_locations" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"key" varchar NOT NULL,
  	"type" "enum__contacts_v_version_locations_type" NOT NULL,
  	"title" varchar NOT NULL,
  	"city" varchar NOT NULL,
  	"address" varchar NOT NULL,
  	"postal_code" varchar,
  	"region" varchar,
  	"email" varchar,
  	"hours" varchar DEFAULT 'Пн–пт, 9:00–18:00' NOT NULL,
  	"lat" numeric,
  	"lng" numeric,
  	"map_url" varchar,
  	"local_business" boolean DEFAULT false,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_contacts_v_version_messengers" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"name" varchar NOT NULL,
  	"url" varchar NOT NULL,
  	"icon" "enum__contacts_v_version_messengers_icon" DEFAULT 'other' NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_contacts_v_version_same_as" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"url" varchar NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_contacts_v" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"version_brand_name" varchar DEFAULT 'Inex Glass' NOT NULL,
  	"version_copyright_holder" varchar DEFAULT 'ИП Копылов А. М.' NOT NULL,
  	"version_work_hours_full" varchar DEFAULT 'Пн–пт, 9:00–18:00' NOT NULL,
  	"version_work_hours_short" varchar DEFAULT 'Пн–Пт 9–18' NOT NULL,
  	"version_call_prompt" varchar DEFAULT 'Звоните Пн–Пт 9–18' NOT NULL,
  	"version_inline_text" varchar DEFAULT '+7 (351) 247-05-57, sale@inex.su, пн–пт 9:00–18:00' NOT NULL,
  	"version_inex_su_url" varchar DEFAULT 'https://inex.su' NOT NULL,
  	"version_inex_su_footer_label" varchar DEFAULT 'Двери, лестницы и другие конструкции Inex — на inex.su' NOT NULL,
  	"version_inex_su_bridge_label" varchar DEFAULT 'Двери, лестницы и другие конструкции Inex — на inex.su' NOT NULL,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "requisites" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"legal_name" varchar DEFAULT 'Индивидуальный предприниматель Копылов Александр Михайлович',
  	"short_name" varchar DEFAULT 'ИП Копылов А. М.',
  	"inn" varchar DEFAULT '744700156319',
  	"ogrnip" varchar DEFAULT '323745600102871',
  	"ogrn" varchar,
  	"kpp" varchar,
  	"actual_address" varchar DEFAULT 'г. Челябинск, Свердловский тракт, 7В',
  	"legal_address" varchar,
  	"publish_legal_address" boolean DEFAULT false,
  	"phone" varchar,
  	"email" varchar,
  	"bank_name" varchar DEFAULT 'ООО «Банк Точка»',
  	"bank_bik" varchar,
  	"bank_account" varchar,
  	"bank_corr_account" varchar,
  	"card_pdf_id" uuid,
  	"card_label" varchar DEFAULT 'Скачать карточку предприятия',
  	"inline_text" varchar DEFAULT 'ИП Копылов Александр Михайлович, ИНН 744700156319, ОГРНИП 323745600102871',
  	"pd_contact_email" varchar,
  	"pd_postal_address" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "_requisites_v" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"version_legal_name" varchar DEFAULT 'Индивидуальный предприниматель Копылов Александр Михайлович',
  	"version_short_name" varchar DEFAULT 'ИП Копылов А. М.',
  	"version_inn" varchar DEFAULT '744700156319',
  	"version_ogrnip" varchar DEFAULT '323745600102871',
  	"version_ogrn" varchar,
  	"version_kpp" varchar,
  	"version_actual_address" varchar DEFAULT 'г. Челябинск, Свердловский тракт, 7В',
  	"version_legal_address" varchar,
  	"version_publish_legal_address" boolean DEFAULT false,
  	"version_phone" varchar,
  	"version_email" varchar,
  	"version_bank_name" varchar DEFAULT 'ООО «Банк Точка»',
  	"version_bank_bik" varchar,
  	"version_bank_account" varchar,
  	"version_bank_corr_account" varchar,
  	"version_card_pdf_id" uuid,
  	"version_card_label" varchar DEFAULT 'Скачать карточку предприятия',
  	"version_inline_text" varchar DEFAULT 'ИП Копылов Александр Михайлович, ИНН 744700156319, ОГРНИП 323745600102871',
  	"version_pd_contact_email" varchar,
  	"version_pd_postal_address" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "tech_params_bent_radius" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"thickness_from" numeric DEFAULT 4 NOT NULL,
  	"thickness_to" numeric DEFAULT 6 NOT NULL,
  	"min_radius" numeric DEFAULT 1000 NOT NULL
  );
  
  CREATE TABLE "tech_params_tint_colors" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"key" "enum_tech_params_tint_colors_key" NOT NULL,
  	"name" varchar NOT NULL
  );
  
  CREATE TABLE "tech_params_holes_tolerance_ranges" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"from" numeric DEFAULT 0 NOT NULL,
  	"to" numeric,
  	"tolerance" numeric,
  	"label" varchar
  );
  
  CREATE TABLE "tech_params_carry_hints" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"up_to_kg" numeric,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "tech_params_gost_size_tolerance" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"size_range" varchar NOT NULL,
  	"up_to12" varchar NOT NULL,
  	"over12" varchar NOT NULL
  );
  
  CREATE TABLE "tech_params_gost_flatness" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"thickness_range" varchar NOT NULL,
  	"general" varchar NOT NULL,
  	"local" varchar NOT NULL
  );
  
  CREATE TABLE "tech_params_delivery_cities" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"kind" "enum_tech_params_delivery_cities_kind" DEFAULT 'city' NOT NULL
  );
  
  CREATE TABLE "tech_params_quiz_options_product_types" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"label" varchar NOT NULL,
  	"icon" varchar
  );
  
  CREATE TABLE "tech_params_quiz_options_kinds" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"label" varchar NOT NULL
  );
  
  CREATE TABLE "tech_params_quiz_options_edges_only_for_types" (
  	"order" integer NOT NULL,
  	"parent_id" varchar NOT NULL,
  	"value" "enum_tech_params_quiz_options_edges_only_for_types",
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL
  );
  
  CREATE TABLE "tech_params_quiz_options_edges" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"label" varchar NOT NULL
  );
  
  CREATE TABLE "tech_params_quiz_options_decor" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"label" varchar NOT NULL
  );
  
  CREATE TABLE "tech_params_quiz_options_stamp" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"label" varchar NOT NULL
  );
  
  CREATE TABLE "tech_params_quiz_options_packaging" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"label" varchar NOT NULL
  );
  
  CREATE TABLE "tech_params_quiz_options_roles" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"label" varchar NOT NULL
  );
  
  CREATE TABLE "tech_params" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"flat_min_w" numeric DEFAULT 150 NOT NULL,
  	"flat_min_h" numeric DEFAULT 300 NOT NULL,
  	"flat_max_w" numeric DEFAULT 3000 NOT NULL,
  	"flat_max_h" numeric DEFAULT 2000 NOT NULL,
  	"painted_thick_min" numeric DEFAULT 4 NOT NULL,
  	"painted_thick_max" numeric DEFAULT 15 NOT NULL,
  	"painted_min_w" numeric DEFAULT 350 NOT NULL,
  	"painted_min_h" numeric DEFAULT 150 NOT NULL,
  	"painted_max_w" numeric DEFAULT 3000 NOT NULL,
  	"painted_max_h" numeric DEFAULT 1600 NOT NULL,
  	"bent_thick_min" numeric DEFAULT 4 NOT NULL,
  	"bent_thick_max" numeric DEFAULT 12 NOT NULL,
  	"bent_min_w" numeric DEFAULT 150 NOT NULL,
  	"bent_min_h" numeric DEFAULT 350 NOT NULL,
  	"bent_max_w" numeric DEFAULT 1200 NOT NULL,
  	"bent_max_h" numeric DEFAULT 2000 NOT NULL,
  	"print_thick_min" numeric DEFAULT 4 NOT NULL,
  	"print_thick_max" numeric DEFAULT 15 NOT NULL,
  	"print_max_w" numeric DEFAULT 1100 NOT NULL,
  	"print_max_h" numeric DEFAULT 700 NOT NULL,
  	"facet_mirrors_only" boolean DEFAULT true NOT NULL,
  	"facet_min_glass_thickness" numeric DEFAULT 4 NOT NULL,
  	"mirrors_max_size_mm" numeric DEFAULT 2800 NOT NULL,
  	"triplex_raw_max_w" numeric DEFAULT 3500 NOT NULL,
  	"triplex_raw_max_h" numeric DEFAULT 2500 NOT NULL,
  	"triplex_tempered_max_w" numeric DEFAULT 3000 NOT NULL,
  	"triplex_tempered_max_h" numeric DEFAULT 2000 NOT NULL,
  	"holes_diameter_min" numeric DEFAULT 4 NOT NULL,
  	"holes_diameter_max" numeric DEFAULT 130 NOT NULL,
  	"holes_diameter_max_one_side" numeric DEFAULT 220 NOT NULL,
  	"holes_glass_min_w" numeric DEFAULT 250 NOT NULL,
  	"holes_glass_min_h" numeric DEFAULT 100 NOT NULL,
  	"holes_glass_max_w" numeric DEFAULT 3000 NOT NULL,
  	"holes_glass_max_h" numeric DEFAULT 1600 NOT NULL,
  	"holes_glass_thickness_min" numeric DEFAULT 4 NOT NULL,
  	"holes_glass_thickness_max_two_sides" numeric DEFAULT 25 NOT NULL,
  	"holes_glass_thickness_max_one_side" numeric DEFAULT 50 NOT NULL,
  	"holes_edge_factor" numeric DEFAULT 2 NOT NULL,
  	"holes_between_factor" numeric DEFAULT 2 NOT NULL,
  	"holes_corner_factor" numeric DEFAULT 6 NOT NULL,
  	"holes_min_diameter_factor" numeric DEFAULT 1 NOT NULL,
  	"holes_cutout_inner_radius_min" numeric DEFAULT 10 NOT NULL,
  	"weight_kg_per_m2_per_mm" numeric DEFAULT 2.5 NOT NULL,
  	"weight_film_unit_thickness" numeric DEFAULT 0.38 NOT NULL,
  	"weight_film_unit_weight" numeric DEFAULT 0.36 NOT NULL,
  	"gost_tempered" varchar DEFAULT 'ГОСТ 30698-2014' NOT NULL,
  	"gost_triplex" varchar DEFAULT 'ГОСТ 30826-2014' NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "tech_params_numbers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"number" numeric,
  	"order" integer NOT NULL,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL
  );
  
  CREATE TABLE "site_settings_holidays" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"date" timestamp(3) with time zone NOT NULL,
  	"name" varchar,
  	"is_workday" boolean DEFAULT false
  );
  
  CREATE TABLE "site_settings_stop_words" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"word" varchar NOT NULL,
  	"kind" "enum_site_settings_stop_words_kind" DEFAULT 'stem' NOT NULL
  );
  
  CREATE TABLE "site_settings_lead_emails" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"email" varchar NOT NULL
  );
  
  CREATE TABLE "site_settings_order_statuses" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"key" "enum_site_settings_order_statuses_key" NOT NULL,
  	"label" varchar NOT NULL,
  	"email_text" varchar
  );
  
  CREATE TABLE "site_settings" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"experience_text" varchar DEFAULT 'За 21 год специалисты Inex выполнили более 1500 проектов' NOT NULL,
  	"experience_years" numeric DEFAULT 21 NOT NULL,
  	"order_link_ttl_days" numeric DEFAULT 90 NOT NULL,
  	"analytics_metrika_id" varchar,
  	"analytics_webvisor" boolean DEFAULT true,
  	"analytics_yandex_verification" varchar,
  	"analytics_google_verification" varchar,
  	"index_now_enabled" boolean DEFAULT false,
  	"branding_logo_dark_id" uuid,
  	"branding_logo_light_id" uuid,
  	"branding_logo_png_id" uuid,
  	"branding_favicon_id" uuid,
  	"branding_default_og_image_id" uuid,
  	"notifications_from_name" varchar DEFAULT 'Inex Glass',
  	"notifications_reply_to" varchar,
  	"notifications_cc_assignee" boolean DEFAULT false,
  	"order_page_expired_title" varchar DEFAULT 'Ссылка больше не действует — свяжитесь с менеджером',
  	"order_page_empty_photos_text" varchar DEFAULT 'Фото появятся при отгрузке',
  	"order_page_copy_label" varchar DEFAULT 'Скопировать',
  	"order_page_copied_label" varchar DEFAULT 'Скопировано',
  	"order_page_email_subject" varchar DEFAULT 'Статус заказа № {номер}: {статус}',
  	"order_page_email_button" varchar DEFAULT 'Открыть страницу заказа',
  	"order_page_email_signature_title" varchar DEFAULT 'Менеджер по заказам Inex Glass',
  	"order_page_email_footer_note" varchar DEFAULT 'Вы получили это письмо, потому что оформили заказ в Inex Glass.',
  	"forms_thank_you_title" varchar DEFAULT 'Спасибо, заявка принята',
  	"forms_thank_you_text" varchar DEFAULT 'Менеджер проверит данные и пришлёт КП — в среднем за 2–3 рабочих дня. Связь — звонком и по e-mail',
  	"forms_submit_error_text" varchar DEFAULT 'Не удалось отправить заявку. Попробуйте ещё раз или позвоните: {телефон}',
  	"forms_antispam_min_seconds" numeric DEFAULT 3 NOT NULL,
  	"forms_antispam_max_hours" numeric DEFAULT 2 NOT NULL,
  	"consent_consent_version" varchar,
  	"consent_policy_version" varchar,
  	"consent_error_text" varchar DEFAULT 'Чтобы отправить заявку, отметьте согласие на обработку персональных данных',
  	"cookie_banner_text" varchar DEFAULT 'Мы используем файлы cookie и Яндекс.Метрику, чтобы сайт работал удобнее, а мы понимали, какие разделы полезны. Подробнее — в {политике обработки персональных данных}.',
  	"cookie_banner_accept_label" varchar DEFAULT 'Принять',
  	"cookie_banner_necessary_label" varchar DEFAULT 'Только необходимые',
  	"not_found_title" varchar DEFAULT 'Страница не найдена',
  	"not_found_text" varchar,
  	"not_found_links_title" varchar DEFAULT 'Разделы сайта',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "navigation_top_bar_company_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_type" "enum_navigation_top_bar_company_items_link_type" DEFAULT 'doc',
  	"link_url" varchar,
  	"link_label" varchar NOT NULL,
  	"link_new_tab" boolean
  );
  
  CREATE TABLE "navigation_top_bar_segments" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_type" "enum_navigation_top_bar_segments_link_type" DEFAULT 'doc',
  	"link_url" varchar,
  	"link_label" varchar NOT NULL,
  	"link_new_tab" boolean
  );
  
  CREATE TABLE "navigation_main_row_pills" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"key" "enum_navigation_main_row_pills_key" NOT NULL,
  	"label" varchar NOT NULL
  );
  
  CREATE TABLE "navigation_main_row_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_type" "enum_navigation_main_row_links_link_type" DEFAULT 'doc',
  	"link_url" varchar,
  	"link_label" varchar NOT NULL,
  	"link_new_tab" boolean
  );
  
  CREATE TABLE "navigation_section_row_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_type" "enum_navigation_section_row_items_link_type" DEFAULT 'doc',
  	"link_url" varchar,
  	"link_label" varchar NOT NULL,
  	"link_new_tab" boolean
  );
  
  CREATE TABLE "nav_mega_columns_links_sub_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"url" varchar NOT NULL
  );
  
  CREATE TABLE "nav_mega_columns_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_type" "enum_nav_mega_columns_links_link_type" DEFAULT 'doc',
  	"link_url" varchar,
  	"link_label" varchar NOT NULL,
  	"link_new_tab" boolean,
  	"hint" varchar
  );
  
  CREATE TABLE "nav_mega_columns" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL
  );
  
  CREATE TABLE "nav_mega" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"key" "enum_nav_mega_key" NOT NULL,
  	"label" varchar NOT NULL,
  	"promo_card_enabled" boolean DEFAULT true,
  	"promo_card_title" varchar DEFAULT 'Рассчитать стоимость по чертежу' NOT NULL,
  	"promo_card_text" varchar,
  	"promo_card_button_label" varchar DEFAULT 'Рассчитать стоимость' NOT NULL,
  	"promo_card_button_kind" "enum_nav_mega_promo_card_button_kind" DEFAULT 'quiz' NOT NULL,
  	"promo_card_url" varchar
  );
  
  CREATE TABLE "navigation_footer_columns_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_type" "enum_navigation_footer_columns_links_link_type" DEFAULT 'doc',
  	"link_url" varchar,
  	"link_label" varchar NOT NULL,
  	"link_new_tab" boolean
  );
  
  CREATE TABLE "navigation_footer_columns" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL
  );
  
  CREATE TABLE "navigation_footer_bottom_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_type" "enum_navigation_footer_bottom_links_link_type" DEFAULT 'doc',
  	"link_url" varchar,
  	"link_label" varchar NOT NULL,
  	"link_new_tab" boolean
  );
  
  CREATE TABLE "navigation" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"top_bar_company_label" varchar DEFAULT 'Компания' NOT NULL,
  	"top_bar_contact_label" varchar DEFAULT 'Связаться с нами' NOT NULL,
  	"top_bar_show_phone" boolean DEFAULT true,
  	"top_bar_show_email" boolean DEFAULT true,
  	"top_bar_show_messengers" boolean DEFAULT true,
  	"top_bar_callback_label" varchar DEFAULT 'Заказать звонок' NOT NULL,
  	"actions_link_label" varchar DEFAULT 'Акции' NOT NULL,
  	"actions_link_url" varchar DEFAULT '/zakalennoe-steklo/#ceny' NOT NULL,
  	"main_row_search_label" varchar DEFAULT 'Поиск по сайту' NOT NULL,
  	"main_row_search_placeholder" varchar DEFAULT 'Введите запрос' NOT NULL,
  	"main_row_cta_label" varchar DEFAULT 'Рассчитать стоимость' NOT NULL,
  	"main_row_callback_label" varchar DEFAULT 'Заказать звонок' NOT NULL,
  	"main_row_my_calc_label" varchar DEFAULT 'Мой расчёт' NOT NULL,
  	"main_row_my_calc_url" varchar DEFAULT '/raschet-stoimosti/?resume=1' NOT NULL,
  	"section_row_laptop_visible_count" numeric DEFAULT 5 NOT NULL,
  	"section_row_more_label" varchar DEFAULT 'Ещё' NOT NULL,
  	"footer_show_contacts_column" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "navigation_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"pages_id" uuid,
  	"glass_types_id" uuid,
  	"thicknesses_id" uuid,
  	"processing_services_id" uuid,
  	"constructions_id" uuid,
  	"articles_id" uuid,
  	"objects_id" uuid
  );
  
  CREATE TABLE "snippets_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"title" varchar,
  	"content" jsonb,
  	"cta_label" varchar,
  	"cta_form_key" "enum_snippets_items_cta_form_key" DEFAULT 'none',
  	"cta_form_params" jsonb,
  	"usage_note" varchar
  );
  
  CREATE TABLE "snippets" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "users" ADD COLUMN "phone" varchar;
  ALTER TABLE "users" ADD COLUMN "position" varchar;
  ALTER TABLE "users" ADD COLUMN "messenger_url" varchar;
  ALTER TABLE "users" ADD COLUMN "messenger_type" "enum_users_messenger_type";
  ALTER TABLE "users" ADD COLUMN "photo_id" uuid;
  ALTER TABLE "users" ADD COLUMN "notify_new_leads" boolean DEFAULT false;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "media_id" uuid;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "pages_id" uuid;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "articles_id" uuid;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "objects_id" uuid;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "team_id" uuid;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "thicknesses_id" uuid;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "thickness_groups_id" uuid;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "glass_types_id" uuid;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "processing_services_id" uuid;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "constructions_id" uuid;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "shower_configs_id" uuid;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "products_id" uuid;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "object_types_id" uuid;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "cities_id" uuid;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "lead_files_id" uuid;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "lead_statuses_id" uuid;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "leads_id" uuid;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "orders_id" uuid;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "order_files_id" uuid;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "consent_log_id" uuid;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "redirects_id" uuid;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "rate_limits_id" uuid;
  ALTER TABLE "pages_blk_hero_eyebrow" ADD CONSTRAINT "pages_blk_hero_eyebrow_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blk_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blk_hero_buttons" ADD CONSTRAINT "pages_blk_hero_buttons_file_id_media_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blk_hero_buttons" ADD CONSTRAINT "pages_blk_hero_buttons_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blk_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blk_hero_photos" ADD CONSTRAINT "pages_blk_hero_photos_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blk_hero_photos" ADD CONSTRAINT "pages_blk_hero_photos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blk_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blk_hero_stats" ADD CONSTRAINT "pages_blk_hero_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blk_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blk_hero" ADD CONSTRAINT "pages_blk_hero_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blk_hero" ADD CONSTRAINT "pages_blk_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blk_text" ADD CONSTRAINT "pages_blk_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blk_table_table_cols" ADD CONSTRAINT "pages_blk_table_table_cols_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blk_table"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blk_table_table_rows_cells" ADD CONSTRAINT "pages_blk_table_table_rows_cells_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blk_table_table_rows"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blk_table_table_rows" ADD CONSTRAINT "pages_blk_table_table_rows_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blk_table"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blk_table" ADD CONSTRAINT "pages_blk_table_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blk_steps_items" ADD CONSTRAINT "pages_blk_steps_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blk_steps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blk_steps_buttons" ADD CONSTRAINT "pages_blk_steps_buttons_file_id_media_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blk_steps_buttons" ADD CONSTRAINT "pages_blk_steps_buttons_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blk_steps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blk_steps" ADD CONSTRAINT "pages_blk_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blk_callout_items" ADD CONSTRAINT "pages_blk_callout_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blk_callout"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blk_callout" ADD CONSTRAINT "pages_blk_callout_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blk_terms_items" ADD CONSTRAINT "pages_blk_terms_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blk_terms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blk_terms" ADD CONSTRAINT "pages_blk_terms_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blk_cards_items" ADD CONSTRAINT "pages_blk_cards_items_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blk_cards_items" ADD CONSTRAINT "pages_blk_cards_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blk_cards"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blk_cards" ADD CONSTRAINT "pages_blk_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blk_coll_cards" ADD CONSTRAINT "pages_blk_coll_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blk_prices" ADD CONSTRAINT "pages_blk_prices_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blk_faq_items" ADD CONSTRAINT "pages_blk_faq_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blk_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blk_faq" ADD CONSTRAINT "pages_blk_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blk_cta_buttons" ADD CONSTRAINT "pages_blk_cta_buttons_file_id_media_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blk_cta_buttons" ADD CONSTRAINT "pages_blk_cta_buttons_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blk_cta"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blk_cta" ADD CONSTRAINT "pages_blk_cta_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blk_compare_rows" ADD CONSTRAINT "pages_blk_compare_rows_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blk_compare"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blk_compare" ADD CONSTRAINT "pages_blk_compare_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blk_download_items" ADD CONSTRAINT "pages_blk_download_items_file_id_media_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blk_download_items" ADD CONSTRAINT "pages_blk_download_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blk_download"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blk_download" ADD CONSTRAINT "pages_blk_download_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blk_holes" ADD CONSTRAINT "pages_blk_holes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blk_weight" ADD CONSTRAINT "pages_blk_weight_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blk_form_bullets" ADD CONSTRAINT "pages_blk_form_bullets_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blk_form"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blk_form" ADD CONSTRAINT "pages_blk_form_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blk_snippet" ADD CONSTRAINT "pages_blk_snippet_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blk_stats_items" ADD CONSTRAINT "pages_blk_stats_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blk_stats"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blk_stats" ADD CONSTRAINT "pages_blk_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blk_objects" ADD CONSTRAINT "pages_blk_objects_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blk_objects" ADD CONSTRAINT "pages_blk_objects_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blk_articles" ADD CONSTRAINT "pages_blk_articles_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blk_wdw_left" ADD CONSTRAINT "pages_blk_wdw_left_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blk_wdw"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blk_wdw_right" ADD CONSTRAINT "pages_blk_wdw_right_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blk_wdw"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blk_wdw" ADD CONSTRAINT "pages_blk_wdw_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blk_systems_items" ADD CONSTRAINT "pages_blk_systems_items_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blk_systems_items" ADD CONSTRAINT "pages_blk_systems_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blk_systems"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blk_systems" ADD CONSTRAINT "pages_blk_systems_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blk_gallery_images" ADD CONSTRAINT "pages_blk_gallery_images_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blk_gallery_images" ADD CONSTRAINT "pages_blk_gallery_images_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blk_gallery"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blk_gallery" ADD CONSTRAINT "pages_blk_gallery_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blk_two_cols" ADD CONSTRAINT "pages_blk_two_cols_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blk_links_items" ADD CONSTRAINT "pages_blk_links_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blk_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blk_links" ADD CONSTRAINT "pages_blk_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blk_contacts" ADD CONSTRAINT "pages_blk_contacts_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blk_requisites" ADD CONSTRAINT "pages_blk_requisites_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blk_team" ADD CONSTRAINT "pages_blk_team_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blk_quiz_cta" ADD CONSTRAINT "pages_blk_quiz_cta_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_faq" ADD CONSTRAINT "pages_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_legacy_urls" ADD CONSTRAINT "pages_legacy_urls_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages" ADD CONSTRAINT "pages_parent_id_pages_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages" ADD CONSTRAINT "pages_seo_og_image_id_media_id_fk" FOREIGN KEY ("seo_og_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_rels" ADD CONSTRAINT "pages_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_rels" ADD CONSTRAINT "pages_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_rels" ADD CONSTRAINT "pages_rels_glass_types_fk" FOREIGN KEY ("glass_types_id") REFERENCES "public"."glass_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_rels" ADD CONSTRAINT "pages_rels_thicknesses_fk" FOREIGN KEY ("thicknesses_id") REFERENCES "public"."thicknesses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_rels" ADD CONSTRAINT "pages_rels_processing_services_fk" FOREIGN KEY ("processing_services_id") REFERENCES "public"."processing_services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_rels" ADD CONSTRAINT "pages_rels_constructions_fk" FOREIGN KEY ("constructions_id") REFERENCES "public"."constructions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_rels" ADD CONSTRAINT "pages_rels_articles_fk" FOREIGN KEY ("articles_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_rels" ADD CONSTRAINT "pages_rels_objects_fk" FOREIGN KEY ("objects_id") REFERENCES "public"."objects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_blk_hero_v_eyebrow" ADD CONSTRAINT "_pages_blk_hero_v_eyebrow_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_blk_hero_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_blk_hero_v_buttons" ADD CONSTRAINT "_pages_blk_hero_v_buttons_file_id_media_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_blk_hero_v_buttons" ADD CONSTRAINT "_pages_blk_hero_v_buttons_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_blk_hero_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_blk_hero_v_photos" ADD CONSTRAINT "_pages_blk_hero_v_photos_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_blk_hero_v_photos" ADD CONSTRAINT "_pages_blk_hero_v_photos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_blk_hero_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_blk_hero_v_stats" ADD CONSTRAINT "_pages_blk_hero_v_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_blk_hero_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_blk_hero_v" ADD CONSTRAINT "_pages_blk_hero_v_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_blk_hero_v" ADD CONSTRAINT "_pages_blk_hero_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_blk_text_v" ADD CONSTRAINT "_pages_blk_text_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_blk_table_table_cols_v" ADD CONSTRAINT "_pages_blk_table_table_cols_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_blk_table_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_blk_table_table_rows_cells_v" ADD CONSTRAINT "_pages_blk_table_table_rows_cells_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_blk_table_table_rows_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_blk_table_table_rows_v" ADD CONSTRAINT "_pages_blk_table_table_rows_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_blk_table_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_blk_table_v" ADD CONSTRAINT "_pages_blk_table_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_blk_steps_v_items" ADD CONSTRAINT "_pages_blk_steps_v_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_blk_steps_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_blk_steps_v_buttons" ADD CONSTRAINT "_pages_blk_steps_v_buttons_file_id_media_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_blk_steps_v_buttons" ADD CONSTRAINT "_pages_blk_steps_v_buttons_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_blk_steps_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_blk_steps_v" ADD CONSTRAINT "_pages_blk_steps_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_blk_callout_v_items" ADD CONSTRAINT "_pages_blk_callout_v_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_blk_callout_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_blk_callout_v" ADD CONSTRAINT "_pages_blk_callout_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_blk_terms_v_items" ADD CONSTRAINT "_pages_blk_terms_v_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_blk_terms_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_blk_terms_v" ADD CONSTRAINT "_pages_blk_terms_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_blk_cards_v_items" ADD CONSTRAINT "_pages_blk_cards_v_items_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_blk_cards_v_items" ADD CONSTRAINT "_pages_blk_cards_v_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_blk_cards_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_blk_cards_v" ADD CONSTRAINT "_pages_blk_cards_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_blk_coll_cards_v" ADD CONSTRAINT "_pages_blk_coll_cards_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_blk_prices_v" ADD CONSTRAINT "_pages_blk_prices_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_blk_faq_v_items" ADD CONSTRAINT "_pages_blk_faq_v_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_blk_faq_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_blk_faq_v" ADD CONSTRAINT "_pages_blk_faq_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_blk_cta_v_buttons" ADD CONSTRAINT "_pages_blk_cta_v_buttons_file_id_media_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_blk_cta_v_buttons" ADD CONSTRAINT "_pages_blk_cta_v_buttons_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_blk_cta_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_blk_cta_v" ADD CONSTRAINT "_pages_blk_cta_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_blk_compare_v_rows" ADD CONSTRAINT "_pages_blk_compare_v_rows_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_blk_compare_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_blk_compare_v" ADD CONSTRAINT "_pages_blk_compare_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_blk_download_v_items" ADD CONSTRAINT "_pages_blk_download_v_items_file_id_media_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_blk_download_v_items" ADD CONSTRAINT "_pages_blk_download_v_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_blk_download_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_blk_download_v" ADD CONSTRAINT "_pages_blk_download_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_blk_holes_v" ADD CONSTRAINT "_pages_blk_holes_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_blk_weight_v" ADD CONSTRAINT "_pages_blk_weight_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_blk_form_v_bullets" ADD CONSTRAINT "_pages_blk_form_v_bullets_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_blk_form_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_blk_form_v" ADD CONSTRAINT "_pages_blk_form_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_blk_snippet_v" ADD CONSTRAINT "_pages_blk_snippet_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_blk_stats_v_items" ADD CONSTRAINT "_pages_blk_stats_v_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_blk_stats_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_blk_stats_v" ADD CONSTRAINT "_pages_blk_stats_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_blk_objects_v" ADD CONSTRAINT "_pages_blk_objects_v_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_blk_objects_v" ADD CONSTRAINT "_pages_blk_objects_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_blk_articles_v" ADD CONSTRAINT "_pages_blk_articles_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_blk_wdw_left_v" ADD CONSTRAINT "_pages_blk_wdw_left_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_blk_wdw_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_blk_wdw_right_v" ADD CONSTRAINT "_pages_blk_wdw_right_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_blk_wdw_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_blk_wdw_v" ADD CONSTRAINT "_pages_blk_wdw_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_blk_systems_v_items" ADD CONSTRAINT "_pages_blk_systems_v_items_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_blk_systems_v_items" ADD CONSTRAINT "_pages_blk_systems_v_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_blk_systems_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_blk_systems_v" ADD CONSTRAINT "_pages_blk_systems_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_blk_gallery_v_images" ADD CONSTRAINT "_pages_blk_gallery_v_images_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_blk_gallery_v_images" ADD CONSTRAINT "_pages_blk_gallery_v_images_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_blk_gallery_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_blk_gallery_v" ADD CONSTRAINT "_pages_blk_gallery_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_blk_two_cols_v" ADD CONSTRAINT "_pages_blk_two_cols_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_blk_links_v_items" ADD CONSTRAINT "_pages_blk_links_v_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_blk_links_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_blk_links_v" ADD CONSTRAINT "_pages_blk_links_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_blk_contacts_v" ADD CONSTRAINT "_pages_blk_contacts_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_blk_requisites_v" ADD CONSTRAINT "_pages_blk_requisites_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_blk_team_v" ADD CONSTRAINT "_pages_blk_team_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_blk_quiz_cta_v" ADD CONSTRAINT "_pages_blk_quiz_cta_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_version_faq" ADD CONSTRAINT "_pages_v_version_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_version_legacy_urls" ADD CONSTRAINT "_pages_v_version_legacy_urls_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_parent_id_pages_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_version_parent_id_pages_id_fk" FOREIGN KEY ("version_parent_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_version_seo_og_image_id_media_id_fk" FOREIGN KEY ("version_seo_og_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_rels" ADD CONSTRAINT "_pages_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_rels" ADD CONSTRAINT "_pages_v_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_rels" ADD CONSTRAINT "_pages_v_rels_glass_types_fk" FOREIGN KEY ("glass_types_id") REFERENCES "public"."glass_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_rels" ADD CONSTRAINT "_pages_v_rels_thicknesses_fk" FOREIGN KEY ("thicknesses_id") REFERENCES "public"."thicknesses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_rels" ADD CONSTRAINT "_pages_v_rels_processing_services_fk" FOREIGN KEY ("processing_services_id") REFERENCES "public"."processing_services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_rels" ADD CONSTRAINT "_pages_v_rels_constructions_fk" FOREIGN KEY ("constructions_id") REFERENCES "public"."constructions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_rels" ADD CONSTRAINT "_pages_v_rels_articles_fk" FOREIGN KEY ("articles_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_rels" ADD CONSTRAINT "_pages_v_rels_objects_fk" FOREIGN KEY ("objects_id") REFERENCES "public"."objects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "articles_tools" ADD CONSTRAINT "articles_tools_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "articles" ADD CONSTRAINT "articles_hero_image_id_media_id_fk" FOREIGN KEY ("hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "articles" ADD CONSTRAINT "articles_author_id_team_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."team"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "articles" ADD CONSTRAINT "articles_card_image_id_media_id_fk" FOREIGN KEY ("card_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "articles" ADD CONSTRAINT "articles_seo_og_image_id_media_id_fk" FOREIGN KEY ("seo_og_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "articles_rels" ADD CONSTRAINT "articles_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "articles_rels" ADD CONSTRAINT "articles_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "articles_rels" ADD CONSTRAINT "articles_rels_glass_types_fk" FOREIGN KEY ("glass_types_id") REFERENCES "public"."glass_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "articles_rels" ADD CONSTRAINT "articles_rels_thicknesses_fk" FOREIGN KEY ("thicknesses_id") REFERENCES "public"."thicknesses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "articles_rels" ADD CONSTRAINT "articles_rels_processing_services_fk" FOREIGN KEY ("processing_services_id") REFERENCES "public"."processing_services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "articles_rels" ADD CONSTRAINT "articles_rels_constructions_fk" FOREIGN KEY ("constructions_id") REFERENCES "public"."constructions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "articles_rels" ADD CONSTRAINT "articles_rels_articles_fk" FOREIGN KEY ("articles_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "articles_rels" ADD CONSTRAINT "articles_rels_objects_fk" FOREIGN KEY ("objects_id") REFERENCES "public"."objects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_articles_v_version_tools" ADD CONSTRAINT "_articles_v_version_tools_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_articles_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_articles_v" ADD CONSTRAINT "_articles_v_parent_id_articles_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_articles_v" ADD CONSTRAINT "_articles_v_version_hero_image_id_media_id_fk" FOREIGN KEY ("version_hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_articles_v" ADD CONSTRAINT "_articles_v_version_author_id_team_id_fk" FOREIGN KEY ("version_author_id") REFERENCES "public"."team"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_articles_v" ADD CONSTRAINT "_articles_v_version_card_image_id_media_id_fk" FOREIGN KEY ("version_card_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_articles_v" ADD CONSTRAINT "_articles_v_version_seo_og_image_id_media_id_fk" FOREIGN KEY ("version_seo_og_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_articles_v_rels" ADD CONSTRAINT "_articles_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_articles_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_articles_v_rels" ADD CONSTRAINT "_articles_v_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_articles_v_rels" ADD CONSTRAINT "_articles_v_rels_glass_types_fk" FOREIGN KEY ("glass_types_id") REFERENCES "public"."glass_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_articles_v_rels" ADD CONSTRAINT "_articles_v_rels_thicknesses_fk" FOREIGN KEY ("thicknesses_id") REFERENCES "public"."thicknesses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_articles_v_rels" ADD CONSTRAINT "_articles_v_rels_processing_services_fk" FOREIGN KEY ("processing_services_id") REFERENCES "public"."processing_services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_articles_v_rels" ADD CONSTRAINT "_articles_v_rels_constructions_fk" FOREIGN KEY ("constructions_id") REFERENCES "public"."constructions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_articles_v_rels" ADD CONSTRAINT "_articles_v_rels_articles_fk" FOREIGN KEY ("articles_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_articles_v_rels" ADD CONSTRAINT "_articles_v_rels_objects_fk" FOREIGN KEY ("objects_id") REFERENCES "public"."objects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "objects_spec" ADD CONSTRAINT "objects_spec_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."objects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "objects_chips" ADD CONSTRAINT "objects_chips_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."objects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "objects_photos" ADD CONSTRAINT "objects_photos_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "objects_photos" ADD CONSTRAINT "objects_photos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."objects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "objects_legacy_urls" ADD CONSTRAINT "objects_legacy_urls_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."objects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "objects" ADD CONSTRAINT "objects_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "objects" ADD CONSTRAINT "objects_object_type_id_object_types_id_fk" FOREIGN KEY ("object_type_id") REFERENCES "public"."object_types"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "objects" ADD CONSTRAINT "objects_seo_og_image_id_media_id_fk" FOREIGN KEY ("seo_og_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "objects_rels" ADD CONSTRAINT "objects_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."objects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "objects_rels" ADD CONSTRAINT "objects_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "objects_rels" ADD CONSTRAINT "objects_rels_objects_fk" FOREIGN KEY ("objects_id") REFERENCES "public"."objects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_objects_v_version_spec" ADD CONSTRAINT "_objects_v_version_spec_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_objects_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_objects_v_version_chips" ADD CONSTRAINT "_objects_v_version_chips_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_objects_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_objects_v_version_photos" ADD CONSTRAINT "_objects_v_version_photos_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_objects_v_version_photos" ADD CONSTRAINT "_objects_v_version_photos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_objects_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_objects_v_version_legacy_urls" ADD CONSTRAINT "_objects_v_version_legacy_urls_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_objects_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_objects_v" ADD CONSTRAINT "_objects_v_parent_id_objects_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."objects"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_objects_v" ADD CONSTRAINT "_objects_v_version_city_id_cities_id_fk" FOREIGN KEY ("version_city_id") REFERENCES "public"."cities"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_objects_v" ADD CONSTRAINT "_objects_v_version_object_type_id_object_types_id_fk" FOREIGN KEY ("version_object_type_id") REFERENCES "public"."object_types"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_objects_v" ADD CONSTRAINT "_objects_v_version_seo_og_image_id_media_id_fk" FOREIGN KEY ("version_seo_og_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_objects_v_rels" ADD CONSTRAINT "_objects_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_objects_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_objects_v_rels" ADD CONSTRAINT "_objects_v_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_objects_v_rels" ADD CONSTRAINT "_objects_v_rels_objects_fk" FOREIGN KEY ("objects_id") REFERENCES "public"."objects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "team" ADD CONSTRAINT "team_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "thicknesses_faq_override" ADD CONSTRAINT "thicknesses_faq_override_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."thicknesses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "thicknesses_blk_hero_eyebrow" ADD CONSTRAINT "thicknesses_blk_hero_eyebrow_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."thicknesses_blk_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "thicknesses_blk_hero_buttons" ADD CONSTRAINT "thicknesses_blk_hero_buttons_file_id_media_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "thicknesses_blk_hero_buttons" ADD CONSTRAINT "thicknesses_blk_hero_buttons_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."thicknesses_blk_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "thicknesses_blk_hero_photos" ADD CONSTRAINT "thicknesses_blk_hero_photos_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "thicknesses_blk_hero_photos" ADD CONSTRAINT "thicknesses_blk_hero_photos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."thicknesses_blk_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "thicknesses_blk_hero_stats" ADD CONSTRAINT "thicknesses_blk_hero_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."thicknesses_blk_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "thicknesses_blk_hero" ADD CONSTRAINT "thicknesses_blk_hero_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "thicknesses_blk_hero" ADD CONSTRAINT "thicknesses_blk_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."thicknesses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "thicknesses_blk_text" ADD CONSTRAINT "thicknesses_blk_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."thicknesses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "thicknesses_blk_table_table_cols" ADD CONSTRAINT "thicknesses_blk_table_table_cols_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."thicknesses_blk_table"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "thicknesses_blk_table_table_rows_cells" ADD CONSTRAINT "thicknesses_blk_table_table_rows_cells_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."thicknesses_blk_table_table_rows"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "thicknesses_blk_table_table_rows" ADD CONSTRAINT "thicknesses_blk_table_table_rows_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."thicknesses_blk_table"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "thicknesses_blk_table" ADD CONSTRAINT "thicknesses_blk_table_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."thicknesses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "thicknesses_blk_steps_items" ADD CONSTRAINT "thicknesses_blk_steps_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."thicknesses_blk_steps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "thicknesses_blk_steps_buttons" ADD CONSTRAINT "thicknesses_blk_steps_buttons_file_id_media_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "thicknesses_blk_steps_buttons" ADD CONSTRAINT "thicknesses_blk_steps_buttons_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."thicknesses_blk_steps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "thicknesses_blk_steps" ADD CONSTRAINT "thicknesses_blk_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."thicknesses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "thicknesses_blk_callout_items" ADD CONSTRAINT "thicknesses_blk_callout_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."thicknesses_blk_callout"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "thicknesses_blk_callout" ADD CONSTRAINT "thicknesses_blk_callout_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."thicknesses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "thicknesses_blk_terms_items" ADD CONSTRAINT "thicknesses_blk_terms_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."thicknesses_blk_terms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "thicknesses_blk_terms" ADD CONSTRAINT "thicknesses_blk_terms_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."thicknesses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "thicknesses_blk_cards_items" ADD CONSTRAINT "thicknesses_blk_cards_items_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "thicknesses_blk_cards_items" ADD CONSTRAINT "thicknesses_blk_cards_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."thicknesses_blk_cards"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "thicknesses_blk_cards" ADD CONSTRAINT "thicknesses_blk_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."thicknesses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "thicknesses_blk_coll_cards" ADD CONSTRAINT "thicknesses_blk_coll_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."thicknesses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "thicknesses_blk_prices" ADD CONSTRAINT "thicknesses_blk_prices_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."thicknesses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "thicknesses_blk_faq_items" ADD CONSTRAINT "thicknesses_blk_faq_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."thicknesses_blk_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "thicknesses_blk_faq" ADD CONSTRAINT "thicknesses_blk_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."thicknesses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "thicknesses_blk_cta_buttons" ADD CONSTRAINT "thicknesses_blk_cta_buttons_file_id_media_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "thicknesses_blk_cta_buttons" ADD CONSTRAINT "thicknesses_blk_cta_buttons_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."thicknesses_blk_cta"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "thicknesses_blk_cta" ADD CONSTRAINT "thicknesses_blk_cta_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."thicknesses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "thicknesses_blk_compare_rows" ADD CONSTRAINT "thicknesses_blk_compare_rows_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."thicknesses_blk_compare"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "thicknesses_blk_compare" ADD CONSTRAINT "thicknesses_blk_compare_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."thicknesses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "thicknesses_blk_download_items" ADD CONSTRAINT "thicknesses_blk_download_items_file_id_media_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "thicknesses_blk_download_items" ADD CONSTRAINT "thicknesses_blk_download_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."thicknesses_blk_download"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "thicknesses_blk_download" ADD CONSTRAINT "thicknesses_blk_download_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."thicknesses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "thicknesses_blk_holes" ADD CONSTRAINT "thicknesses_blk_holes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."thicknesses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "thicknesses_blk_weight" ADD CONSTRAINT "thicknesses_blk_weight_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."thicknesses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "thicknesses_blk_form_bullets" ADD CONSTRAINT "thicknesses_blk_form_bullets_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."thicknesses_blk_form"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "thicknesses_blk_form" ADD CONSTRAINT "thicknesses_blk_form_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."thicknesses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "thicknesses_blk_snippet" ADD CONSTRAINT "thicknesses_blk_snippet_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."thicknesses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "thicknesses_blk_stats_items" ADD CONSTRAINT "thicknesses_blk_stats_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."thicknesses_blk_stats"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "thicknesses_blk_stats" ADD CONSTRAINT "thicknesses_blk_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."thicknesses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "thicknesses_blk_objects" ADD CONSTRAINT "thicknesses_blk_objects_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "thicknesses_blk_objects" ADD CONSTRAINT "thicknesses_blk_objects_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."thicknesses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "thicknesses_blk_articles" ADD CONSTRAINT "thicknesses_blk_articles_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."thicknesses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "thicknesses_blk_wdw_left" ADD CONSTRAINT "thicknesses_blk_wdw_left_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."thicknesses_blk_wdw"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "thicknesses_blk_wdw_right" ADD CONSTRAINT "thicknesses_blk_wdw_right_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."thicknesses_blk_wdw"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "thicknesses_blk_wdw" ADD CONSTRAINT "thicknesses_blk_wdw_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."thicknesses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "thicknesses_blk_systems_items" ADD CONSTRAINT "thicknesses_blk_systems_items_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "thicknesses_blk_systems_items" ADD CONSTRAINT "thicknesses_blk_systems_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."thicknesses_blk_systems"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "thicknesses_blk_systems" ADD CONSTRAINT "thicknesses_blk_systems_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."thicknesses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "thicknesses_blk_gallery_images" ADD CONSTRAINT "thicknesses_blk_gallery_images_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "thicknesses_blk_gallery_images" ADD CONSTRAINT "thicknesses_blk_gallery_images_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."thicknesses_blk_gallery"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "thicknesses_blk_gallery" ADD CONSTRAINT "thicknesses_blk_gallery_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."thicknesses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "thicknesses_blk_two_cols" ADD CONSTRAINT "thicknesses_blk_two_cols_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."thicknesses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "thicknesses_blk_links_items" ADD CONSTRAINT "thicknesses_blk_links_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."thicknesses_blk_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "thicknesses_blk_links" ADD CONSTRAINT "thicknesses_blk_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."thicknesses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "thicknesses_blk_contacts" ADD CONSTRAINT "thicknesses_blk_contacts_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."thicknesses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "thicknesses_blk_requisites" ADD CONSTRAINT "thicknesses_blk_requisites_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."thicknesses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "thicknesses_blk_team" ADD CONSTRAINT "thicknesses_blk_team_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."thicknesses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "thicknesses_blk_quiz_cta" ADD CONSTRAINT "thicknesses_blk_quiz_cta_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."thicknesses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "thicknesses" ADD CONSTRAINT "thicknesses_group_id_thickness_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."thickness_groups"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "thicknesses" ADD CONSTRAINT "thicknesses_card_image_id_media_id_fk" FOREIGN KEY ("card_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "thicknesses" ADD CONSTRAINT "thicknesses_seo_og_image_id_media_id_fk" FOREIGN KEY ("seo_og_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "thicknesses_rels" ADD CONSTRAINT "thicknesses_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."thicknesses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "thicknesses_rels" ADD CONSTRAINT "thicknesses_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "thicknesses_rels" ADD CONSTRAINT "thicknesses_rels_glass_types_fk" FOREIGN KEY ("glass_types_id") REFERENCES "public"."glass_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "thicknesses_rels" ADD CONSTRAINT "thicknesses_rels_thicknesses_fk" FOREIGN KEY ("thicknesses_id") REFERENCES "public"."thicknesses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "thicknesses_rels" ADD CONSTRAINT "thicknesses_rels_processing_services_fk" FOREIGN KEY ("processing_services_id") REFERENCES "public"."processing_services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "thicknesses_rels" ADD CONSTRAINT "thicknesses_rels_constructions_fk" FOREIGN KEY ("constructions_id") REFERENCES "public"."constructions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "thicknesses_rels" ADD CONSTRAINT "thicknesses_rels_articles_fk" FOREIGN KEY ("articles_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "thicknesses_rels" ADD CONSTRAINT "thicknesses_rels_objects_fk" FOREIGN KEY ("objects_id") REFERENCES "public"."objects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "thickness_groups_faq" ADD CONSTRAINT "thickness_groups_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."thickness_groups"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "glass_types_hero_photos" ADD CONSTRAINT "glass_types_hero_photos_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "glass_types_hero_photos" ADD CONSTRAINT "glass_types_hero_photos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."glass_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "glass_types_variants" ADD CONSTRAINT "glass_types_variants_swatch_image_id_media_id_fk" FOREIGN KEY ("swatch_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "glass_types_variants" ADD CONSTRAINT "glass_types_variants_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."glass_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "glass_types_tables_cols" ADD CONSTRAINT "glass_types_tables_cols_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."glass_types_tables"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "glass_types_tables_rows_cells" ADD CONSTRAINT "glass_types_tables_rows_cells_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."glass_types_tables_rows"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "glass_types_tables_rows" ADD CONSTRAINT "glass_types_tables_rows_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."glass_types_tables"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "glass_types_tables" ADD CONSTRAINT "glass_types_tables_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."glass_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "glass_types_important_items" ADD CONSTRAINT "glass_types_important_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."glass_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "glass_types_limits_radius" ADD CONSTRAINT "glass_types_limits_radius_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."glass_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "glass_types_applications" ADD CONSTRAINT "glass_types_applications_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."glass_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "glass_types_related_links" ADD CONSTRAINT "glass_types_related_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."glass_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "glass_types_faq" ADD CONSTRAINT "glass_types_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."glass_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "glass_types_blk_hero_eyebrow" ADD CONSTRAINT "glass_types_blk_hero_eyebrow_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."glass_types_blk_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "glass_types_blk_hero_buttons" ADD CONSTRAINT "glass_types_blk_hero_buttons_file_id_media_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "glass_types_blk_hero_buttons" ADD CONSTRAINT "glass_types_blk_hero_buttons_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."glass_types_blk_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "glass_types_blk_hero_photos" ADD CONSTRAINT "glass_types_blk_hero_photos_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "glass_types_blk_hero_photos" ADD CONSTRAINT "glass_types_blk_hero_photos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."glass_types_blk_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "glass_types_blk_hero_stats" ADD CONSTRAINT "glass_types_blk_hero_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."glass_types_blk_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "glass_types_blk_hero" ADD CONSTRAINT "glass_types_blk_hero_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "glass_types_blk_hero" ADD CONSTRAINT "glass_types_blk_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."glass_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "glass_types_blk_text" ADD CONSTRAINT "glass_types_blk_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."glass_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "glass_types_blk_table_table_cols" ADD CONSTRAINT "glass_types_blk_table_table_cols_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."glass_types_blk_table"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "glass_types_blk_table_table_rows_cells" ADD CONSTRAINT "glass_types_blk_table_table_rows_cells_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."glass_types_blk_table_table_rows"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "glass_types_blk_table_table_rows" ADD CONSTRAINT "glass_types_blk_table_table_rows_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."glass_types_blk_table"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "glass_types_blk_table" ADD CONSTRAINT "glass_types_blk_table_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."glass_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "glass_types_blk_steps_items" ADD CONSTRAINT "glass_types_blk_steps_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."glass_types_blk_steps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "glass_types_blk_steps_buttons" ADD CONSTRAINT "glass_types_blk_steps_buttons_file_id_media_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "glass_types_blk_steps_buttons" ADD CONSTRAINT "glass_types_blk_steps_buttons_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."glass_types_blk_steps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "glass_types_blk_steps" ADD CONSTRAINT "glass_types_blk_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."glass_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "glass_types_blk_callout_items" ADD CONSTRAINT "glass_types_blk_callout_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."glass_types_blk_callout"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "glass_types_blk_callout" ADD CONSTRAINT "glass_types_blk_callout_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."glass_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "glass_types_blk_terms_items" ADD CONSTRAINT "glass_types_blk_terms_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."glass_types_blk_terms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "glass_types_blk_terms" ADD CONSTRAINT "glass_types_blk_terms_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."glass_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "glass_types_blk_cards_items" ADD CONSTRAINT "glass_types_blk_cards_items_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "glass_types_blk_cards_items" ADD CONSTRAINT "glass_types_blk_cards_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."glass_types_blk_cards"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "glass_types_blk_cards" ADD CONSTRAINT "glass_types_blk_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."glass_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "glass_types_blk_coll_cards" ADD CONSTRAINT "glass_types_blk_coll_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."glass_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "glass_types_blk_prices" ADD CONSTRAINT "glass_types_blk_prices_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."glass_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "glass_types_blk_faq_items" ADD CONSTRAINT "glass_types_blk_faq_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."glass_types_blk_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "glass_types_blk_faq" ADD CONSTRAINT "glass_types_blk_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."glass_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "glass_types_blk_cta_buttons" ADD CONSTRAINT "glass_types_blk_cta_buttons_file_id_media_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "glass_types_blk_cta_buttons" ADD CONSTRAINT "glass_types_blk_cta_buttons_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."glass_types_blk_cta"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "glass_types_blk_cta" ADD CONSTRAINT "glass_types_blk_cta_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."glass_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "glass_types_blk_compare_rows" ADD CONSTRAINT "glass_types_blk_compare_rows_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."glass_types_blk_compare"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "glass_types_blk_compare" ADD CONSTRAINT "glass_types_blk_compare_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."glass_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "glass_types_blk_download_items" ADD CONSTRAINT "glass_types_blk_download_items_file_id_media_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "glass_types_blk_download_items" ADD CONSTRAINT "glass_types_blk_download_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."glass_types_blk_download"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "glass_types_blk_download" ADD CONSTRAINT "glass_types_blk_download_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."glass_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "glass_types_blk_holes" ADD CONSTRAINT "glass_types_blk_holes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."glass_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "glass_types_blk_weight" ADD CONSTRAINT "glass_types_blk_weight_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."glass_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "glass_types_blk_form_bullets" ADD CONSTRAINT "glass_types_blk_form_bullets_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."glass_types_blk_form"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "glass_types_blk_form" ADD CONSTRAINT "glass_types_blk_form_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."glass_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "glass_types_blk_snippet" ADD CONSTRAINT "glass_types_blk_snippet_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."glass_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "glass_types_blk_stats_items" ADD CONSTRAINT "glass_types_blk_stats_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."glass_types_blk_stats"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "glass_types_blk_stats" ADD CONSTRAINT "glass_types_blk_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."glass_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "glass_types_blk_objects" ADD CONSTRAINT "glass_types_blk_objects_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "glass_types_blk_objects" ADD CONSTRAINT "glass_types_blk_objects_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."glass_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "glass_types_blk_articles" ADD CONSTRAINT "glass_types_blk_articles_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."glass_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "glass_types_blk_wdw_left" ADD CONSTRAINT "glass_types_blk_wdw_left_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."glass_types_blk_wdw"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "glass_types_blk_wdw_right" ADD CONSTRAINT "glass_types_blk_wdw_right_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."glass_types_blk_wdw"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "glass_types_blk_wdw" ADD CONSTRAINT "glass_types_blk_wdw_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."glass_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "glass_types_blk_systems_items" ADD CONSTRAINT "glass_types_blk_systems_items_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "glass_types_blk_systems_items" ADD CONSTRAINT "glass_types_blk_systems_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."glass_types_blk_systems"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "glass_types_blk_systems" ADD CONSTRAINT "glass_types_blk_systems_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."glass_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "glass_types_blk_gallery_images" ADD CONSTRAINT "glass_types_blk_gallery_images_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "glass_types_blk_gallery_images" ADD CONSTRAINT "glass_types_blk_gallery_images_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."glass_types_blk_gallery"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "glass_types_blk_gallery" ADD CONSTRAINT "glass_types_blk_gallery_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."glass_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "glass_types_blk_two_cols" ADD CONSTRAINT "glass_types_blk_two_cols_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."glass_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "glass_types_blk_links_items" ADD CONSTRAINT "glass_types_blk_links_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."glass_types_blk_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "glass_types_blk_links" ADD CONSTRAINT "glass_types_blk_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."glass_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "glass_types_blk_contacts" ADD CONSTRAINT "glass_types_blk_contacts_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."glass_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "glass_types_blk_requisites" ADD CONSTRAINT "glass_types_blk_requisites_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."glass_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "glass_types_blk_team" ADD CONSTRAINT "glass_types_blk_team_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."glass_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "glass_types_blk_quiz_cta" ADD CONSTRAINT "glass_types_blk_quiz_cta_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."glass_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "glass_types" ADD CONSTRAINT "glass_types_card_image_id_media_id_fk" FOREIGN KEY ("card_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "glass_types" ADD CONSTRAINT "glass_types_hero_image_id_media_id_fk" FOREIGN KEY ("hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "glass_types" ADD CONSTRAINT "glass_types_objects_product_id_products_id_fk" FOREIGN KEY ("objects_product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "glass_types" ADD CONSTRAINT "glass_types_seo_og_image_id_media_id_fk" FOREIGN KEY ("seo_og_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "glass_types_numbers" ADD CONSTRAINT "glass_types_numbers_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."glass_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "glass_types_rels" ADD CONSTRAINT "glass_types_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."glass_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "glass_types_rels" ADD CONSTRAINT "glass_types_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "glass_types_rels" ADD CONSTRAINT "glass_types_rels_glass_types_fk" FOREIGN KEY ("glass_types_id") REFERENCES "public"."glass_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "glass_types_rels" ADD CONSTRAINT "glass_types_rels_thicknesses_fk" FOREIGN KEY ("thicknesses_id") REFERENCES "public"."thicknesses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "glass_types_rels" ADD CONSTRAINT "glass_types_rels_processing_services_fk" FOREIGN KEY ("processing_services_id") REFERENCES "public"."processing_services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "glass_types_rels" ADD CONSTRAINT "glass_types_rels_constructions_fk" FOREIGN KEY ("constructions_id") REFERENCES "public"."constructions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "glass_types_rels" ADD CONSTRAINT "glass_types_rels_articles_fk" FOREIGN KEY ("articles_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "glass_types_rels" ADD CONSTRAINT "glass_types_rels_objects_fk" FOREIGN KEY ("objects_id") REFERENCES "public"."objects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_glass_types_v_version_hero_photos" ADD CONSTRAINT "_glass_types_v_version_hero_photos_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_glass_types_v_version_hero_photos" ADD CONSTRAINT "_glass_types_v_version_hero_photos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_glass_types_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_glass_types_v_version_variants" ADD CONSTRAINT "_glass_types_v_version_variants_swatch_image_id_media_id_fk" FOREIGN KEY ("swatch_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_glass_types_v_version_variants" ADD CONSTRAINT "_glass_types_v_version_variants_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_glass_types_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_glass_types_tables_cols_v" ADD CONSTRAINT "_glass_types_tables_cols_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_glass_types_v_version_tables"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_glass_types_tables_rows_cells_v" ADD CONSTRAINT "_glass_types_tables_rows_cells_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_glass_types_tables_rows_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_glass_types_tables_rows_v" ADD CONSTRAINT "_glass_types_tables_rows_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_glass_types_v_version_tables"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_glass_types_v_version_tables" ADD CONSTRAINT "_glass_types_v_version_tables_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_glass_types_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_glass_types_v_version_important_items" ADD CONSTRAINT "_glass_types_v_version_important_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_glass_types_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_glass_types_v_version_limits_radius" ADD CONSTRAINT "_glass_types_v_version_limits_radius_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_glass_types_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_glass_types_v_version_applications" ADD CONSTRAINT "_glass_types_v_version_applications_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_glass_types_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_glass_types_v_version_related_links" ADD CONSTRAINT "_glass_types_v_version_related_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_glass_types_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_glass_types_v_version_faq" ADD CONSTRAINT "_glass_types_v_version_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_glass_types_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_glass_types_blk_hero_v_eyebrow" ADD CONSTRAINT "_glass_types_blk_hero_v_eyebrow_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_glass_types_blk_hero_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_glass_types_blk_hero_v_buttons" ADD CONSTRAINT "_glass_types_blk_hero_v_buttons_file_id_media_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_glass_types_blk_hero_v_buttons" ADD CONSTRAINT "_glass_types_blk_hero_v_buttons_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_glass_types_blk_hero_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_glass_types_blk_hero_v_photos" ADD CONSTRAINT "_glass_types_blk_hero_v_photos_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_glass_types_blk_hero_v_photos" ADD CONSTRAINT "_glass_types_blk_hero_v_photos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_glass_types_blk_hero_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_glass_types_blk_hero_v_stats" ADD CONSTRAINT "_glass_types_blk_hero_v_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_glass_types_blk_hero_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_glass_types_blk_hero_v" ADD CONSTRAINT "_glass_types_blk_hero_v_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_glass_types_blk_hero_v" ADD CONSTRAINT "_glass_types_blk_hero_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_glass_types_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_glass_types_blk_text_v" ADD CONSTRAINT "_glass_types_blk_text_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_glass_types_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_glass_types_blk_table_table_cols_v" ADD CONSTRAINT "_glass_types_blk_table_table_cols_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_glass_types_blk_table_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_glass_types_blk_table_table_rows_cells_v" ADD CONSTRAINT "_glass_types_blk_table_table_rows_cells_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_glass_types_blk_table_table_rows_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_glass_types_blk_table_table_rows_v" ADD CONSTRAINT "_glass_types_blk_table_table_rows_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_glass_types_blk_table_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_glass_types_blk_table_v" ADD CONSTRAINT "_glass_types_blk_table_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_glass_types_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_glass_types_blk_steps_v_items" ADD CONSTRAINT "_glass_types_blk_steps_v_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_glass_types_blk_steps_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_glass_types_blk_steps_v_buttons" ADD CONSTRAINT "_glass_types_blk_steps_v_buttons_file_id_media_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_glass_types_blk_steps_v_buttons" ADD CONSTRAINT "_glass_types_blk_steps_v_buttons_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_glass_types_blk_steps_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_glass_types_blk_steps_v" ADD CONSTRAINT "_glass_types_blk_steps_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_glass_types_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_glass_types_blk_callout_v_items" ADD CONSTRAINT "_glass_types_blk_callout_v_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_glass_types_blk_callout_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_glass_types_blk_callout_v" ADD CONSTRAINT "_glass_types_blk_callout_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_glass_types_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_glass_types_blk_terms_v_items" ADD CONSTRAINT "_glass_types_blk_terms_v_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_glass_types_blk_terms_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_glass_types_blk_terms_v" ADD CONSTRAINT "_glass_types_blk_terms_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_glass_types_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_glass_types_blk_cards_v_items" ADD CONSTRAINT "_glass_types_blk_cards_v_items_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_glass_types_blk_cards_v_items" ADD CONSTRAINT "_glass_types_blk_cards_v_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_glass_types_blk_cards_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_glass_types_blk_cards_v" ADD CONSTRAINT "_glass_types_blk_cards_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_glass_types_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_glass_types_blk_coll_cards_v" ADD CONSTRAINT "_glass_types_blk_coll_cards_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_glass_types_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_glass_types_blk_prices_v" ADD CONSTRAINT "_glass_types_blk_prices_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_glass_types_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_glass_types_blk_faq_v_items" ADD CONSTRAINT "_glass_types_blk_faq_v_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_glass_types_blk_faq_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_glass_types_blk_faq_v" ADD CONSTRAINT "_glass_types_blk_faq_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_glass_types_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_glass_types_blk_cta_v_buttons" ADD CONSTRAINT "_glass_types_blk_cta_v_buttons_file_id_media_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_glass_types_blk_cta_v_buttons" ADD CONSTRAINT "_glass_types_blk_cta_v_buttons_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_glass_types_blk_cta_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_glass_types_blk_cta_v" ADD CONSTRAINT "_glass_types_blk_cta_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_glass_types_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_glass_types_blk_compare_v_rows" ADD CONSTRAINT "_glass_types_blk_compare_v_rows_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_glass_types_blk_compare_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_glass_types_blk_compare_v" ADD CONSTRAINT "_glass_types_blk_compare_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_glass_types_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_glass_types_blk_download_v_items" ADD CONSTRAINT "_glass_types_blk_download_v_items_file_id_media_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_glass_types_blk_download_v_items" ADD CONSTRAINT "_glass_types_blk_download_v_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_glass_types_blk_download_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_glass_types_blk_download_v" ADD CONSTRAINT "_glass_types_blk_download_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_glass_types_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_glass_types_blk_holes_v" ADD CONSTRAINT "_glass_types_blk_holes_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_glass_types_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_glass_types_blk_weight_v" ADD CONSTRAINT "_glass_types_blk_weight_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_glass_types_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_glass_types_blk_form_v_bullets" ADD CONSTRAINT "_glass_types_blk_form_v_bullets_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_glass_types_blk_form_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_glass_types_blk_form_v" ADD CONSTRAINT "_glass_types_blk_form_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_glass_types_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_glass_types_blk_snippet_v" ADD CONSTRAINT "_glass_types_blk_snippet_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_glass_types_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_glass_types_blk_stats_v_items" ADD CONSTRAINT "_glass_types_blk_stats_v_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_glass_types_blk_stats_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_glass_types_blk_stats_v" ADD CONSTRAINT "_glass_types_blk_stats_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_glass_types_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_glass_types_blk_objects_v" ADD CONSTRAINT "_glass_types_blk_objects_v_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_glass_types_blk_objects_v" ADD CONSTRAINT "_glass_types_blk_objects_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_glass_types_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_glass_types_blk_articles_v" ADD CONSTRAINT "_glass_types_blk_articles_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_glass_types_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_glass_types_blk_wdw_left_v" ADD CONSTRAINT "_glass_types_blk_wdw_left_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_glass_types_blk_wdw_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_glass_types_blk_wdw_right_v" ADD CONSTRAINT "_glass_types_blk_wdw_right_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_glass_types_blk_wdw_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_glass_types_blk_wdw_v" ADD CONSTRAINT "_glass_types_blk_wdw_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_glass_types_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_glass_types_blk_systems_v_items" ADD CONSTRAINT "_glass_types_blk_systems_v_items_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_glass_types_blk_systems_v_items" ADD CONSTRAINT "_glass_types_blk_systems_v_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_glass_types_blk_systems_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_glass_types_blk_systems_v" ADD CONSTRAINT "_glass_types_blk_systems_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_glass_types_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_glass_types_blk_gallery_v_images" ADD CONSTRAINT "_glass_types_blk_gallery_v_images_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_glass_types_blk_gallery_v_images" ADD CONSTRAINT "_glass_types_blk_gallery_v_images_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_glass_types_blk_gallery_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_glass_types_blk_gallery_v" ADD CONSTRAINT "_glass_types_blk_gallery_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_glass_types_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_glass_types_blk_two_cols_v" ADD CONSTRAINT "_glass_types_blk_two_cols_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_glass_types_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_glass_types_blk_links_v_items" ADD CONSTRAINT "_glass_types_blk_links_v_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_glass_types_blk_links_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_glass_types_blk_links_v" ADD CONSTRAINT "_glass_types_blk_links_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_glass_types_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_glass_types_blk_contacts_v" ADD CONSTRAINT "_glass_types_blk_contacts_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_glass_types_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_glass_types_blk_requisites_v" ADD CONSTRAINT "_glass_types_blk_requisites_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_glass_types_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_glass_types_blk_team_v" ADD CONSTRAINT "_glass_types_blk_team_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_glass_types_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_glass_types_blk_quiz_cta_v" ADD CONSTRAINT "_glass_types_blk_quiz_cta_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_glass_types_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_glass_types_v" ADD CONSTRAINT "_glass_types_v_parent_id_glass_types_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."glass_types"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_glass_types_v" ADD CONSTRAINT "_glass_types_v_version_card_image_id_media_id_fk" FOREIGN KEY ("version_card_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_glass_types_v" ADD CONSTRAINT "_glass_types_v_version_hero_image_id_media_id_fk" FOREIGN KEY ("version_hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_glass_types_v" ADD CONSTRAINT "_glass_types_v_version_objects_product_id_products_id_fk" FOREIGN KEY ("version_objects_product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_glass_types_v" ADD CONSTRAINT "_glass_types_v_version_seo_og_image_id_media_id_fk" FOREIGN KEY ("version_seo_og_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_glass_types_v_numbers" ADD CONSTRAINT "_glass_types_v_numbers_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_glass_types_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_glass_types_v_rels" ADD CONSTRAINT "_glass_types_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_glass_types_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_glass_types_v_rels" ADD CONSTRAINT "_glass_types_v_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_glass_types_v_rels" ADD CONSTRAINT "_glass_types_v_rels_glass_types_fk" FOREIGN KEY ("glass_types_id") REFERENCES "public"."glass_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_glass_types_v_rels" ADD CONSTRAINT "_glass_types_v_rels_thicknesses_fk" FOREIGN KEY ("thicknesses_id") REFERENCES "public"."thicknesses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_glass_types_v_rels" ADD CONSTRAINT "_glass_types_v_rels_processing_services_fk" FOREIGN KEY ("processing_services_id") REFERENCES "public"."processing_services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_glass_types_v_rels" ADD CONSTRAINT "_glass_types_v_rels_constructions_fk" FOREIGN KEY ("constructions_id") REFERENCES "public"."constructions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_glass_types_v_rels" ADD CONSTRAINT "_glass_types_v_rels_articles_fk" FOREIGN KEY ("articles_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_glass_types_v_rels" ADD CONSTRAINT "_glass_types_v_rels_objects_fk" FOREIGN KEY ("objects_id") REFERENCES "public"."objects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "processing_services_tables_cols" ADD CONSTRAINT "processing_services_tables_cols_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."processing_services_tables"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "processing_services_tables_rows_cells" ADD CONSTRAINT "processing_services_tables_rows_cells_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."processing_services_tables_rows"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "processing_services_tables_rows" ADD CONSTRAINT "processing_services_tables_rows_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."processing_services_tables"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "processing_services_tables" ADD CONSTRAINT "processing_services_tables_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."processing_services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "processing_services_important_items" ADD CONSTRAINT "processing_services_important_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."processing_services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "processing_services_callouts" ADD CONSTRAINT "processing_services_callouts_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."processing_services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "processing_services_related_links" ADD CONSTRAINT "processing_services_related_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."processing_services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "processing_services_faq" ADD CONSTRAINT "processing_services_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."processing_services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "processing_services_blk_hero_eyebrow" ADD CONSTRAINT "processing_services_blk_hero_eyebrow_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."processing_services_blk_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "processing_services_blk_hero_buttons" ADD CONSTRAINT "processing_services_blk_hero_buttons_file_id_media_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "processing_services_blk_hero_buttons" ADD CONSTRAINT "processing_services_blk_hero_buttons_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."processing_services_blk_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "processing_services_blk_hero_photos" ADD CONSTRAINT "processing_services_blk_hero_photos_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "processing_services_blk_hero_photos" ADD CONSTRAINT "processing_services_blk_hero_photos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."processing_services_blk_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "processing_services_blk_hero_stats" ADD CONSTRAINT "processing_services_blk_hero_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."processing_services_blk_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "processing_services_blk_hero" ADD CONSTRAINT "processing_services_blk_hero_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "processing_services_blk_hero" ADD CONSTRAINT "processing_services_blk_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."processing_services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "processing_services_blk_text" ADD CONSTRAINT "processing_services_blk_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."processing_services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "processing_services_blk_table_table_cols" ADD CONSTRAINT "processing_services_blk_table_table_cols_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."processing_services_blk_table"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "processing_services_blk_table_table_rows_cells" ADD CONSTRAINT "processing_services_blk_table_table_rows_cells_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."processing_services_blk_table_table_rows"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "processing_services_blk_table_table_rows" ADD CONSTRAINT "processing_services_blk_table_table_rows_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."processing_services_blk_table"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "processing_services_blk_table" ADD CONSTRAINT "processing_services_blk_table_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."processing_services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "processing_services_blk_steps_items" ADD CONSTRAINT "processing_services_blk_steps_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."processing_services_blk_steps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "processing_services_blk_steps_buttons" ADD CONSTRAINT "processing_services_blk_steps_buttons_file_id_media_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "processing_services_blk_steps_buttons" ADD CONSTRAINT "processing_services_blk_steps_buttons_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."processing_services_blk_steps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "processing_services_blk_steps" ADD CONSTRAINT "processing_services_blk_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."processing_services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "processing_services_blk_callout_items" ADD CONSTRAINT "processing_services_blk_callout_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."processing_services_blk_callout"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "processing_services_blk_callout" ADD CONSTRAINT "processing_services_blk_callout_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."processing_services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "processing_services_blk_terms_items" ADD CONSTRAINT "processing_services_blk_terms_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."processing_services_blk_terms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "processing_services_blk_terms" ADD CONSTRAINT "processing_services_blk_terms_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."processing_services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "processing_services_blk_cards_items" ADD CONSTRAINT "processing_services_blk_cards_items_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "processing_services_blk_cards_items" ADD CONSTRAINT "processing_services_blk_cards_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."processing_services_blk_cards"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "processing_services_blk_cards" ADD CONSTRAINT "processing_services_blk_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."processing_services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "processing_services_blk_coll_cards" ADD CONSTRAINT "processing_services_blk_coll_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."processing_services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "processing_services_blk_prices" ADD CONSTRAINT "processing_services_blk_prices_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."processing_services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "processing_services_blk_faq_items" ADD CONSTRAINT "processing_services_blk_faq_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."processing_services_blk_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "processing_services_blk_faq" ADD CONSTRAINT "processing_services_blk_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."processing_services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "processing_services_blk_cta_buttons" ADD CONSTRAINT "processing_services_blk_cta_buttons_file_id_media_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "processing_services_blk_cta_buttons" ADD CONSTRAINT "processing_services_blk_cta_buttons_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."processing_services_blk_cta"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "processing_services_blk_cta" ADD CONSTRAINT "processing_services_blk_cta_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."processing_services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "processing_services_blk_compare_rows" ADD CONSTRAINT "processing_services_blk_compare_rows_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."processing_services_blk_compare"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "processing_services_blk_compare" ADD CONSTRAINT "processing_services_blk_compare_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."processing_services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "processing_services_blk_download_items" ADD CONSTRAINT "processing_services_blk_download_items_file_id_media_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "processing_services_blk_download_items" ADD CONSTRAINT "processing_services_blk_download_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."processing_services_blk_download"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "processing_services_blk_download" ADD CONSTRAINT "processing_services_blk_download_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."processing_services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "processing_services_blk_holes" ADD CONSTRAINT "processing_services_blk_holes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."processing_services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "processing_services_blk_weight" ADD CONSTRAINT "processing_services_blk_weight_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."processing_services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "processing_services_blk_form_bullets" ADD CONSTRAINT "processing_services_blk_form_bullets_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."processing_services_blk_form"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "processing_services_blk_form" ADD CONSTRAINT "processing_services_blk_form_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."processing_services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "processing_services_blk_snippet" ADD CONSTRAINT "processing_services_blk_snippet_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."processing_services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "processing_services_blk_stats_items" ADD CONSTRAINT "processing_services_blk_stats_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."processing_services_blk_stats"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "processing_services_blk_stats" ADD CONSTRAINT "processing_services_blk_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."processing_services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "processing_services_blk_objects" ADD CONSTRAINT "processing_services_blk_objects_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "processing_services_blk_objects" ADD CONSTRAINT "processing_services_blk_objects_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."processing_services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "processing_services_blk_articles" ADD CONSTRAINT "processing_services_blk_articles_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."processing_services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "processing_services_blk_wdw_left" ADD CONSTRAINT "processing_services_blk_wdw_left_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."processing_services_blk_wdw"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "processing_services_blk_wdw_right" ADD CONSTRAINT "processing_services_blk_wdw_right_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."processing_services_blk_wdw"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "processing_services_blk_wdw" ADD CONSTRAINT "processing_services_blk_wdw_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."processing_services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "processing_services_blk_systems_items" ADD CONSTRAINT "processing_services_blk_systems_items_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "processing_services_blk_systems_items" ADD CONSTRAINT "processing_services_blk_systems_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."processing_services_blk_systems"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "processing_services_blk_systems" ADD CONSTRAINT "processing_services_blk_systems_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."processing_services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "processing_services_blk_gallery_images" ADD CONSTRAINT "processing_services_blk_gallery_images_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "processing_services_blk_gallery_images" ADD CONSTRAINT "processing_services_blk_gallery_images_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."processing_services_blk_gallery"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "processing_services_blk_gallery" ADD CONSTRAINT "processing_services_blk_gallery_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."processing_services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "processing_services_blk_two_cols" ADD CONSTRAINT "processing_services_blk_two_cols_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."processing_services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "processing_services_blk_links_items" ADD CONSTRAINT "processing_services_blk_links_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."processing_services_blk_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "processing_services_blk_links" ADD CONSTRAINT "processing_services_blk_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."processing_services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "processing_services_blk_contacts" ADD CONSTRAINT "processing_services_blk_contacts_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."processing_services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "processing_services_blk_requisites" ADD CONSTRAINT "processing_services_blk_requisites_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."processing_services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "processing_services_blk_team" ADD CONSTRAINT "processing_services_blk_team_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."processing_services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "processing_services_blk_quiz_cta" ADD CONSTRAINT "processing_services_blk_quiz_cta_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."processing_services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "processing_services" ADD CONSTRAINT "processing_services_card_image_id_media_id_fk" FOREIGN KEY ("card_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "processing_services" ADD CONSTRAINT "processing_services_hero_image_id_media_id_fk" FOREIGN KEY ("hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "processing_services" ADD CONSTRAINT "processing_services_seo_og_image_id_media_id_fk" FOREIGN KEY ("seo_og_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "processing_services_rels" ADD CONSTRAINT "processing_services_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."processing_services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "processing_services_rels" ADD CONSTRAINT "processing_services_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "processing_services_rels" ADD CONSTRAINT "processing_services_rels_glass_types_fk" FOREIGN KEY ("glass_types_id") REFERENCES "public"."glass_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "processing_services_rels" ADD CONSTRAINT "processing_services_rels_thicknesses_fk" FOREIGN KEY ("thicknesses_id") REFERENCES "public"."thicknesses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "processing_services_rels" ADD CONSTRAINT "processing_services_rels_processing_services_fk" FOREIGN KEY ("processing_services_id") REFERENCES "public"."processing_services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "processing_services_rels" ADD CONSTRAINT "processing_services_rels_constructions_fk" FOREIGN KEY ("constructions_id") REFERENCES "public"."constructions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "processing_services_rels" ADD CONSTRAINT "processing_services_rels_articles_fk" FOREIGN KEY ("articles_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "processing_services_rels" ADD CONSTRAINT "processing_services_rels_objects_fk" FOREIGN KEY ("objects_id") REFERENCES "public"."objects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "constructions_systems" ADD CONSTRAINT "constructions_systems_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "constructions_systems" ADD CONSTRAINT "constructions_systems_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."constructions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "constructions_profile_systems" ADD CONSTRAINT "constructions_profile_systems_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."constructions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "constructions_glass_bullets" ADD CONSTRAINT "constructions_glass_bullets_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."constructions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "constructions_tables_cols" ADD CONSTRAINT "constructions_tables_cols_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."constructions_tables"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "constructions_tables_rows_cells" ADD CONSTRAINT "constructions_tables_rows_cells_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."constructions_tables_rows"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "constructions_tables_rows" ADD CONSTRAINT "constructions_tables_rows_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."constructions_tables"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "constructions_tables" ADD CONSTRAINT "constructions_tables_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."constructions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "constructions_who_does_what_wdw_left" ADD CONSTRAINT "constructions_who_does_what_wdw_left_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."constructions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "constructions_who_does_what_wdw_right" ADD CONSTRAINT "constructions_who_does_what_wdw_right_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."constructions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "constructions_faq" ADD CONSTRAINT "constructions_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."constructions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "constructions_blk_hero_eyebrow" ADD CONSTRAINT "constructions_blk_hero_eyebrow_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."constructions_blk_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "constructions_blk_hero_buttons" ADD CONSTRAINT "constructions_blk_hero_buttons_file_id_media_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "constructions_blk_hero_buttons" ADD CONSTRAINT "constructions_blk_hero_buttons_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."constructions_blk_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "constructions_blk_hero_photos" ADD CONSTRAINT "constructions_blk_hero_photos_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "constructions_blk_hero_photos" ADD CONSTRAINT "constructions_blk_hero_photos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."constructions_blk_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "constructions_blk_hero_stats" ADD CONSTRAINT "constructions_blk_hero_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."constructions_blk_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "constructions_blk_hero" ADD CONSTRAINT "constructions_blk_hero_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "constructions_blk_hero" ADD CONSTRAINT "constructions_blk_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."constructions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "constructions_blk_text" ADD CONSTRAINT "constructions_blk_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."constructions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "constructions_blk_table_table_cols" ADD CONSTRAINT "constructions_blk_table_table_cols_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."constructions_blk_table"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "constructions_blk_table_table_rows_cells" ADD CONSTRAINT "constructions_blk_table_table_rows_cells_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."constructions_blk_table_table_rows"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "constructions_blk_table_table_rows" ADD CONSTRAINT "constructions_blk_table_table_rows_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."constructions_blk_table"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "constructions_blk_table" ADD CONSTRAINT "constructions_blk_table_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."constructions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "constructions_blk_steps_items" ADD CONSTRAINT "constructions_blk_steps_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."constructions_blk_steps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "constructions_blk_steps_buttons" ADD CONSTRAINT "constructions_blk_steps_buttons_file_id_media_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "constructions_blk_steps_buttons" ADD CONSTRAINT "constructions_blk_steps_buttons_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."constructions_blk_steps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "constructions_blk_steps" ADD CONSTRAINT "constructions_blk_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."constructions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "constructions_blk_callout_items" ADD CONSTRAINT "constructions_blk_callout_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."constructions_blk_callout"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "constructions_blk_callout" ADD CONSTRAINT "constructions_blk_callout_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."constructions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "constructions_blk_terms_items" ADD CONSTRAINT "constructions_blk_terms_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."constructions_blk_terms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "constructions_blk_terms" ADD CONSTRAINT "constructions_blk_terms_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."constructions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "constructions_blk_cards_items" ADD CONSTRAINT "constructions_blk_cards_items_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "constructions_blk_cards_items" ADD CONSTRAINT "constructions_blk_cards_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."constructions_blk_cards"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "constructions_blk_cards" ADD CONSTRAINT "constructions_blk_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."constructions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "constructions_blk_coll_cards" ADD CONSTRAINT "constructions_blk_coll_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."constructions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "constructions_blk_prices" ADD CONSTRAINT "constructions_blk_prices_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."constructions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "constructions_blk_faq_items" ADD CONSTRAINT "constructions_blk_faq_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."constructions_blk_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "constructions_blk_faq" ADD CONSTRAINT "constructions_blk_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."constructions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "constructions_blk_cta_buttons" ADD CONSTRAINT "constructions_blk_cta_buttons_file_id_media_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "constructions_blk_cta_buttons" ADD CONSTRAINT "constructions_blk_cta_buttons_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."constructions_blk_cta"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "constructions_blk_cta" ADD CONSTRAINT "constructions_blk_cta_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."constructions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "constructions_blk_compare_rows" ADD CONSTRAINT "constructions_blk_compare_rows_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."constructions_blk_compare"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "constructions_blk_compare" ADD CONSTRAINT "constructions_blk_compare_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."constructions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "constructions_blk_download_items" ADD CONSTRAINT "constructions_blk_download_items_file_id_media_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "constructions_blk_download_items" ADD CONSTRAINT "constructions_blk_download_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."constructions_blk_download"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "constructions_blk_download" ADD CONSTRAINT "constructions_blk_download_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."constructions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "constructions_blk_holes" ADD CONSTRAINT "constructions_blk_holes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."constructions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "constructions_blk_weight" ADD CONSTRAINT "constructions_blk_weight_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."constructions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "constructions_blk_form_bullets" ADD CONSTRAINT "constructions_blk_form_bullets_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."constructions_blk_form"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "constructions_blk_form" ADD CONSTRAINT "constructions_blk_form_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."constructions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "constructions_blk_snippet" ADD CONSTRAINT "constructions_blk_snippet_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."constructions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "constructions_blk_stats_items" ADD CONSTRAINT "constructions_blk_stats_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."constructions_blk_stats"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "constructions_blk_stats" ADD CONSTRAINT "constructions_blk_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."constructions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "constructions_blk_objects" ADD CONSTRAINT "constructions_blk_objects_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "constructions_blk_objects" ADD CONSTRAINT "constructions_blk_objects_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."constructions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "constructions_blk_articles" ADD CONSTRAINT "constructions_blk_articles_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."constructions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "constructions_blk_wdw_left" ADD CONSTRAINT "constructions_blk_wdw_left_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."constructions_blk_wdw"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "constructions_blk_wdw_right" ADD CONSTRAINT "constructions_blk_wdw_right_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."constructions_blk_wdw"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "constructions_blk_wdw" ADD CONSTRAINT "constructions_blk_wdw_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."constructions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "constructions_blk_systems_items" ADD CONSTRAINT "constructions_blk_systems_items_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "constructions_blk_systems_items" ADD CONSTRAINT "constructions_blk_systems_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."constructions_blk_systems"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "constructions_blk_systems" ADD CONSTRAINT "constructions_blk_systems_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."constructions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "constructions_blk_gallery_images" ADD CONSTRAINT "constructions_blk_gallery_images_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "constructions_blk_gallery_images" ADD CONSTRAINT "constructions_blk_gallery_images_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."constructions_blk_gallery"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "constructions_blk_gallery" ADD CONSTRAINT "constructions_blk_gallery_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."constructions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "constructions_blk_two_cols" ADD CONSTRAINT "constructions_blk_two_cols_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."constructions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "constructions_blk_links_items" ADD CONSTRAINT "constructions_blk_links_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."constructions_blk_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "constructions_blk_links" ADD CONSTRAINT "constructions_blk_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."constructions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "constructions_blk_contacts" ADD CONSTRAINT "constructions_blk_contacts_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."constructions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "constructions_blk_requisites" ADD CONSTRAINT "constructions_blk_requisites_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."constructions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "constructions_blk_team" ADD CONSTRAINT "constructions_blk_team_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."constructions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "constructions_blk_quiz_cta" ADD CONSTRAINT "constructions_blk_quiz_cta_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."constructions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "constructions_legacy_urls" ADD CONSTRAINT "constructions_legacy_urls_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."constructions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "constructions" ADD CONSTRAINT "constructions_parent_id_constructions_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."constructions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "constructions" ADD CONSTRAINT "constructions_product_tag_id_products_id_fk" FOREIGN KEY ("product_tag_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "constructions" ADD CONSTRAINT "constructions_card_image_id_media_id_fk" FOREIGN KEY ("card_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "constructions" ADD CONSTRAINT "constructions_hero_image_id_media_id_fk" FOREIGN KEY ("hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "constructions" ADD CONSTRAINT "constructions_seo_og_image_id_media_id_fk" FOREIGN KEY ("seo_og_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "constructions_rels" ADD CONSTRAINT "constructions_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."constructions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "constructions_rels" ADD CONSTRAINT "constructions_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "constructions_rels" ADD CONSTRAINT "constructions_rels_glass_types_fk" FOREIGN KEY ("glass_types_id") REFERENCES "public"."glass_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "constructions_rels" ADD CONSTRAINT "constructions_rels_thicknesses_fk" FOREIGN KEY ("thicknesses_id") REFERENCES "public"."thicknesses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "constructions_rels" ADD CONSTRAINT "constructions_rels_processing_services_fk" FOREIGN KEY ("processing_services_id") REFERENCES "public"."processing_services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "constructions_rels" ADD CONSTRAINT "constructions_rels_constructions_fk" FOREIGN KEY ("constructions_id") REFERENCES "public"."constructions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "constructions_rels" ADD CONSTRAINT "constructions_rels_articles_fk" FOREIGN KEY ("articles_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "constructions_rels" ADD CONSTRAINT "constructions_rels_objects_fk" FOREIGN KEY ("objects_id") REFERENCES "public"."objects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_constructions_v_version_systems" ADD CONSTRAINT "_constructions_v_version_systems_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_constructions_v_version_systems" ADD CONSTRAINT "_constructions_v_version_systems_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_constructions_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_constructions_v_version_profile_systems" ADD CONSTRAINT "_constructions_v_version_profile_systems_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_constructions_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_constructions_v_version_glass_bullets" ADD CONSTRAINT "_constructions_v_version_glass_bullets_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_constructions_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_constructions_tables_cols_v" ADD CONSTRAINT "_constructions_tables_cols_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_constructions_v_version_tables"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_constructions_tables_rows_cells_v" ADD CONSTRAINT "_constructions_tables_rows_cells_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_constructions_tables_rows_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_constructions_tables_rows_v" ADD CONSTRAINT "_constructions_tables_rows_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_constructions_v_version_tables"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_constructions_v_version_tables" ADD CONSTRAINT "_constructions_v_version_tables_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_constructions_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_constructions_who_does_what_wdw_left_v" ADD CONSTRAINT "_constructions_who_does_what_wdw_left_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_constructions_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_constructions_who_does_what_wdw_right_v" ADD CONSTRAINT "_constructions_who_does_what_wdw_right_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_constructions_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_constructions_v_version_faq" ADD CONSTRAINT "_constructions_v_version_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_constructions_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_constructions_blk_hero_v_eyebrow" ADD CONSTRAINT "_constructions_blk_hero_v_eyebrow_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_constructions_blk_hero_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_constructions_blk_hero_v_buttons" ADD CONSTRAINT "_constructions_blk_hero_v_buttons_file_id_media_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_constructions_blk_hero_v_buttons" ADD CONSTRAINT "_constructions_blk_hero_v_buttons_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_constructions_blk_hero_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_constructions_blk_hero_v_photos" ADD CONSTRAINT "_constructions_blk_hero_v_photos_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_constructions_blk_hero_v_photos" ADD CONSTRAINT "_constructions_blk_hero_v_photos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_constructions_blk_hero_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_constructions_blk_hero_v_stats" ADD CONSTRAINT "_constructions_blk_hero_v_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_constructions_blk_hero_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_constructions_blk_hero_v" ADD CONSTRAINT "_constructions_blk_hero_v_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_constructions_blk_hero_v" ADD CONSTRAINT "_constructions_blk_hero_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_constructions_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_constructions_blk_text_v" ADD CONSTRAINT "_constructions_blk_text_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_constructions_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_constructions_blk_table_table_cols_v" ADD CONSTRAINT "_constructions_blk_table_table_cols_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_constructions_blk_table_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_constructions_blk_table_table_rows_cells_v" ADD CONSTRAINT "_constructions_blk_table_table_rows_cells_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_constructions_blk_table_table_rows_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_constructions_blk_table_table_rows_v" ADD CONSTRAINT "_constructions_blk_table_table_rows_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_constructions_blk_table_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_constructions_blk_table_v" ADD CONSTRAINT "_constructions_blk_table_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_constructions_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_constructions_blk_steps_v_items" ADD CONSTRAINT "_constructions_blk_steps_v_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_constructions_blk_steps_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_constructions_blk_steps_v_buttons" ADD CONSTRAINT "_constructions_blk_steps_v_buttons_file_id_media_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_constructions_blk_steps_v_buttons" ADD CONSTRAINT "_constructions_blk_steps_v_buttons_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_constructions_blk_steps_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_constructions_blk_steps_v" ADD CONSTRAINT "_constructions_blk_steps_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_constructions_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_constructions_blk_callout_v_items" ADD CONSTRAINT "_constructions_blk_callout_v_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_constructions_blk_callout_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_constructions_blk_callout_v" ADD CONSTRAINT "_constructions_blk_callout_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_constructions_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_constructions_blk_terms_v_items" ADD CONSTRAINT "_constructions_blk_terms_v_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_constructions_blk_terms_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_constructions_blk_terms_v" ADD CONSTRAINT "_constructions_blk_terms_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_constructions_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_constructions_blk_cards_v_items" ADD CONSTRAINT "_constructions_blk_cards_v_items_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_constructions_blk_cards_v_items" ADD CONSTRAINT "_constructions_blk_cards_v_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_constructions_blk_cards_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_constructions_blk_cards_v" ADD CONSTRAINT "_constructions_blk_cards_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_constructions_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_constructions_blk_coll_cards_v" ADD CONSTRAINT "_constructions_blk_coll_cards_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_constructions_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_constructions_blk_prices_v" ADD CONSTRAINT "_constructions_blk_prices_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_constructions_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_constructions_blk_faq_v_items" ADD CONSTRAINT "_constructions_blk_faq_v_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_constructions_blk_faq_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_constructions_blk_faq_v" ADD CONSTRAINT "_constructions_blk_faq_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_constructions_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_constructions_blk_cta_v_buttons" ADD CONSTRAINT "_constructions_blk_cta_v_buttons_file_id_media_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_constructions_blk_cta_v_buttons" ADD CONSTRAINT "_constructions_blk_cta_v_buttons_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_constructions_blk_cta_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_constructions_blk_cta_v" ADD CONSTRAINT "_constructions_blk_cta_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_constructions_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_constructions_blk_compare_v_rows" ADD CONSTRAINT "_constructions_blk_compare_v_rows_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_constructions_blk_compare_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_constructions_blk_compare_v" ADD CONSTRAINT "_constructions_blk_compare_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_constructions_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_constructions_blk_download_v_items" ADD CONSTRAINT "_constructions_blk_download_v_items_file_id_media_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_constructions_blk_download_v_items" ADD CONSTRAINT "_constructions_blk_download_v_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_constructions_blk_download_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_constructions_blk_download_v" ADD CONSTRAINT "_constructions_blk_download_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_constructions_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_constructions_blk_holes_v" ADD CONSTRAINT "_constructions_blk_holes_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_constructions_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_constructions_blk_weight_v" ADD CONSTRAINT "_constructions_blk_weight_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_constructions_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_constructions_blk_form_v_bullets" ADD CONSTRAINT "_constructions_blk_form_v_bullets_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_constructions_blk_form_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_constructions_blk_form_v" ADD CONSTRAINT "_constructions_blk_form_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_constructions_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_constructions_blk_snippet_v" ADD CONSTRAINT "_constructions_blk_snippet_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_constructions_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_constructions_blk_stats_v_items" ADD CONSTRAINT "_constructions_blk_stats_v_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_constructions_blk_stats_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_constructions_blk_stats_v" ADD CONSTRAINT "_constructions_blk_stats_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_constructions_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_constructions_blk_objects_v" ADD CONSTRAINT "_constructions_blk_objects_v_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_constructions_blk_objects_v" ADD CONSTRAINT "_constructions_blk_objects_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_constructions_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_constructions_blk_articles_v" ADD CONSTRAINT "_constructions_blk_articles_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_constructions_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_constructions_blk_wdw_left_v" ADD CONSTRAINT "_constructions_blk_wdw_left_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_constructions_blk_wdw_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_constructions_blk_wdw_right_v" ADD CONSTRAINT "_constructions_blk_wdw_right_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_constructions_blk_wdw_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_constructions_blk_wdw_v" ADD CONSTRAINT "_constructions_blk_wdw_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_constructions_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_constructions_blk_systems_v_items" ADD CONSTRAINT "_constructions_blk_systems_v_items_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_constructions_blk_systems_v_items" ADD CONSTRAINT "_constructions_blk_systems_v_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_constructions_blk_systems_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_constructions_blk_systems_v" ADD CONSTRAINT "_constructions_blk_systems_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_constructions_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_constructions_blk_gallery_v_images" ADD CONSTRAINT "_constructions_blk_gallery_v_images_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_constructions_blk_gallery_v_images" ADD CONSTRAINT "_constructions_blk_gallery_v_images_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_constructions_blk_gallery_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_constructions_blk_gallery_v" ADD CONSTRAINT "_constructions_blk_gallery_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_constructions_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_constructions_blk_two_cols_v" ADD CONSTRAINT "_constructions_blk_two_cols_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_constructions_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_constructions_blk_links_v_items" ADD CONSTRAINT "_constructions_blk_links_v_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_constructions_blk_links_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_constructions_blk_links_v" ADD CONSTRAINT "_constructions_blk_links_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_constructions_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_constructions_blk_contacts_v" ADD CONSTRAINT "_constructions_blk_contacts_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_constructions_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_constructions_blk_requisites_v" ADD CONSTRAINT "_constructions_blk_requisites_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_constructions_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_constructions_blk_team_v" ADD CONSTRAINT "_constructions_blk_team_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_constructions_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_constructions_blk_quiz_cta_v" ADD CONSTRAINT "_constructions_blk_quiz_cta_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_constructions_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_constructions_v_version_legacy_urls" ADD CONSTRAINT "_constructions_v_version_legacy_urls_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_constructions_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_constructions_v" ADD CONSTRAINT "_constructions_v_parent_id_constructions_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."constructions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_constructions_v" ADD CONSTRAINT "_constructions_v_version_parent_id_constructions_id_fk" FOREIGN KEY ("version_parent_id") REFERENCES "public"."constructions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_constructions_v" ADD CONSTRAINT "_constructions_v_version_product_tag_id_products_id_fk" FOREIGN KEY ("version_product_tag_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_constructions_v" ADD CONSTRAINT "_constructions_v_version_card_image_id_media_id_fk" FOREIGN KEY ("version_card_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_constructions_v" ADD CONSTRAINT "_constructions_v_version_hero_image_id_media_id_fk" FOREIGN KEY ("version_hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_constructions_v" ADD CONSTRAINT "_constructions_v_version_seo_og_image_id_media_id_fk" FOREIGN KEY ("version_seo_og_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_constructions_v_rels" ADD CONSTRAINT "_constructions_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_constructions_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_constructions_v_rels" ADD CONSTRAINT "_constructions_v_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_constructions_v_rels" ADD CONSTRAINT "_constructions_v_rels_glass_types_fk" FOREIGN KEY ("glass_types_id") REFERENCES "public"."glass_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_constructions_v_rels" ADD CONSTRAINT "_constructions_v_rels_thicknesses_fk" FOREIGN KEY ("thicknesses_id") REFERENCES "public"."thicknesses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_constructions_v_rels" ADD CONSTRAINT "_constructions_v_rels_processing_services_fk" FOREIGN KEY ("processing_services_id") REFERENCES "public"."processing_services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_constructions_v_rels" ADD CONSTRAINT "_constructions_v_rels_constructions_fk" FOREIGN KEY ("constructions_id") REFERENCES "public"."constructions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_constructions_v_rels" ADD CONSTRAINT "_constructions_v_rels_articles_fk" FOREIGN KEY ("articles_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_constructions_v_rels" ADD CONSTRAINT "_constructions_v_rels_objects_fk" FOREIGN KEY ("objects_id") REFERENCES "public"."objects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "shower_configs_glass_thicknesses" ADD CONSTRAINT "shower_configs_glass_thicknesses_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."shower_configs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "shower_configs_gallery" ADD CONSTRAINT "shower_configs_gallery_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "shower_configs_gallery" ADD CONSTRAINT "shower_configs_gallery_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."shower_configs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "shower_configs" ADD CONSTRAINT "shower_configs_construction_id_constructions_id_fk" FOREIGN KEY ("construction_id") REFERENCES "public"."constructions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "shower_configs" ADD CONSTRAINT "shower_configs_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_shower_configs_v_version_glass_thicknesses" ADD CONSTRAINT "_shower_configs_v_version_glass_thicknesses_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_shower_configs_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_shower_configs_v_version_gallery" ADD CONSTRAINT "_shower_configs_v_version_gallery_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_shower_configs_v_version_gallery" ADD CONSTRAINT "_shower_configs_v_version_gallery_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_shower_configs_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_shower_configs_v" ADD CONSTRAINT "_shower_configs_v_parent_id_shower_configs_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."shower_configs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_shower_configs_v" ADD CONSTRAINT "_shower_configs_v_version_construction_id_constructions_id_fk" FOREIGN KEY ("version_construction_id") REFERENCES "public"."constructions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_shower_configs_v" ADD CONSTRAINT "_shower_configs_v_version_image_id_media_id_fk" FOREIGN KEY ("version_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products" ADD CONSTRAINT "products_construction_id_constructions_id_fk" FOREIGN KEY ("construction_id") REFERENCES "public"."constructions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "lead_files" ADD CONSTRAINT "lead_files_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "leads_flags" ADD CONSTRAINT "leads_flags_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "leads_internal_comments" ADD CONSTRAINT "leads_internal_comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "leads_internal_comments" ADD CONSTRAINT "leads_internal_comments_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "leads" ADD CONSTRAINT "leads_status_id_lead_statuses_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."lead_statuses"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "leads" ADD CONSTRAINT "leads_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "leads" ADD CONSTRAINT "leads_duplicate_of_id_leads_id_fk" FOREIGN KEY ("duplicate_of_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "leads" ADD CONSTRAINT "leads_consent_id_consent_log_id_fk" FOREIGN KEY ("consent_id") REFERENCES "public"."consent_log"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "leads_rels" ADD CONSTRAINT "leads_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "leads_rels" ADD CONSTRAINT "leads_rels_lead_files_fk" FOREIGN KEY ("lead_files_id") REFERENCES "public"."lead_files"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_leads_v_version_flags" ADD CONSTRAINT "_leads_v_version_flags_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_leads_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_leads_v_version_internal_comments" ADD CONSTRAINT "_leads_v_version_internal_comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_leads_v_version_internal_comments" ADD CONSTRAINT "_leads_v_version_internal_comments_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_leads_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_leads_v" ADD CONSTRAINT "_leads_v_parent_id_leads_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_leads_v" ADD CONSTRAINT "_leads_v_version_status_id_lead_statuses_id_fk" FOREIGN KEY ("version_status_id") REFERENCES "public"."lead_statuses"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_leads_v" ADD CONSTRAINT "_leads_v_version_assignee_id_users_id_fk" FOREIGN KEY ("version_assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_leads_v" ADD CONSTRAINT "_leads_v_version_duplicate_of_id_leads_id_fk" FOREIGN KEY ("version_duplicate_of_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_leads_v" ADD CONSTRAINT "_leads_v_version_consent_id_consent_log_id_fk" FOREIGN KEY ("version_consent_id") REFERENCES "public"."consent_log"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_leads_v_rels" ADD CONSTRAINT "_leads_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_leads_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_leads_v_rels" ADD CONSTRAINT "_leads_v_rels_lead_files_fk" FOREIGN KEY ("lead_files_id") REFERENCES "public"."lead_files"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "orders_status_history" ADD CONSTRAINT "orders_status_history_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "orders_pack_photos" ADD CONSTRAINT "orders_pack_photos_photo_id_order_files_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."order_files"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "orders_pack_photos" ADD CONSTRAINT "orders_pack_photos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "orders_documents" ADD CONSTRAINT "orders_documents_file_id_order_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."order_files"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "orders_documents" ADD CONSTRAINT "orders_documents_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "orders" ADD CONSTRAINT "orders_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "orders" ADD CONSTRAINT "orders_manager_id_users_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "order_files" ADD CONSTRAINT "order_files_uploaded_by_id_users_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "consent_log" ADD CONSTRAINT "consent_log_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "prices_rows" ADD CONSTRAINT "prices_rows_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."prices"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "prices_included" ADD CONSTRAINT "prices_included_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."prices"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "prices_extra" ADD CONSTRAINT "prices_extra_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."prices"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_prices_v_version_rows" ADD CONSTRAINT "_prices_v_version_rows_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_prices_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_prices_v_version_included" ADD CONSTRAINT "_prices_v_version_included_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_prices_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_prices_v_version_extra" ADD CONSTRAINT "_prices_v_version_extra_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_prices_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "conditions_terms_bar" ADD CONSTRAINT "conditions_terms_bar_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."conditions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "conditions_terms_bar_short" ADD CONSTRAINT "conditions_terms_bar_short_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."conditions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "contacts_phones" ADD CONSTRAINT "contacts_phones_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "contacts_emails" ADD CONSTRAINT "contacts_emails_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "contacts_locations_phones" ADD CONSTRAINT "contacts_locations_phones_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."contacts_locations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "contacts_locations" ADD CONSTRAINT "contacts_locations_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "contacts_messengers" ADD CONSTRAINT "contacts_messengers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "contacts_same_as" ADD CONSTRAINT "contacts_same_as_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_contacts_v_version_phones" ADD CONSTRAINT "_contacts_v_version_phones_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_contacts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_contacts_v_version_emails" ADD CONSTRAINT "_contacts_v_version_emails_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_contacts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_contacts_v_version_locations_phones" ADD CONSTRAINT "_contacts_v_version_locations_phones_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_contacts_v_version_locations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_contacts_v_version_locations" ADD CONSTRAINT "_contacts_v_version_locations_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_contacts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_contacts_v_version_messengers" ADD CONSTRAINT "_contacts_v_version_messengers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_contacts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_contacts_v_version_same_as" ADD CONSTRAINT "_contacts_v_version_same_as_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_contacts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "requisites" ADD CONSTRAINT "requisites_card_pdf_id_media_id_fk" FOREIGN KEY ("card_pdf_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_requisites_v" ADD CONSTRAINT "_requisites_v_version_card_pdf_id_media_id_fk" FOREIGN KEY ("version_card_pdf_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "tech_params_bent_radius" ADD CONSTRAINT "tech_params_bent_radius_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."tech_params"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tech_params_tint_colors" ADD CONSTRAINT "tech_params_tint_colors_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."tech_params"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tech_params_holes_tolerance_ranges" ADD CONSTRAINT "tech_params_holes_tolerance_ranges_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."tech_params"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tech_params_carry_hints" ADD CONSTRAINT "tech_params_carry_hints_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."tech_params"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tech_params_gost_size_tolerance" ADD CONSTRAINT "tech_params_gost_size_tolerance_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."tech_params"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tech_params_gost_flatness" ADD CONSTRAINT "tech_params_gost_flatness_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."tech_params"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tech_params_delivery_cities" ADD CONSTRAINT "tech_params_delivery_cities_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."tech_params"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tech_params_quiz_options_product_types" ADD CONSTRAINT "tech_params_quiz_options_product_types_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."tech_params"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tech_params_quiz_options_kinds" ADD CONSTRAINT "tech_params_quiz_options_kinds_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."tech_params"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tech_params_quiz_options_edges_only_for_types" ADD CONSTRAINT "tech_params_quiz_options_edges_only_for_types_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."tech_params_quiz_options_edges"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tech_params_quiz_options_edges" ADD CONSTRAINT "tech_params_quiz_options_edges_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."tech_params"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tech_params_quiz_options_decor" ADD CONSTRAINT "tech_params_quiz_options_decor_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."tech_params"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tech_params_quiz_options_stamp" ADD CONSTRAINT "tech_params_quiz_options_stamp_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."tech_params"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tech_params_quiz_options_packaging" ADD CONSTRAINT "tech_params_quiz_options_packaging_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."tech_params"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tech_params_quiz_options_roles" ADD CONSTRAINT "tech_params_quiz_options_roles_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."tech_params"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tech_params_numbers" ADD CONSTRAINT "tech_params_numbers_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."tech_params"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_holidays" ADD CONSTRAINT "site_settings_holidays_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_stop_words" ADD CONSTRAINT "site_settings_stop_words_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_lead_emails" ADD CONSTRAINT "site_settings_lead_emails_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_order_statuses" ADD CONSTRAINT "site_settings_order_statuses_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_branding_logo_dark_id_media_id_fk" FOREIGN KEY ("branding_logo_dark_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_branding_logo_light_id_media_id_fk" FOREIGN KEY ("branding_logo_light_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_branding_logo_png_id_media_id_fk" FOREIGN KEY ("branding_logo_png_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_branding_favicon_id_media_id_fk" FOREIGN KEY ("branding_favicon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_branding_default_og_image_id_media_id_fk" FOREIGN KEY ("branding_default_og_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "navigation_top_bar_company_items" ADD CONSTRAINT "navigation_top_bar_company_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."navigation"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "navigation_top_bar_segments" ADD CONSTRAINT "navigation_top_bar_segments_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."navigation"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "navigation_main_row_pills" ADD CONSTRAINT "navigation_main_row_pills_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."navigation"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "navigation_main_row_links" ADD CONSTRAINT "navigation_main_row_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."navigation"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "navigation_section_row_items" ADD CONSTRAINT "navigation_section_row_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."navigation"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "nav_mega_columns_links_sub_links" ADD CONSTRAINT "nav_mega_columns_links_sub_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."nav_mega_columns_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "nav_mega_columns_links" ADD CONSTRAINT "nav_mega_columns_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."nav_mega_columns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "nav_mega_columns" ADD CONSTRAINT "nav_mega_columns_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."nav_mega"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "nav_mega" ADD CONSTRAINT "nav_mega_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."navigation"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "navigation_footer_columns_links" ADD CONSTRAINT "navigation_footer_columns_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."navigation_footer_columns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "navigation_footer_columns" ADD CONSTRAINT "navigation_footer_columns_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."navigation"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "navigation_footer_bottom_links" ADD CONSTRAINT "navigation_footer_bottom_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."navigation"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "navigation_rels" ADD CONSTRAINT "navigation_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."navigation"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "navigation_rels" ADD CONSTRAINT "navigation_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "navigation_rels" ADD CONSTRAINT "navigation_rels_glass_types_fk" FOREIGN KEY ("glass_types_id") REFERENCES "public"."glass_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "navigation_rels" ADD CONSTRAINT "navigation_rels_thicknesses_fk" FOREIGN KEY ("thicknesses_id") REFERENCES "public"."thicknesses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "navigation_rels" ADD CONSTRAINT "navigation_rels_processing_services_fk" FOREIGN KEY ("processing_services_id") REFERENCES "public"."processing_services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "navigation_rels" ADD CONSTRAINT "navigation_rels_constructions_fk" FOREIGN KEY ("constructions_id") REFERENCES "public"."constructions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "navigation_rels" ADD CONSTRAINT "navigation_rels_articles_fk" FOREIGN KEY ("articles_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "navigation_rels" ADD CONSTRAINT "navigation_rels_objects_fk" FOREIGN KEY ("objects_id") REFERENCES "public"."objects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "snippets_items" ADD CONSTRAINT "snippets_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."snippets"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "media_is_placeholder_idx" ON "media" USING btree ("is_placeholder");
  CREATE INDEX "media_generated_id_idx" ON "media" USING btree ("generated_id");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX "media_sizes_thumbnail_sizes_thumbnail_filename_idx" ON "media" USING btree ("sizes_thumbnail_filename");
  CREATE INDEX "media_sizes_card_sizes_card_filename_idx" ON "media" USING btree ("sizes_card_filename");
  CREATE INDEX "media_sizes_hero_sizes_hero_filename_idx" ON "media" USING btree ("sizes_hero_filename");
  CREATE INDEX "media_sizes_og_sizes_og_filename_idx" ON "media" USING btree ("sizes_og_filename");
  CREATE INDEX "pages_blk_hero_eyebrow_order_idx" ON "pages_blk_hero_eyebrow" USING btree ("_order");
  CREATE INDEX "pages_blk_hero_eyebrow_parent_id_idx" ON "pages_blk_hero_eyebrow" USING btree ("_parent_id");
  CREATE INDEX "pages_blk_hero_buttons_order_idx" ON "pages_blk_hero_buttons" USING btree ("_order");
  CREATE INDEX "pages_blk_hero_buttons_parent_id_idx" ON "pages_blk_hero_buttons" USING btree ("_parent_id");
  CREATE INDEX "pages_blk_hero_buttons_file_idx" ON "pages_blk_hero_buttons" USING btree ("file_id");
  CREATE INDEX "pages_blk_hero_photos_order_idx" ON "pages_blk_hero_photos" USING btree ("_order");
  CREATE INDEX "pages_blk_hero_photos_parent_id_idx" ON "pages_blk_hero_photos" USING btree ("_parent_id");
  CREATE INDEX "pages_blk_hero_photos_image_idx" ON "pages_blk_hero_photos" USING btree ("image_id");
  CREATE INDEX "pages_blk_hero_stats_order_idx" ON "pages_blk_hero_stats" USING btree ("_order");
  CREATE INDEX "pages_blk_hero_stats_parent_id_idx" ON "pages_blk_hero_stats" USING btree ("_parent_id");
  CREATE INDEX "pages_blk_hero_order_idx" ON "pages_blk_hero" USING btree ("_order");
  CREATE INDEX "pages_blk_hero_parent_id_idx" ON "pages_blk_hero" USING btree ("_parent_id");
  CREATE INDEX "pages_blk_hero_path_idx" ON "pages_blk_hero" USING btree ("_path");
  CREATE INDEX "pages_blk_hero_image_idx" ON "pages_blk_hero" USING btree ("image_id");
  CREATE INDEX "pages_blk_text_order_idx" ON "pages_blk_text" USING btree ("_order");
  CREATE INDEX "pages_blk_text_parent_id_idx" ON "pages_blk_text" USING btree ("_parent_id");
  CREATE INDEX "pages_blk_text_path_idx" ON "pages_blk_text" USING btree ("_path");
  CREATE INDEX "pages_blk_table_table_cols_order_idx" ON "pages_blk_table_table_cols" USING btree ("_order");
  CREATE INDEX "pages_blk_table_table_cols_parent_id_idx" ON "pages_blk_table_table_cols" USING btree ("_parent_id");
  CREATE INDEX "pages_blk_table_table_rows_cells_order_idx" ON "pages_blk_table_table_rows_cells" USING btree ("_order");
  CREATE INDEX "pages_blk_table_table_rows_cells_parent_id_idx" ON "pages_blk_table_table_rows_cells" USING btree ("_parent_id");
  CREATE INDEX "pages_blk_table_table_rows_order_idx" ON "pages_blk_table_table_rows" USING btree ("_order");
  CREATE INDEX "pages_blk_table_table_rows_parent_id_idx" ON "pages_blk_table_table_rows" USING btree ("_parent_id");
  CREATE INDEX "pages_blk_table_order_idx" ON "pages_blk_table" USING btree ("_order");
  CREATE INDEX "pages_blk_table_parent_id_idx" ON "pages_blk_table" USING btree ("_parent_id");
  CREATE INDEX "pages_blk_table_path_idx" ON "pages_blk_table" USING btree ("_path");
  CREATE INDEX "pages_blk_steps_items_order_idx" ON "pages_blk_steps_items" USING btree ("_order");
  CREATE INDEX "pages_blk_steps_items_parent_id_idx" ON "pages_blk_steps_items" USING btree ("_parent_id");
  CREATE INDEX "pages_blk_steps_buttons_order_idx" ON "pages_blk_steps_buttons" USING btree ("_order");
  CREATE INDEX "pages_blk_steps_buttons_parent_id_idx" ON "pages_blk_steps_buttons" USING btree ("_parent_id");
  CREATE INDEX "pages_blk_steps_buttons_file_idx" ON "pages_blk_steps_buttons" USING btree ("file_id");
  CREATE INDEX "pages_blk_steps_order_idx" ON "pages_blk_steps" USING btree ("_order");
  CREATE INDEX "pages_blk_steps_parent_id_idx" ON "pages_blk_steps" USING btree ("_parent_id");
  CREATE INDEX "pages_blk_steps_path_idx" ON "pages_blk_steps" USING btree ("_path");
  CREATE INDEX "pages_blk_callout_items_order_idx" ON "pages_blk_callout_items" USING btree ("_order");
  CREATE INDEX "pages_blk_callout_items_parent_id_idx" ON "pages_blk_callout_items" USING btree ("_parent_id");
  CREATE INDEX "pages_blk_callout_order_idx" ON "pages_blk_callout" USING btree ("_order");
  CREATE INDEX "pages_blk_callout_parent_id_idx" ON "pages_blk_callout" USING btree ("_parent_id");
  CREATE INDEX "pages_blk_callout_path_idx" ON "pages_blk_callout" USING btree ("_path");
  CREATE INDEX "pages_blk_terms_items_order_idx" ON "pages_blk_terms_items" USING btree ("_order");
  CREATE INDEX "pages_blk_terms_items_parent_id_idx" ON "pages_blk_terms_items" USING btree ("_parent_id");
  CREATE INDEX "pages_blk_terms_order_idx" ON "pages_blk_terms" USING btree ("_order");
  CREATE INDEX "pages_blk_terms_parent_id_idx" ON "pages_blk_terms" USING btree ("_parent_id");
  CREATE INDEX "pages_blk_terms_path_idx" ON "pages_blk_terms" USING btree ("_path");
  CREATE INDEX "pages_blk_cards_items_order_idx" ON "pages_blk_cards_items" USING btree ("_order");
  CREATE INDEX "pages_blk_cards_items_parent_id_idx" ON "pages_blk_cards_items" USING btree ("_parent_id");
  CREATE INDEX "pages_blk_cards_items_image_idx" ON "pages_blk_cards_items" USING btree ("image_id");
  CREATE INDEX "pages_blk_cards_order_idx" ON "pages_blk_cards" USING btree ("_order");
  CREATE INDEX "pages_blk_cards_parent_id_idx" ON "pages_blk_cards" USING btree ("_parent_id");
  CREATE INDEX "pages_blk_cards_path_idx" ON "pages_blk_cards" USING btree ("_path");
  CREATE INDEX "pages_blk_coll_cards_order_idx" ON "pages_blk_coll_cards" USING btree ("_order");
  CREATE INDEX "pages_blk_coll_cards_parent_id_idx" ON "pages_blk_coll_cards" USING btree ("_parent_id");
  CREATE INDEX "pages_blk_coll_cards_path_idx" ON "pages_blk_coll_cards" USING btree ("_path");
  CREATE INDEX "pages_blk_prices_order_idx" ON "pages_blk_prices" USING btree ("_order");
  CREATE INDEX "pages_blk_prices_parent_id_idx" ON "pages_blk_prices" USING btree ("_parent_id");
  CREATE INDEX "pages_blk_prices_path_idx" ON "pages_blk_prices" USING btree ("_path");
  CREATE INDEX "pages_blk_faq_items_order_idx" ON "pages_blk_faq_items" USING btree ("_order");
  CREATE INDEX "pages_blk_faq_items_parent_id_idx" ON "pages_blk_faq_items" USING btree ("_parent_id");
  CREATE INDEX "pages_blk_faq_order_idx" ON "pages_blk_faq" USING btree ("_order");
  CREATE INDEX "pages_blk_faq_parent_id_idx" ON "pages_blk_faq" USING btree ("_parent_id");
  CREATE INDEX "pages_blk_faq_path_idx" ON "pages_blk_faq" USING btree ("_path");
  CREATE INDEX "pages_blk_cta_buttons_order_idx" ON "pages_blk_cta_buttons" USING btree ("_order");
  CREATE INDEX "pages_blk_cta_buttons_parent_id_idx" ON "pages_blk_cta_buttons" USING btree ("_parent_id");
  CREATE INDEX "pages_blk_cta_buttons_file_idx" ON "pages_blk_cta_buttons" USING btree ("file_id");
  CREATE INDEX "pages_blk_cta_order_idx" ON "pages_blk_cta" USING btree ("_order");
  CREATE INDEX "pages_blk_cta_parent_id_idx" ON "pages_blk_cta" USING btree ("_parent_id");
  CREATE INDEX "pages_blk_cta_path_idx" ON "pages_blk_cta" USING btree ("_path");
  CREATE INDEX "pages_blk_compare_rows_order_idx" ON "pages_blk_compare_rows" USING btree ("_order");
  CREATE INDEX "pages_blk_compare_rows_parent_id_idx" ON "pages_blk_compare_rows" USING btree ("_parent_id");
  CREATE INDEX "pages_blk_compare_order_idx" ON "pages_blk_compare" USING btree ("_order");
  CREATE INDEX "pages_blk_compare_parent_id_idx" ON "pages_blk_compare" USING btree ("_parent_id");
  CREATE INDEX "pages_blk_compare_path_idx" ON "pages_blk_compare" USING btree ("_path");
  CREATE INDEX "pages_blk_download_items_order_idx" ON "pages_blk_download_items" USING btree ("_order");
  CREATE INDEX "pages_blk_download_items_parent_id_idx" ON "pages_blk_download_items" USING btree ("_parent_id");
  CREATE INDEX "pages_blk_download_items_file_idx" ON "pages_blk_download_items" USING btree ("file_id");
  CREATE INDEX "pages_blk_download_order_idx" ON "pages_blk_download" USING btree ("_order");
  CREATE INDEX "pages_blk_download_parent_id_idx" ON "pages_blk_download" USING btree ("_parent_id");
  CREATE INDEX "pages_blk_download_path_idx" ON "pages_blk_download" USING btree ("_path");
  CREATE INDEX "pages_blk_holes_order_idx" ON "pages_blk_holes" USING btree ("_order");
  CREATE INDEX "pages_blk_holes_parent_id_idx" ON "pages_blk_holes" USING btree ("_parent_id");
  CREATE INDEX "pages_blk_holes_path_idx" ON "pages_blk_holes" USING btree ("_path");
  CREATE INDEX "pages_blk_weight_order_idx" ON "pages_blk_weight" USING btree ("_order");
  CREATE INDEX "pages_blk_weight_parent_id_idx" ON "pages_blk_weight" USING btree ("_parent_id");
  CREATE INDEX "pages_blk_weight_path_idx" ON "pages_blk_weight" USING btree ("_path");
  CREATE INDEX "pages_blk_form_bullets_order_idx" ON "pages_blk_form_bullets" USING btree ("_order");
  CREATE INDEX "pages_blk_form_bullets_parent_id_idx" ON "pages_blk_form_bullets" USING btree ("_parent_id");
  CREATE INDEX "pages_blk_form_order_idx" ON "pages_blk_form" USING btree ("_order");
  CREATE INDEX "pages_blk_form_parent_id_idx" ON "pages_blk_form" USING btree ("_parent_id");
  CREATE INDEX "pages_blk_form_path_idx" ON "pages_blk_form" USING btree ("_path");
  CREATE INDEX "pages_blk_snippet_order_idx" ON "pages_blk_snippet" USING btree ("_order");
  CREATE INDEX "pages_blk_snippet_parent_id_idx" ON "pages_blk_snippet" USING btree ("_parent_id");
  CREATE INDEX "pages_blk_snippet_path_idx" ON "pages_blk_snippet" USING btree ("_path");
  CREATE INDEX "pages_blk_stats_items_order_idx" ON "pages_blk_stats_items" USING btree ("_order");
  CREATE INDEX "pages_blk_stats_items_parent_id_idx" ON "pages_blk_stats_items" USING btree ("_parent_id");
  CREATE INDEX "pages_blk_stats_order_idx" ON "pages_blk_stats" USING btree ("_order");
  CREATE INDEX "pages_blk_stats_parent_id_idx" ON "pages_blk_stats" USING btree ("_parent_id");
  CREATE INDEX "pages_blk_stats_path_idx" ON "pages_blk_stats" USING btree ("_path");
  CREATE INDEX "pages_blk_objects_order_idx" ON "pages_blk_objects" USING btree ("_order");
  CREATE INDEX "pages_blk_objects_parent_id_idx" ON "pages_blk_objects" USING btree ("_parent_id");
  CREATE INDEX "pages_blk_objects_path_idx" ON "pages_blk_objects" USING btree ("_path");
  CREATE INDEX "pages_blk_objects_product_idx" ON "pages_blk_objects" USING btree ("product_id");
  CREATE INDEX "pages_blk_articles_order_idx" ON "pages_blk_articles" USING btree ("_order");
  CREATE INDEX "pages_blk_articles_parent_id_idx" ON "pages_blk_articles" USING btree ("_parent_id");
  CREATE INDEX "pages_blk_articles_path_idx" ON "pages_blk_articles" USING btree ("_path");
  CREATE INDEX "pages_blk_wdw_left_order_idx" ON "pages_blk_wdw_left" USING btree ("_order");
  CREATE INDEX "pages_blk_wdw_left_parent_id_idx" ON "pages_blk_wdw_left" USING btree ("_parent_id");
  CREATE INDEX "pages_blk_wdw_right_order_idx" ON "pages_blk_wdw_right" USING btree ("_order");
  CREATE INDEX "pages_blk_wdw_right_parent_id_idx" ON "pages_blk_wdw_right" USING btree ("_parent_id");
  CREATE INDEX "pages_blk_wdw_order_idx" ON "pages_blk_wdw" USING btree ("_order");
  CREATE INDEX "pages_blk_wdw_parent_id_idx" ON "pages_blk_wdw" USING btree ("_parent_id");
  CREATE INDEX "pages_blk_wdw_path_idx" ON "pages_blk_wdw" USING btree ("_path");
  CREATE INDEX "pages_blk_systems_items_order_idx" ON "pages_blk_systems_items" USING btree ("_order");
  CREATE INDEX "pages_blk_systems_items_parent_id_idx" ON "pages_blk_systems_items" USING btree ("_parent_id");
  CREATE INDEX "pages_blk_systems_items_image_idx" ON "pages_blk_systems_items" USING btree ("image_id");
  CREATE INDEX "pages_blk_systems_order_idx" ON "pages_blk_systems" USING btree ("_order");
  CREATE INDEX "pages_blk_systems_parent_id_idx" ON "pages_blk_systems" USING btree ("_parent_id");
  CREATE INDEX "pages_blk_systems_path_idx" ON "pages_blk_systems" USING btree ("_path");
  CREATE INDEX "pages_blk_gallery_images_order_idx" ON "pages_blk_gallery_images" USING btree ("_order");
  CREATE INDEX "pages_blk_gallery_images_parent_id_idx" ON "pages_blk_gallery_images" USING btree ("_parent_id");
  CREATE INDEX "pages_blk_gallery_images_image_idx" ON "pages_blk_gallery_images" USING btree ("image_id");
  CREATE INDEX "pages_blk_gallery_order_idx" ON "pages_blk_gallery" USING btree ("_order");
  CREATE INDEX "pages_blk_gallery_parent_id_idx" ON "pages_blk_gallery" USING btree ("_parent_id");
  CREATE INDEX "pages_blk_gallery_path_idx" ON "pages_blk_gallery" USING btree ("_path");
  CREATE INDEX "pages_blk_two_cols_order_idx" ON "pages_blk_two_cols" USING btree ("_order");
  CREATE INDEX "pages_blk_two_cols_parent_id_idx" ON "pages_blk_two_cols" USING btree ("_parent_id");
  CREATE INDEX "pages_blk_two_cols_path_idx" ON "pages_blk_two_cols" USING btree ("_path");
  CREATE INDEX "pages_blk_links_items_order_idx" ON "pages_blk_links_items" USING btree ("_order");
  CREATE INDEX "pages_blk_links_items_parent_id_idx" ON "pages_blk_links_items" USING btree ("_parent_id");
  CREATE INDEX "pages_blk_links_order_idx" ON "pages_blk_links" USING btree ("_order");
  CREATE INDEX "pages_blk_links_parent_id_idx" ON "pages_blk_links" USING btree ("_parent_id");
  CREATE INDEX "pages_blk_links_path_idx" ON "pages_blk_links" USING btree ("_path");
  CREATE INDEX "pages_blk_contacts_order_idx" ON "pages_blk_contacts" USING btree ("_order");
  CREATE INDEX "pages_blk_contacts_parent_id_idx" ON "pages_blk_contacts" USING btree ("_parent_id");
  CREATE INDEX "pages_blk_contacts_path_idx" ON "pages_blk_contacts" USING btree ("_path");
  CREATE INDEX "pages_blk_requisites_order_idx" ON "pages_blk_requisites" USING btree ("_order");
  CREATE INDEX "pages_blk_requisites_parent_id_idx" ON "pages_blk_requisites" USING btree ("_parent_id");
  CREATE INDEX "pages_blk_requisites_path_idx" ON "pages_blk_requisites" USING btree ("_path");
  CREATE INDEX "pages_blk_team_order_idx" ON "pages_blk_team" USING btree ("_order");
  CREATE INDEX "pages_blk_team_parent_id_idx" ON "pages_blk_team" USING btree ("_parent_id");
  CREATE INDEX "pages_blk_team_path_idx" ON "pages_blk_team" USING btree ("_path");
  CREATE INDEX "pages_blk_quiz_cta_order_idx" ON "pages_blk_quiz_cta" USING btree ("_order");
  CREATE INDEX "pages_blk_quiz_cta_parent_id_idx" ON "pages_blk_quiz_cta" USING btree ("_parent_id");
  CREATE INDEX "pages_blk_quiz_cta_path_idx" ON "pages_blk_quiz_cta" USING btree ("_path");
  CREATE INDEX "pages_faq_order_idx" ON "pages_faq" USING btree ("_order");
  CREATE INDEX "pages_faq_parent_id_idx" ON "pages_faq" USING btree ("_parent_id");
  CREATE INDEX "pages_legacy_urls_order_idx" ON "pages_legacy_urls" USING btree ("_order");
  CREATE INDEX "pages_legacy_urls_parent_id_idx" ON "pages_legacy_urls" USING btree ("_parent_id");
  CREATE INDEX "pages_parent_idx" ON "pages" USING btree ("parent_id");
  CREATE UNIQUE INDEX "pages_slug_idx" ON "pages" USING btree ("slug");
  CREATE UNIQUE INDEX "pages_path_idx" ON "pages" USING btree ("path");
  CREATE INDEX "pages_seo_seo_og_image_idx" ON "pages" USING btree ("seo_og_image_id");
  CREATE INDEX "pages_updated_at_idx" ON "pages" USING btree ("updated_at");
  CREATE INDEX "pages_created_at_idx" ON "pages" USING btree ("created_at");
  CREATE INDEX "pages__status_idx" ON "pages" USING btree ("_status");
  CREATE INDEX "pages_rels_order_idx" ON "pages_rels" USING btree ("order");
  CREATE INDEX "pages_rels_parent_idx" ON "pages_rels" USING btree ("parent_id");
  CREATE INDEX "pages_rels_path_idx" ON "pages_rels" USING btree ("path");
  CREATE INDEX "pages_rels_pages_id_idx" ON "pages_rels" USING btree ("pages_id");
  CREATE INDEX "pages_rels_glass_types_id_idx" ON "pages_rels" USING btree ("glass_types_id");
  CREATE INDEX "pages_rels_thicknesses_id_idx" ON "pages_rels" USING btree ("thicknesses_id");
  CREATE INDEX "pages_rels_processing_services_id_idx" ON "pages_rels" USING btree ("processing_services_id");
  CREATE INDEX "pages_rels_constructions_id_idx" ON "pages_rels" USING btree ("constructions_id");
  CREATE INDEX "pages_rels_articles_id_idx" ON "pages_rels" USING btree ("articles_id");
  CREATE INDEX "pages_rels_objects_id_idx" ON "pages_rels" USING btree ("objects_id");
  CREATE INDEX "_pages_blk_hero_v_eyebrow_order_idx" ON "_pages_blk_hero_v_eyebrow" USING btree ("_order");
  CREATE INDEX "_pages_blk_hero_v_eyebrow_parent_id_idx" ON "_pages_blk_hero_v_eyebrow" USING btree ("_parent_id");
  CREATE INDEX "_pages_blk_hero_v_buttons_order_idx" ON "_pages_blk_hero_v_buttons" USING btree ("_order");
  CREATE INDEX "_pages_blk_hero_v_buttons_parent_id_idx" ON "_pages_blk_hero_v_buttons" USING btree ("_parent_id");
  CREATE INDEX "_pages_blk_hero_v_buttons_file_idx" ON "_pages_blk_hero_v_buttons" USING btree ("file_id");
  CREATE INDEX "_pages_blk_hero_v_photos_order_idx" ON "_pages_blk_hero_v_photos" USING btree ("_order");
  CREATE INDEX "_pages_blk_hero_v_photos_parent_id_idx" ON "_pages_blk_hero_v_photos" USING btree ("_parent_id");
  CREATE INDEX "_pages_blk_hero_v_photos_image_idx" ON "_pages_blk_hero_v_photos" USING btree ("image_id");
  CREATE INDEX "_pages_blk_hero_v_stats_order_idx" ON "_pages_blk_hero_v_stats" USING btree ("_order");
  CREATE INDEX "_pages_blk_hero_v_stats_parent_id_idx" ON "_pages_blk_hero_v_stats" USING btree ("_parent_id");
  CREATE INDEX "_pages_blk_hero_v_order_idx" ON "_pages_blk_hero_v" USING btree ("_order");
  CREATE INDEX "_pages_blk_hero_v_parent_id_idx" ON "_pages_blk_hero_v" USING btree ("_parent_id");
  CREATE INDEX "_pages_blk_hero_v_path_idx" ON "_pages_blk_hero_v" USING btree ("_path");
  CREATE INDEX "_pages_blk_hero_v_image_idx" ON "_pages_blk_hero_v" USING btree ("image_id");
  CREATE INDEX "_pages_blk_text_v_order_idx" ON "_pages_blk_text_v" USING btree ("_order");
  CREATE INDEX "_pages_blk_text_v_parent_id_idx" ON "_pages_blk_text_v" USING btree ("_parent_id");
  CREATE INDEX "_pages_blk_text_v_path_idx" ON "_pages_blk_text_v" USING btree ("_path");
  CREATE INDEX "_pages_blk_table_table_cols_v_order_idx" ON "_pages_blk_table_table_cols_v" USING btree ("_order");
  CREATE INDEX "_pages_blk_table_table_cols_v_parent_id_idx" ON "_pages_blk_table_table_cols_v" USING btree ("_parent_id");
  CREATE INDEX "_pages_blk_table_table_rows_cells_v_order_idx" ON "_pages_blk_table_table_rows_cells_v" USING btree ("_order");
  CREATE INDEX "_pages_blk_table_table_rows_cells_v_parent_id_idx" ON "_pages_blk_table_table_rows_cells_v" USING btree ("_parent_id");
  CREATE INDEX "_pages_blk_table_table_rows_v_order_idx" ON "_pages_blk_table_table_rows_v" USING btree ("_order");
  CREATE INDEX "_pages_blk_table_table_rows_v_parent_id_idx" ON "_pages_blk_table_table_rows_v" USING btree ("_parent_id");
  CREATE INDEX "_pages_blk_table_v_order_idx" ON "_pages_blk_table_v" USING btree ("_order");
  CREATE INDEX "_pages_blk_table_v_parent_id_idx" ON "_pages_blk_table_v" USING btree ("_parent_id");
  CREATE INDEX "_pages_blk_table_v_path_idx" ON "_pages_blk_table_v" USING btree ("_path");
  CREATE INDEX "_pages_blk_steps_v_items_order_idx" ON "_pages_blk_steps_v_items" USING btree ("_order");
  CREATE INDEX "_pages_blk_steps_v_items_parent_id_idx" ON "_pages_blk_steps_v_items" USING btree ("_parent_id");
  CREATE INDEX "_pages_blk_steps_v_buttons_order_idx" ON "_pages_blk_steps_v_buttons" USING btree ("_order");
  CREATE INDEX "_pages_blk_steps_v_buttons_parent_id_idx" ON "_pages_blk_steps_v_buttons" USING btree ("_parent_id");
  CREATE INDEX "_pages_blk_steps_v_buttons_file_idx" ON "_pages_blk_steps_v_buttons" USING btree ("file_id");
  CREATE INDEX "_pages_blk_steps_v_order_idx" ON "_pages_blk_steps_v" USING btree ("_order");
  CREATE INDEX "_pages_blk_steps_v_parent_id_idx" ON "_pages_blk_steps_v" USING btree ("_parent_id");
  CREATE INDEX "_pages_blk_steps_v_path_idx" ON "_pages_blk_steps_v" USING btree ("_path");
  CREATE INDEX "_pages_blk_callout_v_items_order_idx" ON "_pages_blk_callout_v_items" USING btree ("_order");
  CREATE INDEX "_pages_blk_callout_v_items_parent_id_idx" ON "_pages_blk_callout_v_items" USING btree ("_parent_id");
  CREATE INDEX "_pages_blk_callout_v_order_idx" ON "_pages_blk_callout_v" USING btree ("_order");
  CREATE INDEX "_pages_blk_callout_v_parent_id_idx" ON "_pages_blk_callout_v" USING btree ("_parent_id");
  CREATE INDEX "_pages_blk_callout_v_path_idx" ON "_pages_blk_callout_v" USING btree ("_path");
  CREATE INDEX "_pages_blk_terms_v_items_order_idx" ON "_pages_blk_terms_v_items" USING btree ("_order");
  CREATE INDEX "_pages_blk_terms_v_items_parent_id_idx" ON "_pages_blk_terms_v_items" USING btree ("_parent_id");
  CREATE INDEX "_pages_blk_terms_v_order_idx" ON "_pages_blk_terms_v" USING btree ("_order");
  CREATE INDEX "_pages_blk_terms_v_parent_id_idx" ON "_pages_blk_terms_v" USING btree ("_parent_id");
  CREATE INDEX "_pages_blk_terms_v_path_idx" ON "_pages_blk_terms_v" USING btree ("_path");
  CREATE INDEX "_pages_blk_cards_v_items_order_idx" ON "_pages_blk_cards_v_items" USING btree ("_order");
  CREATE INDEX "_pages_blk_cards_v_items_parent_id_idx" ON "_pages_blk_cards_v_items" USING btree ("_parent_id");
  CREATE INDEX "_pages_blk_cards_v_items_image_idx" ON "_pages_blk_cards_v_items" USING btree ("image_id");
  CREATE INDEX "_pages_blk_cards_v_order_idx" ON "_pages_blk_cards_v" USING btree ("_order");
  CREATE INDEX "_pages_blk_cards_v_parent_id_idx" ON "_pages_blk_cards_v" USING btree ("_parent_id");
  CREATE INDEX "_pages_blk_cards_v_path_idx" ON "_pages_blk_cards_v" USING btree ("_path");
  CREATE INDEX "_pages_blk_coll_cards_v_order_idx" ON "_pages_blk_coll_cards_v" USING btree ("_order");
  CREATE INDEX "_pages_blk_coll_cards_v_parent_id_idx" ON "_pages_blk_coll_cards_v" USING btree ("_parent_id");
  CREATE INDEX "_pages_blk_coll_cards_v_path_idx" ON "_pages_blk_coll_cards_v" USING btree ("_path");
  CREATE INDEX "_pages_blk_prices_v_order_idx" ON "_pages_blk_prices_v" USING btree ("_order");
  CREATE INDEX "_pages_blk_prices_v_parent_id_idx" ON "_pages_blk_prices_v" USING btree ("_parent_id");
  CREATE INDEX "_pages_blk_prices_v_path_idx" ON "_pages_blk_prices_v" USING btree ("_path");
  CREATE INDEX "_pages_blk_faq_v_items_order_idx" ON "_pages_blk_faq_v_items" USING btree ("_order");
  CREATE INDEX "_pages_blk_faq_v_items_parent_id_idx" ON "_pages_blk_faq_v_items" USING btree ("_parent_id");
  CREATE INDEX "_pages_blk_faq_v_order_idx" ON "_pages_blk_faq_v" USING btree ("_order");
  CREATE INDEX "_pages_blk_faq_v_parent_id_idx" ON "_pages_blk_faq_v" USING btree ("_parent_id");
  CREATE INDEX "_pages_blk_faq_v_path_idx" ON "_pages_blk_faq_v" USING btree ("_path");
  CREATE INDEX "_pages_blk_cta_v_buttons_order_idx" ON "_pages_blk_cta_v_buttons" USING btree ("_order");
  CREATE INDEX "_pages_blk_cta_v_buttons_parent_id_idx" ON "_pages_blk_cta_v_buttons" USING btree ("_parent_id");
  CREATE INDEX "_pages_blk_cta_v_buttons_file_idx" ON "_pages_blk_cta_v_buttons" USING btree ("file_id");
  CREATE INDEX "_pages_blk_cta_v_order_idx" ON "_pages_blk_cta_v" USING btree ("_order");
  CREATE INDEX "_pages_blk_cta_v_parent_id_idx" ON "_pages_blk_cta_v" USING btree ("_parent_id");
  CREATE INDEX "_pages_blk_cta_v_path_idx" ON "_pages_blk_cta_v" USING btree ("_path");
  CREATE INDEX "_pages_blk_compare_v_rows_order_idx" ON "_pages_blk_compare_v_rows" USING btree ("_order");
  CREATE INDEX "_pages_blk_compare_v_rows_parent_id_idx" ON "_pages_blk_compare_v_rows" USING btree ("_parent_id");
  CREATE INDEX "_pages_blk_compare_v_order_idx" ON "_pages_blk_compare_v" USING btree ("_order");
  CREATE INDEX "_pages_blk_compare_v_parent_id_idx" ON "_pages_blk_compare_v" USING btree ("_parent_id");
  CREATE INDEX "_pages_blk_compare_v_path_idx" ON "_pages_blk_compare_v" USING btree ("_path");
  CREATE INDEX "_pages_blk_download_v_items_order_idx" ON "_pages_blk_download_v_items" USING btree ("_order");
  CREATE INDEX "_pages_blk_download_v_items_parent_id_idx" ON "_pages_blk_download_v_items" USING btree ("_parent_id");
  CREATE INDEX "_pages_blk_download_v_items_file_idx" ON "_pages_blk_download_v_items" USING btree ("file_id");
  CREATE INDEX "_pages_blk_download_v_order_idx" ON "_pages_blk_download_v" USING btree ("_order");
  CREATE INDEX "_pages_blk_download_v_parent_id_idx" ON "_pages_blk_download_v" USING btree ("_parent_id");
  CREATE INDEX "_pages_blk_download_v_path_idx" ON "_pages_blk_download_v" USING btree ("_path");
  CREATE INDEX "_pages_blk_holes_v_order_idx" ON "_pages_blk_holes_v" USING btree ("_order");
  CREATE INDEX "_pages_blk_holes_v_parent_id_idx" ON "_pages_blk_holes_v" USING btree ("_parent_id");
  CREATE INDEX "_pages_blk_holes_v_path_idx" ON "_pages_blk_holes_v" USING btree ("_path");
  CREATE INDEX "_pages_blk_weight_v_order_idx" ON "_pages_blk_weight_v" USING btree ("_order");
  CREATE INDEX "_pages_blk_weight_v_parent_id_idx" ON "_pages_blk_weight_v" USING btree ("_parent_id");
  CREATE INDEX "_pages_blk_weight_v_path_idx" ON "_pages_blk_weight_v" USING btree ("_path");
  CREATE INDEX "_pages_blk_form_v_bullets_order_idx" ON "_pages_blk_form_v_bullets" USING btree ("_order");
  CREATE INDEX "_pages_blk_form_v_bullets_parent_id_idx" ON "_pages_blk_form_v_bullets" USING btree ("_parent_id");
  CREATE INDEX "_pages_blk_form_v_order_idx" ON "_pages_blk_form_v" USING btree ("_order");
  CREATE INDEX "_pages_blk_form_v_parent_id_idx" ON "_pages_blk_form_v" USING btree ("_parent_id");
  CREATE INDEX "_pages_blk_form_v_path_idx" ON "_pages_blk_form_v" USING btree ("_path");
  CREATE INDEX "_pages_blk_snippet_v_order_idx" ON "_pages_blk_snippet_v" USING btree ("_order");
  CREATE INDEX "_pages_blk_snippet_v_parent_id_idx" ON "_pages_blk_snippet_v" USING btree ("_parent_id");
  CREATE INDEX "_pages_blk_snippet_v_path_idx" ON "_pages_blk_snippet_v" USING btree ("_path");
  CREATE INDEX "_pages_blk_stats_v_items_order_idx" ON "_pages_blk_stats_v_items" USING btree ("_order");
  CREATE INDEX "_pages_blk_stats_v_items_parent_id_idx" ON "_pages_blk_stats_v_items" USING btree ("_parent_id");
  CREATE INDEX "_pages_blk_stats_v_order_idx" ON "_pages_blk_stats_v" USING btree ("_order");
  CREATE INDEX "_pages_blk_stats_v_parent_id_idx" ON "_pages_blk_stats_v" USING btree ("_parent_id");
  CREATE INDEX "_pages_blk_stats_v_path_idx" ON "_pages_blk_stats_v" USING btree ("_path");
  CREATE INDEX "_pages_blk_objects_v_order_idx" ON "_pages_blk_objects_v" USING btree ("_order");
  CREATE INDEX "_pages_blk_objects_v_parent_id_idx" ON "_pages_blk_objects_v" USING btree ("_parent_id");
  CREATE INDEX "_pages_blk_objects_v_path_idx" ON "_pages_blk_objects_v" USING btree ("_path");
  CREATE INDEX "_pages_blk_objects_v_product_idx" ON "_pages_blk_objects_v" USING btree ("product_id");
  CREATE INDEX "_pages_blk_articles_v_order_idx" ON "_pages_blk_articles_v" USING btree ("_order");
  CREATE INDEX "_pages_blk_articles_v_parent_id_idx" ON "_pages_blk_articles_v" USING btree ("_parent_id");
  CREATE INDEX "_pages_blk_articles_v_path_idx" ON "_pages_blk_articles_v" USING btree ("_path");
  CREATE INDEX "_pages_blk_wdw_left_v_order_idx" ON "_pages_blk_wdw_left_v" USING btree ("_order");
  CREATE INDEX "_pages_blk_wdw_left_v_parent_id_idx" ON "_pages_blk_wdw_left_v" USING btree ("_parent_id");
  CREATE INDEX "_pages_blk_wdw_right_v_order_idx" ON "_pages_blk_wdw_right_v" USING btree ("_order");
  CREATE INDEX "_pages_blk_wdw_right_v_parent_id_idx" ON "_pages_blk_wdw_right_v" USING btree ("_parent_id");
  CREATE INDEX "_pages_blk_wdw_v_order_idx" ON "_pages_blk_wdw_v" USING btree ("_order");
  CREATE INDEX "_pages_blk_wdw_v_parent_id_idx" ON "_pages_blk_wdw_v" USING btree ("_parent_id");
  CREATE INDEX "_pages_blk_wdw_v_path_idx" ON "_pages_blk_wdw_v" USING btree ("_path");
  CREATE INDEX "_pages_blk_systems_v_items_order_idx" ON "_pages_blk_systems_v_items" USING btree ("_order");
  CREATE INDEX "_pages_blk_systems_v_items_parent_id_idx" ON "_pages_blk_systems_v_items" USING btree ("_parent_id");
  CREATE INDEX "_pages_blk_systems_v_items_image_idx" ON "_pages_blk_systems_v_items" USING btree ("image_id");
  CREATE INDEX "_pages_blk_systems_v_order_idx" ON "_pages_blk_systems_v" USING btree ("_order");
  CREATE INDEX "_pages_blk_systems_v_parent_id_idx" ON "_pages_blk_systems_v" USING btree ("_parent_id");
  CREATE INDEX "_pages_blk_systems_v_path_idx" ON "_pages_blk_systems_v" USING btree ("_path");
  CREATE INDEX "_pages_blk_gallery_v_images_order_idx" ON "_pages_blk_gallery_v_images" USING btree ("_order");
  CREATE INDEX "_pages_blk_gallery_v_images_parent_id_idx" ON "_pages_blk_gallery_v_images" USING btree ("_parent_id");
  CREATE INDEX "_pages_blk_gallery_v_images_image_idx" ON "_pages_blk_gallery_v_images" USING btree ("image_id");
  CREATE INDEX "_pages_blk_gallery_v_order_idx" ON "_pages_blk_gallery_v" USING btree ("_order");
  CREATE INDEX "_pages_blk_gallery_v_parent_id_idx" ON "_pages_blk_gallery_v" USING btree ("_parent_id");
  CREATE INDEX "_pages_blk_gallery_v_path_idx" ON "_pages_blk_gallery_v" USING btree ("_path");
  CREATE INDEX "_pages_blk_two_cols_v_order_idx" ON "_pages_blk_two_cols_v" USING btree ("_order");
  CREATE INDEX "_pages_blk_two_cols_v_parent_id_idx" ON "_pages_blk_two_cols_v" USING btree ("_parent_id");
  CREATE INDEX "_pages_blk_two_cols_v_path_idx" ON "_pages_blk_two_cols_v" USING btree ("_path");
  CREATE INDEX "_pages_blk_links_v_items_order_idx" ON "_pages_blk_links_v_items" USING btree ("_order");
  CREATE INDEX "_pages_blk_links_v_items_parent_id_idx" ON "_pages_blk_links_v_items" USING btree ("_parent_id");
  CREATE INDEX "_pages_blk_links_v_order_idx" ON "_pages_blk_links_v" USING btree ("_order");
  CREATE INDEX "_pages_blk_links_v_parent_id_idx" ON "_pages_blk_links_v" USING btree ("_parent_id");
  CREATE INDEX "_pages_blk_links_v_path_idx" ON "_pages_blk_links_v" USING btree ("_path");
  CREATE INDEX "_pages_blk_contacts_v_order_idx" ON "_pages_blk_contacts_v" USING btree ("_order");
  CREATE INDEX "_pages_blk_contacts_v_parent_id_idx" ON "_pages_blk_contacts_v" USING btree ("_parent_id");
  CREATE INDEX "_pages_blk_contacts_v_path_idx" ON "_pages_blk_contacts_v" USING btree ("_path");
  CREATE INDEX "_pages_blk_requisites_v_order_idx" ON "_pages_blk_requisites_v" USING btree ("_order");
  CREATE INDEX "_pages_blk_requisites_v_parent_id_idx" ON "_pages_blk_requisites_v" USING btree ("_parent_id");
  CREATE INDEX "_pages_blk_requisites_v_path_idx" ON "_pages_blk_requisites_v" USING btree ("_path");
  CREATE INDEX "_pages_blk_team_v_order_idx" ON "_pages_blk_team_v" USING btree ("_order");
  CREATE INDEX "_pages_blk_team_v_parent_id_idx" ON "_pages_blk_team_v" USING btree ("_parent_id");
  CREATE INDEX "_pages_blk_team_v_path_idx" ON "_pages_blk_team_v" USING btree ("_path");
  CREATE INDEX "_pages_blk_quiz_cta_v_order_idx" ON "_pages_blk_quiz_cta_v" USING btree ("_order");
  CREATE INDEX "_pages_blk_quiz_cta_v_parent_id_idx" ON "_pages_blk_quiz_cta_v" USING btree ("_parent_id");
  CREATE INDEX "_pages_blk_quiz_cta_v_path_idx" ON "_pages_blk_quiz_cta_v" USING btree ("_path");
  CREATE INDEX "_pages_v_version_faq_order_idx" ON "_pages_v_version_faq" USING btree ("_order");
  CREATE INDEX "_pages_v_version_faq_parent_id_idx" ON "_pages_v_version_faq" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_version_legacy_urls_order_idx" ON "_pages_v_version_legacy_urls" USING btree ("_order");
  CREATE INDEX "_pages_v_version_legacy_urls_parent_id_idx" ON "_pages_v_version_legacy_urls" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_parent_idx" ON "_pages_v" USING btree ("parent_id");
  CREATE INDEX "_pages_v_version_version_parent_idx" ON "_pages_v" USING btree ("version_parent_id");
  CREATE INDEX "_pages_v_version_version_slug_idx" ON "_pages_v" USING btree ("version_slug");
  CREATE INDEX "_pages_v_version_version_path_idx" ON "_pages_v" USING btree ("version_path");
  CREATE INDEX "_pages_v_version_seo_version_seo_og_image_idx" ON "_pages_v" USING btree ("version_seo_og_image_id");
  CREATE INDEX "_pages_v_version_version_updated_at_idx" ON "_pages_v" USING btree ("version_updated_at");
  CREATE INDEX "_pages_v_version_version_created_at_idx" ON "_pages_v" USING btree ("version_created_at");
  CREATE INDEX "_pages_v_version_version__status_idx" ON "_pages_v" USING btree ("version__status");
  CREATE INDEX "_pages_v_created_at_idx" ON "_pages_v" USING btree ("created_at");
  CREATE INDEX "_pages_v_updated_at_idx" ON "_pages_v" USING btree ("updated_at");
  CREATE INDEX "_pages_v_latest_idx" ON "_pages_v" USING btree ("latest");
  CREATE INDEX "_pages_v_rels_order_idx" ON "_pages_v_rels" USING btree ("order");
  CREATE INDEX "_pages_v_rels_parent_idx" ON "_pages_v_rels" USING btree ("parent_id");
  CREATE INDEX "_pages_v_rels_path_idx" ON "_pages_v_rels" USING btree ("path");
  CREATE INDEX "_pages_v_rels_pages_id_idx" ON "_pages_v_rels" USING btree ("pages_id");
  CREATE INDEX "_pages_v_rels_glass_types_id_idx" ON "_pages_v_rels" USING btree ("glass_types_id");
  CREATE INDEX "_pages_v_rels_thicknesses_id_idx" ON "_pages_v_rels" USING btree ("thicknesses_id");
  CREATE INDEX "_pages_v_rels_processing_services_id_idx" ON "_pages_v_rels" USING btree ("processing_services_id");
  CREATE INDEX "_pages_v_rels_constructions_id_idx" ON "_pages_v_rels" USING btree ("constructions_id");
  CREATE INDEX "_pages_v_rels_articles_id_idx" ON "_pages_v_rels" USING btree ("articles_id");
  CREATE INDEX "_pages_v_rels_objects_id_idx" ON "_pages_v_rels" USING btree ("objects_id");
  CREATE INDEX "articles_tools_order_idx" ON "articles_tools" USING btree ("_order");
  CREATE INDEX "articles_tools_parent_id_idx" ON "articles_tools" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "articles_slug_idx" ON "articles" USING btree ("slug");
  CREATE UNIQUE INDEX "articles_path_idx" ON "articles" USING btree ("path");
  CREATE INDEX "articles_date_published_idx" ON "articles" USING btree ("date_published");
  CREATE INDEX "articles_hero_image_idx" ON "articles" USING btree ("hero_image_id");
  CREATE INDEX "articles_author_idx" ON "articles" USING btree ("author_id");
  CREATE INDEX "articles_card_card_image_idx" ON "articles" USING btree ("card_image_id");
  CREATE INDEX "articles_seo_seo_og_image_idx" ON "articles" USING btree ("seo_og_image_id");
  CREATE INDEX "articles_updated_at_idx" ON "articles" USING btree ("updated_at");
  CREATE INDEX "articles_created_at_idx" ON "articles" USING btree ("created_at");
  CREATE INDEX "articles__status_idx" ON "articles" USING btree ("_status");
  CREATE INDEX "articles_rels_order_idx" ON "articles_rels" USING btree ("order");
  CREATE INDEX "articles_rels_parent_idx" ON "articles_rels" USING btree ("parent_id");
  CREATE INDEX "articles_rels_path_idx" ON "articles_rels" USING btree ("path");
  CREATE INDEX "articles_rels_pages_id_idx" ON "articles_rels" USING btree ("pages_id");
  CREATE INDEX "articles_rels_glass_types_id_idx" ON "articles_rels" USING btree ("glass_types_id");
  CREATE INDEX "articles_rels_thicknesses_id_idx" ON "articles_rels" USING btree ("thicknesses_id");
  CREATE INDEX "articles_rels_processing_services_id_idx" ON "articles_rels" USING btree ("processing_services_id");
  CREATE INDEX "articles_rels_constructions_id_idx" ON "articles_rels" USING btree ("constructions_id");
  CREATE INDEX "articles_rels_articles_id_idx" ON "articles_rels" USING btree ("articles_id");
  CREATE INDEX "articles_rels_objects_id_idx" ON "articles_rels" USING btree ("objects_id");
  CREATE INDEX "_articles_v_version_tools_order_idx" ON "_articles_v_version_tools" USING btree ("_order");
  CREATE INDEX "_articles_v_version_tools_parent_id_idx" ON "_articles_v_version_tools" USING btree ("_parent_id");
  CREATE INDEX "_articles_v_parent_idx" ON "_articles_v" USING btree ("parent_id");
  CREATE INDEX "_articles_v_version_version_slug_idx" ON "_articles_v" USING btree ("version_slug");
  CREATE INDEX "_articles_v_version_version_path_idx" ON "_articles_v" USING btree ("version_path");
  CREATE INDEX "_articles_v_version_version_date_published_idx" ON "_articles_v" USING btree ("version_date_published");
  CREATE INDEX "_articles_v_version_version_hero_image_idx" ON "_articles_v" USING btree ("version_hero_image_id");
  CREATE INDEX "_articles_v_version_version_author_idx" ON "_articles_v" USING btree ("version_author_id");
  CREATE INDEX "_articles_v_version_card_version_card_image_idx" ON "_articles_v" USING btree ("version_card_image_id");
  CREATE INDEX "_articles_v_version_seo_version_seo_og_image_idx" ON "_articles_v" USING btree ("version_seo_og_image_id");
  CREATE INDEX "_articles_v_version_version_updated_at_idx" ON "_articles_v" USING btree ("version_updated_at");
  CREATE INDEX "_articles_v_version_version_created_at_idx" ON "_articles_v" USING btree ("version_created_at");
  CREATE INDEX "_articles_v_version_version__status_idx" ON "_articles_v" USING btree ("version__status");
  CREATE INDEX "_articles_v_created_at_idx" ON "_articles_v" USING btree ("created_at");
  CREATE INDEX "_articles_v_updated_at_idx" ON "_articles_v" USING btree ("updated_at");
  CREATE INDEX "_articles_v_latest_idx" ON "_articles_v" USING btree ("latest");
  CREATE INDEX "_articles_v_rels_order_idx" ON "_articles_v_rels" USING btree ("order");
  CREATE INDEX "_articles_v_rels_parent_idx" ON "_articles_v_rels" USING btree ("parent_id");
  CREATE INDEX "_articles_v_rels_path_idx" ON "_articles_v_rels" USING btree ("path");
  CREATE INDEX "_articles_v_rels_pages_id_idx" ON "_articles_v_rels" USING btree ("pages_id");
  CREATE INDEX "_articles_v_rels_glass_types_id_idx" ON "_articles_v_rels" USING btree ("glass_types_id");
  CREATE INDEX "_articles_v_rels_thicknesses_id_idx" ON "_articles_v_rels" USING btree ("thicknesses_id");
  CREATE INDEX "_articles_v_rels_processing_services_id_idx" ON "_articles_v_rels" USING btree ("processing_services_id");
  CREATE INDEX "_articles_v_rels_constructions_id_idx" ON "_articles_v_rels" USING btree ("constructions_id");
  CREATE INDEX "_articles_v_rels_articles_id_idx" ON "_articles_v_rels" USING btree ("articles_id");
  CREATE INDEX "_articles_v_rels_objects_id_idx" ON "_articles_v_rels" USING btree ("objects_id");
  CREATE INDEX "objects_spec_order_idx" ON "objects_spec" USING btree ("_order");
  CREATE INDEX "objects_spec_parent_id_idx" ON "objects_spec" USING btree ("_parent_id");
  CREATE INDEX "objects_chips_order_idx" ON "objects_chips" USING btree ("_order");
  CREATE INDEX "objects_chips_parent_id_idx" ON "objects_chips" USING btree ("_parent_id");
  CREATE INDEX "objects_photos_order_idx" ON "objects_photos" USING btree ("_order");
  CREATE INDEX "objects_photos_parent_id_idx" ON "objects_photos" USING btree ("_parent_id");
  CREATE INDEX "objects_photos_image_idx" ON "objects_photos" USING btree ("image_id");
  CREATE INDEX "objects_legacy_urls_order_idx" ON "objects_legacy_urls" USING btree ("_order");
  CREATE INDEX "objects_legacy_urls_parent_id_idx" ON "objects_legacy_urls" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "objects_slug_idx" ON "objects" USING btree ("slug");
  CREATE UNIQUE INDEX "objects_path_idx" ON "objects" USING btree ("path");
  CREATE INDEX "objects_featured_idx" ON "objects" USING btree ("featured");
  CREATE INDEX "objects_sort_date_idx" ON "objects" USING btree ("sort_date");
  CREATE INDEX "objects_city_idx" ON "objects" USING btree ("city_id");
  CREATE INDEX "objects_object_type_idx" ON "objects" USING btree ("object_type_id");
  CREATE INDEX "objects_legacy_id_idx" ON "objects" USING btree ("legacy_id");
  CREATE INDEX "objects_seo_seo_og_image_idx" ON "objects" USING btree ("seo_og_image_id");
  CREATE INDEX "objects_updated_at_idx" ON "objects" USING btree ("updated_at");
  CREATE INDEX "objects_created_at_idx" ON "objects" USING btree ("created_at");
  CREATE INDEX "objects__status_idx" ON "objects" USING btree ("_status");
  CREATE INDEX "objects_rels_order_idx" ON "objects_rels" USING btree ("order");
  CREATE INDEX "objects_rels_parent_idx" ON "objects_rels" USING btree ("parent_id");
  CREATE INDEX "objects_rels_path_idx" ON "objects_rels" USING btree ("path");
  CREATE INDEX "objects_rels_products_id_idx" ON "objects_rels" USING btree ("products_id");
  CREATE INDEX "objects_rels_objects_id_idx" ON "objects_rels" USING btree ("objects_id");
  CREATE INDEX "_objects_v_version_spec_order_idx" ON "_objects_v_version_spec" USING btree ("_order");
  CREATE INDEX "_objects_v_version_spec_parent_id_idx" ON "_objects_v_version_spec" USING btree ("_parent_id");
  CREATE INDEX "_objects_v_version_chips_order_idx" ON "_objects_v_version_chips" USING btree ("_order");
  CREATE INDEX "_objects_v_version_chips_parent_id_idx" ON "_objects_v_version_chips" USING btree ("_parent_id");
  CREATE INDEX "_objects_v_version_photos_order_idx" ON "_objects_v_version_photos" USING btree ("_order");
  CREATE INDEX "_objects_v_version_photos_parent_id_idx" ON "_objects_v_version_photos" USING btree ("_parent_id");
  CREATE INDEX "_objects_v_version_photos_image_idx" ON "_objects_v_version_photos" USING btree ("image_id");
  CREATE INDEX "_objects_v_version_legacy_urls_order_idx" ON "_objects_v_version_legacy_urls" USING btree ("_order");
  CREATE INDEX "_objects_v_version_legacy_urls_parent_id_idx" ON "_objects_v_version_legacy_urls" USING btree ("_parent_id");
  CREATE INDEX "_objects_v_parent_idx" ON "_objects_v" USING btree ("parent_id");
  CREATE INDEX "_objects_v_version_version_slug_idx" ON "_objects_v" USING btree ("version_slug");
  CREATE INDEX "_objects_v_version_version_path_idx" ON "_objects_v" USING btree ("version_path");
  CREATE INDEX "_objects_v_version_version_featured_idx" ON "_objects_v" USING btree ("version_featured");
  CREATE INDEX "_objects_v_version_version_sort_date_idx" ON "_objects_v" USING btree ("version_sort_date");
  CREATE INDEX "_objects_v_version_version_city_idx" ON "_objects_v" USING btree ("version_city_id");
  CREATE INDEX "_objects_v_version_version_object_type_idx" ON "_objects_v" USING btree ("version_object_type_id");
  CREATE INDEX "_objects_v_version_version_legacy_id_idx" ON "_objects_v" USING btree ("version_legacy_id");
  CREATE INDEX "_objects_v_version_seo_version_seo_og_image_idx" ON "_objects_v" USING btree ("version_seo_og_image_id");
  CREATE INDEX "_objects_v_version_version_updated_at_idx" ON "_objects_v" USING btree ("version_updated_at");
  CREATE INDEX "_objects_v_version_version_created_at_idx" ON "_objects_v" USING btree ("version_created_at");
  CREATE INDEX "_objects_v_version_version__status_idx" ON "_objects_v" USING btree ("version__status");
  CREATE INDEX "_objects_v_created_at_idx" ON "_objects_v" USING btree ("created_at");
  CREATE INDEX "_objects_v_updated_at_idx" ON "_objects_v" USING btree ("updated_at");
  CREATE INDEX "_objects_v_latest_idx" ON "_objects_v" USING btree ("latest");
  CREATE INDEX "_objects_v_rels_order_idx" ON "_objects_v_rels" USING btree ("order");
  CREATE INDEX "_objects_v_rels_parent_idx" ON "_objects_v_rels" USING btree ("parent_id");
  CREATE INDEX "_objects_v_rels_path_idx" ON "_objects_v_rels" USING btree ("path");
  CREATE INDEX "_objects_v_rels_products_id_idx" ON "_objects_v_rels" USING btree ("products_id");
  CREATE INDEX "_objects_v_rels_objects_id_idx" ON "_objects_v_rels" USING btree ("objects_id");
  CREATE INDEX "team_photo_idx" ON "team" USING btree ("photo_id");
  CREATE INDEX "team_updated_at_idx" ON "team" USING btree ("updated_at");
  CREATE INDEX "team_created_at_idx" ON "team" USING btree ("created_at");
  CREATE INDEX "thicknesses_faq_override_order_idx" ON "thicknesses_faq_override" USING btree ("_order");
  CREATE INDEX "thicknesses_faq_override_parent_id_idx" ON "thicknesses_faq_override" USING btree ("_parent_id");
  CREATE INDEX "thicknesses_blk_hero_eyebrow_order_idx" ON "thicknesses_blk_hero_eyebrow" USING btree ("_order");
  CREATE INDEX "thicknesses_blk_hero_eyebrow_parent_id_idx" ON "thicknesses_blk_hero_eyebrow" USING btree ("_parent_id");
  CREATE INDEX "thicknesses_blk_hero_buttons_order_idx" ON "thicknesses_blk_hero_buttons" USING btree ("_order");
  CREATE INDEX "thicknesses_blk_hero_buttons_parent_id_idx" ON "thicknesses_blk_hero_buttons" USING btree ("_parent_id");
  CREATE INDEX "thicknesses_blk_hero_buttons_file_idx" ON "thicknesses_blk_hero_buttons" USING btree ("file_id");
  CREATE INDEX "thicknesses_blk_hero_photos_order_idx" ON "thicknesses_blk_hero_photos" USING btree ("_order");
  CREATE INDEX "thicknesses_blk_hero_photos_parent_id_idx" ON "thicknesses_blk_hero_photos" USING btree ("_parent_id");
  CREATE INDEX "thicknesses_blk_hero_photos_image_idx" ON "thicknesses_blk_hero_photos" USING btree ("image_id");
  CREATE INDEX "thicknesses_blk_hero_stats_order_idx" ON "thicknesses_blk_hero_stats" USING btree ("_order");
  CREATE INDEX "thicknesses_blk_hero_stats_parent_id_idx" ON "thicknesses_blk_hero_stats" USING btree ("_parent_id");
  CREATE INDEX "thicknesses_blk_hero_order_idx" ON "thicknesses_blk_hero" USING btree ("_order");
  CREATE INDEX "thicknesses_blk_hero_parent_id_idx" ON "thicknesses_blk_hero" USING btree ("_parent_id");
  CREATE INDEX "thicknesses_blk_hero_path_idx" ON "thicknesses_blk_hero" USING btree ("_path");
  CREATE INDEX "thicknesses_blk_hero_image_idx" ON "thicknesses_blk_hero" USING btree ("image_id");
  CREATE INDEX "thicknesses_blk_text_order_idx" ON "thicknesses_blk_text" USING btree ("_order");
  CREATE INDEX "thicknesses_blk_text_parent_id_idx" ON "thicknesses_blk_text" USING btree ("_parent_id");
  CREATE INDEX "thicknesses_blk_text_path_idx" ON "thicknesses_blk_text" USING btree ("_path");
  CREATE INDEX "thicknesses_blk_table_table_cols_order_idx" ON "thicknesses_blk_table_table_cols" USING btree ("_order");
  CREATE INDEX "thicknesses_blk_table_table_cols_parent_id_idx" ON "thicknesses_blk_table_table_cols" USING btree ("_parent_id");
  CREATE INDEX "thicknesses_blk_table_table_rows_cells_order_idx" ON "thicknesses_blk_table_table_rows_cells" USING btree ("_order");
  CREATE INDEX "thicknesses_blk_table_table_rows_cells_parent_id_idx" ON "thicknesses_blk_table_table_rows_cells" USING btree ("_parent_id");
  CREATE INDEX "thicknesses_blk_table_table_rows_order_idx" ON "thicknesses_blk_table_table_rows" USING btree ("_order");
  CREATE INDEX "thicknesses_blk_table_table_rows_parent_id_idx" ON "thicknesses_blk_table_table_rows" USING btree ("_parent_id");
  CREATE INDEX "thicknesses_blk_table_order_idx" ON "thicknesses_blk_table" USING btree ("_order");
  CREATE INDEX "thicknesses_blk_table_parent_id_idx" ON "thicknesses_blk_table" USING btree ("_parent_id");
  CREATE INDEX "thicknesses_blk_table_path_idx" ON "thicknesses_blk_table" USING btree ("_path");
  CREATE INDEX "thicknesses_blk_steps_items_order_idx" ON "thicknesses_blk_steps_items" USING btree ("_order");
  CREATE INDEX "thicknesses_blk_steps_items_parent_id_idx" ON "thicknesses_blk_steps_items" USING btree ("_parent_id");
  CREATE INDEX "thicknesses_blk_steps_buttons_order_idx" ON "thicknesses_blk_steps_buttons" USING btree ("_order");
  CREATE INDEX "thicknesses_blk_steps_buttons_parent_id_idx" ON "thicknesses_blk_steps_buttons" USING btree ("_parent_id");
  CREATE INDEX "thicknesses_blk_steps_buttons_file_idx" ON "thicknesses_blk_steps_buttons" USING btree ("file_id");
  CREATE INDEX "thicknesses_blk_steps_order_idx" ON "thicknesses_blk_steps" USING btree ("_order");
  CREATE INDEX "thicknesses_blk_steps_parent_id_idx" ON "thicknesses_blk_steps" USING btree ("_parent_id");
  CREATE INDEX "thicknesses_blk_steps_path_idx" ON "thicknesses_blk_steps" USING btree ("_path");
  CREATE INDEX "thicknesses_blk_callout_items_order_idx" ON "thicknesses_blk_callout_items" USING btree ("_order");
  CREATE INDEX "thicknesses_blk_callout_items_parent_id_idx" ON "thicknesses_blk_callout_items" USING btree ("_parent_id");
  CREATE INDEX "thicknesses_blk_callout_order_idx" ON "thicknesses_blk_callout" USING btree ("_order");
  CREATE INDEX "thicknesses_blk_callout_parent_id_idx" ON "thicknesses_blk_callout" USING btree ("_parent_id");
  CREATE INDEX "thicknesses_blk_callout_path_idx" ON "thicknesses_blk_callout" USING btree ("_path");
  CREATE INDEX "thicknesses_blk_terms_items_order_idx" ON "thicknesses_blk_terms_items" USING btree ("_order");
  CREATE INDEX "thicknesses_blk_terms_items_parent_id_idx" ON "thicknesses_blk_terms_items" USING btree ("_parent_id");
  CREATE INDEX "thicknesses_blk_terms_order_idx" ON "thicknesses_blk_terms" USING btree ("_order");
  CREATE INDEX "thicknesses_blk_terms_parent_id_idx" ON "thicknesses_blk_terms" USING btree ("_parent_id");
  CREATE INDEX "thicknesses_blk_terms_path_idx" ON "thicknesses_blk_terms" USING btree ("_path");
  CREATE INDEX "thicknesses_blk_cards_items_order_idx" ON "thicknesses_blk_cards_items" USING btree ("_order");
  CREATE INDEX "thicknesses_blk_cards_items_parent_id_idx" ON "thicknesses_blk_cards_items" USING btree ("_parent_id");
  CREATE INDEX "thicknesses_blk_cards_items_image_idx" ON "thicknesses_blk_cards_items" USING btree ("image_id");
  CREATE INDEX "thicknesses_blk_cards_order_idx" ON "thicknesses_blk_cards" USING btree ("_order");
  CREATE INDEX "thicknesses_blk_cards_parent_id_idx" ON "thicknesses_blk_cards" USING btree ("_parent_id");
  CREATE INDEX "thicknesses_blk_cards_path_idx" ON "thicknesses_blk_cards" USING btree ("_path");
  CREATE INDEX "thicknesses_blk_coll_cards_order_idx" ON "thicknesses_blk_coll_cards" USING btree ("_order");
  CREATE INDEX "thicknesses_blk_coll_cards_parent_id_idx" ON "thicknesses_blk_coll_cards" USING btree ("_parent_id");
  CREATE INDEX "thicknesses_blk_coll_cards_path_idx" ON "thicknesses_blk_coll_cards" USING btree ("_path");
  CREATE INDEX "thicknesses_blk_prices_order_idx" ON "thicknesses_blk_prices" USING btree ("_order");
  CREATE INDEX "thicknesses_blk_prices_parent_id_idx" ON "thicknesses_blk_prices" USING btree ("_parent_id");
  CREATE INDEX "thicknesses_blk_prices_path_idx" ON "thicknesses_blk_prices" USING btree ("_path");
  CREATE INDEX "thicknesses_blk_faq_items_order_idx" ON "thicknesses_blk_faq_items" USING btree ("_order");
  CREATE INDEX "thicknesses_blk_faq_items_parent_id_idx" ON "thicknesses_blk_faq_items" USING btree ("_parent_id");
  CREATE INDEX "thicknesses_blk_faq_order_idx" ON "thicknesses_blk_faq" USING btree ("_order");
  CREATE INDEX "thicknesses_blk_faq_parent_id_idx" ON "thicknesses_blk_faq" USING btree ("_parent_id");
  CREATE INDEX "thicknesses_blk_faq_path_idx" ON "thicknesses_blk_faq" USING btree ("_path");
  CREATE INDEX "thicknesses_blk_cta_buttons_order_idx" ON "thicknesses_blk_cta_buttons" USING btree ("_order");
  CREATE INDEX "thicknesses_blk_cta_buttons_parent_id_idx" ON "thicknesses_blk_cta_buttons" USING btree ("_parent_id");
  CREATE INDEX "thicknesses_blk_cta_buttons_file_idx" ON "thicknesses_blk_cta_buttons" USING btree ("file_id");
  CREATE INDEX "thicknesses_blk_cta_order_idx" ON "thicknesses_blk_cta" USING btree ("_order");
  CREATE INDEX "thicknesses_blk_cta_parent_id_idx" ON "thicknesses_blk_cta" USING btree ("_parent_id");
  CREATE INDEX "thicknesses_blk_cta_path_idx" ON "thicknesses_blk_cta" USING btree ("_path");
  CREATE INDEX "thicknesses_blk_compare_rows_order_idx" ON "thicknesses_blk_compare_rows" USING btree ("_order");
  CREATE INDEX "thicknesses_blk_compare_rows_parent_id_idx" ON "thicknesses_blk_compare_rows" USING btree ("_parent_id");
  CREATE INDEX "thicknesses_blk_compare_order_idx" ON "thicknesses_blk_compare" USING btree ("_order");
  CREATE INDEX "thicknesses_blk_compare_parent_id_idx" ON "thicknesses_blk_compare" USING btree ("_parent_id");
  CREATE INDEX "thicknesses_blk_compare_path_idx" ON "thicknesses_blk_compare" USING btree ("_path");
  CREATE INDEX "thicknesses_blk_download_items_order_idx" ON "thicknesses_blk_download_items" USING btree ("_order");
  CREATE INDEX "thicknesses_blk_download_items_parent_id_idx" ON "thicknesses_blk_download_items" USING btree ("_parent_id");
  CREATE INDEX "thicknesses_blk_download_items_file_idx" ON "thicknesses_blk_download_items" USING btree ("file_id");
  CREATE INDEX "thicknesses_blk_download_order_idx" ON "thicknesses_blk_download" USING btree ("_order");
  CREATE INDEX "thicknesses_blk_download_parent_id_idx" ON "thicknesses_blk_download" USING btree ("_parent_id");
  CREATE INDEX "thicknesses_blk_download_path_idx" ON "thicknesses_blk_download" USING btree ("_path");
  CREATE INDEX "thicknesses_blk_holes_order_idx" ON "thicknesses_blk_holes" USING btree ("_order");
  CREATE INDEX "thicknesses_blk_holes_parent_id_idx" ON "thicknesses_blk_holes" USING btree ("_parent_id");
  CREATE INDEX "thicknesses_blk_holes_path_idx" ON "thicknesses_blk_holes" USING btree ("_path");
  CREATE INDEX "thicknesses_blk_weight_order_idx" ON "thicknesses_blk_weight" USING btree ("_order");
  CREATE INDEX "thicknesses_blk_weight_parent_id_idx" ON "thicknesses_blk_weight" USING btree ("_parent_id");
  CREATE INDEX "thicknesses_blk_weight_path_idx" ON "thicknesses_blk_weight" USING btree ("_path");
  CREATE INDEX "thicknesses_blk_form_bullets_order_idx" ON "thicknesses_blk_form_bullets" USING btree ("_order");
  CREATE INDEX "thicknesses_blk_form_bullets_parent_id_idx" ON "thicknesses_blk_form_bullets" USING btree ("_parent_id");
  CREATE INDEX "thicknesses_blk_form_order_idx" ON "thicknesses_blk_form" USING btree ("_order");
  CREATE INDEX "thicknesses_blk_form_parent_id_idx" ON "thicknesses_blk_form" USING btree ("_parent_id");
  CREATE INDEX "thicknesses_blk_form_path_idx" ON "thicknesses_blk_form" USING btree ("_path");
  CREATE INDEX "thicknesses_blk_snippet_order_idx" ON "thicknesses_blk_snippet" USING btree ("_order");
  CREATE INDEX "thicknesses_blk_snippet_parent_id_idx" ON "thicknesses_blk_snippet" USING btree ("_parent_id");
  CREATE INDEX "thicknesses_blk_snippet_path_idx" ON "thicknesses_blk_snippet" USING btree ("_path");
  CREATE INDEX "thicknesses_blk_stats_items_order_idx" ON "thicknesses_blk_stats_items" USING btree ("_order");
  CREATE INDEX "thicknesses_blk_stats_items_parent_id_idx" ON "thicknesses_blk_stats_items" USING btree ("_parent_id");
  CREATE INDEX "thicknesses_blk_stats_order_idx" ON "thicknesses_blk_stats" USING btree ("_order");
  CREATE INDEX "thicknesses_blk_stats_parent_id_idx" ON "thicknesses_blk_stats" USING btree ("_parent_id");
  CREATE INDEX "thicknesses_blk_stats_path_idx" ON "thicknesses_blk_stats" USING btree ("_path");
  CREATE INDEX "thicknesses_blk_objects_order_idx" ON "thicknesses_blk_objects" USING btree ("_order");
  CREATE INDEX "thicknesses_blk_objects_parent_id_idx" ON "thicknesses_blk_objects" USING btree ("_parent_id");
  CREATE INDEX "thicknesses_blk_objects_path_idx" ON "thicknesses_blk_objects" USING btree ("_path");
  CREATE INDEX "thicknesses_blk_objects_product_idx" ON "thicknesses_blk_objects" USING btree ("product_id");
  CREATE INDEX "thicknesses_blk_articles_order_idx" ON "thicknesses_blk_articles" USING btree ("_order");
  CREATE INDEX "thicknesses_blk_articles_parent_id_idx" ON "thicknesses_blk_articles" USING btree ("_parent_id");
  CREATE INDEX "thicknesses_blk_articles_path_idx" ON "thicknesses_blk_articles" USING btree ("_path");
  CREATE INDEX "thicknesses_blk_wdw_left_order_idx" ON "thicknesses_blk_wdw_left" USING btree ("_order");
  CREATE INDEX "thicknesses_blk_wdw_left_parent_id_idx" ON "thicknesses_blk_wdw_left" USING btree ("_parent_id");
  CREATE INDEX "thicknesses_blk_wdw_right_order_idx" ON "thicknesses_blk_wdw_right" USING btree ("_order");
  CREATE INDEX "thicknesses_blk_wdw_right_parent_id_idx" ON "thicknesses_blk_wdw_right" USING btree ("_parent_id");
  CREATE INDEX "thicknesses_blk_wdw_order_idx" ON "thicknesses_blk_wdw" USING btree ("_order");
  CREATE INDEX "thicknesses_blk_wdw_parent_id_idx" ON "thicknesses_blk_wdw" USING btree ("_parent_id");
  CREATE INDEX "thicknesses_blk_wdw_path_idx" ON "thicknesses_blk_wdw" USING btree ("_path");
  CREATE INDEX "thicknesses_blk_systems_items_order_idx" ON "thicknesses_blk_systems_items" USING btree ("_order");
  CREATE INDEX "thicknesses_blk_systems_items_parent_id_idx" ON "thicknesses_blk_systems_items" USING btree ("_parent_id");
  CREATE INDEX "thicknesses_blk_systems_items_image_idx" ON "thicknesses_blk_systems_items" USING btree ("image_id");
  CREATE INDEX "thicknesses_blk_systems_order_idx" ON "thicknesses_blk_systems" USING btree ("_order");
  CREATE INDEX "thicknesses_blk_systems_parent_id_idx" ON "thicknesses_blk_systems" USING btree ("_parent_id");
  CREATE INDEX "thicknesses_blk_systems_path_idx" ON "thicknesses_blk_systems" USING btree ("_path");
  CREATE INDEX "thicknesses_blk_gallery_images_order_idx" ON "thicknesses_blk_gallery_images" USING btree ("_order");
  CREATE INDEX "thicknesses_blk_gallery_images_parent_id_idx" ON "thicknesses_blk_gallery_images" USING btree ("_parent_id");
  CREATE INDEX "thicknesses_blk_gallery_images_image_idx" ON "thicknesses_blk_gallery_images" USING btree ("image_id");
  CREATE INDEX "thicknesses_blk_gallery_order_idx" ON "thicknesses_blk_gallery" USING btree ("_order");
  CREATE INDEX "thicknesses_blk_gallery_parent_id_idx" ON "thicknesses_blk_gallery" USING btree ("_parent_id");
  CREATE INDEX "thicknesses_blk_gallery_path_idx" ON "thicknesses_blk_gallery" USING btree ("_path");
  CREATE INDEX "thicknesses_blk_two_cols_order_idx" ON "thicknesses_blk_two_cols" USING btree ("_order");
  CREATE INDEX "thicknesses_blk_two_cols_parent_id_idx" ON "thicknesses_blk_two_cols" USING btree ("_parent_id");
  CREATE INDEX "thicknesses_blk_two_cols_path_idx" ON "thicknesses_blk_two_cols" USING btree ("_path");
  CREATE INDEX "thicknesses_blk_links_items_order_idx" ON "thicknesses_blk_links_items" USING btree ("_order");
  CREATE INDEX "thicknesses_blk_links_items_parent_id_idx" ON "thicknesses_blk_links_items" USING btree ("_parent_id");
  CREATE INDEX "thicknesses_blk_links_order_idx" ON "thicknesses_blk_links" USING btree ("_order");
  CREATE INDEX "thicknesses_blk_links_parent_id_idx" ON "thicknesses_blk_links" USING btree ("_parent_id");
  CREATE INDEX "thicknesses_blk_links_path_idx" ON "thicknesses_blk_links" USING btree ("_path");
  CREATE INDEX "thicknesses_blk_contacts_order_idx" ON "thicknesses_blk_contacts" USING btree ("_order");
  CREATE INDEX "thicknesses_blk_contacts_parent_id_idx" ON "thicknesses_blk_contacts" USING btree ("_parent_id");
  CREATE INDEX "thicknesses_blk_contacts_path_idx" ON "thicknesses_blk_contacts" USING btree ("_path");
  CREATE INDEX "thicknesses_blk_requisites_order_idx" ON "thicknesses_blk_requisites" USING btree ("_order");
  CREATE INDEX "thicknesses_blk_requisites_parent_id_idx" ON "thicknesses_blk_requisites" USING btree ("_parent_id");
  CREATE INDEX "thicknesses_blk_requisites_path_idx" ON "thicknesses_blk_requisites" USING btree ("_path");
  CREATE INDEX "thicknesses_blk_team_order_idx" ON "thicknesses_blk_team" USING btree ("_order");
  CREATE INDEX "thicknesses_blk_team_parent_id_idx" ON "thicknesses_blk_team" USING btree ("_parent_id");
  CREATE INDEX "thicknesses_blk_team_path_idx" ON "thicknesses_blk_team" USING btree ("_path");
  CREATE INDEX "thicknesses_blk_quiz_cta_order_idx" ON "thicknesses_blk_quiz_cta" USING btree ("_order");
  CREATE INDEX "thicknesses_blk_quiz_cta_parent_id_idx" ON "thicknesses_blk_quiz_cta" USING btree ("_parent_id");
  CREATE INDEX "thicknesses_blk_quiz_cta_path_idx" ON "thicknesses_blk_quiz_cta" USING btree ("_path");
  CREATE UNIQUE INDEX "thicknesses_n_idx" ON "thicknesses" USING btree ("n");
  CREATE INDEX "thicknesses_group_idx" ON "thicknesses" USING btree ("group_id");
  CREATE UNIQUE INDEX "thicknesses_slug_idx" ON "thicknesses" USING btree ("slug");
  CREATE UNIQUE INDEX "thicknesses_path_idx" ON "thicknesses" USING btree ("path");
  CREATE INDEX "thicknesses_card_card_image_idx" ON "thicknesses" USING btree ("card_image_id");
  CREATE INDEX "thicknesses_seo_seo_og_image_idx" ON "thicknesses" USING btree ("seo_og_image_id");
  CREATE INDEX "thicknesses_updated_at_idx" ON "thicknesses" USING btree ("updated_at");
  CREATE INDEX "thicknesses_created_at_idx" ON "thicknesses" USING btree ("created_at");
  CREATE INDEX "thicknesses_rels_order_idx" ON "thicknesses_rels" USING btree ("order");
  CREATE INDEX "thicknesses_rels_parent_idx" ON "thicknesses_rels" USING btree ("parent_id");
  CREATE INDEX "thicknesses_rels_path_idx" ON "thicknesses_rels" USING btree ("path");
  CREATE INDEX "thicknesses_rels_pages_id_idx" ON "thicknesses_rels" USING btree ("pages_id");
  CREATE INDEX "thicknesses_rels_glass_types_id_idx" ON "thicknesses_rels" USING btree ("glass_types_id");
  CREATE INDEX "thicknesses_rels_thicknesses_id_idx" ON "thicknesses_rels" USING btree ("thicknesses_id");
  CREATE INDEX "thicknesses_rels_processing_services_id_idx" ON "thicknesses_rels" USING btree ("processing_services_id");
  CREATE INDEX "thicknesses_rels_constructions_id_idx" ON "thicknesses_rels" USING btree ("constructions_id");
  CREATE INDEX "thicknesses_rels_articles_id_idx" ON "thicknesses_rels" USING btree ("articles_id");
  CREATE INDEX "thicknesses_rels_objects_id_idx" ON "thicknesses_rels" USING btree ("objects_id");
  CREATE INDEX "thickness_groups_faq_order_idx" ON "thickness_groups_faq" USING btree ("_order");
  CREATE INDEX "thickness_groups_faq_parent_id_idx" ON "thickness_groups_faq" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "thickness_groups_slug_idx" ON "thickness_groups" USING btree ("slug");
  CREATE INDEX "thickness_groups_updated_at_idx" ON "thickness_groups" USING btree ("updated_at");
  CREATE INDEX "thickness_groups_created_at_idx" ON "thickness_groups" USING btree ("created_at");
  CREATE INDEX "glass_types_hero_photos_order_idx" ON "glass_types_hero_photos" USING btree ("_order");
  CREATE INDEX "glass_types_hero_photos_parent_id_idx" ON "glass_types_hero_photos" USING btree ("_parent_id");
  CREATE INDEX "glass_types_hero_photos_image_idx" ON "glass_types_hero_photos" USING btree ("image_id");
  CREATE INDEX "glass_types_variants_order_idx" ON "glass_types_variants" USING btree ("_order");
  CREATE INDEX "glass_types_variants_parent_id_idx" ON "glass_types_variants" USING btree ("_parent_id");
  CREATE INDEX "glass_types_variants_swatch_image_idx" ON "glass_types_variants" USING btree ("swatch_image_id");
  CREATE INDEX "glass_types_tables_cols_order_idx" ON "glass_types_tables_cols" USING btree ("_order");
  CREATE INDEX "glass_types_tables_cols_parent_id_idx" ON "glass_types_tables_cols" USING btree ("_parent_id");
  CREATE INDEX "glass_types_tables_rows_cells_order_idx" ON "glass_types_tables_rows_cells" USING btree ("_order");
  CREATE INDEX "glass_types_tables_rows_cells_parent_id_idx" ON "glass_types_tables_rows_cells" USING btree ("_parent_id");
  CREATE INDEX "glass_types_tables_rows_order_idx" ON "glass_types_tables_rows" USING btree ("_order");
  CREATE INDEX "glass_types_tables_rows_parent_id_idx" ON "glass_types_tables_rows" USING btree ("_parent_id");
  CREATE INDEX "glass_types_tables_order_idx" ON "glass_types_tables" USING btree ("_order");
  CREATE INDEX "glass_types_tables_parent_id_idx" ON "glass_types_tables" USING btree ("_parent_id");
  CREATE INDEX "glass_types_important_items_order_idx" ON "glass_types_important_items" USING btree ("_order");
  CREATE INDEX "glass_types_important_items_parent_id_idx" ON "glass_types_important_items" USING btree ("_parent_id");
  CREATE INDEX "glass_types_limits_radius_order_idx" ON "glass_types_limits_radius" USING btree ("_order");
  CREATE INDEX "glass_types_limits_radius_parent_id_idx" ON "glass_types_limits_radius" USING btree ("_parent_id");
  CREATE INDEX "glass_types_applications_order_idx" ON "glass_types_applications" USING btree ("_order");
  CREATE INDEX "glass_types_applications_parent_id_idx" ON "glass_types_applications" USING btree ("_parent_id");
  CREATE INDEX "glass_types_related_links_order_idx" ON "glass_types_related_links" USING btree ("_order");
  CREATE INDEX "glass_types_related_links_parent_id_idx" ON "glass_types_related_links" USING btree ("_parent_id");
  CREATE INDEX "glass_types_faq_order_idx" ON "glass_types_faq" USING btree ("_order");
  CREATE INDEX "glass_types_faq_parent_id_idx" ON "glass_types_faq" USING btree ("_parent_id");
  CREATE INDEX "glass_types_blk_hero_eyebrow_order_idx" ON "glass_types_blk_hero_eyebrow" USING btree ("_order");
  CREATE INDEX "glass_types_blk_hero_eyebrow_parent_id_idx" ON "glass_types_blk_hero_eyebrow" USING btree ("_parent_id");
  CREATE INDEX "glass_types_blk_hero_buttons_order_idx" ON "glass_types_blk_hero_buttons" USING btree ("_order");
  CREATE INDEX "glass_types_blk_hero_buttons_parent_id_idx" ON "glass_types_blk_hero_buttons" USING btree ("_parent_id");
  CREATE INDEX "glass_types_blk_hero_buttons_file_idx" ON "glass_types_blk_hero_buttons" USING btree ("file_id");
  CREATE INDEX "glass_types_blk_hero_photos_order_idx" ON "glass_types_blk_hero_photos" USING btree ("_order");
  CREATE INDEX "glass_types_blk_hero_photos_parent_id_idx" ON "glass_types_blk_hero_photos" USING btree ("_parent_id");
  CREATE INDEX "glass_types_blk_hero_photos_image_idx" ON "glass_types_blk_hero_photos" USING btree ("image_id");
  CREATE INDEX "glass_types_blk_hero_stats_order_idx" ON "glass_types_blk_hero_stats" USING btree ("_order");
  CREATE INDEX "glass_types_blk_hero_stats_parent_id_idx" ON "glass_types_blk_hero_stats" USING btree ("_parent_id");
  CREATE INDEX "glass_types_blk_hero_order_idx" ON "glass_types_blk_hero" USING btree ("_order");
  CREATE INDEX "glass_types_blk_hero_parent_id_idx" ON "glass_types_blk_hero" USING btree ("_parent_id");
  CREATE INDEX "glass_types_blk_hero_path_idx" ON "glass_types_blk_hero" USING btree ("_path");
  CREATE INDEX "glass_types_blk_hero_image_idx" ON "glass_types_blk_hero" USING btree ("image_id");
  CREATE INDEX "glass_types_blk_text_order_idx" ON "glass_types_blk_text" USING btree ("_order");
  CREATE INDEX "glass_types_blk_text_parent_id_idx" ON "glass_types_blk_text" USING btree ("_parent_id");
  CREATE INDEX "glass_types_blk_text_path_idx" ON "glass_types_blk_text" USING btree ("_path");
  CREATE INDEX "glass_types_blk_table_table_cols_order_idx" ON "glass_types_blk_table_table_cols" USING btree ("_order");
  CREATE INDEX "glass_types_blk_table_table_cols_parent_id_idx" ON "glass_types_blk_table_table_cols" USING btree ("_parent_id");
  CREATE INDEX "glass_types_blk_table_table_rows_cells_order_idx" ON "glass_types_blk_table_table_rows_cells" USING btree ("_order");
  CREATE INDEX "glass_types_blk_table_table_rows_cells_parent_id_idx" ON "glass_types_blk_table_table_rows_cells" USING btree ("_parent_id");
  CREATE INDEX "glass_types_blk_table_table_rows_order_idx" ON "glass_types_blk_table_table_rows" USING btree ("_order");
  CREATE INDEX "glass_types_blk_table_table_rows_parent_id_idx" ON "glass_types_blk_table_table_rows" USING btree ("_parent_id");
  CREATE INDEX "glass_types_blk_table_order_idx" ON "glass_types_blk_table" USING btree ("_order");
  CREATE INDEX "glass_types_blk_table_parent_id_idx" ON "glass_types_blk_table" USING btree ("_parent_id");
  CREATE INDEX "glass_types_blk_table_path_idx" ON "glass_types_blk_table" USING btree ("_path");
  CREATE INDEX "glass_types_blk_steps_items_order_idx" ON "glass_types_blk_steps_items" USING btree ("_order");
  CREATE INDEX "glass_types_blk_steps_items_parent_id_idx" ON "glass_types_blk_steps_items" USING btree ("_parent_id");
  CREATE INDEX "glass_types_blk_steps_buttons_order_idx" ON "glass_types_blk_steps_buttons" USING btree ("_order");
  CREATE INDEX "glass_types_blk_steps_buttons_parent_id_idx" ON "glass_types_blk_steps_buttons" USING btree ("_parent_id");
  CREATE INDEX "glass_types_blk_steps_buttons_file_idx" ON "glass_types_blk_steps_buttons" USING btree ("file_id");
  CREATE INDEX "glass_types_blk_steps_order_idx" ON "glass_types_blk_steps" USING btree ("_order");
  CREATE INDEX "glass_types_blk_steps_parent_id_idx" ON "glass_types_blk_steps" USING btree ("_parent_id");
  CREATE INDEX "glass_types_blk_steps_path_idx" ON "glass_types_blk_steps" USING btree ("_path");
  CREATE INDEX "glass_types_blk_callout_items_order_idx" ON "glass_types_blk_callout_items" USING btree ("_order");
  CREATE INDEX "glass_types_blk_callout_items_parent_id_idx" ON "glass_types_blk_callout_items" USING btree ("_parent_id");
  CREATE INDEX "glass_types_blk_callout_order_idx" ON "glass_types_blk_callout" USING btree ("_order");
  CREATE INDEX "glass_types_blk_callout_parent_id_idx" ON "glass_types_blk_callout" USING btree ("_parent_id");
  CREATE INDEX "glass_types_blk_callout_path_idx" ON "glass_types_blk_callout" USING btree ("_path");
  CREATE INDEX "glass_types_blk_terms_items_order_idx" ON "glass_types_blk_terms_items" USING btree ("_order");
  CREATE INDEX "glass_types_blk_terms_items_parent_id_idx" ON "glass_types_blk_terms_items" USING btree ("_parent_id");
  CREATE INDEX "glass_types_blk_terms_order_idx" ON "glass_types_blk_terms" USING btree ("_order");
  CREATE INDEX "glass_types_blk_terms_parent_id_idx" ON "glass_types_blk_terms" USING btree ("_parent_id");
  CREATE INDEX "glass_types_blk_terms_path_idx" ON "glass_types_blk_terms" USING btree ("_path");
  CREATE INDEX "glass_types_blk_cards_items_order_idx" ON "glass_types_blk_cards_items" USING btree ("_order");
  CREATE INDEX "glass_types_blk_cards_items_parent_id_idx" ON "glass_types_blk_cards_items" USING btree ("_parent_id");
  CREATE INDEX "glass_types_blk_cards_items_image_idx" ON "glass_types_blk_cards_items" USING btree ("image_id");
  CREATE INDEX "glass_types_blk_cards_order_idx" ON "glass_types_blk_cards" USING btree ("_order");
  CREATE INDEX "glass_types_blk_cards_parent_id_idx" ON "glass_types_blk_cards" USING btree ("_parent_id");
  CREATE INDEX "glass_types_blk_cards_path_idx" ON "glass_types_blk_cards" USING btree ("_path");
  CREATE INDEX "glass_types_blk_coll_cards_order_idx" ON "glass_types_blk_coll_cards" USING btree ("_order");
  CREATE INDEX "glass_types_blk_coll_cards_parent_id_idx" ON "glass_types_blk_coll_cards" USING btree ("_parent_id");
  CREATE INDEX "glass_types_blk_coll_cards_path_idx" ON "glass_types_blk_coll_cards" USING btree ("_path");
  CREATE INDEX "glass_types_blk_prices_order_idx" ON "glass_types_blk_prices" USING btree ("_order");
  CREATE INDEX "glass_types_blk_prices_parent_id_idx" ON "glass_types_blk_prices" USING btree ("_parent_id");
  CREATE INDEX "glass_types_blk_prices_path_idx" ON "glass_types_blk_prices" USING btree ("_path");
  CREATE INDEX "glass_types_blk_faq_items_order_idx" ON "glass_types_blk_faq_items" USING btree ("_order");
  CREATE INDEX "glass_types_blk_faq_items_parent_id_idx" ON "glass_types_blk_faq_items" USING btree ("_parent_id");
  CREATE INDEX "glass_types_blk_faq_order_idx" ON "glass_types_blk_faq" USING btree ("_order");
  CREATE INDEX "glass_types_blk_faq_parent_id_idx" ON "glass_types_blk_faq" USING btree ("_parent_id");
  CREATE INDEX "glass_types_blk_faq_path_idx" ON "glass_types_blk_faq" USING btree ("_path");
  CREATE INDEX "glass_types_blk_cta_buttons_order_idx" ON "glass_types_blk_cta_buttons" USING btree ("_order");
  CREATE INDEX "glass_types_blk_cta_buttons_parent_id_idx" ON "glass_types_blk_cta_buttons" USING btree ("_parent_id");
  CREATE INDEX "glass_types_blk_cta_buttons_file_idx" ON "glass_types_blk_cta_buttons" USING btree ("file_id");
  CREATE INDEX "glass_types_blk_cta_order_idx" ON "glass_types_blk_cta" USING btree ("_order");
  CREATE INDEX "glass_types_blk_cta_parent_id_idx" ON "glass_types_blk_cta" USING btree ("_parent_id");
  CREATE INDEX "glass_types_blk_cta_path_idx" ON "glass_types_blk_cta" USING btree ("_path");
  CREATE INDEX "glass_types_blk_compare_rows_order_idx" ON "glass_types_blk_compare_rows" USING btree ("_order");
  CREATE INDEX "glass_types_blk_compare_rows_parent_id_idx" ON "glass_types_blk_compare_rows" USING btree ("_parent_id");
  CREATE INDEX "glass_types_blk_compare_order_idx" ON "glass_types_blk_compare" USING btree ("_order");
  CREATE INDEX "glass_types_blk_compare_parent_id_idx" ON "glass_types_blk_compare" USING btree ("_parent_id");
  CREATE INDEX "glass_types_blk_compare_path_idx" ON "glass_types_blk_compare" USING btree ("_path");
  CREATE INDEX "glass_types_blk_download_items_order_idx" ON "glass_types_blk_download_items" USING btree ("_order");
  CREATE INDEX "glass_types_blk_download_items_parent_id_idx" ON "glass_types_blk_download_items" USING btree ("_parent_id");
  CREATE INDEX "glass_types_blk_download_items_file_idx" ON "glass_types_blk_download_items" USING btree ("file_id");
  CREATE INDEX "glass_types_blk_download_order_idx" ON "glass_types_blk_download" USING btree ("_order");
  CREATE INDEX "glass_types_blk_download_parent_id_idx" ON "glass_types_blk_download" USING btree ("_parent_id");
  CREATE INDEX "glass_types_blk_download_path_idx" ON "glass_types_blk_download" USING btree ("_path");
  CREATE INDEX "glass_types_blk_holes_order_idx" ON "glass_types_blk_holes" USING btree ("_order");
  CREATE INDEX "glass_types_blk_holes_parent_id_idx" ON "glass_types_blk_holes" USING btree ("_parent_id");
  CREATE INDEX "glass_types_blk_holes_path_idx" ON "glass_types_blk_holes" USING btree ("_path");
  CREATE INDEX "glass_types_blk_weight_order_idx" ON "glass_types_blk_weight" USING btree ("_order");
  CREATE INDEX "glass_types_blk_weight_parent_id_idx" ON "glass_types_blk_weight" USING btree ("_parent_id");
  CREATE INDEX "glass_types_blk_weight_path_idx" ON "glass_types_blk_weight" USING btree ("_path");
  CREATE INDEX "glass_types_blk_form_bullets_order_idx" ON "glass_types_blk_form_bullets" USING btree ("_order");
  CREATE INDEX "glass_types_blk_form_bullets_parent_id_idx" ON "glass_types_blk_form_bullets" USING btree ("_parent_id");
  CREATE INDEX "glass_types_blk_form_order_idx" ON "glass_types_blk_form" USING btree ("_order");
  CREATE INDEX "glass_types_blk_form_parent_id_idx" ON "glass_types_blk_form" USING btree ("_parent_id");
  CREATE INDEX "glass_types_blk_form_path_idx" ON "glass_types_blk_form" USING btree ("_path");
  CREATE INDEX "glass_types_blk_snippet_order_idx" ON "glass_types_blk_snippet" USING btree ("_order");
  CREATE INDEX "glass_types_blk_snippet_parent_id_idx" ON "glass_types_blk_snippet" USING btree ("_parent_id");
  CREATE INDEX "glass_types_blk_snippet_path_idx" ON "glass_types_blk_snippet" USING btree ("_path");
  CREATE INDEX "glass_types_blk_stats_items_order_idx" ON "glass_types_blk_stats_items" USING btree ("_order");
  CREATE INDEX "glass_types_blk_stats_items_parent_id_idx" ON "glass_types_blk_stats_items" USING btree ("_parent_id");
  CREATE INDEX "glass_types_blk_stats_order_idx" ON "glass_types_blk_stats" USING btree ("_order");
  CREATE INDEX "glass_types_blk_stats_parent_id_idx" ON "glass_types_blk_stats" USING btree ("_parent_id");
  CREATE INDEX "glass_types_blk_stats_path_idx" ON "glass_types_blk_stats" USING btree ("_path");
  CREATE INDEX "glass_types_blk_objects_order_idx" ON "glass_types_blk_objects" USING btree ("_order");
  CREATE INDEX "glass_types_blk_objects_parent_id_idx" ON "glass_types_blk_objects" USING btree ("_parent_id");
  CREATE INDEX "glass_types_blk_objects_path_idx" ON "glass_types_blk_objects" USING btree ("_path");
  CREATE INDEX "glass_types_blk_objects_product_idx" ON "glass_types_blk_objects" USING btree ("product_id");
  CREATE INDEX "glass_types_blk_articles_order_idx" ON "glass_types_blk_articles" USING btree ("_order");
  CREATE INDEX "glass_types_blk_articles_parent_id_idx" ON "glass_types_blk_articles" USING btree ("_parent_id");
  CREATE INDEX "glass_types_blk_articles_path_idx" ON "glass_types_blk_articles" USING btree ("_path");
  CREATE INDEX "glass_types_blk_wdw_left_order_idx" ON "glass_types_blk_wdw_left" USING btree ("_order");
  CREATE INDEX "glass_types_blk_wdw_left_parent_id_idx" ON "glass_types_blk_wdw_left" USING btree ("_parent_id");
  CREATE INDEX "glass_types_blk_wdw_right_order_idx" ON "glass_types_blk_wdw_right" USING btree ("_order");
  CREATE INDEX "glass_types_blk_wdw_right_parent_id_idx" ON "glass_types_blk_wdw_right" USING btree ("_parent_id");
  CREATE INDEX "glass_types_blk_wdw_order_idx" ON "glass_types_blk_wdw" USING btree ("_order");
  CREATE INDEX "glass_types_blk_wdw_parent_id_idx" ON "glass_types_blk_wdw" USING btree ("_parent_id");
  CREATE INDEX "glass_types_blk_wdw_path_idx" ON "glass_types_blk_wdw" USING btree ("_path");
  CREATE INDEX "glass_types_blk_systems_items_order_idx" ON "glass_types_blk_systems_items" USING btree ("_order");
  CREATE INDEX "glass_types_blk_systems_items_parent_id_idx" ON "glass_types_blk_systems_items" USING btree ("_parent_id");
  CREATE INDEX "glass_types_blk_systems_items_image_idx" ON "glass_types_blk_systems_items" USING btree ("image_id");
  CREATE INDEX "glass_types_blk_systems_order_idx" ON "glass_types_blk_systems" USING btree ("_order");
  CREATE INDEX "glass_types_blk_systems_parent_id_idx" ON "glass_types_blk_systems" USING btree ("_parent_id");
  CREATE INDEX "glass_types_blk_systems_path_idx" ON "glass_types_blk_systems" USING btree ("_path");
  CREATE INDEX "glass_types_blk_gallery_images_order_idx" ON "glass_types_blk_gallery_images" USING btree ("_order");
  CREATE INDEX "glass_types_blk_gallery_images_parent_id_idx" ON "glass_types_blk_gallery_images" USING btree ("_parent_id");
  CREATE INDEX "glass_types_blk_gallery_images_image_idx" ON "glass_types_blk_gallery_images" USING btree ("image_id");
  CREATE INDEX "glass_types_blk_gallery_order_idx" ON "glass_types_blk_gallery" USING btree ("_order");
  CREATE INDEX "glass_types_blk_gallery_parent_id_idx" ON "glass_types_blk_gallery" USING btree ("_parent_id");
  CREATE INDEX "glass_types_blk_gallery_path_idx" ON "glass_types_blk_gallery" USING btree ("_path");
  CREATE INDEX "glass_types_blk_two_cols_order_idx" ON "glass_types_blk_two_cols" USING btree ("_order");
  CREATE INDEX "glass_types_blk_two_cols_parent_id_idx" ON "glass_types_blk_two_cols" USING btree ("_parent_id");
  CREATE INDEX "glass_types_blk_two_cols_path_idx" ON "glass_types_blk_two_cols" USING btree ("_path");
  CREATE INDEX "glass_types_blk_links_items_order_idx" ON "glass_types_blk_links_items" USING btree ("_order");
  CREATE INDEX "glass_types_blk_links_items_parent_id_idx" ON "glass_types_blk_links_items" USING btree ("_parent_id");
  CREATE INDEX "glass_types_blk_links_order_idx" ON "glass_types_blk_links" USING btree ("_order");
  CREATE INDEX "glass_types_blk_links_parent_id_idx" ON "glass_types_blk_links" USING btree ("_parent_id");
  CREATE INDEX "glass_types_blk_links_path_idx" ON "glass_types_blk_links" USING btree ("_path");
  CREATE INDEX "glass_types_blk_contacts_order_idx" ON "glass_types_blk_contacts" USING btree ("_order");
  CREATE INDEX "glass_types_blk_contacts_parent_id_idx" ON "glass_types_blk_contacts" USING btree ("_parent_id");
  CREATE INDEX "glass_types_blk_contacts_path_idx" ON "glass_types_blk_contacts" USING btree ("_path");
  CREATE INDEX "glass_types_blk_requisites_order_idx" ON "glass_types_blk_requisites" USING btree ("_order");
  CREATE INDEX "glass_types_blk_requisites_parent_id_idx" ON "glass_types_blk_requisites" USING btree ("_parent_id");
  CREATE INDEX "glass_types_blk_requisites_path_idx" ON "glass_types_blk_requisites" USING btree ("_path");
  CREATE INDEX "glass_types_blk_team_order_idx" ON "glass_types_blk_team" USING btree ("_order");
  CREATE INDEX "glass_types_blk_team_parent_id_idx" ON "glass_types_blk_team" USING btree ("_parent_id");
  CREATE INDEX "glass_types_blk_team_path_idx" ON "glass_types_blk_team" USING btree ("_path");
  CREATE INDEX "glass_types_blk_quiz_cta_order_idx" ON "glass_types_blk_quiz_cta" USING btree ("_order");
  CREATE INDEX "glass_types_blk_quiz_cta_parent_id_idx" ON "glass_types_blk_quiz_cta" USING btree ("_parent_id");
  CREATE INDEX "glass_types_blk_quiz_cta_path_idx" ON "glass_types_blk_quiz_cta" USING btree ("_path");
  CREATE UNIQUE INDEX "glass_types_slug_idx" ON "glass_types" USING btree ("slug");
  CREATE UNIQUE INDEX "glass_types_path_idx" ON "glass_types" USING btree ("path");
  CREATE INDEX "glass_types_card_card_image_idx" ON "glass_types" USING btree ("card_image_id");
  CREATE INDEX "glass_types_hero_image_idx" ON "glass_types" USING btree ("hero_image_id");
  CREATE INDEX "glass_types_objects_product_idx" ON "glass_types" USING btree ("objects_product_id");
  CREATE INDEX "glass_types_seo_seo_og_image_idx" ON "glass_types" USING btree ("seo_og_image_id");
  CREATE INDEX "glass_types_updated_at_idx" ON "glass_types" USING btree ("updated_at");
  CREATE INDEX "glass_types_created_at_idx" ON "glass_types" USING btree ("created_at");
  CREATE INDEX "glass_types__status_idx" ON "glass_types" USING btree ("_status");
  CREATE INDEX "glass_types_numbers_order_parent_idx" ON "glass_types_numbers" USING btree ("order","parent_id");
  CREATE INDEX "glass_types_rels_order_idx" ON "glass_types_rels" USING btree ("order");
  CREATE INDEX "glass_types_rels_parent_idx" ON "glass_types_rels" USING btree ("parent_id");
  CREATE INDEX "glass_types_rels_path_idx" ON "glass_types_rels" USING btree ("path");
  CREATE INDEX "glass_types_rels_pages_id_idx" ON "glass_types_rels" USING btree ("pages_id");
  CREATE INDEX "glass_types_rels_glass_types_id_idx" ON "glass_types_rels" USING btree ("glass_types_id");
  CREATE INDEX "glass_types_rels_thicknesses_id_idx" ON "glass_types_rels" USING btree ("thicknesses_id");
  CREATE INDEX "glass_types_rels_processing_services_id_idx" ON "glass_types_rels" USING btree ("processing_services_id");
  CREATE INDEX "glass_types_rels_constructions_id_idx" ON "glass_types_rels" USING btree ("constructions_id");
  CREATE INDEX "glass_types_rels_articles_id_idx" ON "glass_types_rels" USING btree ("articles_id");
  CREATE INDEX "glass_types_rels_objects_id_idx" ON "glass_types_rels" USING btree ("objects_id");
  CREATE INDEX "_glass_types_v_version_hero_photos_order_idx" ON "_glass_types_v_version_hero_photos" USING btree ("_order");
  CREATE INDEX "_glass_types_v_version_hero_photos_parent_id_idx" ON "_glass_types_v_version_hero_photos" USING btree ("_parent_id");
  CREATE INDEX "_glass_types_v_version_hero_photos_image_idx" ON "_glass_types_v_version_hero_photos" USING btree ("image_id");
  CREATE INDEX "_glass_types_v_version_variants_order_idx" ON "_glass_types_v_version_variants" USING btree ("_order");
  CREATE INDEX "_glass_types_v_version_variants_parent_id_idx" ON "_glass_types_v_version_variants" USING btree ("_parent_id");
  CREATE INDEX "_glass_types_v_version_variants_swatch_image_idx" ON "_glass_types_v_version_variants" USING btree ("swatch_image_id");
  CREATE INDEX "_glass_types_tables_cols_v_order_idx" ON "_glass_types_tables_cols_v" USING btree ("_order");
  CREATE INDEX "_glass_types_tables_cols_v_parent_id_idx" ON "_glass_types_tables_cols_v" USING btree ("_parent_id");
  CREATE INDEX "_glass_types_tables_rows_cells_v_order_idx" ON "_glass_types_tables_rows_cells_v" USING btree ("_order");
  CREATE INDEX "_glass_types_tables_rows_cells_v_parent_id_idx" ON "_glass_types_tables_rows_cells_v" USING btree ("_parent_id");
  CREATE INDEX "_glass_types_tables_rows_v_order_idx" ON "_glass_types_tables_rows_v" USING btree ("_order");
  CREATE INDEX "_glass_types_tables_rows_v_parent_id_idx" ON "_glass_types_tables_rows_v" USING btree ("_parent_id");
  CREATE INDEX "_glass_types_v_version_tables_order_idx" ON "_glass_types_v_version_tables" USING btree ("_order");
  CREATE INDEX "_glass_types_v_version_tables_parent_id_idx" ON "_glass_types_v_version_tables" USING btree ("_parent_id");
  CREATE INDEX "_glass_types_v_version_important_items_order_idx" ON "_glass_types_v_version_important_items" USING btree ("_order");
  CREATE INDEX "_glass_types_v_version_important_items_parent_id_idx" ON "_glass_types_v_version_important_items" USING btree ("_parent_id");
  CREATE INDEX "_glass_types_v_version_limits_radius_order_idx" ON "_glass_types_v_version_limits_radius" USING btree ("_order");
  CREATE INDEX "_glass_types_v_version_limits_radius_parent_id_idx" ON "_glass_types_v_version_limits_radius" USING btree ("_parent_id");
  CREATE INDEX "_glass_types_v_version_applications_order_idx" ON "_glass_types_v_version_applications" USING btree ("_order");
  CREATE INDEX "_glass_types_v_version_applications_parent_id_idx" ON "_glass_types_v_version_applications" USING btree ("_parent_id");
  CREATE INDEX "_glass_types_v_version_related_links_order_idx" ON "_glass_types_v_version_related_links" USING btree ("_order");
  CREATE INDEX "_glass_types_v_version_related_links_parent_id_idx" ON "_glass_types_v_version_related_links" USING btree ("_parent_id");
  CREATE INDEX "_glass_types_v_version_faq_order_idx" ON "_glass_types_v_version_faq" USING btree ("_order");
  CREATE INDEX "_glass_types_v_version_faq_parent_id_idx" ON "_glass_types_v_version_faq" USING btree ("_parent_id");
  CREATE INDEX "_glass_types_blk_hero_v_eyebrow_order_idx" ON "_glass_types_blk_hero_v_eyebrow" USING btree ("_order");
  CREATE INDEX "_glass_types_blk_hero_v_eyebrow_parent_id_idx" ON "_glass_types_blk_hero_v_eyebrow" USING btree ("_parent_id");
  CREATE INDEX "_glass_types_blk_hero_v_buttons_order_idx" ON "_glass_types_blk_hero_v_buttons" USING btree ("_order");
  CREATE INDEX "_glass_types_blk_hero_v_buttons_parent_id_idx" ON "_glass_types_blk_hero_v_buttons" USING btree ("_parent_id");
  CREATE INDEX "_glass_types_blk_hero_v_buttons_file_idx" ON "_glass_types_blk_hero_v_buttons" USING btree ("file_id");
  CREATE INDEX "_glass_types_blk_hero_v_photos_order_idx" ON "_glass_types_blk_hero_v_photos" USING btree ("_order");
  CREATE INDEX "_glass_types_blk_hero_v_photos_parent_id_idx" ON "_glass_types_blk_hero_v_photos" USING btree ("_parent_id");
  CREATE INDEX "_glass_types_blk_hero_v_photos_image_idx" ON "_glass_types_blk_hero_v_photos" USING btree ("image_id");
  CREATE INDEX "_glass_types_blk_hero_v_stats_order_idx" ON "_glass_types_blk_hero_v_stats" USING btree ("_order");
  CREATE INDEX "_glass_types_blk_hero_v_stats_parent_id_idx" ON "_glass_types_blk_hero_v_stats" USING btree ("_parent_id");
  CREATE INDEX "_glass_types_blk_hero_v_order_idx" ON "_glass_types_blk_hero_v" USING btree ("_order");
  CREATE INDEX "_glass_types_blk_hero_v_parent_id_idx" ON "_glass_types_blk_hero_v" USING btree ("_parent_id");
  CREATE INDEX "_glass_types_blk_hero_v_path_idx" ON "_glass_types_blk_hero_v" USING btree ("_path");
  CREATE INDEX "_glass_types_blk_hero_v_image_idx" ON "_glass_types_blk_hero_v" USING btree ("image_id");
  CREATE INDEX "_glass_types_blk_text_v_order_idx" ON "_glass_types_blk_text_v" USING btree ("_order");
  CREATE INDEX "_glass_types_blk_text_v_parent_id_idx" ON "_glass_types_blk_text_v" USING btree ("_parent_id");
  CREATE INDEX "_glass_types_blk_text_v_path_idx" ON "_glass_types_blk_text_v" USING btree ("_path");
  CREATE INDEX "_glass_types_blk_table_table_cols_v_order_idx" ON "_glass_types_blk_table_table_cols_v" USING btree ("_order");
  CREATE INDEX "_glass_types_blk_table_table_cols_v_parent_id_idx" ON "_glass_types_blk_table_table_cols_v" USING btree ("_parent_id");
  CREATE INDEX "_glass_types_blk_table_table_rows_cells_v_order_idx" ON "_glass_types_blk_table_table_rows_cells_v" USING btree ("_order");
  CREATE INDEX "_glass_types_blk_table_table_rows_cells_v_parent_id_idx" ON "_glass_types_blk_table_table_rows_cells_v" USING btree ("_parent_id");
  CREATE INDEX "_glass_types_blk_table_table_rows_v_order_idx" ON "_glass_types_blk_table_table_rows_v" USING btree ("_order");
  CREATE INDEX "_glass_types_blk_table_table_rows_v_parent_id_idx" ON "_glass_types_blk_table_table_rows_v" USING btree ("_parent_id");
  CREATE INDEX "_glass_types_blk_table_v_order_idx" ON "_glass_types_blk_table_v" USING btree ("_order");
  CREATE INDEX "_glass_types_blk_table_v_parent_id_idx" ON "_glass_types_blk_table_v" USING btree ("_parent_id");
  CREATE INDEX "_glass_types_blk_table_v_path_idx" ON "_glass_types_blk_table_v" USING btree ("_path");
  CREATE INDEX "_glass_types_blk_steps_v_items_order_idx" ON "_glass_types_blk_steps_v_items" USING btree ("_order");
  CREATE INDEX "_glass_types_blk_steps_v_items_parent_id_idx" ON "_glass_types_blk_steps_v_items" USING btree ("_parent_id");
  CREATE INDEX "_glass_types_blk_steps_v_buttons_order_idx" ON "_glass_types_blk_steps_v_buttons" USING btree ("_order");
  CREATE INDEX "_glass_types_blk_steps_v_buttons_parent_id_idx" ON "_glass_types_blk_steps_v_buttons" USING btree ("_parent_id");
  CREATE INDEX "_glass_types_blk_steps_v_buttons_file_idx" ON "_glass_types_blk_steps_v_buttons" USING btree ("file_id");
  CREATE INDEX "_glass_types_blk_steps_v_order_idx" ON "_glass_types_blk_steps_v" USING btree ("_order");
  CREATE INDEX "_glass_types_blk_steps_v_parent_id_idx" ON "_glass_types_blk_steps_v" USING btree ("_parent_id");
  CREATE INDEX "_glass_types_blk_steps_v_path_idx" ON "_glass_types_blk_steps_v" USING btree ("_path");
  CREATE INDEX "_glass_types_blk_callout_v_items_order_idx" ON "_glass_types_blk_callout_v_items" USING btree ("_order");
  CREATE INDEX "_glass_types_blk_callout_v_items_parent_id_idx" ON "_glass_types_blk_callout_v_items" USING btree ("_parent_id");
  CREATE INDEX "_glass_types_blk_callout_v_order_idx" ON "_glass_types_blk_callout_v" USING btree ("_order");
  CREATE INDEX "_glass_types_blk_callout_v_parent_id_idx" ON "_glass_types_blk_callout_v" USING btree ("_parent_id");
  CREATE INDEX "_glass_types_blk_callout_v_path_idx" ON "_glass_types_blk_callout_v" USING btree ("_path");
  CREATE INDEX "_glass_types_blk_terms_v_items_order_idx" ON "_glass_types_blk_terms_v_items" USING btree ("_order");
  CREATE INDEX "_glass_types_blk_terms_v_items_parent_id_idx" ON "_glass_types_blk_terms_v_items" USING btree ("_parent_id");
  CREATE INDEX "_glass_types_blk_terms_v_order_idx" ON "_glass_types_blk_terms_v" USING btree ("_order");
  CREATE INDEX "_glass_types_blk_terms_v_parent_id_idx" ON "_glass_types_blk_terms_v" USING btree ("_parent_id");
  CREATE INDEX "_glass_types_blk_terms_v_path_idx" ON "_glass_types_blk_terms_v" USING btree ("_path");
  CREATE INDEX "_glass_types_blk_cards_v_items_order_idx" ON "_glass_types_blk_cards_v_items" USING btree ("_order");
  CREATE INDEX "_glass_types_blk_cards_v_items_parent_id_idx" ON "_glass_types_blk_cards_v_items" USING btree ("_parent_id");
  CREATE INDEX "_glass_types_blk_cards_v_items_image_idx" ON "_glass_types_blk_cards_v_items" USING btree ("image_id");
  CREATE INDEX "_glass_types_blk_cards_v_order_idx" ON "_glass_types_blk_cards_v" USING btree ("_order");
  CREATE INDEX "_glass_types_blk_cards_v_parent_id_idx" ON "_glass_types_blk_cards_v" USING btree ("_parent_id");
  CREATE INDEX "_glass_types_blk_cards_v_path_idx" ON "_glass_types_blk_cards_v" USING btree ("_path");
  CREATE INDEX "_glass_types_blk_coll_cards_v_order_idx" ON "_glass_types_blk_coll_cards_v" USING btree ("_order");
  CREATE INDEX "_glass_types_blk_coll_cards_v_parent_id_idx" ON "_glass_types_blk_coll_cards_v" USING btree ("_parent_id");
  CREATE INDEX "_glass_types_blk_coll_cards_v_path_idx" ON "_glass_types_blk_coll_cards_v" USING btree ("_path");
  CREATE INDEX "_glass_types_blk_prices_v_order_idx" ON "_glass_types_blk_prices_v" USING btree ("_order");
  CREATE INDEX "_glass_types_blk_prices_v_parent_id_idx" ON "_glass_types_blk_prices_v" USING btree ("_parent_id");
  CREATE INDEX "_glass_types_blk_prices_v_path_idx" ON "_glass_types_blk_prices_v" USING btree ("_path");
  CREATE INDEX "_glass_types_blk_faq_v_items_order_idx" ON "_glass_types_blk_faq_v_items" USING btree ("_order");
  CREATE INDEX "_glass_types_blk_faq_v_items_parent_id_idx" ON "_glass_types_blk_faq_v_items" USING btree ("_parent_id");
  CREATE INDEX "_glass_types_blk_faq_v_order_idx" ON "_glass_types_blk_faq_v" USING btree ("_order");
  CREATE INDEX "_glass_types_blk_faq_v_parent_id_idx" ON "_glass_types_blk_faq_v" USING btree ("_parent_id");
  CREATE INDEX "_glass_types_blk_faq_v_path_idx" ON "_glass_types_blk_faq_v" USING btree ("_path");
  CREATE INDEX "_glass_types_blk_cta_v_buttons_order_idx" ON "_glass_types_blk_cta_v_buttons" USING btree ("_order");
  CREATE INDEX "_glass_types_blk_cta_v_buttons_parent_id_idx" ON "_glass_types_blk_cta_v_buttons" USING btree ("_parent_id");
  CREATE INDEX "_glass_types_blk_cta_v_buttons_file_idx" ON "_glass_types_blk_cta_v_buttons" USING btree ("file_id");
  CREATE INDEX "_glass_types_blk_cta_v_order_idx" ON "_glass_types_blk_cta_v" USING btree ("_order");
  CREATE INDEX "_glass_types_blk_cta_v_parent_id_idx" ON "_glass_types_blk_cta_v" USING btree ("_parent_id");
  CREATE INDEX "_glass_types_blk_cta_v_path_idx" ON "_glass_types_blk_cta_v" USING btree ("_path");
  CREATE INDEX "_glass_types_blk_compare_v_rows_order_idx" ON "_glass_types_blk_compare_v_rows" USING btree ("_order");
  CREATE INDEX "_glass_types_blk_compare_v_rows_parent_id_idx" ON "_glass_types_blk_compare_v_rows" USING btree ("_parent_id");
  CREATE INDEX "_glass_types_blk_compare_v_order_idx" ON "_glass_types_blk_compare_v" USING btree ("_order");
  CREATE INDEX "_glass_types_blk_compare_v_parent_id_idx" ON "_glass_types_blk_compare_v" USING btree ("_parent_id");
  CREATE INDEX "_glass_types_blk_compare_v_path_idx" ON "_glass_types_blk_compare_v" USING btree ("_path");
  CREATE INDEX "_glass_types_blk_download_v_items_order_idx" ON "_glass_types_blk_download_v_items" USING btree ("_order");
  CREATE INDEX "_glass_types_blk_download_v_items_parent_id_idx" ON "_glass_types_blk_download_v_items" USING btree ("_parent_id");
  CREATE INDEX "_glass_types_blk_download_v_items_file_idx" ON "_glass_types_blk_download_v_items" USING btree ("file_id");
  CREATE INDEX "_glass_types_blk_download_v_order_idx" ON "_glass_types_blk_download_v" USING btree ("_order");
  CREATE INDEX "_glass_types_blk_download_v_parent_id_idx" ON "_glass_types_blk_download_v" USING btree ("_parent_id");
  CREATE INDEX "_glass_types_blk_download_v_path_idx" ON "_glass_types_blk_download_v" USING btree ("_path");
  CREATE INDEX "_glass_types_blk_holes_v_order_idx" ON "_glass_types_blk_holes_v" USING btree ("_order");
  CREATE INDEX "_glass_types_blk_holes_v_parent_id_idx" ON "_glass_types_blk_holes_v" USING btree ("_parent_id");
  CREATE INDEX "_glass_types_blk_holes_v_path_idx" ON "_glass_types_blk_holes_v" USING btree ("_path");
  CREATE INDEX "_glass_types_blk_weight_v_order_idx" ON "_glass_types_blk_weight_v" USING btree ("_order");
  CREATE INDEX "_glass_types_blk_weight_v_parent_id_idx" ON "_glass_types_blk_weight_v" USING btree ("_parent_id");
  CREATE INDEX "_glass_types_blk_weight_v_path_idx" ON "_glass_types_blk_weight_v" USING btree ("_path");
  CREATE INDEX "_glass_types_blk_form_v_bullets_order_idx" ON "_glass_types_blk_form_v_bullets" USING btree ("_order");
  CREATE INDEX "_glass_types_blk_form_v_bullets_parent_id_idx" ON "_glass_types_blk_form_v_bullets" USING btree ("_parent_id");
  CREATE INDEX "_glass_types_blk_form_v_order_idx" ON "_glass_types_blk_form_v" USING btree ("_order");
  CREATE INDEX "_glass_types_blk_form_v_parent_id_idx" ON "_glass_types_blk_form_v" USING btree ("_parent_id");
  CREATE INDEX "_glass_types_blk_form_v_path_idx" ON "_glass_types_blk_form_v" USING btree ("_path");
  CREATE INDEX "_glass_types_blk_snippet_v_order_idx" ON "_glass_types_blk_snippet_v" USING btree ("_order");
  CREATE INDEX "_glass_types_blk_snippet_v_parent_id_idx" ON "_glass_types_blk_snippet_v" USING btree ("_parent_id");
  CREATE INDEX "_glass_types_blk_snippet_v_path_idx" ON "_glass_types_blk_snippet_v" USING btree ("_path");
  CREATE INDEX "_glass_types_blk_stats_v_items_order_idx" ON "_glass_types_blk_stats_v_items" USING btree ("_order");
  CREATE INDEX "_glass_types_blk_stats_v_items_parent_id_idx" ON "_glass_types_blk_stats_v_items" USING btree ("_parent_id");
  CREATE INDEX "_glass_types_blk_stats_v_order_idx" ON "_glass_types_blk_stats_v" USING btree ("_order");
  CREATE INDEX "_glass_types_blk_stats_v_parent_id_idx" ON "_glass_types_blk_stats_v" USING btree ("_parent_id");
  CREATE INDEX "_glass_types_blk_stats_v_path_idx" ON "_glass_types_blk_stats_v" USING btree ("_path");
  CREATE INDEX "_glass_types_blk_objects_v_order_idx" ON "_glass_types_blk_objects_v" USING btree ("_order");
  CREATE INDEX "_glass_types_blk_objects_v_parent_id_idx" ON "_glass_types_blk_objects_v" USING btree ("_parent_id");
  CREATE INDEX "_glass_types_blk_objects_v_path_idx" ON "_glass_types_blk_objects_v" USING btree ("_path");
  CREATE INDEX "_glass_types_blk_objects_v_product_idx" ON "_glass_types_blk_objects_v" USING btree ("product_id");
  CREATE INDEX "_glass_types_blk_articles_v_order_idx" ON "_glass_types_blk_articles_v" USING btree ("_order");
  CREATE INDEX "_glass_types_blk_articles_v_parent_id_idx" ON "_glass_types_blk_articles_v" USING btree ("_parent_id");
  CREATE INDEX "_glass_types_blk_articles_v_path_idx" ON "_glass_types_blk_articles_v" USING btree ("_path");
  CREATE INDEX "_glass_types_blk_wdw_left_v_order_idx" ON "_glass_types_blk_wdw_left_v" USING btree ("_order");
  CREATE INDEX "_glass_types_blk_wdw_left_v_parent_id_idx" ON "_glass_types_blk_wdw_left_v" USING btree ("_parent_id");
  CREATE INDEX "_glass_types_blk_wdw_right_v_order_idx" ON "_glass_types_blk_wdw_right_v" USING btree ("_order");
  CREATE INDEX "_glass_types_blk_wdw_right_v_parent_id_idx" ON "_glass_types_blk_wdw_right_v" USING btree ("_parent_id");
  CREATE INDEX "_glass_types_blk_wdw_v_order_idx" ON "_glass_types_blk_wdw_v" USING btree ("_order");
  CREATE INDEX "_glass_types_blk_wdw_v_parent_id_idx" ON "_glass_types_blk_wdw_v" USING btree ("_parent_id");
  CREATE INDEX "_glass_types_blk_wdw_v_path_idx" ON "_glass_types_blk_wdw_v" USING btree ("_path");
  CREATE INDEX "_glass_types_blk_systems_v_items_order_idx" ON "_glass_types_blk_systems_v_items" USING btree ("_order");
  CREATE INDEX "_glass_types_blk_systems_v_items_parent_id_idx" ON "_glass_types_blk_systems_v_items" USING btree ("_parent_id");
  CREATE INDEX "_glass_types_blk_systems_v_items_image_idx" ON "_glass_types_blk_systems_v_items" USING btree ("image_id");
  CREATE INDEX "_glass_types_blk_systems_v_order_idx" ON "_glass_types_blk_systems_v" USING btree ("_order");
  CREATE INDEX "_glass_types_blk_systems_v_parent_id_idx" ON "_glass_types_blk_systems_v" USING btree ("_parent_id");
  CREATE INDEX "_glass_types_blk_systems_v_path_idx" ON "_glass_types_blk_systems_v" USING btree ("_path");
  CREATE INDEX "_glass_types_blk_gallery_v_images_order_idx" ON "_glass_types_blk_gallery_v_images" USING btree ("_order");
  CREATE INDEX "_glass_types_blk_gallery_v_images_parent_id_idx" ON "_glass_types_blk_gallery_v_images" USING btree ("_parent_id");
  CREATE INDEX "_glass_types_blk_gallery_v_images_image_idx" ON "_glass_types_blk_gallery_v_images" USING btree ("image_id");
  CREATE INDEX "_glass_types_blk_gallery_v_order_idx" ON "_glass_types_blk_gallery_v" USING btree ("_order");
  CREATE INDEX "_glass_types_blk_gallery_v_parent_id_idx" ON "_glass_types_blk_gallery_v" USING btree ("_parent_id");
  CREATE INDEX "_glass_types_blk_gallery_v_path_idx" ON "_glass_types_blk_gallery_v" USING btree ("_path");
  CREATE INDEX "_glass_types_blk_two_cols_v_order_idx" ON "_glass_types_blk_two_cols_v" USING btree ("_order");
  CREATE INDEX "_glass_types_blk_two_cols_v_parent_id_idx" ON "_glass_types_blk_two_cols_v" USING btree ("_parent_id");
  CREATE INDEX "_glass_types_blk_two_cols_v_path_idx" ON "_glass_types_blk_two_cols_v" USING btree ("_path");
  CREATE INDEX "_glass_types_blk_links_v_items_order_idx" ON "_glass_types_blk_links_v_items" USING btree ("_order");
  CREATE INDEX "_glass_types_blk_links_v_items_parent_id_idx" ON "_glass_types_blk_links_v_items" USING btree ("_parent_id");
  CREATE INDEX "_glass_types_blk_links_v_order_idx" ON "_glass_types_blk_links_v" USING btree ("_order");
  CREATE INDEX "_glass_types_blk_links_v_parent_id_idx" ON "_glass_types_blk_links_v" USING btree ("_parent_id");
  CREATE INDEX "_glass_types_blk_links_v_path_idx" ON "_glass_types_blk_links_v" USING btree ("_path");
  CREATE INDEX "_glass_types_blk_contacts_v_order_idx" ON "_glass_types_blk_contacts_v" USING btree ("_order");
  CREATE INDEX "_glass_types_blk_contacts_v_parent_id_idx" ON "_glass_types_blk_contacts_v" USING btree ("_parent_id");
  CREATE INDEX "_glass_types_blk_contacts_v_path_idx" ON "_glass_types_blk_contacts_v" USING btree ("_path");
  CREATE INDEX "_glass_types_blk_requisites_v_order_idx" ON "_glass_types_blk_requisites_v" USING btree ("_order");
  CREATE INDEX "_glass_types_blk_requisites_v_parent_id_idx" ON "_glass_types_blk_requisites_v" USING btree ("_parent_id");
  CREATE INDEX "_glass_types_blk_requisites_v_path_idx" ON "_glass_types_blk_requisites_v" USING btree ("_path");
  CREATE INDEX "_glass_types_blk_team_v_order_idx" ON "_glass_types_blk_team_v" USING btree ("_order");
  CREATE INDEX "_glass_types_blk_team_v_parent_id_idx" ON "_glass_types_blk_team_v" USING btree ("_parent_id");
  CREATE INDEX "_glass_types_blk_team_v_path_idx" ON "_glass_types_blk_team_v" USING btree ("_path");
  CREATE INDEX "_glass_types_blk_quiz_cta_v_order_idx" ON "_glass_types_blk_quiz_cta_v" USING btree ("_order");
  CREATE INDEX "_glass_types_blk_quiz_cta_v_parent_id_idx" ON "_glass_types_blk_quiz_cta_v" USING btree ("_parent_id");
  CREATE INDEX "_glass_types_blk_quiz_cta_v_path_idx" ON "_glass_types_blk_quiz_cta_v" USING btree ("_path");
  CREATE INDEX "_glass_types_v_parent_idx" ON "_glass_types_v" USING btree ("parent_id");
  CREATE INDEX "_glass_types_v_version_version_slug_idx" ON "_glass_types_v" USING btree ("version_slug");
  CREATE INDEX "_glass_types_v_version_version_path_idx" ON "_glass_types_v" USING btree ("version_path");
  CREATE INDEX "_glass_types_v_version_card_version_card_image_idx" ON "_glass_types_v" USING btree ("version_card_image_id");
  CREATE INDEX "_glass_types_v_version_version_hero_image_idx" ON "_glass_types_v" USING btree ("version_hero_image_id");
  CREATE INDEX "_glass_types_v_version_version_objects_product_idx" ON "_glass_types_v" USING btree ("version_objects_product_id");
  CREATE INDEX "_glass_types_v_version_seo_version_seo_og_image_idx" ON "_glass_types_v" USING btree ("version_seo_og_image_id");
  CREATE INDEX "_glass_types_v_version_version_updated_at_idx" ON "_glass_types_v" USING btree ("version_updated_at");
  CREATE INDEX "_glass_types_v_version_version_created_at_idx" ON "_glass_types_v" USING btree ("version_created_at");
  CREATE INDEX "_glass_types_v_version_version__status_idx" ON "_glass_types_v" USING btree ("version__status");
  CREATE INDEX "_glass_types_v_created_at_idx" ON "_glass_types_v" USING btree ("created_at");
  CREATE INDEX "_glass_types_v_updated_at_idx" ON "_glass_types_v" USING btree ("updated_at");
  CREATE INDEX "_glass_types_v_latest_idx" ON "_glass_types_v" USING btree ("latest");
  CREATE INDEX "_glass_types_v_numbers_order_parent_idx" ON "_glass_types_v_numbers" USING btree ("order","parent_id");
  CREATE INDEX "_glass_types_v_rels_order_idx" ON "_glass_types_v_rels" USING btree ("order");
  CREATE INDEX "_glass_types_v_rels_parent_idx" ON "_glass_types_v_rels" USING btree ("parent_id");
  CREATE INDEX "_glass_types_v_rels_path_idx" ON "_glass_types_v_rels" USING btree ("path");
  CREATE INDEX "_glass_types_v_rels_pages_id_idx" ON "_glass_types_v_rels" USING btree ("pages_id");
  CREATE INDEX "_glass_types_v_rels_glass_types_id_idx" ON "_glass_types_v_rels" USING btree ("glass_types_id");
  CREATE INDEX "_glass_types_v_rels_thicknesses_id_idx" ON "_glass_types_v_rels" USING btree ("thicknesses_id");
  CREATE INDEX "_glass_types_v_rels_processing_services_id_idx" ON "_glass_types_v_rels" USING btree ("processing_services_id");
  CREATE INDEX "_glass_types_v_rels_constructions_id_idx" ON "_glass_types_v_rels" USING btree ("constructions_id");
  CREATE INDEX "_glass_types_v_rels_articles_id_idx" ON "_glass_types_v_rels" USING btree ("articles_id");
  CREATE INDEX "_glass_types_v_rels_objects_id_idx" ON "_glass_types_v_rels" USING btree ("objects_id");
  CREATE INDEX "processing_services_tables_cols_order_idx" ON "processing_services_tables_cols" USING btree ("_order");
  CREATE INDEX "processing_services_tables_cols_parent_id_idx" ON "processing_services_tables_cols" USING btree ("_parent_id");
  CREATE INDEX "processing_services_tables_rows_cells_order_idx" ON "processing_services_tables_rows_cells" USING btree ("_order");
  CREATE INDEX "processing_services_tables_rows_cells_parent_id_idx" ON "processing_services_tables_rows_cells" USING btree ("_parent_id");
  CREATE INDEX "processing_services_tables_rows_order_idx" ON "processing_services_tables_rows" USING btree ("_order");
  CREATE INDEX "processing_services_tables_rows_parent_id_idx" ON "processing_services_tables_rows" USING btree ("_parent_id");
  CREATE INDEX "processing_services_tables_order_idx" ON "processing_services_tables" USING btree ("_order");
  CREATE INDEX "processing_services_tables_parent_id_idx" ON "processing_services_tables" USING btree ("_parent_id");
  CREATE INDEX "processing_services_important_items_order_idx" ON "processing_services_important_items" USING btree ("_order");
  CREATE INDEX "processing_services_important_items_parent_id_idx" ON "processing_services_important_items" USING btree ("_parent_id");
  CREATE INDEX "processing_services_callouts_order_idx" ON "processing_services_callouts" USING btree ("_order");
  CREATE INDEX "processing_services_callouts_parent_id_idx" ON "processing_services_callouts" USING btree ("_parent_id");
  CREATE INDEX "processing_services_related_links_order_idx" ON "processing_services_related_links" USING btree ("_order");
  CREATE INDEX "processing_services_related_links_parent_id_idx" ON "processing_services_related_links" USING btree ("_parent_id");
  CREATE INDEX "processing_services_faq_order_idx" ON "processing_services_faq" USING btree ("_order");
  CREATE INDEX "processing_services_faq_parent_id_idx" ON "processing_services_faq" USING btree ("_parent_id");
  CREATE INDEX "processing_services_blk_hero_eyebrow_order_idx" ON "processing_services_blk_hero_eyebrow" USING btree ("_order");
  CREATE INDEX "processing_services_blk_hero_eyebrow_parent_id_idx" ON "processing_services_blk_hero_eyebrow" USING btree ("_parent_id");
  CREATE INDEX "processing_services_blk_hero_buttons_order_idx" ON "processing_services_blk_hero_buttons" USING btree ("_order");
  CREATE INDEX "processing_services_blk_hero_buttons_parent_id_idx" ON "processing_services_blk_hero_buttons" USING btree ("_parent_id");
  CREATE INDEX "processing_services_blk_hero_buttons_file_idx" ON "processing_services_blk_hero_buttons" USING btree ("file_id");
  CREATE INDEX "processing_services_blk_hero_photos_order_idx" ON "processing_services_blk_hero_photos" USING btree ("_order");
  CREATE INDEX "processing_services_blk_hero_photos_parent_id_idx" ON "processing_services_blk_hero_photos" USING btree ("_parent_id");
  CREATE INDEX "processing_services_blk_hero_photos_image_idx" ON "processing_services_blk_hero_photos" USING btree ("image_id");
  CREATE INDEX "processing_services_blk_hero_stats_order_idx" ON "processing_services_blk_hero_stats" USING btree ("_order");
  CREATE INDEX "processing_services_blk_hero_stats_parent_id_idx" ON "processing_services_blk_hero_stats" USING btree ("_parent_id");
  CREATE INDEX "processing_services_blk_hero_order_idx" ON "processing_services_blk_hero" USING btree ("_order");
  CREATE INDEX "processing_services_blk_hero_parent_id_idx" ON "processing_services_blk_hero" USING btree ("_parent_id");
  CREATE INDEX "processing_services_blk_hero_path_idx" ON "processing_services_blk_hero" USING btree ("_path");
  CREATE INDEX "processing_services_blk_hero_image_idx" ON "processing_services_blk_hero" USING btree ("image_id");
  CREATE INDEX "processing_services_blk_text_order_idx" ON "processing_services_blk_text" USING btree ("_order");
  CREATE INDEX "processing_services_blk_text_parent_id_idx" ON "processing_services_blk_text" USING btree ("_parent_id");
  CREATE INDEX "processing_services_blk_text_path_idx" ON "processing_services_blk_text" USING btree ("_path");
  CREATE INDEX "processing_services_blk_table_table_cols_order_idx" ON "processing_services_blk_table_table_cols" USING btree ("_order");
  CREATE INDEX "processing_services_blk_table_table_cols_parent_id_idx" ON "processing_services_blk_table_table_cols" USING btree ("_parent_id");
  CREATE INDEX "processing_services_blk_table_table_rows_cells_order_idx" ON "processing_services_blk_table_table_rows_cells" USING btree ("_order");
  CREATE INDEX "processing_services_blk_table_table_rows_cells_parent_id_idx" ON "processing_services_blk_table_table_rows_cells" USING btree ("_parent_id");
  CREATE INDEX "processing_services_blk_table_table_rows_order_idx" ON "processing_services_blk_table_table_rows" USING btree ("_order");
  CREATE INDEX "processing_services_blk_table_table_rows_parent_id_idx" ON "processing_services_blk_table_table_rows" USING btree ("_parent_id");
  CREATE INDEX "processing_services_blk_table_order_idx" ON "processing_services_blk_table" USING btree ("_order");
  CREATE INDEX "processing_services_blk_table_parent_id_idx" ON "processing_services_blk_table" USING btree ("_parent_id");
  CREATE INDEX "processing_services_blk_table_path_idx" ON "processing_services_blk_table" USING btree ("_path");
  CREATE INDEX "processing_services_blk_steps_items_order_idx" ON "processing_services_blk_steps_items" USING btree ("_order");
  CREATE INDEX "processing_services_blk_steps_items_parent_id_idx" ON "processing_services_blk_steps_items" USING btree ("_parent_id");
  CREATE INDEX "processing_services_blk_steps_buttons_order_idx" ON "processing_services_blk_steps_buttons" USING btree ("_order");
  CREATE INDEX "processing_services_blk_steps_buttons_parent_id_idx" ON "processing_services_blk_steps_buttons" USING btree ("_parent_id");
  CREATE INDEX "processing_services_blk_steps_buttons_file_idx" ON "processing_services_blk_steps_buttons" USING btree ("file_id");
  CREATE INDEX "processing_services_blk_steps_order_idx" ON "processing_services_blk_steps" USING btree ("_order");
  CREATE INDEX "processing_services_blk_steps_parent_id_idx" ON "processing_services_blk_steps" USING btree ("_parent_id");
  CREATE INDEX "processing_services_blk_steps_path_idx" ON "processing_services_blk_steps" USING btree ("_path");
  CREATE INDEX "processing_services_blk_callout_items_order_idx" ON "processing_services_blk_callout_items" USING btree ("_order");
  CREATE INDEX "processing_services_blk_callout_items_parent_id_idx" ON "processing_services_blk_callout_items" USING btree ("_parent_id");
  CREATE INDEX "processing_services_blk_callout_order_idx" ON "processing_services_blk_callout" USING btree ("_order");
  CREATE INDEX "processing_services_blk_callout_parent_id_idx" ON "processing_services_blk_callout" USING btree ("_parent_id");
  CREATE INDEX "processing_services_blk_callout_path_idx" ON "processing_services_blk_callout" USING btree ("_path");
  CREATE INDEX "processing_services_blk_terms_items_order_idx" ON "processing_services_blk_terms_items" USING btree ("_order");
  CREATE INDEX "processing_services_blk_terms_items_parent_id_idx" ON "processing_services_blk_terms_items" USING btree ("_parent_id");
  CREATE INDEX "processing_services_blk_terms_order_idx" ON "processing_services_blk_terms" USING btree ("_order");
  CREATE INDEX "processing_services_blk_terms_parent_id_idx" ON "processing_services_blk_terms" USING btree ("_parent_id");
  CREATE INDEX "processing_services_blk_terms_path_idx" ON "processing_services_blk_terms" USING btree ("_path");
  CREATE INDEX "processing_services_blk_cards_items_order_idx" ON "processing_services_blk_cards_items" USING btree ("_order");
  CREATE INDEX "processing_services_blk_cards_items_parent_id_idx" ON "processing_services_blk_cards_items" USING btree ("_parent_id");
  CREATE INDEX "processing_services_blk_cards_items_image_idx" ON "processing_services_blk_cards_items" USING btree ("image_id");
  CREATE INDEX "processing_services_blk_cards_order_idx" ON "processing_services_blk_cards" USING btree ("_order");
  CREATE INDEX "processing_services_blk_cards_parent_id_idx" ON "processing_services_blk_cards" USING btree ("_parent_id");
  CREATE INDEX "processing_services_blk_cards_path_idx" ON "processing_services_blk_cards" USING btree ("_path");
  CREATE INDEX "processing_services_blk_coll_cards_order_idx" ON "processing_services_blk_coll_cards" USING btree ("_order");
  CREATE INDEX "processing_services_blk_coll_cards_parent_id_idx" ON "processing_services_blk_coll_cards" USING btree ("_parent_id");
  CREATE INDEX "processing_services_blk_coll_cards_path_idx" ON "processing_services_blk_coll_cards" USING btree ("_path");
  CREATE INDEX "processing_services_blk_prices_order_idx" ON "processing_services_blk_prices" USING btree ("_order");
  CREATE INDEX "processing_services_blk_prices_parent_id_idx" ON "processing_services_blk_prices" USING btree ("_parent_id");
  CREATE INDEX "processing_services_blk_prices_path_idx" ON "processing_services_blk_prices" USING btree ("_path");
  CREATE INDEX "processing_services_blk_faq_items_order_idx" ON "processing_services_blk_faq_items" USING btree ("_order");
  CREATE INDEX "processing_services_blk_faq_items_parent_id_idx" ON "processing_services_blk_faq_items" USING btree ("_parent_id");
  CREATE INDEX "processing_services_blk_faq_order_idx" ON "processing_services_blk_faq" USING btree ("_order");
  CREATE INDEX "processing_services_blk_faq_parent_id_idx" ON "processing_services_blk_faq" USING btree ("_parent_id");
  CREATE INDEX "processing_services_blk_faq_path_idx" ON "processing_services_blk_faq" USING btree ("_path");
  CREATE INDEX "processing_services_blk_cta_buttons_order_idx" ON "processing_services_blk_cta_buttons" USING btree ("_order");
  CREATE INDEX "processing_services_blk_cta_buttons_parent_id_idx" ON "processing_services_blk_cta_buttons" USING btree ("_parent_id");
  CREATE INDEX "processing_services_blk_cta_buttons_file_idx" ON "processing_services_blk_cta_buttons" USING btree ("file_id");
  CREATE INDEX "processing_services_blk_cta_order_idx" ON "processing_services_blk_cta" USING btree ("_order");
  CREATE INDEX "processing_services_blk_cta_parent_id_idx" ON "processing_services_blk_cta" USING btree ("_parent_id");
  CREATE INDEX "processing_services_blk_cta_path_idx" ON "processing_services_blk_cta" USING btree ("_path");
  CREATE INDEX "processing_services_blk_compare_rows_order_idx" ON "processing_services_blk_compare_rows" USING btree ("_order");
  CREATE INDEX "processing_services_blk_compare_rows_parent_id_idx" ON "processing_services_blk_compare_rows" USING btree ("_parent_id");
  CREATE INDEX "processing_services_blk_compare_order_idx" ON "processing_services_blk_compare" USING btree ("_order");
  CREATE INDEX "processing_services_blk_compare_parent_id_idx" ON "processing_services_blk_compare" USING btree ("_parent_id");
  CREATE INDEX "processing_services_blk_compare_path_idx" ON "processing_services_blk_compare" USING btree ("_path");
  CREATE INDEX "processing_services_blk_download_items_order_idx" ON "processing_services_blk_download_items" USING btree ("_order");
  CREATE INDEX "processing_services_blk_download_items_parent_id_idx" ON "processing_services_blk_download_items" USING btree ("_parent_id");
  CREATE INDEX "processing_services_blk_download_items_file_idx" ON "processing_services_blk_download_items" USING btree ("file_id");
  CREATE INDEX "processing_services_blk_download_order_idx" ON "processing_services_blk_download" USING btree ("_order");
  CREATE INDEX "processing_services_blk_download_parent_id_idx" ON "processing_services_blk_download" USING btree ("_parent_id");
  CREATE INDEX "processing_services_blk_download_path_idx" ON "processing_services_blk_download" USING btree ("_path");
  CREATE INDEX "processing_services_blk_holes_order_idx" ON "processing_services_blk_holes" USING btree ("_order");
  CREATE INDEX "processing_services_blk_holes_parent_id_idx" ON "processing_services_blk_holes" USING btree ("_parent_id");
  CREATE INDEX "processing_services_blk_holes_path_idx" ON "processing_services_blk_holes" USING btree ("_path");
  CREATE INDEX "processing_services_blk_weight_order_idx" ON "processing_services_blk_weight" USING btree ("_order");
  CREATE INDEX "processing_services_blk_weight_parent_id_idx" ON "processing_services_blk_weight" USING btree ("_parent_id");
  CREATE INDEX "processing_services_blk_weight_path_idx" ON "processing_services_blk_weight" USING btree ("_path");
  CREATE INDEX "processing_services_blk_form_bullets_order_idx" ON "processing_services_blk_form_bullets" USING btree ("_order");
  CREATE INDEX "processing_services_blk_form_bullets_parent_id_idx" ON "processing_services_blk_form_bullets" USING btree ("_parent_id");
  CREATE INDEX "processing_services_blk_form_order_idx" ON "processing_services_blk_form" USING btree ("_order");
  CREATE INDEX "processing_services_blk_form_parent_id_idx" ON "processing_services_blk_form" USING btree ("_parent_id");
  CREATE INDEX "processing_services_blk_form_path_idx" ON "processing_services_blk_form" USING btree ("_path");
  CREATE INDEX "processing_services_blk_snippet_order_idx" ON "processing_services_blk_snippet" USING btree ("_order");
  CREATE INDEX "processing_services_blk_snippet_parent_id_idx" ON "processing_services_blk_snippet" USING btree ("_parent_id");
  CREATE INDEX "processing_services_blk_snippet_path_idx" ON "processing_services_blk_snippet" USING btree ("_path");
  CREATE INDEX "processing_services_blk_stats_items_order_idx" ON "processing_services_blk_stats_items" USING btree ("_order");
  CREATE INDEX "processing_services_blk_stats_items_parent_id_idx" ON "processing_services_blk_stats_items" USING btree ("_parent_id");
  CREATE INDEX "processing_services_blk_stats_order_idx" ON "processing_services_blk_stats" USING btree ("_order");
  CREATE INDEX "processing_services_blk_stats_parent_id_idx" ON "processing_services_blk_stats" USING btree ("_parent_id");
  CREATE INDEX "processing_services_blk_stats_path_idx" ON "processing_services_blk_stats" USING btree ("_path");
  CREATE INDEX "processing_services_blk_objects_order_idx" ON "processing_services_blk_objects" USING btree ("_order");
  CREATE INDEX "processing_services_blk_objects_parent_id_idx" ON "processing_services_blk_objects" USING btree ("_parent_id");
  CREATE INDEX "processing_services_blk_objects_path_idx" ON "processing_services_blk_objects" USING btree ("_path");
  CREATE INDEX "processing_services_blk_objects_product_idx" ON "processing_services_blk_objects" USING btree ("product_id");
  CREATE INDEX "processing_services_blk_articles_order_idx" ON "processing_services_blk_articles" USING btree ("_order");
  CREATE INDEX "processing_services_blk_articles_parent_id_idx" ON "processing_services_blk_articles" USING btree ("_parent_id");
  CREATE INDEX "processing_services_blk_articles_path_idx" ON "processing_services_blk_articles" USING btree ("_path");
  CREATE INDEX "processing_services_blk_wdw_left_order_idx" ON "processing_services_blk_wdw_left" USING btree ("_order");
  CREATE INDEX "processing_services_blk_wdw_left_parent_id_idx" ON "processing_services_blk_wdw_left" USING btree ("_parent_id");
  CREATE INDEX "processing_services_blk_wdw_right_order_idx" ON "processing_services_blk_wdw_right" USING btree ("_order");
  CREATE INDEX "processing_services_blk_wdw_right_parent_id_idx" ON "processing_services_blk_wdw_right" USING btree ("_parent_id");
  CREATE INDEX "processing_services_blk_wdw_order_idx" ON "processing_services_blk_wdw" USING btree ("_order");
  CREATE INDEX "processing_services_blk_wdw_parent_id_idx" ON "processing_services_blk_wdw" USING btree ("_parent_id");
  CREATE INDEX "processing_services_blk_wdw_path_idx" ON "processing_services_blk_wdw" USING btree ("_path");
  CREATE INDEX "processing_services_blk_systems_items_order_idx" ON "processing_services_blk_systems_items" USING btree ("_order");
  CREATE INDEX "processing_services_blk_systems_items_parent_id_idx" ON "processing_services_blk_systems_items" USING btree ("_parent_id");
  CREATE INDEX "processing_services_blk_systems_items_image_idx" ON "processing_services_blk_systems_items" USING btree ("image_id");
  CREATE INDEX "processing_services_blk_systems_order_idx" ON "processing_services_blk_systems" USING btree ("_order");
  CREATE INDEX "processing_services_blk_systems_parent_id_idx" ON "processing_services_blk_systems" USING btree ("_parent_id");
  CREATE INDEX "processing_services_blk_systems_path_idx" ON "processing_services_blk_systems" USING btree ("_path");
  CREATE INDEX "processing_services_blk_gallery_images_order_idx" ON "processing_services_blk_gallery_images" USING btree ("_order");
  CREATE INDEX "processing_services_blk_gallery_images_parent_id_idx" ON "processing_services_blk_gallery_images" USING btree ("_parent_id");
  CREATE INDEX "processing_services_blk_gallery_images_image_idx" ON "processing_services_blk_gallery_images" USING btree ("image_id");
  CREATE INDEX "processing_services_blk_gallery_order_idx" ON "processing_services_blk_gallery" USING btree ("_order");
  CREATE INDEX "processing_services_blk_gallery_parent_id_idx" ON "processing_services_blk_gallery" USING btree ("_parent_id");
  CREATE INDEX "processing_services_blk_gallery_path_idx" ON "processing_services_blk_gallery" USING btree ("_path");
  CREATE INDEX "processing_services_blk_two_cols_order_idx" ON "processing_services_blk_two_cols" USING btree ("_order");
  CREATE INDEX "processing_services_blk_two_cols_parent_id_idx" ON "processing_services_blk_two_cols" USING btree ("_parent_id");
  CREATE INDEX "processing_services_blk_two_cols_path_idx" ON "processing_services_blk_two_cols" USING btree ("_path");
  CREATE INDEX "processing_services_blk_links_items_order_idx" ON "processing_services_blk_links_items" USING btree ("_order");
  CREATE INDEX "processing_services_blk_links_items_parent_id_idx" ON "processing_services_blk_links_items" USING btree ("_parent_id");
  CREATE INDEX "processing_services_blk_links_order_idx" ON "processing_services_blk_links" USING btree ("_order");
  CREATE INDEX "processing_services_blk_links_parent_id_idx" ON "processing_services_blk_links" USING btree ("_parent_id");
  CREATE INDEX "processing_services_blk_links_path_idx" ON "processing_services_blk_links" USING btree ("_path");
  CREATE INDEX "processing_services_blk_contacts_order_idx" ON "processing_services_blk_contacts" USING btree ("_order");
  CREATE INDEX "processing_services_blk_contacts_parent_id_idx" ON "processing_services_blk_contacts" USING btree ("_parent_id");
  CREATE INDEX "processing_services_blk_contacts_path_idx" ON "processing_services_blk_contacts" USING btree ("_path");
  CREATE INDEX "processing_services_blk_requisites_order_idx" ON "processing_services_blk_requisites" USING btree ("_order");
  CREATE INDEX "processing_services_blk_requisites_parent_id_idx" ON "processing_services_blk_requisites" USING btree ("_parent_id");
  CREATE INDEX "processing_services_blk_requisites_path_idx" ON "processing_services_blk_requisites" USING btree ("_path");
  CREATE INDEX "processing_services_blk_team_order_idx" ON "processing_services_blk_team" USING btree ("_order");
  CREATE INDEX "processing_services_blk_team_parent_id_idx" ON "processing_services_blk_team" USING btree ("_parent_id");
  CREATE INDEX "processing_services_blk_team_path_idx" ON "processing_services_blk_team" USING btree ("_path");
  CREATE INDEX "processing_services_blk_quiz_cta_order_idx" ON "processing_services_blk_quiz_cta" USING btree ("_order");
  CREATE INDEX "processing_services_blk_quiz_cta_parent_id_idx" ON "processing_services_blk_quiz_cta" USING btree ("_parent_id");
  CREATE INDEX "processing_services_blk_quiz_cta_path_idx" ON "processing_services_blk_quiz_cta" USING btree ("_path");
  CREATE UNIQUE INDEX "processing_services_slug_idx" ON "processing_services" USING btree ("slug");
  CREATE UNIQUE INDEX "processing_services_path_idx" ON "processing_services" USING btree ("path");
  CREATE INDEX "processing_services_card_card_image_idx" ON "processing_services" USING btree ("card_image_id");
  CREATE INDEX "processing_services_hero_image_idx" ON "processing_services" USING btree ("hero_image_id");
  CREATE INDEX "processing_services_seo_seo_og_image_idx" ON "processing_services" USING btree ("seo_og_image_id");
  CREATE INDEX "processing_services_updated_at_idx" ON "processing_services" USING btree ("updated_at");
  CREATE INDEX "processing_services_created_at_idx" ON "processing_services" USING btree ("created_at");
  CREATE INDEX "processing_services_rels_order_idx" ON "processing_services_rels" USING btree ("order");
  CREATE INDEX "processing_services_rels_parent_idx" ON "processing_services_rels" USING btree ("parent_id");
  CREATE INDEX "processing_services_rels_path_idx" ON "processing_services_rels" USING btree ("path");
  CREATE INDEX "processing_services_rels_pages_id_idx" ON "processing_services_rels" USING btree ("pages_id");
  CREATE INDEX "processing_services_rels_glass_types_id_idx" ON "processing_services_rels" USING btree ("glass_types_id");
  CREATE INDEX "processing_services_rels_thicknesses_id_idx" ON "processing_services_rels" USING btree ("thicknesses_id");
  CREATE INDEX "processing_services_rels_processing_services_id_idx" ON "processing_services_rels" USING btree ("processing_services_id");
  CREATE INDEX "processing_services_rels_constructions_id_idx" ON "processing_services_rels" USING btree ("constructions_id");
  CREATE INDEX "processing_services_rels_articles_id_idx" ON "processing_services_rels" USING btree ("articles_id");
  CREATE INDEX "processing_services_rels_objects_id_idx" ON "processing_services_rels" USING btree ("objects_id");
  CREATE INDEX "constructions_systems_order_idx" ON "constructions_systems" USING btree ("_order");
  CREATE INDEX "constructions_systems_parent_id_idx" ON "constructions_systems" USING btree ("_parent_id");
  CREATE INDEX "constructions_systems_image_idx" ON "constructions_systems" USING btree ("image_id");
  CREATE INDEX "constructions_profile_systems_order_idx" ON "constructions_profile_systems" USING btree ("_order");
  CREATE INDEX "constructions_profile_systems_parent_id_idx" ON "constructions_profile_systems" USING btree ("_parent_id");
  CREATE INDEX "constructions_glass_bullets_order_idx" ON "constructions_glass_bullets" USING btree ("_order");
  CREATE INDEX "constructions_glass_bullets_parent_id_idx" ON "constructions_glass_bullets" USING btree ("_parent_id");
  CREATE INDEX "constructions_tables_cols_order_idx" ON "constructions_tables_cols" USING btree ("_order");
  CREATE INDEX "constructions_tables_cols_parent_id_idx" ON "constructions_tables_cols" USING btree ("_parent_id");
  CREATE INDEX "constructions_tables_rows_cells_order_idx" ON "constructions_tables_rows_cells" USING btree ("_order");
  CREATE INDEX "constructions_tables_rows_cells_parent_id_idx" ON "constructions_tables_rows_cells" USING btree ("_parent_id");
  CREATE INDEX "constructions_tables_rows_order_idx" ON "constructions_tables_rows" USING btree ("_order");
  CREATE INDEX "constructions_tables_rows_parent_id_idx" ON "constructions_tables_rows" USING btree ("_parent_id");
  CREATE INDEX "constructions_tables_order_idx" ON "constructions_tables" USING btree ("_order");
  CREATE INDEX "constructions_tables_parent_id_idx" ON "constructions_tables" USING btree ("_parent_id");
  CREATE INDEX "constructions_who_does_what_wdw_left_order_idx" ON "constructions_who_does_what_wdw_left" USING btree ("_order");
  CREATE INDEX "constructions_who_does_what_wdw_left_parent_id_idx" ON "constructions_who_does_what_wdw_left" USING btree ("_parent_id");
  CREATE INDEX "constructions_who_does_what_wdw_right_order_idx" ON "constructions_who_does_what_wdw_right" USING btree ("_order");
  CREATE INDEX "constructions_who_does_what_wdw_right_parent_id_idx" ON "constructions_who_does_what_wdw_right" USING btree ("_parent_id");
  CREATE INDEX "constructions_faq_order_idx" ON "constructions_faq" USING btree ("_order");
  CREATE INDEX "constructions_faq_parent_id_idx" ON "constructions_faq" USING btree ("_parent_id");
  CREATE INDEX "constructions_blk_hero_eyebrow_order_idx" ON "constructions_blk_hero_eyebrow" USING btree ("_order");
  CREATE INDEX "constructions_blk_hero_eyebrow_parent_id_idx" ON "constructions_blk_hero_eyebrow" USING btree ("_parent_id");
  CREATE INDEX "constructions_blk_hero_buttons_order_idx" ON "constructions_blk_hero_buttons" USING btree ("_order");
  CREATE INDEX "constructions_blk_hero_buttons_parent_id_idx" ON "constructions_blk_hero_buttons" USING btree ("_parent_id");
  CREATE INDEX "constructions_blk_hero_buttons_file_idx" ON "constructions_blk_hero_buttons" USING btree ("file_id");
  CREATE INDEX "constructions_blk_hero_photos_order_idx" ON "constructions_blk_hero_photos" USING btree ("_order");
  CREATE INDEX "constructions_blk_hero_photos_parent_id_idx" ON "constructions_blk_hero_photos" USING btree ("_parent_id");
  CREATE INDEX "constructions_blk_hero_photos_image_idx" ON "constructions_blk_hero_photos" USING btree ("image_id");
  CREATE INDEX "constructions_blk_hero_stats_order_idx" ON "constructions_blk_hero_stats" USING btree ("_order");
  CREATE INDEX "constructions_blk_hero_stats_parent_id_idx" ON "constructions_blk_hero_stats" USING btree ("_parent_id");
  CREATE INDEX "constructions_blk_hero_order_idx" ON "constructions_blk_hero" USING btree ("_order");
  CREATE INDEX "constructions_blk_hero_parent_id_idx" ON "constructions_blk_hero" USING btree ("_parent_id");
  CREATE INDEX "constructions_blk_hero_path_idx" ON "constructions_blk_hero" USING btree ("_path");
  CREATE INDEX "constructions_blk_hero_image_idx" ON "constructions_blk_hero" USING btree ("image_id");
  CREATE INDEX "constructions_blk_text_order_idx" ON "constructions_blk_text" USING btree ("_order");
  CREATE INDEX "constructions_blk_text_parent_id_idx" ON "constructions_blk_text" USING btree ("_parent_id");
  CREATE INDEX "constructions_blk_text_path_idx" ON "constructions_blk_text" USING btree ("_path");
  CREATE INDEX "constructions_blk_table_table_cols_order_idx" ON "constructions_blk_table_table_cols" USING btree ("_order");
  CREATE INDEX "constructions_blk_table_table_cols_parent_id_idx" ON "constructions_blk_table_table_cols" USING btree ("_parent_id");
  CREATE INDEX "constructions_blk_table_table_rows_cells_order_idx" ON "constructions_blk_table_table_rows_cells" USING btree ("_order");
  CREATE INDEX "constructions_blk_table_table_rows_cells_parent_id_idx" ON "constructions_blk_table_table_rows_cells" USING btree ("_parent_id");
  CREATE INDEX "constructions_blk_table_table_rows_order_idx" ON "constructions_blk_table_table_rows" USING btree ("_order");
  CREATE INDEX "constructions_blk_table_table_rows_parent_id_idx" ON "constructions_blk_table_table_rows" USING btree ("_parent_id");
  CREATE INDEX "constructions_blk_table_order_idx" ON "constructions_blk_table" USING btree ("_order");
  CREATE INDEX "constructions_blk_table_parent_id_idx" ON "constructions_blk_table" USING btree ("_parent_id");
  CREATE INDEX "constructions_blk_table_path_idx" ON "constructions_blk_table" USING btree ("_path");
  CREATE INDEX "constructions_blk_steps_items_order_idx" ON "constructions_blk_steps_items" USING btree ("_order");
  CREATE INDEX "constructions_blk_steps_items_parent_id_idx" ON "constructions_blk_steps_items" USING btree ("_parent_id");
  CREATE INDEX "constructions_blk_steps_buttons_order_idx" ON "constructions_blk_steps_buttons" USING btree ("_order");
  CREATE INDEX "constructions_blk_steps_buttons_parent_id_idx" ON "constructions_blk_steps_buttons" USING btree ("_parent_id");
  CREATE INDEX "constructions_blk_steps_buttons_file_idx" ON "constructions_blk_steps_buttons" USING btree ("file_id");
  CREATE INDEX "constructions_blk_steps_order_idx" ON "constructions_blk_steps" USING btree ("_order");
  CREATE INDEX "constructions_blk_steps_parent_id_idx" ON "constructions_blk_steps" USING btree ("_parent_id");
  CREATE INDEX "constructions_blk_steps_path_idx" ON "constructions_blk_steps" USING btree ("_path");
  CREATE INDEX "constructions_blk_callout_items_order_idx" ON "constructions_blk_callout_items" USING btree ("_order");
  CREATE INDEX "constructions_blk_callout_items_parent_id_idx" ON "constructions_blk_callout_items" USING btree ("_parent_id");
  CREATE INDEX "constructions_blk_callout_order_idx" ON "constructions_blk_callout" USING btree ("_order");
  CREATE INDEX "constructions_blk_callout_parent_id_idx" ON "constructions_blk_callout" USING btree ("_parent_id");
  CREATE INDEX "constructions_blk_callout_path_idx" ON "constructions_blk_callout" USING btree ("_path");
  CREATE INDEX "constructions_blk_terms_items_order_idx" ON "constructions_blk_terms_items" USING btree ("_order");
  CREATE INDEX "constructions_blk_terms_items_parent_id_idx" ON "constructions_blk_terms_items" USING btree ("_parent_id");
  CREATE INDEX "constructions_blk_terms_order_idx" ON "constructions_blk_terms" USING btree ("_order");
  CREATE INDEX "constructions_blk_terms_parent_id_idx" ON "constructions_blk_terms" USING btree ("_parent_id");
  CREATE INDEX "constructions_blk_terms_path_idx" ON "constructions_blk_terms" USING btree ("_path");
  CREATE INDEX "constructions_blk_cards_items_order_idx" ON "constructions_blk_cards_items" USING btree ("_order");
  CREATE INDEX "constructions_blk_cards_items_parent_id_idx" ON "constructions_blk_cards_items" USING btree ("_parent_id");
  CREATE INDEX "constructions_blk_cards_items_image_idx" ON "constructions_blk_cards_items" USING btree ("image_id");
  CREATE INDEX "constructions_blk_cards_order_idx" ON "constructions_blk_cards" USING btree ("_order");
  CREATE INDEX "constructions_blk_cards_parent_id_idx" ON "constructions_blk_cards" USING btree ("_parent_id");
  CREATE INDEX "constructions_blk_cards_path_idx" ON "constructions_blk_cards" USING btree ("_path");
  CREATE INDEX "constructions_blk_coll_cards_order_idx" ON "constructions_blk_coll_cards" USING btree ("_order");
  CREATE INDEX "constructions_blk_coll_cards_parent_id_idx" ON "constructions_blk_coll_cards" USING btree ("_parent_id");
  CREATE INDEX "constructions_blk_coll_cards_path_idx" ON "constructions_blk_coll_cards" USING btree ("_path");
  CREATE INDEX "constructions_blk_prices_order_idx" ON "constructions_blk_prices" USING btree ("_order");
  CREATE INDEX "constructions_blk_prices_parent_id_idx" ON "constructions_blk_prices" USING btree ("_parent_id");
  CREATE INDEX "constructions_blk_prices_path_idx" ON "constructions_blk_prices" USING btree ("_path");
  CREATE INDEX "constructions_blk_faq_items_order_idx" ON "constructions_blk_faq_items" USING btree ("_order");
  CREATE INDEX "constructions_blk_faq_items_parent_id_idx" ON "constructions_blk_faq_items" USING btree ("_parent_id");
  CREATE INDEX "constructions_blk_faq_order_idx" ON "constructions_blk_faq" USING btree ("_order");
  CREATE INDEX "constructions_blk_faq_parent_id_idx" ON "constructions_blk_faq" USING btree ("_parent_id");
  CREATE INDEX "constructions_blk_faq_path_idx" ON "constructions_blk_faq" USING btree ("_path");
  CREATE INDEX "constructions_blk_cta_buttons_order_idx" ON "constructions_blk_cta_buttons" USING btree ("_order");
  CREATE INDEX "constructions_blk_cta_buttons_parent_id_idx" ON "constructions_blk_cta_buttons" USING btree ("_parent_id");
  CREATE INDEX "constructions_blk_cta_buttons_file_idx" ON "constructions_blk_cta_buttons" USING btree ("file_id");
  CREATE INDEX "constructions_blk_cta_order_idx" ON "constructions_blk_cta" USING btree ("_order");
  CREATE INDEX "constructions_blk_cta_parent_id_idx" ON "constructions_blk_cta" USING btree ("_parent_id");
  CREATE INDEX "constructions_blk_cta_path_idx" ON "constructions_blk_cta" USING btree ("_path");
  CREATE INDEX "constructions_blk_compare_rows_order_idx" ON "constructions_blk_compare_rows" USING btree ("_order");
  CREATE INDEX "constructions_blk_compare_rows_parent_id_idx" ON "constructions_blk_compare_rows" USING btree ("_parent_id");
  CREATE INDEX "constructions_blk_compare_order_idx" ON "constructions_blk_compare" USING btree ("_order");
  CREATE INDEX "constructions_blk_compare_parent_id_idx" ON "constructions_blk_compare" USING btree ("_parent_id");
  CREATE INDEX "constructions_blk_compare_path_idx" ON "constructions_blk_compare" USING btree ("_path");
  CREATE INDEX "constructions_blk_download_items_order_idx" ON "constructions_blk_download_items" USING btree ("_order");
  CREATE INDEX "constructions_blk_download_items_parent_id_idx" ON "constructions_blk_download_items" USING btree ("_parent_id");
  CREATE INDEX "constructions_blk_download_items_file_idx" ON "constructions_blk_download_items" USING btree ("file_id");
  CREATE INDEX "constructions_blk_download_order_idx" ON "constructions_blk_download" USING btree ("_order");
  CREATE INDEX "constructions_blk_download_parent_id_idx" ON "constructions_blk_download" USING btree ("_parent_id");
  CREATE INDEX "constructions_blk_download_path_idx" ON "constructions_blk_download" USING btree ("_path");
  CREATE INDEX "constructions_blk_holes_order_idx" ON "constructions_blk_holes" USING btree ("_order");
  CREATE INDEX "constructions_blk_holes_parent_id_idx" ON "constructions_blk_holes" USING btree ("_parent_id");
  CREATE INDEX "constructions_blk_holes_path_idx" ON "constructions_blk_holes" USING btree ("_path");
  CREATE INDEX "constructions_blk_weight_order_idx" ON "constructions_blk_weight" USING btree ("_order");
  CREATE INDEX "constructions_blk_weight_parent_id_idx" ON "constructions_blk_weight" USING btree ("_parent_id");
  CREATE INDEX "constructions_blk_weight_path_idx" ON "constructions_blk_weight" USING btree ("_path");
  CREATE INDEX "constructions_blk_form_bullets_order_idx" ON "constructions_blk_form_bullets" USING btree ("_order");
  CREATE INDEX "constructions_blk_form_bullets_parent_id_idx" ON "constructions_blk_form_bullets" USING btree ("_parent_id");
  CREATE INDEX "constructions_blk_form_order_idx" ON "constructions_blk_form" USING btree ("_order");
  CREATE INDEX "constructions_blk_form_parent_id_idx" ON "constructions_blk_form" USING btree ("_parent_id");
  CREATE INDEX "constructions_blk_form_path_idx" ON "constructions_blk_form" USING btree ("_path");
  CREATE INDEX "constructions_blk_snippet_order_idx" ON "constructions_blk_snippet" USING btree ("_order");
  CREATE INDEX "constructions_blk_snippet_parent_id_idx" ON "constructions_blk_snippet" USING btree ("_parent_id");
  CREATE INDEX "constructions_blk_snippet_path_idx" ON "constructions_blk_snippet" USING btree ("_path");
  CREATE INDEX "constructions_blk_stats_items_order_idx" ON "constructions_blk_stats_items" USING btree ("_order");
  CREATE INDEX "constructions_blk_stats_items_parent_id_idx" ON "constructions_blk_stats_items" USING btree ("_parent_id");
  CREATE INDEX "constructions_blk_stats_order_idx" ON "constructions_blk_stats" USING btree ("_order");
  CREATE INDEX "constructions_blk_stats_parent_id_idx" ON "constructions_blk_stats" USING btree ("_parent_id");
  CREATE INDEX "constructions_blk_stats_path_idx" ON "constructions_blk_stats" USING btree ("_path");
  CREATE INDEX "constructions_blk_objects_order_idx" ON "constructions_blk_objects" USING btree ("_order");
  CREATE INDEX "constructions_blk_objects_parent_id_idx" ON "constructions_blk_objects" USING btree ("_parent_id");
  CREATE INDEX "constructions_blk_objects_path_idx" ON "constructions_blk_objects" USING btree ("_path");
  CREATE INDEX "constructions_blk_objects_product_idx" ON "constructions_blk_objects" USING btree ("product_id");
  CREATE INDEX "constructions_blk_articles_order_idx" ON "constructions_blk_articles" USING btree ("_order");
  CREATE INDEX "constructions_blk_articles_parent_id_idx" ON "constructions_blk_articles" USING btree ("_parent_id");
  CREATE INDEX "constructions_blk_articles_path_idx" ON "constructions_blk_articles" USING btree ("_path");
  CREATE INDEX "constructions_blk_wdw_left_order_idx" ON "constructions_blk_wdw_left" USING btree ("_order");
  CREATE INDEX "constructions_blk_wdw_left_parent_id_idx" ON "constructions_blk_wdw_left" USING btree ("_parent_id");
  CREATE INDEX "constructions_blk_wdw_right_order_idx" ON "constructions_blk_wdw_right" USING btree ("_order");
  CREATE INDEX "constructions_blk_wdw_right_parent_id_idx" ON "constructions_blk_wdw_right" USING btree ("_parent_id");
  CREATE INDEX "constructions_blk_wdw_order_idx" ON "constructions_blk_wdw" USING btree ("_order");
  CREATE INDEX "constructions_blk_wdw_parent_id_idx" ON "constructions_blk_wdw" USING btree ("_parent_id");
  CREATE INDEX "constructions_blk_wdw_path_idx" ON "constructions_blk_wdw" USING btree ("_path");
  CREATE INDEX "constructions_blk_systems_items_order_idx" ON "constructions_blk_systems_items" USING btree ("_order");
  CREATE INDEX "constructions_blk_systems_items_parent_id_idx" ON "constructions_blk_systems_items" USING btree ("_parent_id");
  CREATE INDEX "constructions_blk_systems_items_image_idx" ON "constructions_blk_systems_items" USING btree ("image_id");
  CREATE INDEX "constructions_blk_systems_order_idx" ON "constructions_blk_systems" USING btree ("_order");
  CREATE INDEX "constructions_blk_systems_parent_id_idx" ON "constructions_blk_systems" USING btree ("_parent_id");
  CREATE INDEX "constructions_blk_systems_path_idx" ON "constructions_blk_systems" USING btree ("_path");
  CREATE INDEX "constructions_blk_gallery_images_order_idx" ON "constructions_blk_gallery_images" USING btree ("_order");
  CREATE INDEX "constructions_blk_gallery_images_parent_id_idx" ON "constructions_blk_gallery_images" USING btree ("_parent_id");
  CREATE INDEX "constructions_blk_gallery_images_image_idx" ON "constructions_blk_gallery_images" USING btree ("image_id");
  CREATE INDEX "constructions_blk_gallery_order_idx" ON "constructions_blk_gallery" USING btree ("_order");
  CREATE INDEX "constructions_blk_gallery_parent_id_idx" ON "constructions_blk_gallery" USING btree ("_parent_id");
  CREATE INDEX "constructions_blk_gallery_path_idx" ON "constructions_blk_gallery" USING btree ("_path");
  CREATE INDEX "constructions_blk_two_cols_order_idx" ON "constructions_blk_two_cols" USING btree ("_order");
  CREATE INDEX "constructions_blk_two_cols_parent_id_idx" ON "constructions_blk_two_cols" USING btree ("_parent_id");
  CREATE INDEX "constructions_blk_two_cols_path_idx" ON "constructions_blk_two_cols" USING btree ("_path");
  CREATE INDEX "constructions_blk_links_items_order_idx" ON "constructions_blk_links_items" USING btree ("_order");
  CREATE INDEX "constructions_blk_links_items_parent_id_idx" ON "constructions_blk_links_items" USING btree ("_parent_id");
  CREATE INDEX "constructions_blk_links_order_idx" ON "constructions_blk_links" USING btree ("_order");
  CREATE INDEX "constructions_blk_links_parent_id_idx" ON "constructions_blk_links" USING btree ("_parent_id");
  CREATE INDEX "constructions_blk_links_path_idx" ON "constructions_blk_links" USING btree ("_path");
  CREATE INDEX "constructions_blk_contacts_order_idx" ON "constructions_blk_contacts" USING btree ("_order");
  CREATE INDEX "constructions_blk_contacts_parent_id_idx" ON "constructions_blk_contacts" USING btree ("_parent_id");
  CREATE INDEX "constructions_blk_contacts_path_idx" ON "constructions_blk_contacts" USING btree ("_path");
  CREATE INDEX "constructions_blk_requisites_order_idx" ON "constructions_blk_requisites" USING btree ("_order");
  CREATE INDEX "constructions_blk_requisites_parent_id_idx" ON "constructions_blk_requisites" USING btree ("_parent_id");
  CREATE INDEX "constructions_blk_requisites_path_idx" ON "constructions_blk_requisites" USING btree ("_path");
  CREATE INDEX "constructions_blk_team_order_idx" ON "constructions_blk_team" USING btree ("_order");
  CREATE INDEX "constructions_blk_team_parent_id_idx" ON "constructions_blk_team" USING btree ("_parent_id");
  CREATE INDEX "constructions_blk_team_path_idx" ON "constructions_blk_team" USING btree ("_path");
  CREATE INDEX "constructions_blk_quiz_cta_order_idx" ON "constructions_blk_quiz_cta" USING btree ("_order");
  CREATE INDEX "constructions_blk_quiz_cta_parent_id_idx" ON "constructions_blk_quiz_cta" USING btree ("_parent_id");
  CREATE INDEX "constructions_blk_quiz_cta_path_idx" ON "constructions_blk_quiz_cta" USING btree ("_path");
  CREATE INDEX "constructions_legacy_urls_order_idx" ON "constructions_legacy_urls" USING btree ("_order");
  CREATE INDEX "constructions_legacy_urls_parent_id_idx" ON "constructions_legacy_urls" USING btree ("_parent_id");
  CREATE INDEX "constructions_parent_idx" ON "constructions" USING btree ("parent_id");
  CREATE UNIQUE INDEX "constructions_slug_idx" ON "constructions" USING btree ("slug");
  CREATE UNIQUE INDEX "constructions_path_idx" ON "constructions" USING btree ("path");
  CREATE INDEX "constructions_product_tag_idx" ON "constructions" USING btree ("product_tag_id");
  CREATE INDEX "constructions_card_card_image_idx" ON "constructions" USING btree ("card_image_id");
  CREATE INDEX "constructions_hero_image_idx" ON "constructions" USING btree ("hero_image_id");
  CREATE INDEX "constructions_seo_seo_og_image_idx" ON "constructions" USING btree ("seo_og_image_id");
  CREATE INDEX "constructions_updated_at_idx" ON "constructions" USING btree ("updated_at");
  CREATE INDEX "constructions_created_at_idx" ON "constructions" USING btree ("created_at");
  CREATE INDEX "constructions__status_idx" ON "constructions" USING btree ("_status");
  CREATE INDEX "constructions_rels_order_idx" ON "constructions_rels" USING btree ("order");
  CREATE INDEX "constructions_rels_parent_idx" ON "constructions_rels" USING btree ("parent_id");
  CREATE INDEX "constructions_rels_path_idx" ON "constructions_rels" USING btree ("path");
  CREATE INDEX "constructions_rels_pages_id_idx" ON "constructions_rels" USING btree ("pages_id");
  CREATE INDEX "constructions_rels_glass_types_id_idx" ON "constructions_rels" USING btree ("glass_types_id");
  CREATE INDEX "constructions_rels_thicknesses_id_idx" ON "constructions_rels" USING btree ("thicknesses_id");
  CREATE INDEX "constructions_rels_processing_services_id_idx" ON "constructions_rels" USING btree ("processing_services_id");
  CREATE INDEX "constructions_rels_constructions_id_idx" ON "constructions_rels" USING btree ("constructions_id");
  CREATE INDEX "constructions_rels_articles_id_idx" ON "constructions_rels" USING btree ("articles_id");
  CREATE INDEX "constructions_rels_objects_id_idx" ON "constructions_rels" USING btree ("objects_id");
  CREATE INDEX "_constructions_v_version_systems_order_idx" ON "_constructions_v_version_systems" USING btree ("_order");
  CREATE INDEX "_constructions_v_version_systems_parent_id_idx" ON "_constructions_v_version_systems" USING btree ("_parent_id");
  CREATE INDEX "_constructions_v_version_systems_image_idx" ON "_constructions_v_version_systems" USING btree ("image_id");
  CREATE INDEX "_constructions_v_version_profile_systems_order_idx" ON "_constructions_v_version_profile_systems" USING btree ("_order");
  CREATE INDEX "_constructions_v_version_profile_systems_parent_id_idx" ON "_constructions_v_version_profile_systems" USING btree ("_parent_id");
  CREATE INDEX "_constructions_v_version_glass_bullets_order_idx" ON "_constructions_v_version_glass_bullets" USING btree ("_order");
  CREATE INDEX "_constructions_v_version_glass_bullets_parent_id_idx" ON "_constructions_v_version_glass_bullets" USING btree ("_parent_id");
  CREATE INDEX "_constructions_tables_cols_v_order_idx" ON "_constructions_tables_cols_v" USING btree ("_order");
  CREATE INDEX "_constructions_tables_cols_v_parent_id_idx" ON "_constructions_tables_cols_v" USING btree ("_parent_id");
  CREATE INDEX "_constructions_tables_rows_cells_v_order_idx" ON "_constructions_tables_rows_cells_v" USING btree ("_order");
  CREATE INDEX "_constructions_tables_rows_cells_v_parent_id_idx" ON "_constructions_tables_rows_cells_v" USING btree ("_parent_id");
  CREATE INDEX "_constructions_tables_rows_v_order_idx" ON "_constructions_tables_rows_v" USING btree ("_order");
  CREATE INDEX "_constructions_tables_rows_v_parent_id_idx" ON "_constructions_tables_rows_v" USING btree ("_parent_id");
  CREATE INDEX "_constructions_v_version_tables_order_idx" ON "_constructions_v_version_tables" USING btree ("_order");
  CREATE INDEX "_constructions_v_version_tables_parent_id_idx" ON "_constructions_v_version_tables" USING btree ("_parent_id");
  CREATE INDEX "_constructions_who_does_what_wdw_left_v_order_idx" ON "_constructions_who_does_what_wdw_left_v" USING btree ("_order");
  CREATE INDEX "_constructions_who_does_what_wdw_left_v_parent_id_idx" ON "_constructions_who_does_what_wdw_left_v" USING btree ("_parent_id");
  CREATE INDEX "_constructions_who_does_what_wdw_right_v_order_idx" ON "_constructions_who_does_what_wdw_right_v" USING btree ("_order");
  CREATE INDEX "_constructions_who_does_what_wdw_right_v_parent_id_idx" ON "_constructions_who_does_what_wdw_right_v" USING btree ("_parent_id");
  CREATE INDEX "_constructions_v_version_faq_order_idx" ON "_constructions_v_version_faq" USING btree ("_order");
  CREATE INDEX "_constructions_v_version_faq_parent_id_idx" ON "_constructions_v_version_faq" USING btree ("_parent_id");
  CREATE INDEX "_constructions_blk_hero_v_eyebrow_order_idx" ON "_constructions_blk_hero_v_eyebrow" USING btree ("_order");
  CREATE INDEX "_constructions_blk_hero_v_eyebrow_parent_id_idx" ON "_constructions_blk_hero_v_eyebrow" USING btree ("_parent_id");
  CREATE INDEX "_constructions_blk_hero_v_buttons_order_idx" ON "_constructions_blk_hero_v_buttons" USING btree ("_order");
  CREATE INDEX "_constructions_blk_hero_v_buttons_parent_id_idx" ON "_constructions_blk_hero_v_buttons" USING btree ("_parent_id");
  CREATE INDEX "_constructions_blk_hero_v_buttons_file_idx" ON "_constructions_blk_hero_v_buttons" USING btree ("file_id");
  CREATE INDEX "_constructions_blk_hero_v_photos_order_idx" ON "_constructions_blk_hero_v_photos" USING btree ("_order");
  CREATE INDEX "_constructions_blk_hero_v_photos_parent_id_idx" ON "_constructions_blk_hero_v_photos" USING btree ("_parent_id");
  CREATE INDEX "_constructions_blk_hero_v_photos_image_idx" ON "_constructions_blk_hero_v_photos" USING btree ("image_id");
  CREATE INDEX "_constructions_blk_hero_v_stats_order_idx" ON "_constructions_blk_hero_v_stats" USING btree ("_order");
  CREATE INDEX "_constructions_blk_hero_v_stats_parent_id_idx" ON "_constructions_blk_hero_v_stats" USING btree ("_parent_id");
  CREATE INDEX "_constructions_blk_hero_v_order_idx" ON "_constructions_blk_hero_v" USING btree ("_order");
  CREATE INDEX "_constructions_blk_hero_v_parent_id_idx" ON "_constructions_blk_hero_v" USING btree ("_parent_id");
  CREATE INDEX "_constructions_blk_hero_v_path_idx" ON "_constructions_blk_hero_v" USING btree ("_path");
  CREATE INDEX "_constructions_blk_hero_v_image_idx" ON "_constructions_blk_hero_v" USING btree ("image_id");
  CREATE INDEX "_constructions_blk_text_v_order_idx" ON "_constructions_blk_text_v" USING btree ("_order");
  CREATE INDEX "_constructions_blk_text_v_parent_id_idx" ON "_constructions_blk_text_v" USING btree ("_parent_id");
  CREATE INDEX "_constructions_blk_text_v_path_idx" ON "_constructions_blk_text_v" USING btree ("_path");
  CREATE INDEX "_constructions_blk_table_table_cols_v_order_idx" ON "_constructions_blk_table_table_cols_v" USING btree ("_order");
  CREATE INDEX "_constructions_blk_table_table_cols_v_parent_id_idx" ON "_constructions_blk_table_table_cols_v" USING btree ("_parent_id");
  CREATE INDEX "_constructions_blk_table_table_rows_cells_v_order_idx" ON "_constructions_blk_table_table_rows_cells_v" USING btree ("_order");
  CREATE INDEX "_constructions_blk_table_table_rows_cells_v_parent_id_idx" ON "_constructions_blk_table_table_rows_cells_v" USING btree ("_parent_id");
  CREATE INDEX "_constructions_blk_table_table_rows_v_order_idx" ON "_constructions_blk_table_table_rows_v" USING btree ("_order");
  CREATE INDEX "_constructions_blk_table_table_rows_v_parent_id_idx" ON "_constructions_blk_table_table_rows_v" USING btree ("_parent_id");
  CREATE INDEX "_constructions_blk_table_v_order_idx" ON "_constructions_blk_table_v" USING btree ("_order");
  CREATE INDEX "_constructions_blk_table_v_parent_id_idx" ON "_constructions_blk_table_v" USING btree ("_parent_id");
  CREATE INDEX "_constructions_blk_table_v_path_idx" ON "_constructions_blk_table_v" USING btree ("_path");
  CREATE INDEX "_constructions_blk_steps_v_items_order_idx" ON "_constructions_blk_steps_v_items" USING btree ("_order");
  CREATE INDEX "_constructions_blk_steps_v_items_parent_id_idx" ON "_constructions_blk_steps_v_items" USING btree ("_parent_id");
  CREATE INDEX "_constructions_blk_steps_v_buttons_order_idx" ON "_constructions_blk_steps_v_buttons" USING btree ("_order");
  CREATE INDEX "_constructions_blk_steps_v_buttons_parent_id_idx" ON "_constructions_blk_steps_v_buttons" USING btree ("_parent_id");
  CREATE INDEX "_constructions_blk_steps_v_buttons_file_idx" ON "_constructions_blk_steps_v_buttons" USING btree ("file_id");
  CREATE INDEX "_constructions_blk_steps_v_order_idx" ON "_constructions_blk_steps_v" USING btree ("_order");
  CREATE INDEX "_constructions_blk_steps_v_parent_id_idx" ON "_constructions_blk_steps_v" USING btree ("_parent_id");
  CREATE INDEX "_constructions_blk_steps_v_path_idx" ON "_constructions_blk_steps_v" USING btree ("_path");
  CREATE INDEX "_constructions_blk_callout_v_items_order_idx" ON "_constructions_blk_callout_v_items" USING btree ("_order");
  CREATE INDEX "_constructions_blk_callout_v_items_parent_id_idx" ON "_constructions_blk_callout_v_items" USING btree ("_parent_id");
  CREATE INDEX "_constructions_blk_callout_v_order_idx" ON "_constructions_blk_callout_v" USING btree ("_order");
  CREATE INDEX "_constructions_blk_callout_v_parent_id_idx" ON "_constructions_blk_callout_v" USING btree ("_parent_id");
  CREATE INDEX "_constructions_blk_callout_v_path_idx" ON "_constructions_blk_callout_v" USING btree ("_path");
  CREATE INDEX "_constructions_blk_terms_v_items_order_idx" ON "_constructions_blk_terms_v_items" USING btree ("_order");
  CREATE INDEX "_constructions_blk_terms_v_items_parent_id_idx" ON "_constructions_blk_terms_v_items" USING btree ("_parent_id");
  CREATE INDEX "_constructions_blk_terms_v_order_idx" ON "_constructions_blk_terms_v" USING btree ("_order");
  CREATE INDEX "_constructions_blk_terms_v_parent_id_idx" ON "_constructions_blk_terms_v" USING btree ("_parent_id");
  CREATE INDEX "_constructions_blk_terms_v_path_idx" ON "_constructions_blk_terms_v" USING btree ("_path");
  CREATE INDEX "_constructions_blk_cards_v_items_order_idx" ON "_constructions_blk_cards_v_items" USING btree ("_order");
  CREATE INDEX "_constructions_blk_cards_v_items_parent_id_idx" ON "_constructions_blk_cards_v_items" USING btree ("_parent_id");
  CREATE INDEX "_constructions_blk_cards_v_items_image_idx" ON "_constructions_blk_cards_v_items" USING btree ("image_id");
  CREATE INDEX "_constructions_blk_cards_v_order_idx" ON "_constructions_blk_cards_v" USING btree ("_order");
  CREATE INDEX "_constructions_blk_cards_v_parent_id_idx" ON "_constructions_blk_cards_v" USING btree ("_parent_id");
  CREATE INDEX "_constructions_blk_cards_v_path_idx" ON "_constructions_blk_cards_v" USING btree ("_path");
  CREATE INDEX "_constructions_blk_coll_cards_v_order_idx" ON "_constructions_blk_coll_cards_v" USING btree ("_order");
  CREATE INDEX "_constructions_blk_coll_cards_v_parent_id_idx" ON "_constructions_blk_coll_cards_v" USING btree ("_parent_id");
  CREATE INDEX "_constructions_blk_coll_cards_v_path_idx" ON "_constructions_blk_coll_cards_v" USING btree ("_path");
  CREATE INDEX "_constructions_blk_prices_v_order_idx" ON "_constructions_blk_prices_v" USING btree ("_order");
  CREATE INDEX "_constructions_blk_prices_v_parent_id_idx" ON "_constructions_blk_prices_v" USING btree ("_parent_id");
  CREATE INDEX "_constructions_blk_prices_v_path_idx" ON "_constructions_blk_prices_v" USING btree ("_path");
  CREATE INDEX "_constructions_blk_faq_v_items_order_idx" ON "_constructions_blk_faq_v_items" USING btree ("_order");
  CREATE INDEX "_constructions_blk_faq_v_items_parent_id_idx" ON "_constructions_blk_faq_v_items" USING btree ("_parent_id");
  CREATE INDEX "_constructions_blk_faq_v_order_idx" ON "_constructions_blk_faq_v" USING btree ("_order");
  CREATE INDEX "_constructions_blk_faq_v_parent_id_idx" ON "_constructions_blk_faq_v" USING btree ("_parent_id");
  CREATE INDEX "_constructions_blk_faq_v_path_idx" ON "_constructions_blk_faq_v" USING btree ("_path");
  CREATE INDEX "_constructions_blk_cta_v_buttons_order_idx" ON "_constructions_blk_cta_v_buttons" USING btree ("_order");
  CREATE INDEX "_constructions_blk_cta_v_buttons_parent_id_idx" ON "_constructions_blk_cta_v_buttons" USING btree ("_parent_id");
  CREATE INDEX "_constructions_blk_cta_v_buttons_file_idx" ON "_constructions_blk_cta_v_buttons" USING btree ("file_id");
  CREATE INDEX "_constructions_blk_cta_v_order_idx" ON "_constructions_blk_cta_v" USING btree ("_order");
  CREATE INDEX "_constructions_blk_cta_v_parent_id_idx" ON "_constructions_blk_cta_v" USING btree ("_parent_id");
  CREATE INDEX "_constructions_blk_cta_v_path_idx" ON "_constructions_blk_cta_v" USING btree ("_path");
  CREATE INDEX "_constructions_blk_compare_v_rows_order_idx" ON "_constructions_blk_compare_v_rows" USING btree ("_order");
  CREATE INDEX "_constructions_blk_compare_v_rows_parent_id_idx" ON "_constructions_blk_compare_v_rows" USING btree ("_parent_id");
  CREATE INDEX "_constructions_blk_compare_v_order_idx" ON "_constructions_blk_compare_v" USING btree ("_order");
  CREATE INDEX "_constructions_blk_compare_v_parent_id_idx" ON "_constructions_blk_compare_v" USING btree ("_parent_id");
  CREATE INDEX "_constructions_blk_compare_v_path_idx" ON "_constructions_blk_compare_v" USING btree ("_path");
  CREATE INDEX "_constructions_blk_download_v_items_order_idx" ON "_constructions_blk_download_v_items" USING btree ("_order");
  CREATE INDEX "_constructions_blk_download_v_items_parent_id_idx" ON "_constructions_blk_download_v_items" USING btree ("_parent_id");
  CREATE INDEX "_constructions_blk_download_v_items_file_idx" ON "_constructions_blk_download_v_items" USING btree ("file_id");
  CREATE INDEX "_constructions_blk_download_v_order_idx" ON "_constructions_blk_download_v" USING btree ("_order");
  CREATE INDEX "_constructions_blk_download_v_parent_id_idx" ON "_constructions_blk_download_v" USING btree ("_parent_id");
  CREATE INDEX "_constructions_blk_download_v_path_idx" ON "_constructions_blk_download_v" USING btree ("_path");
  CREATE INDEX "_constructions_blk_holes_v_order_idx" ON "_constructions_blk_holes_v" USING btree ("_order");
  CREATE INDEX "_constructions_blk_holes_v_parent_id_idx" ON "_constructions_blk_holes_v" USING btree ("_parent_id");
  CREATE INDEX "_constructions_blk_holes_v_path_idx" ON "_constructions_blk_holes_v" USING btree ("_path");
  CREATE INDEX "_constructions_blk_weight_v_order_idx" ON "_constructions_blk_weight_v" USING btree ("_order");
  CREATE INDEX "_constructions_blk_weight_v_parent_id_idx" ON "_constructions_blk_weight_v" USING btree ("_parent_id");
  CREATE INDEX "_constructions_blk_weight_v_path_idx" ON "_constructions_blk_weight_v" USING btree ("_path");
  CREATE INDEX "_constructions_blk_form_v_bullets_order_idx" ON "_constructions_blk_form_v_bullets" USING btree ("_order");
  CREATE INDEX "_constructions_blk_form_v_bullets_parent_id_idx" ON "_constructions_blk_form_v_bullets" USING btree ("_parent_id");
  CREATE INDEX "_constructions_blk_form_v_order_idx" ON "_constructions_blk_form_v" USING btree ("_order");
  CREATE INDEX "_constructions_blk_form_v_parent_id_idx" ON "_constructions_blk_form_v" USING btree ("_parent_id");
  CREATE INDEX "_constructions_blk_form_v_path_idx" ON "_constructions_blk_form_v" USING btree ("_path");
  CREATE INDEX "_constructions_blk_snippet_v_order_idx" ON "_constructions_blk_snippet_v" USING btree ("_order");
  CREATE INDEX "_constructions_blk_snippet_v_parent_id_idx" ON "_constructions_blk_snippet_v" USING btree ("_parent_id");
  CREATE INDEX "_constructions_blk_snippet_v_path_idx" ON "_constructions_blk_snippet_v" USING btree ("_path");
  CREATE INDEX "_constructions_blk_stats_v_items_order_idx" ON "_constructions_blk_stats_v_items" USING btree ("_order");
  CREATE INDEX "_constructions_blk_stats_v_items_parent_id_idx" ON "_constructions_blk_stats_v_items" USING btree ("_parent_id");
  CREATE INDEX "_constructions_blk_stats_v_order_idx" ON "_constructions_blk_stats_v" USING btree ("_order");
  CREATE INDEX "_constructions_blk_stats_v_parent_id_idx" ON "_constructions_blk_stats_v" USING btree ("_parent_id");
  CREATE INDEX "_constructions_blk_stats_v_path_idx" ON "_constructions_blk_stats_v" USING btree ("_path");
  CREATE INDEX "_constructions_blk_objects_v_order_idx" ON "_constructions_blk_objects_v" USING btree ("_order");
  CREATE INDEX "_constructions_blk_objects_v_parent_id_idx" ON "_constructions_blk_objects_v" USING btree ("_parent_id");
  CREATE INDEX "_constructions_blk_objects_v_path_idx" ON "_constructions_blk_objects_v" USING btree ("_path");
  CREATE INDEX "_constructions_blk_objects_v_product_idx" ON "_constructions_blk_objects_v" USING btree ("product_id");
  CREATE INDEX "_constructions_blk_articles_v_order_idx" ON "_constructions_blk_articles_v" USING btree ("_order");
  CREATE INDEX "_constructions_blk_articles_v_parent_id_idx" ON "_constructions_blk_articles_v" USING btree ("_parent_id");
  CREATE INDEX "_constructions_blk_articles_v_path_idx" ON "_constructions_blk_articles_v" USING btree ("_path");
  CREATE INDEX "_constructions_blk_wdw_left_v_order_idx" ON "_constructions_blk_wdw_left_v" USING btree ("_order");
  CREATE INDEX "_constructions_blk_wdw_left_v_parent_id_idx" ON "_constructions_blk_wdw_left_v" USING btree ("_parent_id");
  CREATE INDEX "_constructions_blk_wdw_right_v_order_idx" ON "_constructions_blk_wdw_right_v" USING btree ("_order");
  CREATE INDEX "_constructions_blk_wdw_right_v_parent_id_idx" ON "_constructions_blk_wdw_right_v" USING btree ("_parent_id");
  CREATE INDEX "_constructions_blk_wdw_v_order_idx" ON "_constructions_blk_wdw_v" USING btree ("_order");
  CREATE INDEX "_constructions_blk_wdw_v_parent_id_idx" ON "_constructions_blk_wdw_v" USING btree ("_parent_id");
  CREATE INDEX "_constructions_blk_wdw_v_path_idx" ON "_constructions_blk_wdw_v" USING btree ("_path");
  CREATE INDEX "_constructions_blk_systems_v_items_order_idx" ON "_constructions_blk_systems_v_items" USING btree ("_order");
  CREATE INDEX "_constructions_blk_systems_v_items_parent_id_idx" ON "_constructions_blk_systems_v_items" USING btree ("_parent_id");
  CREATE INDEX "_constructions_blk_systems_v_items_image_idx" ON "_constructions_blk_systems_v_items" USING btree ("image_id");
  CREATE INDEX "_constructions_blk_systems_v_order_idx" ON "_constructions_blk_systems_v" USING btree ("_order");
  CREATE INDEX "_constructions_blk_systems_v_parent_id_idx" ON "_constructions_blk_systems_v" USING btree ("_parent_id");
  CREATE INDEX "_constructions_blk_systems_v_path_idx" ON "_constructions_blk_systems_v" USING btree ("_path");
  CREATE INDEX "_constructions_blk_gallery_v_images_order_idx" ON "_constructions_blk_gallery_v_images" USING btree ("_order");
  CREATE INDEX "_constructions_blk_gallery_v_images_parent_id_idx" ON "_constructions_blk_gallery_v_images" USING btree ("_parent_id");
  CREATE INDEX "_constructions_blk_gallery_v_images_image_idx" ON "_constructions_blk_gallery_v_images" USING btree ("image_id");
  CREATE INDEX "_constructions_blk_gallery_v_order_idx" ON "_constructions_blk_gallery_v" USING btree ("_order");
  CREATE INDEX "_constructions_blk_gallery_v_parent_id_idx" ON "_constructions_blk_gallery_v" USING btree ("_parent_id");
  CREATE INDEX "_constructions_blk_gallery_v_path_idx" ON "_constructions_blk_gallery_v" USING btree ("_path");
  CREATE INDEX "_constructions_blk_two_cols_v_order_idx" ON "_constructions_blk_two_cols_v" USING btree ("_order");
  CREATE INDEX "_constructions_blk_two_cols_v_parent_id_idx" ON "_constructions_blk_two_cols_v" USING btree ("_parent_id");
  CREATE INDEX "_constructions_blk_two_cols_v_path_idx" ON "_constructions_blk_two_cols_v" USING btree ("_path");
  CREATE INDEX "_constructions_blk_links_v_items_order_idx" ON "_constructions_blk_links_v_items" USING btree ("_order");
  CREATE INDEX "_constructions_blk_links_v_items_parent_id_idx" ON "_constructions_blk_links_v_items" USING btree ("_parent_id");
  CREATE INDEX "_constructions_blk_links_v_order_idx" ON "_constructions_blk_links_v" USING btree ("_order");
  CREATE INDEX "_constructions_blk_links_v_parent_id_idx" ON "_constructions_blk_links_v" USING btree ("_parent_id");
  CREATE INDEX "_constructions_blk_links_v_path_idx" ON "_constructions_blk_links_v" USING btree ("_path");
  CREATE INDEX "_constructions_blk_contacts_v_order_idx" ON "_constructions_blk_contacts_v" USING btree ("_order");
  CREATE INDEX "_constructions_blk_contacts_v_parent_id_idx" ON "_constructions_blk_contacts_v" USING btree ("_parent_id");
  CREATE INDEX "_constructions_blk_contacts_v_path_idx" ON "_constructions_blk_contacts_v" USING btree ("_path");
  CREATE INDEX "_constructions_blk_requisites_v_order_idx" ON "_constructions_blk_requisites_v" USING btree ("_order");
  CREATE INDEX "_constructions_blk_requisites_v_parent_id_idx" ON "_constructions_blk_requisites_v" USING btree ("_parent_id");
  CREATE INDEX "_constructions_blk_requisites_v_path_idx" ON "_constructions_blk_requisites_v" USING btree ("_path");
  CREATE INDEX "_constructions_blk_team_v_order_idx" ON "_constructions_blk_team_v" USING btree ("_order");
  CREATE INDEX "_constructions_blk_team_v_parent_id_idx" ON "_constructions_blk_team_v" USING btree ("_parent_id");
  CREATE INDEX "_constructions_blk_team_v_path_idx" ON "_constructions_blk_team_v" USING btree ("_path");
  CREATE INDEX "_constructions_blk_quiz_cta_v_order_idx" ON "_constructions_blk_quiz_cta_v" USING btree ("_order");
  CREATE INDEX "_constructions_blk_quiz_cta_v_parent_id_idx" ON "_constructions_blk_quiz_cta_v" USING btree ("_parent_id");
  CREATE INDEX "_constructions_blk_quiz_cta_v_path_idx" ON "_constructions_blk_quiz_cta_v" USING btree ("_path");
  CREATE INDEX "_constructions_v_version_legacy_urls_order_idx" ON "_constructions_v_version_legacy_urls" USING btree ("_order");
  CREATE INDEX "_constructions_v_version_legacy_urls_parent_id_idx" ON "_constructions_v_version_legacy_urls" USING btree ("_parent_id");
  CREATE INDEX "_constructions_v_parent_idx" ON "_constructions_v" USING btree ("parent_id");
  CREATE INDEX "_constructions_v_version_version_parent_idx" ON "_constructions_v" USING btree ("version_parent_id");
  CREATE INDEX "_constructions_v_version_version_slug_idx" ON "_constructions_v" USING btree ("version_slug");
  CREATE INDEX "_constructions_v_version_version_path_idx" ON "_constructions_v" USING btree ("version_path");
  CREATE INDEX "_constructions_v_version_version_product_tag_idx" ON "_constructions_v" USING btree ("version_product_tag_id");
  CREATE INDEX "_constructions_v_version_card_version_card_image_idx" ON "_constructions_v" USING btree ("version_card_image_id");
  CREATE INDEX "_constructions_v_version_version_hero_image_idx" ON "_constructions_v" USING btree ("version_hero_image_id");
  CREATE INDEX "_constructions_v_version_seo_version_seo_og_image_idx" ON "_constructions_v" USING btree ("version_seo_og_image_id");
  CREATE INDEX "_constructions_v_version_version_updated_at_idx" ON "_constructions_v" USING btree ("version_updated_at");
  CREATE INDEX "_constructions_v_version_version_created_at_idx" ON "_constructions_v" USING btree ("version_created_at");
  CREATE INDEX "_constructions_v_version_version__status_idx" ON "_constructions_v" USING btree ("version__status");
  CREATE INDEX "_constructions_v_created_at_idx" ON "_constructions_v" USING btree ("created_at");
  CREATE INDEX "_constructions_v_updated_at_idx" ON "_constructions_v" USING btree ("updated_at");
  CREATE INDEX "_constructions_v_latest_idx" ON "_constructions_v" USING btree ("latest");
  CREATE INDEX "_constructions_v_rels_order_idx" ON "_constructions_v_rels" USING btree ("order");
  CREATE INDEX "_constructions_v_rels_parent_idx" ON "_constructions_v_rels" USING btree ("parent_id");
  CREATE INDEX "_constructions_v_rels_path_idx" ON "_constructions_v_rels" USING btree ("path");
  CREATE INDEX "_constructions_v_rels_pages_id_idx" ON "_constructions_v_rels" USING btree ("pages_id");
  CREATE INDEX "_constructions_v_rels_glass_types_id_idx" ON "_constructions_v_rels" USING btree ("glass_types_id");
  CREATE INDEX "_constructions_v_rels_thicknesses_id_idx" ON "_constructions_v_rels" USING btree ("thicknesses_id");
  CREATE INDEX "_constructions_v_rels_processing_services_id_idx" ON "_constructions_v_rels" USING btree ("processing_services_id");
  CREATE INDEX "_constructions_v_rels_constructions_id_idx" ON "_constructions_v_rels" USING btree ("constructions_id");
  CREATE INDEX "_constructions_v_rels_articles_id_idx" ON "_constructions_v_rels" USING btree ("articles_id");
  CREATE INDEX "_constructions_v_rels_objects_id_idx" ON "_constructions_v_rels" USING btree ("objects_id");
  CREATE INDEX "shower_configs_glass_thicknesses_order_idx" ON "shower_configs_glass_thicknesses" USING btree ("order");
  CREATE INDEX "shower_configs_glass_thicknesses_parent_idx" ON "shower_configs_glass_thicknesses" USING btree ("parent_id");
  CREATE INDEX "shower_configs_gallery_order_idx" ON "shower_configs_gallery" USING btree ("_order");
  CREATE INDEX "shower_configs_gallery_parent_id_idx" ON "shower_configs_gallery" USING btree ("_parent_id");
  CREATE INDEX "shower_configs_gallery_image_idx" ON "shower_configs_gallery" USING btree ("image_id");
  CREATE UNIQUE INDEX "shower_configs_slug_idx" ON "shower_configs" USING btree ("slug");
  CREATE INDEX "shower_configs_construction_idx" ON "shower_configs" USING btree ("construction_id");
  CREATE INDEX "shower_configs_image_idx" ON "shower_configs" USING btree ("image_id");
  CREATE INDEX "shower_configs_legacy_id_idx" ON "shower_configs" USING btree ("legacy_id");
  CREATE INDEX "shower_configs_updated_at_idx" ON "shower_configs" USING btree ("updated_at");
  CREATE INDEX "shower_configs_created_at_idx" ON "shower_configs" USING btree ("created_at");
  CREATE INDEX "shower_configs__status_idx" ON "shower_configs" USING btree ("_status");
  CREATE INDEX "_shower_configs_v_version_glass_thicknesses_order_idx" ON "_shower_configs_v_version_glass_thicknesses" USING btree ("order");
  CREATE INDEX "_shower_configs_v_version_glass_thicknesses_parent_idx" ON "_shower_configs_v_version_glass_thicknesses" USING btree ("parent_id");
  CREATE INDEX "_shower_configs_v_version_gallery_order_idx" ON "_shower_configs_v_version_gallery" USING btree ("_order");
  CREATE INDEX "_shower_configs_v_version_gallery_parent_id_idx" ON "_shower_configs_v_version_gallery" USING btree ("_parent_id");
  CREATE INDEX "_shower_configs_v_version_gallery_image_idx" ON "_shower_configs_v_version_gallery" USING btree ("image_id");
  CREATE INDEX "_shower_configs_v_parent_idx" ON "_shower_configs_v" USING btree ("parent_id");
  CREATE INDEX "_shower_configs_v_version_version_slug_idx" ON "_shower_configs_v" USING btree ("version_slug");
  CREATE INDEX "_shower_configs_v_version_version_construction_idx" ON "_shower_configs_v" USING btree ("version_construction_id");
  CREATE INDEX "_shower_configs_v_version_version_image_idx" ON "_shower_configs_v" USING btree ("version_image_id");
  CREATE INDEX "_shower_configs_v_version_version_legacy_id_idx" ON "_shower_configs_v" USING btree ("version_legacy_id");
  CREATE INDEX "_shower_configs_v_version_version_updated_at_idx" ON "_shower_configs_v" USING btree ("version_updated_at");
  CREATE INDEX "_shower_configs_v_version_version_created_at_idx" ON "_shower_configs_v" USING btree ("version_created_at");
  CREATE INDEX "_shower_configs_v_version_version__status_idx" ON "_shower_configs_v" USING btree ("version__status");
  CREATE INDEX "_shower_configs_v_created_at_idx" ON "_shower_configs_v" USING btree ("created_at");
  CREATE INDEX "_shower_configs_v_updated_at_idx" ON "_shower_configs_v" USING btree ("updated_at");
  CREATE INDEX "_shower_configs_v_latest_idx" ON "_shower_configs_v" USING btree ("latest");
  CREATE UNIQUE INDEX "products_slug_idx" ON "products" USING btree ("slug");
  CREATE INDEX "products_construction_idx" ON "products" USING btree ("construction_id");
  CREATE INDEX "products_updated_at_idx" ON "products" USING btree ("updated_at");
  CREATE INDEX "products_created_at_idx" ON "products" USING btree ("created_at");
  CREATE UNIQUE INDEX "object_types_slug_idx" ON "object_types" USING btree ("slug");
  CREATE INDEX "object_types_updated_at_idx" ON "object_types" USING btree ("updated_at");
  CREATE INDEX "object_types_created_at_idx" ON "object_types" USING btree ("created_at");
  CREATE UNIQUE INDEX "cities_slug_idx" ON "cities" USING btree ("slug");
  CREATE INDEX "cities_updated_at_idx" ON "cities" USING btree ("updated_at");
  CREATE INDEX "cities_created_at_idx" ON "cities" USING btree ("created_at");
  CREATE INDEX "lead_files_lead_idx" ON "lead_files" USING btree ("lead_id");
  CREATE INDEX "lead_files_updated_at_idx" ON "lead_files" USING btree ("updated_at");
  CREATE INDEX "lead_files_created_at_idx" ON "lead_files" USING btree ("created_at");
  CREATE UNIQUE INDEX "lead_files_filename_idx" ON "lead_files" USING btree ("filename");
  CREATE UNIQUE INDEX "lead_statuses_slug_idx" ON "lead_statuses" USING btree ("slug");
  CREATE INDEX "lead_statuses_updated_at_idx" ON "lead_statuses" USING btree ("updated_at");
  CREATE INDEX "lead_statuses_created_at_idx" ON "lead_statuses" USING btree ("created_at");
  CREATE INDEX "leads_flags_order_idx" ON "leads_flags" USING btree ("order");
  CREATE INDEX "leads_flags_parent_idx" ON "leads_flags" USING btree ("parent_id");
  CREATE INDEX "leads_internal_comments_order_idx" ON "leads_internal_comments" USING btree ("_order");
  CREATE INDEX "leads_internal_comments_parent_id_idx" ON "leads_internal_comments" USING btree ("_parent_id");
  CREATE INDEX "leads_internal_comments_author_idx" ON "leads_internal_comments" USING btree ("author_id");
  CREATE INDEX "leads_form_type_idx" ON "leads" USING btree ("form_type");
  CREATE INDEX "leads_phone_idx" ON "leads" USING btree ("phone");
  CREATE INDEX "leads_email_idx" ON "leads" USING btree ("email");
  CREATE INDEX "leads_status_idx" ON "leads" USING btree ("status_id");
  CREATE INDEX "leads_assignee_idx" ON "leads" USING btree ("assignee_id");
  CREATE INDEX "leads_is_duplicate_idx" ON "leads" USING btree ("is_duplicate");
  CREATE INDEX "leads_duplicate_of_idx" ON "leads" USING btree ("duplicate_of_id");
  CREATE INDEX "leads_consent_idx" ON "leads" USING btree ("consent_id");
  CREATE INDEX "leads_updated_at_idx" ON "leads" USING btree ("updated_at");
  CREATE INDEX "leads_created_at_idx" ON "leads" USING btree ("created_at");
  CREATE INDEX "leads_rels_order_idx" ON "leads_rels" USING btree ("order");
  CREATE INDEX "leads_rels_parent_idx" ON "leads_rels" USING btree ("parent_id");
  CREATE INDEX "leads_rels_path_idx" ON "leads_rels" USING btree ("path");
  CREATE INDEX "leads_rels_lead_files_id_idx" ON "leads_rels" USING btree ("lead_files_id");
  CREATE INDEX "_leads_v_version_flags_order_idx" ON "_leads_v_version_flags" USING btree ("order");
  CREATE INDEX "_leads_v_version_flags_parent_idx" ON "_leads_v_version_flags" USING btree ("parent_id");
  CREATE INDEX "_leads_v_version_internal_comments_order_idx" ON "_leads_v_version_internal_comments" USING btree ("_order");
  CREATE INDEX "_leads_v_version_internal_comments_parent_id_idx" ON "_leads_v_version_internal_comments" USING btree ("_parent_id");
  CREATE INDEX "_leads_v_version_internal_comments_author_idx" ON "_leads_v_version_internal_comments" USING btree ("author_id");
  CREATE INDEX "_leads_v_parent_idx" ON "_leads_v" USING btree ("parent_id");
  CREATE INDEX "_leads_v_version_version_form_type_idx" ON "_leads_v" USING btree ("version_form_type");
  CREATE INDEX "_leads_v_version_version_phone_idx" ON "_leads_v" USING btree ("version_phone");
  CREATE INDEX "_leads_v_version_version_email_idx" ON "_leads_v" USING btree ("version_email");
  CREATE INDEX "_leads_v_version_version_status_idx" ON "_leads_v" USING btree ("version_status_id");
  CREATE INDEX "_leads_v_version_version_assignee_idx" ON "_leads_v" USING btree ("version_assignee_id");
  CREATE INDEX "_leads_v_version_version_is_duplicate_idx" ON "_leads_v" USING btree ("version_is_duplicate");
  CREATE INDEX "_leads_v_version_version_duplicate_of_idx" ON "_leads_v" USING btree ("version_duplicate_of_id");
  CREATE INDEX "_leads_v_version_version_consent_idx" ON "_leads_v" USING btree ("version_consent_id");
  CREATE INDEX "_leads_v_version_version_updated_at_idx" ON "_leads_v" USING btree ("version_updated_at");
  CREATE INDEX "_leads_v_version_version_created_at_idx" ON "_leads_v" USING btree ("version_created_at");
  CREATE INDEX "_leads_v_created_at_idx" ON "_leads_v" USING btree ("created_at");
  CREATE INDEX "_leads_v_updated_at_idx" ON "_leads_v" USING btree ("updated_at");
  CREATE INDEX "_leads_v_rels_order_idx" ON "_leads_v_rels" USING btree ("order");
  CREATE INDEX "_leads_v_rels_parent_idx" ON "_leads_v_rels" USING btree ("parent_id");
  CREATE INDEX "_leads_v_rels_path_idx" ON "_leads_v_rels" USING btree ("path");
  CREATE INDEX "_leads_v_rels_lead_files_id_idx" ON "_leads_v_rels" USING btree ("lead_files_id");
  CREATE INDEX "orders_status_history_order_idx" ON "orders_status_history" USING btree ("_order");
  CREATE INDEX "orders_status_history_parent_id_idx" ON "orders_status_history" USING btree ("_parent_id");
  CREATE INDEX "orders_pack_photos_order_idx" ON "orders_pack_photos" USING btree ("_order");
  CREATE INDEX "orders_pack_photos_parent_id_idx" ON "orders_pack_photos" USING btree ("_parent_id");
  CREATE INDEX "orders_pack_photos_photo_idx" ON "orders_pack_photos" USING btree ("photo_id");
  CREATE INDEX "orders_documents_order_idx" ON "orders_documents" USING btree ("_order");
  CREATE INDEX "orders_documents_parent_id_idx" ON "orders_documents" USING btree ("_parent_id");
  CREATE INDEX "orders_documents_file_idx" ON "orders_documents" USING btree ("file_id");
  CREATE UNIQUE INDEX "orders_number_idx" ON "orders" USING btree ("number");
  CREATE INDEX "orders_lead_idx" ON "orders" USING btree ("lead_id");
  CREATE INDEX "orders_manager_idx" ON "orders" USING btree ("manager_id");
  CREATE UNIQUE INDEX "orders_token_hash_idx" ON "orders" USING btree ("token_hash");
  CREATE INDEX "orders_updated_at_idx" ON "orders" USING btree ("updated_at");
  CREATE INDEX "orders_created_at_idx" ON "orders" USING btree ("created_at");
  CREATE INDEX "order_files_uploaded_by_idx" ON "order_files" USING btree ("uploaded_by_id");
  CREATE INDEX "order_files_updated_at_idx" ON "order_files" USING btree ("updated_at");
  CREATE INDEX "order_files_created_at_idx" ON "order_files" USING btree ("created_at");
  CREATE UNIQUE INDEX "order_files_filename_idx" ON "order_files" USING btree ("filename");
  CREATE INDEX "order_files_sizes_thumbnail_sizes_thumbnail_filename_idx" ON "order_files" USING btree ("sizes_thumbnail_filename");
  CREATE INDEX "order_files_sizes_preview_sizes_preview_filename_idx" ON "order_files" USING btree ("sizes_preview_filename");
  CREATE INDEX "consent_log_lead_idx" ON "consent_log" USING btree ("lead_id");
  CREATE INDEX "consent_log_phone_hash_idx" ON "consent_log" USING btree ("phone_hash");
  CREATE INDEX "consent_log_email_hash_idx" ON "consent_log" USING btree ("email_hash");
  CREATE INDEX "consent_log_updated_at_idx" ON "consent_log" USING btree ("updated_at");
  CREATE INDEX "consent_log_created_at_idx" ON "consent_log" USING btree ("created_at");
  CREATE UNIQUE INDEX "redirects_from_idx" ON "redirects" USING btree ("from");
  CREATE INDEX "redirects_updated_at_idx" ON "redirects" USING btree ("updated_at");
  CREATE INDEX "redirects_created_at_idx" ON "redirects" USING btree ("created_at");
  CREATE UNIQUE INDEX "rate_limits_key_idx" ON "rate_limits" USING btree ("key");
  CREATE INDEX "rate_limits_updated_at_idx" ON "rate_limits" USING btree ("updated_at");
  CREATE INDEX "rate_limits_created_at_idx" ON "rate_limits" USING btree ("created_at");
  CREATE INDEX "prices_rows_order_idx" ON "prices_rows" USING btree ("_order");
  CREATE INDEX "prices_rows_parent_id_idx" ON "prices_rows" USING btree ("_parent_id");
  CREATE INDEX "prices_included_order_idx" ON "prices_included" USING btree ("_order");
  CREATE INDEX "prices_included_parent_id_idx" ON "prices_included" USING btree ("_parent_id");
  CREATE INDEX "prices_extra_order_idx" ON "prices_extra" USING btree ("_order");
  CREATE INDEX "prices_extra_parent_id_idx" ON "prices_extra" USING btree ("_parent_id");
  CREATE INDEX "_prices_v_version_rows_order_idx" ON "_prices_v_version_rows" USING btree ("_order");
  CREATE INDEX "_prices_v_version_rows_parent_id_idx" ON "_prices_v_version_rows" USING btree ("_parent_id");
  CREATE INDEX "_prices_v_version_included_order_idx" ON "_prices_v_version_included" USING btree ("_order");
  CREATE INDEX "_prices_v_version_included_parent_id_idx" ON "_prices_v_version_included" USING btree ("_parent_id");
  CREATE INDEX "_prices_v_version_extra_order_idx" ON "_prices_v_version_extra" USING btree ("_order");
  CREATE INDEX "_prices_v_version_extra_parent_id_idx" ON "_prices_v_version_extra" USING btree ("_parent_id");
  CREATE INDEX "_prices_v_created_at_idx" ON "_prices_v" USING btree ("created_at");
  CREATE INDEX "_prices_v_updated_at_idx" ON "_prices_v" USING btree ("updated_at");
  CREATE INDEX "_promo_v_created_at_idx" ON "_promo_v" USING btree ("created_at");
  CREATE INDEX "_promo_v_updated_at_idx" ON "_promo_v" USING btree ("updated_at");
  CREATE INDEX "conditions_terms_bar_order_idx" ON "conditions_terms_bar" USING btree ("_order");
  CREATE INDEX "conditions_terms_bar_parent_id_idx" ON "conditions_terms_bar" USING btree ("_parent_id");
  CREATE INDEX "conditions_terms_bar_short_order_idx" ON "conditions_terms_bar_short" USING btree ("_order");
  CREATE INDEX "conditions_terms_bar_short_parent_id_idx" ON "conditions_terms_bar_short" USING btree ("_parent_id");
  CREATE INDEX "contacts_phones_order_idx" ON "contacts_phones" USING btree ("_order");
  CREATE INDEX "contacts_phones_parent_id_idx" ON "contacts_phones" USING btree ("_parent_id");
  CREATE INDEX "contacts_emails_order_idx" ON "contacts_emails" USING btree ("_order");
  CREATE INDEX "contacts_emails_parent_id_idx" ON "contacts_emails" USING btree ("_parent_id");
  CREATE INDEX "contacts_locations_phones_order_idx" ON "contacts_locations_phones" USING btree ("_order");
  CREATE INDEX "contacts_locations_phones_parent_id_idx" ON "contacts_locations_phones" USING btree ("_parent_id");
  CREATE INDEX "contacts_locations_order_idx" ON "contacts_locations" USING btree ("_order");
  CREATE INDEX "contacts_locations_parent_id_idx" ON "contacts_locations" USING btree ("_parent_id");
  CREATE INDEX "contacts_messengers_order_idx" ON "contacts_messengers" USING btree ("_order");
  CREATE INDEX "contacts_messengers_parent_id_idx" ON "contacts_messengers" USING btree ("_parent_id");
  CREATE INDEX "contacts_same_as_order_idx" ON "contacts_same_as" USING btree ("_order");
  CREATE INDEX "contacts_same_as_parent_id_idx" ON "contacts_same_as" USING btree ("_parent_id");
  CREATE INDEX "_contacts_v_version_phones_order_idx" ON "_contacts_v_version_phones" USING btree ("_order");
  CREATE INDEX "_contacts_v_version_phones_parent_id_idx" ON "_contacts_v_version_phones" USING btree ("_parent_id");
  CREATE INDEX "_contacts_v_version_emails_order_idx" ON "_contacts_v_version_emails" USING btree ("_order");
  CREATE INDEX "_contacts_v_version_emails_parent_id_idx" ON "_contacts_v_version_emails" USING btree ("_parent_id");
  CREATE INDEX "_contacts_v_version_locations_phones_order_idx" ON "_contacts_v_version_locations_phones" USING btree ("_order");
  CREATE INDEX "_contacts_v_version_locations_phones_parent_id_idx" ON "_contacts_v_version_locations_phones" USING btree ("_parent_id");
  CREATE INDEX "_contacts_v_version_locations_order_idx" ON "_contacts_v_version_locations" USING btree ("_order");
  CREATE INDEX "_contacts_v_version_locations_parent_id_idx" ON "_contacts_v_version_locations" USING btree ("_parent_id");
  CREATE INDEX "_contacts_v_version_messengers_order_idx" ON "_contacts_v_version_messengers" USING btree ("_order");
  CREATE INDEX "_contacts_v_version_messengers_parent_id_idx" ON "_contacts_v_version_messengers" USING btree ("_parent_id");
  CREATE INDEX "_contacts_v_version_same_as_order_idx" ON "_contacts_v_version_same_as" USING btree ("_order");
  CREATE INDEX "_contacts_v_version_same_as_parent_id_idx" ON "_contacts_v_version_same_as" USING btree ("_parent_id");
  CREATE INDEX "_contacts_v_created_at_idx" ON "_contacts_v" USING btree ("created_at");
  CREATE INDEX "_contacts_v_updated_at_idx" ON "_contacts_v" USING btree ("updated_at");
  CREATE INDEX "requisites_card_pdf_idx" ON "requisites" USING btree ("card_pdf_id");
  CREATE INDEX "_requisites_v_version_version_card_pdf_idx" ON "_requisites_v" USING btree ("version_card_pdf_id");
  CREATE INDEX "_requisites_v_created_at_idx" ON "_requisites_v" USING btree ("created_at");
  CREATE INDEX "_requisites_v_updated_at_idx" ON "_requisites_v" USING btree ("updated_at");
  CREATE INDEX "tech_params_bent_radius_order_idx" ON "tech_params_bent_radius" USING btree ("_order");
  CREATE INDEX "tech_params_bent_radius_parent_id_idx" ON "tech_params_bent_radius" USING btree ("_parent_id");
  CREATE INDEX "tech_params_tint_colors_order_idx" ON "tech_params_tint_colors" USING btree ("_order");
  CREATE INDEX "tech_params_tint_colors_parent_id_idx" ON "tech_params_tint_colors" USING btree ("_parent_id");
  CREATE INDEX "tech_params_holes_tolerance_ranges_order_idx" ON "tech_params_holes_tolerance_ranges" USING btree ("_order");
  CREATE INDEX "tech_params_holes_tolerance_ranges_parent_id_idx" ON "tech_params_holes_tolerance_ranges" USING btree ("_parent_id");
  CREATE INDEX "tech_params_carry_hints_order_idx" ON "tech_params_carry_hints" USING btree ("_order");
  CREATE INDEX "tech_params_carry_hints_parent_id_idx" ON "tech_params_carry_hints" USING btree ("_parent_id");
  CREATE INDEX "tech_params_gost_size_tolerance_order_idx" ON "tech_params_gost_size_tolerance" USING btree ("_order");
  CREATE INDEX "tech_params_gost_size_tolerance_parent_id_idx" ON "tech_params_gost_size_tolerance" USING btree ("_parent_id");
  CREATE INDEX "tech_params_gost_flatness_order_idx" ON "tech_params_gost_flatness" USING btree ("_order");
  CREATE INDEX "tech_params_gost_flatness_parent_id_idx" ON "tech_params_gost_flatness" USING btree ("_parent_id");
  CREATE INDEX "tech_params_delivery_cities_order_idx" ON "tech_params_delivery_cities" USING btree ("_order");
  CREATE INDEX "tech_params_delivery_cities_parent_id_idx" ON "tech_params_delivery_cities" USING btree ("_parent_id");
  CREATE INDEX "tech_params_quiz_options_product_types_order_idx" ON "tech_params_quiz_options_product_types" USING btree ("_order");
  CREATE INDEX "tech_params_quiz_options_product_types_parent_id_idx" ON "tech_params_quiz_options_product_types" USING btree ("_parent_id");
  CREATE INDEX "tech_params_quiz_options_kinds_order_idx" ON "tech_params_quiz_options_kinds" USING btree ("_order");
  CREATE INDEX "tech_params_quiz_options_kinds_parent_id_idx" ON "tech_params_quiz_options_kinds" USING btree ("_parent_id");
  CREATE INDEX "tech_params_quiz_options_edges_only_for_types_order_idx" ON "tech_params_quiz_options_edges_only_for_types" USING btree ("order");
  CREATE INDEX "tech_params_quiz_options_edges_only_for_types_parent_idx" ON "tech_params_quiz_options_edges_only_for_types" USING btree ("parent_id");
  CREATE INDEX "tech_params_quiz_options_edges_order_idx" ON "tech_params_quiz_options_edges" USING btree ("_order");
  CREATE INDEX "tech_params_quiz_options_edges_parent_id_idx" ON "tech_params_quiz_options_edges" USING btree ("_parent_id");
  CREATE INDEX "tech_params_quiz_options_decor_order_idx" ON "tech_params_quiz_options_decor" USING btree ("_order");
  CREATE INDEX "tech_params_quiz_options_decor_parent_id_idx" ON "tech_params_quiz_options_decor" USING btree ("_parent_id");
  CREATE INDEX "tech_params_quiz_options_stamp_order_idx" ON "tech_params_quiz_options_stamp" USING btree ("_order");
  CREATE INDEX "tech_params_quiz_options_stamp_parent_id_idx" ON "tech_params_quiz_options_stamp" USING btree ("_parent_id");
  CREATE INDEX "tech_params_quiz_options_packaging_order_idx" ON "tech_params_quiz_options_packaging" USING btree ("_order");
  CREATE INDEX "tech_params_quiz_options_packaging_parent_id_idx" ON "tech_params_quiz_options_packaging" USING btree ("_parent_id");
  CREATE INDEX "tech_params_quiz_options_roles_order_idx" ON "tech_params_quiz_options_roles" USING btree ("_order");
  CREATE INDEX "tech_params_quiz_options_roles_parent_id_idx" ON "tech_params_quiz_options_roles" USING btree ("_parent_id");
  CREATE INDEX "tech_params_numbers_order_parent_idx" ON "tech_params_numbers" USING btree ("order","parent_id");
  CREATE INDEX "site_settings_holidays_order_idx" ON "site_settings_holidays" USING btree ("_order");
  CREATE INDEX "site_settings_holidays_parent_id_idx" ON "site_settings_holidays" USING btree ("_parent_id");
  CREATE INDEX "site_settings_stop_words_order_idx" ON "site_settings_stop_words" USING btree ("_order");
  CREATE INDEX "site_settings_stop_words_parent_id_idx" ON "site_settings_stop_words" USING btree ("_parent_id");
  CREATE INDEX "site_settings_lead_emails_order_idx" ON "site_settings_lead_emails" USING btree ("_order");
  CREATE INDEX "site_settings_lead_emails_parent_id_idx" ON "site_settings_lead_emails" USING btree ("_parent_id");
  CREATE INDEX "site_settings_order_statuses_order_idx" ON "site_settings_order_statuses" USING btree ("_order");
  CREATE INDEX "site_settings_order_statuses_parent_id_idx" ON "site_settings_order_statuses" USING btree ("_parent_id");
  CREATE INDEX "site_settings_branding_branding_logo_dark_idx" ON "site_settings" USING btree ("branding_logo_dark_id");
  CREATE INDEX "site_settings_branding_branding_logo_light_idx" ON "site_settings" USING btree ("branding_logo_light_id");
  CREATE INDEX "site_settings_branding_branding_logo_png_idx" ON "site_settings" USING btree ("branding_logo_png_id");
  CREATE INDEX "site_settings_branding_branding_favicon_idx" ON "site_settings" USING btree ("branding_favicon_id");
  CREATE INDEX "site_settings_branding_branding_default_og_image_idx" ON "site_settings" USING btree ("branding_default_og_image_id");
  CREATE INDEX "navigation_top_bar_company_items_order_idx" ON "navigation_top_bar_company_items" USING btree ("_order");
  CREATE INDEX "navigation_top_bar_company_items_parent_id_idx" ON "navigation_top_bar_company_items" USING btree ("_parent_id");
  CREATE INDEX "navigation_top_bar_segments_order_idx" ON "navigation_top_bar_segments" USING btree ("_order");
  CREATE INDEX "navigation_top_bar_segments_parent_id_idx" ON "navigation_top_bar_segments" USING btree ("_parent_id");
  CREATE INDEX "navigation_main_row_pills_order_idx" ON "navigation_main_row_pills" USING btree ("_order");
  CREATE INDEX "navigation_main_row_pills_parent_id_idx" ON "navigation_main_row_pills" USING btree ("_parent_id");
  CREATE INDEX "navigation_main_row_links_order_idx" ON "navigation_main_row_links" USING btree ("_order");
  CREATE INDEX "navigation_main_row_links_parent_id_idx" ON "navigation_main_row_links" USING btree ("_parent_id");
  CREATE INDEX "navigation_section_row_items_order_idx" ON "navigation_section_row_items" USING btree ("_order");
  CREATE INDEX "navigation_section_row_items_parent_id_idx" ON "navigation_section_row_items" USING btree ("_parent_id");
  CREATE INDEX "nav_mega_columns_links_sub_links_order_idx" ON "nav_mega_columns_links_sub_links" USING btree ("_order");
  CREATE INDEX "nav_mega_columns_links_sub_links_parent_id_idx" ON "nav_mega_columns_links_sub_links" USING btree ("_parent_id");
  CREATE INDEX "nav_mega_columns_links_order_idx" ON "nav_mega_columns_links" USING btree ("_order");
  CREATE INDEX "nav_mega_columns_links_parent_id_idx" ON "nav_mega_columns_links" USING btree ("_parent_id");
  CREATE INDEX "nav_mega_columns_order_idx" ON "nav_mega_columns" USING btree ("_order");
  CREATE INDEX "nav_mega_columns_parent_id_idx" ON "nav_mega_columns" USING btree ("_parent_id");
  CREATE INDEX "nav_mega_order_idx" ON "nav_mega" USING btree ("_order");
  CREATE INDEX "nav_mega_parent_id_idx" ON "nav_mega" USING btree ("_parent_id");
  CREATE INDEX "navigation_footer_columns_links_order_idx" ON "navigation_footer_columns_links" USING btree ("_order");
  CREATE INDEX "navigation_footer_columns_links_parent_id_idx" ON "navigation_footer_columns_links" USING btree ("_parent_id");
  CREATE INDEX "navigation_footer_columns_order_idx" ON "navigation_footer_columns" USING btree ("_order");
  CREATE INDEX "navigation_footer_columns_parent_id_idx" ON "navigation_footer_columns" USING btree ("_parent_id");
  CREATE INDEX "navigation_footer_bottom_links_order_idx" ON "navigation_footer_bottom_links" USING btree ("_order");
  CREATE INDEX "navigation_footer_bottom_links_parent_id_idx" ON "navigation_footer_bottom_links" USING btree ("_parent_id");
  CREATE INDEX "navigation_rels_order_idx" ON "navigation_rels" USING btree ("order");
  CREATE INDEX "navigation_rels_parent_idx" ON "navigation_rels" USING btree ("parent_id");
  CREATE INDEX "navigation_rels_path_idx" ON "navigation_rels" USING btree ("path");
  CREATE INDEX "navigation_rels_pages_id_idx" ON "navigation_rels" USING btree ("pages_id");
  CREATE INDEX "navigation_rels_glass_types_id_idx" ON "navigation_rels" USING btree ("glass_types_id");
  CREATE INDEX "navigation_rels_thicknesses_id_idx" ON "navigation_rels" USING btree ("thicknesses_id");
  CREATE INDEX "navigation_rels_processing_services_id_idx" ON "navigation_rels" USING btree ("processing_services_id");
  CREATE INDEX "navigation_rels_constructions_id_idx" ON "navigation_rels" USING btree ("constructions_id");
  CREATE INDEX "navigation_rels_articles_id_idx" ON "navigation_rels" USING btree ("articles_id");
  CREATE INDEX "navigation_rels_objects_id_idx" ON "navigation_rels" USING btree ("objects_id");
  CREATE INDEX "snippets_items_order_idx" ON "snippets_items" USING btree ("_order");
  CREATE INDEX "snippets_items_parent_id_idx" ON "snippets_items" USING btree ("_parent_id");
  ALTER TABLE "users" ADD CONSTRAINT "users_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_articles_fk" FOREIGN KEY ("articles_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_objects_fk" FOREIGN KEY ("objects_id") REFERENCES "public"."objects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_team_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_thicknesses_fk" FOREIGN KEY ("thicknesses_id") REFERENCES "public"."thicknesses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_thickness_groups_fk" FOREIGN KEY ("thickness_groups_id") REFERENCES "public"."thickness_groups"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_glass_types_fk" FOREIGN KEY ("glass_types_id") REFERENCES "public"."glass_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_processing_services_fk" FOREIGN KEY ("processing_services_id") REFERENCES "public"."processing_services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_constructions_fk" FOREIGN KEY ("constructions_id") REFERENCES "public"."constructions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_shower_configs_fk" FOREIGN KEY ("shower_configs_id") REFERENCES "public"."shower_configs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_object_types_fk" FOREIGN KEY ("object_types_id") REFERENCES "public"."object_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_cities_fk" FOREIGN KEY ("cities_id") REFERENCES "public"."cities"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_lead_files_fk" FOREIGN KEY ("lead_files_id") REFERENCES "public"."lead_files"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_lead_statuses_fk" FOREIGN KEY ("lead_statuses_id") REFERENCES "public"."lead_statuses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_leads_fk" FOREIGN KEY ("leads_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_orders_fk" FOREIGN KEY ("orders_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_order_files_fk" FOREIGN KEY ("order_files_id") REFERENCES "public"."order_files"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_consent_log_fk" FOREIGN KEY ("consent_log_id") REFERENCES "public"."consent_log"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_redirects_fk" FOREIGN KEY ("redirects_id") REFERENCES "public"."redirects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_rate_limits_fk" FOREIGN KEY ("rate_limits_id") REFERENCES "public"."rate_limits"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_photo_idx" ON "users" USING btree ("photo_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_pages_id_idx" ON "payload_locked_documents_rels" USING btree ("pages_id");
  CREATE INDEX "payload_locked_documents_rels_articles_id_idx" ON "payload_locked_documents_rels" USING btree ("articles_id");
  CREATE INDEX "payload_locked_documents_rels_objects_id_idx" ON "payload_locked_documents_rels" USING btree ("objects_id");
  CREATE INDEX "payload_locked_documents_rels_team_id_idx" ON "payload_locked_documents_rels" USING btree ("team_id");
  CREATE INDEX "payload_locked_documents_rels_thicknesses_id_idx" ON "payload_locked_documents_rels" USING btree ("thicknesses_id");
  CREATE INDEX "payload_locked_documents_rels_thickness_groups_id_idx" ON "payload_locked_documents_rels" USING btree ("thickness_groups_id");
  CREATE INDEX "payload_locked_documents_rels_glass_types_id_idx" ON "payload_locked_documents_rels" USING btree ("glass_types_id");
  CREATE INDEX "payload_locked_documents_rels_processing_services_id_idx" ON "payload_locked_documents_rels" USING btree ("processing_services_id");
  CREATE INDEX "payload_locked_documents_rels_constructions_id_idx" ON "payload_locked_documents_rels" USING btree ("constructions_id");
  CREATE INDEX "payload_locked_documents_rels_shower_configs_id_idx" ON "payload_locked_documents_rels" USING btree ("shower_configs_id");
  CREATE INDEX "payload_locked_documents_rels_products_id_idx" ON "payload_locked_documents_rels" USING btree ("products_id");
  CREATE INDEX "payload_locked_documents_rels_object_types_id_idx" ON "payload_locked_documents_rels" USING btree ("object_types_id");
  CREATE INDEX "payload_locked_documents_rels_cities_id_idx" ON "payload_locked_documents_rels" USING btree ("cities_id");
  CREATE INDEX "payload_locked_documents_rels_lead_files_id_idx" ON "payload_locked_documents_rels" USING btree ("lead_files_id");
  CREATE INDEX "payload_locked_documents_rels_lead_statuses_id_idx" ON "payload_locked_documents_rels" USING btree ("lead_statuses_id");
  CREATE INDEX "payload_locked_documents_rels_leads_id_idx" ON "payload_locked_documents_rels" USING btree ("leads_id");
  CREATE INDEX "payload_locked_documents_rels_orders_id_idx" ON "payload_locked_documents_rels" USING btree ("orders_id");
  CREATE INDEX "payload_locked_documents_rels_order_files_id_idx" ON "payload_locked_documents_rels" USING btree ("order_files_id");
  CREATE INDEX "payload_locked_documents_rels_consent_log_id_idx" ON "payload_locked_documents_rels" USING btree ("consent_log_id");
  CREATE INDEX "payload_locked_documents_rels_redirects_id_idx" ON "payload_locked_documents_rels" USING btree ("redirects_id");
  CREATE INDEX "payload_locked_documents_rels_rate_limits_id_idx" ON "payload_locked_documents_rels" USING btree ("rate_limits_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "media" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blk_hero_eyebrow" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blk_hero_buttons" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blk_hero_photos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blk_hero_stats" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blk_hero" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blk_text" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blk_table_table_cols" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blk_table_table_rows_cells" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blk_table_table_rows" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blk_table" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blk_steps_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blk_steps_buttons" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blk_steps" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blk_callout_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blk_callout" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blk_terms_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blk_terms" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blk_cards_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blk_cards" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blk_coll_cards" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blk_prices" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blk_faq_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blk_faq" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blk_cta_buttons" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blk_cta" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blk_compare_rows" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blk_compare" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blk_download_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blk_download" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blk_holes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blk_weight" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blk_form_bullets" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blk_form" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blk_snippet" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blk_stats_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blk_stats" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blk_objects" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blk_articles" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blk_wdw_left" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blk_wdw_right" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blk_wdw" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blk_systems_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blk_systems" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blk_gallery_images" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blk_gallery" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blk_two_cols" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blk_links_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blk_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blk_contacts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blk_requisites" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blk_team" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blk_quiz_cta" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_faq" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_legacy_urls" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_blk_hero_v_eyebrow" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_blk_hero_v_buttons" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_blk_hero_v_photos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_blk_hero_v_stats" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_blk_hero_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_blk_text_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_blk_table_table_cols_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_blk_table_table_rows_cells_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_blk_table_table_rows_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_blk_table_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_blk_steps_v_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_blk_steps_v_buttons" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_blk_steps_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_blk_callout_v_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_blk_callout_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_blk_terms_v_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_blk_terms_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_blk_cards_v_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_blk_cards_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_blk_coll_cards_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_blk_prices_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_blk_faq_v_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_blk_faq_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_blk_cta_v_buttons" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_blk_cta_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_blk_compare_v_rows" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_blk_compare_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_blk_download_v_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_blk_download_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_blk_holes_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_blk_weight_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_blk_form_v_bullets" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_blk_form_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_blk_snippet_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_blk_stats_v_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_blk_stats_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_blk_objects_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_blk_articles_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_blk_wdw_left_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_blk_wdw_right_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_blk_wdw_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_blk_systems_v_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_blk_systems_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_blk_gallery_v_images" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_blk_gallery_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_blk_two_cols_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_blk_links_v_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_blk_links_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_blk_contacts_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_blk_requisites_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_blk_team_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_blk_quiz_cta_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_version_faq" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_version_legacy_urls" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "articles_tools" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "articles" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "articles_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_articles_v_version_tools" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_articles_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_articles_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "objects_spec" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "objects_chips" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "objects_photos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "objects_legacy_urls" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "objects" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "objects_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_objects_v_version_spec" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_objects_v_version_chips" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_objects_v_version_photos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_objects_v_version_legacy_urls" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_objects_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_objects_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "team" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "thicknesses_faq_override" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "thicknesses_blk_hero_eyebrow" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "thicknesses_blk_hero_buttons" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "thicknesses_blk_hero_photos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "thicknesses_blk_hero_stats" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "thicknesses_blk_hero" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "thicknesses_blk_text" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "thicknesses_blk_table_table_cols" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "thicknesses_blk_table_table_rows_cells" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "thicknesses_blk_table_table_rows" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "thicknesses_blk_table" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "thicknesses_blk_steps_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "thicknesses_blk_steps_buttons" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "thicknesses_blk_steps" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "thicknesses_blk_callout_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "thicknesses_blk_callout" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "thicknesses_blk_terms_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "thicknesses_blk_terms" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "thicknesses_blk_cards_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "thicknesses_blk_cards" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "thicknesses_blk_coll_cards" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "thicknesses_blk_prices" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "thicknesses_blk_faq_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "thicknesses_blk_faq" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "thicknesses_blk_cta_buttons" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "thicknesses_blk_cta" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "thicknesses_blk_compare_rows" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "thicknesses_blk_compare" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "thicknesses_blk_download_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "thicknesses_blk_download" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "thicknesses_blk_holes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "thicknesses_blk_weight" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "thicknesses_blk_form_bullets" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "thicknesses_blk_form" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "thicknesses_blk_snippet" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "thicknesses_blk_stats_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "thicknesses_blk_stats" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "thicknesses_blk_objects" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "thicknesses_blk_articles" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "thicknesses_blk_wdw_left" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "thicknesses_blk_wdw_right" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "thicknesses_blk_wdw" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "thicknesses_blk_systems_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "thicknesses_blk_systems" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "thicknesses_blk_gallery_images" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "thicknesses_blk_gallery" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "thicknesses_blk_two_cols" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "thicknesses_blk_links_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "thicknesses_blk_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "thicknesses_blk_contacts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "thicknesses_blk_requisites" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "thicknesses_blk_team" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "thicknesses_blk_quiz_cta" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "thicknesses" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "thicknesses_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "thickness_groups_faq" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "thickness_groups" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "glass_types_hero_photos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "glass_types_variants" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "glass_types_tables_cols" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "glass_types_tables_rows_cells" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "glass_types_tables_rows" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "glass_types_tables" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "glass_types_important_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "glass_types_limits_radius" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "glass_types_applications" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "glass_types_related_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "glass_types_faq" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "glass_types_blk_hero_eyebrow" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "glass_types_blk_hero_buttons" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "glass_types_blk_hero_photos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "glass_types_blk_hero_stats" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "glass_types_blk_hero" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "glass_types_blk_text" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "glass_types_blk_table_table_cols" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "glass_types_blk_table_table_rows_cells" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "glass_types_blk_table_table_rows" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "glass_types_blk_table" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "glass_types_blk_steps_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "glass_types_blk_steps_buttons" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "glass_types_blk_steps" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "glass_types_blk_callout_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "glass_types_blk_callout" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "glass_types_blk_terms_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "glass_types_blk_terms" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "glass_types_blk_cards_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "glass_types_blk_cards" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "glass_types_blk_coll_cards" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "glass_types_blk_prices" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "glass_types_blk_faq_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "glass_types_blk_faq" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "glass_types_blk_cta_buttons" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "glass_types_blk_cta" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "glass_types_blk_compare_rows" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "glass_types_blk_compare" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "glass_types_blk_download_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "glass_types_blk_download" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "glass_types_blk_holes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "glass_types_blk_weight" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "glass_types_blk_form_bullets" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "glass_types_blk_form" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "glass_types_blk_snippet" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "glass_types_blk_stats_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "glass_types_blk_stats" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "glass_types_blk_objects" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "glass_types_blk_articles" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "glass_types_blk_wdw_left" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "glass_types_blk_wdw_right" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "glass_types_blk_wdw" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "glass_types_blk_systems_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "glass_types_blk_systems" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "glass_types_blk_gallery_images" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "glass_types_blk_gallery" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "glass_types_blk_two_cols" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "glass_types_blk_links_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "glass_types_blk_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "glass_types_blk_contacts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "glass_types_blk_requisites" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "glass_types_blk_team" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "glass_types_blk_quiz_cta" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "glass_types" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "glass_types_numbers" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "glass_types_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_glass_types_v_version_hero_photos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_glass_types_v_version_variants" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_glass_types_tables_cols_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_glass_types_tables_rows_cells_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_glass_types_tables_rows_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_glass_types_v_version_tables" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_glass_types_v_version_important_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_glass_types_v_version_limits_radius" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_glass_types_v_version_applications" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_glass_types_v_version_related_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_glass_types_v_version_faq" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_glass_types_blk_hero_v_eyebrow" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_glass_types_blk_hero_v_buttons" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_glass_types_blk_hero_v_photos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_glass_types_blk_hero_v_stats" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_glass_types_blk_hero_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_glass_types_blk_text_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_glass_types_blk_table_table_cols_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_glass_types_blk_table_table_rows_cells_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_glass_types_blk_table_table_rows_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_glass_types_blk_table_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_glass_types_blk_steps_v_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_glass_types_blk_steps_v_buttons" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_glass_types_blk_steps_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_glass_types_blk_callout_v_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_glass_types_blk_callout_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_glass_types_blk_terms_v_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_glass_types_blk_terms_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_glass_types_blk_cards_v_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_glass_types_blk_cards_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_glass_types_blk_coll_cards_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_glass_types_blk_prices_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_glass_types_blk_faq_v_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_glass_types_blk_faq_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_glass_types_blk_cta_v_buttons" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_glass_types_blk_cta_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_glass_types_blk_compare_v_rows" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_glass_types_blk_compare_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_glass_types_blk_download_v_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_glass_types_blk_download_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_glass_types_blk_holes_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_glass_types_blk_weight_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_glass_types_blk_form_v_bullets" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_glass_types_blk_form_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_glass_types_blk_snippet_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_glass_types_blk_stats_v_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_glass_types_blk_stats_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_glass_types_blk_objects_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_glass_types_blk_articles_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_glass_types_blk_wdw_left_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_glass_types_blk_wdw_right_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_glass_types_blk_wdw_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_glass_types_blk_systems_v_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_glass_types_blk_systems_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_glass_types_blk_gallery_v_images" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_glass_types_blk_gallery_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_glass_types_blk_two_cols_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_glass_types_blk_links_v_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_glass_types_blk_links_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_glass_types_blk_contacts_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_glass_types_blk_requisites_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_glass_types_blk_team_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_glass_types_blk_quiz_cta_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_glass_types_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_glass_types_v_numbers" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_glass_types_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "processing_services_tables_cols" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "processing_services_tables_rows_cells" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "processing_services_tables_rows" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "processing_services_tables" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "processing_services_important_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "processing_services_callouts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "processing_services_related_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "processing_services_faq" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "processing_services_blk_hero_eyebrow" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "processing_services_blk_hero_buttons" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "processing_services_blk_hero_photos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "processing_services_blk_hero_stats" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "processing_services_blk_hero" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "processing_services_blk_text" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "processing_services_blk_table_table_cols" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "processing_services_blk_table_table_rows_cells" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "processing_services_blk_table_table_rows" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "processing_services_blk_table" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "processing_services_blk_steps_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "processing_services_blk_steps_buttons" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "processing_services_blk_steps" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "processing_services_blk_callout_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "processing_services_blk_callout" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "processing_services_blk_terms_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "processing_services_blk_terms" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "processing_services_blk_cards_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "processing_services_blk_cards" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "processing_services_blk_coll_cards" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "processing_services_blk_prices" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "processing_services_blk_faq_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "processing_services_blk_faq" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "processing_services_blk_cta_buttons" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "processing_services_blk_cta" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "processing_services_blk_compare_rows" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "processing_services_blk_compare" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "processing_services_blk_download_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "processing_services_blk_download" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "processing_services_blk_holes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "processing_services_blk_weight" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "processing_services_blk_form_bullets" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "processing_services_blk_form" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "processing_services_blk_snippet" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "processing_services_blk_stats_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "processing_services_blk_stats" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "processing_services_blk_objects" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "processing_services_blk_articles" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "processing_services_blk_wdw_left" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "processing_services_blk_wdw_right" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "processing_services_blk_wdw" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "processing_services_blk_systems_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "processing_services_blk_systems" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "processing_services_blk_gallery_images" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "processing_services_blk_gallery" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "processing_services_blk_two_cols" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "processing_services_blk_links_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "processing_services_blk_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "processing_services_blk_contacts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "processing_services_blk_requisites" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "processing_services_blk_team" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "processing_services_blk_quiz_cta" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "processing_services" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "processing_services_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "constructions_systems" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "constructions_profile_systems" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "constructions_glass_bullets" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "constructions_tables_cols" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "constructions_tables_rows_cells" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "constructions_tables_rows" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "constructions_tables" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "constructions_who_does_what_wdw_left" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "constructions_who_does_what_wdw_right" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "constructions_faq" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "constructions_blk_hero_eyebrow" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "constructions_blk_hero_buttons" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "constructions_blk_hero_photos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "constructions_blk_hero_stats" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "constructions_blk_hero" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "constructions_blk_text" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "constructions_blk_table_table_cols" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "constructions_blk_table_table_rows_cells" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "constructions_blk_table_table_rows" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "constructions_blk_table" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "constructions_blk_steps_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "constructions_blk_steps_buttons" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "constructions_blk_steps" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "constructions_blk_callout_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "constructions_blk_callout" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "constructions_blk_terms_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "constructions_blk_terms" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "constructions_blk_cards_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "constructions_blk_cards" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "constructions_blk_coll_cards" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "constructions_blk_prices" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "constructions_blk_faq_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "constructions_blk_faq" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "constructions_blk_cta_buttons" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "constructions_blk_cta" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "constructions_blk_compare_rows" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "constructions_blk_compare" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "constructions_blk_download_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "constructions_blk_download" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "constructions_blk_holes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "constructions_blk_weight" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "constructions_blk_form_bullets" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "constructions_blk_form" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "constructions_blk_snippet" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "constructions_blk_stats_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "constructions_blk_stats" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "constructions_blk_objects" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "constructions_blk_articles" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "constructions_blk_wdw_left" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "constructions_blk_wdw_right" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "constructions_blk_wdw" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "constructions_blk_systems_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "constructions_blk_systems" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "constructions_blk_gallery_images" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "constructions_blk_gallery" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "constructions_blk_two_cols" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "constructions_blk_links_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "constructions_blk_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "constructions_blk_contacts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "constructions_blk_requisites" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "constructions_blk_team" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "constructions_blk_quiz_cta" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "constructions_legacy_urls" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "constructions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "constructions_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_constructions_v_version_systems" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_constructions_v_version_profile_systems" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_constructions_v_version_glass_bullets" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_constructions_tables_cols_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_constructions_tables_rows_cells_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_constructions_tables_rows_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_constructions_v_version_tables" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_constructions_who_does_what_wdw_left_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_constructions_who_does_what_wdw_right_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_constructions_v_version_faq" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_constructions_blk_hero_v_eyebrow" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_constructions_blk_hero_v_buttons" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_constructions_blk_hero_v_photos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_constructions_blk_hero_v_stats" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_constructions_blk_hero_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_constructions_blk_text_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_constructions_blk_table_table_cols_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_constructions_blk_table_table_rows_cells_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_constructions_blk_table_table_rows_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_constructions_blk_table_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_constructions_blk_steps_v_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_constructions_blk_steps_v_buttons" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_constructions_blk_steps_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_constructions_blk_callout_v_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_constructions_blk_callout_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_constructions_blk_terms_v_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_constructions_blk_terms_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_constructions_blk_cards_v_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_constructions_blk_cards_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_constructions_blk_coll_cards_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_constructions_blk_prices_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_constructions_blk_faq_v_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_constructions_blk_faq_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_constructions_blk_cta_v_buttons" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_constructions_blk_cta_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_constructions_blk_compare_v_rows" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_constructions_blk_compare_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_constructions_blk_download_v_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_constructions_blk_download_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_constructions_blk_holes_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_constructions_blk_weight_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_constructions_blk_form_v_bullets" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_constructions_blk_form_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_constructions_blk_snippet_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_constructions_blk_stats_v_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_constructions_blk_stats_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_constructions_blk_objects_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_constructions_blk_articles_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_constructions_blk_wdw_left_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_constructions_blk_wdw_right_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_constructions_blk_wdw_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_constructions_blk_systems_v_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_constructions_blk_systems_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_constructions_blk_gallery_v_images" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_constructions_blk_gallery_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_constructions_blk_two_cols_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_constructions_blk_links_v_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_constructions_blk_links_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_constructions_blk_contacts_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_constructions_blk_requisites_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_constructions_blk_team_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_constructions_blk_quiz_cta_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_constructions_v_version_legacy_urls" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_constructions_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_constructions_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "shower_configs_glass_thicknesses" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "shower_configs_gallery" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "shower_configs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_shower_configs_v_version_glass_thicknesses" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_shower_configs_v_version_gallery" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_shower_configs_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "object_types" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cities" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "lead_files" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "lead_statuses" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "leads_flags" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "leads_internal_comments" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "leads" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "leads_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_leads_v_version_flags" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_leads_v_version_internal_comments" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_leads_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_leads_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "orders_status_history" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "orders_pack_photos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "orders_documents" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "orders" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "order_files" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "consent_log" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "redirects" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "rate_limits" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "prices_rows" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "prices_included" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "prices_extra" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "prices" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_prices_v_version_rows" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_prices_v_version_included" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_prices_v_version_extra" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_prices_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "promo" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_promo_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "conditions_terms_bar" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "conditions_terms_bar_short" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "conditions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "contacts_phones" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "contacts_emails" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "contacts_locations_phones" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "contacts_locations" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "contacts_messengers" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "contacts_same_as" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "contacts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_contacts_v_version_phones" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_contacts_v_version_emails" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_contacts_v_version_locations_phones" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_contacts_v_version_locations" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_contacts_v_version_messengers" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_contacts_v_version_same_as" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_contacts_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "requisites" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_requisites_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "tech_params_bent_radius" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "tech_params_tint_colors" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "tech_params_holes_tolerance_ranges" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "tech_params_carry_hints" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "tech_params_gost_size_tolerance" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "tech_params_gost_flatness" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "tech_params_delivery_cities" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "tech_params_quiz_options_product_types" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "tech_params_quiz_options_kinds" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "tech_params_quiz_options_edges_only_for_types" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "tech_params_quiz_options_edges" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "tech_params_quiz_options_decor" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "tech_params_quiz_options_stamp" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "tech_params_quiz_options_packaging" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "tech_params_quiz_options_roles" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "tech_params" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "tech_params_numbers" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "site_settings_holidays" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "site_settings_stop_words" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "site_settings_lead_emails" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "site_settings_order_statuses" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "site_settings" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "navigation_top_bar_company_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "navigation_top_bar_segments" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "navigation_main_row_pills" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "navigation_main_row_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "navigation_section_row_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "nav_mega_columns_links_sub_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "nav_mega_columns_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "nav_mega_columns" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "nav_mega" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "navigation_footer_columns_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "navigation_footer_columns" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "navigation_footer_bottom_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "navigation" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "navigation_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "snippets_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "snippets" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "media" CASCADE;
  DROP TABLE "pages_blk_hero_eyebrow" CASCADE;
  DROP TABLE "pages_blk_hero_buttons" CASCADE;
  DROP TABLE "pages_blk_hero_photos" CASCADE;
  DROP TABLE "pages_blk_hero_stats" CASCADE;
  DROP TABLE "pages_blk_hero" CASCADE;
  DROP TABLE "pages_blk_text" CASCADE;
  DROP TABLE "pages_blk_table_table_cols" CASCADE;
  DROP TABLE "pages_blk_table_table_rows_cells" CASCADE;
  DROP TABLE "pages_blk_table_table_rows" CASCADE;
  DROP TABLE "pages_blk_table" CASCADE;
  DROP TABLE "pages_blk_steps_items" CASCADE;
  DROP TABLE "pages_blk_steps_buttons" CASCADE;
  DROP TABLE "pages_blk_steps" CASCADE;
  DROP TABLE "pages_blk_callout_items" CASCADE;
  DROP TABLE "pages_blk_callout" CASCADE;
  DROP TABLE "pages_blk_terms_items" CASCADE;
  DROP TABLE "pages_blk_terms" CASCADE;
  DROP TABLE "pages_blk_cards_items" CASCADE;
  DROP TABLE "pages_blk_cards" CASCADE;
  DROP TABLE "pages_blk_coll_cards" CASCADE;
  DROP TABLE "pages_blk_prices" CASCADE;
  DROP TABLE "pages_blk_faq_items" CASCADE;
  DROP TABLE "pages_blk_faq" CASCADE;
  DROP TABLE "pages_blk_cta_buttons" CASCADE;
  DROP TABLE "pages_blk_cta" CASCADE;
  DROP TABLE "pages_blk_compare_rows" CASCADE;
  DROP TABLE "pages_blk_compare" CASCADE;
  DROP TABLE "pages_blk_download_items" CASCADE;
  DROP TABLE "pages_blk_download" CASCADE;
  DROP TABLE "pages_blk_holes" CASCADE;
  DROP TABLE "pages_blk_weight" CASCADE;
  DROP TABLE "pages_blk_form_bullets" CASCADE;
  DROP TABLE "pages_blk_form" CASCADE;
  DROP TABLE "pages_blk_snippet" CASCADE;
  DROP TABLE "pages_blk_stats_items" CASCADE;
  DROP TABLE "pages_blk_stats" CASCADE;
  DROP TABLE "pages_blk_objects" CASCADE;
  DROP TABLE "pages_blk_articles" CASCADE;
  DROP TABLE "pages_blk_wdw_left" CASCADE;
  DROP TABLE "pages_blk_wdw_right" CASCADE;
  DROP TABLE "pages_blk_wdw" CASCADE;
  DROP TABLE "pages_blk_systems_items" CASCADE;
  DROP TABLE "pages_blk_systems" CASCADE;
  DROP TABLE "pages_blk_gallery_images" CASCADE;
  DROP TABLE "pages_blk_gallery" CASCADE;
  DROP TABLE "pages_blk_two_cols" CASCADE;
  DROP TABLE "pages_blk_links_items" CASCADE;
  DROP TABLE "pages_blk_links" CASCADE;
  DROP TABLE "pages_blk_contacts" CASCADE;
  DROP TABLE "pages_blk_requisites" CASCADE;
  DROP TABLE "pages_blk_team" CASCADE;
  DROP TABLE "pages_blk_quiz_cta" CASCADE;
  DROP TABLE "pages_faq" CASCADE;
  DROP TABLE "pages_legacy_urls" CASCADE;
  DROP TABLE "pages" CASCADE;
  DROP TABLE "pages_rels" CASCADE;
  DROP TABLE "_pages_blk_hero_v_eyebrow" CASCADE;
  DROP TABLE "_pages_blk_hero_v_buttons" CASCADE;
  DROP TABLE "_pages_blk_hero_v_photos" CASCADE;
  DROP TABLE "_pages_blk_hero_v_stats" CASCADE;
  DROP TABLE "_pages_blk_hero_v" CASCADE;
  DROP TABLE "_pages_blk_text_v" CASCADE;
  DROP TABLE "_pages_blk_table_table_cols_v" CASCADE;
  DROP TABLE "_pages_blk_table_table_rows_cells_v" CASCADE;
  DROP TABLE "_pages_blk_table_table_rows_v" CASCADE;
  DROP TABLE "_pages_blk_table_v" CASCADE;
  DROP TABLE "_pages_blk_steps_v_items" CASCADE;
  DROP TABLE "_pages_blk_steps_v_buttons" CASCADE;
  DROP TABLE "_pages_blk_steps_v" CASCADE;
  DROP TABLE "_pages_blk_callout_v_items" CASCADE;
  DROP TABLE "_pages_blk_callout_v" CASCADE;
  DROP TABLE "_pages_blk_terms_v_items" CASCADE;
  DROP TABLE "_pages_blk_terms_v" CASCADE;
  DROP TABLE "_pages_blk_cards_v_items" CASCADE;
  DROP TABLE "_pages_blk_cards_v" CASCADE;
  DROP TABLE "_pages_blk_coll_cards_v" CASCADE;
  DROP TABLE "_pages_blk_prices_v" CASCADE;
  DROP TABLE "_pages_blk_faq_v_items" CASCADE;
  DROP TABLE "_pages_blk_faq_v" CASCADE;
  DROP TABLE "_pages_blk_cta_v_buttons" CASCADE;
  DROP TABLE "_pages_blk_cta_v" CASCADE;
  DROP TABLE "_pages_blk_compare_v_rows" CASCADE;
  DROP TABLE "_pages_blk_compare_v" CASCADE;
  DROP TABLE "_pages_blk_download_v_items" CASCADE;
  DROP TABLE "_pages_blk_download_v" CASCADE;
  DROP TABLE "_pages_blk_holes_v" CASCADE;
  DROP TABLE "_pages_blk_weight_v" CASCADE;
  DROP TABLE "_pages_blk_form_v_bullets" CASCADE;
  DROP TABLE "_pages_blk_form_v" CASCADE;
  DROP TABLE "_pages_blk_snippet_v" CASCADE;
  DROP TABLE "_pages_blk_stats_v_items" CASCADE;
  DROP TABLE "_pages_blk_stats_v" CASCADE;
  DROP TABLE "_pages_blk_objects_v" CASCADE;
  DROP TABLE "_pages_blk_articles_v" CASCADE;
  DROP TABLE "_pages_blk_wdw_left_v" CASCADE;
  DROP TABLE "_pages_blk_wdw_right_v" CASCADE;
  DROP TABLE "_pages_blk_wdw_v" CASCADE;
  DROP TABLE "_pages_blk_systems_v_items" CASCADE;
  DROP TABLE "_pages_blk_systems_v" CASCADE;
  DROP TABLE "_pages_blk_gallery_v_images" CASCADE;
  DROP TABLE "_pages_blk_gallery_v" CASCADE;
  DROP TABLE "_pages_blk_two_cols_v" CASCADE;
  DROP TABLE "_pages_blk_links_v_items" CASCADE;
  DROP TABLE "_pages_blk_links_v" CASCADE;
  DROP TABLE "_pages_blk_contacts_v" CASCADE;
  DROP TABLE "_pages_blk_requisites_v" CASCADE;
  DROP TABLE "_pages_blk_team_v" CASCADE;
  DROP TABLE "_pages_blk_quiz_cta_v" CASCADE;
  DROP TABLE "_pages_v_version_faq" CASCADE;
  DROP TABLE "_pages_v_version_legacy_urls" CASCADE;
  DROP TABLE "_pages_v" CASCADE;
  DROP TABLE "_pages_v_rels" CASCADE;
  DROP TABLE "articles_tools" CASCADE;
  DROP TABLE "articles" CASCADE;
  DROP TABLE "articles_rels" CASCADE;
  DROP TABLE "_articles_v_version_tools" CASCADE;
  DROP TABLE "_articles_v" CASCADE;
  DROP TABLE "_articles_v_rels" CASCADE;
  DROP TABLE "objects_spec" CASCADE;
  DROP TABLE "objects_chips" CASCADE;
  DROP TABLE "objects_photos" CASCADE;
  DROP TABLE "objects_legacy_urls" CASCADE;
  DROP TABLE "objects" CASCADE;
  DROP TABLE "objects_rels" CASCADE;
  DROP TABLE "_objects_v_version_spec" CASCADE;
  DROP TABLE "_objects_v_version_chips" CASCADE;
  DROP TABLE "_objects_v_version_photos" CASCADE;
  DROP TABLE "_objects_v_version_legacy_urls" CASCADE;
  DROP TABLE "_objects_v" CASCADE;
  DROP TABLE "_objects_v_rels" CASCADE;
  DROP TABLE "team" CASCADE;
  DROP TABLE "thicknesses_faq_override" CASCADE;
  DROP TABLE "thicknesses_blk_hero_eyebrow" CASCADE;
  DROP TABLE "thicknesses_blk_hero_buttons" CASCADE;
  DROP TABLE "thicknesses_blk_hero_photos" CASCADE;
  DROP TABLE "thicknesses_blk_hero_stats" CASCADE;
  DROP TABLE "thicknesses_blk_hero" CASCADE;
  DROP TABLE "thicknesses_blk_text" CASCADE;
  DROP TABLE "thicknesses_blk_table_table_cols" CASCADE;
  DROP TABLE "thicknesses_blk_table_table_rows_cells" CASCADE;
  DROP TABLE "thicknesses_blk_table_table_rows" CASCADE;
  DROP TABLE "thicknesses_blk_table" CASCADE;
  DROP TABLE "thicknesses_blk_steps_items" CASCADE;
  DROP TABLE "thicknesses_blk_steps_buttons" CASCADE;
  DROP TABLE "thicknesses_blk_steps" CASCADE;
  DROP TABLE "thicknesses_blk_callout_items" CASCADE;
  DROP TABLE "thicknesses_blk_callout" CASCADE;
  DROP TABLE "thicknesses_blk_terms_items" CASCADE;
  DROP TABLE "thicknesses_blk_terms" CASCADE;
  DROP TABLE "thicknesses_blk_cards_items" CASCADE;
  DROP TABLE "thicknesses_blk_cards" CASCADE;
  DROP TABLE "thicknesses_blk_coll_cards" CASCADE;
  DROP TABLE "thicknesses_blk_prices" CASCADE;
  DROP TABLE "thicknesses_blk_faq_items" CASCADE;
  DROP TABLE "thicknesses_blk_faq" CASCADE;
  DROP TABLE "thicknesses_blk_cta_buttons" CASCADE;
  DROP TABLE "thicknesses_blk_cta" CASCADE;
  DROP TABLE "thicknesses_blk_compare_rows" CASCADE;
  DROP TABLE "thicknesses_blk_compare" CASCADE;
  DROP TABLE "thicknesses_blk_download_items" CASCADE;
  DROP TABLE "thicknesses_blk_download" CASCADE;
  DROP TABLE "thicknesses_blk_holes" CASCADE;
  DROP TABLE "thicknesses_blk_weight" CASCADE;
  DROP TABLE "thicknesses_blk_form_bullets" CASCADE;
  DROP TABLE "thicknesses_blk_form" CASCADE;
  DROP TABLE "thicknesses_blk_snippet" CASCADE;
  DROP TABLE "thicknesses_blk_stats_items" CASCADE;
  DROP TABLE "thicknesses_blk_stats" CASCADE;
  DROP TABLE "thicknesses_blk_objects" CASCADE;
  DROP TABLE "thicknesses_blk_articles" CASCADE;
  DROP TABLE "thicknesses_blk_wdw_left" CASCADE;
  DROP TABLE "thicknesses_blk_wdw_right" CASCADE;
  DROP TABLE "thicknesses_blk_wdw" CASCADE;
  DROP TABLE "thicknesses_blk_systems_items" CASCADE;
  DROP TABLE "thicknesses_blk_systems" CASCADE;
  DROP TABLE "thicknesses_blk_gallery_images" CASCADE;
  DROP TABLE "thicknesses_blk_gallery" CASCADE;
  DROP TABLE "thicknesses_blk_two_cols" CASCADE;
  DROP TABLE "thicknesses_blk_links_items" CASCADE;
  DROP TABLE "thicknesses_blk_links" CASCADE;
  DROP TABLE "thicknesses_blk_contacts" CASCADE;
  DROP TABLE "thicknesses_blk_requisites" CASCADE;
  DROP TABLE "thicknesses_blk_team" CASCADE;
  DROP TABLE "thicknesses_blk_quiz_cta" CASCADE;
  DROP TABLE "thicknesses" CASCADE;
  DROP TABLE "thicknesses_rels" CASCADE;
  DROP TABLE "thickness_groups_faq" CASCADE;
  DROP TABLE "thickness_groups" CASCADE;
  DROP TABLE "glass_types_hero_photos" CASCADE;
  DROP TABLE "glass_types_variants" CASCADE;
  DROP TABLE "glass_types_tables_cols" CASCADE;
  DROP TABLE "glass_types_tables_rows_cells" CASCADE;
  DROP TABLE "glass_types_tables_rows" CASCADE;
  DROP TABLE "glass_types_tables" CASCADE;
  DROP TABLE "glass_types_important_items" CASCADE;
  DROP TABLE "glass_types_limits_radius" CASCADE;
  DROP TABLE "glass_types_applications" CASCADE;
  DROP TABLE "glass_types_related_links" CASCADE;
  DROP TABLE "glass_types_faq" CASCADE;
  DROP TABLE "glass_types_blk_hero_eyebrow" CASCADE;
  DROP TABLE "glass_types_blk_hero_buttons" CASCADE;
  DROP TABLE "glass_types_blk_hero_photos" CASCADE;
  DROP TABLE "glass_types_blk_hero_stats" CASCADE;
  DROP TABLE "glass_types_blk_hero" CASCADE;
  DROP TABLE "glass_types_blk_text" CASCADE;
  DROP TABLE "glass_types_blk_table_table_cols" CASCADE;
  DROP TABLE "glass_types_blk_table_table_rows_cells" CASCADE;
  DROP TABLE "glass_types_blk_table_table_rows" CASCADE;
  DROP TABLE "glass_types_blk_table" CASCADE;
  DROP TABLE "glass_types_blk_steps_items" CASCADE;
  DROP TABLE "glass_types_blk_steps_buttons" CASCADE;
  DROP TABLE "glass_types_blk_steps" CASCADE;
  DROP TABLE "glass_types_blk_callout_items" CASCADE;
  DROP TABLE "glass_types_blk_callout" CASCADE;
  DROP TABLE "glass_types_blk_terms_items" CASCADE;
  DROP TABLE "glass_types_blk_terms" CASCADE;
  DROP TABLE "glass_types_blk_cards_items" CASCADE;
  DROP TABLE "glass_types_blk_cards" CASCADE;
  DROP TABLE "glass_types_blk_coll_cards" CASCADE;
  DROP TABLE "glass_types_blk_prices" CASCADE;
  DROP TABLE "glass_types_blk_faq_items" CASCADE;
  DROP TABLE "glass_types_blk_faq" CASCADE;
  DROP TABLE "glass_types_blk_cta_buttons" CASCADE;
  DROP TABLE "glass_types_blk_cta" CASCADE;
  DROP TABLE "glass_types_blk_compare_rows" CASCADE;
  DROP TABLE "glass_types_blk_compare" CASCADE;
  DROP TABLE "glass_types_blk_download_items" CASCADE;
  DROP TABLE "glass_types_blk_download" CASCADE;
  DROP TABLE "glass_types_blk_holes" CASCADE;
  DROP TABLE "glass_types_blk_weight" CASCADE;
  DROP TABLE "glass_types_blk_form_bullets" CASCADE;
  DROP TABLE "glass_types_blk_form" CASCADE;
  DROP TABLE "glass_types_blk_snippet" CASCADE;
  DROP TABLE "glass_types_blk_stats_items" CASCADE;
  DROP TABLE "glass_types_blk_stats" CASCADE;
  DROP TABLE "glass_types_blk_objects" CASCADE;
  DROP TABLE "glass_types_blk_articles" CASCADE;
  DROP TABLE "glass_types_blk_wdw_left" CASCADE;
  DROP TABLE "glass_types_blk_wdw_right" CASCADE;
  DROP TABLE "glass_types_blk_wdw" CASCADE;
  DROP TABLE "glass_types_blk_systems_items" CASCADE;
  DROP TABLE "glass_types_blk_systems" CASCADE;
  DROP TABLE "glass_types_blk_gallery_images" CASCADE;
  DROP TABLE "glass_types_blk_gallery" CASCADE;
  DROP TABLE "glass_types_blk_two_cols" CASCADE;
  DROP TABLE "glass_types_blk_links_items" CASCADE;
  DROP TABLE "glass_types_blk_links" CASCADE;
  DROP TABLE "glass_types_blk_contacts" CASCADE;
  DROP TABLE "glass_types_blk_requisites" CASCADE;
  DROP TABLE "glass_types_blk_team" CASCADE;
  DROP TABLE "glass_types_blk_quiz_cta" CASCADE;
  DROP TABLE "glass_types" CASCADE;
  DROP TABLE "glass_types_numbers" CASCADE;
  DROP TABLE "glass_types_rels" CASCADE;
  DROP TABLE "_glass_types_v_version_hero_photos" CASCADE;
  DROP TABLE "_glass_types_v_version_variants" CASCADE;
  DROP TABLE "_glass_types_tables_cols_v" CASCADE;
  DROP TABLE "_glass_types_tables_rows_cells_v" CASCADE;
  DROP TABLE "_glass_types_tables_rows_v" CASCADE;
  DROP TABLE "_glass_types_v_version_tables" CASCADE;
  DROP TABLE "_glass_types_v_version_important_items" CASCADE;
  DROP TABLE "_glass_types_v_version_limits_radius" CASCADE;
  DROP TABLE "_glass_types_v_version_applications" CASCADE;
  DROP TABLE "_glass_types_v_version_related_links" CASCADE;
  DROP TABLE "_glass_types_v_version_faq" CASCADE;
  DROP TABLE "_glass_types_blk_hero_v_eyebrow" CASCADE;
  DROP TABLE "_glass_types_blk_hero_v_buttons" CASCADE;
  DROP TABLE "_glass_types_blk_hero_v_photos" CASCADE;
  DROP TABLE "_glass_types_blk_hero_v_stats" CASCADE;
  DROP TABLE "_glass_types_blk_hero_v" CASCADE;
  DROP TABLE "_glass_types_blk_text_v" CASCADE;
  DROP TABLE "_glass_types_blk_table_table_cols_v" CASCADE;
  DROP TABLE "_glass_types_blk_table_table_rows_cells_v" CASCADE;
  DROP TABLE "_glass_types_blk_table_table_rows_v" CASCADE;
  DROP TABLE "_glass_types_blk_table_v" CASCADE;
  DROP TABLE "_glass_types_blk_steps_v_items" CASCADE;
  DROP TABLE "_glass_types_blk_steps_v_buttons" CASCADE;
  DROP TABLE "_glass_types_blk_steps_v" CASCADE;
  DROP TABLE "_glass_types_blk_callout_v_items" CASCADE;
  DROP TABLE "_glass_types_blk_callout_v" CASCADE;
  DROP TABLE "_glass_types_blk_terms_v_items" CASCADE;
  DROP TABLE "_glass_types_blk_terms_v" CASCADE;
  DROP TABLE "_glass_types_blk_cards_v_items" CASCADE;
  DROP TABLE "_glass_types_blk_cards_v" CASCADE;
  DROP TABLE "_glass_types_blk_coll_cards_v" CASCADE;
  DROP TABLE "_glass_types_blk_prices_v" CASCADE;
  DROP TABLE "_glass_types_blk_faq_v_items" CASCADE;
  DROP TABLE "_glass_types_blk_faq_v" CASCADE;
  DROP TABLE "_glass_types_blk_cta_v_buttons" CASCADE;
  DROP TABLE "_glass_types_blk_cta_v" CASCADE;
  DROP TABLE "_glass_types_blk_compare_v_rows" CASCADE;
  DROP TABLE "_glass_types_blk_compare_v" CASCADE;
  DROP TABLE "_glass_types_blk_download_v_items" CASCADE;
  DROP TABLE "_glass_types_blk_download_v" CASCADE;
  DROP TABLE "_glass_types_blk_holes_v" CASCADE;
  DROP TABLE "_glass_types_blk_weight_v" CASCADE;
  DROP TABLE "_glass_types_blk_form_v_bullets" CASCADE;
  DROP TABLE "_glass_types_blk_form_v" CASCADE;
  DROP TABLE "_glass_types_blk_snippet_v" CASCADE;
  DROP TABLE "_glass_types_blk_stats_v_items" CASCADE;
  DROP TABLE "_glass_types_blk_stats_v" CASCADE;
  DROP TABLE "_glass_types_blk_objects_v" CASCADE;
  DROP TABLE "_glass_types_blk_articles_v" CASCADE;
  DROP TABLE "_glass_types_blk_wdw_left_v" CASCADE;
  DROP TABLE "_glass_types_blk_wdw_right_v" CASCADE;
  DROP TABLE "_glass_types_blk_wdw_v" CASCADE;
  DROP TABLE "_glass_types_blk_systems_v_items" CASCADE;
  DROP TABLE "_glass_types_blk_systems_v" CASCADE;
  DROP TABLE "_glass_types_blk_gallery_v_images" CASCADE;
  DROP TABLE "_glass_types_blk_gallery_v" CASCADE;
  DROP TABLE "_glass_types_blk_two_cols_v" CASCADE;
  DROP TABLE "_glass_types_blk_links_v_items" CASCADE;
  DROP TABLE "_glass_types_blk_links_v" CASCADE;
  DROP TABLE "_glass_types_blk_contacts_v" CASCADE;
  DROP TABLE "_glass_types_blk_requisites_v" CASCADE;
  DROP TABLE "_glass_types_blk_team_v" CASCADE;
  DROP TABLE "_glass_types_blk_quiz_cta_v" CASCADE;
  DROP TABLE "_glass_types_v" CASCADE;
  DROP TABLE "_glass_types_v_numbers" CASCADE;
  DROP TABLE "_glass_types_v_rels" CASCADE;
  DROP TABLE "processing_services_tables_cols" CASCADE;
  DROP TABLE "processing_services_tables_rows_cells" CASCADE;
  DROP TABLE "processing_services_tables_rows" CASCADE;
  DROP TABLE "processing_services_tables" CASCADE;
  DROP TABLE "processing_services_important_items" CASCADE;
  DROP TABLE "processing_services_callouts" CASCADE;
  DROP TABLE "processing_services_related_links" CASCADE;
  DROP TABLE "processing_services_faq" CASCADE;
  DROP TABLE "processing_services_blk_hero_eyebrow" CASCADE;
  DROP TABLE "processing_services_blk_hero_buttons" CASCADE;
  DROP TABLE "processing_services_blk_hero_photos" CASCADE;
  DROP TABLE "processing_services_blk_hero_stats" CASCADE;
  DROP TABLE "processing_services_blk_hero" CASCADE;
  DROP TABLE "processing_services_blk_text" CASCADE;
  DROP TABLE "processing_services_blk_table_table_cols" CASCADE;
  DROP TABLE "processing_services_blk_table_table_rows_cells" CASCADE;
  DROP TABLE "processing_services_blk_table_table_rows" CASCADE;
  DROP TABLE "processing_services_blk_table" CASCADE;
  DROP TABLE "processing_services_blk_steps_items" CASCADE;
  DROP TABLE "processing_services_blk_steps_buttons" CASCADE;
  DROP TABLE "processing_services_blk_steps" CASCADE;
  DROP TABLE "processing_services_blk_callout_items" CASCADE;
  DROP TABLE "processing_services_blk_callout" CASCADE;
  DROP TABLE "processing_services_blk_terms_items" CASCADE;
  DROP TABLE "processing_services_blk_terms" CASCADE;
  DROP TABLE "processing_services_blk_cards_items" CASCADE;
  DROP TABLE "processing_services_blk_cards" CASCADE;
  DROP TABLE "processing_services_blk_coll_cards" CASCADE;
  DROP TABLE "processing_services_blk_prices" CASCADE;
  DROP TABLE "processing_services_blk_faq_items" CASCADE;
  DROP TABLE "processing_services_blk_faq" CASCADE;
  DROP TABLE "processing_services_blk_cta_buttons" CASCADE;
  DROP TABLE "processing_services_blk_cta" CASCADE;
  DROP TABLE "processing_services_blk_compare_rows" CASCADE;
  DROP TABLE "processing_services_blk_compare" CASCADE;
  DROP TABLE "processing_services_blk_download_items" CASCADE;
  DROP TABLE "processing_services_blk_download" CASCADE;
  DROP TABLE "processing_services_blk_holes" CASCADE;
  DROP TABLE "processing_services_blk_weight" CASCADE;
  DROP TABLE "processing_services_blk_form_bullets" CASCADE;
  DROP TABLE "processing_services_blk_form" CASCADE;
  DROP TABLE "processing_services_blk_snippet" CASCADE;
  DROP TABLE "processing_services_blk_stats_items" CASCADE;
  DROP TABLE "processing_services_blk_stats" CASCADE;
  DROP TABLE "processing_services_blk_objects" CASCADE;
  DROP TABLE "processing_services_blk_articles" CASCADE;
  DROP TABLE "processing_services_blk_wdw_left" CASCADE;
  DROP TABLE "processing_services_blk_wdw_right" CASCADE;
  DROP TABLE "processing_services_blk_wdw" CASCADE;
  DROP TABLE "processing_services_blk_systems_items" CASCADE;
  DROP TABLE "processing_services_blk_systems" CASCADE;
  DROP TABLE "processing_services_blk_gallery_images" CASCADE;
  DROP TABLE "processing_services_blk_gallery" CASCADE;
  DROP TABLE "processing_services_blk_two_cols" CASCADE;
  DROP TABLE "processing_services_blk_links_items" CASCADE;
  DROP TABLE "processing_services_blk_links" CASCADE;
  DROP TABLE "processing_services_blk_contacts" CASCADE;
  DROP TABLE "processing_services_blk_requisites" CASCADE;
  DROP TABLE "processing_services_blk_team" CASCADE;
  DROP TABLE "processing_services_blk_quiz_cta" CASCADE;
  DROP TABLE "processing_services" CASCADE;
  DROP TABLE "processing_services_rels" CASCADE;
  DROP TABLE "constructions_systems" CASCADE;
  DROP TABLE "constructions_profile_systems" CASCADE;
  DROP TABLE "constructions_glass_bullets" CASCADE;
  DROP TABLE "constructions_tables_cols" CASCADE;
  DROP TABLE "constructions_tables_rows_cells" CASCADE;
  DROP TABLE "constructions_tables_rows" CASCADE;
  DROP TABLE "constructions_tables" CASCADE;
  DROP TABLE "constructions_who_does_what_wdw_left" CASCADE;
  DROP TABLE "constructions_who_does_what_wdw_right" CASCADE;
  DROP TABLE "constructions_faq" CASCADE;
  DROP TABLE "constructions_blk_hero_eyebrow" CASCADE;
  DROP TABLE "constructions_blk_hero_buttons" CASCADE;
  DROP TABLE "constructions_blk_hero_photos" CASCADE;
  DROP TABLE "constructions_blk_hero_stats" CASCADE;
  DROP TABLE "constructions_blk_hero" CASCADE;
  DROP TABLE "constructions_blk_text" CASCADE;
  DROP TABLE "constructions_blk_table_table_cols" CASCADE;
  DROP TABLE "constructions_blk_table_table_rows_cells" CASCADE;
  DROP TABLE "constructions_blk_table_table_rows" CASCADE;
  DROP TABLE "constructions_blk_table" CASCADE;
  DROP TABLE "constructions_blk_steps_items" CASCADE;
  DROP TABLE "constructions_blk_steps_buttons" CASCADE;
  DROP TABLE "constructions_blk_steps" CASCADE;
  DROP TABLE "constructions_blk_callout_items" CASCADE;
  DROP TABLE "constructions_blk_callout" CASCADE;
  DROP TABLE "constructions_blk_terms_items" CASCADE;
  DROP TABLE "constructions_blk_terms" CASCADE;
  DROP TABLE "constructions_blk_cards_items" CASCADE;
  DROP TABLE "constructions_blk_cards" CASCADE;
  DROP TABLE "constructions_blk_coll_cards" CASCADE;
  DROP TABLE "constructions_blk_prices" CASCADE;
  DROP TABLE "constructions_blk_faq_items" CASCADE;
  DROP TABLE "constructions_blk_faq" CASCADE;
  DROP TABLE "constructions_blk_cta_buttons" CASCADE;
  DROP TABLE "constructions_blk_cta" CASCADE;
  DROP TABLE "constructions_blk_compare_rows" CASCADE;
  DROP TABLE "constructions_blk_compare" CASCADE;
  DROP TABLE "constructions_blk_download_items" CASCADE;
  DROP TABLE "constructions_blk_download" CASCADE;
  DROP TABLE "constructions_blk_holes" CASCADE;
  DROP TABLE "constructions_blk_weight" CASCADE;
  DROP TABLE "constructions_blk_form_bullets" CASCADE;
  DROP TABLE "constructions_blk_form" CASCADE;
  DROP TABLE "constructions_blk_snippet" CASCADE;
  DROP TABLE "constructions_blk_stats_items" CASCADE;
  DROP TABLE "constructions_blk_stats" CASCADE;
  DROP TABLE "constructions_blk_objects" CASCADE;
  DROP TABLE "constructions_blk_articles" CASCADE;
  DROP TABLE "constructions_blk_wdw_left" CASCADE;
  DROP TABLE "constructions_blk_wdw_right" CASCADE;
  DROP TABLE "constructions_blk_wdw" CASCADE;
  DROP TABLE "constructions_blk_systems_items" CASCADE;
  DROP TABLE "constructions_blk_systems" CASCADE;
  DROP TABLE "constructions_blk_gallery_images" CASCADE;
  DROP TABLE "constructions_blk_gallery" CASCADE;
  DROP TABLE "constructions_blk_two_cols" CASCADE;
  DROP TABLE "constructions_blk_links_items" CASCADE;
  DROP TABLE "constructions_blk_links" CASCADE;
  DROP TABLE "constructions_blk_contacts" CASCADE;
  DROP TABLE "constructions_blk_requisites" CASCADE;
  DROP TABLE "constructions_blk_team" CASCADE;
  DROP TABLE "constructions_blk_quiz_cta" CASCADE;
  DROP TABLE "constructions_legacy_urls" CASCADE;
  DROP TABLE "constructions" CASCADE;
  DROP TABLE "constructions_rels" CASCADE;
  DROP TABLE "_constructions_v_version_systems" CASCADE;
  DROP TABLE "_constructions_v_version_profile_systems" CASCADE;
  DROP TABLE "_constructions_v_version_glass_bullets" CASCADE;
  DROP TABLE "_constructions_tables_cols_v" CASCADE;
  DROP TABLE "_constructions_tables_rows_cells_v" CASCADE;
  DROP TABLE "_constructions_tables_rows_v" CASCADE;
  DROP TABLE "_constructions_v_version_tables" CASCADE;
  DROP TABLE "_constructions_who_does_what_wdw_left_v" CASCADE;
  DROP TABLE "_constructions_who_does_what_wdw_right_v" CASCADE;
  DROP TABLE "_constructions_v_version_faq" CASCADE;
  DROP TABLE "_constructions_blk_hero_v_eyebrow" CASCADE;
  DROP TABLE "_constructions_blk_hero_v_buttons" CASCADE;
  DROP TABLE "_constructions_blk_hero_v_photos" CASCADE;
  DROP TABLE "_constructions_blk_hero_v_stats" CASCADE;
  DROP TABLE "_constructions_blk_hero_v" CASCADE;
  DROP TABLE "_constructions_blk_text_v" CASCADE;
  DROP TABLE "_constructions_blk_table_table_cols_v" CASCADE;
  DROP TABLE "_constructions_blk_table_table_rows_cells_v" CASCADE;
  DROP TABLE "_constructions_blk_table_table_rows_v" CASCADE;
  DROP TABLE "_constructions_blk_table_v" CASCADE;
  DROP TABLE "_constructions_blk_steps_v_items" CASCADE;
  DROP TABLE "_constructions_blk_steps_v_buttons" CASCADE;
  DROP TABLE "_constructions_blk_steps_v" CASCADE;
  DROP TABLE "_constructions_blk_callout_v_items" CASCADE;
  DROP TABLE "_constructions_blk_callout_v" CASCADE;
  DROP TABLE "_constructions_blk_terms_v_items" CASCADE;
  DROP TABLE "_constructions_blk_terms_v" CASCADE;
  DROP TABLE "_constructions_blk_cards_v_items" CASCADE;
  DROP TABLE "_constructions_blk_cards_v" CASCADE;
  DROP TABLE "_constructions_blk_coll_cards_v" CASCADE;
  DROP TABLE "_constructions_blk_prices_v" CASCADE;
  DROP TABLE "_constructions_blk_faq_v_items" CASCADE;
  DROP TABLE "_constructions_blk_faq_v" CASCADE;
  DROP TABLE "_constructions_blk_cta_v_buttons" CASCADE;
  DROP TABLE "_constructions_blk_cta_v" CASCADE;
  DROP TABLE "_constructions_blk_compare_v_rows" CASCADE;
  DROP TABLE "_constructions_blk_compare_v" CASCADE;
  DROP TABLE "_constructions_blk_download_v_items" CASCADE;
  DROP TABLE "_constructions_blk_download_v" CASCADE;
  DROP TABLE "_constructions_blk_holes_v" CASCADE;
  DROP TABLE "_constructions_blk_weight_v" CASCADE;
  DROP TABLE "_constructions_blk_form_v_bullets" CASCADE;
  DROP TABLE "_constructions_blk_form_v" CASCADE;
  DROP TABLE "_constructions_blk_snippet_v" CASCADE;
  DROP TABLE "_constructions_blk_stats_v_items" CASCADE;
  DROP TABLE "_constructions_blk_stats_v" CASCADE;
  DROP TABLE "_constructions_blk_objects_v" CASCADE;
  DROP TABLE "_constructions_blk_articles_v" CASCADE;
  DROP TABLE "_constructions_blk_wdw_left_v" CASCADE;
  DROP TABLE "_constructions_blk_wdw_right_v" CASCADE;
  DROP TABLE "_constructions_blk_wdw_v" CASCADE;
  DROP TABLE "_constructions_blk_systems_v_items" CASCADE;
  DROP TABLE "_constructions_blk_systems_v" CASCADE;
  DROP TABLE "_constructions_blk_gallery_v_images" CASCADE;
  DROP TABLE "_constructions_blk_gallery_v" CASCADE;
  DROP TABLE "_constructions_blk_two_cols_v" CASCADE;
  DROP TABLE "_constructions_blk_links_v_items" CASCADE;
  DROP TABLE "_constructions_blk_links_v" CASCADE;
  DROP TABLE "_constructions_blk_contacts_v" CASCADE;
  DROP TABLE "_constructions_blk_requisites_v" CASCADE;
  DROP TABLE "_constructions_blk_team_v" CASCADE;
  DROP TABLE "_constructions_blk_quiz_cta_v" CASCADE;
  DROP TABLE "_constructions_v_version_legacy_urls" CASCADE;
  DROP TABLE "_constructions_v" CASCADE;
  DROP TABLE "_constructions_v_rels" CASCADE;
  DROP TABLE "shower_configs_glass_thicknesses" CASCADE;
  DROP TABLE "shower_configs_gallery" CASCADE;
  DROP TABLE "shower_configs" CASCADE;
  DROP TABLE "_shower_configs_v_version_glass_thicknesses" CASCADE;
  DROP TABLE "_shower_configs_v_version_gallery" CASCADE;
  DROP TABLE "_shower_configs_v" CASCADE;
  DROP TABLE "products" CASCADE;
  DROP TABLE "object_types" CASCADE;
  DROP TABLE "cities" CASCADE;
  DROP TABLE "lead_files" CASCADE;
  DROP TABLE "lead_statuses" CASCADE;
  DROP TABLE "leads_flags" CASCADE;
  DROP TABLE "leads_internal_comments" CASCADE;
  DROP TABLE "leads" CASCADE;
  DROP TABLE "leads_rels" CASCADE;
  DROP TABLE "_leads_v_version_flags" CASCADE;
  DROP TABLE "_leads_v_version_internal_comments" CASCADE;
  DROP TABLE "_leads_v" CASCADE;
  DROP TABLE "_leads_v_rels" CASCADE;
  DROP TABLE "orders_status_history" CASCADE;
  DROP TABLE "orders_pack_photos" CASCADE;
  DROP TABLE "orders_documents" CASCADE;
  DROP TABLE "orders" CASCADE;
  DROP TABLE "order_files" CASCADE;
  DROP TABLE "consent_log" CASCADE;
  DROP TABLE "redirects" CASCADE;
  DROP TABLE "rate_limits" CASCADE;
  DROP TABLE "prices_rows" CASCADE;
  DROP TABLE "prices_included" CASCADE;
  DROP TABLE "prices_extra" CASCADE;
  DROP TABLE "prices" CASCADE;
  DROP TABLE "_prices_v_version_rows" CASCADE;
  DROP TABLE "_prices_v_version_included" CASCADE;
  DROP TABLE "_prices_v_version_extra" CASCADE;
  DROP TABLE "_prices_v" CASCADE;
  DROP TABLE "promo" CASCADE;
  DROP TABLE "_promo_v" CASCADE;
  DROP TABLE "conditions_terms_bar" CASCADE;
  DROP TABLE "conditions_terms_bar_short" CASCADE;
  DROP TABLE "conditions" CASCADE;
  DROP TABLE "contacts_phones" CASCADE;
  DROP TABLE "contacts_emails" CASCADE;
  DROP TABLE "contacts_locations_phones" CASCADE;
  DROP TABLE "contacts_locations" CASCADE;
  DROP TABLE "contacts_messengers" CASCADE;
  DROP TABLE "contacts_same_as" CASCADE;
  DROP TABLE "contacts" CASCADE;
  DROP TABLE "_contacts_v_version_phones" CASCADE;
  DROP TABLE "_contacts_v_version_emails" CASCADE;
  DROP TABLE "_contacts_v_version_locations_phones" CASCADE;
  DROP TABLE "_contacts_v_version_locations" CASCADE;
  DROP TABLE "_contacts_v_version_messengers" CASCADE;
  DROP TABLE "_contacts_v_version_same_as" CASCADE;
  DROP TABLE "_contacts_v" CASCADE;
  DROP TABLE "requisites" CASCADE;
  DROP TABLE "_requisites_v" CASCADE;
  DROP TABLE "tech_params_bent_radius" CASCADE;
  DROP TABLE "tech_params_tint_colors" CASCADE;
  DROP TABLE "tech_params_holes_tolerance_ranges" CASCADE;
  DROP TABLE "tech_params_carry_hints" CASCADE;
  DROP TABLE "tech_params_gost_size_tolerance" CASCADE;
  DROP TABLE "tech_params_gost_flatness" CASCADE;
  DROP TABLE "tech_params_delivery_cities" CASCADE;
  DROP TABLE "tech_params_quiz_options_product_types" CASCADE;
  DROP TABLE "tech_params_quiz_options_kinds" CASCADE;
  DROP TABLE "tech_params_quiz_options_edges_only_for_types" CASCADE;
  DROP TABLE "tech_params_quiz_options_edges" CASCADE;
  DROP TABLE "tech_params_quiz_options_decor" CASCADE;
  DROP TABLE "tech_params_quiz_options_stamp" CASCADE;
  DROP TABLE "tech_params_quiz_options_packaging" CASCADE;
  DROP TABLE "tech_params_quiz_options_roles" CASCADE;
  DROP TABLE "tech_params" CASCADE;
  DROP TABLE "tech_params_numbers" CASCADE;
  DROP TABLE "site_settings_holidays" CASCADE;
  DROP TABLE "site_settings_stop_words" CASCADE;
  DROP TABLE "site_settings_lead_emails" CASCADE;
  DROP TABLE "site_settings_order_statuses" CASCADE;
  DROP TABLE "site_settings" CASCADE;
  DROP TABLE "navigation_top_bar_company_items" CASCADE;
  DROP TABLE "navigation_top_bar_segments" CASCADE;
  DROP TABLE "navigation_main_row_pills" CASCADE;
  DROP TABLE "navigation_main_row_links" CASCADE;
  DROP TABLE "navigation_section_row_items" CASCADE;
  DROP TABLE "nav_mega_columns_links_sub_links" CASCADE;
  DROP TABLE "nav_mega_columns_links" CASCADE;
  DROP TABLE "nav_mega_columns" CASCADE;
  DROP TABLE "nav_mega" CASCADE;
  DROP TABLE "navigation_footer_columns_links" CASCADE;
  DROP TABLE "navigation_footer_columns" CASCADE;
  DROP TABLE "navigation_footer_bottom_links" CASCADE;
  DROP TABLE "navigation" CASCADE;
  DROP TABLE "navigation_rels" CASCADE;
  DROP TABLE "snippets_items" CASCADE;
  DROP TABLE "snippets" CASCADE;
  ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_photo_id_media_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_media_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_pages_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_articles_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_objects_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_team_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_thicknesses_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_thickness_groups_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_glass_types_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_processing_services_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_constructions_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_shower_configs_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_products_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_object_types_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_cities_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_lead_files_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_lead_statuses_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_leads_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_orders_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_order_files_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_consent_log_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_redirects_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_rate_limits_fk";
  
  DROP INDEX IF EXISTS "users_photo_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_media_id_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_pages_id_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_articles_id_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_objects_id_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_team_id_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_thicknesses_id_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_thickness_groups_id_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_glass_types_id_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_processing_services_id_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_constructions_id_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_shower_configs_id_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_products_id_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_object_types_id_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_cities_id_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_lead_files_id_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_lead_statuses_id_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_leads_id_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_orders_id_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_order_files_id_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_consent_log_id_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_redirects_id_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_rate_limits_id_idx";
  ALTER TABLE "users" DROP COLUMN "phone";
  ALTER TABLE "users" DROP COLUMN "position";
  ALTER TABLE "users" DROP COLUMN "messenger_url";
  ALTER TABLE "users" DROP COLUMN "messenger_type";
  ALTER TABLE "users" DROP COLUMN "photo_id";
  ALTER TABLE "users" DROP COLUMN "notify_new_leads";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "media_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "pages_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "articles_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "objects_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "team_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "thicknesses_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "thickness_groups_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "glass_types_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "processing_services_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "constructions_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "shower_configs_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "products_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "object_types_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "cities_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "lead_files_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "lead_statuses_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "leads_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "orders_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "order_files_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "consent_log_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "redirects_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "rate_limits_id";
  DROP TYPE "public"."enum_users_messenger_type";
  DROP TYPE "public"."enum_media_kind";
  DROP TYPE "public"."enum_pages_blk_hero_buttons_kind";
  DROP TYPE "public"."enum_pages_blk_hero_buttons_variant";
  DROP TYPE "public"."enum_pages_blk_hero_buttons_form_key";
  DROP TYPE "public"."enum_pages_blk_hero_buttons_link_type";
  DROP TYPE "public"."enum_pages_blk_hero_variant";
  DROP TYPE "public"."enum_pages_blk_hero_terms_mode";
  DROP TYPE "public"."enum_pages_blk_text_heading_level";
  DROP TYPE "public"."enum_pages_blk_text_background";
  DROP TYPE "public"."enum_pages_blk_text_width";
  DROP TYPE "public"."enum_pages_blk_table_table_cols_align";
  DROP TYPE "public"."enum_pages_blk_table_heading_level";
  DROP TYPE "public"."enum_pages_blk_table_background";
  DROP TYPE "public"."enum_pages_blk_table_table_role";
  DROP TYPE "public"."enum_pages_blk_table_table_mobile_mode";
  DROP TYPE "public"."enum_pages_blk_steps_items_link_type";
  DROP TYPE "public"."enum_pages_blk_steps_buttons_kind";
  DROP TYPE "public"."enum_pages_blk_steps_buttons_variant";
  DROP TYPE "public"."enum_pages_blk_steps_buttons_form_key";
  DROP TYPE "public"."enum_pages_blk_steps_buttons_link_type";
  DROP TYPE "public"."enum_pages_blk_steps_heading_level";
  DROP TYPE "public"."enum_pages_blk_steps_background";
  DROP TYPE "public"."enum_pages_blk_steps_variant";
  DROP TYPE "public"."enum_pages_blk_callout_heading_level";
  DROP TYPE "public"."enum_pages_blk_callout_background";
  DROP TYPE "public"."enum_pages_blk_callout_tone";
  DROP TYPE "public"."enum_pages_blk_terms_heading_level";
  DROP TYPE "public"."enum_pages_blk_terms_background";
  DROP TYPE "public"."enum_pages_blk_terms_mode";
  DROP TYPE "public"."enum_pages_blk_terms_variant";
  DROP TYPE "public"."enum_pages_blk_cards_items_link_type";
  DROP TYPE "public"."enum_pages_blk_cards_items_tone";
  DROP TYPE "public"."enum_pages_blk_cards_heading_level";
  DROP TYPE "public"."enum_pages_blk_cards_background";
  DROP TYPE "public"."enum_pages_blk_cards_layout";
  DROP TYPE "public"."enum_pages_blk_coll_cards_heading_level";
  DROP TYPE "public"."enum_pages_blk_coll_cards_background";
  DROP TYPE "public"."enum_pages_blk_coll_cards_source";
  DROP TYPE "public"."enum_pages_blk_coll_cards_mode";
  DROP TYPE "public"."enum_pages_blk_coll_cards_group";
  DROP TYPE "public"."enum_pages_blk_coll_cards_columns";
  DROP TYPE "public"."enum_pages_blk_prices_heading_level";
  DROP TYPE "public"."enum_pages_blk_prices_background";
  DROP TYPE "public"."enum_pages_blk_prices_variant";
  DROP TYPE "public"."enum_pages_blk_faq_heading_level";
  DROP TYPE "public"."enum_pages_blk_faq_background";
  DROP TYPE "public"."enum_pages_blk_faq_mode";
  DROP TYPE "public"."enum_pages_blk_cta_buttons_kind";
  DROP TYPE "public"."enum_pages_blk_cta_buttons_variant";
  DROP TYPE "public"."enum_pages_blk_cta_buttons_form_key";
  DROP TYPE "public"."enum_pages_blk_cta_buttons_link_type";
  DROP TYPE "public"."enum_pages_blk_cta_heading_level";
  DROP TYPE "public"."enum_pages_blk_cta_background";
  DROP TYPE "public"."enum_pages_blk_cta_variant";
  DROP TYPE "public"."enum_pages_blk_cta_tone";
  DROP TYPE "public"."enum_pages_blk_cta_link_type";
  DROP TYPE "public"."enum_pages_blk_compare_heading_level";
  DROP TYPE "public"."enum_pages_blk_compare_background";
  DROP TYPE "public"."enum_pages_blk_compare_foot_link_type";
  DROP TYPE "public"."enum_pages_blk_download_heading_level";
  DROP TYPE "public"."enum_pages_blk_download_background";
  DROP TYPE "public"."enum_pages_blk_download_variant";
  DROP TYPE "public"."enum_pages_blk_holes_heading_level";
  DROP TYPE "public"."enum_pages_blk_holes_background";
  DROP TYPE "public"."enum_pages_blk_holes_default_thickness";
  DROP TYPE "public"."enum_pages_blk_weight_heading_level";
  DROP TYPE "public"."enum_pages_blk_weight_background";
  DROP TYPE "public"."enum_pages_blk_weight_default_mode";
  DROP TYPE "public"."enum_pages_blk_form_heading_level";
  DROP TYPE "public"."enum_pages_blk_form_background";
  DROP TYPE "public"."enum_pages_blk_form_form_key";
  DROP TYPE "public"."enum_pages_blk_form_variant";
  DROP TYPE "public"."enum_pages_blk_snippet_heading_level";
  DROP TYPE "public"."enum_pages_blk_snippet_background";
  DROP TYPE "public"."enum_pages_blk_stats_heading_level";
  DROP TYPE "public"."enum_pages_blk_stats_background";
  DROP TYPE "public"."enum_pages_blk_stats_variant";
  DROP TYPE "public"."enum_pages_blk_objects_heading_level";
  DROP TYPE "public"."enum_pages_blk_objects_background";
  DROP TYPE "public"."enum_pages_blk_objects_mode";
  DROP TYPE "public"."enum_pages_blk_articles_heading_level";
  DROP TYPE "public"."enum_pages_blk_articles_background";
  DROP TYPE "public"."enum_pages_blk_articles_mode";
  DROP TYPE "public"."enum_pages_blk_wdw_heading_level";
  DROP TYPE "public"."enum_pages_blk_wdw_background";
  DROP TYPE "public"."enum_pages_blk_systems_heading_level";
  DROP TYPE "public"."enum_pages_blk_systems_background";
  DROP TYPE "public"."enum_pages_blk_systems_source";
  DROP TYPE "public"."enum_pages_blk_systems_layout";
  DROP TYPE "public"."enum_pages_blk_gallery_heading_level";
  DROP TYPE "public"."enum_pages_blk_gallery_background";
  DROP TYPE "public"."enum_pages_blk_gallery_layout";
  DROP TYPE "public"."enum_pages_blk_two_cols_heading_level";
  DROP TYPE "public"."enum_pages_blk_two_cols_background";
  DROP TYPE "public"."enum_pages_blk_links_items_link_type";
  DROP TYPE "public"."enum_pages_blk_links_heading_level";
  DROP TYPE "public"."enum_pages_blk_links_background";
  DROP TYPE "public"."enum_pages_blk_links_variant";
  DROP TYPE "public"."enum_pages_blk_contacts_heading_level";
  DROP TYPE "public"."enum_pages_blk_contacts_background";
  DROP TYPE "public"."enum_pages_blk_requisites_heading_level";
  DROP TYPE "public"."enum_pages_blk_requisites_background";
  DROP TYPE "public"."enum_pages_blk_team_heading_level";
  DROP TYPE "public"."enum_pages_blk_team_background";
  DROP TYPE "public"."enum_pages_blk_team_empty_behavior";
  DROP TYPE "public"."enum_pages_blk_quiz_cta_heading_level";
  DROP TYPE "public"."enum_pages_blk_quiz_cta_background";
  DROP TYPE "public"."enum_pages_blk_quiz_cta_prefill_type";
  DROP TYPE "public"."enum_pages_blk_quiz_cta_prefill_thickness";
  DROP TYPE "public"."enum_pages_blk_quiz_cta_prefill_kind";
  DROP TYPE "public"."enum_pages_blk_quiz_cta_prefill_secondary_form";
  DROP TYPE "public"."enum_pages_template";
  DROP TYPE "public"."enum_pages_quiz_prefill_type";
  DROP TYPE "public"."enum_pages_quiz_prefill_thickness";
  DROP TYPE "public"."enum_pages_quiz_prefill_kind";
  DROP TYPE "public"."enum_pages_quiz_prefill_secondary_form";
  DROP TYPE "public"."enum_pages_status";
  DROP TYPE "public"."enum__pages_blk_hero_v_buttons_kind";
  DROP TYPE "public"."enum__pages_blk_hero_v_buttons_variant";
  DROP TYPE "public"."enum__pages_blk_hero_v_buttons_form_key";
  DROP TYPE "public"."enum__pages_blk_hero_v_buttons_link_type";
  DROP TYPE "public"."enum__pages_blk_hero_v_variant";
  DROP TYPE "public"."enum__pages_blk_hero_v_terms_mode";
  DROP TYPE "public"."enum__pages_blk_text_v_heading_level";
  DROP TYPE "public"."enum__pages_blk_text_v_background";
  DROP TYPE "public"."enum__pages_blk_text_v_width";
  DROP TYPE "public"."enum__pages_blk_table_table_cols_v_align";
  DROP TYPE "public"."enum__pages_blk_table_v_heading_level";
  DROP TYPE "public"."enum__pages_blk_table_v_background";
  DROP TYPE "public"."enum__pages_blk_table_v_table_role";
  DROP TYPE "public"."enum__pages_blk_table_v_table_mobile_mode";
  DROP TYPE "public"."enum__pages_blk_steps_v_items_link_type";
  DROP TYPE "public"."enum__pages_blk_steps_v_buttons_kind";
  DROP TYPE "public"."enum__pages_blk_steps_v_buttons_variant";
  DROP TYPE "public"."enum__pages_blk_steps_v_buttons_form_key";
  DROP TYPE "public"."enum__pages_blk_steps_v_buttons_link_type";
  DROP TYPE "public"."enum__pages_blk_steps_v_heading_level";
  DROP TYPE "public"."enum__pages_blk_steps_v_background";
  DROP TYPE "public"."enum__pages_blk_steps_v_variant";
  DROP TYPE "public"."enum__pages_blk_callout_v_heading_level";
  DROP TYPE "public"."enum__pages_blk_callout_v_background";
  DROP TYPE "public"."enum__pages_blk_callout_v_tone";
  DROP TYPE "public"."enum__pages_blk_terms_v_heading_level";
  DROP TYPE "public"."enum__pages_blk_terms_v_background";
  DROP TYPE "public"."enum__pages_blk_terms_v_mode";
  DROP TYPE "public"."enum__pages_blk_terms_v_variant";
  DROP TYPE "public"."enum__pages_blk_cards_v_items_link_type";
  DROP TYPE "public"."enum__pages_blk_cards_v_items_tone";
  DROP TYPE "public"."enum__pages_blk_cards_v_heading_level";
  DROP TYPE "public"."enum__pages_blk_cards_v_background";
  DROP TYPE "public"."enum__pages_blk_cards_v_layout";
  DROP TYPE "public"."enum__pages_blk_coll_cards_v_heading_level";
  DROP TYPE "public"."enum__pages_blk_coll_cards_v_background";
  DROP TYPE "public"."enum__pages_blk_coll_cards_v_source";
  DROP TYPE "public"."enum__pages_blk_coll_cards_v_mode";
  DROP TYPE "public"."enum__pages_blk_coll_cards_v_group";
  DROP TYPE "public"."enum__pages_blk_coll_cards_v_columns";
  DROP TYPE "public"."enum__pages_blk_prices_v_heading_level";
  DROP TYPE "public"."enum__pages_blk_prices_v_background";
  DROP TYPE "public"."enum__pages_blk_prices_v_variant";
  DROP TYPE "public"."enum__pages_blk_faq_v_heading_level";
  DROP TYPE "public"."enum__pages_blk_faq_v_background";
  DROP TYPE "public"."enum__pages_blk_faq_v_mode";
  DROP TYPE "public"."enum__pages_blk_cta_v_buttons_kind";
  DROP TYPE "public"."enum__pages_blk_cta_v_buttons_variant";
  DROP TYPE "public"."enum__pages_blk_cta_v_buttons_form_key";
  DROP TYPE "public"."enum__pages_blk_cta_v_buttons_link_type";
  DROP TYPE "public"."enum__pages_blk_cta_v_heading_level";
  DROP TYPE "public"."enum__pages_blk_cta_v_background";
  DROP TYPE "public"."enum__pages_blk_cta_v_variant";
  DROP TYPE "public"."enum__pages_blk_cta_v_tone";
  DROP TYPE "public"."enum__pages_blk_cta_v_link_type";
  DROP TYPE "public"."enum__pages_blk_compare_v_heading_level";
  DROP TYPE "public"."enum__pages_blk_compare_v_background";
  DROP TYPE "public"."enum__pages_blk_compare_v_foot_link_type";
  DROP TYPE "public"."enum__pages_blk_download_v_heading_level";
  DROP TYPE "public"."enum__pages_blk_download_v_background";
  DROP TYPE "public"."enum__pages_blk_download_v_variant";
  DROP TYPE "public"."enum__pages_blk_holes_v_heading_level";
  DROP TYPE "public"."enum__pages_blk_holes_v_background";
  DROP TYPE "public"."enum__pages_blk_holes_v_default_thickness";
  DROP TYPE "public"."enum__pages_blk_weight_v_heading_level";
  DROP TYPE "public"."enum__pages_blk_weight_v_background";
  DROP TYPE "public"."enum__pages_blk_weight_v_default_mode";
  DROP TYPE "public"."enum__pages_blk_form_v_heading_level";
  DROP TYPE "public"."enum__pages_blk_form_v_background";
  DROP TYPE "public"."enum__pages_blk_form_v_form_key";
  DROP TYPE "public"."enum__pages_blk_form_v_variant";
  DROP TYPE "public"."enum__pages_blk_snippet_v_heading_level";
  DROP TYPE "public"."enum__pages_blk_snippet_v_background";
  DROP TYPE "public"."enum__pages_blk_stats_v_heading_level";
  DROP TYPE "public"."enum__pages_blk_stats_v_background";
  DROP TYPE "public"."enum__pages_blk_stats_v_variant";
  DROP TYPE "public"."enum__pages_blk_objects_v_heading_level";
  DROP TYPE "public"."enum__pages_blk_objects_v_background";
  DROP TYPE "public"."enum__pages_blk_objects_v_mode";
  DROP TYPE "public"."enum__pages_blk_articles_v_heading_level";
  DROP TYPE "public"."enum__pages_blk_articles_v_background";
  DROP TYPE "public"."enum__pages_blk_articles_v_mode";
  DROP TYPE "public"."enum__pages_blk_wdw_v_heading_level";
  DROP TYPE "public"."enum__pages_blk_wdw_v_background";
  DROP TYPE "public"."enum__pages_blk_systems_v_heading_level";
  DROP TYPE "public"."enum__pages_blk_systems_v_background";
  DROP TYPE "public"."enum__pages_blk_systems_v_source";
  DROP TYPE "public"."enum__pages_blk_systems_v_layout";
  DROP TYPE "public"."enum__pages_blk_gallery_v_heading_level";
  DROP TYPE "public"."enum__pages_blk_gallery_v_background";
  DROP TYPE "public"."enum__pages_blk_gallery_v_layout";
  DROP TYPE "public"."enum__pages_blk_two_cols_v_heading_level";
  DROP TYPE "public"."enum__pages_blk_two_cols_v_background";
  DROP TYPE "public"."enum__pages_blk_links_v_items_link_type";
  DROP TYPE "public"."enum__pages_blk_links_v_heading_level";
  DROP TYPE "public"."enum__pages_blk_links_v_background";
  DROP TYPE "public"."enum__pages_blk_links_v_variant";
  DROP TYPE "public"."enum__pages_blk_contacts_v_heading_level";
  DROP TYPE "public"."enum__pages_blk_contacts_v_background";
  DROP TYPE "public"."enum__pages_blk_requisites_v_heading_level";
  DROP TYPE "public"."enum__pages_blk_requisites_v_background";
  DROP TYPE "public"."enum__pages_blk_team_v_heading_level";
  DROP TYPE "public"."enum__pages_blk_team_v_background";
  DROP TYPE "public"."enum__pages_blk_team_v_empty_behavior";
  DROP TYPE "public"."enum__pages_blk_quiz_cta_v_heading_level";
  DROP TYPE "public"."enum__pages_blk_quiz_cta_v_background";
  DROP TYPE "public"."enum__pages_blk_quiz_cta_v_prefill_type";
  DROP TYPE "public"."enum__pages_blk_quiz_cta_v_prefill_thickness";
  DROP TYPE "public"."enum__pages_blk_quiz_cta_v_prefill_kind";
  DROP TYPE "public"."enum__pages_blk_quiz_cta_v_prefill_secondary_form";
  DROP TYPE "public"."enum__pages_v_version_template";
  DROP TYPE "public"."enum__pages_v_version_quiz_prefill_type";
  DROP TYPE "public"."enum__pages_v_version_quiz_prefill_thickness";
  DROP TYPE "public"."enum__pages_v_version_quiz_prefill_kind";
  DROP TYPE "public"."enum__pages_v_version_quiz_prefill_secondary_form";
  DROP TYPE "public"."enum__pages_v_version_status";
  DROP TYPE "public"."enum_articles_tools_link_type";
  DROP TYPE "public"."enum_articles_commercial_link_link_type";
  DROP TYPE "public"."enum_articles_cta_card_form_key";
  DROP TYPE "public"."enum_articles_quiz_prefill_type";
  DROP TYPE "public"."enum_articles_quiz_prefill_thickness";
  DROP TYPE "public"."enum_articles_quiz_prefill_kind";
  DROP TYPE "public"."enum_articles_quiz_prefill_secondary_form";
  DROP TYPE "public"."enum_articles_status";
  DROP TYPE "public"."enum__articles_v_version_tools_link_type";
  DROP TYPE "public"."enum__articles_v_version_commercial_link_link_type";
  DROP TYPE "public"."enum__articles_v_version_cta_card_form_key";
  DROP TYPE "public"."enum__articles_v_version_quiz_prefill_type";
  DROP TYPE "public"."enum__articles_v_version_quiz_prefill_thickness";
  DROP TYPE "public"."enum__articles_v_version_quiz_prefill_kind";
  DROP TYPE "public"."enum__articles_v_version_quiz_prefill_secondary_form";
  DROP TYPE "public"."enum__articles_v_version_status";
  DROP TYPE "public"."enum_objects_quiz_prefill_type";
  DROP TYPE "public"."enum_objects_quiz_prefill_thickness";
  DROP TYPE "public"."enum_objects_quiz_prefill_kind";
  DROP TYPE "public"."enum_objects_quiz_prefill_secondary_form";
  DROP TYPE "public"."enum_objects_status";
  DROP TYPE "public"."enum__objects_v_version_quiz_prefill_type";
  DROP TYPE "public"."enum__objects_v_version_quiz_prefill_thickness";
  DROP TYPE "public"."enum__objects_v_version_quiz_prefill_kind";
  DROP TYPE "public"."enum__objects_v_version_quiz_prefill_secondary_form";
  DROP TYPE "public"."enum__objects_v_version_status";
  DROP TYPE "public"."enum_thicknesses_blk_hero_buttons_kind";
  DROP TYPE "public"."enum_thicknesses_blk_hero_buttons_variant";
  DROP TYPE "public"."enum_thicknesses_blk_hero_buttons_form_key";
  DROP TYPE "public"."enum_thicknesses_blk_hero_buttons_link_type";
  DROP TYPE "public"."enum_thicknesses_blk_hero_variant";
  DROP TYPE "public"."enum_thicknesses_blk_hero_terms_mode";
  DROP TYPE "public"."enum_thicknesses_blk_text_heading_level";
  DROP TYPE "public"."enum_thicknesses_blk_text_background";
  DROP TYPE "public"."enum_thicknesses_blk_text_width";
  DROP TYPE "public"."enum_thicknesses_blk_table_table_cols_align";
  DROP TYPE "public"."enum_thicknesses_blk_table_heading_level";
  DROP TYPE "public"."enum_thicknesses_blk_table_background";
  DROP TYPE "public"."enum_thicknesses_blk_table_table_role";
  DROP TYPE "public"."enum_thicknesses_blk_table_table_mobile_mode";
  DROP TYPE "public"."enum_thicknesses_blk_steps_items_link_type";
  DROP TYPE "public"."enum_thicknesses_blk_steps_buttons_kind";
  DROP TYPE "public"."enum_thicknesses_blk_steps_buttons_variant";
  DROP TYPE "public"."enum_thicknesses_blk_steps_buttons_form_key";
  DROP TYPE "public"."enum_thicknesses_blk_steps_buttons_link_type";
  DROP TYPE "public"."enum_thicknesses_blk_steps_heading_level";
  DROP TYPE "public"."enum_thicknesses_blk_steps_background";
  DROP TYPE "public"."enum_thicknesses_blk_steps_variant";
  DROP TYPE "public"."enum_thicknesses_blk_callout_heading_level";
  DROP TYPE "public"."enum_thicknesses_blk_callout_background";
  DROP TYPE "public"."enum_thicknesses_blk_callout_tone";
  DROP TYPE "public"."enum_thicknesses_blk_terms_heading_level";
  DROP TYPE "public"."enum_thicknesses_blk_terms_background";
  DROP TYPE "public"."enum_thicknesses_blk_terms_mode";
  DROP TYPE "public"."enum_thicknesses_blk_terms_variant";
  DROP TYPE "public"."enum_thicknesses_blk_cards_items_link_type";
  DROP TYPE "public"."enum_thicknesses_blk_cards_items_tone";
  DROP TYPE "public"."enum_thicknesses_blk_cards_heading_level";
  DROP TYPE "public"."enum_thicknesses_blk_cards_background";
  DROP TYPE "public"."enum_thicknesses_blk_cards_layout";
  DROP TYPE "public"."enum_thicknesses_blk_coll_cards_heading_level";
  DROP TYPE "public"."enum_thicknesses_blk_coll_cards_background";
  DROP TYPE "public"."enum_thicknesses_blk_coll_cards_source";
  DROP TYPE "public"."enum_thicknesses_blk_coll_cards_mode";
  DROP TYPE "public"."enum_thicknesses_blk_coll_cards_group";
  DROP TYPE "public"."enum_thicknesses_blk_coll_cards_columns";
  DROP TYPE "public"."enum_thicknesses_blk_prices_heading_level";
  DROP TYPE "public"."enum_thicknesses_blk_prices_background";
  DROP TYPE "public"."enum_thicknesses_blk_prices_variant";
  DROP TYPE "public"."enum_thicknesses_blk_faq_heading_level";
  DROP TYPE "public"."enum_thicknesses_blk_faq_background";
  DROP TYPE "public"."enum_thicknesses_blk_faq_mode";
  DROP TYPE "public"."enum_thicknesses_blk_cta_buttons_kind";
  DROP TYPE "public"."enum_thicknesses_blk_cta_buttons_variant";
  DROP TYPE "public"."enum_thicknesses_blk_cta_buttons_form_key";
  DROP TYPE "public"."enum_thicknesses_blk_cta_buttons_link_type";
  DROP TYPE "public"."enum_thicknesses_blk_cta_heading_level";
  DROP TYPE "public"."enum_thicknesses_blk_cta_background";
  DROP TYPE "public"."enum_thicknesses_blk_cta_variant";
  DROP TYPE "public"."enum_thicknesses_blk_cta_tone";
  DROP TYPE "public"."enum_thicknesses_blk_cta_link_type";
  DROP TYPE "public"."enum_thicknesses_blk_compare_heading_level";
  DROP TYPE "public"."enum_thicknesses_blk_compare_background";
  DROP TYPE "public"."enum_thicknesses_blk_compare_foot_link_type";
  DROP TYPE "public"."enum_thicknesses_blk_download_heading_level";
  DROP TYPE "public"."enum_thicknesses_blk_download_background";
  DROP TYPE "public"."enum_thicknesses_blk_download_variant";
  DROP TYPE "public"."enum_thicknesses_blk_holes_heading_level";
  DROP TYPE "public"."enum_thicknesses_blk_holes_background";
  DROP TYPE "public"."enum_thicknesses_blk_holes_default_thickness";
  DROP TYPE "public"."enum_thicknesses_blk_weight_heading_level";
  DROP TYPE "public"."enum_thicknesses_blk_weight_background";
  DROP TYPE "public"."enum_thicknesses_blk_weight_default_mode";
  DROP TYPE "public"."enum_thicknesses_blk_form_heading_level";
  DROP TYPE "public"."enum_thicknesses_blk_form_background";
  DROP TYPE "public"."enum_thicknesses_blk_form_form_key";
  DROP TYPE "public"."enum_thicknesses_blk_form_variant";
  DROP TYPE "public"."enum_thicknesses_blk_snippet_heading_level";
  DROP TYPE "public"."enum_thicknesses_blk_snippet_background";
  DROP TYPE "public"."enum_thicknesses_blk_stats_heading_level";
  DROP TYPE "public"."enum_thicknesses_blk_stats_background";
  DROP TYPE "public"."enum_thicknesses_blk_stats_variant";
  DROP TYPE "public"."enum_thicknesses_blk_objects_heading_level";
  DROP TYPE "public"."enum_thicknesses_blk_objects_background";
  DROP TYPE "public"."enum_thicknesses_blk_objects_mode";
  DROP TYPE "public"."enum_thicknesses_blk_articles_heading_level";
  DROP TYPE "public"."enum_thicknesses_blk_articles_background";
  DROP TYPE "public"."enum_thicknesses_blk_articles_mode";
  DROP TYPE "public"."enum_thicknesses_blk_wdw_heading_level";
  DROP TYPE "public"."enum_thicknesses_blk_wdw_background";
  DROP TYPE "public"."enum_thicknesses_blk_systems_heading_level";
  DROP TYPE "public"."enum_thicknesses_blk_systems_background";
  DROP TYPE "public"."enum_thicknesses_blk_systems_source";
  DROP TYPE "public"."enum_thicknesses_blk_systems_layout";
  DROP TYPE "public"."enum_thicknesses_blk_gallery_heading_level";
  DROP TYPE "public"."enum_thicknesses_blk_gallery_background";
  DROP TYPE "public"."enum_thicknesses_blk_gallery_layout";
  DROP TYPE "public"."enum_thicknesses_blk_two_cols_heading_level";
  DROP TYPE "public"."enum_thicknesses_blk_two_cols_background";
  DROP TYPE "public"."enum_thicknesses_blk_links_items_link_type";
  DROP TYPE "public"."enum_thicknesses_blk_links_heading_level";
  DROP TYPE "public"."enum_thicknesses_blk_links_background";
  DROP TYPE "public"."enum_thicknesses_blk_links_variant";
  DROP TYPE "public"."enum_thicknesses_blk_contacts_heading_level";
  DROP TYPE "public"."enum_thicknesses_blk_contacts_background";
  DROP TYPE "public"."enum_thicknesses_blk_requisites_heading_level";
  DROP TYPE "public"."enum_thicknesses_blk_requisites_background";
  DROP TYPE "public"."enum_thicknesses_blk_team_heading_level";
  DROP TYPE "public"."enum_thicknesses_blk_team_background";
  DROP TYPE "public"."enum_thicknesses_blk_team_empty_behavior";
  DROP TYPE "public"."enum_thicknesses_blk_quiz_cta_heading_level";
  DROP TYPE "public"."enum_thicknesses_blk_quiz_cta_background";
  DROP TYPE "public"."enum_thicknesses_blk_quiz_cta_prefill_type";
  DROP TYPE "public"."enum_thicknesses_blk_quiz_cta_prefill_thickness";
  DROP TYPE "public"."enum_thicknesses_blk_quiz_cta_prefill_kind";
  DROP TYPE "public"."enum_thicknesses_blk_quiz_cta_prefill_secondary_form";
  DROP TYPE "public"."enum_thicknesses_quiz_prefill_type";
  DROP TYPE "public"."enum_thicknesses_quiz_prefill_thickness";
  DROP TYPE "public"."enum_thicknesses_quiz_prefill_kind";
  DROP TYPE "public"."enum_thicknesses_quiz_prefill_secondary_form";
  DROP TYPE "public"."enum_glass_types_variants_swatch_kind";
  DROP TYPE "public"."enum_glass_types_tables_cols_align";
  DROP TYPE "public"."enum_glass_types_tables_role";
  DROP TYPE "public"."enum_glass_types_tables_mobile_mode";
  DROP TYPE "public"."enum_glass_types_applications_link_type";
  DROP TYPE "public"."enum_glass_types_related_links_link_type";
  DROP TYPE "public"."enum_glass_types_blk_hero_buttons_kind";
  DROP TYPE "public"."enum_glass_types_blk_hero_buttons_variant";
  DROP TYPE "public"."enum_glass_types_blk_hero_buttons_form_key";
  DROP TYPE "public"."enum_glass_types_blk_hero_buttons_link_type";
  DROP TYPE "public"."enum_glass_types_blk_hero_variant";
  DROP TYPE "public"."enum_glass_types_blk_hero_terms_mode";
  DROP TYPE "public"."enum_glass_types_blk_text_heading_level";
  DROP TYPE "public"."enum_glass_types_blk_text_background";
  DROP TYPE "public"."enum_glass_types_blk_text_width";
  DROP TYPE "public"."enum_glass_types_blk_table_table_cols_align";
  DROP TYPE "public"."enum_glass_types_blk_table_heading_level";
  DROP TYPE "public"."enum_glass_types_blk_table_background";
  DROP TYPE "public"."enum_glass_types_blk_table_table_role";
  DROP TYPE "public"."enum_glass_types_blk_table_table_mobile_mode";
  DROP TYPE "public"."enum_glass_types_blk_steps_items_link_type";
  DROP TYPE "public"."enum_glass_types_blk_steps_buttons_kind";
  DROP TYPE "public"."enum_glass_types_blk_steps_buttons_variant";
  DROP TYPE "public"."enum_glass_types_blk_steps_buttons_form_key";
  DROP TYPE "public"."enum_glass_types_blk_steps_buttons_link_type";
  DROP TYPE "public"."enum_glass_types_blk_steps_heading_level";
  DROP TYPE "public"."enum_glass_types_blk_steps_background";
  DROP TYPE "public"."enum_glass_types_blk_steps_variant";
  DROP TYPE "public"."enum_glass_types_blk_callout_heading_level";
  DROP TYPE "public"."enum_glass_types_blk_callout_background";
  DROP TYPE "public"."enum_glass_types_blk_callout_tone";
  DROP TYPE "public"."enum_glass_types_blk_terms_heading_level";
  DROP TYPE "public"."enum_glass_types_blk_terms_background";
  DROP TYPE "public"."enum_glass_types_blk_terms_mode";
  DROP TYPE "public"."enum_glass_types_blk_terms_variant";
  DROP TYPE "public"."enum_glass_types_blk_cards_items_link_type";
  DROP TYPE "public"."enum_glass_types_blk_cards_items_tone";
  DROP TYPE "public"."enum_glass_types_blk_cards_heading_level";
  DROP TYPE "public"."enum_glass_types_blk_cards_background";
  DROP TYPE "public"."enum_glass_types_blk_cards_layout";
  DROP TYPE "public"."enum_glass_types_blk_coll_cards_heading_level";
  DROP TYPE "public"."enum_glass_types_blk_coll_cards_background";
  DROP TYPE "public"."enum_glass_types_blk_coll_cards_source";
  DROP TYPE "public"."enum_glass_types_blk_coll_cards_mode";
  DROP TYPE "public"."enum_glass_types_blk_coll_cards_group";
  DROP TYPE "public"."enum_glass_types_blk_coll_cards_columns";
  DROP TYPE "public"."enum_glass_types_blk_prices_heading_level";
  DROP TYPE "public"."enum_glass_types_blk_prices_background";
  DROP TYPE "public"."enum_glass_types_blk_prices_variant";
  DROP TYPE "public"."enum_glass_types_blk_faq_heading_level";
  DROP TYPE "public"."enum_glass_types_blk_faq_background";
  DROP TYPE "public"."enum_glass_types_blk_faq_mode";
  DROP TYPE "public"."enum_glass_types_blk_cta_buttons_kind";
  DROP TYPE "public"."enum_glass_types_blk_cta_buttons_variant";
  DROP TYPE "public"."enum_glass_types_blk_cta_buttons_form_key";
  DROP TYPE "public"."enum_glass_types_blk_cta_buttons_link_type";
  DROP TYPE "public"."enum_glass_types_blk_cta_heading_level";
  DROP TYPE "public"."enum_glass_types_blk_cta_background";
  DROP TYPE "public"."enum_glass_types_blk_cta_variant";
  DROP TYPE "public"."enum_glass_types_blk_cta_tone";
  DROP TYPE "public"."enum_glass_types_blk_cta_link_type";
  DROP TYPE "public"."enum_glass_types_blk_compare_heading_level";
  DROP TYPE "public"."enum_glass_types_blk_compare_background";
  DROP TYPE "public"."enum_glass_types_blk_compare_foot_link_type";
  DROP TYPE "public"."enum_glass_types_blk_download_heading_level";
  DROP TYPE "public"."enum_glass_types_blk_download_background";
  DROP TYPE "public"."enum_glass_types_blk_download_variant";
  DROP TYPE "public"."enum_glass_types_blk_holes_heading_level";
  DROP TYPE "public"."enum_glass_types_blk_holes_background";
  DROP TYPE "public"."enum_glass_types_blk_holes_default_thickness";
  DROP TYPE "public"."enum_glass_types_blk_weight_heading_level";
  DROP TYPE "public"."enum_glass_types_blk_weight_background";
  DROP TYPE "public"."enum_glass_types_blk_weight_default_mode";
  DROP TYPE "public"."enum_glass_types_blk_form_heading_level";
  DROP TYPE "public"."enum_glass_types_blk_form_background";
  DROP TYPE "public"."enum_glass_types_blk_form_form_key";
  DROP TYPE "public"."enum_glass_types_blk_form_variant";
  DROP TYPE "public"."enum_glass_types_blk_snippet_heading_level";
  DROP TYPE "public"."enum_glass_types_blk_snippet_background";
  DROP TYPE "public"."enum_glass_types_blk_stats_heading_level";
  DROP TYPE "public"."enum_glass_types_blk_stats_background";
  DROP TYPE "public"."enum_glass_types_blk_stats_variant";
  DROP TYPE "public"."enum_glass_types_blk_objects_heading_level";
  DROP TYPE "public"."enum_glass_types_blk_objects_background";
  DROP TYPE "public"."enum_glass_types_blk_objects_mode";
  DROP TYPE "public"."enum_glass_types_blk_articles_heading_level";
  DROP TYPE "public"."enum_glass_types_blk_articles_background";
  DROP TYPE "public"."enum_glass_types_blk_articles_mode";
  DROP TYPE "public"."enum_glass_types_blk_wdw_heading_level";
  DROP TYPE "public"."enum_glass_types_blk_wdw_background";
  DROP TYPE "public"."enum_glass_types_blk_systems_heading_level";
  DROP TYPE "public"."enum_glass_types_blk_systems_background";
  DROP TYPE "public"."enum_glass_types_blk_systems_source";
  DROP TYPE "public"."enum_glass_types_blk_systems_layout";
  DROP TYPE "public"."enum_glass_types_blk_gallery_heading_level";
  DROP TYPE "public"."enum_glass_types_blk_gallery_background";
  DROP TYPE "public"."enum_glass_types_blk_gallery_layout";
  DROP TYPE "public"."enum_glass_types_blk_two_cols_heading_level";
  DROP TYPE "public"."enum_glass_types_blk_two_cols_background";
  DROP TYPE "public"."enum_glass_types_blk_links_items_link_type";
  DROP TYPE "public"."enum_glass_types_blk_links_heading_level";
  DROP TYPE "public"."enum_glass_types_blk_links_background";
  DROP TYPE "public"."enum_glass_types_blk_links_variant";
  DROP TYPE "public"."enum_glass_types_blk_contacts_heading_level";
  DROP TYPE "public"."enum_glass_types_blk_contacts_background";
  DROP TYPE "public"."enum_glass_types_blk_requisites_heading_level";
  DROP TYPE "public"."enum_glass_types_blk_requisites_background";
  DROP TYPE "public"."enum_glass_types_blk_team_heading_level";
  DROP TYPE "public"."enum_glass_types_blk_team_background";
  DROP TYPE "public"."enum_glass_types_blk_team_empty_behavior";
  DROP TYPE "public"."enum_glass_types_blk_quiz_cta_heading_level";
  DROP TYPE "public"."enum_glass_types_blk_quiz_cta_background";
  DROP TYPE "public"."enum_glass_types_blk_quiz_cta_prefill_type";
  DROP TYPE "public"."enum_glass_types_blk_quiz_cta_prefill_thickness";
  DROP TYPE "public"."enum_glass_types_blk_quiz_cta_prefill_kind";
  DROP TYPE "public"."enum_glass_types_blk_quiz_cta_prefill_secondary_form";
  DROP TYPE "public"."enum_glass_types_url_base";
  DROP TYPE "public"."enum_glass_types_quiz_prefill_type";
  DROP TYPE "public"."enum_glass_types_quiz_prefill_thickness";
  DROP TYPE "public"."enum_glass_types_quiz_prefill_kind";
  DROP TYPE "public"."enum_glass_types_quiz_prefill_secondary_form";
  DROP TYPE "public"."enum_glass_types_status";
  DROP TYPE "public"."enum__glass_types_v_version_variants_swatch_kind";
  DROP TYPE "public"."enum__glass_types_tables_cols_v_align";
  DROP TYPE "public"."enum__glass_types_v_version_tables_role";
  DROP TYPE "public"."enum__glass_types_v_version_tables_mobile_mode";
  DROP TYPE "public"."enum__glass_types_v_version_applications_link_type";
  DROP TYPE "public"."enum__glass_types_v_version_related_links_link_type";
  DROP TYPE "public"."enum__glass_types_blk_hero_v_buttons_kind";
  DROP TYPE "public"."enum__glass_types_blk_hero_v_buttons_variant";
  DROP TYPE "public"."enum__glass_types_blk_hero_v_buttons_form_key";
  DROP TYPE "public"."enum__glass_types_blk_hero_v_buttons_link_type";
  DROP TYPE "public"."enum__glass_types_blk_hero_v_variant";
  DROP TYPE "public"."enum__glass_types_blk_hero_v_terms_mode";
  DROP TYPE "public"."enum__glass_types_blk_text_v_heading_level";
  DROP TYPE "public"."enum__glass_types_blk_text_v_background";
  DROP TYPE "public"."enum__glass_types_blk_text_v_width";
  DROP TYPE "public"."enum__glass_types_blk_table_table_cols_v_align";
  DROP TYPE "public"."enum__glass_types_blk_table_v_heading_level";
  DROP TYPE "public"."enum__glass_types_blk_table_v_background";
  DROP TYPE "public"."enum__glass_types_blk_table_v_table_role";
  DROP TYPE "public"."enum__glass_types_blk_table_v_table_mobile_mode";
  DROP TYPE "public"."enum__glass_types_blk_steps_v_items_link_type";
  DROP TYPE "public"."enum__glass_types_blk_steps_v_buttons_kind";
  DROP TYPE "public"."enum__glass_types_blk_steps_v_buttons_variant";
  DROP TYPE "public"."enum__glass_types_blk_steps_v_buttons_form_key";
  DROP TYPE "public"."enum__glass_types_blk_steps_v_buttons_link_type";
  DROP TYPE "public"."enum__glass_types_blk_steps_v_heading_level";
  DROP TYPE "public"."enum__glass_types_blk_steps_v_background";
  DROP TYPE "public"."enum__glass_types_blk_steps_v_variant";
  DROP TYPE "public"."enum__glass_types_blk_callout_v_heading_level";
  DROP TYPE "public"."enum__glass_types_blk_callout_v_background";
  DROP TYPE "public"."enum__glass_types_blk_callout_v_tone";
  DROP TYPE "public"."enum__glass_types_blk_terms_v_heading_level";
  DROP TYPE "public"."enum__glass_types_blk_terms_v_background";
  DROP TYPE "public"."enum__glass_types_blk_terms_v_mode";
  DROP TYPE "public"."enum__glass_types_blk_terms_v_variant";
  DROP TYPE "public"."enum__glass_types_blk_cards_v_items_link_type";
  DROP TYPE "public"."enum__glass_types_blk_cards_v_items_tone";
  DROP TYPE "public"."enum__glass_types_blk_cards_v_heading_level";
  DROP TYPE "public"."enum__glass_types_blk_cards_v_background";
  DROP TYPE "public"."enum__glass_types_blk_cards_v_layout";
  DROP TYPE "public"."enum__glass_types_blk_coll_cards_v_heading_level";
  DROP TYPE "public"."enum__glass_types_blk_coll_cards_v_background";
  DROP TYPE "public"."enum__glass_types_blk_coll_cards_v_source";
  DROP TYPE "public"."enum__glass_types_blk_coll_cards_v_mode";
  DROP TYPE "public"."enum__glass_types_blk_coll_cards_v_group";
  DROP TYPE "public"."enum__glass_types_blk_coll_cards_v_columns";
  DROP TYPE "public"."enum__glass_types_blk_prices_v_heading_level";
  DROP TYPE "public"."enum__glass_types_blk_prices_v_background";
  DROP TYPE "public"."enum__glass_types_blk_prices_v_variant";
  DROP TYPE "public"."enum__glass_types_blk_faq_v_heading_level";
  DROP TYPE "public"."enum__glass_types_blk_faq_v_background";
  DROP TYPE "public"."enum__glass_types_blk_faq_v_mode";
  DROP TYPE "public"."enum__glass_types_blk_cta_v_buttons_kind";
  DROP TYPE "public"."enum__glass_types_blk_cta_v_buttons_variant";
  DROP TYPE "public"."enum__glass_types_blk_cta_v_buttons_form_key";
  DROP TYPE "public"."enum__glass_types_blk_cta_v_buttons_link_type";
  DROP TYPE "public"."enum__glass_types_blk_cta_v_heading_level";
  DROP TYPE "public"."enum__glass_types_blk_cta_v_background";
  DROP TYPE "public"."enum__glass_types_blk_cta_v_variant";
  DROP TYPE "public"."enum__glass_types_blk_cta_v_tone";
  DROP TYPE "public"."enum__glass_types_blk_cta_v_link_type";
  DROP TYPE "public"."enum__glass_types_blk_compare_v_heading_level";
  DROP TYPE "public"."enum__glass_types_blk_compare_v_background";
  DROP TYPE "public"."enum__glass_types_blk_compare_v_foot_link_type";
  DROP TYPE "public"."enum__glass_types_blk_download_v_heading_level";
  DROP TYPE "public"."enum__glass_types_blk_download_v_background";
  DROP TYPE "public"."enum__glass_types_blk_download_v_variant";
  DROP TYPE "public"."enum__glass_types_blk_holes_v_heading_level";
  DROP TYPE "public"."enum__glass_types_blk_holes_v_background";
  DROP TYPE "public"."enum__glass_types_blk_holes_v_default_thickness";
  DROP TYPE "public"."enum__glass_types_blk_weight_v_heading_level";
  DROP TYPE "public"."enum__glass_types_blk_weight_v_background";
  DROP TYPE "public"."enum__glass_types_blk_weight_v_default_mode";
  DROP TYPE "public"."enum__glass_types_blk_form_v_heading_level";
  DROP TYPE "public"."enum__glass_types_blk_form_v_background";
  DROP TYPE "public"."enum__glass_types_blk_form_v_form_key";
  DROP TYPE "public"."enum__glass_types_blk_form_v_variant";
  DROP TYPE "public"."enum__glass_types_blk_snippet_v_heading_level";
  DROP TYPE "public"."enum__glass_types_blk_snippet_v_background";
  DROP TYPE "public"."enum__glass_types_blk_stats_v_heading_level";
  DROP TYPE "public"."enum__glass_types_blk_stats_v_background";
  DROP TYPE "public"."enum__glass_types_blk_stats_v_variant";
  DROP TYPE "public"."enum__glass_types_blk_objects_v_heading_level";
  DROP TYPE "public"."enum__glass_types_blk_objects_v_background";
  DROP TYPE "public"."enum__glass_types_blk_objects_v_mode";
  DROP TYPE "public"."enum__glass_types_blk_articles_v_heading_level";
  DROP TYPE "public"."enum__glass_types_blk_articles_v_background";
  DROP TYPE "public"."enum__glass_types_blk_articles_v_mode";
  DROP TYPE "public"."enum__glass_types_blk_wdw_v_heading_level";
  DROP TYPE "public"."enum__glass_types_blk_wdw_v_background";
  DROP TYPE "public"."enum__glass_types_blk_systems_v_heading_level";
  DROP TYPE "public"."enum__glass_types_blk_systems_v_background";
  DROP TYPE "public"."enum__glass_types_blk_systems_v_source";
  DROP TYPE "public"."enum__glass_types_blk_systems_v_layout";
  DROP TYPE "public"."enum__glass_types_blk_gallery_v_heading_level";
  DROP TYPE "public"."enum__glass_types_blk_gallery_v_background";
  DROP TYPE "public"."enum__glass_types_blk_gallery_v_layout";
  DROP TYPE "public"."enum__glass_types_blk_two_cols_v_heading_level";
  DROP TYPE "public"."enum__glass_types_blk_two_cols_v_background";
  DROP TYPE "public"."enum__glass_types_blk_links_v_items_link_type";
  DROP TYPE "public"."enum__glass_types_blk_links_v_heading_level";
  DROP TYPE "public"."enum__glass_types_blk_links_v_background";
  DROP TYPE "public"."enum__glass_types_blk_links_v_variant";
  DROP TYPE "public"."enum__glass_types_blk_contacts_v_heading_level";
  DROP TYPE "public"."enum__glass_types_blk_contacts_v_background";
  DROP TYPE "public"."enum__glass_types_blk_requisites_v_heading_level";
  DROP TYPE "public"."enum__glass_types_blk_requisites_v_background";
  DROP TYPE "public"."enum__glass_types_blk_team_v_heading_level";
  DROP TYPE "public"."enum__glass_types_blk_team_v_background";
  DROP TYPE "public"."enum__glass_types_blk_team_v_empty_behavior";
  DROP TYPE "public"."enum__glass_types_blk_quiz_cta_v_heading_level";
  DROP TYPE "public"."enum__glass_types_blk_quiz_cta_v_background";
  DROP TYPE "public"."enum__glass_types_blk_quiz_cta_v_prefill_type";
  DROP TYPE "public"."enum__glass_types_blk_quiz_cta_v_prefill_thickness";
  DROP TYPE "public"."enum__glass_types_blk_quiz_cta_v_prefill_kind";
  DROP TYPE "public"."enum__glass_types_blk_quiz_cta_v_prefill_secondary_form";
  DROP TYPE "public"."enum__glass_types_v_version_url_base";
  DROP TYPE "public"."enum__glass_types_v_version_quiz_prefill_type";
  DROP TYPE "public"."enum__glass_types_v_version_quiz_prefill_thickness";
  DROP TYPE "public"."enum__glass_types_v_version_quiz_prefill_kind";
  DROP TYPE "public"."enum__glass_types_v_version_quiz_prefill_secondary_form";
  DROP TYPE "public"."enum__glass_types_v_version_status";
  DROP TYPE "public"."enum_processing_services_tables_cols_align";
  DROP TYPE "public"."enum_processing_services_tables_role";
  DROP TYPE "public"."enum_processing_services_tables_mobile_mode";
  DROP TYPE "public"."enum_processing_services_callouts_tone";
  DROP TYPE "public"."enum_processing_services_related_links_link_type";
  DROP TYPE "public"."enum_processing_services_blk_hero_buttons_kind";
  DROP TYPE "public"."enum_processing_services_blk_hero_buttons_variant";
  DROP TYPE "public"."enum_processing_services_blk_hero_buttons_form_key";
  DROP TYPE "public"."enum_processing_services_blk_hero_buttons_link_type";
  DROP TYPE "public"."enum_processing_services_blk_hero_variant";
  DROP TYPE "public"."enum_processing_services_blk_hero_terms_mode";
  DROP TYPE "public"."enum_processing_services_blk_text_heading_level";
  DROP TYPE "public"."enum_processing_services_blk_text_background";
  DROP TYPE "public"."enum_processing_services_blk_text_width";
  DROP TYPE "public"."enum_processing_services_blk_table_table_cols_align";
  DROP TYPE "public"."enum_processing_services_blk_table_heading_level";
  DROP TYPE "public"."enum_processing_services_blk_table_background";
  DROP TYPE "public"."enum_processing_services_blk_table_table_role";
  DROP TYPE "public"."enum_processing_services_blk_table_table_mobile_mode";
  DROP TYPE "public"."enum_processing_services_blk_steps_items_link_type";
  DROP TYPE "public"."enum_processing_services_blk_steps_buttons_kind";
  DROP TYPE "public"."enum_processing_services_blk_steps_buttons_variant";
  DROP TYPE "public"."enum_processing_services_blk_steps_buttons_form_key";
  DROP TYPE "public"."enum_processing_services_blk_steps_buttons_link_type";
  DROP TYPE "public"."enum_processing_services_blk_steps_heading_level";
  DROP TYPE "public"."enum_processing_services_blk_steps_background";
  DROP TYPE "public"."enum_processing_services_blk_steps_variant";
  DROP TYPE "public"."enum_processing_services_blk_callout_heading_level";
  DROP TYPE "public"."enum_processing_services_blk_callout_background";
  DROP TYPE "public"."enum_processing_services_blk_callout_tone";
  DROP TYPE "public"."enum_processing_services_blk_terms_heading_level";
  DROP TYPE "public"."enum_processing_services_blk_terms_background";
  DROP TYPE "public"."enum_processing_services_blk_terms_mode";
  DROP TYPE "public"."enum_processing_services_blk_terms_variant";
  DROP TYPE "public"."enum_processing_services_blk_cards_items_link_type";
  DROP TYPE "public"."enum_processing_services_blk_cards_items_tone";
  DROP TYPE "public"."enum_processing_services_blk_cards_heading_level";
  DROP TYPE "public"."enum_processing_services_blk_cards_background";
  DROP TYPE "public"."enum_processing_services_blk_cards_layout";
  DROP TYPE "public"."enum_processing_services_blk_coll_cards_heading_level";
  DROP TYPE "public"."enum_processing_services_blk_coll_cards_background";
  DROP TYPE "public"."enum_processing_services_blk_coll_cards_source";
  DROP TYPE "public"."enum_processing_services_blk_coll_cards_mode";
  DROP TYPE "public"."enum_processing_services_blk_coll_cards_group";
  DROP TYPE "public"."enum_processing_services_blk_coll_cards_columns";
  DROP TYPE "public"."enum_processing_services_blk_prices_heading_level";
  DROP TYPE "public"."enum_processing_services_blk_prices_background";
  DROP TYPE "public"."enum_processing_services_blk_prices_variant";
  DROP TYPE "public"."enum_processing_services_blk_faq_heading_level";
  DROP TYPE "public"."enum_processing_services_blk_faq_background";
  DROP TYPE "public"."enum_processing_services_blk_faq_mode";
  DROP TYPE "public"."enum_processing_services_blk_cta_buttons_kind";
  DROP TYPE "public"."enum_processing_services_blk_cta_buttons_variant";
  DROP TYPE "public"."enum_processing_services_blk_cta_buttons_form_key";
  DROP TYPE "public"."enum_processing_services_blk_cta_buttons_link_type";
  DROP TYPE "public"."enum_processing_services_blk_cta_heading_level";
  DROP TYPE "public"."enum_processing_services_blk_cta_background";
  DROP TYPE "public"."enum_processing_services_blk_cta_variant";
  DROP TYPE "public"."enum_processing_services_blk_cta_tone";
  DROP TYPE "public"."enum_processing_services_blk_cta_link_type";
  DROP TYPE "public"."enum_processing_services_blk_compare_heading_level";
  DROP TYPE "public"."enum_processing_services_blk_compare_background";
  DROP TYPE "public"."enum_processing_services_blk_compare_foot_link_type";
  DROP TYPE "public"."enum_processing_services_blk_download_heading_level";
  DROP TYPE "public"."enum_processing_services_blk_download_background";
  DROP TYPE "public"."enum_processing_services_blk_download_variant";
  DROP TYPE "public"."enum_processing_services_blk_holes_heading_level";
  DROP TYPE "public"."enum_processing_services_blk_holes_background";
  DROP TYPE "public"."enum_processing_services_blk_holes_default_thickness";
  DROP TYPE "public"."enum_processing_services_blk_weight_heading_level";
  DROP TYPE "public"."enum_processing_services_blk_weight_background";
  DROP TYPE "public"."enum_processing_services_blk_weight_default_mode";
  DROP TYPE "public"."enum_processing_services_blk_form_heading_level";
  DROP TYPE "public"."enum_processing_services_blk_form_background";
  DROP TYPE "public"."enum_processing_services_blk_form_form_key";
  DROP TYPE "public"."enum_processing_services_blk_form_variant";
  DROP TYPE "public"."enum_processing_services_blk_snippet_heading_level";
  DROP TYPE "public"."enum_processing_services_blk_snippet_background";
  DROP TYPE "public"."enum_processing_services_blk_stats_heading_level";
  DROP TYPE "public"."enum_processing_services_blk_stats_background";
  DROP TYPE "public"."enum_processing_services_blk_stats_variant";
  DROP TYPE "public"."enum_processing_services_blk_objects_heading_level";
  DROP TYPE "public"."enum_processing_services_blk_objects_background";
  DROP TYPE "public"."enum_processing_services_blk_objects_mode";
  DROP TYPE "public"."enum_processing_services_blk_articles_heading_level";
  DROP TYPE "public"."enum_processing_services_blk_articles_background";
  DROP TYPE "public"."enum_processing_services_blk_articles_mode";
  DROP TYPE "public"."enum_processing_services_blk_wdw_heading_level";
  DROP TYPE "public"."enum_processing_services_blk_wdw_background";
  DROP TYPE "public"."enum_processing_services_blk_systems_heading_level";
  DROP TYPE "public"."enum_processing_services_blk_systems_background";
  DROP TYPE "public"."enum_processing_services_blk_systems_source";
  DROP TYPE "public"."enum_processing_services_blk_systems_layout";
  DROP TYPE "public"."enum_processing_services_blk_gallery_heading_level";
  DROP TYPE "public"."enum_processing_services_blk_gallery_background";
  DROP TYPE "public"."enum_processing_services_blk_gallery_layout";
  DROP TYPE "public"."enum_processing_services_blk_two_cols_heading_level";
  DROP TYPE "public"."enum_processing_services_blk_two_cols_background";
  DROP TYPE "public"."enum_processing_services_blk_links_items_link_type";
  DROP TYPE "public"."enum_processing_services_blk_links_heading_level";
  DROP TYPE "public"."enum_processing_services_blk_links_background";
  DROP TYPE "public"."enum_processing_services_blk_links_variant";
  DROP TYPE "public"."enum_processing_services_blk_contacts_heading_level";
  DROP TYPE "public"."enum_processing_services_blk_contacts_background";
  DROP TYPE "public"."enum_processing_services_blk_requisites_heading_level";
  DROP TYPE "public"."enum_processing_services_blk_requisites_background";
  DROP TYPE "public"."enum_processing_services_blk_team_heading_level";
  DROP TYPE "public"."enum_processing_services_blk_team_background";
  DROP TYPE "public"."enum_processing_services_blk_team_empty_behavior";
  DROP TYPE "public"."enum_processing_services_blk_quiz_cta_heading_level";
  DROP TYPE "public"."enum_processing_services_blk_quiz_cta_background";
  DROP TYPE "public"."enum_processing_services_blk_quiz_cta_prefill_type";
  DROP TYPE "public"."enum_processing_services_blk_quiz_cta_prefill_thickness";
  DROP TYPE "public"."enum_processing_services_blk_quiz_cta_prefill_kind";
  DROP TYPE "public"."enum_processing_services_blk_quiz_cta_prefill_secondary_form";
  DROP TYPE "public"."enum_processing_services_quiz_prefill_type";
  DROP TYPE "public"."enum_processing_services_quiz_prefill_thickness";
  DROP TYPE "public"."enum_processing_services_quiz_prefill_kind";
  DROP TYPE "public"."enum_processing_services_quiz_prefill_secondary_form";
  DROP TYPE "public"."enum_constructions_tables_cols_align";
  DROP TYPE "public"."enum_constructions_tables_role";
  DROP TYPE "public"."enum_constructions_tables_mobile_mode";
  DROP TYPE "public"."enum_constructions_blk_hero_buttons_kind";
  DROP TYPE "public"."enum_constructions_blk_hero_buttons_variant";
  DROP TYPE "public"."enum_constructions_blk_hero_buttons_form_key";
  DROP TYPE "public"."enum_constructions_blk_hero_buttons_link_type";
  DROP TYPE "public"."enum_constructions_blk_hero_variant";
  DROP TYPE "public"."enum_constructions_blk_hero_terms_mode";
  DROP TYPE "public"."enum_constructions_blk_text_heading_level";
  DROP TYPE "public"."enum_constructions_blk_text_background";
  DROP TYPE "public"."enum_constructions_blk_text_width";
  DROP TYPE "public"."enum_constructions_blk_table_table_cols_align";
  DROP TYPE "public"."enum_constructions_blk_table_heading_level";
  DROP TYPE "public"."enum_constructions_blk_table_background";
  DROP TYPE "public"."enum_constructions_blk_table_table_role";
  DROP TYPE "public"."enum_constructions_blk_table_table_mobile_mode";
  DROP TYPE "public"."enum_constructions_blk_steps_items_link_type";
  DROP TYPE "public"."enum_constructions_blk_steps_buttons_kind";
  DROP TYPE "public"."enum_constructions_blk_steps_buttons_variant";
  DROP TYPE "public"."enum_constructions_blk_steps_buttons_form_key";
  DROP TYPE "public"."enum_constructions_blk_steps_buttons_link_type";
  DROP TYPE "public"."enum_constructions_blk_steps_heading_level";
  DROP TYPE "public"."enum_constructions_blk_steps_background";
  DROP TYPE "public"."enum_constructions_blk_steps_variant";
  DROP TYPE "public"."enum_constructions_blk_callout_heading_level";
  DROP TYPE "public"."enum_constructions_blk_callout_background";
  DROP TYPE "public"."enum_constructions_blk_callout_tone";
  DROP TYPE "public"."enum_constructions_blk_terms_heading_level";
  DROP TYPE "public"."enum_constructions_blk_terms_background";
  DROP TYPE "public"."enum_constructions_blk_terms_mode";
  DROP TYPE "public"."enum_constructions_blk_terms_variant";
  DROP TYPE "public"."enum_constructions_blk_cards_items_link_type";
  DROP TYPE "public"."enum_constructions_blk_cards_items_tone";
  DROP TYPE "public"."enum_constructions_blk_cards_heading_level";
  DROP TYPE "public"."enum_constructions_blk_cards_background";
  DROP TYPE "public"."enum_constructions_blk_cards_layout";
  DROP TYPE "public"."enum_constructions_blk_coll_cards_heading_level";
  DROP TYPE "public"."enum_constructions_blk_coll_cards_background";
  DROP TYPE "public"."enum_constructions_blk_coll_cards_source";
  DROP TYPE "public"."enum_constructions_blk_coll_cards_mode";
  DROP TYPE "public"."enum_constructions_blk_coll_cards_group";
  DROP TYPE "public"."enum_constructions_blk_coll_cards_columns";
  DROP TYPE "public"."enum_constructions_blk_prices_heading_level";
  DROP TYPE "public"."enum_constructions_blk_prices_background";
  DROP TYPE "public"."enum_constructions_blk_prices_variant";
  DROP TYPE "public"."enum_constructions_blk_faq_heading_level";
  DROP TYPE "public"."enum_constructions_blk_faq_background";
  DROP TYPE "public"."enum_constructions_blk_faq_mode";
  DROP TYPE "public"."enum_constructions_blk_cta_buttons_kind";
  DROP TYPE "public"."enum_constructions_blk_cta_buttons_variant";
  DROP TYPE "public"."enum_constructions_blk_cta_buttons_form_key";
  DROP TYPE "public"."enum_constructions_blk_cta_buttons_link_type";
  DROP TYPE "public"."enum_constructions_blk_cta_heading_level";
  DROP TYPE "public"."enum_constructions_blk_cta_background";
  DROP TYPE "public"."enum_constructions_blk_cta_variant";
  DROP TYPE "public"."enum_constructions_blk_cta_tone";
  DROP TYPE "public"."enum_constructions_blk_cta_link_type";
  DROP TYPE "public"."enum_constructions_blk_compare_heading_level";
  DROP TYPE "public"."enum_constructions_blk_compare_background";
  DROP TYPE "public"."enum_constructions_blk_compare_foot_link_type";
  DROP TYPE "public"."enum_constructions_blk_download_heading_level";
  DROP TYPE "public"."enum_constructions_blk_download_background";
  DROP TYPE "public"."enum_constructions_blk_download_variant";
  DROP TYPE "public"."enum_constructions_blk_holes_heading_level";
  DROP TYPE "public"."enum_constructions_blk_holes_background";
  DROP TYPE "public"."enum_constructions_blk_holes_default_thickness";
  DROP TYPE "public"."enum_constructions_blk_weight_heading_level";
  DROP TYPE "public"."enum_constructions_blk_weight_background";
  DROP TYPE "public"."enum_constructions_blk_weight_default_mode";
  DROP TYPE "public"."enum_constructions_blk_form_heading_level";
  DROP TYPE "public"."enum_constructions_blk_form_background";
  DROP TYPE "public"."enum_constructions_blk_form_form_key";
  DROP TYPE "public"."enum_constructions_blk_form_variant";
  DROP TYPE "public"."enum_constructions_blk_snippet_heading_level";
  DROP TYPE "public"."enum_constructions_blk_snippet_background";
  DROP TYPE "public"."enum_constructions_blk_stats_heading_level";
  DROP TYPE "public"."enum_constructions_blk_stats_background";
  DROP TYPE "public"."enum_constructions_blk_stats_variant";
  DROP TYPE "public"."enum_constructions_blk_objects_heading_level";
  DROP TYPE "public"."enum_constructions_blk_objects_background";
  DROP TYPE "public"."enum_constructions_blk_objects_mode";
  DROP TYPE "public"."enum_constructions_blk_articles_heading_level";
  DROP TYPE "public"."enum_constructions_blk_articles_background";
  DROP TYPE "public"."enum_constructions_blk_articles_mode";
  DROP TYPE "public"."enum_constructions_blk_wdw_heading_level";
  DROP TYPE "public"."enum_constructions_blk_wdw_background";
  DROP TYPE "public"."enum_constructions_blk_systems_heading_level";
  DROP TYPE "public"."enum_constructions_blk_systems_background";
  DROP TYPE "public"."enum_constructions_blk_systems_source";
  DROP TYPE "public"."enum_constructions_blk_systems_layout";
  DROP TYPE "public"."enum_constructions_blk_gallery_heading_level";
  DROP TYPE "public"."enum_constructions_blk_gallery_background";
  DROP TYPE "public"."enum_constructions_blk_gallery_layout";
  DROP TYPE "public"."enum_constructions_blk_two_cols_heading_level";
  DROP TYPE "public"."enum_constructions_blk_two_cols_background";
  DROP TYPE "public"."enum_constructions_blk_links_items_link_type";
  DROP TYPE "public"."enum_constructions_blk_links_heading_level";
  DROP TYPE "public"."enum_constructions_blk_links_background";
  DROP TYPE "public"."enum_constructions_blk_links_variant";
  DROP TYPE "public"."enum_constructions_blk_contacts_heading_level";
  DROP TYPE "public"."enum_constructions_blk_contacts_background";
  DROP TYPE "public"."enum_constructions_blk_requisites_heading_level";
  DROP TYPE "public"."enum_constructions_blk_requisites_background";
  DROP TYPE "public"."enum_constructions_blk_team_heading_level";
  DROP TYPE "public"."enum_constructions_blk_team_background";
  DROP TYPE "public"."enum_constructions_blk_team_empty_behavior";
  DROP TYPE "public"."enum_constructions_blk_quiz_cta_heading_level";
  DROP TYPE "public"."enum_constructions_blk_quiz_cta_background";
  DROP TYPE "public"."enum_constructions_blk_quiz_cta_prefill_type";
  DROP TYPE "public"."enum_constructions_blk_quiz_cta_prefill_thickness";
  DROP TYPE "public"."enum_constructions_blk_quiz_cta_prefill_kind";
  DROP TYPE "public"."enum_constructions_blk_quiz_cta_prefill_secondary_form";
  DROP TYPE "public"."enum_constructions_kind";
  DROP TYPE "public"."enum_constructions_group";
  DROP TYPE "public"."enum_constructions_secondary_form_key";
  DROP TYPE "public"."enum_constructions_systems_layout";
  DROP TYPE "public"."enum_constructions_quiz_prefill_type";
  DROP TYPE "public"."enum_constructions_quiz_prefill_thickness";
  DROP TYPE "public"."enum_constructions_quiz_prefill_kind";
  DROP TYPE "public"."enum_constructions_quiz_prefill_secondary_form";
  DROP TYPE "public"."enum_constructions_status";
  DROP TYPE "public"."enum__constructions_tables_cols_v_align";
  DROP TYPE "public"."enum__constructions_v_version_tables_role";
  DROP TYPE "public"."enum__constructions_v_version_tables_mobile_mode";
  DROP TYPE "public"."enum__constructions_blk_hero_v_buttons_kind";
  DROP TYPE "public"."enum__constructions_blk_hero_v_buttons_variant";
  DROP TYPE "public"."enum__constructions_blk_hero_v_buttons_form_key";
  DROP TYPE "public"."enum__constructions_blk_hero_v_buttons_link_type";
  DROP TYPE "public"."enum__constructions_blk_hero_v_variant";
  DROP TYPE "public"."enum__constructions_blk_hero_v_terms_mode";
  DROP TYPE "public"."enum__constructions_blk_text_v_heading_level";
  DROP TYPE "public"."enum__constructions_blk_text_v_background";
  DROP TYPE "public"."enum__constructions_blk_text_v_width";
  DROP TYPE "public"."enum__constructions_blk_table_table_cols_v_align";
  DROP TYPE "public"."enum__constructions_blk_table_v_heading_level";
  DROP TYPE "public"."enum__constructions_blk_table_v_background";
  DROP TYPE "public"."enum__constructions_blk_table_v_table_role";
  DROP TYPE "public"."enum__constructions_blk_table_v_table_mobile_mode";
  DROP TYPE "public"."enum__constructions_blk_steps_v_items_link_type";
  DROP TYPE "public"."enum__constructions_blk_steps_v_buttons_kind";
  DROP TYPE "public"."enum__constructions_blk_steps_v_buttons_variant";
  DROP TYPE "public"."enum__constructions_blk_steps_v_buttons_form_key";
  DROP TYPE "public"."enum__constructions_blk_steps_v_buttons_link_type";
  DROP TYPE "public"."enum__constructions_blk_steps_v_heading_level";
  DROP TYPE "public"."enum__constructions_blk_steps_v_background";
  DROP TYPE "public"."enum__constructions_blk_steps_v_variant";
  DROP TYPE "public"."enum__constructions_blk_callout_v_heading_level";
  DROP TYPE "public"."enum__constructions_blk_callout_v_background";
  DROP TYPE "public"."enum__constructions_blk_callout_v_tone";
  DROP TYPE "public"."enum__constructions_blk_terms_v_heading_level";
  DROP TYPE "public"."enum__constructions_blk_terms_v_background";
  DROP TYPE "public"."enum__constructions_blk_terms_v_mode";
  DROP TYPE "public"."enum__constructions_blk_terms_v_variant";
  DROP TYPE "public"."enum__constructions_blk_cards_v_items_link_type";
  DROP TYPE "public"."enum__constructions_blk_cards_v_items_tone";
  DROP TYPE "public"."enum__constructions_blk_cards_v_heading_level";
  DROP TYPE "public"."enum__constructions_blk_cards_v_background";
  DROP TYPE "public"."enum__constructions_blk_cards_v_layout";
  DROP TYPE "public"."enum__constructions_blk_coll_cards_v_heading_level";
  DROP TYPE "public"."enum__constructions_blk_coll_cards_v_background";
  DROP TYPE "public"."enum__constructions_blk_coll_cards_v_source";
  DROP TYPE "public"."enum__constructions_blk_coll_cards_v_mode";
  DROP TYPE "public"."enum__constructions_blk_coll_cards_v_group";
  DROP TYPE "public"."enum__constructions_blk_coll_cards_v_columns";
  DROP TYPE "public"."enum__constructions_blk_prices_v_heading_level";
  DROP TYPE "public"."enum__constructions_blk_prices_v_background";
  DROP TYPE "public"."enum__constructions_blk_prices_v_variant";
  DROP TYPE "public"."enum__constructions_blk_faq_v_heading_level";
  DROP TYPE "public"."enum__constructions_blk_faq_v_background";
  DROP TYPE "public"."enum__constructions_blk_faq_v_mode";
  DROP TYPE "public"."enum__constructions_blk_cta_v_buttons_kind";
  DROP TYPE "public"."enum__constructions_blk_cta_v_buttons_variant";
  DROP TYPE "public"."enum__constructions_blk_cta_v_buttons_form_key";
  DROP TYPE "public"."enum__constructions_blk_cta_v_buttons_link_type";
  DROP TYPE "public"."enum__constructions_blk_cta_v_heading_level";
  DROP TYPE "public"."enum__constructions_blk_cta_v_background";
  DROP TYPE "public"."enum__constructions_blk_cta_v_variant";
  DROP TYPE "public"."enum__constructions_blk_cta_v_tone";
  DROP TYPE "public"."enum__constructions_blk_cta_v_link_type";
  DROP TYPE "public"."enum__constructions_blk_compare_v_heading_level";
  DROP TYPE "public"."enum__constructions_blk_compare_v_background";
  DROP TYPE "public"."enum__constructions_blk_compare_v_foot_link_type";
  DROP TYPE "public"."enum__constructions_blk_download_v_heading_level";
  DROP TYPE "public"."enum__constructions_blk_download_v_background";
  DROP TYPE "public"."enum__constructions_blk_download_v_variant";
  DROP TYPE "public"."enum__constructions_blk_holes_v_heading_level";
  DROP TYPE "public"."enum__constructions_blk_holes_v_background";
  DROP TYPE "public"."enum__constructions_blk_holes_v_default_thickness";
  DROP TYPE "public"."enum__constructions_blk_weight_v_heading_level";
  DROP TYPE "public"."enum__constructions_blk_weight_v_background";
  DROP TYPE "public"."enum__constructions_blk_weight_v_default_mode";
  DROP TYPE "public"."enum__constructions_blk_form_v_heading_level";
  DROP TYPE "public"."enum__constructions_blk_form_v_background";
  DROP TYPE "public"."enum__constructions_blk_form_v_form_key";
  DROP TYPE "public"."enum__constructions_blk_form_v_variant";
  DROP TYPE "public"."enum__constructions_blk_snippet_v_heading_level";
  DROP TYPE "public"."enum__constructions_blk_snippet_v_background";
  DROP TYPE "public"."enum__constructions_blk_stats_v_heading_level";
  DROP TYPE "public"."enum__constructions_blk_stats_v_background";
  DROP TYPE "public"."enum__constructions_blk_stats_v_variant";
  DROP TYPE "public"."enum__constructions_blk_objects_v_heading_level";
  DROP TYPE "public"."enum__constructions_blk_objects_v_background";
  DROP TYPE "public"."enum__constructions_blk_objects_v_mode";
  DROP TYPE "public"."enum__constructions_blk_articles_v_heading_level";
  DROP TYPE "public"."enum__constructions_blk_articles_v_background";
  DROP TYPE "public"."enum__constructions_blk_articles_v_mode";
  DROP TYPE "public"."enum__constructions_blk_wdw_v_heading_level";
  DROP TYPE "public"."enum__constructions_blk_wdw_v_background";
  DROP TYPE "public"."enum__constructions_blk_systems_v_heading_level";
  DROP TYPE "public"."enum__constructions_blk_systems_v_background";
  DROP TYPE "public"."enum__constructions_blk_systems_v_source";
  DROP TYPE "public"."enum__constructions_blk_systems_v_layout";
  DROP TYPE "public"."enum__constructions_blk_gallery_v_heading_level";
  DROP TYPE "public"."enum__constructions_blk_gallery_v_background";
  DROP TYPE "public"."enum__constructions_blk_gallery_v_layout";
  DROP TYPE "public"."enum__constructions_blk_two_cols_v_heading_level";
  DROP TYPE "public"."enum__constructions_blk_two_cols_v_background";
  DROP TYPE "public"."enum__constructions_blk_links_v_items_link_type";
  DROP TYPE "public"."enum__constructions_blk_links_v_heading_level";
  DROP TYPE "public"."enum__constructions_blk_links_v_background";
  DROP TYPE "public"."enum__constructions_blk_links_v_variant";
  DROP TYPE "public"."enum__constructions_blk_contacts_v_heading_level";
  DROP TYPE "public"."enum__constructions_blk_contacts_v_background";
  DROP TYPE "public"."enum__constructions_blk_requisites_v_heading_level";
  DROP TYPE "public"."enum__constructions_blk_requisites_v_background";
  DROP TYPE "public"."enum__constructions_blk_team_v_heading_level";
  DROP TYPE "public"."enum__constructions_blk_team_v_background";
  DROP TYPE "public"."enum__constructions_blk_team_v_empty_behavior";
  DROP TYPE "public"."enum__constructions_blk_quiz_cta_v_heading_level";
  DROP TYPE "public"."enum__constructions_blk_quiz_cta_v_background";
  DROP TYPE "public"."enum__constructions_blk_quiz_cta_v_prefill_type";
  DROP TYPE "public"."enum__constructions_blk_quiz_cta_v_prefill_thickness";
  DROP TYPE "public"."enum__constructions_blk_quiz_cta_v_prefill_kind";
  DROP TYPE "public"."enum__constructions_blk_quiz_cta_v_prefill_secondary_form";
  DROP TYPE "public"."enum__constructions_v_version_kind";
  DROP TYPE "public"."enum__constructions_v_version_group";
  DROP TYPE "public"."enum__constructions_v_version_secondary_form_key";
  DROP TYPE "public"."enum__constructions_v_version_systems_layout";
  DROP TYPE "public"."enum__constructions_v_version_quiz_prefill_type";
  DROP TYPE "public"."enum__constructions_v_version_quiz_prefill_thickness";
  DROP TYPE "public"."enum__constructions_v_version_quiz_prefill_kind";
  DROP TYPE "public"."enum__constructions_v_version_quiz_prefill_secondary_form";
  DROP TYPE "public"."enum__constructions_v_version_status";
  DROP TYPE "public"."enum_shower_configs_glass_thicknesses";
  DROP TYPE "public"."enum_shower_configs_config_type";
  DROP TYPE "public"."enum_shower_configs_status";
  DROP TYPE "public"."enum__shower_configs_v_version_glass_thicknesses";
  DROP TYPE "public"."enum__shower_configs_v_version_config_type";
  DROP TYPE "public"."enum__shower_configs_v_version_status";
  DROP TYPE "public"."enum_products_quiz_type";
  DROP TYPE "public"."enum_lead_files_kind";
  DROP TYPE "public"."enum_lead_files_source";
  DROP TYPE "public"."enum_leads_flags";
  DROP TYPE "public"."enum_leads_form_type";
  DROP TYPE "public"."enum_leads_role";
  DROP TYPE "public"."enum_leads_product_type";
  DROP TYPE "public"."enum_leads_duplicate_reason";
  DROP TYPE "public"."enum__leads_v_version_flags";
  DROP TYPE "public"."enum__leads_v_version_form_type";
  DROP TYPE "public"."enum__leads_v_version_role";
  DROP TYPE "public"."enum__leads_v_version_product_type";
  DROP TYPE "public"."enum__leads_v_version_duplicate_reason";
  DROP TYPE "public"."enum_orders_status_history_status";
  DROP TYPE "public"."enum_orders_documents_kind";
  DROP TYPE "public"."enum_orders_current_status";
  DROP TYPE "public"."enum_order_files_kind";
  DROP TYPE "public"."enum_redirects_code";
  DROP TYPE "public"."enum_contacts_locations_type";
  DROP TYPE "public"."enum_contacts_messengers_icon";
  DROP TYPE "public"."enum__contacts_v_version_locations_type";
  DROP TYPE "public"."enum__contacts_v_version_messengers_icon";
  DROP TYPE "public"."enum_tech_params_tint_colors_key";
  DROP TYPE "public"."enum_tech_params_delivery_cities_kind";
  DROP TYPE "public"."enum_tech_params_quiz_options_edges_only_for_types";
  DROP TYPE "public"."enum_site_settings_stop_words_kind";
  DROP TYPE "public"."enum_site_settings_order_statuses_key";
  DROP TYPE "public"."enum_navigation_top_bar_company_items_link_type";
  DROP TYPE "public"."enum_navigation_top_bar_segments_link_type";
  DROP TYPE "public"."enum_navigation_main_row_pills_key";
  DROP TYPE "public"."enum_navigation_main_row_links_link_type";
  DROP TYPE "public"."enum_navigation_section_row_items_link_type";
  DROP TYPE "public"."enum_nav_mega_columns_links_link_type";
  DROP TYPE "public"."enum_nav_mega_key";
  DROP TYPE "public"."enum_nav_mega_promo_card_button_kind";
  DROP TYPE "public"."enum_navigation_footer_columns_links_link_type";
  DROP TYPE "public"."enum_navigation_footer_bottom_links_link_type";
  DROP TYPE "public"."enum_snippets_items_cta_form_key";`)
}
