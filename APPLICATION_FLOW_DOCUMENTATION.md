# Application Flow Documentation

## Overview
This document describes the complete application flow from a seeker submitting an application to a provider reviewing it.

## 1. Seeker Side - Application Submission

### Step 1: Personal Information
- Full Name
- Phone Number
- Email Address

### Step 2: Eligibility Tags
- Select relevant eligibility tags
- Tags are grouped by category (family, income, housing, etc.)

### Step 3: Document Upload
- Upload required documents (ID, income proof, references, etc.)
- Documents are temporarily stored locally until submission
- Each document type has specific requirements

### Step 4: Review & Submit
- Review all entered information
- Provide electronic signature (type full name)
- Agree to terms and conditions
- Submit application

### Application Submission Process:
1. **Pre-submission Checks:**
   - User authentication verified
   - Check for existing applications (prevent duplicates)
   - Validate all required fields

2. **Application Creation:**
   - Insert application record in database
   - Status set to "new"
   - Links to seeker_id and listing_id

3. **Document Upload:**
   - Documents uploaded to Supabase Storage
   - Path: `application-documents/{application_id}/{filename}`
   - Document records created in database with file paths

4. **Post-submission:**
   - Draft cleared from local storage
   - Success confirmation shown
   - Redirects to Applications List

## 2. Provider Side - Application Review

### Provider Dashboard
- Shows count of new applications
- Lists all applications for provider's listings
- Can filter by status (new, under_review, approved, etc.)

### Application Details View
- **Seeker Information:**
  - Name, email, phone
  - Submission date/time

- **Eligibility Tags:**
  - All selected tags displayed
  - Grouped by category

- **Documents:**
  - List of uploaded documents
  - Click to view (generates signed URL)
  - Documents open in modal/viewer

- **Application Actions:**
  - Update status (approve, reject, request more docs)
  - Add internal notes
  - Contact seeker

## 3. Database Structure

### Tables:
1. **applications**
   - id, listing_id, seeker_id
   - status, application_data
   - created_at, updated_at, deleted_at

2. **documents**
   - id, application_id
   - type, file_path, file_url
   - uploaded_at, verified_at

3. **listings**
   - id, provider_id
   - title, description, address
   - requirements, is_active

4. **profiles**
   - id, email, role
   - full_name, phone
   - verification status

## 4. Security & Permissions

### Row Level Security (RLS):
- **Seekers:**
  - Can create applications for any listing
  - Can view/edit/delete own applications
  - Can upload documents for own applications

- **Providers:**
  - Can view applications for their listings
  - Can view documents for applications
  - Cannot modify seeker's application data

### Storage Security:
- Documents stored in private bucket
- Access via signed URLs (1-hour expiry)
- Only authorized users can generate URLs

## 5. Status Flow

```
new → docs_needed → under_review → interview_scheduled → approved/rejected/waitlisted
                ↓                                    ↓
            withdrawn                           withdrawn
```

## 6. Error Handling

### Common Issues Fixed:
1. **RLS Policy Violations:**
   - Fixed by updating policies for documents table
   - Seekers can now insert documents properly

2. **Multiple Submission Prevention:**
   - Added loading state to disable button
   - Prevents duplicate submissions

3. **Application Count Badge:**
   - Fixed to exclude withdrawn/deleted applications
   - Only shows active application count

4. **Document Viewing:**
   - Implemented signed URL generation
   - Fixed storage path handling
   - Added proper error handling

## 7. Key Features

### For Seekers:
- Save draft locally (auto-save)
- Resume application later
- Upload multiple documents
- Track application status
- Withdraw application

### For Providers:
- Real-time application notifications
- Bulk status updates
- Document verification
- Internal notes system
- Application filtering/search

## 8. Testing Checklist

### Seeker Flow:
- [ ] Can create new application
- [ ] Can upload documents
- [ ] Cannot submit duplicate applications
- [ ] Can view own applications
- [ ] Can withdraw application
- [ ] Application count updates correctly

### Provider Flow:
- [ ] Can see new applications
- [ ] Can view application details
- [ ] Can view uploaded documents
- [ ] Can update application status
- [ ] Cannot see applications for other providers' listings

### Edge Cases:
- [ ] Logout during application (draft saved)
- [ ] Network failure during submission
- [ ] Large file uploads
- [ ] Concurrent submissions
- [ ] Role switching (seeker ↔ provider)