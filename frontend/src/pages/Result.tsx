import { useParams, useNavigate } from "react-router-dom";
import { Download, RotateCcw, Share2 } from "lucide-react";
import { useJobStatus } from "@/hooks/useJobStatus";

export default function Result() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { job } = useJobStatus(jobId || null);

  const resultUrl = job?.result_url;

  if (!resultUrl) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-400">Chargement du résultat...</p>
      </div>
    );
  }

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = resultUrl;
    a.download = `deepfake_${jobId?.slice(0, 8)}.mp4`;
    a.click();
  };

  const handleShare = async () => {
    // m14: Wrap in try/catch — navigator.share() throws AbortError if the user
    // dismisses the share sheet, and NotAllowedError if permissions are denied.
    try {
      if (navigator.share) {
        await navigator.share({ title: "Deepfake OTOP", url: window.location.href });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert("Lien copié dans le presse-papiers !");
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        // User cancelled — no action needed
        return;
      }
      console.warn("Share failed:", err);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 badge bg-green-500/10 text-green-400 border border-green-500/20 mb-4">
          <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
          Traitement terminé
        </div>
        <h1 className="text-3xl font-bold mb-2">Votre vidéo est prête !</h1>
        <p className="text-gray-400">La personne a été remplacée avec les mêmes gestes, mouvements et paroles.</p>
      </div>

      {/* Video player */}
      <div className="card mb-6">
        <video
          src={resultUrl}
          controls
          autoPlay
          loop
          className="w-full rounded-xl aspect-video bg-black"
          playsInline
        />
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button onClick={handleDownload} className="btn-primary flex items-center justify-center gap-2 flex-1">
          <Download size={18} />
          Télécharger la vidéo
        </button>
        <button onClick={handleShare} className="btn-secondary flex items-center justify-center gap-2">
          <Share2 size={18} />
          Partager
        </button>
        <button onClick={() => navigate("/")} className="btn-secondary flex items-center justify-center gap-2">
          <RotateCcw size={18} />
          Nouvelle vidéo
        </button>
      </div>

      {/* Metadata */}
      <div className="mt-6 p-4 bg-gray-900/50 rounded-xl border border-gray-800 text-xs text-gray-500 space-y-1">
        <p>Job ID: <span className="font-mono text-gray-400">{jobId}</span></p>
        <p className="text-amber-500/70">
          Rappel : ce contenu doit être utilisé à des fins créatives ou éducatives uniquement.
        </p>
      </div>
    </div>
  );
}
