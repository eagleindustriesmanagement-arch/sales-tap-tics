#!/usr/bin/env bash
# Backup restore drill (spec 20, M7): dump the database, restore it into a scratch database, and prove the copy is
# whole: same row counts in every table, the same row-level security policies and immutability triggers.
#   DATABASE_URL=postgresql://... scripts/backup-drill.sh
set -euo pipefail
: "${DATABASE_URL:?set DATABASE_URL}"
stamp=$(date -u +%Y%m%d%H%M%S)
dump="${TMPDIR:-/tmp}/taptics-drill-$stamp.dump"
scratch="taptics_drill_$stamp"
started=$(date +%s)

pg_dump --format=custom --no-owner --file="$dump" "$DATABASE_URL"
admin_url="${DATABASE_URL%%\?*}"
createdb_url=$(echo "$admin_url" | sed -E 's#/[^/]*$#/postgres#')
query="${DATABASE_URL#*\?}"; [ "$query" = "$DATABASE_URL" ] && query="" || query="?$query"
psql -q "$createdb_url$query" -c "create database $scratch"
restore_url=$(echo "$admin_url" | sed -E "s#/[^/]*\$#/$scratch#")$query
pg_restore --no-owner --dbname="$restore_url" "$dump"

fingerprint() {
  psql -At "$1" -c "
    select 'rows ' || string_agg(t || '=' || n, ',' order by t) from (
      select c.relname t, (xpath('/row/n/text()', query_to_xml(format('select count(*) n from %I', c.relname), false, true, '')))[1]::text n
      from pg_class c join pg_namespace s on s.oid = c.relnamespace where s.nspname = 'public' and c.relkind = 'r') x
    union all select 'policies ' || count(*) from pg_policies where schemaname = 'public'
    union all select 'rls ' || count(*) from pg_class c join pg_namespace s on s.oid = c.relnamespace where s.nspname = 'public' and c.relrowsecurity and c.relforcerowsecurity
    union all select 'triggers ' || count(*) from pg_trigger where not tgisinternal"
}
a=$(fingerprint "$DATABASE_URL")
b=$(fingerprint "$restore_url")
psql -q "$createdb_url$query" -c "drop database $scratch"
rm -f "$dump"
if [ "$a" != "$b" ]; then
  echo "DRILL FAILED: the restored copy differs"; diff <(echo "$a" | tr ',' '\n') <(echo "$b" | tr ',' '\n') || true; exit 1
fi
echo "$a" | sed -E 's/^rows .*/rows: every table matches/'
echo "drill passed in $(( $(date +%s) - started ))s"
