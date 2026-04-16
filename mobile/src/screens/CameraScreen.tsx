import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Animated,
} from "react-native";
import { CameraView, CameraType, useCameraPermissions, useMicrophonePermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import type { StackScreenProps } from "@react-navigation/stack";
import type { RootStackParamList } from "@/navigation/AppNavigator";

type Props = StackScreenProps<RootStackParamList, "Camera">;

export default function CameraScreen({ navigation, route }: Props) {
  const { onRecorded } = route.params;
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [facing, setFacing] = useState<CameraType>("front");
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const cameraRef = useRef<CameraView>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const MAX_DURATION = 60; // 60 secondes max

  useEffect(() => {
    if (recording) {
      timerRef.current = setInterval(() => {
        setDuration((d) => {
          if (d + 1 >= MAX_DURATION) {
            stopRecording();
            return MAX_DURATION;
          }
          return d + 1;
        });
      }, 1000);

      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.3, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      clearInterval(timerRef.current);
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
      setDuration(0);
    }
    return () => clearInterval(timerRef.current);
  }, [recording]);

  // Request permissions
  useEffect(() => {
    (async () => {
      if (!cameraPermission?.granted) await requestCameraPermission();
      if (!micPermission?.granted) await requestMicPermission();
    })();
  }, []);

  if (!cameraPermission?.granted || !micPermission?.granted) {
    return (
      <View style={styles.permissionScreen}>
        <Text style={styles.permissionText}>
          Accès à la caméra et au microphone requis.
        </Text>
        <TouchableOpacity
          style={styles.permissionBtn}
          onPress={async () => {
            await requestCameraPermission();
            await requestMicPermission();
          }}
        >
          <Text style={styles.permissionBtnText}>Autoriser</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const startRecording = async () => {
    if (!cameraRef.current || recording) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setRecording(true);
    try {
      const video = await cameraRef.current.recordAsync({
        maxDuration: MAX_DURATION,
      });
      if (video?.uri) {
        onRecorded(video.uri);
        navigation.goBack();
      }
    } catch (e) {
      Alert.alert("Erreur", "Impossible d'enregistrer la vidéo.");
      setRecording(false);
    }
  };

  const stopRecording = () => {
    if (!cameraRef.current || !recording) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    cameraRef.current.stopRecording();
    setRecording(false);
  };

  const formatDuration = (sec: number) =>
    `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
        mode="video"
        videoQuality="1080p"
      >
        {/* Timer */}
        {recording && (
          <View style={styles.timerBadge}>
            <Animated.View style={[styles.recDot, { transform: [{ scale: pulseAnim }] }]} />
            <Text style={styles.timerText}>{formatDuration(duration)}</Text>
          </View>
        )}

        {/* Progress bar */}
        {recording && (
          <View style={styles.durationBar}>
            <View
              style={[styles.durationFill, { width: `${(duration / MAX_DURATION) * 100}%` as any }]}
            />
          </View>
        )}

        {/* Hint */}
        {!recording && (
          <View style={styles.hint}>
            <Text style={styles.hintText}>Max 60 secondes · Appuyez pour filmer</Text>
          </View>
        )}

        {/* Controls */}
        <View style={styles.controls}>
          {/* Flip */}
          <TouchableOpacity
            style={styles.flipBtn}
            onPress={() => setFacing((f) => (f === "front" ? "back" : "front"))}
          >
            <Text style={styles.flipIcon}>🔄</Text>
          </TouchableOpacity>

          {/* Record */}
          <TouchableOpacity
            onPress={recording ? stopRecording : startRecording}
            style={styles.recordBtnOuter}
          >
            {recording ? (
              <View style={styles.stopBtn}>
                <View style={styles.stopSquare} />
              </View>
            ) : (
              <View style={styles.recordBtn}>
                <View style={styles.recordDot} />
              </View>
            )}
          </TouchableOpacity>

          {/* Cancel */}
          <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelIcon}>✕</Text>
          </TouchableOpacity>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  camera: { flex: 1, justifyContent: "flex-end" },
  permissionScreen: { flex: 1, backgroundColor: "#030712", alignItems: "center", justifyContent: "center", padding: 32 },
  permissionText: { color: "#94a3b8", fontSize: 16, textAlign: "center", marginBottom: 24 },
  permissionBtn: { backgroundColor: "#4361ee", paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14 },
  permissionBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  timerBadge: { position: "absolute", top: 60, alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(0,0,0,0.6)", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  recDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#ef4444" },
  timerText: { color: "#fff", fontSize: 18, fontWeight: "800", fontVariant: ["tabular-nums"] },
  durationBar: { position: "absolute", top: 100, left: 20, right: 20, height: 3, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 2 },
  durationFill: { height: "100%", backgroundColor: "#ef4444", borderRadius: 2 },
  hint: { position: "absolute", top: 60, alignSelf: "center", backgroundColor: "rgba(0,0,0,0.5)", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  hintText: { color: "#cbd5e1", fontSize: 13 },
  controls: { flexDirection: "row", alignItems: "center", justifyContent: "space-around", paddingBottom: 50, paddingTop: 20, backgroundColor: "rgba(0,0,0,0.4)" },
  flipBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  flipIcon: { fontSize: 24 },
  recordBtnOuter: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: "#fff", alignItems: "center", justifyContent: "center" },
  recordBtn: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#ef4444", alignItems: "center", justifyContent: "center" },
  recordDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: "#fff" },
  stopBtn: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#ef4444", alignItems: "center", justifyContent: "center" },
  stopSquare: { width: 22, height: 22, borderRadius: 4, backgroundColor: "#fff" },
  cancelBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  cancelIcon: { color: "#fff", fontSize: 20, fontWeight: "700" },
});
