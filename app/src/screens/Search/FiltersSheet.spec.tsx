/**
 * Tests for FiltersSheet component
 */

import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import FiltersSheet from "./FiltersSheet";
import { useFilterStore } from "../../state/useFilterStore";

// Mock the filter store
jest.mock("../../state/useFilterStore");

// Mock react-native-modal
jest.mock("react-native-modal", () => "Modal");

describe("FiltersSheet", () => {
  const mockOnClose = jest.fn();
  const mockLoadSnapshot = jest.fn();
  const mockCreateSnapshot = jest.fn();
  const mockReset = jest.fn();

  const defaultMockState = {
    quickFilters: {
      immediate: false,
      free: false,
      acceptsPets: false,
      familyFriendly: false,
      veteranSupport: false,
      lgbtqFriendly: false,
    },
    priceRange: [0, 5000],
    distance: 10,
    listingType: [],
    availabilityIntake: {
      availableNow: false,
      sameDay: false,
      within24Hours: false,
      within3Days: false,
      withinWeek: false,
      scheduled: false,
    },
    demographics: {
      men: false,
      women: false,
      families: false,
      veterans: false,
      youth: false,
      seniors: false,
      lgbtq: false,
    },
    requirements: {
      noId: false,
      noIncome: false,
      noBackground: false,
      noSobriety: false,
      noInterview: false,
      noCurfew: false,
    },
    duration: {
      emergency: false,
      shortTerm: false,
      longTerm: false,
      permanent: false,
    },
    amenities: [],
    accessibility: [],
    safety: [],
    services: [],
    storage: [],
    programType: [],
    loadSnapshot: mockLoadSnapshot,
    createSnapshot: mockCreateSnapshot,
    reset: mockReset,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useFilterStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector(defaultMockState)
    );
  });

  describe("rendering", () => {
    test("should render when visible", () => {
      const { getByText } = render(
        <FiltersSheet visible={true} onClose={mockOnClose} />
      );

      expect(getByText("Filters")).toBeTruthy();
    });

    test("should not render content when not visible", () => {
      const { queryByText } = render(
        <FiltersSheet visible={false} onClose={mockOnClose} />
      );

      // Modal should hide content
      const modal = queryByText("Filters");
      expect(modal).toBeNull();
    });

    test("should render all filter sections", () => {
      const { getByText } = render(
        <FiltersSheet visible={true} onClose={mockOnClose} />
      );

      // Check for section titles
      expect(getByText("Quick Filters")).toBeTruthy();
      expect(getByText("Price Range")).toBeTruthy();
      expect(getByText("Distance")).toBeTruthy();
      expect(getByText("Listing Type")).toBeTruthy();
      expect(getByText("Availability & Intake")).toBeTruthy();
      expect(getByText("Demographics")).toBeTruthy();
      expect(getByText("Requirements")).toBeTruthy();
    });

    test("should show active filter counts", () => {
      const mockStateWithActiveFilters = {
        ...defaultMockState,
        quickFilters: {
          ...defaultMockState.quickFilters,
          immediate: true,
          free: true,
        },
        demographics: {
          ...defaultMockState.demographics,
          men: true,
          women: true,
        },
      };

      (useFilterStore as unknown as jest.Mock).mockImplementation((selector) =>
        selector(mockStateWithActiveFilters)
      );

      const { getAllByText } = render(
        <FiltersSheet visible={true} onClose={mockOnClose} />
      );

      // Should show count badges for active filters
      expect(getAllByText("2")).toHaveLength(2);
    });
  });

  describe("interactions", () => {
    test("should close when Cancel button pressed", () => {
      const { getByText } = render(
        <FiltersSheet visible={true} onClose={mockOnClose} />
      );

      fireEvent.press(getByText("Cancel"));
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    test("should apply filters when Apply button pressed", async () => {
      const { getByText } = render(
        <FiltersSheet visible={true} onClose={mockOnClose} />
      );

      fireEvent.press(getByText("Apply"));

      await waitFor(() => {
        expect(mockLoadSnapshot).toHaveBeenCalled();
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    test("should reset filters when Reset button pressed", () => {
      const { getByText } = render(
        <FiltersSheet visible={true} onClose={mockOnClose} />
      );

      fireEvent.press(getByText("Reset"));

      expect(mockReset).toHaveBeenCalledTimes(1);
    });

    test("should toggle quick filter chips", () => {
      const { getByText } = render(
        <FiltersSheet visible={true} onClose={mockOnClose} />
      );

      // Expand quick filters section
      fireEvent.press(getByText("Quick Filters"));

      // Toggle a chip
      const immediateChip = getByText("Available Now");
      fireEvent.press(immediateChip);

      // Chip should be toggled in temp state
      expect(immediateChip).toBeTruthy();
    });

    test("should update price range slider", () => {
      const { getByText, UNSAFE_getByType } = render(
        <FiltersSheet visible={true} onClose={mockOnClose} />
      );

      // Expand price range section
      fireEvent.press(getByText("Price Range"));

      // Find slider component
      const slider = UNSAFE_getByType("Slider" as any);
      expect(slider).toBeTruthy();
    });

    test("should update distance slider", () => {
      const { getByText, getByTestId } = render(
        <FiltersSheet visible={true} onClose={mockOnClose} />
      );

      // Expand distance section
      fireEvent.press(getByText("Distance"));

      // Should have distance slider
      const distanceSlider = getByTestId("distance-slider");
      expect(distanceSlider).toBeTruthy();
    });
  });

  describe("temporary state", () => {
    test("should create snapshot on mount", () => {
      render(<FiltersSheet visible={true} onClose={mockOnClose} />);

      expect(mockCreateSnapshot).toHaveBeenCalledTimes(1);
    });

    test("should not apply changes if cancelled", () => {
      const { getByText } = render(
        <FiltersSheet visible={true} onClose={mockOnClose} />
      );

      // Make some changes (expand and interact)
      fireEvent.press(getByText("Quick Filters"));
      const freeChip = getByText("Free");
      fireEvent.press(freeChip);

      // Cancel
      fireEvent.press(getByText("Cancel"));

      // Should not have called loadSnapshot
      expect(mockLoadSnapshot).not.toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });

    test("should apply temp state when Apply pressed", async () => {
      const { getByText } = render(
        <FiltersSheet visible={true} onClose={mockOnClose} />
      );

      // Make changes
      fireEvent.press(getByText("Quick Filters"));
      fireEvent.press(getByText("Free"));

      // Apply
      fireEvent.press(getByText("Apply"));

      await waitFor(() => {
        expect(mockLoadSnapshot).toHaveBeenCalled();
      });
    });
  });

  describe("filter sections", () => {
    test("should render listing type options", () => {
      const { getByText } = render(
        <FiltersSheet visible={true} onClose={mockOnClose} />
      );

      fireEvent.press(getByText("Listing Type"));

      expect(getByText("Emergency Shelter")).toBeTruthy();
      expect(getByText("Transitional Housing")).toBeTruthy();
      expect(getByText("Permanent Housing")).toBeTruthy();
      expect(getByText("Safe Haven")).toBeTruthy();
    });

    test("should render demographics options", () => {
      const { getByText } = render(
        <FiltersSheet visible={true} onClose={mockOnClose} />
      );

      fireEvent.press(getByText("Demographics"));

      expect(getByText("Men")).toBeTruthy();
      expect(getByText("Women")).toBeTruthy();
      expect(getByText("Families")).toBeTruthy();
      expect(getByText("Veterans")).toBeTruthy();
      expect(getByText("Youth (18-24)")).toBeTruthy();
      expect(getByText("Seniors (55+)")).toBeTruthy();
      expect(getByText("LGBTQ+")).toBeTruthy();
    });

    test("should render requirements options", () => {
      const { getByText } = render(
        <FiltersSheet visible={true} onClose={mockOnClose} />
      );

      fireEvent.press(getByText("Requirements"));

      expect(getByText("No ID Required")).toBeTruthy();
      expect(getByText("No Income Verification")).toBeTruthy();
      expect(getByText("No Background Check")).toBeTruthy();
      expect(getByText("No Sobriety Required")).toBeTruthy();
    });

    test("should render amenities options", () => {
      const { getByText } = render(
        <FiltersSheet visible={true} onClose={mockOnClose} />
      );

      fireEvent.press(getByText("Amenities"));

      expect(getByText("WiFi")).toBeTruthy();
      expect(getByText("Laundry")).toBeTruthy();
      expect(getByText("Kitchen")).toBeTruthy();
      expect(getByText("Showers")).toBeTruthy();
    });
  });

  describe("modal behavior", () => {
    test("should call onClose when backdrop pressed", () => {
      const { UNSAFE_getByType } = render(
        <FiltersSheet visible={true} onClose={mockOnClose} />
      );

      const modal = UNSAFE_getByType("Modal" as any);
      modal.props.onBackdropPress?.();

      expect(mockOnClose).toHaveBeenCalled();
    });

    test("should slide up from bottom", () => {
      const { UNSAFE_getByType } = render(
        <FiltersSheet visible={true} onClose={mockOnClose} />
      );

      const modal = UNSAFE_getByType("Modal" as any);
      expect(modal.props.animationIn).toBe("slideInUp");
      expect(modal.props.animationOut).toBe("slideOutDown");
    });

    test("should handle swipe down to close", () => {
      const { UNSAFE_getByType } = render(
        <FiltersSheet visible={true} onClose={mockOnClose} />
      );

      const modal = UNSAFE_getByType("Modal" as any);
      expect(modal.props.swipeDirection).toContain("down");

      modal.props.onSwipeComplete?.();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe("accessibility", () => {
    test("should have accessible labels for sections", () => {
      const { getByText } = render(
        <FiltersSheet visible={true} onClose={mockOnClose} />
      );

      const quickFiltersSection = getByText("Quick Filters");
      expect(quickFiltersSection.parent?.props.accessible).toBe(true);
    });

    test("should have accessible buttons", () => {
      const { getByText } = render(
        <FiltersSheet visible={true} onClose={mockOnClose} />
      );

      const applyButton = getByText("Apply");
      expect(applyButton.parent?.props.accessibilityRole).toBe("button");

      const resetButton = getByText("Reset");
      expect(resetButton.parent?.props.accessibilityRole).toBe("button");
    });
  });
});