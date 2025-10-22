import { useState, useCallback, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import {
  createApplication,
  saveApplicationDraft,
  getApplicationDraft,
  clearApplicationDraft,
  hasUserApplied,
  type ApplicationData,
  type ApplicationDocument,
  type DocumentType,
  type CreateApplicationParams,
} from '../services/application.service';
import { validateDocumentFile } from '../services/storage.service';
import { useAuthStore } from '../state/useAuthStore';

// Wizard steps
export type WizardStep = 'info' | 'eligibility' | 'documents' | 'review';

interface WizardState {
  currentStep: WizardStep;
  data: Partial<ApplicationData>;
  documents: ApplicationDocument[];
  signature: string;
  isValid: boolean;
  errors: Record<string, string>;
}

interface UseApplicationWizardOptions {
  listingId: string;
  requiredDocuments?: DocumentType[];
  onSuccess?: (applicationId: string) => void;
  onError?: (error: string) => void;
}

const WIZARD_STEPS: WizardStep[] = ['info', 'eligibility', 'documents', 'review'];

const REQUIRED_DOCUMENT_TYPES: DocumentType[] = [
  'id',
  'income_proof',
  'insurance',
];

export function useApplicationWizard({
  listingId,
  requiredDocuments = REQUIRED_DOCUMENT_TYPES,
  onSuccess,
  onError,
}: UseApplicationWizardOptions) {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  // Initialize state
  const [state, setState] = useState<WizardState>({
    currentStep: 'info',
    data: {
      fullName: user?.fullName || '',
      email: user?.email || '',
      phone: user?.phone || '',
      eligibilityTags: [],
    },
    documents: [],
    signature: '',
    isValid: false,
    errors: {},
  });

  // Check if already applied
  const { data: alreadyApplied } = useQuery({
    queryKey: ['application', 'check', listingId],
    queryFn: () => hasUserApplied(listingId),
  });

  // Load draft on mount
  useEffect(() => {
    const draft = getApplicationDraft(listingId);
    if (draft) {
      setState((prev) => ({
        ...prev,
        data: { ...prev.data, ...draft },
      }));
    }
  }, [listingId]);

  // Save draft periodically
  useEffect(() => {
    const timer = setInterval(() => {
      if (state.currentStep !== 'review') {
        saveApplicationDraft(listingId, state.data);
      }
    }, 10000); // Save every 10 seconds

    return () => clearInterval(timer);
  }, [listingId, state.data, state.currentStep]);

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: async (params: CreateApplicationParams) => {
      return createApplication(params);
    },
    onSuccess: (result) => {
      if (result.success && result.application) {
        clearApplicationDraft(listingId);
        queryClient.invalidateQueries({ queryKey: ['applications'] });
        queryClient.invalidateQueries({ queryKey: ['application', 'check', listingId] });
        onSuccess?.(result.application.id);
      } else {
        onError?.(result.error || 'Failed to submit application');
      }
    },
    onError: (error) => {
      onError?.(error instanceof Error ? error.message : 'Submission failed');
    },
  });

  // Navigate between steps
  const goToStep = useCallback((step: WizardStep) => {
    setState((prev) => ({ ...prev, currentStep: step }));
  }, []);

  const nextStep = useCallback(() => {
    const currentIndex = WIZARD_STEPS.indexOf(state.currentStep);
    if (currentIndex < WIZARD_STEPS.length - 1) {
      goToStep(WIZARD_STEPS[currentIndex + 1]);
    }
  }, [state.currentStep, goToStep]);

  const previousStep = useCallback(() => {
    const currentIndex = WIZARD_STEPS.indexOf(state.currentStep);
    if (currentIndex > 0) {
      goToStep(WIZARD_STEPS[currentIndex - 1]);
    }
  }, [state.currentStep, goToStep]);

  // Update application data
  const updateData = useCallback(<K extends keyof ApplicationData>(
    field: K,
    value: ApplicationData[K]
  ) => {
    setState((prev) => ({
      ...prev,
      data: { ...prev.data, [field]: value },
      errors: { ...prev.errors, [field]: undefined },
    }));
  }, []);

  // Update multiple fields at once
  const updateMultipleFields = useCallback((updates: Partial<ApplicationData>) => {
    setState((prev) => ({
      ...prev,
      data: { ...prev.data, ...updates },
    }));
  }, []);

  // Add eligibility tag
  const addEligibilityTag = useCallback((tag: string) => {
    setState((prev) => ({
      ...prev,
      data: {
        ...prev.data,
        eligibilityTags: [...(prev.data.eligibilityTags || []), tag],
      },
    }));
  }, []);

  // Remove eligibility tag
  const removeEligibilityTag = useCallback((tag: string) => {
    setState((prev) => ({
      ...prev,
      data: {
        ...prev.data,
        eligibilityTags: (prev.data.eligibilityTags || []).filter((t) => t !== tag),
      },
    }));
  }, []);

  // Pick document
  const pickDocument = useCallback(async (type: DocumentType) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];

        // Validate file
        const validation = validateDocumentFile({
          type: asset.mimeType,
          size: asset.size,
        });

        if (!validation.valid) {
          onError?.(validation.error || 'Invalid file');
          return;
        }

        // Add to documents
        const newDoc: ApplicationDocument = {
          id: Date.now().toString(),
          type,
          fileName: asset.name,
          fileUri: asset.uri,
          status: 'pending',
        };

        setState((prev) => ({
          ...prev,
          documents: [
            ...prev.documents.filter((d) => d.type !== type),
            newDoc,
          ],
        }));
      }
    } catch (error) {
      console.error('Pick document error:', error);
      onError?.('Failed to pick document');
    }
  }, [onError]);

  // Remove document
  const removeDocument = useCallback((documentId: string) => {
    setState((prev) => ({
      ...prev,
      documents: prev.documents.filter((d) => d.id !== documentId),
    }));
  }, []);

  // Update signature
  const updateSignature = useCallback((signature: string) => {
    setState((prev) => ({ ...prev, signature }));
  }, []);

  // Validate current step
  const validateStep = useCallback((step: WizardStep): boolean => {
    const errors: Record<string, string> = {};

    switch (step) {
      case 'info':
        if (!state.data.fullName?.trim()) {
          errors.fullName = 'Full name is required';
        }
        if (!state.data.email?.trim()) {
          errors.email = 'Email is required';
        }
        if (!state.data.phone?.trim()) {
          errors.phone = 'Phone number is required';
        }
        break;

      case 'eligibility':
        // Optional - no validation required
        break;

      case 'documents':
        const uploadedTypes = state.documents.map((d) => d.type);
        const missingDocs = requiredDocuments.filter(
          (type) => !uploadedTypes.includes(type)
        );
        if (missingDocs.length > 0) {
          errors.documents = `Missing required documents: ${missingDocs.join(', ')}`;
        }
        break;

      case 'review':
        if (!state.signature.trim()) {
          errors.signature = 'Signature is required';
        }
        break;
    }

    setState((prev) => ({ ...prev, errors }));
    return Object.keys(errors).length === 0;
  }, [state.data, state.documents, state.signature, requiredDocuments]);

  // Submit application
  const submit = useCallback(async () => {
    // Validate all steps
    for (const step of WIZARD_STEPS) {
      if (!validateStep(step)) {
        goToStep(step);
        return;
      }
    }

    // Ensure all required data is present
    if (!state.data.fullName || !state.data.email || !state.data.phone) {
      onError?.('Please complete all required fields');
      return;
    }

    // Submit
    await submitMutation.mutateAsync({
      listingId,
      data: state.data as ApplicationData,
      documents: state.documents,
      signature: state.signature,
    });
  }, [
    state,
    listingId,
    validateStep,
    goToStep,
    submitMutation,
    onError,
  ]);

  // Check if step is valid
  const isStepValid = useCallback((step: WizardStep): boolean => {
    switch (step) {
      case 'info':
        return !!(
          state.data.fullName?.trim() &&
          state.data.email?.trim() &&
          state.data.phone?.trim()
        );
      case 'eligibility':
        return true; // Optional step
      case 'documents':
        const uploadedTypes = state.documents.map((d) => d.type);
        return requiredDocuments.every((type) => uploadedTypes.includes(type));
      case 'review':
        return !!state.signature.trim();
      default:
        return false;
    }
  }, [state, requiredDocuments]);

  // Get progress percentage
  const getProgress = useCallback((): number => {
    const currentIndex = WIZARD_STEPS.indexOf(state.currentStep);
    return ((currentIndex + 1) / WIZARD_STEPS.length) * 100;
  }, [state.currentStep]);

  // Reset wizard
  const reset = useCallback(() => {
    setState({
      currentStep: 'info',
      data: {
        fullName: user?.fullName || '',
        email: user?.email || '',
        phone: user?.phone || '',
        eligibilityTags: [],
      },
      documents: [],
      signature: '',
      isValid: false,
      errors: {},
    });
    clearApplicationDraft(listingId);
  }, [user, listingId]);

  return {
    // State
    currentStep: state.currentStep,
    data: state.data,
    documents: state.documents,
    signature: state.signature,
    errors: state.errors,
    isSubmitting: submitMutation.isPending,
    alreadyApplied,

    // Actions
    goToStep,
    nextStep,
    previousStep,
    updateData,
    updateMultipleFields,
    addEligibilityTag,
    removeEligibilityTag,
    pickDocument,
    removeDocument,
    updateSignature,
    validateStep,
    submit,
    reset,

    // Helpers
    isStepValid,
    getProgress,
    canGoNext: isStepValid(state.currentStep),
    canGoBack: WIZARD_STEPS.indexOf(state.currentStep) > 0,
    isFirstStep: state.currentStep === WIZARD_STEPS[0],
    isLastStep: state.currentStep === WIZARD_STEPS[WIZARD_STEPS.length - 1],
    stepIndex: WIZARD_STEPS.indexOf(state.currentStep),
    totalSteps: WIZARD_STEPS.length,
  };
}