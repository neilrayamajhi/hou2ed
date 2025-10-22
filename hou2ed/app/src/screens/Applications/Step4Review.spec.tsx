import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import Step4Review from './Step4Review';
import type { ApplicationDraft } from './ApplyWizard';
import { ELIGIBILITY_TAG_GROUPS, DOCUMENT_TYPES } from '../../constants/application';

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('Step4Review', () => {
  const mockDraft: ApplicationDraft = {
    listingId: 'test-123',
    fullName: 'John Doe',
    phone: '5551234567',
    email: 'john.doe@example.com',
    eligibilityTags: ['veterans', 'families'],
    documents: [
      {
        type: 'id',
        uri: 'file://id.pdf',
        name: 'id.pdf',
        size: 1000000,
        uploadProgress: 100,
      },
      {
        type: 'income',
        uri: 'file://income.pdf',
        name: 'income.pdf',
        size: 2000000,
        uploadProgress: 100,
      },
    ],
    signature: '',
    agreedToTerms: false,
  };

  const mockOnUpdate = jest.fn();
  const mockOnSubmit = jest.fn();
  const mockOnBack = jest.fn();
  const mockOnEditStep = jest.fn();

  const defaultProps = {
    draft: mockDraft,
    onUpdate: mockOnUpdate,
    onSubmit: mockOnSubmit,
    onBack: mockOnBack,
    onEditStep: mockOnEditStep,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Review Sections', () => {
    test('displays contact information correctly', () => {
      const { getByText } = render(<Step4Review {...defaultProps} />);

      expect(getByText('Contact Information')).toBeTruthy();
      expect(getByText('John Doe')).toBeTruthy();
      expect(getByText('(555) 123-4567')).toBeTruthy();
      expect(getByText('john.doe@example.com')).toBeTruthy();
    });

    test('displays selected eligibility tags', () => {
      const { getByText } = render(<Step4Review {...defaultProps} />);

      expect(getByText('Eligibility')).toBeTruthy();
      // Find the labels for the selected tag IDs
      const veteransTag = ELIGIBILITY_TAG_GROUPS
        .flatMap(g => g.tags)
        .find(t => t.id === 'veterans');
      const familiesTag = ELIGIBILITY_TAG_GROUPS
        .flatMap(g => g.tags)
        .find(t => t.id === 'families');

      expect(getByText(`${veteransTag?.label}, ${familiesTag?.label}`)).toBeTruthy();
    });

    test('displays uploaded documents summary', () => {
      const { getByText } = render(<Step4Review {...defaultProps} />);

      expect(getByText('Documents')).toBeTruthy();
      expect(getByText('Government ID, Income Proof')).toBeTruthy();
    });

    test('shows "None selected" when no eligibility tags', () => {
      const draftNoTags = {
        ...mockDraft,
        eligibilityTags: [],
      };

      const { getByText } = render(
        <Step4Review {...defaultProps} draft={draftNoTags} />
      );

      expect(getByText('None selected')).toBeTruthy();
    });

    test('shows "No documents uploaded" when no documents', () => {
      const draftNoDocs = {
        ...mockDraft,
        documents: [],
      };

      const { getByText } = render(
        <Step4Review {...defaultProps} draft={draftNoDocs} />
      );

      expect(getByText('No documents uploaded')).toBeTruthy();
    });
  });

  describe('Edit Functionality', () => {
    test('calls onEditStep when Edit button clicked', () => {
      const { getAllByText } = render(<Step4Review {...defaultProps} />);

      const editButtons = getAllByText('Edit');

      // Edit contact information (step 1)
      fireEvent.press(editButtons[0]);
      expect(mockOnEditStep).toHaveBeenCalledWith(1);

      // Edit eligibility (step 2)
      fireEvent.press(editButtons[1]);
      expect(mockOnEditStep).toHaveBeenCalledWith(2);

      // Edit documents (step 3)
      fireEvent.press(editButtons[2]);
      expect(mockOnEditStep).toHaveBeenCalledWith(3);
    });
  });

  describe('Electronic Signature', () => {
    test('updates signature as user types', () => {
      const { getByPlaceholderText } = render(<Step4Review {...defaultProps} />);

      const signatureInput = getByPlaceholderText('John Doe');
      fireEvent.changeText(signatureInput, 'Jane Smith');

      expect(mockOnUpdate).toHaveBeenCalledWith({ signature: 'Jane Smith' });
    });

    test('filters out non-alphabetic characters from signature', () => {
      const { getByPlaceholderText } = render(<Step4Review {...defaultProps} />);

      const signatureInput = getByPlaceholderText('John Doe');
      fireEvent.changeText(signatureInput, 'John123 Doe!@#');

      expect(mockOnUpdate).toHaveBeenCalledWith({ signature: 'John Doe' });
    });

    test('shows signature preview when signature entered', () => {
      const draftWithSignature = {
        ...mockDraft,
        signature: 'John Doe',
      };

      const { getByText } = render(
        <Step4Review {...defaultProps} draft={draftWithSignature} />
      );

      expect(getByText('Your signature:')).toBeTruthy();
      expect(getByText('John Doe')).toBeTruthy();
      expect(getByText(/Signed on/)).toBeTruthy();
      expect(getByText(/IP: 192.168/)).toBeTruthy();
    });

    test('does not show preview when signature is empty', () => {
      const { queryByText } = render(<Step4Review {...defaultProps} />);

      expect(queryByText('Your signature:')).toBeFalsy();
    });
  });

  describe('Terms and Conditions', () => {
    test('toggles terms agreement checkbox', () => {
      const { getByLabelText } = render(<Step4Review {...defaultProps} />);

      const checkbox = getByLabelText('Terms and conditions checkbox');
      expect(checkbox.props.accessibilityState.checked).toBe(false);

      fireEvent.press(checkbox);
      expect(mockOnUpdate).toHaveBeenCalledWith({ agreedToTerms: true });
    });

    test('preserves terms state from draft', () => {
      const draftWithTerms = {
        ...mockDraft,
        agreedToTerms: true,
      };

      const { getByLabelText } = render(
        <Step4Review {...defaultProps} draft={draftWithTerms} />
      );

      const checkbox = getByLabelText('Terms and conditions checkbox');
      expect(checkbox.props.accessibilityState.checked).toBe(true);
    });
  });

  describe('Form Submission', () => {
    test('validates signature is required', () => {
      const draftWithTerms = {
        ...mockDraft,
        agreedToTerms: true,
      };

      const { getByLabelText } = render(
        <Step4Review {...defaultProps} draft={draftWithTerms} />
      );

      const submitButton = getByLabelText('Submit application');
      fireEvent.press(submitButton);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Signature Required',
        'Please type your full name to sign the application.'
      );
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    test('validates signature minimum length', () => {
      const draftShortSig = {
        ...mockDraft,
        signature: 'AB',
        agreedToTerms: true,
      };

      const { getByLabelText } = render(
        <Step4Review {...defaultProps} draft={draftShortSig} />
      );

      const submitButton = getByLabelText('Submit application');
      fireEvent.press(submitButton);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Invalid Signature',
        'Please enter your full legal name.'
      );
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    test('validates terms agreement is required', () => {
      const draftWithSig = {
        ...mockDraft,
        signature: 'John Doe',
        agreedToTerms: false,
      };

      const { getByLabelText } = render(
        <Step4Review {...defaultProps} draft={draftWithSig} />
      );

      const submitButton = getByLabelText('Submit application');
      fireEvent.press(submitButton);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Terms Required',
        'Please agree to the terms and conditions to continue.'
      );
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    test('submits when all requirements met', async () => {
      const completeDraft = {
        ...mockDraft,
        signature: 'John Doe',
        agreedToTerms: true,
      };

      const { getByLabelText } = render(
        <Step4Review {...defaultProps} draft={completeDraft} />
      );

      const submitButton = getByLabelText('Submit application');
      fireEvent.press(submitButton);

      // Fast-forward the submission delay
      jest.advanceTimersByTime(1500);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledTimes(1);
      });
    });

    test('disables submit button during submission', () => {
      const completeDraft = {
        ...mockDraft,
        signature: 'John Doe',
        agreedToTerms: true,
      };

      const { getByLabelText, getByText } = render(
        <Step4Review {...defaultProps} draft={completeDraft} />
      );

      const submitButton = getByLabelText('Submit application');
      fireEvent.press(submitButton);

      // Button should be disabled and show "Submitting..."
      expect(submitButton.props.accessibilityState.disabled).toBe(true);
      expect(getByText('Submitting...')).toBeTruthy();

      // After submission completes
      jest.advanceTimersByTime(1500);

      // Button should be enabled again
      expect(submitButton.props.accessibilityState.disabled).toBe(false);
    });

    test('submit button disabled when requirements not met', () => {
      const { getByLabelText } = render(<Step4Review {...defaultProps} />);

      const submitButton = getByLabelText('Submit application');
      expect(submitButton.props.accessibilityState.disabled).toBe(true);
    });
  });

  describe('Navigation', () => {
    test('calls onBack when Back button pressed', () => {
      const { getByLabelText } = render(<Step4Review {...defaultProps} />);

      fireEvent.press(getByLabelText('Go back'));
      expect(mockOnBack).toHaveBeenCalledTimes(1);
    });

    test('disables Back button during submission', () => {
      const completeDraft = {
        ...mockDraft,
        signature: 'John Doe',
        agreedToTerms: true,
      };

      const { getByLabelText } = render(
        <Step4Review {...defaultProps} draft={completeDraft} />
      );

      // Start submission
      const submitButton = getByLabelText('Submit application');
      fireEvent.press(submitButton);

      // Try to press back during submission
      const backButton = getByLabelText('Go back');
      fireEvent.press(backButton);

      // Back should not be called during submission
      expect(mockOnBack).not.toHaveBeenCalled();
    });
  });

  describe('Phone Formatting', () => {
    test.each([
      ['5551234567', '(555) 123-4567'],
      ['1234567890', '(123) 456-7890'],
      ['9999999999', '(999) 999-9999'],
      ['555-123-4567', '555-123-4567'], // Invalid format, returns as-is
      ['', undefined], // Empty phone
    ])('formats phone %s as %s', (input, expected) => {
      const draftWithPhone = {
        ...mockDraft,
        phone: input,
      };

      const { queryByText } = render(
        <Step4Review {...defaultProps} draft={draftWithPhone} />
      );

      if (expected) {
        expect(queryByText(expected)).toBeTruthy();
      }
    });
  });

  describe('Accessibility', () => {
    test('all interactive elements have accessibility labels', () => {
      const { getByLabelText } = render(<Step4Review {...defaultProps} />);

      expect(getByLabelText('Edit Contact Information')).toBeTruthy();
      expect(getByLabelText('Edit Eligibility')).toBeTruthy();
      expect(getByLabelText('Edit Documents')).toBeTruthy();
      expect(getByLabelText('Signature input')).toBeTruthy();
      expect(getByLabelText('Terms and conditions checkbox')).toBeTruthy();
      expect(getByLabelText('Go back')).toBeTruthy();
      expect(getByLabelText('Submit application')).toBeTruthy();
    });
  });

  describe('Timestamp Display', () => {
    test('shows current timestamp in signature preview', () => {
      const mockDate = new Date('2024-01-15T14:30:00');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      const draftWithSignature = {
        ...mockDraft,
        signature: 'John Doe',
      };

      const { getByText } = render(
        <Step4Review {...defaultProps} draft={draftWithSignature} />
      );

      expect(getByText(/January 15, 2024/)).toBeTruthy();

      jest.spyOn(global, 'Date').mockRestore();
    });
  });
});