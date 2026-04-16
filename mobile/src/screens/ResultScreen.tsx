import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ScrollView,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Video, ResizeMode } from "expo-av";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import type { StackScreenProps } from "@react-navigation/stack";
import type { RootStackParamList } from "@/navigation/AppNavigator";

type Props = StackScreenProps<RootStackParamList, "Result">;

export default function ResultScreen({ navigation, route }: Props) {
  const { jobId, resultUrl } = route.params;
  const [downloading, setDownloading] = useState(false);

  const handleSaveToGallery = async () => {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission refusée", "Accès à la galerie nécessaire.");
      return;
    }

    setDownloading(true);
    try {
      const localPath = FileSystem.cacheDirectory + `deepfake_${jobId?.slice(0, 8)}.mp4`;
      await FileSystem.downloadAsync(resultUrl, localPath);
      await MediaLibrary.saveToLibraryAsync(localPath);
      Alert.alert("Enregistré !", "La vidéo a été sauvegardée dans votre galerie.");
    } catch (e: any) {
      Alert.alert("Erreur", e?.message || "Impossible de sauvegarder.");
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    if (!(await Sharing.isAvailableAsync())) {
      Alert.alert("Non disponible", "Le partage n'est pas disponible sur cet appareil.");
      return;
    }

    setDownloading(true);
    try {
      const localPath = FileSystem.cacheDirectory + `deepfake_${jobId?.slice(0, 8)}.mp4`;
      await FileSystem.downloadAsync(resultUrl, localPath);
      await Sharing.shareAsync(localPath, { mimeType: "video/mp4" });
    } catch (e: any) {
      Alert.alert("Erreur", e?.message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <StatusBar style="light" />

      {/* Success badge */}
      <View style={styles.badge}>
        <Text style={styles.badgeText}>✓ Traitement terminé</Text>
      </View>

      <Text style={styles.title}>Votre vidéo est prête !</Text>
      <Text style={styles.subtitle}>
        La personne a été remplacée avec les mêmes gestes, mouvements et paroles.
      </Text>

      {/* Video player */}
      <View style={styles.videoCard}>
        <Video
          source={{ uri: resultUrl }}
          style={styles.video}
          resizeMode={ResizeMode.CONTAIN}
          useNativeControls
          shouldPlay
          isLooping
        />
      </View>

      {/* Actions */}
      <TouchableOpacity
        style={[styles.btnPrimary, downloading && styles.btnDisabled]}
        onPress={handleSaveToGallery}
        disabled={downloading}
      >
        <Text style={styles.btnPrimaryText}>
          {downloading ? "Téléchargement..." : "⬇ Enregistrer dans la galerie"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.btnSecondary, downloading && styles.btnDisabled]}
        onPress={handleShare}
        disabled={downloading}
      >
        <Text style={styles.btnSecondaryText}>↗ Partager la vidéo</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.btnSecondary}
        onPress={() => navigation.popToTop()}
      >
        <Text style={styles.btnSecondaryText}>↺ Nouvelle vidéo</Text>
      </TouchableOpacity>

      {/* Ethics reminder */}
      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          Rappel : ce contenu doit être utilisé à des fins créatives ou éducatives uniquement.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#030712" },
  content: { padding: 20, paddingBottom: 40, alignItems: "center" },
  badge: { backgroundColor: "#052e16", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: "#166534", marginTop: 24, marginBottom: 16 },
  badgeText: { color: "#4ade80", fontSize: 13, fontWeight: "600" },
  title: { fontSize: 24, fontWeight: "800", color: "#f9fafb", textAlign: "center" },
  subtitle: { fontSize: 13, color: "#6b7280", textAlign: "center", marginTop: 8, marginBottom: 20 },
  videoCard: { backgroundColor: "#111827", borderRadius: 16, overflow: "hidden", width: "100%", aspectRatio: 16 / 9, marginBottom: 20 },
  video: { width: "100%", height: "100%" },
  btnPrimary: { backgroundColor: "#4361ee", borderRadius: 14, padding: 16, alignItems: "center", width: "100%", marginBottom: 10 },
  btnPrimaryText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  btnSecondary: { backgroundColor: "#111827", borderRadius: 14, padding: 16, alignItems: "center", width: "100%", marginBottom: 10, borderWidth: 1, borderColor: "#1f2937" },
  btnSecondaryText: { color: "#d1d5db", fontSize: 15, fontWeight: "600" },
  btnDisabled: { opacity: 0.5 },
  disclaimer: { marginTop: 12, padding: 12, backgroundColor: "#1c1708", borderRadius: 12, borderWidth: 1, borderColor: "#78350f", width: "100%" },
  disclaimerText: { color: "#b45309", fontSize: 11, textAlign: "center" },
});
