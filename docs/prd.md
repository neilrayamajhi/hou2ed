HOU2ED – Complete Product Requirements Document
Color theme: Black primary, Gold accent, White for legibility only
 Platforms: Mobile web first, responsive desktop. Native wrapper or React Native after MVP
0. Purpose and vision
HOU2ED is a housing placement platform that feels as simple as Airbnb. Seekers can search and apply. Providers can list, keep availability current, and process applications with document checklists. Hospitals with 5150 capability, medical respite, and detox facilities appear in the same results as housing, controlled by filters and badges. Internal analytics give you a private view of supply, demand, and placement performance.
1. Brand and story
Logo: HOU2ED in gold. The 2 is prominent and glowing.


Meaning shown in app: “The 2 represents togetherness and second chances. A house becomes a home when people and space meet safety and belonging. Being hou2ed means stability, hope, and a fresh start.”


Visual language: dark, premium, accessible. Black canvas, gold actions, white for text and borders when needed.


2. Roles and access
Seeker: find listings, filter, view, contact or apply, message providers, manage profile.


Provider: everything a seeker can do plus create and manage listings, update availability, run a pipeline with documents and decisions.


Admin: verify providers, moderate, manage taxonomies, run analytics.


Role rules: choosing Find Housing at sign up creates a seeker account. Choosing List Housing creates a provider account that also has seeker functions. Seekers cannot access provider tools.


3. Design system
Colors:


Black #000000 for backgrounds and containers.


Gold #D4AF37 for primary buttons, icons, titles, progress, active states, verified badges.


White #FFFFFF for text on black and input borders.


Success green #21C55D for “Beds today”. Warning amber #F59E0B for stale data. Error red #EF4444.


Typography: headings gold on black, body white on black, buttons black text on gold.


Components:


Primary button: gold background, black text, 12 px radius, large tap area.


Secondary: black background, gold border, gold text.


Cards: black with gold border and subtle shadow.


Chips: inactive black with white border, active gold with black text.


Checkboxes and toggles: white outline, fill gold when selected.


Inputs: black field, white border, gold glow on focus.


Badges: small rounded pills. Available green, Full gray, Verified gold check, “5150 capable” gold hospital badge.


4. Information architecture – core entities
Users


Listings


Applications


Messages


Documents


Events (analytics)


Taxonomies (filters, enumerations, hospital types)


5. Screen by screen – end to end
5.1 Splash
Background black. Center logo in gold with glowing 2. Tagline in white under logo. Gold spinner bottom center. Autoadvance after 2 to 3 seconds.


5.2 Onboarding slides
Three slides on black.


Slide 1 title gold: Togetherness. Visual: house with two figures in gold and white. Body white.


Slide 2 title gold: Second chances. Visual: key to door. Body white.


Slide 3 title gold: No one stands alone. Visual: puzzle pieces forming a house. Body white.


Progress dots white, active gold. Buttons: Skip top right, Next bottom right in gold, final slide shows Get started.


5.3 Role selection
Title gold: “What would you like to do today”.


Two large cards centered:


Gold card with black text and icon: Find housing.


Black card with gold border and gold text: List housing.


Note in white: Providers can also search.


Continue button in gold sets role and opens auth.


5.4 Login and signup with brand definition
Top row: small gold logo left, Help icon right.


Collapsible panel titled in gold: What HOU2ED means. Expand to white text with your definition.


Tabs: Log in and Sign up.


Log in fields: email or username, password. Primary button Log in in gold. Forgot password link in white.


Sign up fields: name, username, email, password, confirm password.


After submit: Supabase 6 digit code modal. Six separate inputs with auto advance, resend after 30 seconds.


Error copy appears under the field in red with specific guidance.


5.5 Seeker Home
Top search bar: black box with gold border and white placeholder “Where do you want to live”. Location pin icon inside left. Filter icon in gold on the right.


Quick chips under search: Immediate, Free, Veterans, Families, Near me. Active chip gold with black text.


Map and cards:


Map uses black canvas. Pins gold if beds available, gray if full. Heat gradient gold to orange to red shows density at wider zoom.


Card deck at bottom one third: swipeable. Card content: cover photo with gold frame, title, neighborhood, cost, badges for availability and verified.


Interactions: pan or zoom map refreshes results. Tap a pin to open small peek card. Tap a card to open listing details.


Bottom nav: Home, Search, Messages, Saved, Profile. Icons white, active gold.


5.6 Search
Top bar: search input and Filters button.


Toggle Map or List.


List view shows large cards in a vertical list. Sort selector: Relevance, Cost low to high, Distance, Updated most recent.


Empty state: white text “No matches. Try widening your distance, adjusting filters, or clearing.” Gold button “Clear filters”.


5.7 Filters – full catalog, click only
Header: black bar with title gold, Clear all left, Apply right.
 All categories are accordions. Options are checkboxes, toggles, or sliders. Only city or zip and numeric ranges require typing.
Housing type


Sober living


Transitional housing


Permanent supportive housing


Domestic violence shelter


Emergency shelter


Family housing


Veteran housing


Senior housing


Youth housing 18 to 24


Mental health housing


Medical respite or hospital step down


Halfway house or justice reentry


Faith based housing


Crisis beds


Shared independent living


Student housing


Women only housing


Men only housing


Detox facility


Hospital with 5150 capacity


Unit and bed type


Shared dorm 4 plus


Semi shared 2 to 3


Private room


Family unit


Apartment style


Bunk bed


Single bed


ADA accessible bed


Gender specific room


Amenities


Kitchen: shared, staff prepared only, private


Furnished, unfurnished


Wi Fi basic, high speed


Laundry onsite, offsite, in unit


Parking onsite, street, none


Storage, shared living room, outdoor space


Air conditioning, heating


Accessibility


ADA unit, ADA bathroom


Wheelchair ramp, elevator


Roll in shower, grab bars, lowered counters


Visual alarms, Braille or large print signage, door width compliant


Room and facility details


Max occupancy slider 1 to 6 plus


Bathroom type shared, semi shared, private


Safety features: smoke detectors, sprinklers, staffed desk, CCTV


Eligibility and populations


Age: Youth 18 to 24, Adults, Seniors 55 plus, Seniors 65 plus


Gender: Male, Female, Co ed, Non binary, Transgender friendly


Families and couples allowed


Veterans


Justice involved or reentry


Foster youth aging out


LGBTQ plus affirming


Culturally specific


Domestic violence survivors


Disabilities accepted: physical, developmental, psychiatric


Support and programs


Mental health: counseling, therapy, psychiatry


Medical: onsite nurse, medication management, MAT


Recovery model: 12 Step, SMART, harm reduction, faith based, holistic


Skills: job training, resume help, GED, college prep, digital literacy


Legal aid and court support


Peer mentorship


Family reunification


Transportation: shuttle, bus passes, rideshare credits


Cost and payment


Free housing


Sliding scale


Cost range slider


Vouchers: Section 8, RRH, CalWORKs, PATH, HUD VASH


Insurance: Medi Cal, Medicare, TRICARE, private insurance


Deposit required or not, refundable or not


Utilities included, meals included


Location and environment


City or zip input


Distance slider 1 to 50 miles


Proximity toggles: transit, hospital or clinic, school or childcare, groceries, parks


Safety score, Walk score, Noise level, Air quality


Rules and requirements


Sobriety days required


Testing frequency none, random, daily


Curfew none, early, standard, late


Mandatory programs or meetings


Visitor policy: visitors allowed, overnight allowed, children allowed


Pets: none, service animals, ESA, small pets


Religious requirements


Length of stay: Emergency under 30 days, Transitional 3 to 12 months, Permanent


Legal requirements: background check, ID required, income proof


Availability and intake


Beds available today


Beds opening this week


Intake method: emergency, referral only, walk in


Intake hours: 24 by 7, business hours


Waitlist: none, under 2 weeks, over 1 month


Provider and quality


Accreditation: licensed or certified, NARR certified, HMIS linked, LAHSA approved


Years in operation buckets


Staff to resident ratio buckets


Ratings threshold 3 to 5 stars


Last verified update within 7 or 30 days


Provider responsiveness


Community and lifestyle


Meals: communal, staff prepared, independent cooking


House size: small, medium, large


Atmosphere: quiet, structured, communal, independent, family friendly, single only


Smoking policy


Alcohol free property


Special interest groups: veterans groups, women only, LGBTQ plus support


Advanced


Wi Fi speed tiers


Computer lab access


Child friendly features: play area, tutoring


Dietary: vegan, halal, kosher


Security: controlled entry, staffed desk, cameras


Energy or climate efficiency


Apply button is a gold sticky footer. On apply, store a filter snapshot in analytics.
5.8 Listing cards and badges
Standard card shows cover image, title, type, neighborhood, cost, availability badge, verified badge if any.


Special facility badges:


Gold badge “5150 capable” for hospitals that accept 5150 holds.


Gold badge “Medical respite”.


Gold badge “Detox”.


Facility cards also show: intake phone line, intake hours, triage note if provided.


5.9 Listing details
Photo carousel top with left and right chevrons and gold dots.


Title in gold, provider name, verified badge if applicable.


Quick stats row: Beds available, Cost, Intake method, Last updated.


Sections as collapsible cards: Overview, Amenities, Services, Rules and eligibility, Location map, Reviews placeholder.


Sticky bottom bar: Save on left, Apply now on right in gold.


5.10 Application flow for seekers
Step 1 Info: prefill name and contact.


Step 2 Eligibility: select tags.


Step 3 Documents: upload ID, insurance, income proof, referral letter.


Step 4 Review and submit.


Confirmation screen with status tracker.


Applications tab lists each application with status and link to message thread.


Validation: client and server enforced types and sizes, red inline errors.


5.11 Messages
Inbox list: black cards, sender in gold, last message in white.


Conversation: chat bubbles, file attachments, timestamps, read receipts.


Report abuse option goes to admin moderation.


5.12 Saved
Grid of listings saved by the seeker. Long press to remove. Share option.


5.13 Seeker profile
Avatar with gold ring, edit button.


Sections: Applications, Saved searches, Account settings.


Settings includes: change password, notification toggles, delete account.


6. Provider experience – everything they need
6.1 Provider dashboard
Header gold: Welcome, [name].


Three tiles:


Beds available: large gold number.


New applications with gold badge count.


Add new listing in gold.


My listings list: each card shows photo, address, available beds, last updated, Edit and View buttons.


6.2 Add new listing wizard – full field spec
Progress shown as gold dots Step 1 to Step 11.
Step 1 Basic info
Property name


Address with Google Places autocomplete and map preview


Housing type selection grid that matches filter list


Step 2 Units and beds
Room structure: dorm, semi shared, private, family unit, apartment style


Beds by room type


ADA bed count


Gender specific rooms


Step 3 Amenities
Kitchen access type


Furnished or unfurnished


Wi Fi tier


Laundry type


Parking type


Storage, living room, outdoor


AC and heat


Step 4 Accessibility
ADA unit and bathroom


Ramp, elevator


Roll in shower, grab bars, lowered counters


Visual alarms, Braille or large print signage


Step 5 Eligibility and populations
Age groups, genders, families, couples


Veterans, justice involved, foster youth, LGBTQ plus, culturally specific, DV survivors, disabilities accepted


Step 6 Services and programs
Mental health: counseling, therapy, psychiatry


Medical: onsite nurse, medication management, MAT


Recovery models: 12 Step, SMART, harm reduction, faith based, holistic


Skills: job training, resume, GED, college prep, digital literacy


Legal aid


Peer mentorship and family reunification


Transportation support


Step 7 Rules and requirements
Sobriety days required and testing frequency


Curfew policy


Mandatory meetings


Visitor policy including children and overnight


Pets and ESA rules


Religious requirements


Length of stay


Background check, ID, income proof


Step 8 Cost and payment
Free or sliding scale or fixed range slider


Vouchers accepted list


Insurance accepted list including Medi Cal and Medicare


Deposit requirement and type


Utilities included, meals included


Step 9 Intake and availability
Beds available today


Beds opening this week


Waitlist length


Intake method: emergency, referral only, walk in


Intake hours: 24 by 7 or business


Intake contact line and email


Step 10 Photos
Upload up to 12 images, reorder, pick cover. Minimum 1 required.


Step 11 Preview and publish
Full listing preview.


Accept terms checkbox.


Publish button in gold.


After publish: prompt to add daily bed update reminder with Google, Microsoft, Apple, and downloadable ics. Default 7 pm local. Deep link returns to Update availability.


6.3 Update availability
Table of listings.


Row shows title, last updated timestamp, current available beds, plus and minus controls.


Sticky Save all in gold.


Banner if data older than 48 hours: “Data may be stale. Confirm no changes or update counts.” Button: Confirm no change today.


Reminder panel shows which calendars are linked and the time. Edit link.


6.4 Pipeline – applications and document checklists
Pipeline columns:
New inquiry


Missing documents


Under review


Approved


Move in pending


Active resident


Completed


Rejected


Waitlist


Application card shows: seeker name, time in stage, primary tags, last action.
 Drag and drop between columns. Moving into a decision column requires a note.
Applicant profile view:
Header: seeker name and contact, application id, listing title.


Tabs: Overview, Documents, Notes, Messages, History.


Overview shows matched criteria score and summary of fit.


Documents tab shows a checklist:


Government ID


Insurance card: Medi Cal, Medicare, TRICARE, private


Proof of income if required


Referral letter if required


Medical clearance if required


Other provider specific uploads
 Each item shows status: missing, uploaded, verified. Provider can request document, verify, or reject with a reason.


Notes are private to provider staff.


Messages opens the thread with the applicant.


History shows a timestamped audit of actions.


Move in packet export:
When all required docs are verified, the provider can export a single PDF bundle with a cover sheet and checklist.


The packet is stored and available for later compliance review.


6.5 Provider analytics – MVP
Views past 30 days


Inquiries count


Occupancy trend mini chart


Average response time


Download CSV


6.6 Provider profile and settings
Business information and contact


Verification status and document upload


Staff users in a later phase


Calendar reminder default time and timezone


7. Hospitals, medical respite, and detox inside search
Categories live in Housing type filter.


Cards include a special gold badge: “5150 capable”, “Medical respite”, or “Detox”.


Facility detail fields:


Intake hours 24 by 7 or business


Direct intake phone line


Eligibility notes if provided


For medical respite and detox, show referral process and payer types


If a facility participates in availability updates, it can show Beds today and Beds this week exactly like housing.


8. Search ranking and matching
Score from 0 to 100. Items are listings or facilities.
Distance: up to 20 based on seeker radius.


Availability: up to 20 based on Beds today or Beds this week.


Eligibility fit: up to 20 based on age, gender, families, and population tags.


Services fit: up to 10 based on mental health, medical, recovery model, skills.


Cost fit: up to 10 based on cost type, vouchers, and insurance alignment.


Quality and freshness: up to 20 with points for verified status, recent updates within 7 or 30 days, and responsiveness.
 Tie break by distance then last update. Stale items older than 14 days are demoted or hidden unless the user opts in to show stale.


9. Analytics – private to you
9.1 Events
auth_signed_up, auth_verified, auth_login, role_selected


search_performed with filter snapshot and result count


map_moved with bounds


listing_opened, listing_saved


filter_applied


application_started, application_submitted, application_status_changed


document_uploaded, document_verified, document_rejected


availability_updated with before and after


reminder_added


message_sent


packet_exported


9.2 Metrics dashboards
Supply: active providers, active listings, average beds, verified share, update recency distribution


Demand: daily active seekers, searches per day, filter usage, conversion to application


Matching: applications per listing, approval rate, time to decision, time to move in


Geography: supply and demand heat maps by city and zip


Compliance: percent of listings updated within 48 hours, document verification turnaround time


9.3 Stack
Client captures events to Segment or custom collector.


Warehouse BigQuery or Redshift.


BI in Metabase or Looker.


Access limited to admin role. PII minimized. Use ids not raw identifiers wherever possible.


10. Data model – high level schema
users
id, role, name, email, username, phone


password_hash, auth_provider


seeker_profile json, provider_profile json


verified_provider boolean, verification_status enum


created_at, updated_at


listings
id, provider_id


address, city, state, zip, lat, lng


housing_type enum including hospital categories


unit_beds json, ada_beds integer, gender_rooming enum


amenities json, accessibility json


eligibility json


services json


rules json


cost json


intake json


availability json with beds_today, beds_week, waitlist, last_updated_at


verified boolean, certifications json


images array


responsiveness metrics


created_at, updated_at


applications
id, listing_id, seeker_id


status enum: new, docs_needed, under_review, approved, move_in_pending, active, completed, rejected, waitlist


stage_timestamps json


notes text


decision_by, decision_note


created_at, updated_at


documents
id, application_id, type enum, file_url, status enum: missing, uploaded, verified, rejected, rejection_reason, uploaded_by, timestamps


messages
thread_id, listing_id, participants array


message_id, sender_id, body, attachment_url array, created_at, read_at


events
id, user_id, name, properties json, timestamp


11. API surface
Auth
POST /auth/signup


POST /auth/login


POST /auth/verify


POST /auth/forgot


POST /auth/reset


Listings
GET /listings?filters=…


GET /listings/{id}


POST /listings


PUT /listings/{id}


PATCH /listings/{id}/availability


POST /listings/{id}/images


Applications
POST /applications


GET /applications?role=seeker or provider


GET /applications/{id}


PATCH /applications/{id} status


POST /applications/{id}/documents


PATCH /documents/{id} verify or reject


Messages
GET /threads


POST /threads


GET /threads/{id}/messages


POST /threads/{id}/messages


Calendar
POST /reminders


GET /reminders/status


Search
POST /search returns results with score breakdown


12. Integrations
Maps: Mapbox or Google Maps. Dark tiles, gold pins.


Calendar: .ics generation and deep links. Google Calendar and Microsoft Graph quick add. Apple handled by .ics.


Email: transactional for verification and application notifications.


Scoring APIs in later phase: Walk score, crime, air quality.


13. Security and privacy
TLS everywhere, HSTS.


Password hashing with bcrypt or Argon2.


JWT access tokens with refresh tokens.


Role based access control enforced server side.


Rate limits on auth, upload, and search.


Content moderation queue for abuse reports.


PII minimization in analytics.


Privacy policy and terms linked in app.


HIPAA adjacent caution: do not store clinical notes in MVP. If future clinical data is needed, add a HIPAA design and BAAs.


14. Accessibility
WCAG 2.1 AA.


Color contrast verified for gold on black and white on black.


Keyboard navigation on desktop.


Focus rings in gold.


All icon-only buttons have aria labels.


Do not use color alone for errors.


15. Performance and reliability
First contentful paint under 2 seconds on common 4G.


Search response under 1.5 seconds for typical filters.


Lazy load maps and images. Use WebP where supported.


CDN for static content.


Cache filter dictionaries and common queries.


Observability with logs, metrics, traces.


16. Offline and resilience
Cache last results locally for read only view when offline.


Queue messages and application submits for retry.


Show white banner “Offline. Changes will send when connected.”


17. Notifications
MVP: calendar reminders for providers.


Email notifications for application updates and new messages.


Push notifications in later phase.


18. Content and microcopy
Buttons: Apply now, Contact provider, Save listing, Update beds, Publish listing, Approve, Deny, Waitlist, Export packet.


Errors: “Please upload a valid image under 10 MB”, “This field is required”, “We could not verify that document. Please upload a clearer copy”.


Empty states:


Search: “No matches yet. Try a wider distance or fewer filters.”


Pipeline: “No applications in this stage.”


19. Legal and safety notices
In listing details for hospitals and detox: a non medical advice disclaimer and an emergency note with 911 and 988 hotline references.


Platform terms, acceptable use, privacy policy.


Clear statement that availability is self reported unless verified.


20. Calendar reminder flow
After publish, prompt to add daily reminder. Default 7 pm local.


Calendar event title: “Update HOU2ED bed availability”.


Description contains secure deep link to Update availability. If not logged in, route through login then redirect back.


21. QA acceptance criteria – MVP
Auth
Sign up, email verify, login, forgot, reset.


Role
Seeker cannot view provider tools. Provider can access both sides.


Search and filters
Every filter option is displayed as a click element.


Applying filters refreshes results.


Clear all resets to defaults.


Map and list keep results in sync.


5150 capable, medical respite, and detox appear when selected.


Listings
Wizard enforces required fields per step.


Photo upload and reorder works.


Publish shows in search within 10 seconds.


Availability
Plus and minus modify counts.


Save persists and updates last updated.


Reminders deep link opens Update availability.


Applications
Seekers can submit application with attachments.


Pipeline moves cards and enforces notes on decisions.


Document verification status changes are recorded.


Messages
Send and receive with attachments.


Abuse report creates a moderation case.


Analytics
Events are emitted for searches, opens, applies, updates.


Dashboards show supply, demand, and match KPIs.


Accessibility
Screen reader labels and focus rings present.


Contrast meets AA.


22. Pilot plan – Southern California
Seed data: a starter set of providers and at least the main 5150 capable hospitals like MLK, Olive View, Harbor UCLA, and other willing facilities.


Onboard 25 to 50 providers.


Recruit caseworkers from 3 to 5 agencies.


Success metrics in 60 to 90 days:


80 percent of active providers update availability at least 5 days per week.


Median search to application start under 3 minutes.


Median provider response time under 24 hours.


At least 30 percent of listings show Beds today or Beds this week any given day.


23. Risks and mitigations
Risk: stale data reduces trust. Mitigation: reminder integrations, stale demotion, confirm no change button.


Risk: provider adoption friction. Mitigation: one click daily update, calendar default, minimal data required for publish.


Risk: misuse or spam. Mitigation: rate limits, moderation, verification.


Risk: legal exposure on medical content. Mitigation: strong disclaimers, verified labels, emergency guidance.


24. Roadmap after MVP
Ratings and reviews for verified users.


Multi language support.


Provider training library inside app.


Advanced analytics for agencies.


API hooks for HMIS, LAHSA, VA.


Transportation and map layering.


Payments and invoicing for some placements if needed later.


25. Build slicing for your team
Sprint 1: Auth, roles, theme, base navigation.


Sprint 2: Listings browse, filters, map, list, details.


Sprint 3: Listing wizard steps 1 to 6.


Sprint 4: Listing wizard steps 7 to 11 with publish and calendar.


Sprint 5: Availability update and deep link.


Sprint 6: Applications pipeline, documents, packet export.


Sprint 7: Messages and notifications.


Sprint 8: Analytics events and basic dashboards.


Sprint 9: Hospital, respite, detox taxonomy and cards with badges.



