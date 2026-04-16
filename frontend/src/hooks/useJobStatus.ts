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
  // M27: Track whether a reconnect attempt is already pending to avoid
  // multiple simultaneous reconnect timers after repeated errors.
  const isReconnectingRef = useRef(false);

  const connect = useCallback(() => {
    if (!jobId) return;

    const url = buildWsUrl(jobId);
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      isReconnectingRef.current = false;
    };

    ws.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data);

        if (msg.type === "progress") {
          setJob((prev) => ({
            // M26: Guard against null prev — spread an empty object fallback
            ...(prev ?? {}),
            id: jobId,
            status: "processing" as const,
            progress: {
              step: msg.step || "",
              progress: msg.progress ?? 0,
              message: msg.message || "",
            },
            result_url: prev?.result_url ?? null,
            error: prev?.error ?? null,
            created_at: prev?.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as JobResponse));
        } else if (msg.type === "completed") {
          setJob((prev) => ({
            ...(prev ?? {}),
            id: jobId,
            status: "completed" as const,
            progress: { step: "Terminé", progress: 100, message: "" },
            result_url: msg.result_url || null,
            error: null,
            created_at: prev?.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as JobResponse));
          ws.close();
        } else if (msg.type === "error") {
          setJob((prev) => ({
            ...(prev ?? {}),
            id: jobId,
            status: "failed" as const,
            error: msg.error || "Erreur inconnue",
            created_at: prev?.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as JobResponse));
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
      // M27: Only schedule one reconnect at a time
      if (isReconnectingRef.current) return;
      isReconnectingRef.current = true;
      // Fallback: poll via REST if WS unavailable
      reconnectRef.current = setTimeout(async () => {
        try {
          const latest = await getJob(jobId);
          setJob(latest);
          if (latest.status !== "pending" && latest.status !== "processing") {
            isReconnectingRef.current = false;
            return;
          }
          connect();
        } catch {
          isReconnectingRef.current = false;
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
