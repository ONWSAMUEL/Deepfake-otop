import axios from "axios";
import type { UploadResponse, JobResponse } from "@/types";

// Change to your backend URL (local dev or production)
const API_BASE = process.env.EXPO_PUBLIC_API_URL
  ? `${process.env.EXPO_PUBLIC_API_URL}/api/v1`
  : "http://localhost:8000/api/v1";

const http = axios.create({ baseURL: API_BASE, timeout: 30000 });

// ─── Upload ───────────────────────────────────────────────────────────────────

export async function uploadMedia(
  uri: string,
  filename: string,
  mimeType: string,
  mediaType: "source_video" | "target_image",
  onProgress?: (percent: number) => void
): Promise<UploadResponse> {
  const form = new FormData();
  // React Native FormData accepts { uri, name, type }
  form.append("file", { uri, name: filename, type: mimeType } as any);
  form.append("media_type", mediaType);

  const { data } = await http.post<UploadResponse>("/media/upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (e) => {
      if (onProgress && e.total) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    },
  });
  return data;
}

// ─── Jobs ─────────────────────────────────────────────────────────────────────

export async function createJob(
  sourceVideoId: string,
  targetImageId: string,
  lipSync: boolean = true
): Promise<JobResponse> {
  const { data } = await http.post<JobResponse>("/jobs", {
    source_video_id: sourceVideoId,
    target_image_id: targetImageId,
    options: {
      relative_motion: true,
      adapt_movement_scale: true,
      lip_sync: lipSync,
      enhance_face: false,
    },
  });
  return data;
}

export async function pollJob(jobId: string): Promise<JobResponse> {
  const { data } = await http.get<JobResponse>(`/jobs/${jobId}`);
  return data;
}

// ─── WebSocket URL ────────────────────────────────────────────────────────────

export function buildWsUrl(jobId: string): string {
  const base = (process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000")
    .replace(/^http/, "ws");
  return `${base}/ws/jobs/${jobId}`;
}
