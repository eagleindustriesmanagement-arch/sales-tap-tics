-- Model usage and cost are for the general manager (cost dashboard, spec 20 / M7); reps and managers do not need them.
-- The app writes usage rows as the rep whose session it is, so inserts stay open within the tenant.
create policy usage_read on model_usage as restrictive for select to app_user using (app.has_role('general_manager'));
