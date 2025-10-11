import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import * as SecureStore from "expo-secure-store";
import { RootStackNavigationProp } from "../../navigation/types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function Splash() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const glowAnimation = useRef(new Animated.Value(0.3)).current;
  const navigationTimer = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    // Start the glow animation for the "2"
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnimation, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: false, // Changed to false for opacity animation on web
        }),
        Animated.timing(glowAnimation, {
          toValue: 0.3,
          duration: 1500,
          useNativeDriver: false, // Changed to false for opacity animation on web
        }),
      ]),
    ).start();

    // Check if user has seen slides before
    const checkAndNavigate = async () => {
      try {
        // TEMPORARY: Go to DevMenu to test Provider Dashboard
        navigationTimer.current = setTimeout(() => {
          navigation.replace("DevMenu");
        }, 2500);

        // ORIGINAL CODE (commented out for testing):
        // const seenSlides = await SecureStore.getItemAsync("seenSlides");
        // const destination = seenSlides === "true" ? "Tabs" : "OnboardingScreen";
        // navigationTimer.current = setTimeout(() => {
        //   navigation.replace(destination);
        // }, 2500);
      } catch (error) {
        console.warn("Error checking slides status:", error);
        navigationTimer.current = setTimeout(() => {
          navigation.replace("DevMenu");
        }, 2500);
      }
    };

    checkAndNavigate();

    return () => {
      glowAnimation.stopAnimation();
      if (navigationTimer.current) {
        clearTimeout(navigationTimer.current);
      }
    };
  }, [navigation, glowAnimation]);

  const containerStyle = styles.container;
  const logoContainerStyle = styles.logoContainer;
  const logoRowStyle = styles.logoRow;
  const logoTextStyle = styles.logoText;
  const glowingTwoStyle = styles.glowingTwo;
  const taglineStyle = styles.tagline;
  const loaderContainerStyle = styles.loaderContainer;

  return (
    <View style={containerStyle}>
      {/* Logo with animated "2" */}
      <View style={logoContainerStyle}>
        <View style={logoRowStyle}>
          <Text style={logoTextStyle}>HOU</Text>
          <Animated.Text
            style={[
              logoTextStyle,
              glowingTwoStyle,
              {
                opacity: glowAnimation,
              },
            ]}
          >
            2
          </Animated.Text>
          <Text style={logoTextStyle}>ED</Text>
        </View>
      </View>

      {/* Tagline */}
      <Text style={taglineStyle}>Housing to End Disparity</Text>

      {/* Loading spinner at bottom */}
      <View style={loaderContainerStyle}>
        <ActivityIndicator size="large" color="#FFD700" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
  },
  logoContainer: {
    marginBottom: 20,
  },
  logoRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  logoText: {
    fontSize: 56,
    fontWeight: "bold" as const,
    color: "#FFD700",
    letterSpacing: 2,
  },
  glowingTwo: {
    fontSize: 56,
    fontWeight: "bold" as const,
    color: "#FFD700",
  },
  tagline: {
    fontSize: 18,
    color: "#FFFFFF",
    marginTop: 10,
    fontWeight: "300" as const,
    letterSpacing: 1,
  },
  loaderContainer: {
    position: "absolute" as const,
    bottom: 100,
  },
});