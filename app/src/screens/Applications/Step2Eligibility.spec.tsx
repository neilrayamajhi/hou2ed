import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import Step2Eligibility from './Step2Eligibility';
import type { ApplicationDraft } from './ApplyWizard';
import { ELIGIBILITY_TAG_GROUPS } from '../../constants/application';

describe('Step2Eligibility', () => {
  const mockDraft: ApplicationDraft = {
    listingId: 'test-123',
    fullName: 'Test User',
    phone: '5551234567',
    email: 'test@example.com',
    eligibilityTags: [],
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
  });

  describe('Tag Selection', () => {
    test('toggles tag selection on press', () => {
      const { getByLabelText } = render(
        <Step2Eligibility {...defaultProps} />
      );

      const veteransTag = getByLabelText('Veterans');

      // Initially not selected
      expect(veteransTag.props.accessibilityState.checked).toBe(false);

      // Select the tag
      fireEvent.press(veteransTag);

      // Should update draft with selected tag
      expect(mockOnUpdate).toHaveBeenCalledWith({
        eligibilityTags: expect.arrayContaining(['veterans'])
      });
    });

    test('allows multiple tags to be selected', async () => {
      const { getByLabelText } = render(
        <Step2Eligibility {...defaultProps} />
      );

      // Select multiple tags
      fireEvent.press(getByLabelText('Veterans'));
      fireEvent.press(getByLabelText('Families'));
      fireEvent.press(getByLabelText('18-25 years'));

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenLastCalledWith({
          eligibilityTags: expect.arrayContaining(['veterans', 'families', 'age18-25'])
        });
      });
    });

    test('removes tag when pressed again', async () => {
      const draftWithTags = {
        ...mockDraft,
        eligibilityTags: ['veterans', 'families'],
      };

      const { getByLabelText } = render(
        <Step2Eligibility {...defaultProps} draft={draftWithTags} />
      );

      // Deselect a tag
      fireEvent.press(getByLabelText('Veterans'));

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalledWith({
          eligibilityTags: expect.arrayContaining(['families'])
        });
        expect(mockOnUpdate).toHaveBeenCalledWith({
          eligibilityTags: expect.not.arrayContaining(['veterans'])
        });
      });
    });
  });

  describe('Clear All', () => {
    test('clears all selections when Clear all pressed', async () => {
      const draftWithTags = {
        ...mockDraft,
        eligibilityTags: ['veterans', 'families', 'age18-25'],
      };

      const { getByLabelText, getByText } = render(
        <Step2Eligibility {...defaultProps} draft={draftWithTags} />
      );

      // Should show count
      expect(getByText('3 tags selected')).toBeTruthy();

      // Clear all selections
      fireEvent.press(getByLabelText('Clear all selections'));

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalledWith({
          eligibilityTags: []
        });
      });
    });

    test('shows correct singular/plural text for selection count', () => {
      const { getByText, rerender } = render(
        <Step2Eligibility {...defaultProps} />
      );

      // No selections - no count shown
      expect(() => getByText(/tag.*selected/)).toThrow();

      // One selection
      rerender(
        <Step2Eligibility
          {...defaultProps}
          draft={{ ...mockDraft, eligibilityTags: ['veterans'] }}
        />
      );
      expect(getByText('1 tag selected')).toBeTruthy();

      // Multiple selections
      rerender(
        <Step2Eligibility
          {...defaultProps}
          draft={{ ...mockDraft, eligibilityTags: ['veterans', 'families'] }}
        />
      );
      expect(getByText('2 tags selected')).toBeTruthy();
    });
  });

  describe('Navigation', () => {
    test('calls onNext when Next button pressed', () => {
      const { getByLabelText } = render(
        <Step2Eligibility {...defaultProps} />
      );

      fireEvent.press(getByLabelText('Continue to next step'));
      expect(mockOnNext).toHaveBeenCalledTimes(1);
    });

    test('calls onBack when Back button pressed', () => {
      const { getByLabelText } = render(
        <Step2Eligibility {...defaultProps} />
      );

      fireEvent.press(getByLabelText('Go back'));
      expect(mockOnBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('Draft Persistence', () => {
    test('restores selections from draft on mount', () => {
      const draftWithTags = {
        ...mockDraft,
        eligibilityTags: ['veterans', 'families'],
      };

      const { getByLabelText } = render(
        <Step2Eligibility {...defaultProps} draft={draftWithTags} />
      );

      // Check that pre-selected tags are marked as selected
      const veteransTag = getByLabelText('Veterans');
      const familiesTag = getByLabelText('Families');
      const lgbtqTag = getByLabelText('LGBTQ+');

      expect(veteransTag.props.accessibilityState.checked).toBe(true);
      expect(familiesTag.props.accessibilityState.checked).toBe(true);
      expect(lgbtqTag.props.accessibilityState.checked).toBe(false);
    });

    test('updates draft whenever tags change', async () => {
      const { getByLabelText } = render(
        <Step2Eligibility {...defaultProps} />
      );

      // Make several selections
      fireEvent.press(getByLabelText('Veterans'));
      fireEvent.press(getByLabelText('Wheelchair Access'));

      // Each selection should trigger an update
      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalled();
      });
    });
  });

  describe('Accessibility', () => {
    test('all tags have proper accessibility attributes', () => {
      const { getByLabelText } = render(
        <Step2Eligibility {...defaultProps} />
      );

      // Check main eligibility tags
      ELIGIBILITY_TAG_GROUPS.forEach(group => {
        group.tags.forEach(tag => {
          const element = getByLabelText(tag.label);
          expect(element.props.accessibilityRole).toBe('checkbox');
          expect(element.props.accessibilityState).toBeDefined();
        });
      });
    });

    test('buttons have proper accessibility labels', () => {
      const { getByLabelText } = render(
        <Step2Eligibility {...defaultProps} />
      );

      expect(getByLabelText('Go back')).toBeTruthy();
      expect(getByLabelText('Continue to next step')).toBeTruthy();
      expect(getByLabelText('Clear all selections')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    test('handles empty draft gracefully', () => {
      const emptyDraft: ApplicationDraft = {
        listingId: '',
        fullName: '',
        phone: '',
        email: '',
      };

      const { getByLabelText } = render(
        <Step2Eligibility {...defaultProps} draft={emptyDraft} />
      );

      // Should render without errors
      expect(getByLabelText('Veterans')).toBeTruthy();
    });

    test('handles rapid tag toggling', async () => {
      const { getByLabelText } = render(
        <Step2Eligibility {...defaultProps} />
      );

      const tag = getByLabelText('Veterans');

      // Rapidly toggle the same tag
      fireEvent.press(tag);
      fireEvent.press(tag);
      fireEvent.press(tag);
      fireEvent.press(tag);

      // Should handle rapid toggling without errors
      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalled();
      });
    });

    test.each([
      ['age18-25', '18-25 years'],
      ['veterans', 'Veterans'],
      ['wheelchair', 'Wheelchair Access'],
      ['families', 'Families'],
    ])('correctly toggles %s tag with label %s', (id, label) => {
      const { getByLabelText } = render(
        <Step2Eligibility {...defaultProps} />
      );

      const tag = getByLabelText(label);

      fireEvent.press(tag);

      expect(mockOnUpdate).toHaveBeenCalledWith({
        eligibilityTags: expect.arrayContaining([id])
      });
    });
  });
});