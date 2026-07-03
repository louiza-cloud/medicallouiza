import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, File, Image as ImageIcon, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { FilePreview, formatFileSize } from '../lib/storage';

interface FileUploadPreviewProps {
  files: FilePreview[];
  uploadProgress: Map<string, number>;
  uploadStatus: Map<string, 'pending' | 'uploading' | 'complete' | 'error'>;
  uploadErrors: Map<string, string>;
  onRemove: (index: number) => void;
}

export function FileUploadPreview({
  files,
  uploadProgress,
  uploadStatus,
  uploadErrors,
  onRemove,
}: FileUploadPreviewProps) {
  if (files.length === 0) return null;

  const totalFiles = files.length;
  const completedFiles = Array.from(uploadStatus.values()).filter((s) => s === 'complete').length;

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="overflow-hidden"
    >
      <div className="p-3 bg-[#0A0F2C] border-t border-[#141B3D]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">
            {completedFiles > 0
              ? `${completedFiles}/${totalFiles} envoyé${completedFiles > 1 ? 's' : ''}`
              : `${totalFiles} fichier${totalFiles > 1 ? 's' : ''} sélectionné${totalFiles > 1 ? 's' : ''}`}
          </span>
          {uploadStatus.size > 0 && Array.from(uploadStatus.values()).some((s) => s === 'uploading') && (
            <span className="text-xs text-[#3B6FE8] animate-pulse">Upload en cours...</span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <AnimatePresence>
            {files.map((filePreview, index) => {
              const fileId = filePreview.file.name + index;
              const progress = uploadProgress.get(fileId) || 0;
              const status = uploadStatus.get(fileId) || 'pending';
              const error = uploadErrors.get(fileId);

              return (
                <motion.div
                  key={fileId}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className={`relative bg-[#141B3D] rounded-lg overflow-hidden w-20 h-20 ${
                    status === 'error' ? 'ring-2 ring-red-500' : ''
                  }`}
                >
                  {/* Preview */}
                  {filePreview.type === 'image' && filePreview.preview ? (
                    <img
                      src={filePreview.preview}
                      alt={filePreview.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {filePreview.type === 'pdf' ? (
                        <FileText className="w-8 h-8 text-red-400" />
                      ) : filePreview.type === 'word' ? (
                        <File className="w-8 h-8 text-blue-400" />
                      ) : (
                        <ImageIcon className="w-8 h-8 text-gray-400" />
                      )}
                    </div>
                  )}

                  {/* Progress overlay */}
                  {status === 'uploading' && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <div className="relative w-12 h-12">
                        <svg className="w-12 h-12 -rotate-90">
                          <circle
                            cx="24"
                            cy="24"
                            r="20"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                            className="text-gray-600"
                          />
                          <circle
                            cx="24"
                            cy="24"
                            r="20"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                            className="text-[#3B6FE8]"
                            strokeDasharray={`${progress * 1.26} 126`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-xs text-white">
                          {Math.round(progress)}%
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Status icons */}
                  {status === 'complete' && (
                    <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-green-400" />
                    </div>
                  )}

                  {status === 'error' && (
                    <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                      <AlertCircle className="w-6 h-6 text-red-400" />
                    </div>
                  )}

                  {/* Remove button */}
                  {(status === 'pending' || status === 'error') && (
                    <button
                      onClick={() => onRemove(index)}
                      className="absolute top-1 right-1 p-1 bg-black/70 hover:bg-black rounded transition-colors"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  )}

                  {/* File info tooltip */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1">
                    <p className="text-[10px] text-white truncate">{filePreview.name}</p>
                    <p className="text-[8px] text-gray-400">{formatFileSize(filePreview.size)}</p>
                  </div>

                  {/* Error tooltip */}
                  {error && (
                    <div className="absolute inset-x-0 -bottom-8 bg-red-500 text-white text-[10px] px-2 py-1 truncate">
                      {error}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
