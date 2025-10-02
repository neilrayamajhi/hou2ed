import React, { createContext, useContext, useState, ReactNode } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";

// Types for our toast messages
type ToastType = "success" | "error" | "warning";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

// Context type - what functions are available to show toasts
interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

// Create the context
const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Hook to use toast functionality anywhere in the app
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}

interface ToastProviderProps {
  children: ReactNode;
}

// Provider component that manages all toasts
export default function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Function to show a new toast
  const showToast = (message: string, type: ToastType = "success") => {
    const id = Date.now().toString();
    const newToast: Toast = { id, message, type };

    setToasts((prev) => [...prev, newToast]);

    // Remove toast after 3 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast display area - positioned at top of screen */}
      <View style={styles.toastContainer}>
        {toasts.map((toast) => (
          <View
            key={toast.id}
            style={[
              styles.toast,
              toast.type === "error" && styles.errorToast,
              toast.type === "warning" && styles.warningToast,
            ]}
          >
            <Text style={styles.toastText}>{toast.message}</Text>
          </View>
        ))}
      </View>
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  toastContainer: {
    position: "absolute",
    top: 50,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 9999,
  },
  toast: {
    backgroundColor: "#21C55D", // Green for success
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  errorToast: {
    backgroundColor: "#EF4444", // Red for error
  },
  warningToast: {
    backgroundColor: "#F59E0B", // Amber for warning
  },
  toastText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
});
