import React from "react";
import { View, StyleSheet, ViewProps } from "react-native";

interface CardProps extends ViewProps {
  header?: React.ReactNode;
  media?: React.ReactNode;
  body?: React.ReactNode;
  footer?: React.ReactNode;
  children?: React.ReactNode;
}

export default function Card({
  header,
  media,
  body,
  footer,
  children,
  style,
  ...props
}: CardProps) {
  return (
    <View style={[styles.container, style]} accessibilityRole="none" {...props}>
      {header && <View style={styles.header}>{header}</View>}
      {media && <View style={styles.media}>{media}</View>}
      {body && <View style={styles.body}>{body}</View>}
      {children && <View style={styles.content}>{children}</View>}
      {footer && <View style={styles.footer}>{footer}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#000000",
    borderWidth: 1,
    borderColor: "#FFD700",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#FFD700",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#333333",
  },
  media: {
    backgroundColor: "#111111",
  },
  body: {
    padding: 16,
  },
  content: {
    padding: 16,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#333333",
  },
});
