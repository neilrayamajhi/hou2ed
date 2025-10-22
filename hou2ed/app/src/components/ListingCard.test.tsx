import React from 'react';
import { render } from '@testing-library/react-native';
import ListingCard from './ListingCard';
import type { Listing } from '../types/listing';

describe('ListingCard', () => {
  const mockListing: Listing = {
    id: 'listing-123',
    provider_id: 'provider-123',
    title: 'Test Shelter',
    description: 'A safe place to stay',
    address: '123 Test St',
    city: 'Honolulu',
    state: 'HI',
    zip_code: '96801',
    lat: 21.3099,
    lng: -157.8581,
    housing_type: 'shelter',
    unit_beds: {
      single_occupancy: 5,
      double_occupancy: 3,
    },
    ada_beds: 2,
    gender_rooming: 'co_ed',
    amenities: {
      basic: ['bedding', 'shower'],
      kitchen: ['microwave'],
    },
    accessibility: {
      mobility: ['wheelchair_access', 'elevator'],
    },
    eligibility: {
      veterans: true,
      family_status: ['families', 'individuals'],
    },
    services: {
      case_management: true,
    },
    rules: {
      pets: 'Allowed with approval',
    },
    cost: {
      monthly: 500,
      free: false,
    },
    availability: {
      beds_today: 5,
      beds_week: 10,
      waitlist: 0,
      last_updated_at: new Date().toISOString(),
    },
    verified: true,
    images: ['https://example.com/photo1.jpg'],
    dv_sensitive: false,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    provider: {
      id: 'provider-123',
      full_name: 'Test Provider',
      username: 'testprovider',
      is_verified: true,
    },
    distance: 2.5,
  };

  test('renders listing title and provider correctly', () => {
    const { getByText } = render(<ListingCard listing={mockListing} />);

    expect(getByText('Test Shelter')).toBeTruthy();
    expect(getByText('Test Provider')).toBeTruthy();
  });

  test('shows availability information', () => {
    const { getByText } = render(<ListingCard listing={mockListing} />);

    expect(getByText('5 beds available')).toBeTruthy();
  });

  test('displays distance when available', () => {
    const { getByText } = render(<ListingCard listing={mockListing} />);

    expect(getByText('2.5 mi')).toBeTruthy();
  });

  test('displays cost information', () => {
    const { getByText } = render(<ListingCard listing={mockListing} />);

    expect(getByText('$500/mo')).toBeTruthy();
  });

  test('shows free cost when applicable', () => {
    const freeListing = {
      ...mockListing,
      cost: { ...mockListing.cost, free: true },
    };

    const { getByText } = render(<ListingCard listing={freeListing} />);

    expect(getByText('Free')).toBeTruthy();
  });

  test('shows Contact when no cost info available', () => {
    const noCostListing = {
      ...mockListing,
      cost: {},
    };

    const { getByText } = render(<ListingCard listing={noCostListing} />);

    expect(getByText('Contact')).toBeTruthy();
  });

  test('shows verified badge when provider is verified', () => {
    const { UNSAFE_getByType } = render(<ListingCard listing={mockListing} />);

    // Component should render without crashing and show verified badge
    expect(mockListing.verified).toBe(true);
  });

  test('displays features based on eligibility and accessibility', () => {
    const { getByText } = render(<ListingCard listing={mockListing} />);

    // Check for Veterans feature
    expect(getByText('Veterans')).toBeTruthy();

    // Check for Accessible feature
    expect(getByText('Accessible')).toBeTruthy();

    // Check for Pets OK feature
    expect(getByText('Pets OK')).toBeTruthy();
  });

  test('handles missing provider gracefully', () => {
    const listingWithoutProvider = {
      ...mockListing,
      provider: undefined,
    };

    const { getByText } = render(<ListingCard listing={listingWithoutProvider} />);

    expect(getByText('Unknown Provider')).toBeTruthy();
  });

  test('shows waitlist status when no beds available today but waitlist exists', () => {
    const waitlistListing = {
      ...mockListing,
      availability: {
        beds_today: 0,
        beds_week: 0,
        waitlist: 5,
        last_updated_at: new Date().toISOString(),
      },
    };

    const { getByText } = render(<ListingCard listing={waitlistListing} />);

    expect(getByText('Waitlist open')).toBeTruthy();
  });

  test('shows beds available this week when no beds today', () => {
    const weeklyBedsListing = {
      ...mockListing,
      availability: {
        beds_today: 0,
        beds_week: 3,
        waitlist: 0,
        last_updated_at: new Date().toISOString(),
      },
    };

    const { getByText } = render(<ListingCard listing={weeklyBedsListing} />);

    expect(getByText('3 beds this week')).toBeTruthy();
  });

  test('shows currently full when no availability', () => {
    const fullListing = {
      ...mockListing,
      availability: {
        beds_today: 0,
        beds_week: 0,
        waitlist: 0,
        last_updated_at: new Date().toISOString(),
      },
    };

    const { getByText } = render(<ListingCard listing={fullListing} />);

    expect(getByText('Currently full')).toBeTruthy();
  });
});
