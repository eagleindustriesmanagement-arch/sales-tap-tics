-- Decisions 0018 and 0019: the lost-deal reason mapping and the example deal are content too, so each release
-- records the version sessions ran under.
alter table content_items drop constraint content_items_kind_check;
alter table content_items add constraint content_items_kind_check
  check (kind in ('technique', 'objection', 'persona', 'scenario', 'rubric', 'rule', 'glossary', 'behavior_card', 'module', 'lexicon', 'lost_reasons', 'example_deal'));
