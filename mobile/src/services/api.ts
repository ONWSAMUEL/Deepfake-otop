import axios from "axios";
import { StorageService } from "./storage";
import type { UploadResponse, JobResponse } from "@/types";

// Build axios instance with dynamic base URL
async function getHttp() {
  const apiUrl = await StorageService.getApiUrl();
  return axios.create({
    baseURL: `${apiUrl}/api/v1`,
    timeout: 60_000,
  });
}

// ─── Media upload ─────────────────────────────────────────────────────────────

export async function uploadMedia(
  uri: string,
  filename: string,
  mimeType: string,
  mediaType: "source_video" | "target_image",
  onProgress?: (percent: number) => void
): Promise<UploadResponse> {
  const http = await getHttp();
  const form = new FormData();
  // React Native FormData requires { uri, name, type }
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
  const http = await getHttp();
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
  const http = await getHttp();
  const { data } = await http.get<JobResponse>(`/jobs/${jobId}`);
  return data;
}

// ─── WebSocket URL ────────────────────────────────────────────────────────────

export async function buildWsUrl(jobId: string): Promise<string> {
  const apiUrl = await StorageService.getApiUrl();
  const wsBase = apiUrl.replace(/^http/, "ws");
  return `${wsBase}/ws/jobs/${jobId}`;
}

// ─── Health check ─────────────────────────────────────────────────────────────

export async function checkHealth(): Promise<boolean> {
  try {
    const apiUrl = await StorageService.getApiUrl();
    const { data } = await axios.get(`${apiUrl}/health`, { timeout: 5000 });
    return data?.status === "ok";
  } catch {
    return false;
  }
}
