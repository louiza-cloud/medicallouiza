import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, FileText, Download, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Document } from '../types';

export function LibraryPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDocuments = async () => {
      const { data } = await supabase.from('documents').select('*').order('created_at', { ascending: false });
      if (data) setDocuments(data);
      setLoading(false);
    };
    fetchDocuments();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel('documents-public')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'documents' }, (payload) => {
        setDocuments(prev => prev.some(d => d.id === payload.new.id) ? prev : [payload.new as Document, ...prev]);
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'documents' }, (payload) => {
        setDocuments(prev => prev.filter(d => d.id !== payload.old.id));
      })
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, []);

  const formatSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const openDocument = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-[80vh] bg-[#050810] py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-[#3B6FE8]/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <BookOpen className="w-10 h-10 text-[#3B6FE8]" />
          </div>
          <h1 className="font-serif text-3xl lg:text-4xl text-white italic mb-4">Les écrits du Dr. Djalane</h1>
          <p className="text-gray-400 max-w-2xl mx-auto">Articles, guides et documents pédagogiques sur la médecine fonctionnelle et intégrative</p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-8 h-8 border-2 border-[#3B6FE8] border-t-[#0A0F2C] rounded-full animate-spin" />
          </div>
        ) : documents.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-[#141B3D] border border-[#0A0F2C] rounded-xl p-6 text-center py-16">
            <FileText className="w-16 h-16 text-gray-700 mx-auto mb-4" />
            <h3 className="text-white text-lg mb-2">Aucun document disponible</h3>
            <p className="text-gray-500">Les documents seront ajoutés prochainement</p>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {documents.map((doc, i) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                onClick={() => openDocument(doc.file_url)}
                className="bg-[#141B3D] rounded-xl overflow-hidden border border-[#0A0F2C] group hover:border-[#3B6FE8]/50 transition-all flex flex-col cursor-pointer"
              >
                <div className="relative h-40 bg-[#0A0F2C] flex items-center justify-center overflow-hidden">
                  {doc.cover_url ? (
                    <img src={doc.cover_url} alt={doc.title} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <FileText className="w-10 h-10 text-red-400/60" />
                      <span className="text-gray-600 text-xs">Aucune couverture</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    <ExternalLink className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="text-white font-medium line-clamp-2 mb-1 group-hover:text-[#3B6FE8] transition-colors">{doc.title}</h3>
                  {doc.file_size && <p className="text-gray-600 text-xs mb-3">{formatSize(doc.file_size)}</p>}
                  <div className="mt-auto flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[#3B6FE8]/20 hover:bg-[#3B6FE8] text-[#3B6FE8] hover:text-white rounded-lg text-sm font-medium transition-all"
                    >
                      <FileText className="w-4 h-4" />
                      Lire
                    </a>
                    <a
                      href={doc.file_url}
                      download
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-[#0A0F2C] hover:bg-[#1a2147] text-gray-400 hover:text-white rounded-lg text-sm font-medium transition-all"
                      title="Télécharger"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
