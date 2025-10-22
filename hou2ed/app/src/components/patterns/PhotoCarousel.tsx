import React, { useState, useRef, useCallback } from "react";
import {
  View,
  ScrollView,
  Image,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
  Text,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme/tokens";

const { width: DEFAULT_SCREEN_WIDTH } = Dimensions.get("window");

export function calculateImageIndex(
  offsetX: number,
  screenWidth: number,
): number {
  return Math.round(offsetX / screenWidth);
}

interface PhotoCarouselProps {
  images: string[];
  height?: number;
  testID?: string;
  screenWidth?: number;
}

export default function PhotoCarousel({
  images = [],
  height = 300,
  testID = "photo-carousel",
  screenWidth = DEFAULT_SCREEN_WIDTH,
}: PhotoCarouselProps) {
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loadingStates, setLoadingStates] = useState<Record<number, boolean>>(
    {},
  );

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      const newIndex = calculateImageIndex(offsetX, screenWidth);
      if (
        newIndex !== currentIndex &&
        newIndex >= 0 &&
        newIndex < images.length
      ) {
        setCurrentIndex(newIndex);
      }
    },
    [currentIndex, images.length, screenWidth],
  );

  const goToImage = useCallback(
    (index: number) => {
      if (index >= 0 && index < images.length) {
        scrollViewRef.current?.scrollTo({
          x: index * screenWidth,
          animated: true,
        });
        setCurrentIndex(index);
      }
    },
    [images.length, screenWidth],
  );

  const handlePrevious = useCallback(() => {
    goToImage(currentIndex - 1);
  }, [currentIndex, goToImage]);

  const handleNext = useCallback(() => {
    goToImage(currentIndex + 1);
  }, [currentIndex, goToImage]);

  const handleImageLoadStart = useCallback((index: number) => {
    setLoadingStates((prev) => ({ ...prev, [index]: true }));
  }, []);

  const handleImageLoadEnd = useCallback((index: number) => {
    setLoadingStates((prev) => ({ ...prev, [index]: false }));
  }, []);

  // Empty state with skeleton
  if (images.length === 0) {
    return (
      <View style={[styles.container, { height }]} testID={`${testID}-empty`}>
        <View style={[styles.skeleton, { height }]}>
          <Ionicons name="image-outline" size={60} color={colors.gray[500]} />
          <Text style={styles.skeletonText}>No images available</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { height }]} testID={testID}>
      {/* Image ScrollView */}
      <ScrollView
        ref={scrollViewRef}
        testID={`${testID}-scrollview`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={[styles.scrollView, { height }]}
      >
        {images.map((imageUri, index) => (
          <View
            key={index}
            style={[styles.imageContainer, { width: screenWidth, height }]}
          >
            {loadingStates[index] && (
              <ActivityIndicator
                style={styles.loader}
                size="large"
                color={colors.gold}
              />
            )}
            <Image
              source={{ uri: imageUri }}
              style={[styles.image, { width: screenWidth, height }]}
              resizeMode="cover"
              onLoadStart={() => handleImageLoadStart(index)}
              onLoadEnd={() => handleImageLoadEnd(index)}
              accessibilityLabel={`Image ${index + 1} of ${images.length}`}
            />
          </View>
        ))}
      </ScrollView>

      {/* Left Chevron */}
      {currentIndex > 0 && (
        <TouchableOpacity
          style={[styles.chevron, styles.chevronLeft]}
          onPress={handlePrevious}
          accessibilityRole="button"
          accessibilityLabel="Previous image"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <View style={styles.chevronBackground}>
            <Ionicons name="chevron-back" size={24} color={colors.gold} />
          </View>
        </TouchableOpacity>
      )}

      {/* Right Chevron */}
      {currentIndex < images.length - 1 && (
        <TouchableOpacity
          style={[styles.chevron, styles.chevronRight]}
          onPress={handleNext}
          accessibilityRole="button"
          accessibilityLabel="Next image"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <View style={styles.chevronBackground}>
            <Ionicons name="chevron-forward" size={24} color={colors.gold} />
          </View>
        </TouchableOpacity>
      )}

      {/* Dots Indicator */}
      {images.length > 1 && (
        <View style={styles.dotsContainer}>
          {images.map((_, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => goToImage(index)}
              accessibilityRole="button"
              accessibilityLabel={`Go to image ${index + 1}`}
              hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}
            >
              <View
                style={[styles.dot, currentIndex === index && styles.activeDot]}
              />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Image Counter */}
      {images.length > 1 && (
        <View style={styles.counterContainer}>
          <Text style={styles.counterText}>
            {currentIndex + 1} / {images.length}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    backgroundColor: colors.black,
  },
  scrollView: {
    backgroundColor: colors.black,
  },
  imageContainer: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.black,
  },
  image: {
    backgroundColor: colors.darkGray,
  },
  loader: {
    position: "absolute",
    zIndex: 1,
  },
  skeleton: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.darkGray,
    borderWidth: 1,
    borderColor: colors.borderGray,
  },
  skeletonText: {
    marginTop: 10,
    color: colors.gray[500],
    fontSize: 14,
  },
  chevron: {
    position: "absolute",
    top: "50%",
    transform: [{ translateY: -20 }],
    zIndex: 2,
  },
  chevronLeft: {
    left: 15,
  },
  chevronRight: {
    right: 15,
  },
  chevronBackground: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.gold,
  },
  dotsContainer: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.white,
    marginHorizontal: 4,
    opacity: 0.5,
  },
  activeDot: {
    backgroundColor: colors.gold,
    opacity: 1,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  counterContainer: {
    position: "absolute",
    top: 15,
    right: 15,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.gold,
  },
  counterText: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: "600",
  },
});
