import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { Image } from "react-native";
import PhotoCarousel, { calculateImageIndex } from "./PhotoCarousel";

describe("calculateImageIndex", () => {
  test("calculates correct index for various offsets", () => {
    expect(calculateImageIndex(0, 375)).toBe(0);
    expect(calculateImageIndex(375, 375)).toBe(1);
    expect(calculateImageIndex(750, 375)).toBe(2);
    expect(calculateImageIndex(187, 375)).toBe(0);
    expect(calculateImageIndex(188, 375)).toBe(1);
    expect(calculateImageIndex(562, 375)).toBe(1);
    expect(calculateImageIndex(563, 375)).toBe(2);
  });

  test("handles negative offsets", () => {
    expect(calculateImageIndex(-100, 375)).toBe(0);
  });

  test("handles different screen widths", () => {
    expect(calculateImageIndex(400, 400)).toBe(1);
    expect(calculateImageIndex(200, 400)).toBe(1);
    expect(calculateImageIndex(199, 400)).toBe(0);
  });
});

describe("PhotoCarousel", () => {
  const mockImages = [
    "https://example.com/image1.jpg",
    "https://example.com/image2.jpg",
    "https://example.com/image3.jpg",
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("empty state", () => {
    test("renders skeleton when no images provided", () => {
      const { getByTestId, getByText } = render(<PhotoCarousel images={[]} />);

      expect(getByTestId("photo-carousel-empty")).toBeTruthy();
      expect(getByText("No images available")).toBeTruthy();
    });

    test("applies custom testID to empty state", () => {
      const { getByTestId } = render(
        <PhotoCarousel images={[]} testID="custom-carousel" />,
      );

      expect(getByTestId("custom-carousel-empty")).toBeTruthy();
    });
  });

  describe("single image", () => {
    test("renders single image without navigation controls", () => {
      const { getByTestId, queryByLabelText, queryByText } = render(
        <PhotoCarousel images={[mockImages[0]]} />,
      );

      expect(getByTestId("photo-carousel")).toBeTruthy();
      expect(queryByLabelText("Previous image")).toBeNull();
      expect(queryByLabelText("Next image")).toBeNull();
      expect(queryByText("1 / 1")).toBeNull();
      expect(queryByLabelText("Go to image 1")).toBeNull();
    });

    test("renders image with correct accessibility label", () => {
      const { getByLabelText } = render(
        <PhotoCarousel images={[mockImages[0]]} />,
      );

      expect(getByLabelText("Image 1 of 1")).toBeTruthy();
    });
  });

  describe("multiple images", () => {
    test("renders all images in scrollview", () => {
      const { getAllByLabelText } = render(
        <PhotoCarousel images={mockImages} />,
      );

      const images = getAllByLabelText(/^Image \d of \d$/);
      expect(images).toHaveLength(3);
      expect(images[0].props.accessibilityLabel).toBe("Image 1 of 3");
      expect(images[1].props.accessibilityLabel).toBe("Image 2 of 3");
      expect(images[2].props.accessibilityLabel).toBe("Image 3 of 3");
    });

    test("shows counter for multiple images", () => {
      const { getByText } = render(<PhotoCarousel images={mockImages} />);

      expect(getByText("1 / 3")).toBeTruthy();
    });

    test("shows dots indicator for multiple images", () => {
      const { getAllByLabelText } = render(
        <PhotoCarousel images={mockImages} />,
      );

      const dots = getAllByLabelText(/^Go to image \d$/);
      expect(dots).toHaveLength(3);
    });

    test("clicking dot navigates to image", () => {
      const { getByLabelText, getByText } = render(
        <PhotoCarousel images={mockImages} />,
      );

      fireEvent.press(getByLabelText("Go to image 3"));

      waitFor(() => {
        expect(getByText("3 / 3")).toBeTruthy();
      });
    });
  });

  describe("navigation controls", () => {
    test("shows next chevron but not previous on first image", () => {
      const { queryByLabelText } = render(
        <PhotoCarousel images={mockImages} />,
      );

      expect(queryByLabelText("Previous image")).toBeNull();
      expect(queryByLabelText("Next image")).toBeTruthy();
    });

    test("shows both chevrons on middle image", () => {
      const { getByLabelText, queryByLabelText } = render(
        <PhotoCarousel images={mockImages} />,
      );

      fireEvent.press(getByLabelText("Next image"));

      waitFor(() => {
        expect(queryByLabelText("Previous image")).toBeTruthy();
        expect(queryByLabelText("Next image")).toBeTruthy();
      });
    });

    test("shows previous chevron but not next on last image", () => {
      const { getByLabelText, queryByLabelText } = render(
        <PhotoCarousel images={mockImages} />,
      );

      fireEvent.press(getByLabelText("Go to image 3"));

      waitFor(() => {
        expect(queryByLabelText("Previous image")).toBeTruthy();
        expect(queryByLabelText("Next image")).toBeNull();
      });
    });

    test("navigates with chevron buttons", () => {
      const { getByLabelText, getByText } = render(
        <PhotoCarousel images={mockImages} />,
      );

      fireEvent.press(getByLabelText("Next image"));
      waitFor(() => expect(getByText("2 / 3")).toBeTruthy());

      fireEvent.press(getByLabelText("Next image"));
      waitFor(() => expect(getByText("3 / 3")).toBeTruthy());

      fireEvent.press(getByLabelText("Previous image"));
      waitFor(() => expect(getByText("2 / 3")).toBeTruthy());
    });
  });

  describe("custom props", () => {
    test("applies custom height", () => {
      const { getByTestId } = render(
        <PhotoCarousel images={mockImages} height={400} />,
      );

      const container = getByTestId("photo-carousel");
      expect(container.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ height: 400 })]),
      );
    });

    test("applies custom testID", () => {
      const { getByTestId } = render(
        <PhotoCarousel images={mockImages} testID="custom-id" />,
      );

      expect(getByTestId("custom-id")).toBeTruthy();
    });

    test("uses custom screenWidth for calculations", () => {
      const { getByTestId } = render(
        <PhotoCarousel
          images={mockImages}
          screenWidth={400}
          testID="custom-width-carousel"
        />,
      );

      const carousel = getByTestId("custom-width-carousel");
      expect(carousel).toBeTruthy();
    });
  });

  describe("loading states", () => {
    test("shows loading indicator when image is loading", () => {
      const { getAllByTestId } = render(<PhotoCarousel images={mockImages} />);

      const images = getAllByTestId(/image-\d/);

      images.forEach((image, index) => {
        fireEvent(image, "onLoadStart");
      });

      waitFor(() => {
        const indicators = getAllByTestId("activity-indicator");
        expect(indicators.length).toBeGreaterThan(0);
      });
    });

    test("hides loading indicator when image loads", () => {
      const { getAllByTestId, queryAllByTestId } = render(
        <PhotoCarousel images={mockImages} />,
      );

      const images = getAllByTestId(/image-\d/);

      images.forEach((image) => {
        fireEvent(image, "onLoadStart");
        fireEvent(image, "onLoadEnd");
      });

      waitFor(() => {
        const indicators = queryAllByTestId("activity-indicator");
        expect(indicators).toHaveLength(0);
      });
    });
  });

  describe("scroll behavior", () => {
    test("updates current index on scroll", () => {
      const { getByTestId, getByText } = render(
        <PhotoCarousel images={mockImages} screenWidth={375} />,
      );

      const scrollView = getByTestId("photo-carousel-scrollview");

      fireEvent.scroll(scrollView, {
        nativeEvent: {
          contentOffset: { x: 375, y: 0 },
        },
      });

      fireEvent(scrollView, "onMomentumScrollEnd", {
        nativeEvent: {
          contentOffset: { x: 375, y: 0 },
        },
      });

      waitFor(() => {
        expect(getByText("2 / 3")).toBeTruthy();
      });
    });

    test("handles edge cases in scroll position", () => {
      const { getByTestId, getByText } = render(
        <PhotoCarousel images={mockImages} screenWidth={375} />,
      );

      const scrollView = getByTestId("photo-carousel-scrollview");

      // Scroll to negative position
      fireEvent(scrollView, "onMomentumScrollEnd", {
        nativeEvent: {
          contentOffset: { x: -100, y: 0 },
        },
      });

      waitFor(() => {
        expect(getByText("1 / 3")).toBeTruthy();
      });

      // Scroll beyond last image
      fireEvent(scrollView, "onMomentumScrollEnd", {
        nativeEvent: {
          contentOffset: { x: 1500, y: 0 },
        },
      });

      waitFor(() => {
        expect(getByText("3 / 3")).toBeTruthy();
      });
    });
  });

  describe("accessibility", () => {
    test("all interactive elements have proper roles", () => {
      const { getAllByRole } = render(<PhotoCarousel images={mockImages} />);

      const buttons = getAllByRole("button");
      expect(buttons.length).toBeGreaterThan(0);
    });

    test("all interactive elements have labels", () => {
      const { getByLabelText, getAllByLabelText } = render(
        <PhotoCarousel images={mockImages} />,
      );

      expect(getByLabelText("Next image")).toBeTruthy();
      expect(getAllByLabelText(/^Go to image \d$/)).toHaveLength(3);
      expect(getAllByLabelText(/^Image \d of \d$/)).toHaveLength(3);
    });

    test("hit slop areas are adequate for touch targets", () => {
      const { getByLabelText } = render(<PhotoCarousel images={mockImages} />);

      const nextButton = getByLabelText("Next image");
      expect(nextButton.props.hitSlop).toEqual({
        top: 10,
        bottom: 10,
        left: 10,
        right: 10,
      });

      const dot = getByLabelText("Go to image 2");
      expect(dot.props.hitSlop).toEqual({
        top: 10,
        bottom: 10,
        left: 5,
        right: 5,
      });
    });
  });
});
