import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";

interface ProgressBarProps {
  progress: number;
  step: string;
  message?: string;
  color?: string;
}

export default function ProgressBar({
  progress,
  step,
  message,
  color = "#4361ee",
}: ProgressBarProps) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: Math.min(100, Math.max(0, progress)),
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const width = anim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.step} numberOfLines={2}>
          {step}
        </Text>
        <Text style={[styles.percent, { color }]}>{Math.round(progress)}%</Text>
      </View>

      <View style={styles.track}>
        <Animated.View style={[styles.fill, { width, backgroundColor: color }]} />
      </View>

      {!!message && (
        <Text style={styles.message} numberOfLines={1}>
          {message}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
    gap: 8,
  },
  step: {
    color: "#cbd5e1",
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
    lineHeight: 20,
  },
  percent: {
    fontSize: 16,
    fontWeight: "800",
    minWidth: 44,
    textAlign: "right",
  },
  track: {
    height: 8,
    backgroundColor: "#1e293b",
    borderRadius: 999,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 999,
  },
  message: {
    color: "#475569",
    fontSize: 12,
    marginTop: 8,
    fontStyle: "italic",
  },
});
