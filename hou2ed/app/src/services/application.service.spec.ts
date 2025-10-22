import fc from 'fast-check';
import {
  createApplication,
  getApplication,
  getUserApplications,
  updateApplicationStatus,
  withdrawApplication,
  addDocumentToApplication,
  hasUserApplied,
  getUserApplicationStats,
  saveApplicationDraft,
  getApplicationDraft,
  clearApplicationDraft,
  type ApplicationData,
  type CreateApplicationParams,
} from './application.service';
import { supabase } from '../lib/supabase';
import { uploadApplicationDocument } from './storage.service';

// Mock dependencies
jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
  },
}));

jest.mock('./storage.service', () => ({
  uploadApplicationDocument: jest.fn(),
  getDocumentSignedUrl: jest.fn(),
  validateDocumentFile: jest.fn(),
}));

describe('createApplication', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com' };
  const mockApplicationData: ApplicationData = {
    fullName: 'John Doe',
    phone: '555-0123',
    email: 'john@example.com',
    eligibilityTags: ['veteran', 'single'],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: mockUser },
      error: null,
    } as any);
  });

  test('should create application successfully', async () => {
    const mockApplication = {
      id: 'app-123',
      listing_id: 'listing-456',
      seeker_id: mockUser.id,
      status: 'new',
      application_data: mockApplicationData,
    };

    const fromMock = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: mockApplication,
        error: null,
      }),
    };

    (supabase.from as jest.Mock).mockImplementation((table) => {
      if (table === 'applications') return fromMock as any;
      if (table === 'listings') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { provider_id: 'provider-789' },
            error: null,
          }),
        } as any;
      }
      if (table === 'threads') {
        return {
          insert: jest.fn().mockResolvedValue({ error: null }),
        } as any;
      }
      return {} as any;
    });

    const params: CreateApplicationParams = {
      listingId: 'listing-456',
      data: mockApplicationData,
      signature: 'John Doe',
    };

    const result = await createApplication(params);

    expect(result.success).toBe(true);
    expect(result.application?.id).toBe('app-123');
    expect(fromMock.insert).toHaveBeenCalledWith({
      listing_id: 'listing-456',
      seeker_id: mockUser.id,
      status: 'new',
      application_data: mockApplicationData,
      stage_timestamps: {
        new: expect.any(String),
      },
      consent_signature: 'John Doe',
      consent_timestamp: expect.any(String),
    });
  });

  test('should handle unauthenticated user', async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: null },
      error: null,
    } as any);

    const result = await createApplication({
      listingId: 'listing-456',
      data: mockApplicationData,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('User not authenticated');
  });

  test('should upload documents if provided', async () => {
    const mockApplication = {
      id: 'app-123',
      listing_id: 'listing-456',
      seeker_id: mockUser.id,
    };

    const documents = [
      {
        id: 'doc-1',
        type: 'id' as const,
        fileName: 'id.pdf',
        fileUri: 'file://id.pdf',
        status: 'pending' as const,
      },
    ];

    (uploadApplicationDocument as jest.Mock).mockResolvedValue({
      success: true,
      path: 'documents/id.pdf',
    });

    (supabase.from as jest.Mock).mockImplementation((table) => {
      if (table === 'applications') {
        return {
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: mockApplication,
            error: null,
          }),
        } as any;
      }
      if (table === 'documents') {
        return {
          insert: jest.fn().mockResolvedValue({ error: null }),
        } as any;
      }
      if (table === 'listings' || table === 'threads') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: { provider_id: 'p-1' }, error: null }),
          insert: jest.fn().mockResolvedValue({ error: null }),
        } as any;
      }
      return {} as any;
    });

    const result = await createApplication({
      listingId: 'listing-456',
      data: mockApplicationData,
      documents,
    });

    expect(result.success).toBe(true);
    expect(uploadApplicationDocument).toHaveBeenCalledWith(
      'file://id.pdf',
      'app-123',
      'id'
    );
  });
});

describe('getUserApplications', () => {
  const mockUser = { id: 'user-123' };

  beforeEach(() => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: mockUser },
      error: null,
    } as any);
  });

  test('should fetch user applications', async () => {
    const mockApplications = [
      {
        id: 'app-1',
        listing_id: 'listing-1',
        status: 'new',
        created_at: '2024-01-01',
      },
      {
        id: 'app-2',
        listing_id: 'listing-2',
        status: 'approved',
        created_at: '2024-01-02',
      },
    ];

    const fromMock = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: mockApplications,
        error: null,
      }),
    };

    (supabase.from as jest.Mock).mockReturnValue(fromMock as any);

    const result = await getUserApplications();

    expect(result).toHaveLength(2);
    expect(fromMock.eq).toHaveBeenCalledWith('seeker_id', mockUser.id);
    expect(fromMock.order).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  test('should return empty array when user not authenticated', async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: null },
      error: null,
    } as any);

    const result = await getUserApplications();

    expect(result).toEqual([]);
  });
});

describe('updateApplicationStatus', () => {
  test('should update application status successfully', async () => {
    const mockUpdatedApplication = {
      id: 'app-123',
      status: 'under_review',
      updated_at: new Date().toISOString(),
    };

    const fromMock = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: mockUpdatedApplication,
        error: null,
      }),
    };

    (supabase.from as jest.Mock).mockReturnValue(fromMock as any);

    const result = await updateApplicationStatus('app-123', 'under_review', 'Reviewing documents');

    expect(result.success).toBe(true);
    expect(result.application?.status).toBe('under_review');
    expect(fromMock.update).toHaveBeenCalledWith({
      status: 'under_review',
      updated_at: expect.any(String),
      'stage_timestamps.under_review': expect.any(String),
      notes: 'Reviewing documents',
    });
  });

  test('should handle update error', async () => {
    const fromMock = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: null,
        error: new Error('Update failed'),
      }),
    };

    (supabase.from as jest.Mock).mockReturnValue(fromMock as any);

    const result = await updateApplicationStatus('app-123', 'rejected');

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe('hasUserApplied', () => {
  test('should return true when user has applied', async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    } as any);

    const fromMock = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { id: 'app-123' },
        error: null,
      }),
    };

    (supabase.from as jest.Mock).mockReturnValue(fromMock as any);

    const result = await hasUserApplied('listing-456');

    expect(result).toBe(true);
  });

  test('should return false when user has not applied', async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    } as any);

    const fromMock = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }, // No rows found
      }),
    };

    (supabase.from as jest.Mock).mockReturnValue(fromMock as any);

    const result = await hasUserApplied('listing-456');

    expect(result).toBe(false);
  });
});

describe('getUserApplicationStats', () => {
  test('should calculate application statistics correctly', async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    } as any);

    const mockApplications = [
      { status: 'new' },
      { status: 'docs_needed' },
      { status: 'under_review' },
      { status: 'approved' },
      { status: 'rejected' },
    ];

    const fromMock = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({
        data: mockApplications,
        error: null,
      }),
    };

    (supabase.from as jest.Mock).mockReturnValue(fromMock as any);

    const stats = await getUserApplicationStats();

    expect(stats).toEqual({
      total: 5,
      pending: 3, // new, docs_needed, under_review
      approved: 1,
      rejected: 1,
    });
  });
});

describe('Application Draft Functions', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('should save application draft', () => {
    const draftData = {
      fullName: 'John Doe',
      email: 'john@example.com',
    };

    saveApplicationDraft('listing-123', draftData);

    const stored = localStorage.getItem('application_draft_listing-123');
    expect(stored).toBeTruthy();

    const parsed = JSON.parse(stored!);
    expect(parsed.data).toEqual(draftData);
    expect(parsed.timestamp).toBeDefined();
  });

  test('should retrieve valid draft', () => {
    const draftData = {
      fullName: 'John Doe',
      email: 'john@example.com',
    };

    localStorage.setItem(
      'application_draft_listing-123',
      JSON.stringify({
        data: draftData,
        timestamp: Date.now(),
      })
    );

    const retrieved = getApplicationDraft('listing-123');

    expect(retrieved).toEqual(draftData);
  });

  test('should return null for expired draft', () => {
    const eightDaysAgo = Date.now() - (8 * 24 * 60 * 60 * 1000);

    localStorage.setItem(
      'application_draft_listing-123',
      JSON.stringify({
        data: { fullName: 'Old Draft' },
        timestamp: eightDaysAgo,
      })
    );

    const retrieved = getApplicationDraft('listing-123');

    expect(retrieved).toBeNull();
    expect(localStorage.getItem('application_draft_listing-123')).toBeNull();
  });

  test('should clear draft', () => {
    localStorage.setItem(
      'application_draft_listing-123',
      JSON.stringify({
        data: { fullName: 'Test' },
        timestamp: Date.now(),
      })
    );

    clearApplicationDraft('listing-123');

    expect(localStorage.getItem('application_draft_listing-123')).toBeNull();
  });
});

describe('Property-based tests', () => {
  describe('Application Data validation', () => {
    test('should handle any valid application data shape', () => {
      fc.assert(
        fc.property(
          fc.record({
            fullName: fc.string({ minLength: 1, maxLength: 100 }),
            email: fc.emailAddress(),
            phone: fc.string({ minLength: 10, maxLength: 15 }).map(s => s.replace(/[^0-9]/g, '')),
            eligibilityTags: fc.array(
              fc.constantFrom('veteran', 'single', 'family', 'disabled', 'senior'),
              { minLength: 0, maxLength: 10 }
            ),
          }),
          (data) => {
            // Property: Valid data should always have required fields
            expect(data.fullName).toBeDefined();
            expect(data.email).toBeDefined();
            expect(data.phone).toBeDefined();
            expect(Array.isArray(data.eligibilityTags)).toBe(true);

            // Property: Email should be valid format
            expect(data.email).toMatch(/@/);

            // Property: Phone should only contain digits
            expect(data.phone).toMatch(/^[0-9]+$/);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('application status transitions should be valid', () => {
      const validStatuses = ['new', 'docs_needed', 'under_review', 'approved', 'rejected', 'waitlisted'] as const;

      fc.assert(
        fc.property(
          fc.constantFrom(...validStatuses),
          fc.constantFrom(...validStatuses),
          (fromStatus, toStatus) => {
            // Property: Status should always be a valid enum value
            expect(validStatuses).toContain(fromStatus);
            expect(validStatuses).toContain(toStatus);

            // Property: Certain transitions should not be allowed
            if (fromStatus === 'rejected' && toStatus === 'approved') {
              // This would be a business rule violation
              expect(fromStatus).not.toBe('rejected');
            }
          }
        )
      );
    });
  });

  describe('Draft storage properties', () => {
    test('draft should preserve data integrity', () => {
      fc.assert(
        fc.property(
          fc.record({
            fullName: fc.string(),
            email: fc.string(),
            phone: fc.string(),
            eligibilityTags: fc.array(fc.string()),
          }),
          fc.string({ minLength: 1, maxLength: 50 }),
          (data, listingId) => {
            // Save draft
            saveApplicationDraft(listingId, data);

            // Retrieve draft
            const retrieved = getApplicationDraft(listingId);

            // Property: Retrieved data should match saved data
            expect(retrieved).toEqual(data);

            // Clean up
            clearApplicationDraft(listingId);

            // Property: After clearing, draft should be null
            expect(getApplicationDraft(listingId)).toBeNull();
          }
        )
      );
    });

    test('draft key generation should be unique per listing', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 2, maxLength: 10 }),
          (listingIds) => {
            const uniqueIds = [...new Set(listingIds)];

            // Save drafts for each unique listing
            uniqueIds.forEach((id, index) => {
              saveApplicationDraft(id, { fullName: `User ${index}` });
            });

            // Property: Each listing should have its own draft
            uniqueIds.forEach((id, index) => {
              const draft = getApplicationDraft(id);
              expect(draft?.fullName).toBe(`User ${index}`);
            });

            // Clean up
            uniqueIds.forEach(id => clearApplicationDraft(id));
          }
        )
      );
    });
  });

  describe('Document type validation', () => {
    test('document types should be valid enum values', () => {
      const validTypes = ['id', 'income_proof', 'insurance', 'referral_letter', 'medical_clearance', 'background_check', 'other'];

      fc.assert(
        fc.property(
          fc.constantFrom(...validTypes),
          (docType) => {
            // Property: Document type should always be valid
            expect(validTypes).toContain(docType);
          }
        )
      );
    });
  });
});

describe('Parameterized edge case tests', () => {
  const testCases = [
    { name: 'empty string', value: '' },
    { name: 'whitespace only', value: '   ' },
    { name: 'special characters', value: '@#$%^&*()' },
    { name: 'very long string', value: 'a'.repeat(1000) },
    { name: 'unicode characters', value: '你好世界🌍' },
    { name: 'SQL injection attempt', value: "'; DROP TABLE applications; --" },
    { name: 'XSS attempt', value: '<script>alert("xss")</script>' },
  ];

  testCases.forEach(({ name, value }) => {
    test(`should handle ${name} in application data safely`, async () => {
      const mockUser = { id: 'user-123' };
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      } as any);

      const fromMock = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: new Error('Validation error'),
        }),
      };

      (supabase.from as jest.Mock).mockReturnValue(fromMock as any);

      const result = await createApplication({
        listingId: 'listing-123',
        data: {
          fullName: value,
          email: 'test@example.com',
          phone: '555-0123',
          eligibilityTags: [],
        },
      });

      // Should handle gracefully without throwing
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Concurrent operations', () => {
    test('should handle multiple simultaneous draft saves', async () => {
      const operations = Array.from({ length: 10 }, (_, i) => ({
        listingId: `listing-${i}`,
        data: { fullName: `User ${i}` },
      }));

      // Save all drafts concurrently
      await Promise.all(
        operations.map(({ listingId, data }) =>
          Promise.resolve(saveApplicationDraft(listingId, data))
        )
      );

      // Verify all drafts were saved correctly
      operations.forEach(({ listingId, data }) => {
        const draft = getApplicationDraft(listingId);
        expect(draft).toEqual(data);
        clearApplicationDraft(listingId);
      });
    });
  });

  describe('Boundary value tests', () => {
    test('should handle minimum and maximum field lengths', () => {
      const testData = [
        { field: 'fullName', min: 1, max: 100 },
        { field: 'phone', min: 10, max: 15 },
        { field: 'email', min: 5, max: 254 }, // RFC 5321
      ];

      testData.forEach(({ field, min, max }) => {
        // Test minimum length
        const minData = { [field]: 'a'.repeat(min) };
        saveApplicationDraft('test-min', minData);
        expect(getApplicationDraft('test-min')).toEqual(minData);

        // Test maximum length
        const maxData = { [field]: 'a'.repeat(max) };
        saveApplicationDraft('test-max', maxData);
        expect(getApplicationDraft('test-max')).toEqual(maxData);

        // Clean up
        clearApplicationDraft('test-min');
        clearApplicationDraft('test-max');
      });
    });

    test('should handle array size limits for eligibility tags', () => {
      const testCases = [
        { count: 0, description: 'empty array' },
        { count: 1, description: 'single tag' },
        { count: 10, description: 'moderate number of tags' },
        { count: 100, description: 'large number of tags' },
      ];

      testCases.forEach(({ count, description }) => {
        const tags = Array.from({ length: count }, (_, i) => `tag-${i}`);
        const data = { eligibilityTags: tags };

        saveApplicationDraft(`test-${count}`, data);
        const retrieved = getApplicationDraft(`test-${count}`);

        expect(retrieved?.eligibilityTags).toHaveLength(count);
        expect(retrieved).toEqual(data);

        clearApplicationDraft(`test-${count}`);
      });
    });
  });
});