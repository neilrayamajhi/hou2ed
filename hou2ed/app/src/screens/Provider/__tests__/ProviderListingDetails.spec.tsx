import React from "react";
import { render, waitFor } from "@testing-library/react-native";
import ListingDetails from "../ListingDetails";

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ params: { listingId: "L1" } }),
}));

jest.mock("../../../hooks/useRequireProvider", () => ({ useRequireProvider: () => {} }));

jest.mock("../../../services/listing.service", () => {
  const mockGet = jest.fn().mockResolvedValue({
    id: "L1",
    title: "Test Home",
    address: "123 St",
    totalBeds: 5,
    availableBeds: 3,
    lastUpdated: "2025-01-01T00:00:00Z",
    images: ["https://example.com/a.jpg"],
    price: 500,
    availabilityDays: { "2025-01-01": 2 },
  });
  return {
    getListingById: (...args: any[]) => mockGet(...args),
  };
});

describe("Provider Listing Details", () => {
  it("renders listing info and mini calendar", async () => {
    const { getByText } = render(<ListingDetails />);

    await waitFor(() => {
      expect(getByText("Test Home")).toBeTruthy();
      expect(getByText("123 St")).toBeTruthy();
      expect(getByText("$500/mo")).toBeTruthy();
    });
  });
});
