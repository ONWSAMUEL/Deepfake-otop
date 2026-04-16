import { useCallback } from "react";
import { useDropzone, type Accept } from "react-dropzone";
import { Upload, CheckCircle, X } from "lucide-react";
import type { ReactNode } from "react";

interface DropZoneProps {
  label: string;
  description: string;
  accept: Accept;
  file: File | null;
  onFile: (file: File) => void;
  onClear: () => void;
  icon: ReactNode;
  uploadProgress?: number;
}

export default function DropZone({
  label,
  description,
  accept,
  file,
  onFile,
  onClear,
  icon,
  uploadProgress,
}: DropZoneProps) {
  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted[0]) onFile(accepted[0]);
    },
    [onFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxFiles: 1,
  });

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-gray-300">{label}</label>

      {file ? (
        <div className="relative border border-primary-500/40 bg-primary-500/5 rounded-xl p-4">
          <button
            onClick={onClear}
            className="absolute top-3 right-3 text-gray-500 hover:text-gray-300 transition-colors"
          >
            <X size={16} />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-500/10 rounded-lg flex items-center justify-center text-primary-400">
              {icon}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-200 truncate">{file.name}</p>
              <p className="text-xs text-gray-500">{formatSize(file.size)}</p>
            </div>
            {uploadProgress !== undefined && uploadProgress >= 0 && uploadProgress < 100 ? (
              <div className="flex-shrink-0">
                <svg className="w-8 h-8 -rotate-90">
                  <circle cx="16" cy="16" r="12" stroke="currentColor"
                    strokeWidth="2" fill="none" className="text-gray-700" />
                  <circle cx="16" cy="16" r="12" stroke="currentColor"
                    strokeWidth="2" fill="none" className="text-primary-500"
                    strokeDasharray={`${2 * Math.PI * 12}`}
                    strokeDashoffset={`${2 * Math.PI * 12 * (1 - uploadProgress / 100)}`} />
                </svg>
              </div>
            ) : (
              <CheckCircle size={20} className="text-green-400 flex-shrink-0" />
            )}
          </div>

          {uploadProgress !== undefined && uploadProgress < 100 && (
            <div className="mt-3">
              <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-500 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Upload: {uploadProgress}%</p>
            </div>
          )}
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200
            ${isDragActive
              ? "border-primary-500 bg-primary-500/10"
              : "border-gray-700 hover:border-gray-600 hover:bg-gray-800/50"
            }`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center text-gray-400">
              {isDragActive ? <Upload size={22} className="text-primary-400" /> : icon}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-300">
                {isDragActive ? "Déposez ici" : "Glisser-déposer ou cliquer"}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{description}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
