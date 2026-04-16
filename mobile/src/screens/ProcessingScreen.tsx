import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  BackHandler,
  Alert,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import type { StackScreenProps } from "@react-navigation/stack";
import type { RootStackParamList } from "@/navigation/AppNavigator";
import ProgressBar from "@/components/ProgressBar";
import { buildWsUrl, pollJob } from "@/services/api";
import type { JobResponse } from "@/types";

type Props = StackScreenProps<RootStackParamList, "Processing">;

const STEPS = [
  "Extraction de l'audio",
  "Extraction des frames",
  "Animation FOMM",
  "Synchronisation labiale",
  "Reconstruction vidéo",
  "Sauvegarde",
];

export default function ProcessingScreen({ navigation, route }: Props) {
  const { jobId } = route.params;
  const [job, setJob] = useState<JobResponse | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval>>();

  // Block back navigation during processing
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      Alert.alert(
        "Traitement en cours",
        "Le traitement est en cours. Souhaitez-vous vraiment quitter ?",
        [
          { text: "Continuer", style: "cancel" },
          { text: "Quitter", onPress: () => navigation.popToTop(), style: "destructive" },
        ]
      );
      return true;
    });
    return () => sub.remove();
  }, [navigation]);

  useEffect(() => {
    const wsUrl = buildWsUrl(jobId);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === "progress") {
          setJob((prev) => ({
            ...(prev as JobResponse),
            id: jobId,
            status: "processing",
            progress: {
              step: msg.step || "",
              progress: msg.progress ?? 0,
              message: msg.message || "",
            },
            result_url: null,
            error: null,
            created_at: prev?.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }));
        } else if (msg.type === "completed") {
          ws.close();
          navigation.replace("Result", {
            jobId,
            resultUrl: msg.result_url || "",
          });
        } else if (msg.type === "error") {
          ws.close();
          setJob((prev) => ({
            ...(prev as JobResponse),
            status: "failed",
            error: msg.error,
            updated_at: new Date().toISOString(),
          }));
        }
      } catch {
        // ignore
      }
    };

    // Fallback polling if WS fails
    ws.onerror = () => {
      pollRef.current = setInterval(async () => {
        try {
          const latest = await pollJob(jobId);
          setJob(latest);
          if (latest.status === "completed") {
            clearInterval(pollRef.current);
            navigation.replace("Result", {
              jobId,
              resultUrl: latest.result_url || "",
            });
          } else if (latest.status === "failed") {
            clearInterval(pollRef.current);
          }
        } catch {
          // ignore
        }
      }, 3000);
    };

    return () => {
      wsRef.current?.close();
      clearInterval(pollRef.current);
    };
  }, [jobId, navigation]);

  const progress = job?.progress?.progress ?? 0;
  const step = job?.progress?.step || "Démarrage...";
  const isFailed = job?.status === "failed";

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <StatusBar style="light" />

      {isFailed ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Traitement échoué</Text>
          <Text style={styles.errorText}>{job?.error || "Erreur inconnue"}</Text>
          <Text
            style={styles.retryLink}
            onPress={() => navigation.popToTop()}
          >
            Recommencer →
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.iconWrap}>
            <Text style={styles.icon}>⚙️</Text>
          </View>

          <Text style={styles.title}>Traitement en cours</Text>
          <Text style={styles.subtitle}>
            Cela peut prendre quelques minutes selon la durée de la vidéo
          </Text>

          <View style={styles.card}>
            <ProgressBar
              progress={progress}
              step={step}
              message={job?.progress?.message}
            />
          </View>

          {/* Step list */}
          <View style={styles.stepsCard}>
            {STEPS.map((s, idx) => {
              const currentIdx = STEPS.findIndex((x) => step.includes(x.split(" ")[0]));
              const done = idx < currentIdx;
              const active = idx === currentIdx;
              return (
                <View key={s} style={styles.stepRow}>
                  <View style={[styles.stepDot,
                    done && styles.stepDotDone,
                    active && styles.stepDotActive]}>
                    <Text style={styles.stepDotText}>
                      {done ? "✓" : `${idx + 1}`}
                    </Text>
                  </View>
                  <Text style={[styles.stepLabel,
                    done && styles.stepLabelDone,
                    active && styles.stepLabelActive]}>
                    {s}
                  </Text>
                </View>
              );
            })}
          </View>

          <Text style={styles.jobId}>Job: {jobId}</Text>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#030712" },
  content: { padding: 20, paddingBottom: 40, alignItems: "center" },
  iconWrap: { width: 80, height: 80, backgroundColor: "#1e1b4b", borderRadius: 40, alignItems: "center", justifyContent: "center", marginVertical: 24 },
  icon: { fontSize: 36 },
  title: { fontSize: 22, fontWeight: "800", color: "#f9fafb", textAlign: "center" },
  subtitle: { fontSize: 13, color: "#6b7280", textAlign: "center", marginTop: 8, marginBottom: 24 },
  card: { backgroundColor: "#111827", borderRadius: 16, padding: 20, width: "100%", marginBottom: 16, borderWidth: 1, borderColor: "#1f2937" },
  stepsCard: { backgroundColor: "#111827", borderRadius: 16, padding: 16, width: "100%", borderWidth: 1, borderColor: "#1f2937" },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 },
  stepDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: "#374151", alignItems: "center", justifyContent: "center" },
  stepDotDone: { backgroundColor: "#22c55e" },
  stepDotActive: { backgroundColor: "#4361ee" },
  stepDotText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  stepLabel: { color: "#6b7280", fontSize: 13 },
  stepLabelDone: { color: "#9ca3af" },
  stepLabelActive: { color: "#f3f4f6", fontWeight: "600" },
  jobId: { marginTop: 16, color: "#374151", fontSize: 11 },
  errorCard: { backgroundColor: "#1f0a0a", borderRadius: 16, padding: 20, borderWidth: 1, borderColor: "#7f1d1d", marginTop: 32, width: "100%" },
  errorTitle: { color: "#f87171", fontSize: 18, fontWeight: "700", marginBottom: 8 },
  errorText: { color: "#9ca3af", fontSize: 13, marginBottom: 16 },
  retryLink: { color: "#4361ee", fontSize: 14, fontWeight: "600" },
});
