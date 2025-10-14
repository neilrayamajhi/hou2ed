import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import ListingWizard from "../ListingWizard";
import * as svc from "../../../services/listing.service";

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
}));

jest.mock("../../../components/ui/Toast", () => ({
  useToast: () => ({ showToast: jest.fn() }),
}));

jest.mock("@tanstack/react-query", () => {
  const mockInvalidate = jest.fn();
  return {
    useMutation: (opts: any) => ({ mutate: opts.mutationFn, isPending: false }),
    useQueryClient: () => ({ invalidateQueries: mockInvalidate }),
  };
});

jest.mock("../../../services/listing.service", () => ({
  createListing: jest.fn().mockResolvedValue({ success: true, listingId: "L1" }),
  getCurrentProviderId: jest.fn().mockResolvedValue("prov-1"),
}));

describe("ListingWizard", () => {
  it("publishes a basic listing after stepping through", async () => {
    const { getByText, getByPlaceholderText } = render(<ListingWizard />);

    // Basics
    fireEvent.changeText(getByPlaceholderText("e.g. Haven House"), " My Place ");
    fireEvent.changeText(getByPlaceholderText("e.g. 123 Main St, City"), " 1 Road ");
    fireEvent.changeText(getByPlaceholderText("e.g. 12"), "5");

    fireEvent.press(getByText("Next")); // to Location
    fireEvent.press(getByText("Next")); // to Photos
    fireEvent.press(getByText("Next")); // to Amenities/Rules
    fireEvent.press(getByText("Next")); // to Pricing
    fireEvent.press(getByText("Next")); // to Availability
    fireEvent.press(getByText("Next")); // to Review

    fireEvent.press(getByText("Publish"));

    await waitFor(() => {
      expect(svc.createListing).toHaveBeenCalledWith("prov-1", {
        title: "My Place",
        address: "1 Road",
        totalBeds: 5,
        availableBeds: undefined,
        price: undefined,
      });
    });
  });
});
