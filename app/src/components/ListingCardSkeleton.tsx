import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet, Dimensions } from "react-native";

const { width: screenWidth } = Dimensions.get("window");
const CARD_WIDTH = screenWidth * 0.85;
const CARD_HEIGHT = 200;

// A single pulsing gray placeholder that looks like a ListingCard while
// real data is loading. The shimmer animation gives users a visual cue
// that content is on its way, making the app feel faster than a spinner.
function ListingCardSkeleton() {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    // Loop: fade between 0.3 and 0.7 opacity to create a shimmer pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [opacity]);

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      <View style={styles.imagePlaceholder} />
      <View style={styles.content}>
        <View style={styles.titleBar} />
        <View style={styles.subtitleBar} />
        <View style={styles.row}>
          <View style={styles.chip} />
          <View style={styles.chip} />
        </View>
        <View style={styles.badge} />
      </View>
    </Animated.View>
  );
}

export default ListingCardSkeleton;

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: "#1F2937",
    borderRadius: 12,
    marginHorizontal: 10,
    flexDirection: "row",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#374151",
  },
  imagePlaceholder: {
    width: CARD_WIDTH * 0.35,
    height: "100%",
    backgroundColor: "#374151",
  },
  content: {
    flex: 1,
    padding: 12,
    justifyContent: "space-between",
  },
  titleBar: {
    height: 14,
    width: "70%",
    backgroundColor: "#374151",
    borderRadius: 4,
  },
  subtitleBar: {
    height: 10,
    width: "45%",
    backgroundColor: "#374151",
    borderRadius: 4,
    marginTop: 6,
  },
  row: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  chip: {
    height: 20,
    width: 60,
    backgroundColor: "#374151",
    borderRadius: 4,
  },
  badge: {
    height: 22,
    width: 100,
    backgroundColor: "#374151",
    borderRadius: 4,
    marginTop: 8,
  },
});
