/**
 * Tests for FilterAccordion component
 */

import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import FilterAccordion from "./FilterAccordion";
import { Text } from "react-native";

describe("FilterAccordion", () => {
  const mockChildren = <Text>Test Content</Text>;

  describe("rendering", () => {
    test("should render with title", () => {
      const { getByText } = render(
        <FilterAccordion title="Test Title">{mockChildren}</FilterAccordion>
      );

      expect(getByText("Test Title")).toBeTruthy();
    });

    test("should not show children when collapsed by default", () => {
      const { queryByText } = render(
        <FilterAccordion title="Test Title">{mockChildren}</FilterAccordion>
      );

      expect(queryByText("Test Content")).toBeNull();
    });

    test("should show children when defaultExpanded is true", () => {
      const { getByText } = render(
        <FilterAccordion title="Test Title" defaultExpanded>
          {mockChildren}
        </FilterAccordion>
      );

      expect(getByText("Test Content")).toBeTruthy();
    });

    test("should show active count badge when provided", () => {
      const { getByText } = render(
        <FilterAccordion title="Test Title" activeCount={5}>
          {mockChildren}
        </FilterAccordion>
      );

      expect(getByText("5")).toBeTruthy();
    });

    test("should not show count badge when activeCount is 0", () => {
      const { queryByText } = render(
        <FilterAccordion title="Test Title" activeCount={0}>
          {mockChildren}
        </FilterAccordion>
      );

      // Title should exist but not "0"
      expect(queryByText("Test Title")).toBeTruthy();
      expect(queryByText("0")).toBeNull();
    });
  });

  describe("interactions", () => {
    test("should toggle expansion on header press", () => {
      const { getByText, queryByText } = render(
        <FilterAccordion title="Test Title">{mockChildren}</FilterAccordion>
      );

      // Initially collapsed
      expect(queryByText("Test Content")).toBeNull();

      // Press to expand
      fireEvent.press(getByText("Test Title"));
      expect(getByText("Test Content")).toBeTruthy();

      // Press to collapse
      fireEvent.press(getByText("Test Title"));
      expect(queryByText("Test Content")).toBeNull();
    });

    test("should maintain state through re-renders", () => {
      const { getByText, rerender } = render(
        <FilterAccordion title="Test Title">{mockChildren}</FilterAccordion>
      );

      // Expand
      fireEvent.press(getByText("Test Title"));
      expect(getByText("Test Content")).toBeTruthy();

      // Re-render with new prop
      rerender(
        <FilterAccordion title="Test Title" activeCount={3}>
          {mockChildren}
        </FilterAccordion>
      );

      // Should still be expanded
      expect(getByText("Test Content")).toBeTruthy();
      expect(getByText("3")).toBeTruthy();
    });
  });

  describe("chevron icon", () => {
    test("should show chevron-down when collapsed", () => {
      const { UNSAFE_getByType } = render(
        <FilterAccordion title="Test Title">{mockChildren}</FilterAccordion>
      );

      const icon = UNSAFE_getByType("Ionicons" as any);
      expect(icon.props.name).toBe("chevron-down");
    });

    test("should show chevron-up when expanded", () => {
      const { getByText, UNSAFE_getByType } = render(
        <FilterAccordion title="Test Title">{mockChildren}</FilterAccordion>
      );

      fireEvent.press(getByText("Test Title"));

      const icon = UNSAFE_getByType("Ionicons" as any);
      expect(icon.props.name).toBe("chevron-up");
    });
  });

  describe("accessibility", () => {
    test("should have correct opacity on press", () => {
      const { getByText } = render(
        <FilterAccordion title="Test Title">{mockChildren}</FilterAccordion>
      );

      const header = getByText("Test Title").parent?.parent;
      expect(header?.props.activeOpacity).toBe(0.7);
    });
  });
});