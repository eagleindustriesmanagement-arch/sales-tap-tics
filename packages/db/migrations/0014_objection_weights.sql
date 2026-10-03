-- Spec 19.2 item 2, decision 0018: the store's objection weights from its lost-deal reasons, one row per month,
-- next to the exit-rate calibration. Everyone in the store reads them (practice plans use them); only the general
-- manager writes them, under the same policies.
alter table store_calibrations drop constraint store_calibrations_kind_check;
alter table store_calibrations add constraint store_calibrations_kind_check check (kind in ('exit_rates', 'objection_weights'));
