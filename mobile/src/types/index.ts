export type JobStatus = "pending" | "processing" | "completed" | "failed";

export interface UploadResponse {
  file_id: string;
  filename: string;
  size_bytes: number;
  media_type: string;
  url: string;
}

export interface JobResponse {
  id: string;
  status: JobStatus;
  progress: {
    step: string;
    progress: number;
    message: string;
  };
  result_url: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}
