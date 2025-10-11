import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import AvailabilityUpdater from "../AvailabilityUpdater";

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
}));

jest.mock("../../../components/ui/Toast", () => ({
  useToast: () => ({ showToast: jest.fn() }),
}));

const invalidate = jest.fn();
jest.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: invalidate }),
}));

const updateListing = jest.fn().mockResolvedValue({ success: true });
jest.mock("../../../services/listing.service", () => ({
  updateListing: (...args: any[]) => (updateListing as any)(...args),
}));

jest.mock("../../../hooks/useProviderListings", () => ({
  useProviderListings: () => ({
    data: [
      { id: "1", title: "A", address: "x", totalBeds: 5, availableBeds: 2, lastUpdated: "2025-01-01T00:00:00Z" },
      { id: "2", title: "B", address: "y", totalBeds: 3, availableBeds: 1, lastUpdated: "2025-01-01T00:00:00Z" },
    ],
    isLoading: false,
  }),
}));

describe("AvailabilityUpdater", () => {
  it("saves changed availability for modified listings", async () => {
    const { getAllByA11yLabel, getByText } = render(<AvailabilityUpdater />);

    // Find all InlineCounter components by their increment buttons label
    const incrementButtons = getAllByA11yLabel("Increment value");
    // Increment first listing once
    fireEvent.press(incrementButtons[0]);

    fireEvent.press(getByText("Save All"));

    await waitFor(() => {
      // First listing had 2 -> incremented to 3
      expect(updateListing).toHaveBeenCalledWith("1", { availableBeds: 3 });
      expect(invalidate).toHaveBeenCalled();
    });
  });
});

