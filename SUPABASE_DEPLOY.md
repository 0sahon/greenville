# Supabase deployment (sequential, CLI)

Schema migrations (run in filename order):

1. `supabase/migrations/20260415120000_school_management_system.sql` — full school schema  
2. `supabase/migrations/20260416120000_submission_work_images.sql` — assignment photo uploads (`submission-work` bucket + `submissions.work_image_path`)  
3. `supabase/migrations/20260417120000_submission_work_documents.sql` — `submissions.work_document_path` + document MIME types / 10 MB limit on the same bucket  
4. `supabase/migrations/20260418140000_lesson_plans.sql` — `lesson_plans` (teacher submit → admin approve)

## New Supabase project (recommended)

Use a **brand-new empty project** (or a project where this migration has never been applied).

1. **Create the project** at [supabase.com](https://supabase.com).

2. **Environment** — in `.env` at the repo root:

   ```env
   VITE_SUPABASE_URL=https://<project-ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon-or-publishable-key>
   SUPABASE_ACCESS_TOKEN=<personal-access-token>
   ```

   Get the token under **Account → Access Tokens**.

3. **Link and push** (from repo root). Use the Supabase CLI if it is on your `PATH`, or **`npx`** (works on Windows without a global install):

   ```bash
   npx supabase@latest link --project-ref <YOUR_PROJECT_REF> --yes
   npx supabase@latest db push --yes
   ```

   With a single migration file, `--include-all` is optional.

4. **Customize the school** before or after push:

   - **Database defaults:** in the migration SQL, search for `Your School Name` in the `school_settings` seed and edit `school_name`, `currency`, etc.
   - **App branding:** edit `src/config/schoolBrand.ts` (name, address, phone, logo path).

5. **Edge functions** (optional). This repo defines exactly two functions under `supabase/functions/`:

   | Slug (deploy name) | Source folder | Purpose |
   | --- | --- | --- |
   | `create-user` | `supabase/functions/create-user/` | Admin-only: creates auth users via service role (`profiles.role === 'admin'`). |
   | `generate-mcq` | `supabase/functions/generate-mcq/` | AI MCQ generation (OpenRouter); invoked from the app as `supabase.functions.invoke('generate-mcq', …)`. |

   Deploy:

   ```bash
   npx supabase@latest functions deploy create-user --project-ref <YOUR_PROJECT_REF>
   npx supabase@latest functions deploy generate-mcq --project-ref <YOUR_PROJECT_REF>
   ```

   **Secrets** (Dashboard → **Project Settings** → **Edge Functions** → **Secrets**, or `supabase secrets set`):

   | Secret | Required for | Notes |
   | --- | --- | --- |
   | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | `create-user` | Usually **injected automatically** on hosted Supabase; add manually if admin user creation fails. |
   | `OPENROUTER_API_KEY` | `generate-mcq` | **Required** — from [openrouter.ai](https://openrouter.ai/). |
   | `SITE_URL`, `SITE_TITLE` | `generate-mcq` | Optional OpenRouter attribution headers (defaults exist in code). |

6. **Auth users:** run `node scripts/setup-demo-users.mjs` (requires `SUPABASE_SERVICE_ROLE_KEY` in `.env`) or create users in **Authentication → Users**.

## Already used the old multi-file migrations?

If this project was previously linked and you applied **many** older migration filenames, replacing them with this **one** squashed file will **not** match Supabase’s remote migration history. Options:

- **Easiest:** create a **new** Supabase project and `db push` there; point the app’s `.env` at it, or  
- **Advanced:** repair / reset migration history in consultation with [Supabase migration docs](https://supabase.com/docs/guides/cli/managing-environments) (risky on production data).

## Local `supabase db reset`

`config.toml` references `supabase/seed.sql`. Keep it (even as comments only) or add seed `INSERT`s for local dev.
