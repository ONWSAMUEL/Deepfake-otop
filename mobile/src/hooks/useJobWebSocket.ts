import { useState, useEffect, useRef } from "react";
import { buildWsUrl, pollJob } from "@/services/api";
import type { JobResponse } from "@/types";

interface UseJobWebSocketResult {
  job: JobResponse | null;
  isConnected: boolean;
}

export function useJobWebSocket(jobId: string): UseJobWebSocketResult {
  const [job, setJob] = useState<JobResponse | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval>>();

  // Polling fallback when WebSocket is unavailable
  const startPolling = () => {
    clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const latest = await pollJob(jobId);
        setJob(latest);
        if (latest.status === "completed" || latest.status === "failed") {
          clearInterval(pollRef.current);
        }
      } catch {
        // ignore transient errors
      }
    }, 3000);
  };

  const connect = async () => {
    try {
      const url = await buildWsUrl(jobId);
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => setIsConnected(true);

      ws.onmessage = ({ data: raw }) => {
        try {
          const msg = JSON.parse(raw);
          if (msg.type === "progress") {
            setJob((prev) => ({
              ...(prev as JobResponse),
              id: jobId,
              status: "processing",
              progress: {
                step: msg.step ?? "",
                progress: msg.progress ?? 0,
                message: msg.message ?? "",
              },
              result_url: null,
              error: null,
              created_at: prev?.created_at ?? new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }));
          } else if (msg.type === "completed") {
            setJob((prev) => ({
              ...(prev as JobResponse),
              status: "completed",
              progress: { step: "Terminé", progress: 100, message: "" },
              result_url: msg.result_url ?? null,
              updated_at: new Date().toISOString(),
            }));
            ws.close();
          } else if (msg.type === "error") {
            setJob((prev) => ({
              ...(prev as JobResponse),
              status: "failed",
              error: msg.error ?? "Erreur inconnue",
              updated_at: new Date().toISOString(),
            }));
            ws.close();
          }
        } catch {
          // ignore
        }
      };

      ws.onerror = () => {
        setIsConnected(false);
        startPolling();
      };

      ws.onclose = () => setIsConnected(false);
    } catch {
      startPolling();
    }
  };

  useEffect(() => {
    // Initial state fetch
    pollJob(jobId).then(setJob).catch(() => {});
    connect();

    return () => {
      wsRef.current?.close();
      clearInterval(pollRef.current);
    };
  }, [jobId]);

  return { job, isConnected };
}
