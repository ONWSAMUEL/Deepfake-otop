import axios, { type AxiosInstance } from "axios";
import { StorageService } from "./storage";
import type { UploadResponse, JobResponse } from "@/types";

// M28: Cache the axios instance per API URL to avoid creating a new instance
// (and re-reading AsyncStorage) on every single API call.
let _cachedHttp: AxiosInstance | null = null;
let _cachedApiUrl: string | null = null;

async function getHttp(): Promise<AxiosInstance> {
  const apiUrl = await StorageService.getApiUrl();
  // Invalidate cache if the URL has changed (user updated settings)
  if (_cachedHttp && _cachedApiUrl === apiUrl) {
    return _cachedHttp;
  }
  _cachedHttp = axios.create({
    baseURL: `${apiUrl}/api/v1`,
    timeout: 60_000,
  });
  _cachedApiUrl = apiUrl;
  return _cachedHttp;
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
    },
  });
  return data;
}

export async function getJob(jobId: string): Promise<JobResponse> {
  const http = await getHttp();
  const { data } = await http.get<JobResponse>(`/jobs/${jobId}`);
  return data;
}

export async function pollJob(jobId: string): Promise<JobResponse> {
  return getJob(jobId);
}

// ─── WebSocket URL ────────────────────────────────────────────────────────────

export function buildWsUrl(jobId: string): string {
  // Synchronous — uses cached URL; caller must have called getHttp() first
  const apiUrl = _cachedApiUrl ?? "http://localhost:8000";
  const wsBase = apiUrl.replace(/^http/, "ws");
  return `${wsBase}/ws/jobs/${jobId}`;
}

// ─── Health check ─────────────────────────────────────────────────────────────

export async function checkHealth(apiUrl?: string): Promise<boolean> {
  try {
    const url = apiUrl ?? (await StorageService.getApiUrl());
    const { data } = await axios.get(`${url}/health`, { timeout: 5000 });
    return data?.status === "ok";
  } catch {
    return false;
  }
}
