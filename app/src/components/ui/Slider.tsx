import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  Dimensions,
  LayoutChangeEvent,
} from "react-native";
import { theme } from "../../theme";

interface SliderProps {
  min: number;
  max: number;
  values: [number, number];
  onValuesChange: (values: [number, number]) => void;
  step?: number;
  prefix?: string;
  suffix?: string;
  formatValue?: (value: number) => string;
}

export default function Slider({
  min,
  max,
  values,
  onValuesChange,
  step = 1,
  prefix = "",
  suffix = "",
  formatValue = (v) => v.toString(),
}: SliderProps) {
  const [sliderWidth, setSliderWidth] = useState(0);
  const [activeThumb, setActiveThumb] = useState<"min" | "max" | null>(null);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    setSliderWidth(event.nativeEvent.layout.width);
  }, []);

  const valueToPosition = useCallback(
    (value: number) => {
      if (sliderWidth === 0) return 0;
      return ((value - min) / (max - min)) * sliderWidth;
    },
    [min, max, sliderWidth]
  );

  const positionToValue = useCallback(
    (position: number) => {
      const value = (position / sliderWidth) * (max - min) + min;
      return Math.round(value / step) * step;
    },
    [min, max, sliderWidth, step]
  );

  const minThumbPanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => setActiveThumb("min"),
    onPanResponderMove: (_, gestureState) => {
      const newValue = positionToValue(
        Math.max(0, Math.min(valueToPosition(values[0]) + gestureState.dx, sliderWidth))
      );
      const clampedValue = Math.max(min, Math.min(newValue, values[1] - step));
      onValuesChange([clampedValue, values[1]]);
    },
    onPanResponderRelease: () => setActiveThumb(null),
  });

  const maxThumbPanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => setActiveThumb("max"),
    onPanResponderMove: (_, gestureState) => {
      const newValue = positionToValue(
        Math.max(0, Math.min(valueToPosition(values[1]) + gestureState.dx, sliderWidth))
      );
      const clampedValue = Math.max(values[0] + step, Math.min(newValue, max));
      onValuesChange([values[0], clampedValue]);
    },
    onPanResponderRelease: () => setActiveThumb(null),
  });

  const minPos = valueToPosition(values[0]);
  const maxPos = valueToPosition(values[1]);

  return (
    <View style={styles.container}>
      {/* Value Labels */}
      <View style={styles.labels}>
        <Text style={styles.label}>
          {prefix}{formatValue(values[0])}{suffix}
        </Text>
        <Text style={styles.label}>
          {prefix}{formatValue(values[1])}{suffix}
        </Text>
      </View>

      {/* Slider Track */}
      <View style={styles.sliderContainer} onLayout={handleLayout}>
        <View style={styles.track} />
        <View
          style={[
            styles.activeTrack,
            {
              left: minPos,
              width: maxPos - minPos,
            },
          ]}
        />

        {/* Min Thumb */}
        <View
          style={[
            styles.thumb,
            { left: minPos - 10 },
            activeThumb === "min" && styles.thumbActive,
          ]}
          {...minThumbPanResponder.panHandlers}
        />

        {/* Max Thumb */}
        <View
          style={[
            styles.thumb,
            { left: maxPos - 10 },
            activeThumb === "max" && styles.thumbActive,
          ]}
          {...maxThumbPanResponder.panHandlers}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: theme.spacing.md,
  },
  labels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: theme.spacing.md,
  },
  label: {
    fontSize: theme.typography.fontSize.sm,
    color: "#FFFFFF",
    fontWeight: theme.typography.fontWeight.medium,
  },
  sliderContainer: {
    height: 40,
    justifyContent: "center",
  },
  track: {
    height: 4,
    backgroundColor: "#374151",
    borderRadius: 2,
  },
  activeTrack: {
    position: "absolute",
    height: 4,
    backgroundColor: "#D4AF37",
    borderRadius: 2,
  },
  thumb: {
    position: "absolute",
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#D4AF37",
    borderWidth: 2,
    borderColor: "#000000",
    elevation: 3,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  thumbActive: {
    transform: [{ scale: 1.2 }],
    elevation: 5,
  },
});