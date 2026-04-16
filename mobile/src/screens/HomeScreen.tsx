import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import type { StackScreenProps } from "@react-navigation/stack";
import type { RootStackParamList } from "@/navigation/AppNavigator";
import { uploadMedia, createJob } from "@/services/api";

type Props = StackScreenProps<RootStackParamList, "Home">;

interface MediaItem {
  uri: string;
  name: string;
  type: string;
  fileId: string | null;
  uploading: boolean;
  uploadProgress: number;
}

export default function HomeScreen({ navigation }: Props) {
  const [sourceVideo, setSourceVideo] = useState<MediaItem | null>(null);
  const [targetImage, setTargetImage] = useState<MediaItem | null>(null);
  const [lipSync, setLipSync] = useState(true);
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const pickSourceVideo = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["video/mp4", "video/quicktime", "video/*"],
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    const asset = result.assets[0];

    const item: MediaItem = {
      uri: asset.uri,
      name: asset.name,
      type: asset.mimeType || "video/mp4",
      fileId: null,
      uploading: true,
      uploadProgress: 0,
    };
    setSourceVideo(item);

    try {
      const res = await uploadMedia(
        asset.uri,
        asset.name,
        asset.mimeType || "video/mp4",
        "source_video",
        (pct) => setSourceVideo((prev) => prev ? { ...prev, uploadProgress: pct } : prev)
      );
      setSourceVideo((prev) => prev ? { ...prev, fileId: res.file_id, uploading: false } : prev);
    } catch (e: any) {
      Alert.alert("Erreur", e?.message || "Upload échoué");
      setSourceVideo(null);
    }
  };

  const pickTargetImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      allowsEditing: true,
      aspect: [3, 4],
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    const name = asset.uri.split("/").pop() || "target.jpg";

    const item: MediaItem = {
      uri: asset.uri,
      name,
      type: "image/jpeg",
      fileId: null,
      uploading: true,
      uploadProgress: 0,
    };
    setTargetImage(item);

    try {
      const res = await uploadMedia(
        asset.uri,
        name,
        "image/jpeg",
        "target_image",
        (pct) => setTargetImage((prev) => prev ? { ...prev, uploadProgress: pct } : prev)
      );
      setTargetImage((prev) => prev ? { ...prev, fileId: res.file_id, uploading: false } : prev);
    } catch (e: any) {
      Alert.alert("Erreur", e?.message || "Upload échoué");
      setTargetImage(null);
    }
  };

  const canSubmit =
    accepted &&
    sourceVideo?.fileId != null &&
    targetImage?.fileId != null &&
    !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const job = await createJob(sourceVideo!.fileId!, targetImage!.fileId!, lipSync);
      navigation.navigate("Processing", { jobId: job.id });
    } catch (e: any) {
      Alert.alert("Erreur", e?.message || "Impossible de créer le job");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <StatusBar style="light" />

      {/* Hero */}
      <View style={styles.hero}>
        <Text style={styles.title}>Remplacement de{"\n"}personne par IA</Text>
        <Text style={styles.subtitle}>
          FOMM transfère les gestes • Wav2Lip synchronise les lèvres
        </Text>
      </View>

      {/* Source video */}
      <View style={styles.card}>
        <Text style={styles.label}>Vidéo source (mouvements)</Text>
        <Text style={styles.hint}>MP4 ou MOV — fournit gestes, mouvements et audio</Text>
        <TouchableOpacity
          style={[styles.pickBtn, sourceVideo && styles.pickBtnActive]}
          onPress={pickSourceVideo}
          disabled={sourceVideo?.uploading}
        >
          {sourceVideo?.uploading ? (
            <ActivityIndicator color="#4361ee" />
          ) : (
            <Text style={styles.pickBtnText}>
              {sourceVideo ? `✓ ${sourceVideo.name}` : "Choisir une vidéo"}
            </Text>
          )}
        </TouchableOpacity>
        {sourceVideo?.uploading && (
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${sourceVideo.uploadProgress}%` }]} />
          </View>
        )}
      </View>

      {/* Target image */}
      <View style={styles.card}>
        <Text style={styles.label}>Photo de la personne cible</Text>
        <Text style={styles.hint}>JPEG ou PNG — portrait clair de préférence</Text>
        <TouchableOpacity
          style={[styles.pickBtn, targetImage && styles.pickBtnActive]}
          onPress={pickTargetImage}
          disabled={targetImage?.uploading}
        >
          {targetImage?.uploading ? (
            <ActivityIndicator color="#4361ee" />
          ) : (
            <Text style={styles.pickBtnText}>
              {targetImage ? `✓ ${targetImage.name}` : "Choisir une photo"}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Options */}
      <View style={styles.card}>
        <View style={styles.optionRow}>
          <Text style={styles.optionLabel}>Synchronisation labiale (Wav2Lip)</Text>
          <Switch
            value={lipSync}
            onValueChange={setLipSync}
            trackColor={{ true: "#4361ee", false: "#374151" }}
            thumbColor="#fff"
          />
        </View>
      </View>

      {/* Ethics */}
      <View style={styles.warningCard}>
        <Text style={styles.warningTitle}>Usage responsable</Text>
        <Text style={styles.warningText}>
          Je certifie utiliser cette technologie à des fins créatives ou éducatives uniquement, sans
          intention de tromper ou nuire à autrui.
        </Text>
        <TouchableOpacity
          style={styles.checkRow}
          onPress={() => setAccepted((v) => !v)}
        >
          <View style={[styles.checkbox, accepted && styles.checkboxChecked]}>
            {accepted && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.checkLabel}>J'accepte les conditions</Text>
        </TouchableOpacity>
      </View>

      {/* Submit */}
      <TouchableOpacity
        style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={!canSubmit}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitBtnText}>Lancer le remplacement →</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#030712" },
  content: { padding: 16, paddingBottom: 40 },
  hero: { paddingVertical: 24, alignItems: "center" },
  title: { fontSize: 26, fontWeight: "800", color: "#f9fafb", textAlign: "center", lineHeight: 34 },
  subtitle: { fontSize: 13, color: "#6b7280", textAlign: "center", marginTop: 8 },
  card: { backgroundColor: "#111827", borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "#1f2937" },
  label: { fontSize: 14, fontWeight: "600", color: "#e5e7eb", marginBottom: 4 },
  hint: { fontSize: 12, color: "#6b7280", marginBottom: 12 },
  pickBtn: { backgroundColor: "#1f2937", borderRadius: 12, padding: 14, alignItems: "center", borderWidth: 1, borderColor: "#374151" },
  pickBtnActive: { borderColor: "#4361ee", backgroundColor: "#1e1b4b" },
  pickBtnText: { color: "#d1d5db", fontSize: 14, fontWeight: "500" },
  progressTrack: { height: 4, backgroundColor: "#1f2937", borderRadius: 999, marginTop: 8, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: "#4361ee" },
  optionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  optionLabel: { color: "#d1d5db", fontSize: 14, flex: 1, marginRight: 8 },
  warningCard: { backgroundColor: "#1c1708", borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "#78350f" },
  warningTitle: { color: "#fbbf24", fontSize: 14, fontWeight: "700", marginBottom: 6 },
  warningText: { color: "#9ca3af", fontSize: 12, lineHeight: 18, marginBottom: 12 },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: "#fbbf24", alignItems: "center", justifyContent: "center" },
  checkboxChecked: { backgroundColor: "#fbbf24" },
  checkmark: { color: "#000", fontSize: 12, fontWeight: "800" },
  checkLabel: { color: "#d1d5db", fontSize: 13 },
  submitBtn: { backgroundColor: "#4361ee", borderRadius: 14, padding: 16, alignItems: "center", marginTop: 4 },
  submitBtnDisabled: { backgroundColor: "#1e2d6e", opacity: 0.5 },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
