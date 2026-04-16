import React from "react";
import { View, Text, StyleSheet } from "react-native";

const STEPS = [
  { label: "Audio", icon: "🎵" },
  { label: "Frames", icon: "🎬" },
  { label: "FOMM", icon: "🤖" },
  { label: "Wav2Lip", icon: "👄" },
  { label: "Vidéo", icon: "🎞" },
  { label: "Sauvegarde", icon: "💾" },
];

interface StepIndicatorProps {
  currentStepLabel: string;
}

function resolveIndex(stepLabel: string): number {
  const lower = stepLabel.toLowerCase();
  if (lower.includes("audio")) return 0;
  if (lower.includes("frame")) return 1;
  if (lower.includes("fomm") || lower.includes("animation")) return 2;
  if (lower.includes("wav") || lower.includes("labiale")) return 3;
  if (lower.includes("reconstruction") || lower.includes("vidéo")) return 4;
  if (lower.includes("sauvegarde") || lower.includes("terminé")) return 5;
  return -1;
}

export default function StepIndicator({ currentStepLabel }: StepIndicatorProps) {
  const currentIndex = resolveIndex(currentStepLabel);

  return (
    <View style={styles.container}>
      {STEPS.map((step, idx) => {
        const done = idx < currentIndex;
        const active = idx === currentIndex;
        return (
          <View key={step.label} style={styles.row}>
            <View
              style={[
                styles.dot,
                done && styles.dotDone,
                active && styles.dotActive,
              ]}
            >
              <Text style={styles.dotLabel}>
                {done ? "✓" : step.icon}
              </Text>
            </View>
            <View style={styles.info}>
              <Text
                style={[
                  styles.label,
                  done && styles.labelDone,
                  active && styles.labelActive,
                ]}
              >
                {step.label}
              </Text>
              {active && (
                <View style={styles.activeDot} />
              )}
            </View>
            {idx < STEPS.length - 1 && (
              <View style={[styles.line, done && styles.lineDone]} />
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: 4 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },
  dot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#1e293b",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#334155",
  },
  dotDone: {
    backgroundColor: "#14532d",
    borderColor: "#22c55e",
  },
  dotActive: {
    backgroundColor: "#1e1b4b",
    borderColor: "#4361ee",
  },
  dotLabel: { fontSize: 16 },
  info: {
    flex: 1,
    marginLeft: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  label: { color: "#475569", fontSize: 14 },
  labelDone: { color: "#64748b" },
  labelActive: { color: "#e2e8f0", fontWeight: "700" },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#4361ee",
    marginLeft: 8,
  },
  line: {
    position: "absolute",
    left: 17,
    top: 42,
    width: 2,
    height: 12,
    backgroundColor: "#1e293b",
  },
  lineDone: { backgroundColor: "#22c55e" },
});
