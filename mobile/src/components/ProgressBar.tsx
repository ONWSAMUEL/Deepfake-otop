import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface ProgressBarProps {
  progress: number;
  step: string;
  message?: string;
}

export default function ProgressBar({ progress, step, message }: ProgressBarProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.step} numberOfLines={1}>
          {step}
        </Text>
        <Text style={styles.percent}>{progress}%</Text>
      </View>

      <View style={styles.track}>
        <View
          style={[styles.fill, { width: `${Math.min(100, Math.max(0, progress))}%` }]}
        />
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
    alignItems: "center",
    marginBottom: 8,
  },
  step: {
    color: "#d1d5db",
    fontSize: 14,
    flex: 1,
    marginRight: 8,
  },
  percent: {
    color: "#4361ee",
    fontSize: 14,
    fontWeight: "700",
  },
  track: {
    height: 8,
    backgroundColor: "#1f2937",
    borderRadius: 999,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    backgroundColor: "#4361ee",
    borderRadius: 999,
  },
  message: {
    color: "#6b7280",
    fontSize: 12,
    marginTop: 6,
  },
});
