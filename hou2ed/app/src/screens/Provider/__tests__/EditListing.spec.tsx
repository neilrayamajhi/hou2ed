import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import EditListing from "../EditListing";
import * as svc from "../../../services/listing.service";

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ params: { listingId: "1", listingData: { title: "Old", address: "A", totalBeds: 5, availableBeds: 2 } } }),
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
  updateListing: jest.fn().mockResolvedValue({ success: true }),
  deleteListing: jest.fn().mockResolvedValue({ success: true }),
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
      expect(svc.updateListing).toHaveBeenCalledWith("1", {
        title: "New Title",
        address: "Road",
        totalBeds: 7,
        availableBeds: 3,
      });
      // invalidateQueries is mocked; not asserting here to keep test focused
    });
  });
});
