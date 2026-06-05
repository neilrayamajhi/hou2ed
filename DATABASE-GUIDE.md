# Database Structure Guide

**Understanding Your Supabase PostgreSQL Database**

---

## Table of Contents

1. [What is a Database?](#what-is-a-database)
2. [Database Tables Overview](#database-tables-overview)
3. [Table Relationships](#table-relationships)
4. [Key Database Concepts](#key-database-concepts)
5. [Real Examples](#real-examples)
6. [How Queries Work](#how-queries-work)
7. [Row Level Security (RLS)](#row-level-security)

---

## What is a Database?

Think of a database like **Excel on steroids**:

```
Excel Workbook = Database
Excel Sheet = Table
Excel Row = Database Row
Excel Column = Database Column
```

### Example: Listings Table

| id (UUID) | title | city | beds_available | status | created_at |
|-----------|-------|------|----------------|--------|------------|
| abc-123 | Hope Shelter | SF | 5 | active | 2024-01-15 |
| def-456 | City Mission | LA | 0 | active | 2024-01-16 |
| ghi-789 | Safe Haven | SF | 12 | active | 2024-01-17 |

Each row is a listing, each column is a property of that listing.

---

## Database Tables Overview

### Core Tables

#### 1. **profiles** - User Information
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT CHECK (role IN ('seeker', 'provider', 'admin')),
  phone TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**What it stores:**
- User profile information
- Role (seeker, provider, or admin)
- Contact details

**Key fields:**
- `id` - Unique identifier (links to auth.users)
- `email` - User's email
- `role` - What type of user they are

**Example row:**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "email": "neil@example.com",
  "full_name": "Neil Rayamajhi",
  "role": "seeker",
  "phone": "555-1234",
  "created_at": "2024-01-15T10:30:00Z"
}
```

---

#### 2. **listings** - Housing Listings
```sql
CREATE TABLE listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID REFERENCES profiles(id),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT CHECK (status IN ('active', 'inactive', 'archived')),

  -- Location
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  latitude DECIMAL,
  longitude DECIMAL,

  -- Capacity
  total_beds INTEGER,
  available_beds INTEGER DEFAULT 0,

  -- Details stored as JSONB (flexible JSON)
  amenities JSONB DEFAULT '[]',
  services JSONB DEFAULT '[]',
  requirements JSONB DEFAULT '{}',
  images TEXT[] DEFAULT '{}',

  -- Metadata
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**What it stores:**
- Housing listings created by providers
- Location, capacity, amenities
- Photos and descriptions

**Key fields:**
- `id` - Unique listing ID
- `provider_id` - Who created this listing (links to profiles)
- `amenities` - JSON array of amenities
- `images` - Array of image file paths
- `latitude/longitude` - GPS coordinates for map

**Example row:**
```json
{
  "id": "abc-123-def-456",
  "provider_id": "provider-uuid-here",
  "title": "Hope Mission Shelter",
  "description": "Family-friendly shelter with meals",
  "status": "active",
  "city": "San Francisco",
  "state": "CA",
  "latitude": 37.7749,
  "longitude": -122.4194,
  "total_beds": 50,
  "available_beds": 12,
  "amenities": ["meals", "showers", "laundry", "pets_allowed"],
  "images": ["listings/abc-123/image1.jpg", "listings/abc-123/image2.jpg"],
  "is_verified": true,
  "created_at": "2024-01-10T09:00:00Z"
}
```

---

#### 3. **applications** - Housing Applications
```sql
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID REFERENCES listings(id),
  applicant_id UUID REFERENCES profiles(id),

  status TEXT CHECK (status IN (
    'draft',
    'submitted',
    'under_review',
    'missing_documents',
    'approved',
    'rejected',
    'withdrawn'
  )),

  -- Application data
  personal_info JSONB,
  eligibility_info JSONB,

  -- Metadata
  submitted_at TIMESTAMP,
  reviewed_at TIMESTAMP,
  reviewer_notes TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**What it stores:**
- Applications from seekers to listings
- Application status and data
- Review notes from providers

**Example row:**
```json
{
  "id": "app-123",
  "listing_id": "listing-abc",
  "applicant_id": "seeker-xyz",
  "status": "under_review",
  "personal_info": {
    "full_name": "John Doe",
    "phone": "555-1234",
    "email": "john@example.com",
    "dob": "1990-05-15"
  },
  "eligibility_info": {
    "household_size": 1,
    "income": "less_than_1000",
    "veteran": false,
    "has_disability": false
  },
  "submitted_at": "2024-01-20T14:30:00Z"
}
```

---

#### 4. **application_documents** - Documents for Applications
```sql
CREATE TABLE application_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,

  document_type TEXT CHECK (document_type IN (
    'id',
    'income_proof',
    'insurance',
    'birth_certificate',
    'referral_letter',
    'other'
  )),

  file_path TEXT NOT NULL,  -- Path in Supabase Storage
  file_name TEXT,
  file_size INTEGER,  -- Bytes

  -- Status
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,

  uploaded_at TIMESTAMP DEFAULT NOW()
);
```

**What it stores:**
- Documents uploaded for applications
- File paths in Supabase Storage
- Verification status

**Example row:**
```json
{
  "id": "doc-456",
  "application_id": "app-123",
  "document_type": "id",
  "file_path": "applications/app-123/id_card.pdf",
  "file_name": "drivers_license.pdf",
  "file_size": 524288,
  "status": "approved",
  "uploaded_at": "2024-01-20T15:00:00Z"
}
```

---

#### 5. **message_threads** - Conversation Threads
```sql
CREATE TABLE message_threads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID REFERENCES listings(id),
  seeker_id UUID REFERENCES profiles(id),
  provider_id UUID REFERENCES profiles(id),

  last_message_at TIMESTAMP,
  last_message_preview TEXT,

  -- Read status
  seeker_unread_count INTEGER DEFAULT 0,
  provider_unread_count INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT NOW()
);
```

**What it stores:**
- Conversation threads between seekers and providers
- Read/unread counts for notifications
- Preview of last message

---

#### 6. **messages** - Individual Messages
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id UUID REFERENCES message_threads(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id),

  content TEXT NOT NULL,
  attachments TEXT[],  -- Array of file paths

  read_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW()
);
```

**What it stores:**
- Individual messages within threads
- Message content and attachments
- Read receipts

**Example flow:**
```
Thread: Conversation about "Hope Shelter" listing
├─ Message 1: "Hi, is this still available?" (from seeker)
├─ Message 2: "Yes! We have 5 beds" (from provider)
└─ Message 3: "Great, I'd like to apply" (from seeker)
```

---

#### 7. **saved_listings** - Bookmarked Listings
```sql
CREATE TABLE saved_listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  listing_id UUID REFERENCES listings(id),

  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(user_id, listing_id)  -- Can't save same listing twice
);
```

**What it stores:**
- Which listings users have bookmarked
- Simple join table

---

#### 8. **saved_searches** - Saved Search Filters
```sql
CREATE TABLE saved_searches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),

  name TEXT NOT NULL,  -- User-given name like "SF Pet-Friendly"
  filters JSONB NOT NULL,  -- The actual filter criteria

  -- Alerts
  alerts_enabled BOOLEAN DEFAULT FALSE,
  alert_frequency TEXT,  -- 'instant', 'daily', 'weekly'

  created_at TIMESTAMP DEFAULT NOW()
);
```

**What it stores:**
- Saved search filter combinations
- Alert preferences

**Example:**
```json
{
  "id": "search-abc",
  "user_id": "user-123",
  "name": "Pet-Friendly in SF",
  "filters": {
    "city": "San Francisco",
    "amenities": ["pets_allowed", "meals"],
    "household_size": "single"
  },
  "alerts_enabled": true,
  "alert_frequency": "daily"
}
```

---

## Table Relationships

### Visual Diagram

```
┌─────────────┐
│  auth.users │  (Supabase Auth - managed automatically)
└──────┬──────┘
       │
       │ (one-to-one)
       ↓
┌─────────────┐
│  profiles   │  (Your user data)
└──────┬──────┘
       │
       ├─────────────────────────────────────┐
       │                                     │
       │ (one-to-many)              (one-to-many)
       ↓                                     ↓
┌─────────────┐                      ┌──────────────┐
│  listings   │                      │ applications │
│ (provider)  │                      │  (seeker)    │
└──────┬──────┘                      └──────┬───────┘
       │                                     │
       │ (one-to-many)              (one-to-many)
       ↓                                     ↓
┌─────────────┐                      ┌──────────────────────┐
│applications │                      │application_documents │
│ (on listing)│                      └──────────────────────┘
└──────┬──────┘
       │
       │ (one-to-many)
       ↓
┌──────────────────┐
│message_threads   │
└────────┬─────────┘
         │
         │ (one-to-many)
         ↓
┌──────────────────┐
│    messages      │
└──────────────────┘
```

### Relationship Examples

**1. One-to-Many: Provider → Listings**
- ONE provider can create MANY listings
- EACH listing belongs to ONE provider

```sql
-- Provider with id "provider-123"
SELECT * FROM listings WHERE provider_id = 'provider-123';
-- Returns all listings created by this provider
```

**2. One-to-Many: Listing → Applications**
- ONE listing can have MANY applications
- EACH application is for ONE listing

```sql
-- Listing with id "listing-abc"
SELECT * FROM applications WHERE listing_id = 'listing-abc';
-- Returns all applications for this listing
```

**3. Many-to-Many: Users ↔ Saved Listings**
- ONE user can save MANY listings
- ONE listing can be saved by MANY users
- Uses a "join table" (saved_listings)

```sql
-- Get all listings saved by user "user-123"
SELECT l.*
FROM listings l
JOIN saved_listings s ON l.id = s.listing_id
WHERE s.user_id = 'user-123';
```

---

## Key Database Concepts

### 1. **Primary Keys (id)**

Every table has a unique identifier:

```sql
id UUID PRIMARY KEY DEFAULT uuid_generate_v4()
```

**UUID** = Universally Unique Identifier
- Looks like: `123e4567-e89b-12d3-a456-426614174000`
- Guaranteed to be unique (even across different databases!)
- Better than auto-incrementing numbers for distributed systems

### 2. **Foreign Keys (References)**

Links between tables:

```sql
provider_id UUID REFERENCES profiles(id)
```

This means:
- `provider_id` in listings table
- Must match an `id` in the profiles table
- Creates a relationship between tables
- Enforces data integrity (can't reference non-existent user)

### 3. **JSONB Columns**

Flexible JSON storage:

```sql
amenities JSONB DEFAULT '[]'
```

**Why use JSONB?**
- Store complex nested data
- No need for separate tables
- Can query inside the JSON

**Example:**
```json
{
  "amenities": ["meals", "showers", "laundry"],
  "requirements": {
    "age": { "min": 18, "max": null },
    "income": { "max": 50000 },
    "background_check": true
  }
}
```

**Querying JSONB:**
```sql
-- Find listings with "meals" amenity
SELECT * FROM listings
WHERE amenities @> '["meals"]';

-- Find listings requiring background check
SELECT * FROM listings
WHERE requirements->>'background_check' = 'true';
```

### 4. **Arrays**

Store lists:

```sql
images TEXT[] DEFAULT '{}'
```

**Example:**
```sql
images = '{image1.jpg, image2.jpg, image3.jpg}'
```

**Querying arrays:**
```sql
-- Find listings with at least 3 images
SELECT * FROM listings
WHERE array_length(images, 1) >= 3;
```

### 5. **Timestamps**

Track when things happen:

```sql
created_at TIMESTAMP DEFAULT NOW()
updated_at TIMESTAMP DEFAULT NOW()
```

**Automatic timestamp updates:**
```sql
-- Trigger to update updated_at
CREATE TRIGGER update_updated_at
BEFORE UPDATE ON listings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

### 6. **CHECK Constraints**

Enforce valid values:

```sql
status TEXT CHECK (status IN ('active', 'inactive', 'archived'))
```

Only these values are allowed. Trying to insert `status = 'deleted'` would fail!

---

## Real Examples

### Example 1: Creating a New Listing

**In code:**
```tsx
// app/src/services/listing.service.ts
const newListing = await supabase
  .from('listings')
  .insert({
    provider_id: user.id,
    title: 'Hope Shelter',
    city: 'San Francisco',
    total_beds: 50,
    available_beds: 12,
    amenities: ['meals', 'showers'],
  })
  .select()
  .single();
```

**What happens in database:**
```sql
INSERT INTO listings (
  id,                    -- Auto-generated UUID
  provider_id,
  title,
  city,
  total_beds,
  available_beds,
  amenities,
  created_at,            -- Auto-set to NOW()
  updated_at             -- Auto-set to NOW()
) VALUES (
  uuid_generate_v4(),
  'provider-uuid-here',
  'Hope Shelter',
  'San Francisco',
  50,
  12,
  '["meals", "showers"]',
  NOW(),
  NOW()
) RETURNING *;
```

### Example 2: Searching Listings

**In code:**
```tsx
const listings = await supabase
  .from('listings')
  .select('*')
  .eq('city', 'San Francisco')
  .gte('available_beds', 1)
  .contains('amenities', ['pets_allowed']);
```

**Translates to SQL:**
```sql
SELECT *
FROM listings
WHERE city = 'San Francisco'
  AND available_beds >= 1
  AND amenities @> '["pets_allowed"]';
```

### Example 3: Getting Application with Details

**In code:**
```tsx
const application = await supabase
  .from('applications')
  .select(`
    *,
    listing:listings(*),
    applicant:profiles(*),
    documents:application_documents(*)
  `)
  .eq('id', applicationId)
  .single();
```

**Result:**
```json
{
  "id": "app-123",
  "status": "under_review",
  "listing": {
    "id": "listing-abc",
    "title": "Hope Shelter",
    "city": "San Francisco"
  },
  "applicant": {
    "id": "user-xyz",
    "full_name": "John Doe",
    "email": "john@example.com"
  },
  "documents": [
    {
      "id": "doc-1",
      "document_type": "id",
      "status": "approved"
    },
    {
      "id": "doc-2",
      "document_type": "income_proof",
      "status": "pending"
    }
  ]
}
```

**This is a JOIN query** - it combines data from 4 tables!

---

## How Queries Work

### Basic Query Flow

```
Your Code (TypeScript)
       ↓
Supabase JS Client
       ↓
HTTP Request (REST API)
       ↓
Supabase Server (PostgREST)
       ↓
Converts to SQL
       ↓
PostgreSQL Database
       ↓
Returns Results
       ↓
Back through the chain
       ↓
Your Code receives data
```

### Common Query Patterns

**1. Select (Read)**
```tsx
// Get all active listings
const { data } = await supabase
  .from('listings')
  .select('*')
  .eq('status', 'active');
```

**2. Insert (Create)**
```tsx
// Create new listing
const { data } = await supabase
  .from('listings')
  .insert({ title: 'New Shelter', ... })
  .select()
  .single();
```

**3. Update**
```tsx
// Update available beds
const { data } = await supabase
  .from('listings')
  .update({ available_beds: 10 })
  .eq('id', listingId);
```

**4. Delete**
```tsx
// Delete application
const { data } = await supabase
  .from('applications')
  .delete()
  .eq('id', applicationId);
```

**5. Complex Filters**
```tsx
// Find listings in SF with beds available, sorted by distance
const { data } = await supabase
  .from('listings')
  .select('*')
  .eq('city', 'San Francisco')
  .gt('available_beds', 0)
  .order('distance', { ascending: true })
  .limit(20);
```

---

## Row Level Security (RLS)

### What is RLS?

**Row Level Security** controls WHO can access WHICH rows in a table.

Think of it like this:
- Without RLS: Everyone can see everything (BAD!)
- With RLS: Users can only see their own data (GOOD!)

### Example: Applications Table

**Policy 1: Applicants can see their own applications**
```sql
CREATE POLICY "applicants_see_own_applications"
ON applications
FOR SELECT
USING (auth.uid() = applicant_id);
```

**Translation:**
- When user queries applications table
- Only return rows where applicant_id matches their user ID
- They can't see other people's applications

**Policy 2: Providers can see applications for their listings**
```sql
CREATE POLICY "providers_see_their_listing_applications"
ON applications
FOR SELECT
USING (
  listing_id IN (
    SELECT id FROM listings WHERE provider_id = auth.uid()
  )
);
```

**Translation:**
- Provider can see applications
- Only for listings they own
- Can't see applications for other providers' listings

### Example: Listings Table

**Policy: Anyone can view active listings**
```sql
CREATE POLICY "anyone_can_view_active_listings"
ON listings
FOR SELECT
USING (status = 'active');
```

**Policy: Only owner can update listing**
```sql
CREATE POLICY "owners_can_update_own_listings"
ON listings
FOR UPDATE
USING (auth.uid() = provider_id);
```

### How RLS Works in Practice

**User A (Seeker) queries:**
```tsx
const { data } = await supabase
  .from('applications')
  .select('*');
```

**Behind the scenes:**
```sql
SELECT *
FROM applications
WHERE applicant_id = 'user-a-id';  -- RLS adds this automatically!
```

User A only sees their own applications, automatically!

---

## Database Migrations

### What are Migrations?

Migrations are **version control for your database schema**.

Located in: `supabase/migrations/`

### Example Migration

**File:** `20240115_create_listings_table.sql`
```sql
-- Create the listings table
CREATE TABLE listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID REFERENCES profiles(id),
  title TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add RLS
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

-- Add policies
CREATE POLICY "public_can_view_active"
ON listings FOR SELECT
USING (status = 'active');

-- Add index for faster queries
CREATE INDEX listings_provider_id_idx ON listings(provider_id);
CREATE INDEX listings_city_idx ON listings(city);
```

### Running Migrations

```bash
# Apply all pending migrations
supabase db push

# Create a new migration
supabase migration new add_beds_to_listings

# Reset database (re-run all migrations)
supabase db reset
```

---

## Best Practices

### 1. Always Use Indexes for Columns You Query

```sql
-- If you frequently search by city
CREATE INDEX listings_city_idx ON listings(city);

-- If you frequently filter by provider_id
CREATE INDEX applications_applicant_id_idx ON applications(applicant_id);
```

**Why?** Makes queries MUCH faster (milliseconds vs seconds).

### 2. Use Transactions for Related Changes

```tsx
// Create application AND documents together
const { data, error } = await supabase.rpc('create_application_with_documents', {
  application_data: {...},
  documents: [...]
});
```

**Why?** If one fails, all fail (keeps data consistent).

### 3. Use JSONB for Flexible Data

```sql
-- Instead of creating separate tables for each amenity
amenities JSONB

-- Can store any amenities without schema changes
amenities: ["meals", "showers", "new_amenity_type"]
```

### 4. Set up Proper RLS Policies

```sql
-- Bad: No RLS (anyone can see everything!)
-- Good: Proper policies
CREATE POLICY "users_see_own_data" ...
```

### 5. Use Foreign Keys for Data Integrity

```sql
-- This prevents orphaned records
application_id UUID REFERENCES applications(id) ON DELETE CASCADE
```

If application is deleted, all its documents are automatically deleted too!

---

## Common Queries Explained

### 1. Get User's Applications with Listing Details

```tsx
const { data } = await supabase
  .from('applications')
  .select(`
    *,
    listing:listings(
      id,
      title,
      city,
      provider:profiles(full_name)
    )
  `)
  .eq('applicant_id', userId)
  .order('created_at', { ascending: false });
```

**Result structure:**
```json
[
  {
    "id": "app-1",
    "status": "under_review",
    "listing": {
      "id": "listing-abc",
      "title": "Hope Shelter",
      "city": "San Francisco",
      "provider": {
        "full_name": "Shelter Admin"
      }
    }
  }
]
```

### 2. Search Listings Near Location

```tsx
const { data } = await supabase.rpc('listings_near_location', {
  lat: 37.7749,
  lng: -122.4194,
  radius_miles: 50
});
```

**RPC Function (in database):**
```sql
CREATE FUNCTION listings_near_location(
  lat DECIMAL,
  lng DECIMAL,
  radius_miles INTEGER
)
RETURNS SETOF listings AS $$
  SELECT *
  FROM listings
  WHERE (
    -- Calculate distance using PostGIS or haversine formula
    earth_distance(
      ll_to_earth(lat, lng),
      ll_to_earth(latitude, longitude)
    ) / 1609.34  -- Convert meters to miles
  ) <= radius_miles
  AND status = 'active';
$$ LANGUAGE SQL;
```

### 3. Get Unread Message Count

```tsx
const { count } = await supabase
  .from('messages')
  .select('*', { count: 'exact', head: true })
  .is('read_at', null)
  .eq('recipient_id', userId);
```

---

## Troubleshooting Common Issues

### Issue: "Row Level Security policy violation"

**Problem:** Your query returned no results or failed

**Why:** RLS policy blocked access

**Solution:** Check your RLS policies
```sql
-- View policies on a table
SELECT * FROM pg_policies WHERE tablename = 'applications';
```

### Issue: "Foreign key constraint violation"

**Problem:** Can't insert/update because referenced record doesn't exist

**Example:**
```tsx
// Trying to create application for non-existent listing
await supabase.from('applications').insert({
  listing_id: 'fake-id-that-doesnt-exist'  // Error!
});
```

**Solution:** Ensure referenced record exists first

### Issue: "Duplicate key value"

**Problem:** Trying to insert duplicate unique value

**Example:**
```tsx
// Trying to save same listing twice
await supabase.from('saved_listings').insert({
  user_id: 'user-123',
  listing_id: 'listing-abc'  // Already saved!
});
```

**Solution:** Check for existing record first, or use UPSERT

---

## Summary

### Key Takeaways

1. **Tables store data** - Like Excel sheets
2. **Relationships connect tables** - Foreign keys link data
3. **JSONB is flexible** - For complex/varying data
4. **RLS protects data** - Users only see what they should
5. **Migrations track changes** - Version control for schema
6. **Indexes speed up queries** - Essential for performance
7. **Joins combine data** - Get related data in one query

### The Big Picture

```
┌────────────────────────────────────────┐
│  Your React Native App                 │
│  - Components render UI                │
│  - Hooks fetch data                    │
│  - Services make API calls             │
└────────────┬───────────────────────────┘
             ↓
┌────────────────────────────────────────┐
│  Supabase Client                       │
│  - Converts JS to SQL                  │
│  - Handles auth tokens                 │
│  - Manages real-time subscriptions     │
└────────────┬───────────────────────────┘
             ↓
┌────────────────────────────────────────┐
│  PostgreSQL Database                   │
│  - Stores all data in tables           │
│  - Enforces RLS policies               │
│  - Executes SQL queries                │
│  - Returns results                     │
└────────────────────────────────────────┘
```

---

**Next Steps:**

1. Explore your database using Supabase Studio (web UI)
2. Try writing simple queries
3. Look at migration files to understand schema
4. Trace a query from code → database → results

**Happy learning!** 🎓
