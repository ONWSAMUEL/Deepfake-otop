import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  BackHandler,
  Alert,
  StyleSheet,
  Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { StackScreenProps } from "@react-navigation/stack";
import type { RootStackParamList } from "@/navigation/AppNavigator";
import ProgressBar from "@/components/ProgressBar";
import StepIndicator from "@/components/StepIndicator";
import { useJobWebSocket } from "@/hooks/useJobWebSocket";

type Props = StackScreenProps<RootStackParamList, "Processing">;

export default function ProcessingScreen({ navigation, route }: Props) {
  const { jobId } = route.params;
  const { job } = useJobWebSocket(jobId);
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Rotating gear animation
  useEffect(() => {
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 4000,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const spin = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  // Block back navigation during processing
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      Alert.alert(
        "Traitement en cours",
        "Le traitement IA est en cours. Souhaitez-vous vraiment abandonner ?",
        [
          { text: "Continuer le traitement", style: "cancel" },
          {
            text: "Abandonner",
            onPress: () => navigation.popToTop(),
            style: "destructive",
          },
        ]
      );
      return true;
    });
    return () => sub.remove();
  }, [navigation]);

  // Auto-navigate on completion
  useEffect(() => {
    if (job?.status === "completed" && job.result_url) {
      navigation.replace("Result", { jobId, resultUrl: job.result_url });
    }
  }, [job?.status, job?.result_url]);

  const progress = job?.progress?.progress ?? 0;
  const step = job?.progress?.step || "Initialisation...";
  const message = job?.progress?.message || "";
  const isFailed = job?.status === "failed";

  if (isFailed) {
    return (
      <View style={styles.errorScreen}>
        <Text style={styles.errorEmoji}>⚠️</Text>
        <Text style={styles.errorTitle}>Traitement échoué</Text>
        <Text style={styles.errorMsg}>{job?.error || "Erreur inconnue"}</Text>
        <TouchableOpacity
          style={styles.retryBtn}
          onPress={() => navigation.popToTop()}
        >
          <Text style={styles.retryText}>Recommencer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header gradient */}
      <LinearGradient colors={["#0f0c29", "#030712"]} style={styles.headerBg}>
        {/* Animated gear */}
        <Animated.Text style={[styles.gearIcon, { transform: [{ rotate: spin }] }]}>
          ⚙️
        </Animated.Text>
        <Text style={styles.title}>Traitement en cours</Text>
        <Text style={styles.subtitle}>
          L'IA analyse et transforme votre vidéo.{"\n"}Cela peut prendre quelques minutes.
        </Text>
      </LinearGradient>

      {/* Progress card */}
      <View style={styles.card}>
        <ProgressBar
          progress={progress}
          step={step}
          message={message}
          color="#4361ee"
        />
      </View>

      {/* Pipeline steps */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Étapes du pipeline IA</Text>
        <StepIndicator currentStepLabel={step} />
      </View>

      {/* Info box */}
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          🤖 <Text style={styles.infoBold}>FOMM</Text> transfère les mouvements et gestes{"\n"}
          👄 <Text style={styles.infoBold}>Wav2Lip</Text> synchronise les lèvres avec l'audio
        </Text>
      </View>

      <Text style={styles.jobId}>Job ID : {jobId}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#030712" },
  content: { paddingBottom: 40 },
  headerBg: { alignItems: "center", paddingTop: 40, paddingBottom: 32, paddingHorizontal: 20 },
  gearIcon: { fontSize: 56, marginBottom: 16 },
  title: { color: "#f1f5f9", fontSize: 22, fontWeight: "800", textAlign: "center" },
  subtitle: { color: "#64748b", fontSize: 14, textAlign: "center", marginTop: 8, lineHeight: 22 },
  card: { backgroundColor: "#0f172a", borderRadius: 20, margin: 16, marginBottom: 0, padding: 20, borderWidth: 1, borderColor: "#1e293b" },
  cardTitle: { color: "#94a3b8", fontSize: 12, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 16 },
  infoBox: { margin: 16, padding: 16, backgroundColor: "#0f172a", borderRadius: 16, borderWidth: 1, borderColor: "#1e293b" },
  infoText: { color: "#64748b", fontSize: 13, lineHeight: 22 },
  infoBold: { color: "#94a3b8", fontWeight: "700" },
  jobId: { textAlign: "center", color: "#1e293b", fontSize: 11, marginTop: 16 },
  errorScreen: { flex: 1, backgroundColor: "#030712", alignItems: "center", justifyContent: "center", padding: 32 },
  errorEmoji: { fontSize: 56, marginBottom: 16 },
  errorTitle: { color: "#f87171", fontSize: 22, fontWeight: "800", marginBottom: 8 },
  errorMsg: { color: "#64748b", fontSize: 14, textAlign: "center", marginBottom: 32, lineHeight: 22 },
  retryBtn: { backgroundColor: "#4361ee", paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14 },
  retryText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
