import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, FileText, Download, Eye, Image as ImageIcon, File } from 'lucide-react';
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

  // Real-time subscription for documents
  useEffect(() => {
    const channel = supabase
      .channel('documents-public')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'documents' },
        (payload) => {
          setDocuments(prev => {
            if (prev.some(d => d.id === payload.new.id)) return prev;
            return [payload.new as Document, ...prev];
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'documents' },
        (payload) => {
          setDocuments(prev => prev.filter(d => d.id !== payload.old.id));
        }
      )
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, []);

  const getDocIcon = (doc: Document) => {
    if (doc.file_type === 'image') return <ImageIcon className="w-7 h-7 text-green-400" />;
    if (doc.file_type === 'word') return <File className="w-7 h-7 text-blue-400" />;
    return <FileText className="w-7 h-7 text-red-400" />;
  };

  const getDocBg = (doc: Document) => {
    if (doc.file_type === 'image') return 'bg-green-900/30 group-hover:bg-green-900/50';
    if (doc.file_type === 'word') return 'bg-blue-900/30 group-hover:bg-blue-900/50';
    return 'bg-red-900/30 group-hover:bg-red-900/50';
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
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
              <motion.div key={doc.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="bg-[#141B3D] border border-[#0A0F2C] rounded-xl p-6 hover:border-[#3B6FE8]/50 transition-all group">
                <div className="flex items-start gap-4">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 ${getDocBg(doc)}`}>
                    {getDocIcon(doc)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-medium mb-2 group-hover:text-[#3B6FE8] transition-colors line-clamp-2">{doc.title}</h3>
                    {doc.file_size && <p className="text-gray-500 text-sm mb-3">{formatSize(doc.file_size)}</p>}
                    <div className="flex gap-2">
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-gray-400 hover:text-[#3B6FE8]"><Eye className="w-4 h-4" />Voir</a>
                      <a href={doc.file_url} download className="flex items-center gap-1 text-sm text-gray-400 hover:text-[#3B6FE8]"><Download className="w-4 h-4" />Télécharger</a>
                    </div>
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
