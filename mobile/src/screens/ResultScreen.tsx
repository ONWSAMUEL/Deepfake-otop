import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ScrollView,
  Animated,
} from "react-native";
import { Video, ResizeMode, type AVPlaybackStatus } from "expo-av";
import { LinearGradient } from "expo-linear-gradient";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import * as Haptics from "expo-haptics";
import type { StackScreenProps } from "@react-navigation/stack";
import type { RootStackParamList } from "@/navigation/AppNavigator";

type Props = StackScreenProps<RootStackParamList, "Result">;

export default function ResultScreen({ navigation, route }: Props) {
  const { jobId, resultUrl } = route.params;
  const [loading, setLoading] = useState(false);
  const [savedToGallery, setSavedToGallery] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const videoRef = useRef<Video>(null);
  const successAnim = useRef(new Animated.Value(0)).current;

  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) setIsPlaying(status.isPlaying);
  };

  // ─── Download to gallery ───────────────────────────────────────────────────
  const handleSaveToGallery = async () => {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission refusée",
        "Veuillez autoriser l'accès à la galerie dans les paramètres de l'application."
      );
      return;
    }

    setLoading(true);
    try {
      const localPath = `${FileSystem.cacheDirectory}deepfake_${jobId.slice(0, 8)}.mp4`;
      const { uri } = await FileSystem.downloadAsync(resultUrl, localPath);
      await MediaLibrary.saveToLibraryAsync(uri);
      setSavedToGallery(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Animated.sequence([
        Animated.timing(successAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.delay(2000),
        Animated.timing(successAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    } catch (e: any) {
      Alert.alert("Erreur", e?.message || "Impossible d'enregistrer la vidéo.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  // ─── Share ─────────────────────────────────────────────────────────────────
  const handleShare = async () => {
    if (!(await Sharing.isAvailableAsync())) {
      Alert.alert("Non disponible", "Le partage n'est pas disponible sur cet appareil.");
      return;
    }
    setLoading(true);
    try {
      const localPath = `${FileSystem.cacheDirectory}share_${jobId.slice(0, 8)}.mp4`;
      const { uri } = await FileSystem.downloadAsync(resultUrl, localPath);
      await Sharing.shareAsync(uri, { mimeType: "video/mp4", dialogTitle: "Partager la vidéo" });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e: any) {
      Alert.alert("Erreur", e?.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      bounces={false}
    >
      {/* Success header */}
      <LinearGradient colors={["#052e16", "#030712"]} style={styles.header}>
        <View style={styles.successBadge}>
          <Text style={styles.successBadgeText}>✓ Traitement terminé</Text>
        </View>
        <Text style={styles.title}>Votre vidéo est prête !</Text>
        <Text style={styles.subtitle}>
          La personne a été remplacée avec les mêmes gestes, mouvements et paroles.
        </Text>
      </LinearGradient>

      {/* Video player */}
      <View style={styles.videoCard}>
        <Video
          ref={videoRef}
          source={{ uri: resultUrl }}
          style={styles.video}
          resizeMode={ResizeMode.CONTAIN}
          useNativeControls
          shouldPlay
          isLooping
          onPlaybackStatusUpdate={onPlaybackStatusUpdate}
        />
      </View>

      {/* Saved confirmation */}
      <Animated.View style={[styles.savedMsg, { opacity: successAnim }]}>
        <Text style={styles.savedMsgText}>✓ Vidéo enregistrée dans la galerie</Text>
      </Animated.View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.btn, styles.btnPrimary, loading && styles.btnDisabled]}
          onPress={handleSaveToGallery}
          disabled={loading || savedToGallery}
        >
          <LinearGradient
            colors={savedToGallery ? ["#14532d", "#14532d"] : ["#4361ee", "#7209b7"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.btnGradient}
          >
            <Text style={styles.btnTextPrimary}>
              {savedToGallery
                ? "✓ Enregistrée dans la galerie"
                : loading
                ? "Enregistrement..."
                : "⬇  Enregistrer dans la galerie"}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.btnSecondary, loading && styles.btnDisabled]}
          onPress={handleShare}
          disabled={loading}
        >
          <Text style={styles.btnTextSecondary}>↗  Partager la vidéo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.btnSecondary]}
          onPress={() => navigation.popToTop()}
        >
          <Text style={styles.btnTextSecondary}>↺  Nouvelle vidéo</Text>
        </TouchableOpacity>
      </View>

      {/* Metadata */}
      <View style={styles.meta}>
        <Text style={styles.metaText}>Job ID : {jobId}</Text>
        <Text style={styles.disclaimer}>
          Ce contenu doit être utilisé à des fins créatives ou éducatives uniquement.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#030712" },
  content: { paddingBottom: 48 },
  header: { alignItems: "center", paddingTop: 48, paddingBottom: 28, paddingHorizontal: 20 },
  successBadge: { backgroundColor: "#166534", borderRadius: 999, paddingHorizontal: 16, paddingVertical: 6, marginBottom: 14 },
  successBadgeText: { color: "#4ade80", fontSize: 13, fontWeight: "700" },
  title: { color: "#f1f5f9", fontSize: 24, fontWeight: "800", textAlign: "center" },
  subtitle: { color: "#64748b", fontSize: 14, textAlign: "center", marginTop: 8, lineHeight: 22 },
  videoCard: { margin: 16, borderRadius: 20, overflow: "hidden", backgroundColor: "#000", aspectRatio: 16 / 9 },
  video: { width: "100%", height: "100%" },
  savedMsg: { alignSelf: "center", backgroundColor: "#14532d", paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, marginBottom: 8 },
  savedMsgText: { color: "#4ade80", fontSize: 13, fontWeight: "600" },
  actions: { paddingHorizontal: 16, gap: 10 },
  btn: { borderRadius: 16, overflow: "hidden" },
  btnPrimary: {},
  btnSecondary: { backgroundColor: "#0f172a", paddingVertical: 16, alignItems: "center", borderWidth: 1.5, borderColor: "#1e293b" },
  btnDisabled: { opacity: 0.5 },
  btnGradient: { paddingVertical: 18, alignItems: "center" },
  btnTextPrimary: { color: "#fff", fontSize: 16, fontWeight: "700" },
  btnTextSecondary: { color: "#cbd5e1", fontSize: 15, fontWeight: "600" },
  meta: { margin: 16, marginTop: 24, alignItems: "center", gap: 6 },
  metaText: { color: "#1e293b", fontSize: 11 },
  disclaimer: { color: "#78350f", fontSize: 11, textAlign: "center", lineHeight: 16 },
});
