import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import * as Haptics from "expo-haptics";
import type { StackScreenProps } from "@react-navigation/stack";
import type { RootStackParamList } from "@/navigation/AppNavigator";
import { StorageService } from "@/services/storage";
import { checkHealth } from "@/services/api";

type Props = StackScreenProps<RootStackParamList, "Settings">;

export default function SettingsScreen({ navigation }: Props) {
  const [apiUrl, setApiUrl] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<boolean | null>(null);

  useEffect(() => {
    StorageService.getApiUrl().then(setApiUrl);
  }, []);

  const handleSave = async () => {
    if (!apiUrl.trim()) {
      Alert.alert("Erreur", "L'URL ne peut pas être vide.");
      return;
    }
    try {
      new URL(apiUrl.trim());
    } catch {
      Alert.alert("URL invalide", "Exemple : http://192.168.1.100:8000");
      return;
    }
    await StorageService.setApiUrl(apiUrl.trim());
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Sauvegardé", "L'URL du serveur a été mise à jour.", [
      { text: "OK", onPress: () => navigation.goBack() },
    ]);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    await StorageService.setApiUrl(apiUrl.trim());
    const ok = await checkHealth();
    setTestResult(ok);
    setTesting(false);
    Haptics.notificationAsync(
      ok ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Serveur backend</Text>
        <Text style={styles.sectionDesc}>
          Entrez l'adresse IP de votre serveur (ou domaine en production).
          L'appareil et le serveur doivent être sur le même réseau.
        </Text>

        <Text style={styles.label}>URL du serveur</Text>
        <TextInput
          style={styles.input}
          value={apiUrl}
          onChangeText={setApiUrl}
          placeholder="http://192.168.1.100:8000"
          placeholderTextColor="#475569"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          selectionColor="#4361ee"
        />

        <Text style={styles.hint}>
          Exemples :{"\n"}
          • Local : http://192.168.1.100:8000{"\n"}
          • Production : https://api.mondomaine.com
        </Text>

        {/* Test result */}
        {testResult !== null && (
          <View style={[styles.testBadge, { backgroundColor: testResult ? "#14532d" : "#7f1d1d" }]}>
            <Text style={[styles.testText, { color: testResult ? "#4ade80" : "#f87171" }]}>
              {testResult
                ? "✓ Serveur accessible et fonctionnel"
                : "✕ Serveur inaccessible — vérifiez l'URL et la connexion réseau"}
            </Text>
          </View>
        )}

        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.testBtn} onPress={handleTest} disabled={testing}>
            {testing ? (
              <ActivityIndicator color="#4361ee" size="small" />
            ) : (
              <Text style={styles.testBtnText}>Tester la connexion</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>Sauvegarder</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* About */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>À propos</Text>
        <View style={styles.aboutCard}>
          {[
            ["Application", "Deepfake OTOP v1.0.0"],
            ["Pipeline IA", "First Order Motion Model + Wav2Lip"],
            ["Moteur vidéo", "OpenCV + FFmpeg"],
            ["Backend", "Python FastAPI + Celery"],
          ].map(([key, val]) => (
            <View key={key} style={styles.aboutRow}>
              <Text style={styles.aboutKey}>{key}</Text>
              <Text style={styles.aboutVal}>{val}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          Cette application est destinée à un usage créatif, éducatif et de production
          audiovisuelle uniquement. L'utilisation à des fins trompeuses ou malveillantes est
          interdite et potentiellement illégale.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#030712" },
  content: { padding: 16, paddingBottom: 48 },
  section: { marginBottom: 24 },
  sectionTitle: { color: "#e2e8f0", fontSize: 17, fontWeight: "800", marginBottom: 6 },
  sectionDesc: { color: "#64748b", fontSize: 13, lineHeight: 20, marginBottom: 16 },
  label: { color: "#94a3b8", fontSize: 12, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8 },
  input: { backgroundColor: "#0f172a", color: "#e2e8f0", borderRadius: 14, padding: 14, fontSize: 15, borderWidth: 1.5, borderColor: "#1e293b", fontFamily: "monospace" },
  hint: { color: "#334155", fontSize: 12, marginTop: 10, lineHeight: 18 },
  testBadge: { borderRadius: 10, padding: 12, marginTop: 14 },
  testText: { fontSize: 13, fontWeight: "600" },
  btnRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  testBtn: { flex: 1, backgroundColor: "#0f172a", borderRadius: 14, padding: 14, alignItems: "center", borderWidth: 1.5, borderColor: "#4361ee60" },
  testBtnText: { color: "#4361ee", fontSize: 14, fontWeight: "700" },
  saveBtn: { flex: 1, backgroundColor: "#4361ee", borderRadius: 14, padding: 14, alignItems: "center" },
  saveBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  aboutCard: { backgroundColor: "#0f172a", borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: "#1e293b" },
  aboutRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 14, borderBottomWidth: 1, borderBottomColor: "#1e293b" },
  aboutKey: { color: "#64748b", fontSize: 13 },
  aboutVal: { color: "#cbd5e1", fontSize: 13, fontWeight: "600", textAlign: "right", flex: 1, marginLeft: 12 },
  disclaimer: { backgroundColor: "#0c0a00", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#78350f50" },
  disclaimerText: { color: "#78350f", fontSize: 12, lineHeight: 18, textAlign: "center" },
});
