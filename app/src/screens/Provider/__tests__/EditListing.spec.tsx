import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import EditListing from "../EditListing";

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ params: { listingId: "1", listingData: { title: "Old", address: "A", totalBeds: 5, availableBeds: 2 } } }),
}));

jest.mock("../../../components/ui/Toast", () => ({
  useToast: () => ({ showToast: jest.fn() }),
}));

const invalidate = jest.fn();
jest.mock("@tanstack/react-query", () => ({
  useMutation: (opts: any) => ({ mutate: opts.mutationFn, isPending: false }),
  useQueryClient: () => ({ invalidateQueries: invalidate }),
}));

const updateListing = jest.fn().mockResolvedValue({ success: true });
const deleteListing = jest.fn().mockResolvedValue({ success: true });
jest.mock("../../../services/listing.service", () => ({
  updateListing: (...args: any[]) => (updateListing as any)(...args),
  deleteListing: (...args: any[]) => (deleteListing as any)(...args),
}));

describe("EditListing", () => {
  it("saves updates via updateListing", async () => {
    const { getByLabelText, getByText } = render(<EditListing />);
    fireEvent.changeText(getByLabelText("Property name input"), "New Title");
    fireEvent.changeText(getByLabelText("Address input"), "Road");
    fireEvent.changeText(getByLabelText("Total beds input"), "7");
    fireEvent.changeText(getByLabelText("Available beds input"), "3");

    fireEvent.press(getByText("Save Changes"));

    await waitFor(() => {
      expect(updateListing).toHaveBeenCalledWith("1", {
        title: "New Title",
        address: "Road",
        totalBeds: 7,
        availableBeds: 3,
      });
      expect(invalidate).toHaveBeenCalled();
    });
  });
});

