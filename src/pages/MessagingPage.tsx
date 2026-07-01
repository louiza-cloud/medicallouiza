import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Paperclip, User, ArrowLeft, MessageCircle, FileText, CheckCircle, Image as ImageIcon, File, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { uploadToCloudinary, getFileType, isAllowedFile } from '../lib/cloudinary';
import type { Message } from '../types';

function generateConversationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export function MessagingPage() {
  const [view, setView] = useState<'start' | 'chat'>('start');
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [startMessage, setStartMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [conversationCode, setConversationCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => scrollToBottom(), [messages]);

  // Real-time subscription
  useEffect(() => {
    if (view !== 'chat' || messages.length === 0) return;
    const conversationId = messages[0].conversation_id;

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          setMessages(prev => {
            if (prev.some(m => m.id === payload.new.id)) return prev;
            return [...prev, payload.new as Message];
          });
        }
      )
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [view, messages.length > 0 ? messages[0].conversation_id : null]);

  const handleStartConversation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName || !userEmail || !startMessage) return;

    setSubmitting(true);
    const code = generateConversationCode();
    const conversationId = `conv-${Date.now()}`;

    try {
      const { error } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_type: 'patient',
        sender_name: userName,
        sender_email: userEmail,
        content: startMessage,
      });
      if (error) throw error;

      setConversationCode(code);
      const { data } = await supabase.from('messages').select('*').eq('conversation_id', conversationId).order('created_at', { ascending: true });
      if (data) setMessages(data);
      setView('chat');
    } catch (err) {
      console.error(err);
    }
    setSubmitting(false);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || submitting || messages.length === 0) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from('messages').insert({
        conversation_id: messages[0].conversation_id,
        sender_type: 'patient',
        sender_name: userName,
        sender_email: userEmail,
        content: newMessage.trim(),
      });
      if (!error) setNewMessage('');
    } catch (err) {
      console.error(err);
    }
    setSubmitting(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || messages.length === 0) return;
    if (file.size > 10 * 1024 * 1024) { alert('Fichier trop volumineux (max 10 Mo)'); return; }
    if (!isAllowedFile(file)) { alert('Type de fichier non autorisé. Images, PDF et Word uniquement.'); return; }

    setSubmitting(true);
    try {
      const result = await uploadToCloudinary(file, 'messages');
      if (result) {
        await supabase.from('messages').insert({
          conversation_id: messages[0].conversation_id,
          sender_type: 'patient',
          sender_name: userName,
          sender_email: userEmail,
          content: '[Fichier joint]',
          attachment_url: result.secure_url,
          attachment_name: file.name,
          attachment_type: getFileType(file),
        });
      }
    } catch (err) {
      console.error(err);
      alert('Erreur lors de l\'envoi du fichier');
    }
    setSubmitting(false);
    e.target.value = '';
  };

  const renderAttachment = (msg: Message) => {
    if (!msg.attachment_url) return null;

    if (msg.attachment_type === 'image') {
      return (
        <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className="block mt-2">
          <img
            src={msg.attachment_url}
            alt={msg.attachment_name || 'Image'}
            className="max-w-[200px] max-h-[150px] rounded-lg object-cover border border-white/20 hover:opacity-90 transition-opacity"
          />
        </a>
      );
    }

    const isPdf = msg.attachment_type === 'pdf';
    const Icon = isPdf ? FileText : File;
    const colorClass = isPdf ? 'text-red-400' : 'text-blue-400';
    const bgClass = isPdf ? 'bg-red-900/20 border-red-800/30' : 'bg-blue-900/20 border-blue-800/30';

    return (
      <a
        href={msg.attachment_url}
        target="_blank"
        rel="noopener noreferrer"
        className={`flex items-center gap-3 mt-2 p-3 rounded-lg border ${bgClass} hover:opacity-90 transition-opacity`}
      >
        <Icon className={`w-8 h-8 ${colorClass} shrink-0`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{msg.attachment_name || 'Document'}</p>
          <p className="text-xs opacity-70">{isPdf ? 'PDF' : 'Word'} — Cliquez pour télécharger</p>
        </div>
        <Download className={`w-4 h-4 ${colorClass} shrink-0`} />
      </a>
    );
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-[80vh] bg-[#050810] py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="font-serif text-3xl lg:text-4xl text-white italic mb-4">Messagerie</h1>
          <p className="text-gray-400">Communiquez directement avec le Dr. Djalane</p>
        </div>

        <AnimatePresence mode="wait">
          {view === 'start' && (
            <motion.div key="start" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="max-w-xl mx-auto">
              <div className="bg-[#141B3D] border border-[#0A0F2C] rounded-xl p-6">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-[#3B6FE8]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageCircle className="w-8 h-8 text-[#3B6FE8]" />
                  </div>
                  <p className="text-gray-400 text-sm">Pas besoin de compte. Complétez le formulaire ci-dessous pour commencer.</p>
                </div>
                <form onSubmit={handleStartConversation} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2"><User className="w-4 h-4 inline mr-2" />Votre nom</label>
                    <input type="text" value={userName} onChange={e => setUserName(e.target.value)} className="w-full px-4 py-3 bg-[#141B3D] border border-[#0A0F2C] rounded-lg text-white focus:outline-none focus:border-[#3B6FE8]" placeholder="Votre nom complet" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Adresse email</label>
                    <input type="email" value={userEmail} onChange={e => setUserEmail(e.target.value)} className="w-full px-4 py-3 bg-[#141B3D] border border-[#0A0F2C] rounded-lg text-white focus:outline-none focus:border-[#3B6FE8]" placeholder="votre@email.com" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Votre message</label>
                    <textarea rows={4} value={startMessage} onChange={e => setStartMessage(e.target.value)} className="w-full px-4 py-3 bg-[#141B3D] border border-[#0A0F2C] rounded-lg text-white focus:outline-none focus:border-[#3B6FE8] resize-none" placeholder="Bonjour, je souhaite..." required />
                  </div>
                  <button type="submit" disabled={submitting} className="w-full py-3 bg-[#3B6FE8] hover:bg-[#5A89FF] text-white rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50">
                    <Send className="w-4 h-4" />{submitting ? 'Envoi...' : 'Démarrer la conversation'}
                  </button>
                </form>
              </div>
            </motion.div>
          )}

          {view === 'chat' && (
            <motion.div key="chat" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="max-w-2xl mx-auto">
              <div className="bg-[#141B3D] border border-[#0A0F2C] rounded-xl overflow-hidden">
                <div className="bg-[#0A0F2C] p-4 flex items-center justify-between border-b border-[#141B3D]">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setView('start')} className="p-2 hover:bg-[#141B3D] rounded-lg"><ArrowLeft className="w-5 h-5 text-gray-400" /></button>
                    <div><h3 className="text-white font-medium">Dr. Aziz Djalane</h3><p className="text-gray-500 text-sm">Code : {conversationCode}</p></div>
                  </div>
                  <div className="text-right"><p className="text-gray-400 text-sm">{userName}</p><p className="text-gray-500 text-xs">{userEmail}</p></div>
                </div>

                <div className="p-4 bg-[#141B3D]/50 border-b border-[#0A0F2C] flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-gray-400 text-sm">Conversation créée. Code de retour : <span className="text-[#3B6FE8] font-mono">{conversationCode}</span></span>
                </div>

                <div className="h-[400px] overflow-y-auto p-4 space-y-4 bg-[#0A0F2C]">
                  {messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.sender_type === 'patient' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] p-4 rounded-2xl ${msg.sender_type === 'patient' ? 'bg-[#3B6FE8] text-white rounded-br-md' : 'bg-[#141B3D] text-gray-300 rounded-bl-md'}`}>
                        {msg.sender_type === 'doctor' && <p className="text-[#3B6FE8] text-xs font-medium mb-1">Dr. Djalane</p>}
                        {msg.content !== '[Fichier joint]' && <p className="text-sm">{msg.content}</p>}
                        {renderAttachment(msg)}
                        <p className={`text-xs mt-2 ${msg.sender_type === 'patient' ? 'text-blue-100' : 'text-gray-500'}`}>{new Date(msg.created_at).toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSendMessage} className="p-4 bg-[#0A0F2C] border-t border-[#141B3D] flex gap-3">
                  <label className="p-3 bg-[#141B3D] rounded-lg cursor-pointer hover:bg-[#0A0F2C] transition-colors shrink-0" title="Joindre un fichier (image, PDF, Word, max 10 Mo)">
                    <input type="file" accept="image/*,.pdf,.doc,.docx" onChange={handleFileUpload} className="hidden" disabled={submitting} />
                    <Paperclip className="w-5 h-5 text-gray-400" />
                  </label>
                  <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Votre message..." className="flex-1 bg-[#141B3D] border border-[#0A0F2C] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#3B6FE8]" />
                  <button type="submit" disabled={!newMessage.trim() || submitting} className="p-3 bg-[#3B6FE8] hover:bg-[#5A89FF] text-white rounded-lg disabled:opacity-50 shrink-0"><Send className="w-5 h-5" /></button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
