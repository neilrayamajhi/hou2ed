import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import { View, Text, StyleSheet, Animated, SafeAreaView } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type ToastType = "success" | "error" | "warning";

interface ToastData {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}

interface ToastProviderProps {
  children: React.ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const toastTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      toastTimers.current.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  const showToast = (message: string, type: ToastType = "success") => {
    // Use crypto random for unique ID to avoid collisions
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast: ToastData = { id, message, type };

    setToasts((prev) => [...prev, newToast]);

    const timer = setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
      toastTimers.current.delete(id);
    }, 3000);

    toastTimers.current.set(id, timer);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <SafeAreaView style={styles.container} pointerEvents="box-none">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </SafeAreaView>
    </ToastContext.Provider>
  );
}

interface ToastItemProps {
  toast: ToastData;
}

function ToastItem({ toast }: ToastItemProps) {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    const timeout = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -100,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }, 2500);

    return () => {
      clearTimeout(timeout);
      // Cancel animations on unmount
      translateY.stopAnimation();
      opacity.stopAnimation();
    };
  }, [translateY, opacity]);

  const getIcon = (): keyof typeof Ionicons.glyphMap => {
    switch (toast.type) {
      case "success":
        return "checkmark-circle";
      case "error":
        return "close-circle";
      case "warning":
        return "warning";
      default:
        return "information-circle";
    }
  };

  const getColor = () => {
    switch (toast.type) {
      case "success":
        return "#34C759";
      case "error":
        return "#FF3B30";
      case "warning":
        return "#FF9500";
      default:
        return "#FFD700";
    }
  };

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          transform: [{ translateY }],
          opacity,
        },
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      accessible={true}
      accessibilityLabel={`${toast.type} notification: ${toast.message}`}
    >
      <Ionicons
        name={getIcon()}
        size={20}
        color={getColor()}
        style={styles.icon}
        accessibilityElementsHidden={true}
      />
      <Text style={styles.message} accessibilityElementsHidden={true}>
        {toast.message}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 9999,
  },
  toast: {
    backgroundColor: "#1C1C1E",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 8,
    marginHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    minWidth: 200,
    maxWidth: "90%",
  },
  icon: {
    marginRight: 8,
  },
  message: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
});

export default ToastProvider;
