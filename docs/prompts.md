📱 HOU2ED — APP PROMPTS (SCREEN-FIRST, THEN BACKEND)
PHASE 0 — APP FOUNDATION (Expo, TS, Nav, Linting)
Prompt 0.1 — Bootstrap Expo + TS + Safe Providers
[Phase: 0. App Foundation]
[Feature: Expo Base]
[Task: Initialize Expo TS app + base providers + tabs]
[Context:] We need a stable base to hang screens on with the Black/Gold/White brand.
[Current Directory Context:] HOU2ED/app/
[Detailed Instructions:]
Init:
npx create-expo-app@latest . --template
# choose "Blank (TypeScript)"
Install deps:
npm i @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs \
react-native-screens react-native-safe-area-context react-native-gesture-handler react-native-reanimated \
@tanstack/react-query zustand react-hook-form zod \
@supabase/supabase-js expo-secure-store \
expo-document-picker expo-image-picker \
react-native-maps
Create folders:
src/
  theme/ (tokens.ts, styles.ts)
  components/ui/ (Button.tsx, Input.tsx, Chip.tsx, Badge.tsx, Card.tsx, Toggle.tsx, Checkbox.tsx, Toast.tsx, ModalSheet.tsx)
  components/patterns/ (PhotoCarousel.tsx, InlineCounter.tsx, ListingCard.tsx)
  providers/ (AuthProvider.tsx, QueryProvider.tsx, ToastProvider.tsx, ErrorBoundary.tsx)
  state/ (useAuthStore.ts, useFilterStore.ts, useSavedStore.ts)
  navigation/ (RootNavigator.tsx, TabNavigator.tsx, linking.ts)
  screens/ (placeholder folders only for now)
  lib/ (supabase.ts)
  utils/ (a11y.ts, format.ts, env.ts)
Set up TabNavigator with tabs: Home, Search, Messages, Saved, Profile (icons temporary).
In app.json: set "scheme": "hou2ed", placeholder icon/splash.
[Expected Output/Deliverable:] App launches to a 5-tab shell with providers mounted (React Query, ErrorBoundary, Toast).
[Dependencies/Pre-requisites:] Node/Expo installed.
[Checkpoint:] Run npx expo start → tabs visible, no red screens.
Prompt 0.2 — Linting, Formatting, VSCode Hygiene
[Phase: 0. App Foundation]
[Feature: Code Quality]
[Task: ESLint + Prettier + EditorConfig + VSCode settings]
[Context:] Stable dev ergonomics.
[Current Directory Context:] HOU2ED/app/
[Detailed Instructions:]
Install:
npm i -D eslint @react-native/eslint-config @typescript-eslint/parser @typescript-eslint/eslint-plugin \
eslint-config-prettier eslint-plugin-import eslint-plugin-react eslint-plugin-react-hooks \
prettier lint-staged husky
Files:
.eslintrc.cjs (TS, RN, import/order)
.prettierrc { "singleQuote": true, "printWidth": 100 }
.editorconfig (2 spaces, utf-8)
.vscode/settings.json enable formatOnSave + eslint.validate ts/tsx
package.json:
"lint": "eslint . --ext .ts,.tsx"
"format": "prettier --write ."
"prepare": "husky install"
lint-staged to run eslint + prettier on staged files
npx husky add .husky/pre-commit "npx lint-staged"
[Expected Output/Deliverable:] Pre-commit fixes lint & format.
[Dependencies/Pre-requisites:] Git initialized.
[Checkpoint:] npx eslint . passes.
Prompt 0.3 — Env & Secrets (App-side only)
[Phase: 0. App Foundation]
[Feature: Env Handling]
[Task: .env.example + utils/env.ts]
[Context:] Prepare app for Supabase keys and tokens later.
[Current Directory Context:] HOU2ED/app/
[Detailed Instructions:]
Add .env.example with:
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_MAPS_PROVIDER="google"
EXPO_PUBLIC_MAPS_IOS_API_KEY=
EXPO_PUBLIC_MAPS_ANDROID_API_KEY=
EXPO_PUBLIC_SENTRY_DSN=
EXPO_PUBLIC_POSTHOG_KEY=
src/utils/env.ts: read from process.env.EXPO_PUBLIC_* with strict zod validation; throw descriptive errors in dev if missing.
[Expected Output/Deliverable:] Clean env scaffold without secrets committed.
[Dependencies/Pre-requisites:] None.
[Checkpoint:] Build runs with empty placeholders.
PHASE 1 — THEME & PRIMITIVES (Black/Gold/White)
Prompt 1.1 — Tokens & Global Styles
[Phase: 1. Theme]
[Feature: Tokens]
[Task: tokens.ts + styles.ts]
[Context:] Brand: Black bg, Gold accents, White legibility.
[Current Directory Context:] HOU2ED/app/src/theme/
[Detailed Instructions:]
tokens.ts export:
colors: black:#000000, gold:#D4AF37, white:#FFFFFF, green:#21C55D, amber:#F59E0B, red:#EF4444, gray:#6B7280
radius: sm:8, md:12, lg:16
spacing scale: 4,8,12,16,20,24…
shadow presets (subtle)
typography: headings = semibold, body = regular
styles.ts export helpers:
screen: full black bg, default padding
text: white body, gold headings (styleHeading, styleSubheading, styleBody)
focusRing: gold outline style util
hitSlop util 10–12
[Expected Output/Deliverable:] Importable tokens + helpers.
[Dependencies/Pre-requisites:] None.
[Checkpoint:] A demo screen renders heading gold on black.
Prompt 1.2 — Core UI Components (A11y baked in)
[Phase: 1. Theme]
[Feature: Primitives]
[Task: Button, Input, Chip, Badge, Card, Toggle, Checkbox, Toast, ModalSheet]
[Context:] Match PRD visuals exactly.
[Current Directory Context:] HOU2ED/app/src/components/ui/
[Detailed Instructions:]
Button.tsx: variant: 'primary'|'secondary'| 'ghost', size: 'lg'|'md', loading, disabled;
Primary: gold bg, black text, radius 12, min height 48; accessibilityRole="button"; focus ring gold.
Input.tsx: black field, white 1px border, gold glow on focus; label + help/error text (red under field).
Chip.tsx: inactive black + white border; active gold + black text.
Badge.tsx: pill; types: available (green), full (gray), verified (gold✓), facility (gold) with icon.
Card.tsx: black bg, 1px gold border, subtle shadow; supports header, media, body, footer slots.
Toggle.tsx, Checkbox.tsx: white outline; selected fill gold.
Toast.tsx: context + hook; variants success/warn/error; appear top; auto-dismiss.
ModalSheet.tsx: bottom sheet with drag handle, gold header, dismiss X (white).
All components: a11y labels/roles, min hit area 44×44, testIDs.
[Expected Output/Deliverable:] Reusable, themed primitives.
[Dependencies/Pre-requisites:] tokens/styles.
[Checkpoint:] Build a throwaway “Styleguide” screen temporarily to preview.
PHASE 2 — BRAND & ONBOARDING
Prompt 2.1 — Splash
[Phase: 2. Brand]
[Feature: Splash Screen]
[Task: Glow logo + auto advance]
[Context:] Premium intro.
[Current Directory Context:] HOU2ED/app/src/screens/Onboarding/
[Detailed Instructions:]
Splash.tsx:
Full black bg.
Center “HOU2ED” in gold; animate the 2 with gentle glow (opacity pulse).
Tagline (white) below.
Gold spinner bottom center.
setTimeout → navigate to Slides at ~2500ms.
[Expected Output/Deliverable:] Smooth intro → slides.
[Dependencies/Pre-requisites:] Nav ready.
[Checkpoint:] No crashes on slow devices.
Prompt 2.2 — Onboarding Slides (3)
[Phase: 2. Brand]
[Feature: Slides]
[Task: Story carousel with dots + Skip/Next/Get started]
[Context:] Togetherness → Second chances → No one stands alone.
[Current Directory Context:] HOU2ED/app/src/screens/Onboarding/
[Detailed Instructions:]
Slides.tsx with local images/simple SVGs in gold/white.
Titles in gold, body in white.
Dots: white inactive, gold active.
Top-right Skip (white), bottom-right Next (gold), final = Get started → RoleSelect.
Persist “seenSlides=true” in SecureStore to skip next launches.
[Expected Output/Deliverable:] Polished, accessible slides.
[Dependencies/Pre-requisites:] Splash complete.
[Checkpoint:] Yes.
Prompt 2.3 — Role Select
[Phase: 2. Brand]
[Feature: RoleSelect]
[Task: Seeker vs Provider]
[Context:] Provider can also search.
[Current Directory Context:] HOU2ED/app/src/screens/Onboarding/
[Detailed Instructions:]
Title (gold): “What would you like to do today”.
Two cards centered:
Find housing — gold card, black text & icon;
List housing — black card, gold border/text.
Helper text (white): “Providers can also search.”
Continue button (gold) → saves role to useAuthStore and navigates to Auth.
[Expected Output/Deliverable:] Role stored & nav continues.
[Dependencies/Pre-requisites:] Zustand store skeleton.
[Checkpoint:] Toggling roles re-opens correct flows.
PHASE 3 — AUTH (UI FIRST, THEN WIRE LATER)
Prompt 3.1 — Auth Scaffolding & Nav
[Phase: 3. Auth]
[Feature: Routes]
[Task: Screens + stack transitions]
[Context:] Build the UI first; backend later.
[Current Directory Context:] HOU2ED/app/src/screens/Auth/
[Detailed Instructions:]
Create files: Login.tsx, SignUp.tsx, VerifyCode.tsx, ForgotPassword.tsx.
All share a top row: small gold logo left, Help (white) right; collapsible “What HOU2ED means” (gold title → white body).
Add a mini header component to reuse.
Add stack transitions (fade slide).
[Expected Output/Deliverable:] Navigable auth stack.
[Dependencies/Pre-requisites:] Root navigator.
[Checkpoint:] Replace dummy content with forms next.
Prompt 3.2 — Login UI (brand accurate)
[Phase: 3. Auth]
[Feature: Login Screen]
[Task: Inputs + button + links]
[Context:] Email/username + password.
[Current Directory Context:] HOU2ED/app/src/screens/Auth/
[Detailed Instructions:]
Inputs using Input: “Email or username”, “Password”; show/hide password toggle.
Primary gold “Log in” (disabled until valid).
Link “Forgot password?” (white) → ForgotPassword.
Link “Don’t have an account? Sign up” (white) → SignUp.
Inline red errors slot below fields.
[Expected Output/Deliverable:] Pixel-perfect login UI.
[Dependencies/Pre-requisites:] UI primitives.
[Checkpoint:] Yes.
Prompt 3.3 — Sign Up UI + Client Validation
[Phase: 3. Auth]
[Feature: Signup Screen]
[Task: Fields + zod schema]
[Context:] Name, username, email, password, confirm.
[Current Directory Context:] HOU2ED/app/src/screens/Auth/
[Detailed Instructions:]
react-hook-form + zod schema (strong password hint).
Primary gold “Sign up”; on submit (mock for now) → VerifyCode.
Inline red errors; field focus gold glow.
[Expected Output/Deliverable:] Polished signup with validation.
[Dependencies/Pre-requisites:] Form libs installed.
[Checkpoint:] Yes.
Prompt 3.4 — Verify Code UI
[Phase: 3. Auth]
[Feature: OTP Modal/Screen]
[Task: 6 inputs with auto-advance + resend timer]
[Context:] Supabase OTP later.
[Current Directory Context:] HOU2ED/app/src/screens/Auth/
[Detailed Instructions:]
6 boxes, auto-advance, handle backspace.
“Resend code” disabled until 30s.
Confirm button → mock success → root tabs.
[Expected Output/Deliverable:] Smooth OTP UX.
[Dependencies/Pre-requisites:] Signup routes here.
[Checkpoint:] Yes.
Prompt 3.5 — Forgot Password UI
[Phase: 3. Auth]
[Feature: Reset]
[Task: Email field + success state]
[Context:] Wire later to Supabase.
[Current Directory Context:] HOU2ED/app/src/screens/Auth/
[Detailed Instructions:]
Single email field; gold “Send reset link”.
After submit, success toast; route back to Login.
[Expected Output/Deliverable:] Clean reset screen.
[Dependencies/Pre-requisites:] None.
[Checkpoint:] Yes.
PHASE 4 — SEEKER HOME, SEARCH & FILTERS (MOCK DATA)
Prompt 4.1 — Filter Store
[Phase: 4. Search]
[Feature: Zustand Store]
[Task: useFilterStore.ts with full schema]
[Context:] Must match your PRD filter catalog.
[Current Directory Context:] HOU2ED/app/src/state/
[Detailed Instructions:]
Define TS types for each filter group (HousingType, UnitBedType, Amenities, Accessibility, RoomDetails, Eligibility, SupportPrograms, CostPayment, LocationEnv, RulesRequirements, AvailabilityIntake, ProviderQuality, CommunityLifestyle, Advanced).
Store shape with defaults and methods: setFilter, clearAll, snapshot().
Persist to MMKV or AsyncStorage (via zustand/persist).
[Expected Output/Deliverable:] Strongly typed central filter state.
[Dependencies/Pre-requisites:] None.
[Checkpoint:] Yes.
Prompt 4.2 — Home (Map + Card Deck + Quick Chips)
[Phase: 4. Search]
[Feature: Home Screen]
[Task: Compose map + deck UI]
[Context:] Airbnb-like feel; mock results.
[Current Directory Context:] HOU2ED/app/src/screens/Home/
[Detailed Instructions:]
Top search bar: black, gold 1px border, white placeholder; left pin icon; right gold Filters icon → opens Filters sheet.
Quick chips: Immediate, Free, Veterans, Families, Near me (active gold).
Map (react-native-maps): black map style; markers gold if available, gray if full; stub heat overlay component.
Bottom deck (1/3 screen): horizontal SnapList of ListingCards (see 5.1); swipe syncs highlight on map; tap opens Details.
Panning/zooming map refreshes mock results (debounced).
[Expected Output/Deliverable:] Interactive home with map/deck sync (mock).
[Dependencies/Pre-requisites:] ListingCard scaffold.
[Checkpoint:] Yes.
Prompt 4.3 — Search Screen (List/Map + Sorts)
[Phase: 4. Search]
[Feature: Results Screen]
[Task: List/Map toggle + sorts + empty/offline]
[Context:] Sync with useFilterStore.
[Current Directory Context:] HOU2ED/app/src/screens/Search/
[Detailed Instructions:]
Top: search input + “Filters” gold button.
Toggle: Map / List.
Sort dropdown: Relevance, Cost (low→high), Distance, Updated most recent.
Empty state: “No matches. Try widening your distance…” + gold “Clear filters”.
Offline banner (white): “Offline. Changes will send when connected.”
[Expected Output/Deliverable:] Fully styled results list (mock).
[Dependencies/Pre-requisites:] Filter store plumbed in.
[Checkpoint:] Yes.
Prompt 4.4 — Filters Sheet (Full Catalog UI)
[Phase: 4. Search]
[Feature: Filters]
[Task: Bottom ModalSheet with accordions + controls]
[Context:] Only city/zip & numeric ranges allow typing.
[Current Directory Context:] HOU2ED/app/src/screens/Search/
[Detailed Instructions:]
Header bar: title gold; “Clear all” (white, left); “Apply” (gold, right).
All groups as accordions; options via Checkbox/Toggle/Slider components.
Sticky gold footer: “Apply Filters”.
On Apply: persist snapshot (useFilterStore.snapshot()), close sheet, refresh results.
[Expected Output/Deliverable:] One-tap, click-only filtering.
[Dependencies/Pre-requisites:] UI primitives done.
[Checkpoint:] Yes.
PHASE 5 — LISTINGS PRESENTATION
Prompt 5.1 — ListingCard Component (Reusable)
[Phase: 5. Listings]
[Feature: Card]
[Task: Media + text + badges + facility lines]
[Context:] Normal housing + facility badges (“5150 capable”, “Medical respite”, “Detox”).
[Current Directory Context:] HOU2ED/app/src/components/patterns/
[Detailed Instructions:]
Props: coverUri, title, type, neighborhood, cost, availableCount, verified, badges: Array<'5150'|'respite'|'detox'>, onPress.
Layout: image with thin gold frame, title (gold), neighborhood/cost (white), badges row; availability badge: green “Beds today” if >0; verified badge gold ✓.
Facility extra (optional small text): “Intake: [hours] • [phone]” (white).
[Expected Output/Deliverable:] Shared card used by Home + Results + Saved.
[Dependencies/Pre-requisites:] Badge primitive.
[Checkpoint:] Yes.
Prompt 5.2 — PhotoCarousel
[Phase: 5. Listings]
[Feature: Media carousel]
[Task: Swipe images with gold dots/chevrons]
[Context:] Used on Details.
[Current Directory Context:] HOU2ED/app/src/components/patterns/
[Detailed Instructions:]
Full-width, paging enabled; gold dots indicator; left/right chevrons tappable.
Supports 1–12 images; fallback skeleton if empty.
[Expected Output/Deliverable:] Smooth swipe with accessibility labels.
[Dependencies/Pre-requisites:] None.
[Checkpoint:] Yes.
Prompt 5.3 — Listing Details Screen
[Phase: 5. Listings]
[Feature: Details]
[Task: Sections + quick stats + sticky CTA]
[Context:] DV redaction supported.
[Current Directory Context:] HOU2ED/app/src/screens/Listing/
[Detailed Instructions:]
Top PhotoCarousel.
Header: Title (gold), provider name (white), Verified badge.
Quick stats row (cards on black): Beds available (green if >0), Cost, Intake method, Last updated (white with gold icons).
Sections (collapsible): Overview, Amenities, Services, Rules & Eligibility, Location map (dark; center marker gold), Reviews placeholder.
DV sensitive flag (from data) → hide exact address/map; show “Sensitive location — hidden for safety.”
Sticky bottom bar: Save (left icon), Apply now (right gold button).
[Expected Output/Deliverable:] High-polish details page (mock data).
[Dependencies/Pre-requisites:] PhotoCarousel, ListingCard parity.
[Checkpoint:] Yes.
PHASE 6 — APPLICATIONS (UI + LOCAL MOCK)
Prompt 6.1 — Apply Wizard Step 1 (Info)
[Phase: 6. Applications]
[Feature: Step 1]
[Task: Prefill name/contact + validate]
[Context:] Local mock object; real submit later.
[Current Directory Context:] HOU2ED/app/src/screens/Applications/
[Detailed Instructions:]
Fields: Full name, Phone, Email (prefill from profile store later).
Next in gold; disable until valid; inline errors.
Persist progress to local state to survive back navigation.
[Expected Output/Deliverable:] Step 1 works smoothly.
[Dependencies/Pre-requisites:] Form libs.
[Checkpoint:] Yes.
Prompt 6.2 — Apply Wizard Step 2 (Eligibility)
[Phase: 6. Applications]
[Feature: Step 2]
[Task: Tag selection]
[Context:] Mirrors filter tags relevant to matching.
[Current Directory Context:] same
[Detailed Instructions:]
Click-only chips: age/gender/families/veterans/LGBTQ+/DV survivors/disabilities etc.
Next (gold) → Step 3.
[Expected Output/Deliverable:] Tags stored in draft.
[Dependencies/Pre-requisites:] Chip component.
[Checkpoint:] Yes.
Prompt 6.3 — Apply Wizard Step 3 (Documents)
[Phase: 6. Applications]
[Feature: Step 3]
[Task: Upload PDFs/images + progress + retry]
[Context:] Storage wiring later.
[Current Directory Context:] same
[Detailed Instructions:]
Required checklist: ID, insurance, income proof, referral letter (depending on listing flags, mock).
Use expo-document-picker/expo-image-picker; show file rows with size/type, progress bar, retry button, remove.
Validate max 10MB; show errors like: “Please upload a valid image under 10 MB”.
[Expected Output/Deliverable:] Solid uploader UX (mock).
[Dependencies/Pre-requisites:] Primitives + toasts.
[Checkpoint:] Yes.
Prompt 6.4 — Apply Wizard Step 4 (Review & Submit + E-Sign)
[Phase: 6. Applications]
[Feature: Step 4]
[Task: Summary + typed signature + consent]
[Context:] Store immutable consent record later in backend.
[Current Directory Context:] same
[Detailed Instructions:]
Review table; edit links per section.
Signature pad (simple canvas) captures typed name + timestamp + masked IP text (placeholder).
Submit → local success screen: “Application submitted”; CTA to “View status” (Applications list).
[Expected Output/Deliverable:] Flawless submit UX (local mock).
[Dependencies/Pre-requisites:] Steps 1–3.
[Checkpoint:] Yes.
Prompt 6.5 — Applications List + Status Timeline
[Phase: 6. Applications]
[Feature: List + Status]
[Task: Cards with status chip + timeline view]
[Context:] Links to Messaging thread.
[Current Directory Context:] HOU2ED/app/src/screens/Applications/
[Detailed Instructions:]
List cards: listing title, status chip, last update time.
Detail timeline (Submitted → Docs needed → Interview → Approved/Denied).
CTA “Open Messages”.
[Expected Output/Deliverable:] Clear status visibility.
[Dependencies/Pre-requisites:] Apply wizard created local entries.
[Checkpoint:] Yes.
PHASE 7 — MESSAGES
Prompt 7.1 — Inbox
[Phase: 7. Messages]
[Feature: Inbox]
[Task: Conversation list]
[Context:] Each application has a thread.
[Current Directory Context:] HOU2ED/app/src/screens/Messages/
[Detailed Instructions:]
Black cards, sender in gold, last message in white, time on right.
Tap → Thread.
[Expected Output/Deliverable:] Clean inbox (mock).
[Dependencies/Pre-requisites:] Applications exist.
[Checkpoint:] Yes.
Prompt 7.2 — Thread
[Phase: 7. Messages]
[Feature: Chat]
[Task: Bubbles + attachments + read receipts (visual)]
[Context:] Abuse report option present.
[Current Directory Context:] same
[Detailed Instructions:]
You = gold bubbles; Provider = white bubbles; timestamps; read tick (stub).
Attachment picker; preview chips; long-press to open.
Header menu: “Report abuse” → modal text area → toast “Sent to moderation”.
[Expected Output/Deliverable:] Seamless chat UX (mock).
[Dependencies/Pre-requisites:] UI primitives.
[Checkpoint:] Yes.
PHASE 8 — SAVED & PROFILE
Prompt 8.1 — Saved
[Phase: 8. Saved & Profile]
[Feature: Saved Listings]
[Task: Grid view + share + long-press remove]
[Context:] Uses useSavedStore.
[Current Directory Context:] HOU2ED/app/src/screens/Saved/
[Detailed Instructions:]
Grid of ListingCard tiles; share action uses system share; long-press → remove with confirmation.
[Expected Output/Deliverable:] Smooth saved management.
[Dependencies/Pre-requisites:] ListingCard ready.
[Checkpoint:] Yes.
Prompt 8.2 — Profile
[Phase: 8. Saved & Profile]
[Feature: Profile Home]
[Task: Avatar ring + sections + settings]
[Context:] No owner analytics UI.
[Current Directory Context:] HOU2ED/app/src/screens/Profile/
[Detailed Instructions:]
Avatar (gold ring) + edit;
Sections: Applications, Saved searches, Account settings (change password, notification toggles, delete account with confirm).
Use gold focus rings; aria labels for all icon buttons.
[Expected Output/Deliverable:] Polished profile hub.
[Dependencies/Pre-requisites:] Applications list.
[Checkpoint:] Yes.
PHASE 9 — PROVIDER QUICK TOOL
Prompt 9.1 — Availability Updater
[Phase: 9. Provider]
[Feature: Quick Update]
[Task: Inline counters + stale banner + deep link]
[Context:] One-tap updates for daily workflow.
[Current Directory Context:] HOU2ED/app/src/screens/Provider/
[Detailed Instructions:]
Table rows: title, last updated, InlineCounter (+/−) for beds; sticky “Save all” (gold).
If >48h: amber banner “Data may be stale. Confirm no change today” (button sets last_updated only).
Handle deep link hou2ed://provider/update → this screen.
[Expected Output/Deliverable:] Super fast updater UX (mock).
[Dependencies/Pre-requisites:] Role=provider set from RoleSelect.
[Checkpoint:] Yes.
PHASE 10 — I18N + A11Y + PERF POLISH
Prompt 10.1 — i18n Scaffolding
[Phase: 10. Polish]
[Feature: i18n]
[Task: English default + Spanish pack later]
[Context:] Wire simple loader & hook.
[Current Directory Context:] HOU2ED/app/src/
[Detailed Instructions:]
Add i18n/index.ts with tiny dictionary + t() helper; file i18n/en.json now; create es.json placeholder.
Wrap app with I18nProvider; settings toggle (stub) in Profile.
[Expected Output/Deliverable:] Translatable strings infra.
[Dependencies/Pre-requisites:] None.
[Checkpoint:] Yes.
Prompt 10.2 — Accessibility Pass
[Phase: 10. Polish]
[Feature: A11y]
[Task: WCAG 2.1 AA checks]
[Context:] Verify contrast, focus order, labels, targets.
[Current Directory Context:] whole app
[Detailed Instructions:]
Ensure gold/white on black meet AA;
All icon buttons have accessibilityLabel;
Focus rings gold;
Tap targets ≥44px;
Do not use color alone for errors; keep inline text.
[Expected Output/Deliverable:] A11y checklist complete.
[Dependencies/Pre-requisites:] Screens complete.
[Checkpoint:] Yes.
Prompt 10.3 — Performance Budget Hooks
[Phase: 10. Polish]
[Feature: Perf metrics]
[Task: Instrument timers for search + map]
[Context:] No analytics UI; just internal events ready.
[Current Directory Context:] HOU2ED/app/src/utils/
[Detailed Instructions:]
Add simple perf.ts util to measure durations (P95 targets: search <1.5s, map update <3s).
Log to console in dev; prepare PostHog calls behind a feature flag (do not expose UI).
[Expected Output/Deliverable:] Perf hooks integrated.
[Dependencies/Pre-requisites:] Results screen complete.
[Checkpoint:] Yes.
🛠 BACKEND PHASES (CONNECT AFTER SCREENS)
PHASE B1 — SUPABASE CLIENT & AUTH
Prompt B1.1 — Supabase Client & AuthProvider (Real)
[Phase: B1. Supabase Auth]
[Feature: Client + Session]
[Task: Wire real Supabase + session persistence]
[Context:] Replace mock logic in Auth screens.
[Current Directory Context:] HOU2ED/app/src/lib/ and providers/
[Detailed Instructions:]
lib/supabase.ts:
import { createClient } from '@supabase/supabase-js'
import { env } from '../utils/env'
export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY)
providers/AuthProvider.tsx:
State: session, user, loading.
Methods: signUp({ name, username, email, password }), signIn({ login, password }), signOut().
Use expo-secure-store to persist session token.
Handle onAuthStateChange to hydrate.
Update Auth screens to call real methods.
[Expected Output/Deliverable:] Sign up → Verify → Login → Tabs (real).
[Dependencies/Pre-requisites:] Supabase project ready.
[Checkpoint:] You can sign up, receive OTP, verify, and login.
PHASE B2 — DB SCHEMA (NO OWNER ANALYTICS UI)
Prompt B2.1 — Core Tables & Enums
[Phase: B2. Schema]
[Feature: Tables]
[Task: Create tables with RLS]
[Context:] Mirror PRD data model (no analytics UI).
[Current Directory Context:] Supabase > SQL editor
[Detailed Instructions:]
Create:
profiles (id UUID=auth.users.id PK, role enum seeker|provider|admin, name, username unique, phone, verified_provider bool, created_at, updated_at)
listings (id, provider_id FK profiles, address fields, lat/lng, housing_type enum incl hospitals/respite/detox, unit_beds jsonb, ada_beds int, gender_rooming enum, amenities/accessibility/eligibility/services/rules/cost/intake jsonb, availability jsonb { beds_today, beds_week, waitlist, last_updated_at }, verified bool, certifications jsonb, images text[], responsiveness jsonb, created_at, updated_at, dv_sensitive bool)
applications (id, listing_id FK, seeker_id FK, status enum, stage_timestamps jsonb, notes, decision_by, decision_note, created_at, updated_at)
documents (id, application_id FK, type enum, file_url, status enum, rejection_reason, uploaded_by, created_at, updated_at)
threads (id, listing_id, participants UUID[], created_at)
messages (id, thread_id, sender_id, body, attachment_urls text[], created_at, read_at)
RLS:
profiles: user can select/update self; admin broader.
listings: readable by all seekers; providers update only own; DV guards later.
applications: seeker can CRUD own; provider can read for their listings; updates per status rules.
documents: owner/linked parties only.
threads/messages: participants-only.
[Expected Output/Deliverable:] Schema created with enums + RLS enabled.
[Dependencies/Pre-requisites:] Supabase project.
[Checkpoint:] Queries behave per role.
Prompt B2.2 — Storage Buckets & Policies
[Phase: B2. Schema]
[Feature: Storage]
[Task: Buckets + access]
[Context:] Secure docs, public listing covers.
[Current Directory Context:] Supabase Storage
[Detailed Instructions:]
Buckets: listing-images (covers can be public), application-docs (private).
Policies: signed upload URLs; listing images writable by provider owner; docs readable/writable by seeker & provider tied to application.
[Expected Output/Deliverable:] Tested signed upload/read rules.
[Dependencies/Pre-requisites:] Tables done.
[Checkpoint:] Direct public read only for published covers.
PHASE B3 — SEARCH & DV SAFETY
Prompt B3.1 — Search RPC fn_search_rank
[Phase: B3. Search]
[Feature: RPC]
[Task: Return ranked results with score breakdown]
[Context:] Implements PRD scoring (0–100).
[Current Directory Context:] Supabase SQL (Functions)
[Detailed Instructions:]
Inputs: query jsonb { coords, radius, filters snapshot, paging, show_stale bool }.
Score: Distance (0–20), Availability (0–20), Eligibility (0–20), Services (0–10), Cost (0–10), Quality/Freshness (0–20).
Tie-break: distance, then last_updated.
Hide/demote stale >14d unless show_stale=true.
Return rows with score, reasons[], special badges flags.
Indexes: GIST on geography, GIN on jsonb filter fields.
[Expected Output/Deliverable:] Callable from app with pagination.
[Dependencies/Pre-requisites:] listings populated (seed).
[Checkpoint:] Example call returns expected ordering.
Prompt B3.2 — DV Safety Guard (Edge Function or View)
[Phase: B3. Search]
[Feature: Safety]
[Task: Obfuscate DV coords for unauthorized roles]
[Context:] Hide precise locations unless permitted.
[Current Directory Context:] Supabase Edge Functions (Deno) or Secure View
[Detailed Instructions:]
If dv_sensitive=true and requester is not provider owner/admin, replace lat/lng with polygon centroid offset or city-level centroid; drop street address.
Ensure logs/exports respect redaction.
[Expected Output/Deliverable:] Unauthorized reads always see obfuscated geometry.
[Dependencies/Pre-requisites:] Listings with dv_sensitive.
[Checkpoint:] Tested via anon key fetch.
PHASE B4 — WIRE APP TO BACKEND
Prompt B4.1 — Auth (Real)
[Phase: B4. App Wiring]
[Feature: Auth]
[Task: Replace mocks in screens]
[Context:] Live Supabase flows.
[Current Directory Context:] Auth screens
[Detailed Instructions:]
SignUp → supabase.auth.signUp({ email, password, options: { data:{ name, username, roleFromRoleSelect }}})
VerifyCode → supabase.auth.verifyOtp(...)
Login → signInWithPassword (if username, first lookup email via profiles).
ForgotPassword → resetPasswordForEmail with deep link to app scheme.
[Expected Output/Deliverable:] Fully working auth flows.
[Dependencies/Pre-requisites:] B1 done.
[Checkpoint:] Manual test complete.
Prompt B4.2 — Listings Fetch + Search Hook
[Phase: B4. App Wiring]
[Feature: Search Hook]
[Task: useSearch.ts calling RPC]
[Context:] Map/list use same data source.
[Current Directory Context:] HOU2ED/app/src/hooks/
[Detailed Instructions:]
Map useFilterStore.snapshot() into RPC payload.
React Query for caching/infinite scroll; return items + meta + score.
Wire Home + Search screens to hook.
[Expected Output/Deliverable:] Real results power both views.
[Dependencies/Pre-requisites:] RPC working.
[Checkpoint:] Filters affect results immediately.
Prompt B4.3 — Listing Images (Storage)
[Phase: B4. App Wiring]
[Feature: Media]
[Task: Fetch covers, prefetch cache]
[Context:] Speedy card rendering.
[Current Directory Context:] ListingCard + Details
[Detailed Instructions:]
If images public: direct URLs; else signed URLs for Details.
Cache with Image.prefetch.
[Expected Output/Deliverable:] Snappy images.
[Dependencies/Pre-requisites:] Storage policies.
[Checkpoint:] Low scroll jank.
Prompt B4.4 — Apply Flow (Create Application + Docs Upload)
[Phase: B4. App Wiring]
[Feature: Applications]
[Task: Create application rows + signed uploads]
[Context:] Turn wizard into real writes.
[Current Directory Context:] Apply screens
[Detailed Instructions:]
Step 4 submit: insert into applications with status new; link to listing + seeker_id.
For each doc, obtain signed upload URL from application-docs, PUT bytes, then insert document row with status uploaded.
Consent: store immutable row with signature hash/time in consents (add table if not present) or within applications.stage_timestamps.
[Expected Output/Deliverable:] End-to-end submissions appear in DB.
[Dependencies/Pre-requisites:] Tables + Storage.
[Checkpoint:] Submission visible in provider portal later.
Prompt B4.5 — Messages (Threads + Realtime)
[Phase: B4. App Wiring]
[Feature: Chat]
[Task: Create/read messages with participants RLS]
[Context:] Attachments with signed URLs.
[Current Directory Context:] Messages
[Detailed Instructions:]
On first send, ensure thread exists for (application_id, seeker_id, provider_id).
Insert message rows; subscribe to thread via Supabase Realtime channel; update read_at on focus.
[Expected Output/Deliverable:] Bi-directional chat live.
[Dependencies/Pre-requisites:] Threads/messages tables.
[Checkpoint:] Latency under 1s.
Prompt B4.6 — Saved Listings & Saved Searches
[Phase: B4. App Wiring]
[Feature: Saves]
[Task: Persist per user]
[Context:] Alerts later.
[Current Directory Context:] Saved + Profile
[Detailed Instructions:]
Create saved_listings & saved_searches tables with RLS auth.uid().
Implement save/unsave mutations; persist filter snapshots for saved searches.
[Expected Output/Deliverable:] Durable saves.
[Dependencies/Pre-requisites:] Schema update.
[Checkpoint:] Data survives re-login.
Prompt B4.7 — Provider Availability (RPC)
[Phase: B4. App Wiring]
[Feature: Availability]
[Task: RPC update + confirm no change]
[Context:] Connect Quick Updater.
[Current Directory Context:] Provider screen
[Detailed Instructions:]
Create RPC fn_update_availability(listing_id, beds_today, beds_week, waitlist, confirm_only boolean); enforce provider ownership in RLS.
Call RPC on Save All; on Confirm No Change, set confirm_only=true.
[Expected Output/Deliverable:] Counts + timestamps update.
[Dependencies/Pre-requisites:] Listings table.
[Checkpoint:] Last updated changes.
PHASE B5 — SECURITY, DV REDACTION, POLICIES
Prompt B5.1 — RLS Refinement
[Phase: B5. Security]
[Feature: Policies]
[Task: Tighten per-table policies]
[Context:] Protect PII & DV locations.
[Current Directory Context:] Supabase SQL
[Detailed Instructions:]
Profiles: self read/update, admin elevated.
Listings: everyone can select base fields; coordinates obfuscated via view/guard for DV items unless provider/admin.
Applications/Documents: seeker owner; providers only if listing owner; admin for moderation.
Messages: participants only.
[Expected Output/Deliverable:] Least-privilege access.
[Dependencies/Pre-requisites:] All tables present.
[Checkpoint:] Negative tests fail correctly.
PHASE B6 — QA, TESTS, BUILDS
Prompt B6.1 — Unit Tests (Jest + RTL)
[Phase: B6. QA/Release]
[Feature: Unit]
[Task: Configure + write core tests]
[Context:] Components + hooks.
[Current Directory Context:] app root
[Detailed Instructions:]
Install Jest & @testing-library/react-native; config for Expo.
Tests: ListingCard, FiltersSheet state, useSearch (mock RPC).
[Expected Output/Deliverable:] npm test green.
[Dependencies/Pre-requisites:] Components in place.
[Checkpoint:] Yes.
Prompt B6.2 — E2E (Detox)
[Phase: B6. QA/Release]
[Feature: E2E]
[Task: iOS/Android flows]
[Context:] Critical paths.
[Current Directory Context:] app root
[Detailed Instructions:]
Configure Detox; write tests: sign-up→verify→login→search→details→apply draft.
[Expected Output/Deliverable:] E2E suite runs locally.
[Dependencies/Pre-requisites:] Simulators available.
[Checkpoint:] Yes.
Prompt B6.3 — EAS Builds
[Phase: B6. QA/Release]
[Feature: CI/CD]
[Task: eas.json + store assets]
[Context:] Internal test tracks.
[Current Directory Context:] app root
[Detailed Instructions:]
Configure EAS profiles (dev, preview, prod); upload icons/splash; run eas build.
[Expected Output/Deliverable:] TestFlight/Play Console internal builds.
[Dependencies/Pre-requisites:] Store creds.
[Checkpoint:] Builds succeed.
🖥 AFTER THE APP IS DONE — PROVIDER WEBSITE/PORTAL PROMPTS (RN Web)
These are sequenced after the app. They reuse theme/components and add provider/admin tooling (no owner analytics UI).
PHASE W0 — PORTAL FOUNDATION
Prompt W0.1 — RN Web Init & Share Components
[Phase: W0. Portal Foundation]
[Feature: Expo Web]
[Task: New app at /portal sharing UI via workspaces]
[Context:] Provider/Admin portal on web with same brand.
[Current Directory Context:] HOU2ED/portal/
[Detailed Instructions:]
Init Expo (TS) targeting web.
NPM workspace to import app/src/components and app/src/theme via aliases.
Web server boots at localhost:19006.
[Expected Output/Deliverable:] Portal shell running, themed.
[Dependencies/Pre-requisites:] Monorepo workspaces.
[Checkpoint:] Yes.
PHASE W1 — AUTH & ROLE-GATED ROUTING
Prompt W1.1 — Role Guard
[Phase: W1. Auth/Routing]
[Feature: Gate]
[Task: HOC to gate provider/admin routes]
[Context:] Pull profiles.role from Supabase.
[Current Directory Context:] portal/src/
[Detailed Instructions:]
Auth with Supabase; withRole('provider'|'admin') HOC; unauthorized → sign-in.
[Expected Output/Deliverable:] Role-safe nav.
[Dependencies/Pre-requisites:] Supabase working.
[Checkpoint:] Yes.
PHASE W2 — PROVIDER DASHBOARD & LISTINGS
Prompt W2.1 — Provider Dashboard
[Phase: W2. Provider]
[Feature: Home]
[Task: KPIs + notifications (no owner analytics UI)]
[Context:] Show Beds available, New applications, Add new listing.
[Current Directory Context:] portal/src/screens/
[Detailed Instructions:]
Tiles: black cards with gold numbers; notifications panel.
[Expected Output/Deliverable:] Live counts from DB.
[Dependencies/Pre-requisites:] Queries ready.
[Checkpoint:] Yes.
Prompt W2.2 — Listing Wizard (Steps 1–11)
[Phase: W2. Provider]
[Feature: Listings CRUD]
[Task: Full wizard matching PRD fields]
[Context:] Save per step with zod validation.
[Current Directory Context:] portal/src/screens/Listings/
[Detailed Instructions:]
Steps: Basic → Units/Beds → Amenities → Accessibility → Eligibility → Services → Rules → Cost → Intake/Availability → Photos → Preview/Publish.
After publish: show calendar reminder panel with .ics generator + deep link hou2ed://provider/update.
[Expected Output/Deliverable:] Published listing visible in app search.
[Dependencies/Pre-requisites:] Storage + policies.
[Checkpoint:] Yes.
Prompt W2.3 — Availability Updater (Web)
[Phase: W2. Provider]
[Feature: Daily Update]
[Task: Inline counters + confirm no change]
[Context:] Mirror mobile quick tool.
[Current Directory Context:] portal/src/screens/
[Detailed Instructions:]
Same behavior; updates via RPC fn_update_availability.
[Expected Output/Deliverable:] Realtime reflected in app.
[Dependencies/Pre-requisites:] RPC live.
[Checkpoint:] Yes.
PHASE W3 — PIPELINE & DOCS
Prompt W3.1 — Pipeline Kanban
[Phase: W3. Pipeline]
[Feature: Board]
[Task: New → Docs Needed → Interview → Approved → Move-in → Active → Completed → Rejected → Waitlist]
[Context:] Drag & drop; decision notes required in decision columns.
[Current Directory Context:] portal/src/screens/Pipeline/
[Detailed Instructions:]
Cards show seeker name, time in stage, tags, last action.
Moving to decision column triggers modal note.
[Expected Output/Deliverable:] Status persists; RLS safe.
[Dependencies/Pre-requisites:] applications table.
[Checkpoint:] Yes.
Prompt W3.2 — Application Detail + Document Checklist
[Phase: W3. Pipeline]
[Feature: App Detail]
[Task: Tabs (Overview, Documents, Notes, Messages, History)]
[Context:] Verify/reject docs; request missing; audit log.
[Current Directory Context:] portal/src/screens/Pipeline/
[Detailed Instructions:]
Checklist items: ID, insurance, income/proof, referral, medical clearance… with status badges.
“Export move-in packet” bundles approved docs to PDF (store URL).
[Expected Output/Deliverable:] End-to-end doc flow.
[Dependencies/Pre-requisites:] Storage policies.
[Checkpoint:] Yes.
PHASE W4 — ADMIN (LIGHT), SAFETY & DEPLOY
Prompt W4.1 — Provider Verification (Admin-only)
[Phase: W4. Admin]
[Feature: Verification]
[Task: Upload license, NARR/LAHSA flags, badge issue]
[Context:] No analytics UI.
[Current Directory Context:] portal/src/screens/Admin/
[Detailed Instructions:]
Review provider docs; set verification state; listings show Verified badge if true.
[Expected Output/Deliverable:] Verification loop complete.
[Dependencies/Pre-requisites:] Admin role.
[Checkpoint:] Yes.
Prompt W4.2 — Portal Deploy
[Phase: W4. Deploy]
[Feature: Hosting]
[Task: Vercel/Netlify config + env]
[Context:] Preview deployments on PRs.
[Current Directory Context:] portal root
[Detailed Instructions:]
Build for web; configure env; connect repo; enable previews.
[Expected Output/Deliverable:] Live portal URL.
[Dependencies/Pre-requisites:] Hosting account.
[Checkpoint:] Yes.
Quick Notes (so you fly through)
Keep owner analytics dashboards OUT (you’ll build that separately).
All text/buttons/colors follow Black/Gold/White.
Where I wrote “mock” you can wire instantly once you hit the backend phases.
Every prompt is intentionally “copy-pasteable” into Claude Code as a self-contained task.
If you want, I can also generate a one-file “master checklist” you can tick off as you go (with mini