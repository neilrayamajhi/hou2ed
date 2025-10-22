/**
 * Tests for OfflineBanner component
 */

import React from "react";
import { render } from "@testing-library/react-native";
import OfflineBanner from "./OfflineBanner";

describe("OfflineBanner", () => {
  describe("rendering", () => {
    test("should render when visible is true", () => {
      const { getByText } = render(<OfflineBanner visible={true} />);

      expect(getByText("Offline. Changes will sync when connected.")).toBeTruthy();
    });

    test("should not render when visible is false", () => {
      const { queryByText } = render(<OfflineBanner visible={false} />);

      expect(queryByText("Offline. Changes will sync when connected.")).toBeNull();
    });

    test("should show offline icon", () => {
      const { UNSAFE_getByType } = render(<OfflineBanner visible={true} />);

      const icon = UNSAFE_getByType("Ionicons" as any);
      expect(icon.props.name).toBe("cloud-offline-outline");
      expect(icon.props.size).toBe(18);
    });
  });

  describe("styling", () => {
    test("should have proper container styling", () => {
      const { getByText } = render(<OfflineBanner visible={true} />);

      const container = getByText("Offline. Changes will sync when connected.").parent;
      expect(container?.props.style).toMatchObject(
        expect.objectContaining({
          flexDirection: "row",
          alignItems: "center",
        })
      );
    });
  });
});