/**
 * Tests for EmptyState component
 */

import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import EmptyState from "./EmptyState";

describe("EmptyState", () => {
  describe("rendering", () => {
    test("should render with default message", () => {
      const { getByText } = render(<EmptyState />);

      expect(getByText("No matches found")).toBeTruthy();
      expect(getByText("Try adjusting your filters or expanding your search area")).toBeTruthy();
    });

    test("should render with custom message and subMessage", () => {
      const { getByText } = render(
        <EmptyState
          message="Custom message"
          subMessage="Custom sub message"
        />
      );

      expect(getByText("Custom message")).toBeTruthy();
      expect(getByText("Custom sub message")).toBeTruthy();
    });

    test("should show Clear Filters button by default when onClearFilters provided", () => {
      const mockClear = jest.fn();
      const { getByText } = render(<EmptyState onClearFilters={mockClear} />);

      expect(getByText("Clear Filters")).toBeTruthy();
    });

    test("should not show Clear Filters button when showClearButton is false", () => {
      const mockClear = jest.fn();
      const { queryByText } = render(
        <EmptyState onClearFilters={mockClear} showClearButton={false} />
      );

      expect(queryByText("Clear Filters")).toBeNull();
    });

    test("should not show Clear Filters button when onClearFilters not provided", () => {
      const { queryByText } = render(<EmptyState />);

      expect(queryByText("Clear Filters")).toBeNull();
    });
  });

  describe("interactions", () => {
    test("should call onClearFilters when button pressed", () => {
      const mockClear = jest.fn();
      const { getByText } = render(<EmptyState onClearFilters={mockClear} />);

      fireEvent.press(getByText("Clear Filters"));
      expect(mockClear).toHaveBeenCalledTimes(1);
    });
  });

  describe("icon", () => {
    test("should render search icon", () => {
      const { UNSAFE_getByType } = render(<EmptyState />);

      const icon = UNSAFE_getByType("Ionicons" as any);
      expect(icon.props.name).toBe("search-outline");
      expect(icon.props.size).toBe(64);
    });
  });

  describe("styling", () => {
    test("should center content", () => {
      const { getByText } = render(<EmptyState />);

      const container = getByText("No matches found").parent;
      expect(container?.props.style).toMatchObject(
        expect.objectContaining({
          justifyContent: "center",
          alignItems: "center",
        })
      );
    });
  });
});