-- Warm-up (spec 12.5, decision 0038): a 3-minute drill on one behavior. The session keeps the drilled rubric item
-- so a session rebuilt on another server instance narrows its score to the same item. Null for every other mode.
alter table sessions add column focus_item text;
alter table sessions add constraint sessions_focus_item_warm_up check (focus_item is null or mode = 'warm_up');
