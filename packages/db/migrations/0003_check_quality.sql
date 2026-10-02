-- Spec 14.3 measures "specific behavior named" and "line modeled in person" separately.
alter table manager_check_quality add column line_modeled boolean not null default false;
