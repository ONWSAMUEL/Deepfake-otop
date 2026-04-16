import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import type { StackScreenProps } from "@react-navigation/stack";
import type { RootStackParamList } from "@/navigation/AppNavigator";
import MediaCard from "@/components/MediaCard";
import { uploadMedia, checkHealth, createJob } from "@/services/api";
import { StorageService } from "@/services/storage";

type Props = StackScreenProps<RootStackParamList, "Home">;

interface MediaItem {
  uri: string;
  name: string;
  mimeType: string;
  fileId: string | null;
  uploading: boolean;
  progress: number;
}

export default function HomeScreen({ navigation }: Props) {
  const [sourceVideo, setSourceVideo] = useState<MediaItem | null>(null);
  const [targetImage, setTargetImage] = useState<MediaItem | null>(null);
  const [lipSync, setLipSync] = useState(true);
  const [ethicsAccepted, setEthicsAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverOk, setServerOk] = useState<boolean | null>(null);

  // Restore preferences
  useEffect(() => {
    StorageService.getLipSync().then(setLipSync);
    StorageService.getEthicsAccepted().then(setEthicsAccepted);
    checkHealth().then(setServerOk);
  }, []);

  const handleLipSyncChange = (v: boolean) => {
    setLipSync(v);
    StorageService.setLipSync(v);
  };

  const handleEthicsChange = (v: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setEthicsAccepted(v);
    StorageService.setEthicsAccepted(v);
  };

  // ─── Pick source video from gallery ────────────────────────────────────────
  const pickSourceVideoGallery = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["video/mp4", "video/quicktime", "video/*"],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    await doUpload(
      { uri: asset.uri, name: asset.name, mimeType: asset.mimeType || "video/mp4" },
      "source_video",
      setSourceVideo
    );
  };

  // ─── Record source video with camera ───────────────────────────────────────
  const pickSourceVideoCamera = () => {
    navigation.navigate("Camera", {
      onRecorded: (uri: string) => {
        const name = `video_${Date.now()}.mp4`;
        doUpload({ uri, name, mimeType: "video/mp4" }, "source_video", setSourceVideo);
      },
    });
  };

  // ─── Pick target image ─────────────────────────────────────────────────────
  const pickTargetImageGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.92,
      allowsEditing: true,
      aspect: [3, 4],
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const name = asset.uri.split("/").pop() || "portrait.jpg";
    await doUpload(
      { uri: asset.uri, name, mimeType: "image/jpeg" },
      "target_image",
      setTargetImage
    );
  };

  const pickTargetImageCamera = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.92,
      allowsEditing: true,
      aspect: [3, 4],
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const name = `portrait_${Date.now()}.jpg`;
    await doUpload(
      { uri: asset.uri, name, mimeType: "image/jpeg" },
      "target_image",
      setTargetImage
    );
  };

  // ─── Upload helper ─────────────────────────────────────────────────────────
  const doUpload = async (
    file: { uri: string; name: string; mimeType: string },
    type: "source_video" | "target_image",
    setState: React.Dispatch<React.SetStateAction<MediaItem | null>>
  ) => {
    setState({
      uri: file.uri,
      name: file.name,
      mimeType: file.mimeType,
      fileId: null,
      uploading: true,
      progress: 0,
    });
    try {
      const res = await uploadMedia(
        file.uri,
        file.name,
        file.mimeType,
        type,
        (pct) => setState((prev) => prev ? { ...prev, progress: pct } : prev)
      );
      setState((prev) => prev ? { ...prev, fileId: res.file_id, uploading: false } : prev);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "Erreur d'upload",
        e?.response?.data?.detail || e?.message || "Upload échoué. Vérifiez votre connexion."
      );
      setState(null);
    }
  };

  // ─── Submit ────────────────────────────────────────────────────────────────
  const canSubmit =
    ethicsAccepted &&
    sourceVideo?.fileId != null &&
    targetImage?.fileId != null &&
    !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setSubmitting(true);
    try {
      const job = await createJob(sourceVideo!.fileId!, targetImage!.fileId!, lipSync);
      navigation.navigate("Processing", { jobId: job.id });
    } catch (e: any) {
      Alert.alert("Erreur", e?.response?.data?.detail || "Impossible de démarrer le traitement.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#030712" />

      {/* ─── Header gradient ────────────────────────────────────────────────── */}
      <LinearGradient
        colors={["#0f0c29", "#030712"]}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Deepfake OTOP</Text>
            <Text style={styles.headerSub}>Remplacement de personne par IA</Text>
          </View>
          <TouchableOpacity
            style={styles.settingsBtn}
            onPress={() => navigation.navigate("Settings")}
          >
            <Text style={styles.settingsIcon}>⚙️</Text>
            {serverOk === false && <View style={styles.serverDot} />}
          </TouchableOpacity>
        </View>

        {/* Server status */}
        {serverOk !== null && (
          <View style={[styles.serverBadge, { backgroundColor: serverOk ? "#14532d" : "#7f1d1d" }]}>
            <View style={[styles.serverIndicator, { backgroundColor: serverOk ? "#4ade80" : "#f87171" }]} />
            <Text style={styles.serverText}>
              {serverOk ? "Serveur connecté" : "Serveur inaccessible — vérifiez les paramètres"}
            </Text>
          </View>
        )}
      </LinearGradient>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Source video */}
        <Text style={styles.sectionLabel}>1. Vidéo source (mouvements)</Text>
        <MediaCard
          title="Vidéo à reproduire"
          subtitle="MP4 / MOV · fournit gestes, mouvements et audio"
          icon="🎬"
          file={sourceVideo ? { name: sourceVideo.name, uploading: sourceVideo.uploading, progress: sourceVideo.progress } : null}
          onPickGallery={pickSourceVideoGallery}
          onPickCamera={pickSourceVideoCamera}
          onClear={() => setSourceVideo(null)}
          accent="#4361ee"
        />

        {/* Target image */}
        <Text style={styles.sectionLabel}>2. Photo de la personne cible</Text>
        <MediaCard
          title="Personne à insérer"
          subtitle="JPEG / PNG · portrait clair, fond neutre de préférence"
          icon="🧑"
          file={targetImage ? { name: targetImage.name, uploading: targetImage.uploading, progress: targetImage.progress } : null}
          onPickGallery={pickTargetImageGallery}
          onPickCamera={pickTargetImageCamera}
          onClear={() => setTargetImage(null)}
          accent="#7209b7"
        />

        {/* Options */}
        <Text style={styles.sectionLabel}>3. Options</Text>
        <View style={styles.optionCard}>
          <View style={styles.optionRow}>
            <View style={styles.optionInfo}>
              <Text style={styles.optionTitle}>Synchronisation labiale</Text>
              <Text style={styles.optionSub}>Wav2Lip — synchronise les lèvres avec l'audio</Text>
            </View>
            <Switch
              value={lipSync}
              onValueChange={handleLipSyncChange}
              trackColor={{ true: "#4361ee", false: "#334155" }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Ethics */}
        <Text style={styles.sectionLabel}>4. Engagement éthique</Text>
        <View style={styles.ethicsCard}>
          <Text style={styles.ethicsTitle}>⚠️  Usage responsable uniquement</Text>
          <Text style={styles.ethicsText}>
            Je certifie utiliser cette technologie à des fins créatives, éducatives ou de
            production audiovisuelle. Je m'engage à ne pas créer de contenu trompeur,
            malveillant ou portant atteinte à la dignité d'autrui.
          </Text>
          <TouchableOpacity
            style={styles.checkRow}
            onPress={() => handleEthicsChange(!ethicsAccepted)}
          >
            <View style={[styles.checkbox, ethicsAccepted && styles.checkboxChecked]}>
              {ethicsAccepted && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkLabel}>J'accepte les conditions d'utilisation</Text>
          </TouchableOpacity>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, !canSubmit && styles.submitDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={canSubmit ? ["#4361ee", "#7209b7"] : ["#1e293b", "#1e293b"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.submitGradient}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text style={styles.submitText}>
                  {!ethicsAccepted
                    ? "Acceptez les conditions"
                    : !sourceVideo?.fileId
                    ? "Ajoutez la vidéo source"
                    : !targetImage?.fileId
                    ? "Ajoutez la photo cible"
                    : "Lancer le remplacement →"}
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#030712" },
  headerGradient: { paddingTop: 48, paddingHorizontal: 20, paddingBottom: 20 },
  headerContent: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  headerTitle: { color: "#f1f5f9", fontSize: 24, fontWeight: "800" },
  headerSub: { color: "#64748b", fontSize: 13, marginTop: 2 },
  settingsBtn: { padding: 8, position: "relative" },
  settingsIcon: { fontSize: 24 },
  serverDot: { position: "absolute", top: 6, right: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: "#f87171" },
  serverBadge: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  serverIndicator: { width: 7, height: 7, borderRadius: 4 },
  serverText: { color: "#cbd5e1", fontSize: 12 },
  scroll: { flex: 1 },
  content: { padding: 16 },
  sectionLabel: { color: "#94a3b8", fontSize: 11, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8, marginTop: 4 },
  optionCard: { backgroundColor: "#0f172a", borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1.5, borderColor: "#1e293b" },
  optionRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  optionInfo: { flex: 1 },
  optionTitle: { color: "#e2e8f0", fontSize: 15, fontWeight: "600" },
  optionSub: { color: "#475569", fontSize: 12, marginTop: 2 },
  ethicsCard: { backgroundColor: "#0c0a00", borderRadius: 18, padding: 16, marginBottom: 16, borderWidth: 1.5, borderColor: "#78350f" },
  ethicsTitle: { color: "#fbbf24", fontSize: 14, fontWeight: "700", marginBottom: 8 },
  ethicsText: { color: "#92400e", fontSize: 13, lineHeight: 20, marginBottom: 14 },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: "#d97706", alignItems: "center", justifyContent: "center" },
  checkboxChecked: { backgroundColor: "#d97706", borderColor: "#d97706" },
  checkmark: { color: "#fff", fontSize: 14, fontWeight: "900" },
  checkLabel: { color: "#e2e8f0", fontSize: 14, flex: 1 },
  submitBtn: { borderRadius: 18, overflow: "hidden", marginTop: 4 },
  submitDisabled: { opacity: 0.55 },
  submitGradient: { paddingVertical: 18, alignItems: "center", justifyContent: "center" },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
