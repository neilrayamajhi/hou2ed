import React, { Component, ErrorInfo, ReactNode } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../theme";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class AuthErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Auth Error Boundary caught:", error, errorInfo);

    // Call the onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Update state with error info
    this.setState({
      errorInfo,
    });

    // Log to error reporting service
    this.logErrorToService(error, errorInfo);
  }

  logErrorToService(error: Error, errorInfo: ErrorInfo) {
    // In production, send to error tracking service (e.g., Sentry)
    if (__DEV__) {
      console.log("Error details:", {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
      });
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <Ionicons
                name="alert-circle-outline"
                size={64}
                color={"#EF4444"}
              />
            </View>

            <Text style={styles.title}>Oops! Something went wrong</Text>

            <Text style={styles.message}>
              We encountered an unexpected error in the authentication flow.
            </Text>

            {__DEV__ && this.state.error && (
              <View style={styles.errorDetails}>
                <Text style={styles.errorDetailsTitle}>
                  Error Details (Dev Only):
                </Text>
                <Text style={styles.errorDetailsText}>
                  {this.state.error.message}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.retryButton}
              onPress={this.handleReset}
              accessibilityRole="button"
              accessibilityLabel="Try again"
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                // Navigate back or to login
                this.handleReset();
              }}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Text style={styles.backButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.spacing.xl,
  },
  iconContainer: {
    marginBottom: theme.spacing.xl,
  },
  title: {
    fontSize: theme.typography.fontSize.xxl,
    fontWeight: theme.typography.fontWeight.bold,
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: theme.spacing.md,
  },
  message: {
    fontSize: theme.typography.fontSize.md,
    color: "#4B5563",
    textAlign: "center",
    marginBottom: theme.spacing.xl,
    lineHeight: 22,
  },
  errorDetails: {
    backgroundColor: "#1F2937",
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.xl,
    maxWidth: "100%",
  },
  errorDetailsTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: "#EF4444",
    marginBottom: theme.spacing.sm,
  },
  errorDetailsText: {
    fontSize: theme.typography.fontSize.xs,
    color: "#4B5563",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  retryButton: {
    backgroundColor: "#D4AF37",
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    minWidth: 200,
    alignItems: "center",
  },
  retryButtonText: {
    color: "#000000",
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  backButton: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
  },
  backButtonText: {
    color: "#FFFFFF",
    fontSize: theme.typography.fontSize.md,
    textDecorationLine: "underline",
  },
});

export default AuthErrorBoundary;
