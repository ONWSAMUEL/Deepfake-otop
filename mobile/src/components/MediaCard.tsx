import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

interface MediaCardProps {
  title: string;
  subtitle: string;
  icon: string; // emoji
  file: { name: string; uploading: boolean; progress: number } | null;
  onPickGallery: () => void;
  onPickCamera?: () => void;
  onClear: () => void;
  accent?: string;
}

export default function MediaCard({
  title,
  subtitle,
  icon,
  file,
  onPickGallery,
  onPickCamera,
  onClear,
  accent = "#4361ee",
}: MediaCardProps) {
  const handlePress = (fn: () => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fn();
  };

  if (file) {
    return (
      <View style={[styles.card, styles.cardFilled, { borderColor: accent + "60" }]}>
        <View style={styles.fileRow}>
          <View style={[styles.iconBox, { backgroundColor: accent + "20" }]}>
            <Text style={styles.iconText}>{icon}</Text>
          </View>
          <View style={styles.fileInfo}>
            <Text style={styles.fileName} numberOfLines={1}>
              {file.name}
            </Text>
            {file.uploading ? (
              <View style={styles.progressRow}>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${file.progress}%` as any, backgroundColor: accent },
                    ]}
                  />
                </View>
                <Text style={[styles.progressText, { color: accent }]}>
                  {file.progress}%
                </Text>
              </View>
            ) : (
              <Text style={[styles.uploadedBadge, { color: "#4ade80" }]}>
                ✓ Prêt
              </Text>
            )}
          </View>
          {!file.uploading && (
            <TouchableOpacity onPress={() => handlePress(onClear)} style={styles.clearBtn}>
              <Text style={styles.clearText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {file.uploading && (
          <ActivityIndicator
            size="small"
            color={accent}
            style={{ position: "absolute", right: 16, top: 20 }}
          />
        )}
      </View>
    );
  }

  return (
    <View style={[styles.card, styles.cardEmpty]}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={[styles.iconBox, { backgroundColor: accent + "15" }]}>
          <Text style={styles.iconText}>{icon}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardSubtitle}>{subtitle}</Text>
        </View>
      </View>

      {/* Buttons */}
      <View style={styles.btnRow}>
        <TouchableOpacity
          style={[styles.pickBtn, { borderColor: accent + "60", flex: 1 }]}
          onPress={() => handlePress(onPickGallery)}
        >
          <Text style={styles.pickBtnIcon}>🖼</Text>
          <Text style={styles.pickBtnText}>Galerie</Text>
        </TouchableOpacity>

        {onPickCamera && (
          <TouchableOpacity
            style={[styles.pickBtn, { borderColor: accent + "60", flex: 1, marginLeft: 8 }]}
            onPress={() => handlePress(onPickCamera)}
          >
            <Text style={styles.pickBtnIcon}>📷</Text>
            <Text style={styles.pickBtnText}>Caméra</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
  },
  cardFilled: {
    backgroundColor: "#0f172a",
    borderColor: "#4361ee40",
  },
  cardEmpty: {
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: { fontSize: 22 },
  cardTitle: {
    color: "#e2e8f0",
    fontSize: 15,
    fontWeight: "700",
  },
  cardSubtitle: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 2,
  },
  btnRow: {
    flexDirection: "row",
  },
  pickBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: "#1e293b",
  },
  pickBtnIcon: { fontSize: 16 },
  pickBtnText: { color: "#cbd5e1", fontSize: 14, fontWeight: "500" },
  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  fileInfo: { flex: 1 },
  fileName: { color: "#e2e8f0", fontSize: 14, fontWeight: "500", marginBottom: 6 },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: "#1e293b",
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 999 },
  progressText: { fontSize: 12, fontWeight: "700", width: 30, textAlign: "right" },
  uploadedBadge: { fontSize: 13, fontWeight: "600" },
  clearBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#1e293b",
    alignItems: "center",
    justifyContent: "center",
  },
  clearText: { color: "#64748b", fontSize: 14 },
});
