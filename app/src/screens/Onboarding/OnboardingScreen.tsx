import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import { NativeSyntheticEvent, NativeScrollEvent } from "react-native";
import { RootStackNavigationProp } from "../../navigation/types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface Slide {
  id: number;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const slides: Slide[] = [
  {
    id: 1,
    title: "Togetherness",
    description:
      "HOU2ED brings communities together to ensure everyone has a safe place to call home. No one should face housing challenges alone.",
    icon: "people",
  },
  {
    id: 2,
    title: "Second Chances",
    description:
      "Everyone deserves an opportunity to rebuild. We connect those in need with housing providers who believe in fresh starts.",
    icon: "refresh",
  },
  {
    id: 3,
    title: "No One Stands Alone",
    description:
      "Our network of support ensures you have advocates, resources, and a community standing with you every step of the way.",
    icon: "hand-left",
  },
];

export default function OnboardingScreen() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    // Mark slides as seen for future app launches
    markSlidesAsSeen();
  }, []);

  const markSlidesAsSeen = async (): Promise<void> => {
    try {
      await SecureStore.setItemAsync("seenSlides", "true");
    } catch (error) {
      console.error("Error saving slides seen status:", error);
      // Non-critical error, app continues
    }
  };

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      const currentIndex = Math.round(offsetX / SCREEN_WIDTH);
      setCurrentSlide(currentIndex);
    },
    [],
  );

  const goToSlide = useCallback((index: number) => {
    scrollViewRef.current?.scrollTo({
      x: index * SCREEN_WIDTH,
      animated: true,
    });
    setCurrentSlide(index);
  }, []);

  const handleNext = useCallback(() => {
    if (currentSlide < slides.length - 1) {
      goToSlide(currentSlide + 1);
    }
  }, [currentSlide, goToSlide]);

  const handleSkip = useCallback(() => {
    navigation.replace("RoleSelection");
  }, [navigation]);

  const handleGetStarted = useCallback(() => {
    navigation.replace("RoleSelection");
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Skip button - top right */}
      <TouchableOpacity
        style={styles.skipButton}
        onPress={handleSkip}
        accessibilityRole="button"
        accessibilityLabel="Skip onboarding"
      >
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      {/* Slides */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
      >
        {slides.map((slide) => (
          <View key={slide.id} style={styles.slide}>
            <View style={styles.iconContainer}>
              <Ionicons name={slide.icon} size={100} color="#FFD700" />
            </View>
            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.description}>{slide.description}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Bottom section with dots and button */}
      <View style={styles.bottomContainer}>
        {/* Dots indicator */}
        <View style={styles.dotsContainer}>
          {slides.map((_, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => goToSlide(index)}
              accessibilityRole="button"
              accessibilityLabel={`Go to slide ${index + 1}`}
            >
              <View
                style={[styles.dot, currentSlide === index && styles.activeDot]}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Action button */}
        {currentSlide === slides.length - 1 ? (
          <TouchableOpacity
            style={styles.button}
            onPress={handleGetStarted}
            accessibilityRole="button"
            accessibilityLabel="Get started"
          >
            <Text style={styles.buttonText}>Get Started</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.button}
            onPress={handleNext}
            accessibilityRole="button"
            accessibilityLabel="Next slide"
          >
            <Text style={styles.buttonText}>Next</Text>
            <Ionicons
              name="arrow-forward"
              size={20}
              color="#000000"
              style={styles.buttonIcon}
            />
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  skipButton: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  skipText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "500",
  },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  iconContainer: {
    marginBottom: 40,
    width: 150,
    height: 150,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 75,
    backgroundColor: "rgba(255, 215, 0, 0.1)",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#FFD700",
    marginBottom: 20,
    textAlign: "center",
  },
  description: {
    fontSize: 16,
    color: "#FFFFFF",
    textAlign: "center",
    lineHeight: 24,
    opacity: 0.9,
  },
  bottomContainer: {
    position: "absolute",
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  dotsContainer: {
    flexDirection: "row",
    marginBottom: 30,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FFFFFF",
    marginHorizontal: 5,
    opacity: 0.3,
  },
  activeDot: {
    backgroundColor: "#FFD700",
    opacity: 1,
  },
  button: {
    backgroundColor: "#FFD700",
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 150,
    justifyContent: "center",
  },
  buttonText: {
    color: "#000000",
    fontSize: 18,
    fontWeight: "600",
  },
  buttonIcon: {
    marginLeft: 8,
  },
});
