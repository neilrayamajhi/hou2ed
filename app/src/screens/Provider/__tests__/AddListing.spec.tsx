import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import AddListing from "../AddListing";

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

jest.mock("../../../services/listing.service", () => {
  const mockCreate = jest.fn().mockResolvedValue({ success: true, listingId: "1" });
  const mockGetProv = jest.fn().mockResolvedValue("prov-1");
  return {
    createListing: (...args: any[]) => mockCreate(...args),
    getCurrentProviderId: () => mockGetProv(),
  };
});

describe("AddListing", () => {
  it("calls createListing with parsed numbers and invalidates cache", async () => {
    const { getByLabelText, getByText } = render(<AddListing />);

    fireEvent.changeText(getByLabelText("Property name input"), " My Home ");
    fireEvent.changeText(getByLabelText("Address input"), " 1 Road ");
    fireEvent.changeText(getByLabelText("Total beds input"), "10");
    fireEvent.changeText(getByLabelText("Available beds input"), "3");
    fireEvent.changeText(getByLabelText("Price input"), "500");

    fireEvent.press(getByText("Save Listing"));

    await waitFor(() => {
      expect(createListing).toHaveBeenCalledWith("prov-1", {
        title: "My Home",
        address: "1 Road",
        totalBeds: 10,
        availableBeds: 3,
        price: 500,
      });
      expect(invalidate).toHaveBeenCalled();
    });
  });
});
