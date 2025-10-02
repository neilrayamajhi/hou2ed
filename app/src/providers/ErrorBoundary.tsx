import React, { Component, ReactNode } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

// Props type - what the component receives
interface Props {
  children: ReactNode; // The app content that this wraps
}

// State type - what the component tracks internally
interface State {
  hasError: boolean;
  error: Error | null;
}

// ErrorBoundary catches JavaScript errors anywhere in the app
// This prevents the whole app from crashing when there's an error
export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  // This method is called when an error occurs
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  // Log error details (in production, you'd send this to a service like Sentry)
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  // Reset the error state so user can try again
  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      // Show error screen with our black/gold theme
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            {this.state.error?.message || "An unexpected error occurred"}
          </Text>
          <TouchableOpacity style={styles.button} onPress={this.handleReset}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // If no error, show the app normally
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    color: "#D4AF37",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
  },
  message: {
    color: "#FFFFFF",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#D4AF37",
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 12,
  },
  buttonText: {
    color: "#000000",
    fontSize: 16,
    fontWeight: "bold",
  },
});
