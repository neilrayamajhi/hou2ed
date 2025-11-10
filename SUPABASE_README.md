Remote-only Supabase Workflow

Use the root `supabase/` directory as the single source of truth for migrations and config. Do not run Supabase CLI commands from `app/supabase/`.

Quick start (remote only)

- Open a shell in the repo root (where `supabase/` lives).
- PowerShell: set your token and log in non-interactively:
  - `$env:SUPABASE_ACCESS_TOKEN = "<YOUR_SUPABASE_PERSONAL_ACCESS_TOKEN>"`
  - `supabase login --token $env:SUPABASE_ACCESS_TOKEN`
- Link to your project (safe to re-run):
  - `supabase link --project-ref <PROJECT_REF>`
- Push migrations directly to the cloud database:
  - `supabase db push`

Notes

- This repo contains a legacy `app/supabase/` folder. It is archived—do not use it for CLI commands or migrations. Using both folders will cause duplicate objects or policy conflicts in the remote database.
- Local Docker/WSL (`supabase start/reset`) is not required unless you explicitly want a local dev database. For remote-only work, skip those commands.
- If the remote DB already has drift (e.g., from older migrations), generate a reconciling migration:
  - `supabase db diff --linked --schema public --file reconcile.sql`
  - Review the new migration in `supabase/migrations/`, then `supabase db push` again.

Troubleshooting

- Stuck on “Initializing login flow…”: set the token in your shell and run `supabase login --token ...` to bypass the browser.
- Wrong directory: ensure you’re in the repo root so the CLI uses `supabase/config.toml` and `supabase/migrations/`.
- Permissions/auth errors: ensure `$env:SUPABASE_ACCESS_TOKEN` is set in the current shell session and that `supabase link` succeeds.

