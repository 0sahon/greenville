/**
 * Find duplicate public.profiles rows sharing the same user_id (breaks UNIQUE(user_id)).
 * Keeps one row per user_id (prefers rows linked from students/teachers/parents, else oldest created_at).
 * Deletes duplicate rows only when they have zero FK references from core tables.
 *
 * Requires: VITE_SUPABASE_URL (or SUPABASE_URL) + SUPABASE_SERVICE_ROLE_KEY in repo .env
 * Run: node scripts/dedupe-profiles-user-id.mjs
 */
import './load-root-env.mjs';
import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

async function tableHasProfileId(table, column, id) {
  const { count, error } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true })
    .eq(column, id);
  if (error) throw new Error(`${table}.${column}: ${error.message}`);
  return (count ?? 0) > 0;
}

async function profileRefCount(id) {
  const checks = [
    ['students', 'profile_id'],
    ['teachers', 'profile_id'],
    ['parents', 'profile_id'],
    ['classes', 'teacher_id'],
    ['attendance', 'marked_by'],
    ['grades', 'graded_by'],
    ['announcements', 'published_by'],
    ['health_records', 'recorded_by'],
    ['result_sheets', 'created_by'],
    ['messages', 'sender_id'],
    ['messages', 'recipient_id'],
    ['assignments', 'created_by'],
    ['submissions', 'graded_by'],
    ['course_materials', 'uploaded_by'],
    ['events', 'created_by'],
    ['subjects', 'teacher_id'],
    ['in_app_notifications', 'profile_id'],
    ['lesson_plans', 'teacher_profile_id'],
  ];

  let n = 0;
  for (const [t, c] of checks) {
    if (await tableHasProfileId(t, c, id)) n += 1;
  }
  return n;
}

async function main() {
  const { data: rows, error } = await supabase
    .from('profiles')
    .select('id, user_id, email, role, created_at')
    .not('user_id', 'is', null)
    .order('created_at', { ascending: true });

  if (error) throw error;

  const byUser = new Map();
  for (const r of rows || []) {
    if (!byUser.has(r.user_id)) byUser.set(r.user_id, []);
    byUser.get(r.user_id).push(r);
  }

  const dupGroups = [...byUser.entries()].filter(([, list]) => list.length > 1);
  if (dupGroups.length === 0) {
    console.log('No duplicate user_id values in profiles. Nothing to do.');
    process.exit(0);
  }

  console.log(`Found ${dupGroups.length} user_id(s) with duplicate profile rows.\n`);

  let deleted = 0;
  for (const [userId, list] of dupGroups) {
    const scored = [];
    for (const p of list) {
      const refs = await profileRefCount(p.id);
      scored.push({ ...p, refs });
    }
    scored.sort((a, b) => {
      if (b.refs !== a.refs) return b.refs - a.refs;
      return String(a.created_at).localeCompare(String(b.created_at));
    });

    const keeper = scored[0];
    const toss = scored.slice(1);
    console.log(`user_id=${userId}: keep ${keeper.id} (${keeper.email}, refs=${keeper.refs}), candidates=${toss.length}`);

    for (const row of toss) {
      const refs = await profileRefCount(row.id);
      if (refs > 0) {
        console.error(
          `  SKIP delete ${row.id} (${row.email}): still has ${refs} reference kind(s). Resolve manually.`,
        );
        continue;
      }
      const { error: delErr } = await supabase.from('profiles').delete().eq('id', row.id);
      if (delErr) {
        console.error(`  DELETE failed ${row.id}: ${delErr.message}`);
        continue;
      }
      console.log(`  Deleted orphan duplicate ${row.id} (${row.email})`);
      deleted += 1;
    }
  }

  console.log(`\nDone. Deleted ${deleted} orphan duplicate profile row(s).`);
  if (deleted > 0) {
    console.log('If you add UNIQUE(user_id) later, re-run migrations / db push as needed.');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
