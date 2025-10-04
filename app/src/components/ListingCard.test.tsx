import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ListingCard } from './ListingCard';
import { useNavigation } from '@react-navigation/native';
import { useSavedListings } from '../hooks/useSavedItems';
import type { Listing } from '../types/listing';

// Mock the navigation hook
jest.mock('@react-navigation/native');

// Mock the saved listings hook
jest.mock('../hooks/useSavedItems', () => ({
  useSavedListings: jest.fn(),
}));

// Mock the supabase client
jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'test-user' } } }),
    },
  },
}));

describe('ListingCard', () => {
  const mockNavigate = jest.fn();
  const mockToggleSave = jest.fn();
  const mockIsSaved = jest.fn();

  const mockListing: Listing = {
    id: 'listing-123',
    name: 'Test Shelter',
    description: 'A safe place to stay',
    housingType: 'emergency',
    unitBeds: 'single',
    availability: 'available',
    monthlyRent: 500,
    securityDeposit: 250,
    district: 'Honolulu',
    island: 'Oahu',
    address: '123 Test St',
    coordinates: { lat: 21.3099, lng: -157.8581 },
    bedsAvailableToday: 5,
    bedsAvailableWeek: 10,
    waitlistDays: 0,
    petsAllowed: true,
    accessibilityFeatures: ['wheelchair_access', 'elevator'],
    amenities: ['laundry', 'kitchen'],
    requirements: ['id', 'income_verification'],
    contactPhone: '808-555-0123',
    contactEmail: 'test@shelter.org',
    photos: ['https://example.com/photo1.jpg'],
    domesticViolenceFocus: false,
    provider: {
      id: 'provider-123',
      fullName: 'Test Provider',
      organizationName: 'Test Organization',
      isVerified: true,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue({
      navigate: mockNavigate,
    });
    (useSavedListings as jest.Mock).mockReturnValue({
      isSaved: mockIsSaved,
      toggleSave: mockToggleSave,
      isSaving: false,
    });
  });

  test('renders listing information correctly', () => {
    mockIsSaved.mockReturnValue(false);

    const { getByText, getByTestId } = render(
      <ListingCard listing={mockListing} />
    );

    // Check basic information is displayed
    expect(getByText('Test Shelter')).toBeTruthy();
    expect(getByText('Honolulu, Oahu')).toBeTruthy();
    expect(getByText('$500/mo')).toBeTruthy();
    expect(getByText('5 beds available today')).toBeTruthy();

    // Check housing type badge
    expect(getByText('Emergency')).toBeTruthy();
  });

  test('shows correct availability status', () => {
    const availableListing = { ...mockListing, bedsAvailableToday: 5 };
    const limitedListing = { ...mockListing, bedsAvailableToday: 1 };
    const fullListing = { ...mockListing, bedsAvailableToday: 0, waitlistDays: 30 };

    const { rerender, getByText } = render(
      <ListingCard listing={availableListing} />
    );
    expect(getByText('5 beds available today')).toBeTruthy();

    rerender(<ListingCard listing={limitedListing} />);
    expect(getByText('1 bed available today')).toBeTruthy();

    rerender(<ListingCard listing={fullListing} />);
    expect(getByText('Waitlist: ~30 days')).toBeTruthy();
  });

  test('displays amenities and features correctly', () => {
    mockIsSaved.mockReturnValue(false);

    const { getByText } = render(
      <ListingCard listing={mockListing} />
    );

    // Check amenities
    expect(getByText('Laundry')).toBeTruthy();
    expect(getByText('Kitchen')).toBeTruthy();

    // Check accessibility features
    expect(getByText('♿')).toBeTruthy(); // Wheelchair accessible icon

    // Check pet friendly
    expect(getByText('🐕')).toBeTruthy(); // Pet friendly icon
  });

  test('handles save/unsave toggle', async () => {
    mockIsSaved.mockReturnValue(false);
    mockToggleSave.mockResolvedValue(undefined);

    const { getByTestId, rerender } = render(
      <ListingCard listing={mockListing} />
    );

    const saveButton = getByTestId('save-button');
    fireEvent.press(saveButton);

    await waitFor(() => {
      expect(mockToggleSave).toHaveBeenCalledWith('listing-123', undefined);
    });

    // Simulate saved state
    mockIsSaved.mockReturnValue(true);
    rerender(<ListingCard listing={mockListing} />);

    // The heart icon should now be filled (saved state)
    const savedButton = getByTestId('save-button');
    expect(savedButton).toBeTruthy();
  });

  test('navigates to listing details on press', () => {
    mockIsSaved.mockReturnValue(false);

    const { getByTestId } = render(
      <ListingCard listing={mockListing} />
    );

    const card = getByTestId('listing-card');
    fireEvent.press(card);

    expect(mockNavigate).toHaveBeenCalledWith('ListingDetails', {
      listing: mockListing,
    });
  });

  test('shows DV protection for domestic violence focused listings', () => {
    const dvListing = {
      ...mockListing,
      domesticViolenceFocus: true,
      address: undefined, // Should be hidden
      coordinates: undefined, // Should be hidden
    };

    const { getByText, queryByText } = render(
      <ListingCard listing={dvListing} />
    );

    // Should show general area only
    expect(getByText('Honolulu area, Oahu')).toBeTruthy();

    // Should show DV indicator
    expect(getByText('🛡️')).toBeTruthy();

    // Should not show exact address
    expect(queryByText('123 Test St')).toBeNull();
  });

  test('shows verified badge for verified providers', () => {
    mockIsSaved.mockReturnValue(false);

    const { getByText } = render(
      <ListingCard listing={mockListing} />
    );

    // Check for verified badge
    expect(getByText('✓')).toBeTruthy();
    expect(getByText('Test Organization')).toBeTruthy();
  });

  test('handles missing optional data gracefully', () => {
    const minimalListing = {
      ...mockListing,
      photos: undefined,
      amenities: undefined,
      accessibilityFeatures: undefined,
      requirements: undefined,
      petsAllowed: false,
    };

    const { queryByText, queryByTestId } = render(
      <ListingCard listing={minimalListing} />
    );

    // Should still render without crashing
    expect(queryByText('Test Shelter')).toBeTruthy();

    // Should not show pet icon
    expect(queryByText('🐕')).toBeNull();

    // Should not show wheelchair icon
    expect(queryByText('♿')).toBeNull();
  });

  test('disables save button while saving', async () => {
    mockIsSaved.mockReturnValue(false);

    // Mock the saving state
    (useSavedListings as jest.Mock).mockReturnValue({
      isSaved: mockIsSaved,
      toggleSave: mockToggleSave,
      isSaving: true, // Currently saving
    });

    const { getByTestId } = render(
      <ListingCard listing={mockListing} />
    );

    const saveButton = getByTestId('save-button');

    // Button should be disabled during save
    fireEvent.press(saveButton);

    // Should not call toggleSave when disabled
    expect(mockToggleSave).not.toHaveBeenCalled();
  });

  test('formats rent and deposit correctly', () => {
    const listingWithHighRent = {
      ...mockListing,
      monthlyRent: 1500,
      securityDeposit: 3000,
    };

    const listingWithNoRent = {
      ...mockListing,
      monthlyRent: 0,
      securityDeposit: 0,
    };

    const { getByText, rerender } = render(
      <ListingCard listing={listingWithHighRent} />
    );

    expect(getByText('$1,500/mo')).toBeTruthy();
    expect(getByText('$3,000 deposit')).toBeTruthy();

    rerender(<ListingCard listing={listingWithNoRent} />);
    expect(getByText('Free')).toBeTruthy();
  });
});

describe('ListingCard Accessibility', () => {
  const mockListing: Listing = {
    id: 'listing-123',
    name: 'Accessible Shelter',
    housingType: 'transitional',
    unitBeds: 'family',
    availability: 'available',
    monthlyRent: 800,
    district: 'Kapolei',
    island: 'Oahu',
    bedsAvailableToday: 2,
    bedsAvailableWeek: 4,
    accessibilityFeatures: ['wheelchair_access', 'elevator', 'accessible_bathroom'],
  } as Listing;

  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue({
      navigate: jest.fn(),
    });
    (useSavedListings as jest.Mock).mockReturnValue({
      isSaved: jest.fn().mockReturnValue(false),
      toggleSave: jest.fn(),
      isSaving: false,
    });
  });

  test('has proper accessibility labels', () => {
    const { getByLabelText, getByTestId } = render(
      <ListingCard listing={mockListing} />
    );

    // Check for accessibility labels
    expect(getByLabelText('Accessible Shelter housing listing')).toBeTruthy();
    expect(getByLabelText('Save listing')).toBeTruthy();
    expect(getByTestId('listing-card')).toBeTruthy();
  });

  test('announces availability status to screen readers', () => {
    const { getByLabelText } = render(
      <ListingCard listing={mockListing} />
    );

    // Should have accessibility hint for availability
    expect(getByLabelText(/2 beds available today/i)).toBeTruthy();
  });
});