import React from "react";
import { render } from "@testing-library/react-native";
import ListingCard from "./ListingCard";
import { useSavedListings } from "../hooks/useSavedItems";
import type { Listing } from "../types/listing";

jest.mock("../hooks/useSavedItems", () => ({
  useSavedListings: jest.fn(),
}));
jest.mock("../lib/supabase", () => ({
  supabase: {
    auth: {
      getUser: jest
        .fn()
        .mockResolvedValue({ data: { user: { id: "test-user" } } }),
    },
  },
}));

const baseListing: Listing = {
  id: "listing-123",
  provider_id: "provider-123",
  title: "Test Shelter",
  description: "A safe place to stay",
  address: "123 Test St",
  city: "Honolulu",
  state: "HI",
  zip_code: "96813",
  lat: 21.3099,
  lng: -157.8581,
  housing_type: "shelter",
  unit_beds: { single_occupancy: 10 },
  ada_beds: 0,
  gender_rooming: "co_ed",
  amenities: { basic: ["laundry"], kitchen: ["full_kitchen"] },
  accessibility: {},
  eligibility: {
    documentation: ["government_id"],
    family_status: [],
    veterans: false,
  },
  cost: { monthly: 500, free: false },
  availability: {
    beds_today: 5,
    beds_week: 10,
    waitlist: 0,
    last_updated_at: null,
  },
  verified: true,
  images: ["https://example.com/photo1.jpg"],
  dv_sensitive: false,
  is_active: true,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  provider: {
    id: "provider-123",
    full_name: "Test Provider",
    username: "testprovider",
    is_verified: true,
  },
};

describe("ListingCard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useSavedListings as jest.Mock).mockReturnValue({
      isSaved: jest.fn().mockReturnValue(false),
      toggleSave: jest.fn(),
      isSaving: false,
    });
  });

  test("renders listing title and provider name", () => {
    const { getByText } = render(<ListingCard listing={baseListing} />);
    expect(getByText("Test Shelter")).toBeTruthy();
    expect(getByText("Test Provider")).toBeTruthy();
  });

  test("shows beds available when beds_today > 0", () => {
    const { getByText } = render(<ListingCard listing={baseListing} />);
    expect(getByText("5 beds available")).toBeTruthy();
  });

  test("shows waitlist open when beds_today is 0 and waitlist > 0", () => {
    const listing: Listing = {
      ...baseListing,
      availability: {
        beds_today: 0,
        beds_week: 0,
        waitlist: 5,
        last_updated_at: null,
      },
    };
    const { getByText } = render(<ListingCard listing={listing} />);
    expect(getByText("Waitlist open")).toBeTruthy();
  });

  test("shows currently full when no beds and no waitlist", () => {
    const listing: Listing = {
      ...baseListing,
      availability: {
        beds_today: 0,
        beds_week: 0,
        waitlist: 0,
        last_updated_at: null,
      },
    };
    const { getByText } = render(<ListingCard listing={listing} />);
    expect(getByText("Currently full")).toBeTruthy();
  });

  test("shows monthly cost when listing is not free", () => {
    const { getByText } = render(<ListingCard listing={baseListing} />);
    expect(getByText("$500/mo")).toBeTruthy();
  });

  test("shows Free when cost.free is true", () => {
    const listing: Listing = {
      ...baseListing,
      cost: { monthly: 0, free: true },
    };
    const { getByText } = render(<ListingCard listing={listing} />);
    expect(getByText("Free")).toBeTruthy();
  });

  test("shows Contact when no cost info is provided", () => {
    const listing: Listing = { ...baseListing, cost: undefined };
    const { getByText } = render(<ListingCard listing={listing} />);
    expect(getByText("Contact")).toBeTruthy();
  });

  test("shows Families chip when family_status includes family", () => {
    const listing: Listing = {
      ...baseListing,
      eligibility: { family_status: ["family"] },
    };
    const { getByText } = render(<ListingCard listing={listing} />);
    expect(getByText("Families")).toBeTruthy();
  });

  test("shows Veterans chip when eligibility.veterans is true", () => {
    const listing: Listing = {
      ...baseListing,
      eligibility: { veterans: true },
    };
    const { getByText } = render(<ListingCard listing={listing} />);
    expect(getByText("Veterans")).toBeTruthy();
  });

  test("shows Accessible chip when mobility accessibility is present", () => {
    const listing: Listing = {
      ...baseListing,
      accessibility: { mobility: ["wheelchair_ramp"] },
    };
    const { getByText } = render(<ListingCard listing={listing} />);
    expect(getByText("Accessible")).toBeTruthy();
  });

  test("shows Pets OK chip when rules allow pets", () => {
    const listing: Listing = {
      ...baseListing,
      rules: { pets: "allowed" },
    };
    const { getByText } = render(<ListingCard listing={listing} />);
    expect(getByText("Pets OK")).toBeTruthy();
  });

  test("shows verified badge when listing is verified", () => {
    const { getByTestId } = render(<ListingCard listing={baseListing} />);
    expect(getByTestId("verified-badge")).toBeTruthy();
  });

  test("renders without crashing when optional fields are absent", () => {
    const listing: Listing = {
      ...baseListing,
      images: [],
      amenities: undefined,
      accessibility: undefined,
      eligibility: undefined,
      rules: undefined,
      cost: undefined,
      provider: undefined,
    };
    const { getByText } = render(<ListingCard listing={listing} />);
    expect(getByText("Test Shelter")).toBeTruthy();
  });

  test("shows distance in miles when distance is provided", () => {
    const listing: Listing = { ...baseListing, distance: 2.7 };
    const { getByText } = render(<ListingCard listing={listing} />);
    expect(getByText("2.7 mi")).toBeTruthy();
  });
});
