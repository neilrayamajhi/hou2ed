PHASE 0 — WEB FOUNDATION (React, TS, Routing, Style System)
Prompt 0.1 — Bootstrap React + TS + Base Shell

[Phase: 0. Web Foundation]
[Feature: React Base]
[Task: Initialize React TS site + page shell]
[Context:] We need a stable base to hang sections on with the Black/Gold/White brand.
[Current Directory Context:] HOU2ED/site/

[Detailed Instructions:]
Init:
npm create vite@latest . -- --template react-ts
npm i

Install deps:
npm i react-router-dom react-hook-form zod @hookform/resolvers

Create folders:
src/
theme/ (tokens.ts, styles.ts)
components/ui/ (Button.tsx, Input.tsx, Card.tsx, Toggle.tsx, Toast.tsx, Modal.tsx)
components/sections/ (Hero.tsx, Mission.tsx, WhatItDoes.tsx, Waitlist.tsx, Footer.tsx)
providers/ (ToastProvider.tsx, ErrorBoundary.tsx)
state/ (useUIStore.ts)
app/ (AppShell.tsx, Router.tsx)
pages/ (Home.tsx, Privacy.tsx, Terms.tsx)
lib/ (placeholder only for now)
utils/ (a11y.ts, format.ts, env.ts)

Routing:

Add routes for /, /privacy, /terms

Home page section order: Hero → Mission → WhatItDoes → Waitlist → Footer

AppShell:

Full black page background

Centered content container

Shared vertical spacing

ErrorBoundary + ToastProvider mounted

[Expected Output/Deliverable:] Site launches to a branded shell with all 5 homepage sections as placeholders.
[Dependencies/Pre-requisites:] Node installed.
[Checkpoint:] Run npm run dev → homepage visible, no console errors.

Prompt 0.2 — Linting, Formatting, VSCode Hygiene

[Phase: 0. Web Foundation]
[Feature: Code Quality]
[Task: ESLint + Prettier + EditorConfig + VSCode settings]
[Context:] Stable dev ergonomics.
[Current Directory Context:] HOU2ED/site/

[Detailed Instructions:]
Install:
npm i -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
eslint-config-prettier eslint-plugin-import eslint-plugin-react eslint-plugin-react-hooks
prettier

Files:
.eslintrc.cjs (TS, React, import/order)
.prettierrc { "singleQuote": true, "printWidth": 100 }
.editorconfig (2 spaces, utf-8)
.vscode/settings.json enable formatOnSave + eslint.validate ts/tsx

package.json:
"lint": "eslint . --ext .ts,.tsx"
"format": "prettier --write ."

[Expected Output/Deliverable:] Lint + format commands working cleanly.
[Dependencies/Pre-requisites:] Git initialized (optional but recommended).
[Checkpoint:] npm run lint passes.

Prompt 0.3 — Env Scaffold (No Backend Wiring Yet)

[Phase: 0. Web Foundation]
[Feature: Env Handling]
[Task: .env.example + utils/env.ts]
[Context:] Prepare app for Supabase keys later, but do not wire Supabase yet.
[Current Directory Context:] HOU2ED/site/

[Detailed Instructions:]
Add .env.example with:
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_SITE_URL=

src/utils/env.ts:

Read from import.meta.env.VITE\_\*

Validate with zod

Throw descriptive errors in dev if missing

Export typed env object

Important:

Do not create Supabase client yet

This is scaffold only

[Expected Output/Deliverable:] Clean env scaffold without secrets committed.
[Dependencies/Pre-requisites:] None.
[Checkpoint:] Build runs with placeholders.

PHASE 1 — THEME & PRIMITIVES (Black/Gold/White)
Prompt 1.1 — Tokens & Global Styles

[Phase: 1. Theme]
[Feature: Tokens]
[Task: tokens.ts + styles.ts]
[Context:] Brand: Black bg, Gold accents, White legibility. React StyleSheet objects only.
[Current Directory Context:] HOU2ED/site/src/theme/

[Detailed Instructions:]
tokens.ts export:
colors: black:#000000, gold:#D4AF37, white:#FFFFFF, green:#21C55D, amber:#F59E0B, red:#EF4444, gray:#6B7280
radius: sm:8, md:12, lg:16
spacing scale: 4,8,12,16,20,24,32,40,48,56,64
shadow presets (subtle)
typography: headings semibold, body regular (web-safe font stack)

styles.ts export helpers:

screen: full black bg, minHeight 100vh

container: centered max width + responsive side padding

section: vertical spacing blocks

text: white body, gold headings (styleHeading, styleSubheading, styleBody)

row/column helpers

divider: thin gold line with opacity

focusRing: gold outline/box shadow style util

hit target helper for clickable elements

Use plain JS style objects (inline styles), no Tailwind, no CSS modules.

[Expected Output/Deliverable:] Importable tokens + reusable style helpers.
[Dependencies/Pre-requisites:] None.
[Checkpoint:] A demo section renders gold heading on black background.

Prompt 1.2 — Core UI Components (A11y baked in)

[Phase: 1. Theme]
[Feature: Primitives]
[Task: Button, Input, Card, Toggle, Toast, Modal]
[Context:] Match Hou2ed black/gold visual style and keep components reusable.
[Current Directory Context:] HOU2ED/site/src/components/ui/

[Detailed Instructions:]
Button.tsx:

variants: 'primary'|'secondary'|'ghost'

sizes: 'lg'|'md'

loading, disabled

Primary = gold bg, black text, radius 12, min height 48

Secondary = black bg, gold border/text

Ghost = transparent, white text

accessibility: aria-label support, focus ring gold

Input.tsx:

black field, white 1px border, gold glow on focus

supports label + help text + error text (red under field)

types: text/email

disabled state

Card.tsx:

black bg, 1px gold border, subtle shadow

supports header/body/footer layout

Toggle.tsx:

two-option segmented toggle (used for role selection)

active segment gold with black text

Toast.tsx:

provider + hook

variants success/warn/error

top-right stack

auto-dismiss

Modal.tsx:

centered modal (used for small confirmations)

black panel, gold header text, white body text

dismiss X (white)

All components:

min hit area 44x44

focus visible styles

test IDs/class names for testing hooks later

[Expected Output/Deliverable:] Reusable themed primitives.
[Dependencies/Pre-requisites:] tokens/styles.
[Checkpoint:] Build a temporary “Styleguide” section to preview all components.

PHASE 2 — BRAND & CONTENT SECTIONS (Marketing Page)
Prompt 2.1 — Hero Section

[Phase: 2. Brand]
[Feature: Hero]
[Task: Build top hero section with logo/title/CTA]
[Context:] First impression should immediately explain Hou2ed and drive waitlist action.
[Current Directory Context:] HOU2ED/site/src/components/sections/

[Detailed Instructions:]
Create Hero.tsx:

Black background

Gold “HOU2ED” wordmark/title (use text logo for now; image logo can be added later)

Main headline (gold): housing access message

Supporting text (white): short summary of what Hou2ed does

CTA row:

Primary gold button: “Join Waitlist”

Secondary button: “Learn More” (scroll to mission section)

Optional small subtext in white/gray for trust positioning

Behavior:

Join Waitlist scrolls to waitlist section

Learn More scrolls to mission section

[Expected Output/Deliverable:] High-trust branded hero with working CTA scroll actions.
[Dependencies/Pre-requisites:] Button component.
[Checkpoint:] Hero visually matches black/gold brand and CTA scroll works.

Prompt 2.2 — Mission Section

[Phase: 2. Brand]
[Feature: Mission]
[Task: Build mission section with polished copy layout]
[Context:] Explain why Hou2ed exists in a clear, credible way.
[Current Directory Context:] HOU2ED/site/src/components/sections/

[Detailed Instructions:]
Create Mission.tsx:

Section title in gold: “Our Mission”

Body copy in white (2–3 short paragraphs max)

Optional callout card (gold border) with one strong mission statement

Keep line length readable (max width)

Add divider above or below section (thin gold line)

Copy direction:

Reduce friction in housing access

Improve transparency

Bridge seekers and providers

Support equitable and faster placement workflows

[Expected Output/Deliverable:] Clean mission section designed for readability and trust.
[Dependencies/Pre-requisites:] Card + theme styles.
[Checkpoint:] Section reads clearly on desktop and mobile widths.

Prompt 2.3 — What Hou2ed Does Section

[Phase: 2. Brand]
[Feature: Product Explanation]
[Task: Build “What Hou2ed Does” feature section]
[Context:] This should explain functionality at a high level, not product internals.
[Current Directory Context:] HOU2ED/site/src/components/sections/

[Detailed Instructions:]
Create WhatItDoes.tsx:

Section title in gold: “What Hou2ed Does”

3 feature cards in responsive layout (stack on mobile, row/grid on desktop)

Feature blocks:

Streamlined Access

verified listings

eligibility clarity

guided navigation

Secure Documentation

organized information flow

reduced back-and-forth

structured applicant profiles

Provider Workflow Support

intake visibility

communication tools

faster coordination

Design:

Use Card component

Gold headings, white body copy

Optional simple icon placeholders (text or unicode OK for now)

[Expected Output/Deliverable:] Responsive feature section with 3 clear value blocks.
[Dependencies/Pre-requisites:] Card component.
[Checkpoint:] Mobile and desktop layouts both look clean.

PHASE 3 — WAITLIST UX (UI + VALIDATION, LOCAL ONLY)
Prompt 3.1 — Waitlist Section UI (Form Layout)

[Phase: 3. Waitlist]
[Feature: Waitlist Form]
[Task: Build waitlist form section UI]
[Context:] Main conversion action for the site. Backend comes later.
[Current Directory Context:] HOU2ED/site/src/components/sections/

[Detailed Instructions:]
Create Waitlist.tsx:

Section title in gold: “Be First to Access Hou2ed”

White support text explaining early access / updates

Form fields:

Full Name (required)

Email (required)

Role (required): Seeker / Provider (toggle or segmented control)

Organization Name (conditional; only if Provider selected)

Optional Message (textarea)

CTA button: gold “Join the Waitlist”

Add small privacy note in gray/white under button

Design:

Inputs black with white borders

Focus = gold border/glow

Error text red

Form wrapped in gold-bordered card/panel

[Expected Output/Deliverable:] Pixel-clean waitlist form section with conditional provider field.
[Dependencies/Pre-requisites:] Input, Button, Toggle, Card.
[Checkpoint:] Provider/Seeker toggle updates conditional field in UI.

Prompt 3.2 — Waitlist Client Validation (react-hook-form + zod)

[Phase: 3. Waitlist]
[Feature: Validation]
[Task: Add client-side validation and error states]
[Context:] Keep UX solid before backend wiring.
[Current Directory Context:] HOU2ED/site/src/components/sections/

[Detailed Instructions:]
Use react-hook-form + zod:
Validation rules:

fullName required

email valid + required

role required (seeker/provider)

organization required if role=provider

message optional with max length (e.g. 500 chars)

Behavior:

Button disabled until form valid

Inline red errors under each field

On submit (for now), show success toast and clear form

No network call yet (mock only)

Success toast copy:
“Thank you. You’ve been added to the Hou2ed waitlist.”

[Expected Output/Deliverable:] Fully validated waitlist form with local mock submit flow.
[Dependencies/Pre-requisites:] Toast + form libs installed.
[Checkpoint:] Invalid fields show errors and mock submit succeeds.

Prompt 3.3 — Footer + Legal Placeholder Pages

[Phase: 3. Waitlist]
[Feature: Footer / Trust]
[Task: Build footer and placeholder Privacy/Terms pages]
[Context:] Adds legitimacy for a public waitlist site.
[Current Directory Context:] HOU2ED/site/src/components/sections/ and src/pages/

[Detailed Instructions:]
Footer.tsx:

Gold HOU2ED text/logo left

Short line in white/gray

Links right (or stacked on mobile):

Privacy

Terms

Contact (mailto placeholder)

Thin gold top border

Copyright line

Create placeholder pages:

Privacy.tsx

Terms.tsx
Simple black pages with gold headings and white placeholder text.

[Expected Output/Deliverable:] Footer plus functional Privacy/Terms routes.
[Dependencies/Pre-requisites:] Router set up.
[Checkpoint:] Footer links navigate correctly.

PHASE 4 — POLISH (A11Y, RESPONSIVE, CONTENT REFINEMENT)
Prompt 4.1 — Responsive Pass (Mobile-first Layout Polish)

[Phase: 4. Polish]
[Feature: Responsive UI]
[Task: Make all sections responsive and spacing-consistent]
[Context:] Site should look strong on phone and desktop.
[Current Directory Context:] whole site

[Detailed Instructions:]
Review and adjust:

Hero text scale on small screens

Button stacking on mobile

Feature cards stack cleanly

Waitlist form width and spacing

Footer stack on mobile

Add responsive style helpers in styles.ts:

container widths

section padding variants

type scale adjustments (mobile/tablet/desktop)
Use window width checks or small helper util if needed.

[Expected Output/Deliverable:] Clean mobile + desktop presentation.
[Dependencies/Pre-requisites:] Sections completed.
[Checkpoint:] No overflow, no cramped spacing on mobile.

Prompt 4.2 — Accessibility Pass

[Phase: 4. Polish]
[Feature: A11y]
[Task: WCAG 2.1 AA checks for key interactions]
[Context:] Public-facing signup form must be accessible.
[Current Directory Context:] whole site

[Detailed Instructions:]
Ensure:

Gold/white on black contrast is readable

All buttons have visible focus styles (gold ring)

Form labels are properly associated

Error messages are text (not color alone)

Inputs have aria-invalid when needed

Role toggle has clear accessible labels

Hit areas >= 44px where relevant

Add utils/a11y.ts helpers if needed:

field IDs

aria-describedby wiring

keyboard helpers

[Expected Output/Deliverable:] A11y checklist complete for homepage + form.
[Dependencies/Pre-requisites:] UI finalized.
[Checkpoint:] Keyboard-only navigation works through full form.

Prompt 4.3 — Final Content Pass (Mission + What It Does Copy)

[Phase: 4. Polish]
[Feature: Copy]
[Task: Replace placeholder copy with polished production copy]
[Context:] Lock messaging before backend integration.
[Current Directory Context:] Hero/Mission/WhatItDoes/Waitlist sections

[Detailed Instructions:]
Refine all copy to final tone:

Clear, mission-driven, credible

Avoid overexplaining

Keep short paragraphs and scannable phrasing

Consistent terminology: “seekers” and “providers”

Deliverable includes final copy for:

Hero headline + subheadline

Mission section

3 “What Hou2ed Does” feature cards

Waitlist section intro + privacy note

Footer short line

[Expected Output/Deliverable:] Production-ready copy throughout the site.
[Dependencies/Pre-requisites:] Layout complete.
[Checkpoint:] Copy feels cohesive and investor/partner-ready.

PHASE 5 — WAITLIST BACKEND (SUPABASE AT THE END)
Prompt 5.1 — Supabase Client Setup (Web)

[Phase: 5. Backend]
[Feature: Supabase Client]
[Task: Create Supabase client and env wiring]
[Context:] Backend starts here. All UI is already done.
[Current Directory Context:] HOU2ED/site/src/lib/ and src/utils/

[Detailed Instructions:]
Install:
npm i @supabase/supabase-js

Create src/lib/supabase.ts:

Import createClient from @supabase/supabase-js

Import env from utils/env.ts

Export supabase client using VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

Confirm:

env.ts values are used (no hardcoded keys)

No secrets committed

[Expected Output/Deliverable:] Reusable Supabase client configured for the website.
[Dependencies/Pre-requisites:] Env scaffold complete.
[Checkpoint:] App builds with supabase client imported successfully.

Prompt 5.2 — Supabase Waitlist Table Schema

[Phase: 5. Backend]
[Feature: Database Schema]
[Task: Create waitlist_users table + basic constraints]
[Context:] Store seeker/provider waitlist signups from the website.
[Current Directory Context:] Supabase SQL Editor

[Detailed Instructions:]
Create table:
waitlist_users
Fields:

id uuid primary key default gen_random_uuid()

full_name text not null

email text not null

role text not null check (role in ('seeker','provider'))

organization text null

message text null

source text null default 'website'

created_at timestamptz not null default now()

Constraints:

organization required when role='provider' (check constraint)

optional unique index on lower(email) if you want to prevent duplicates

Add index:

created_at desc

lower(email)

[Expected Output/Deliverable:] waitlist_users table ready for inserts.
[Dependencies/Pre-requisites:] Supabase project created.
[Checkpoint:] Manual insert query succeeds in SQL editor.

Prompt 5.3 — RLS + Insert Policy for Public Waitlist

[Phase: 5. Backend]
[Feature: Security]
[Task: Enable RLS and allow safe public insert only]
[Context:] Website users should be able to submit the waitlist form without exposing read access.
[Current Directory Context:] Supabase SQL Editor

[Detailed Instructions:]
Enable RLS on waitlist_users.

Policies:

Allow INSERT for anon role (website form)

Deny SELECT/UPDATE/DELETE for anon role

(Optional) Allow SELECT for authenticated admin role later

If using anon public insert:

Keep table write-only from website perspective

No client-side reads from this table

Optional hardening:

Add rate limiting later via Edge Function or captcha (not required in this prompt)

[Expected Output/Deliverable:] Public website can insert waitlist rows securely, but cannot read them.
[Dependencies/Pre-requisites:] Table exists.
[Checkpoint:] Test insert from app works; select from anon fails.

Prompt 5.4 — Wire Waitlist Form to Supabase (Replace Mock Submit)

[Phase: 5. Backend]
[Feature: Waitlist Submission]
[Task: Replace local mock submit with real Supabase insert]
[Context:] UI and validation are already done; only swap submit handler.
[Current Directory Context:] HOU2ED/site/src/components/sections/Waitlist.tsx

[Detailed Instructions:]
Update submit flow:

Keep react-hook-form + zod validation exactly as-is

On valid submit, insert row into waitlist_users:
{ full_name, email, role, organization, message, source:'website' }

Behavior:

Disable submit button while loading

On success:

show success toast

reset form

On failure:

show error toast

preserve form values

Handle duplicate email case gracefully if unique constraint exists

Success copy:
“Thank you. You’ve been added to the Hou2ed waitlist.”

Error copy:
“Something went wrong. Please try again.”

[Expected Output/Deliverable:] Real waitlist signups persist in Supabase from the website.
[Dependencies/Pre-requisites:] Supabase client + table + RLS policies complete.
[Checkpoint:] Submit form → row appears in Supabase table.

Prompt 5.5 — Basic Admin Export Prep (Optional, No Admin UI)

[Phase: 5. Backend]
[Feature: Data Ops]
[Task: Add source tagging and future-proof fields for exports]
[Context:] No admin dashboard yet, but prepare data cleanly for later outreach/export.
[Current Directory Context:] Supabase SQL Editor + website submit handler

[Detailed Instructions:]
Ensure submit payload includes:

source = 'website'

created_at auto timestamp

Optional schema additions:

status text default 'new'

notes text null

No admin UI needed.
This prompt is only for clean data structure and future CRM/export workflows.

[Expected Output/Deliverable:] Waitlist records are clean and export-friendly.
[Dependencies/Pre-requisites:] Waitlist insert working.
[Checkpoint:] New rows include source + timestamps consistently.
