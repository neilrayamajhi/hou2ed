import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import EditListing from "../EditListing";
import * as svc from "../../../services/listing.service";

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ params: { listingId: "L1", listingData: { title: "X", address: "Y", totalBeds: 5, availableBeds: 1 } } }),
}));

jest.mock("../../../components/ui/Toast", () => ({ useToast: () => ({ showToast: jest.fn() }) }));

jest.mock("@tanstack/react-query", () => ({
  useMutation: (opts: any) => ({ mutate: opts.mutationFn, isPending: false }),
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}));

jest.mock("../../../hooks/useRequireProvider", () => ({ useRequireProvider: () => {} }));

jest.mock("../../../services/listing.service", () => ({
  getListingById: jest.fn().mockResolvedValue({ id: "L1", images: [], availabilityDays: {} }),
  updateListing: jest.fn().mockResolvedValue({ success: true }),
}));
jest.mock("../../../services/storage.service", () => {
  const mockUpload = jest.fn().mockResolvedValue({ success: true, url: "https://x/y.jpg" });
  return {
    uploadListingImage: (...args: any[]) => mockUpload(...args),
  };
});

describe("EditListing calendar", () => {
  it("saves per-day availability changes", async () => {
    const { getAllByLabelText, getByText } = render(<EditListing />);

    // Increment a day using CalendarEditor buttons
    // There will be multiple increment/decrement buttons; press the first increment
    const incButtons = getAllByLabelText("Increment value");
    fireEvent.press(incButtons[0]);

    fireEvent.press(getByText("Save Changes"));

    await waitFor(() => {
      expect(svc.updateListing).toHaveBeenCalled();
      const payload = (svc.updateListing as any).mock.calls[0][1];
      expect(payload.availabilityDays).toBeDefined();
    });
  });
});
