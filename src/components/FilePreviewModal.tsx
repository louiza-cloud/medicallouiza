import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ZoomIn, ZoomOut, Download, ChevronLeft, ChevronRight, FileText, File } from 'lucide-react';
import { formatFileSize } from '../lib/storage';

interface FilePreviewModalProps {
  files: Array<{ url: string; name: string; type: string; size?: number }>;
  initialIndex?: number;
  onClose: () => void;
}

export function FilePreviewModal({ files, initialIndex = 0, onClose }: FilePreviewModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const currentFile = files[currentIndex];
  const isImage = currentFile?.type === 'image';
  const isPdf = currentFile?.type === 'pdf';

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    switch (e.key) {
      case 'Escape':
        onClose();
        break;
      case 'ArrowLeft':
        if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
        break;
      case 'ArrowRight':
        if (currentIndex < files.length - 1) setCurrentIndex(currentIndex + 1);
        break;
      case '+':
      case '=':
        if (isImage) setZoom((z) => Math.min(z + 0.5, 4));
        break;
      case '-':
        if (isImage) setZoom((z) => Math.max(z - 0.5, 0.5));
        break;
    }
  }, [currentIndex, files.length, isImage, onClose]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown]);

  useEffect(() => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  }, [currentIndex]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isImage || zoom === 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleDownload = () => {
    if (!currentFile) return;
    const link = window.document.createElement('a');
    link.href = currentFile.url;
    link.download = currentFile.name || 'download';
    link.target = '_blank';
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/95 flex flex-col"
      onClick={onClose}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 text-white" onClick={(e) => e.stopPropagation()}>
        <div className="flex-1 min-w-0">
          <p className="text-sm truncate">{currentFile?.name}</p>
          {currentFile?.size && (
            <p className="text-xs text-gray-400">{formatFileSize(currentFile.size)}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {files.length > 1 && (
            <span className="text-sm text-gray-400">
              {currentIndex + 1} / {files.length}
            </span>
          )}

          {isImage && (
            <>
              <button
                onClick={() => setZoom((z) => Math.max(z - 0.5, 0.5))}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                title="Dézoomer"
              >
                <ZoomOut className="w-5 h-5" />
              </button>
              <span className="text-sm w-12 text-center">{Math.round(zoom * 100)}%</span>
              <button
                onClick={() => setZoom((z) => Math.min(z + 0.5, 4))}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                title="Zoomer"
              >
                <ZoomIn className="w-5 h-5" />
              </button>
            </>
          )}

          <button
            onClick={handleDownload}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            title="Télécharger"
          >
            <Download className="w-5 h-5" />
          </button>

          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div
        className="flex-1 flex items-center justify-center overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {isImage ? (
          <motion.img
            key={currentIndex}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            src={currentFile.url}
            alt={currentFile.name}
            className="max-w-none select-none"
            style={{
              transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
              cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            draggable={false}
          />
        ) : isPdf ? (
          <div className="w-full h-full flex flex-col items-center justify-center p-4">
            <div className="bg-[#1a1a2e] rounded-xl p-8 max-w-lg text-center">
              <FileText className="w-16 h-16 text-red-400 mx-auto mb-4" />
              <p className="text-white font-medium mb-2">{currentFile.name}</p>
              {currentFile.size && (
                <p className="text-gray-400 text-sm mb-4">{formatFileSize(currentFile.size)}</p>
              )}
              <a
                href={currentFile.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#3B6FE8] hover:bg-[#5A89FF] text-white rounded-lg transition-colors"
              >
                <FileText className="w-4 h-4" />
                Ouvrir le PDF
              </a>
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4">
            <div className="bg-[#1a1a2e] rounded-xl p-8 max-w-lg text-center">
              <File className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-white font-medium mb-2">{currentFile.name}</p>
              {currentFile.size && (
                <p className="text-gray-400 text-sm mb-4">{formatFileSize(currentFile.size)}</p>
              )}
              <button
                onClick={handleDownload}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#3B6FE8] hover:bg-[#5A89FF] text-white rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                Télécharger
              </button>
            </div>
          </div>
        )}

        {/* Navigation arrows */}
        {files.length > 1 && (
          <>
            {currentIndex > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(currentIndex - 1);
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
              >
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
            )}
            {currentIndex < files.length - 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(currentIndex + 1);
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
              >
                <ChevronRight className="w-6 h-6 text-white" />
              </button>
            )}
          </>
        )}

        {/* Thumbnails for multiple files */}
        {files.length > 1 && files.filter((f) => f.type === 'image').length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 p-2 bg-black/50 rounded-lg overflow-x-auto max-w-[90vw]">
            {files.map((file, index) =>
              file.type === 'image' ? (
                <button
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex(index);
                  }}
                  className={`w-12 h-12 rounded overflow-hidden shrink-0 transition-all ${
                    index === currentIndex
                      ? 'ring-2 ring-[#3B6FE8] ring-offset-2 ring-offset-black/50'
                      : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  <img
                    src={file.url}
                    alt={file.name}
                    className="w-full h-full object-cover"
                  />
                </button>
              ) : null
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
