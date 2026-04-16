export type MediaType = "source_video" | "target_image";
export type JobStatus = "pending" | "processing" | "completed" | "failed";

export interface UploadResponse {
  file_id: string;
  filename: string;
  size_bytes: number;
  media_type: MediaType;
  url: string;
}

export interface JobOptions {
  relative_motion: boolean;
  adapt_movement_scale: boolean;
  lip_sync: boolean;
  enhance_face: boolean;
}

export interface JobProgress {
  step: string;
  progress: number;
  message: string;
}

export interface JobResponse {
  id: string;
  status: JobStatus;
  progress: JobProgress;
  result_url: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

export interface WSMessage {
  type: "progress" | "completed" | "error";
  job_id: string;
  step?: string;
  progress?: number;
  message?: string;
  result_url?: string;
  error?: string;
}
