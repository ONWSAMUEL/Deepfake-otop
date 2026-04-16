import { useState, useEffect, useRef, useCallback } from "react";
import { buildWsUrl, getJob } from "@/services/api";
import type { JobResponse, WSMessage } from "@/types";

interface UseJobStatusResult {
  job: JobResponse | null;
  isConnected: boolean;
}

export function useJobStatus(jobId: string | null): UseJobStatusResult {
  const [job, setJob] = useState<JobResponse | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout>>();

  const connect = useCallback(() => {
    if (!jobId) return;

    const url = buildWsUrl(jobId);
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data);

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
          setJob((prev) => ({
            ...(prev as JobResponse),
            status: "completed",
            progress: { step: "Terminé", progress: 100, message: "" },
            result_url: msg.result_url || null,
            updated_at: new Date().toISOString(),
          }));
          ws.close();
        } else if (msg.type === "error") {
          setJob((prev) => ({
            ...(prev as JobResponse),
            status: "failed",
            error: msg.error || "Erreur inconnue",
            updated_at: new Date().toISOString(),
          }));
          ws.close();
        }
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    ws.onerror = () => {
      setIsConnected(false);
      // Fallback: poll via REST if WS unavailable
      reconnectRef.current = setTimeout(async () => {
        try {
          const latest = await getJob(jobId);
          setJob(latest);
          if (latest.status !== "pending" && latest.status !== "processing") return;
          connect();
        } catch {
          // ignore
        }
      }, 3000);
    };
  }, [jobId]);

  useEffect(() => {
    if (!jobId) return;

    // Fetch initial state
    getJob(jobId).then(setJob).catch(() => {});
    connect();

    return () => {
      clearTimeout(reconnectRef.current);
      wsRef.current?.close();
    };
  }, [jobId, connect]);

  return { job, isConnected };
}
