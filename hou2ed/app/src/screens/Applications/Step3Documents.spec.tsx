import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import Step3Documents from './Step3Documents';
import type { ApplicationDraft } from './ApplyWizard';
import { DOCUMENT_TYPES, FILE_UPLOAD } from '../../constants/application';

// Mock the expo modules
jest.mock('expo-document-picker');
jest.mock('expo-image-picker');

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('Step3Documents', () => {
  const mockDraft: ApplicationDraft = {
    listingId: 'test-123',
    fullName: 'Test User',
    phone: '5551234567',
    email: 'test@example.com',
    eligibilityTags: ['veterans'],
    documents: [],
  };

  const mockOnUpdate = jest.fn();
  const mockOnNext = jest.fn();
  const mockOnBack = jest.fn();

  const defaultProps = {
    draft: mockDraft,
    onUpdate: mockOnUpdate,
    onNext: mockOnNext,
    onBack: mockOnBack,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Document Picking', () => {
    test('picks document from file picker', async () => {
      const mockDocumentResult = {
        canceled: false,
        assets: [{
          uri: 'file://test-document.pdf',
          name: 'test-document.pdf',
          size: 1000000, // 1MB
        }],
      };

      (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue(mockDocumentResult);

      const { getByText } = render(<Step3Documents {...defaultProps} />);

      // Find and tap the ID document upload button
      const uploadButton = getByText(/tap to upload government id/i);
      fireEvent.press(uploadButton);

      // Select "Files" option from dialog (mocked)
      (Alert.alert as jest.Mock).mock.calls[0][2][2].onPress();

      await waitFor(() => {
        expect(DocumentPicker.getDocumentAsync).toHaveBeenCalledWith({
          type: ['application/pdf', 'image/*'],
          copyToCacheDirectory: true,
        });
      });

      // Check that document was added to state
      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalledWith({
          documents: expect.arrayContaining([
            expect.objectContaining({
              type: 'id',
              uri: 'file://test-document.pdf',
              name: 'test-document.pdf',
              size: 1000000,
            }),
          ]),
        });
      });
    });

    test('picks image from image picker', async () => {
      const mockImageResult = {
        canceled: false,
        assets: [{
          uri: 'file://test-image.jpg',
        }],
      };

      (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue(mockImageResult);

      const { getByText } = render(<Step3Documents {...defaultProps} />);

      // Find and tap the insurance document upload button
      const uploadButton = getByText(/tap to upload insurance card/i);
      fireEvent.press(uploadButton);

      // Select "Photo Library" option from dialog (mocked)
      (Alert.alert as jest.Mock).mock.calls[0][2][1].onPress();

      await waitFor(() => {
        expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: false,
          quality: 0.8,
        });
      });

      // Check that document was added to state
      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalledWith({
          documents: expect.arrayContaining([
            expect.objectContaining({
              type: 'insurance',
              uri: 'file://test-image.jpg',
            }),
          ]),
        });
      });
    });
  });

  describe('File Validation', () => {
    test('rejects files larger than 10MB', async () => {
      const mockLargeDocument = {
        canceled: false,
        assets: [{
          uri: 'file://large-document.pdf',
          name: 'large-document.pdf',
          size: FILE_UPLOAD.MAX_SIZE_BYTES + 1, // Over 10MB
        }],
      };

      (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue(mockLargeDocument);

      const { getByText } = render(<Step3Documents {...defaultProps} />);

      const uploadButton = getByText(/tap to upload government id/i);
      fireEvent.press(uploadButton);

      // Select "Files" option
      (Alert.alert as jest.Mock).mock.calls[0][2][2].onPress();

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'File Too Large',
          FILE_UPLOAD.ERROR_MESSAGES.SIZE
        );
      });

      // Document should not be added
      expect(mockOnUpdate).not.toHaveBeenCalledWith(
        expect.objectContaining({
          documents: expect.arrayContaining([
            expect.objectContaining({
              uri: 'file://large-document.pdf',
            }),
          ]),
        })
      );
    });
  });

  describe('Document Management', () => {
    test('removes uploaded document', () => {
      const draftWithDocument = {
        ...mockDraft,
        documents: [{
          type: 'id',
          uri: 'file://test.pdf',
          name: 'test.pdf',
          size: 1000000,
          uploadProgress: 100,
        }],
      };

      const { getByLabelText } = render(
        <Step3Documents {...defaultProps} draft={draftWithDocument} />
      );

      // Find and tap remove button
      const removeButton = getByLabelText('Remove document');
      fireEvent.press(removeButton);

      // Check document was removed
      expect(mockOnUpdate).toHaveBeenCalledWith({
        documents: [],
      });
    });

    test('prompts to replace existing document', async () => {
      const draftWithDocument = {
        ...mockDraft,
        documents: [{
          type: 'id',
          uri: 'file://existing.pdf',
          name: 'existing.pdf',
          size: 1000000,
          uploadProgress: 100,
        }],
      };

      const { getByText } = render(
        <Step3Documents {...defaultProps} draft={draftWithDocument} />
      );

      // Try to upload another ID document
      const uploadButton = getByText(/tap to upload government id/i);
      fireEvent.press(uploadButton);

      // Check that replacement dialog appears
      expect(Alert.alert).toHaveBeenCalledWith(
        'Document Already Uploaded',
        'Would you like to replace the existing document?',
        expect.any(Array)
      );
    });
  });

  describe('Upload Progress', () => {
    test('shows progress bar during upload', async () => {
      const mockDocumentResult = {
        canceled: false,
        assets: [{
          uri: 'file://test.pdf',
          name: 'test.pdf',
          size: 1000000,
        }],
      };

      (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue(mockDocumentResult);

      const { getByText, queryByText } = render(<Step3Documents {...defaultProps} />);

      const uploadButton = getByText(/tap to upload government id/i);
      fireEvent.press(uploadButton);

      // Select "Files" option
      (Alert.alert as jest.Mock).mock.calls[0][2][2].onPress();

      // Wait for document to be added
      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalled();
      });

      // Advance timers to show progress
      jest.advanceTimersByTime(500);

      // Check that progress is displayed
      await waitFor(() => {
        const progressText = queryByText(/%/);
        expect(progressText).toBeTruthy();
      });
    });

    test('completes upload progress to 100%', async () => {
      const mockDocumentResult = {
        canceled: false,
        assets: [{
          uri: 'file://test.pdf',
          name: 'test.pdf',
          size: 1000000,
        }],
      };

      (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue(mockDocumentResult);

      const { getByText } = render(<Step3Documents {...defaultProps} />);

      const uploadButton = getByText(/tap to upload government id/i);
      fireEvent.press(uploadButton);

      // Select "Files" option
      (Alert.alert as jest.Mock).mock.calls[0][2][2].onPress();

      // Run all timers to complete upload
      jest.runAllTimers();

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenLastCalledWith({
          documents: expect.arrayContaining([
            expect.objectContaining({
              type: 'id',
              uploadProgress: 100,
            }),
          ]),
        });
      });
    });
  });

  describe('Navigation', () => {
    test('enables Next button when all required documents uploaded', () => {
      const draftWithAllDocs = {
        ...mockDraft,
        documents: DOCUMENT_TYPES.filter(dt => dt.required).map(dt => ({
          type: dt.id,
          uri: `file://${dt.id}.pdf`,
          name: `${dt.id}.pdf`,
          size: 1000000,
          uploadProgress: 100,
        })),
      };

      const { getByLabelText } = render(
        <Step3Documents {...defaultProps} draft={draftWithAllDocs} />
      );

      const nextButton = getByLabelText('Continue to next step');
      expect(nextButton.props.accessibilityState.disabled).toBe(false);

      fireEvent.press(nextButton);
      expect(mockOnNext).toHaveBeenCalledTimes(1);
    });

    test('disables Next button when required documents missing', () => {
      const { getByLabelText } = render(<Step3Documents {...defaultProps} />);

      const nextButton = getByLabelText('Continue to next step');
      expect(nextButton.props.accessibilityState.disabled).toBe(true);

      fireEvent.press(nextButton);
      expect(mockOnNext).not.toHaveBeenCalled();
    });

    test('calls onBack when Back button pressed', () => {
      const { getByLabelText } = render(<Step3Documents {...defaultProps} />);

      fireEvent.press(getByLabelText('Go back'));
      expect(mockOnBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    test('all interactive elements have accessibility labels', () => {
      const { getByLabelText } = render(<Step3Documents {...defaultProps} />);

      expect(getByLabelText('Go back')).toBeTruthy();
      expect(getByLabelText('Continue to next step')).toBeTruthy();
    });

    test('upload buttons are accessible', () => {
      const { getByText } = render(<Step3Documents {...defaultProps} />);

      DOCUMENT_TYPES.forEach(docType => {
        const uploadButton = getByText(
          new RegExp(`tap to upload ${docType.label.toLowerCase()}`, 'i')
        );
        expect(uploadButton).toBeTruthy();
      });
    });
  });

  describe('File Size Formatting', () => {
    test.each([
      [500, '500 B'],
      [1024, '1.0 KB'],
      [1536, '1.5 KB'],
      [1048576, '1.0 MB'],
      [2621440, '2.5 MB'],
    ])('formats %i bytes as %s', (bytes, expected) => {
      const draftWithDocument = {
        ...mockDraft,
        documents: [{
          type: 'id',
          uri: 'file://test.pdf',
          name: 'test.pdf',
          size: bytes,
          uploadProgress: 100,
        }],
      };

      const { getByText } = render(
        <Step3Documents {...defaultProps} draft={draftWithDocument} />
      );

      expect(getByText(expected)).toBeTruthy();
    });
  });
});