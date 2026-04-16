import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Cpu, AlertCircle } from "lucide-react";
import { useJobStatus } from "@/hooks/useJobStatus";

const STEPS = [
  "Extraction de l'audio",
  "Extraction des frames",
  "Animation FOMM (transfert de mouvements)",
  "Synchronisation labiale (Wav2Lip)",
  "Reconstruction de la vidéo",
  "Sauvegarde du résultat",
];

export default function Processing() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { job } = useJobStatus(jobId || null);

  useEffect(() => {
    if (job?.status === "completed") {
      navigate(`/result/${jobId}`, { replace: true });
    }
  }, [job?.status, jobId, navigate]);

  const progress = job?.progress?.progress ?? 0;
  const currentStep = job?.progress?.step || "Démarrage...";
  const message = job?.progress?.message || "";
  const isFailed = job?.status === "failed";

  return (
    <div className="max-w-xl mx-auto px-4 py-16">
      <div className="card text-center space-y-8">
        {isFailed ? (
          <>
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle size={32} className="text-red-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-red-400 mb-2">Traitement échoué</h2>
              <p className="text-sm text-gray-400">{job?.error || "Erreur inconnue"}</p>
            </div>
            <button onClick={() => navigate("/")} className="btn-secondary">
              Recommencer
            </button>
          </>
        ) : (
          <>
            {/* Animated icon */}
            <div className="w-20 h-20 bg-primary-500/10 rounded-full flex items-center justify-center mx-auto">
              <Cpu size={38} className="text-primary-400 animate-pulse" />
            </div>

            <div>
              <h2 className="text-2xl font-semibold mb-1">Traitement en cours</h2>
              <p className="text-gray-400 text-sm">Cela peut prendre quelques minutes selon la durée de la vidéo</p>
            </div>

            {/* Progress bar */}
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-300 truncate max-w-xs">{currentStep}</span>
                <span className="text-primary-400 font-semibold ml-2">{progress}%</span>
              </div>
              <div className="h-2.5 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full transition-all duration-700"
                  style={{ width: `${progress}%` }}
                />
              </div>
              {message && (
                <p className="text-xs text-gray-500">{message}</p>
              )}
            </div>

            {/* Steps list */}
            <div className="text-left space-y-2">
              {STEPS.map((step) => {
                const idx = STEPS.indexOf(step);
                const currentIdx = STEPS.findIndex((s) => currentStep.includes(s.split(" ")[0]));
                const done = idx < currentIdx || (idx === currentIdx && progress > 20);
                const active = step === currentStep || currentStep.includes(step.split(" ")[0]);

                return (
                  <div key={step} className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold transition-colors
                      ${done ? "bg-green-500 text-white" : active ? "bg-primary-500 text-white animate-pulse" : "bg-gray-700 text-gray-500"}`}>
                      {done ? "✓" : idx + 1}
                    </div>
                    <span className={`text-sm transition-colors ${active ? "text-gray-100 font-medium" : done ? "text-gray-400" : "text-gray-600"}`}>
                      {step}
                    </span>
                  </div>
                );
              })}
            </div>

            <p className="text-xs text-gray-600">Job ID: {jobId}</p>
          </>
        )}
      </div>
    </div>
  );
}
