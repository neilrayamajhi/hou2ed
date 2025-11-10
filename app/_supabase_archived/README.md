Archived — Do Not Use

This folder has been renamed to `_supabase_archived` to prevent accidental use.

This `app/supabase/` folder is a legacy copy and is not the active Supabase project for this repo.

Use the root `supabase/` directory instead for all CLI commands and migrations:

- Run commands from the repo root (where `supabase/` exists):
  - `supabase login --token <TOKEN>`
  - `supabase link --project-ref <PROJECT_REF>`
  - `supabase db push`

Why this exists

- Older development used a per-app Supabase folder; the project has since consolidated on a single root Supabase project to avoid duplication and drift.

If you need the remote-only workflow details, see `SUPABASE_README.md` at the repo root.
