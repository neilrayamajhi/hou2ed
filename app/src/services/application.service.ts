import { supabase } from '../lib/supabase';
import { uploadApplicationDocument, getDocumentSignedUrl } from './storage.service';
import type { Database } from '../lib/supabase';

// Type definitions
export interface ApplicationData {
  fullName: string;
  phone: string;
  email: string;
  eligibilityTags: string[];
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  additionalInfo?: string;
}

export interface ApplicationDocument {
  id: string;
  type: DocumentType;
  fileName: string;
  fileUri: string;
  status: DocumentStatus;
  uploadProgress?: number;
  error?: string;
}

export type DocumentType =
  | 'id'
  | 'income_proof'
  | 'insurance'
  | 'referral_letter'
  | 'medical_clearance'
  | 'background_check'
  | 'other';

export type DocumentStatus =
  | 'pending'
  | 'uploading'
  | 'uploaded'
  | 'verified'
  | 'rejected'
  | 'error';

export type ApplicationStatus =
  | 'draft'
  | 'new'
  | 'docs_needed'
  | 'under_review'
  | 'interview_scheduled'
  | 'approved'
  | 'rejected'
  | 'waitlisted'
  | 'withdrawn';

export interface Application {
  id: string;
  listing_id: string;
  seeker_id: string;
  status: ApplicationStatus;
  application_data: ApplicationData;
  documents?: ApplicationDocument[];
  stage_timestamps: Record<ApplicationStatus, string | null>;
  notes?: string;
  decision_by?: string;
  decision_note?: string;
  decision_date?: string;
  consent_signature?: string;
  consent_timestamp?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateApplicationParams {
  listingId: string;
  data: ApplicationData;
  documents?: ApplicationDocument[];
  signature?: string;
}

export interface ApplicationResult {
  success: boolean;
  application?: Application;
  error?: string;
}

/**
 * Create a new application
 */
export async function createApplication(
  params: CreateApplicationParams
): Promise<ApplicationResult> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        success: false,
        error: 'User not authenticated',
      };
    }

    // Create application record
    const { data: application, error } = await supabase
      .from('applications')
      .insert({
        listing_id: params.listingId,
        seeker_id: user.id,
        status: 'new',
        application_data: params.data,
        stage_timestamps: {
          new: new Date().toISOString(),
        },
        consent_signature: params.signature,
        consent_timestamp: params.signature ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (error) {
      console.error('Create application error:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    // Upload documents if provided
    if (params.documents && params.documents.length > 0) {
      await uploadApplicationDocuments(application.id, params.documents, user.id);
    }

    // Create initial thread for messaging
    await createApplicationThread(application.id, params.listingId, user.id);

    return {
      success: true,
      application: application as Application,
    };
  } catch (error) {
    console.error('Create application error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create application',
    };
  }
}

/**
 * Upload documents for an application
 */
async function uploadApplicationDocuments(
  applicationId: string,
  documents: ApplicationDocument[],
  uploadedBy: string
): Promise<void> {
  try {
    for (const doc of documents) {
      if (doc.status === 'uploaded' || !doc.fileUri) continue;

      // Upload to storage
      const result = await uploadApplicationDocument(
        doc.fileUri,
        applicationId,
        doc.type
      );

      if (result.success && result.path) {
        // Create document record
        await supabase
          .from('documents')
          .insert({
            application_id: applicationId,
            type: doc.type,
            file_url: result.path,
            status: 'uploaded',
            uploaded_by: uploadedBy,
          });
      }
    }
  } catch (error) {
    console.error('Upload documents error:', error);
    throw error;
  }
}

/**
 * Create a messaging thread for the application
 */
async function createApplicationThread(
  applicationId: string,
  listingId: string,
  seekerId: string
): Promise<void> {
  try {
    // Get provider ID from listing
    const { data: listing } = await supabase
      .from('listings')
      .select('provider_id')
      .eq('id', listingId)
      .single();

    if (!listing) return;

    // Create thread
    await supabase
      .from('threads')
      .insert({
        application_id: applicationId,
        listing_id: listingId,
        participants: [seekerId, listing.provider_id],
      });
  } catch (error) {
    console.error('Create thread error:', error);
    // Non-critical error, don't throw
  }
}

/**
 * Get application by ID
 */
export async function getApplication(id: string): Promise<Application | null> {
  try {
    const { data, error } = await supabase
      .from('applications')
      .select(`
        *,
        listing:listings (
          id,
          title,
          address,
          city,
          state,
          provider_id
        ),
        documents (
          id,
          type,
          file_url,
          status,
          uploaded_at
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Get application error:', error);
      return null;
    }

    // Properly type the response
    const typedApplication: Application = {
      ...data,
      documents: data.documents || [],
    };
    return typedApplication;
  } catch (error) {
    console.error('Get application error:', error);
    return null;
  }
}

/**
 * Get all applications for a provider (across all their listings)
 */
export async function getProviderApplications(providerId: string): Promise<Application[]> {
  try {
    console.log('📋 Fetching applications for provider:', providerId);

    const { data, error} = await supabase
      .from('applications')
      .select(`
        *,
        listing:listings!inner (
          id,
          title,
          address,
          city,
          state,
          provider_id
        ),
        seeker:profiles!applications_seeker_id_fkey (
          full_name,
          email,
          phone
        )
      `)
      .eq('listing.provider_id', providerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching provider applications:', error);
      return [];
    }

    console.log(`✅ Found ${data?.length || 0} applications for provider`);

    // Type the response properly
    const typedApplications: Application[] = data.map((app: any) => ({
      ...app,
      documents: app.documents || [],
    }));

    return typedApplications;
  } catch (error) {
    console.error('Failed to fetch provider applications:', error);
    return [];
  }
}

/**
 * Get user's applications
 */
export async function getUserApplications(): Promise<Application[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('applications')
      .select(`
        *,
        listing:listings (
          id,
          title,
          address,
          city,
          state,
          images,
          availability
        )
      `)
      .eq('seeker_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get user applications error:', error);
      return [];
    }

    // Properly type the response array
    const typedApplications: Application[] = data.map((app: any) => ({
      ...app,
      documents: app.documents || [],
    }));
    return typedApplications;
  } catch (error) {
    console.error('Get user applications error:', error);
    return [];
  }
}

/**
 * Update application status
 */
export async function updateApplicationStatus(
  id: string,
  status: ApplicationStatus,
  note?: string
): Promise<ApplicationResult> {
  try {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    // Update stage timestamp
    updateData[`stage_timestamps.${status}`] = new Date().toISOString();

    if (note) {
      updateData.notes = note;
    }

    const { data, error } = await supabase
      .from('applications')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Update application status error:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      application: data as Application,
    };
  } catch (error) {
    console.error('Update application status error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update status',
    };
  }
}

/**
 * Withdraw application
 */
export async function withdrawApplication(id: string): Promise<ApplicationResult> {
  return updateApplicationStatus(id, 'withdrawn', 'Withdrawn by applicant');
}

/**
 * Add document to existing application
 */
export async function addDocumentToApplication(
  applicationId: string,
  document: ApplicationDocument
): Promise<ApplicationResult> {
  try {
    if (!document.fileUri) {
      return {
        success: false,
        error: 'No file provided',
      };
    }

    // Upload to storage
    const result = await uploadApplicationDocument(
      document.fileUri,
      applicationId,
      document.type
    );

    if (!result.success || !result.path) {
      return {
        success: false,
        error: result.error || 'Upload failed',
      };
    }

    // Create document record
    const { error } = await supabase
      .from('documents')
      .insert({
        application_id: applicationId,
        type: document.type,
        file_url: result.path,
        status: 'uploaded',
        uploaded_by: (await supabase.auth.getUser()).data.user?.id,
      });

    if (error) {
      console.error('Add document error:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error('Add document error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add document',
    };
  }
}

/**
 * Get signed URLs for application documents
 */
export async function getApplicationDocumentUrls(
  applicationId: string
): Promise<Record<string, string>> {
  try {
    const { data: documents, error } = await supabase
      .from('documents')
      .select('type, file_url')
      .eq('application_id', applicationId);

    if (error || !documents) {
      console.error('Get documents error:', error);
      return {};
    }

    const urls: Record<string, string> = {};

    for (const doc of documents) {
      const signedUrl = await getDocumentSignedUrl(doc.file_url);
      if (signedUrl) {
        urls[doc.type] = signedUrl;
      }
    }

    return urls;
  } catch (error) {
    console.error('Get document URLs error:', error);
    return {};
  }
}

/**
 * Check if user has already applied to a listing
 */
export async function hasUserApplied(listingId: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .from('applications')
      .select('id')
      .eq('listing_id', listingId)
      .eq('seeker_id', user.id)
      .not('status', 'in', '["withdrawn"]')
      .single();

    return !error && !!data;
  } catch (error) {
    console.error('Check application error:', error);
    return false;
  }
}

/**
 * Get application statistics for a user
 */
export async function getUserApplicationStats(): Promise<{
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { total: 0, pending: 0, approved: 0, rejected: 0 };
    }

    const { data, error } = await supabase
      .from('applications')
      .select('status')
      .eq('seeker_id', user.id);

    if (error || !data) {
      return { total: 0, pending: 0, approved: 0, rejected: 0 };
    }

    return {
      total: data.length,
      pending: data.filter(a => ['new', 'docs_needed', 'under_review'].includes(a.status)).length,
      approved: data.filter(a => a.status === 'approved').length,
      rejected: data.filter(a => a.status === 'rejected').length,
    };
  } catch (error) {
    console.error('Get application stats error:', error);
    return { total: 0, pending: 0, approved: 0, rejected: 0 };
  }
}

/**
 * Save application draft (for multi-step wizard)
 */
export async function saveApplicationDraft(
  listingId: string,
  data: Partial<ApplicationData>
): Promise<void> {
  try {
    const key = `application_draft_${listingId}`;
    localStorage.setItem(key, JSON.stringify({
      data,
      timestamp: Date.now(),
    }));
  } catch (error) {
    console.error('Save draft error:', error);
  }
}

/**
 * Get application draft
 */
export function getApplicationDraft(listingId: string): Partial<ApplicationData> | null {
  try {
    const key = `application_draft_${listingId}`;
    const draft = localStorage.getItem(key);

    if (!draft) return null;

    const parsed = JSON.parse(draft);

    // Check if draft is older than 7 days
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    if (parsed.timestamp < sevenDaysAgo) {
      localStorage.removeItem(key);
      return null;
    }

    return parsed.data;
  } catch (error) {
    console.error('Get draft error:', error);
    return null;
  }
}

/**
 * Clear application draft
 */
export function clearApplicationDraft(listingId: string): void {
  try {
    const key = `application_draft_${listingId}`;
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Clear draft error:', error);
  }
}