import { Link } from "react-router-dom";
import { Video, Cpu } from "lucide-react";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-gray-950/80 backdrop-blur-md border-b border-gray-800">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 bg-primary-500 rounded-xl flex items-center justify-center
                          group-hover:bg-primary-600 transition-colors">
            <Video size={18} className="text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight">
            Deepfake <span className="text-primary-500">OTOP</span>
          </span>
        </Link>

        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Cpu size={13} />
          <span>Propulsé par FOMM + Wav2Lip</span>
        </div>
      </div>
    </header>
  );
}
