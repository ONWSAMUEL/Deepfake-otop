import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Video, Image, ArrowRight, AlertTriangle, Settings2 } from "lucide-react";
import DropZone from "@/components/DropZone";
import { uploadFile, createJob } from "@/services/api";

interface UploadState {
  file: File | null;
  fileId: string | null;
  progress: number;
}

export default function Home() {
  const navigate = useNavigate();

  const [sourceVideo, setSourceVideo] = useState<UploadState>({
    file: null, fileId: null, progress: -1,
  });
  const [targetImage, setTargetImage] = useState<UploadState>({
    file: null, fileId: null, progress: -1,
  });
  const [lipSync, setLipSync] = useState(true);
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (
    file: File,
    type: "source_video" | "target_image",
    setState: (s: UploadState) => void
  ) => {
    setState({ file, fileId: null, progress: 0 });
    try {
      const res = await uploadFile(file, type, (pct) =>
        setState((prev) => ({ ...prev, progress: pct }))
      );
      setState({ file, fileId: res.file_id, progress: 100 });
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Erreur lors de l'upload.");
      setState({ file: null, fileId: null, progress: -1 });
    }
  };

  const canSubmit =
    accepted &&
    sourceVideo.fileId !== null &&
    targetImage.fileId !== null &&
    !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      const job = await createJob({
        source_video_id: sourceVideo.fileId!,
        target_image_id: targetImage.fileId!,
        options: { lip_sync: lipSync },
      });
      navigate(`/processing/${job.id}`);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Erreur lors de la création du job.");
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      {/* Hero */}
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold mb-3">
          Remplacez une personne{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-500 to-accent-500">
            dans une vidéo
          </span>
        </h1>
        <p className="text-gray-400 text-lg">
          Transférez les gestes, mouvements et paroles d'une vidéo sur la personne de votre choix
          grâce au <strong className="text-gray-300">First Order Motion Model</strong>.
        </p>
      </div>

      <div className="card space-y-6">
        {/* Upload zone — source video */}
        <DropZone
          label="Vidéo source (mouvements à reproduire)"
          description="MP4, MOV — fournit les gestes, les mouvements et l'audio"
          accept={{ "video/mp4": [".mp4"], "video/quicktime": [".mov"], "video/x-msvideo": [".avi"] }}
          file={sourceVideo.file}
          onFile={(f) => handleUpload(f, "source_video", setSourceVideo)}
          onClear={() => setSourceVideo({ file: null, fileId: null, progress: -1 })}
          icon={<Video size={22} />}
          uploadProgress={sourceVideo.progress >= 0 ? sourceVideo.progress : undefined}
        />

        {/* Upload zone — target image */}
        <DropZone
          label="Image de la personne cible"
          description="JPEG, PNG — portrait clair, fond neutre de préférence"
          accept={{ "image/jpeg": [".jpg", ".jpeg"], "image/png": [".png"] }}
          file={targetImage.file}
          onFile={(f) => handleUpload(f, "target_image", setTargetImage)}
          onClear={() => setTargetImage({ file: null, fileId: null, progress: -1 })}
          icon={<Image size={22} />}
          uploadProgress={targetImage.progress >= 0 ? targetImage.progress : undefined}
        />

        {/* Options */}
        <div className="flex items-center gap-3 p-4 bg-gray-800/50 rounded-xl">
          <Settings2 size={16} className="text-gray-400 flex-shrink-0" />
          <label className="flex items-center gap-2 cursor-pointer flex-1">
            <input
              type="checkbox"
              checked={lipSync}
              onChange={(e) => setLipSync(e.target.checked)}
              className="w-4 h-4 rounded accent-primary-500"
            />
            <span className="text-sm text-gray-300">
              Activer la synchronisation labiale <span className="text-gray-500">(Wav2Lip)</span>
            </span>
          </label>
        </div>

        {/* Ethics consent */}
        <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
          <div className="flex gap-3">
            <AlertTriangle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-300 mb-1">Usage responsable</p>
              <p className="text-xs text-gray-400 mb-3">
                Je certifie utiliser cette technologie à des fins créatives, éducatives ou de
                production audiovisuelle uniquement. Je m'engage à ne pas créer de contenu
                trompeur, malveillant ou portant atteinte à la dignité d'une personne.
              </p>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={(e) => setAccepted(e.target.checked)}
                  className="w-4 h-4 rounded accent-amber-400"
                />
                <span className="text-sm text-gray-300">J'accepte les conditions d'utilisation</span>
              </label>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-2.5">
            {error}
          </p>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Lancement du traitement...
            </>
          ) : (
            <>
              Lancer le remplacement
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </div>

      {/* How it works */}
      <div className="mt-10 grid grid-cols-3 gap-4 text-center">
        {[
          { step: "1", title: "Uploader", desc: "Vidéo source + photo cible" },
          { step: "2", title: "IA traite", desc: "FOMM anime, Wav2Lip synchronise" },
          { step: "3", title: "Télécharger", desc: "Votre vidéo transformée" },
        ].map(({ step, title, desc }) => (
          <div key={step} className="p-4 bg-gray-900/50 rounded-xl border border-gray-800">
            <div className="w-8 h-8 bg-primary-500/10 text-primary-400 rounded-full
                            flex items-center justify-center text-sm font-bold mx-auto mb-2">
              {step}
            </div>
            <p className="text-sm font-medium text-gray-300">{title}</p>
            <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
