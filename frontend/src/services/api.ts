import axios from "axios";
import type { UploadResponse, JobCreate, JobResponse, JobOptions } from "@/types";

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/v1`
  : "/api/v1";

const http = axios.create({ baseURL: API_BASE });

// ─── Media ────────────────────────────────────────────────────────────────────

export async function uploadFile(
  file: File,
  mediaType: "source_video" | "target_image",
  onProgress?: (percent: number) => void
): Promise<UploadResponse> {
  const form = new FormData();
  form.append("file", file);
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

export interface CreateJobPayload {
  source_video_id: string;
  target_image_id: string;
  options?: Partial<JobOptions>;
}

export async function createJob(payload: CreateJobPayload): Promise<JobResponse> {
  const { data } = await http.post<JobResponse>("/jobs", {
    source_video_id: payload.source_video_id,
    target_image_id: payload.target_image_id,
    options: {
      relative_motion: true,
      adapt_movement_scale: true,
      lip_sync: true,
      enhance_face: false,
      ...payload.options,
    },
  });
  return data;
}

export async function getJob(jobId: string): Promise<JobResponse> {
  const { data } = await http.get<JobResponse>(`/jobs/${jobId}`);
  return data;
}

// ─── WebSocket helpers ────────────────────────────────────────────────────────

export function buildWsUrl(jobId: string): string {
  const apiUrl = import.meta.env.VITE_API_URL || window.location.origin;
  const wsBase = apiUrl.replace(/^http/, "ws");
  return `${wsBase}/ws/jobs/${jobId}`;
}
