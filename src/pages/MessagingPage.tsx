import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Paperclip, User, ArrowLeft, MessageCircle, FileText, CheckCircle, File, Download, X, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { uploadToCloudinary, getFileType, isAllowedFile } from '../lib/storage';
import type { Message } from '../types';

function generateConversationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
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
  const [uploading, setUploading] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

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
      alert('Erreur lors de la création de la conversation');
    }
    setSubmitting(false);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || submitting || messages.length === 0) return;

    const content = newMessage.trim();
    setNewMessage('');
    setSubmitting(true);

    try {
      const { data, error } = await supabase.from('messages').insert({
        conversation_id: messages[0].conversation_id,
        sender_type: 'patient',
        sender_name: userName,
        sender_email: userEmail,
        content: content,
      }).select().single();

      if (error) throw error;
      if (data) setMessages(prev => [...prev, data]);
    } catch (err) {
      console.error(err);
      setNewMessage(content);
      alert('Erreur lors de l\'envoi du message');
    }
    setSubmitting(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || messages.length === 0) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('Fichier trop volumineux (max 10 Mo)');
      e.target.value = '';
      return;
    }
    if (!isAllowedFile(file)) {
      alert('Type de fichier non autorisé. Images (JPG, PNG, WEBP), PDF et Word uniquement.');
      e.target.value = '';
      return;
    }

    setUploading(true);
    try {
      const result = await uploadToCloudinary(file, 'messages');
      if (result) {
        const { error: insertError, data } = await supabase.from('messages').insert({
          conversation_id: messages[0].conversation_id,
          sender_type: 'patient',
          sender_name: userName,
          sender_email: userEmail,
          content: '[Fichier joint]',
          attachment_url: result.secure_url,
          attachment_name: file.name,
          attachment_type: getFileType(file),
        }).select().single();

        if (insertError) {
          console.error('Insert error:', insertError);
          alert('Erreur lors de l\'enregistrement du fichier: ' + insertError.message);
        } else if (data) {
          setMessages(prev => [...prev, data]);
        }
      } else {
        alert('Erreur lors de l\'upload du fichier');
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert('Erreur lors de l\'envoi du fichier: ' + (err instanceof Error ? err.message : 'Erreur inconnue'));
    }
    setUploading(false);
    e.target.value = '';
  };

  const renderAttachment = (msg: Message) => {
    if (!msg.attachment_url) return null;

    if (msg.attachment_type === 'image') {
      return (
        <a
          href={msg.attachment_url}
          target="_blank"
          rel="noopener noreferrer"
          className="block mt-2 rounded-lg overflow-hidden"
        >
          <img
            src={msg.attachment_url}
            alt={msg.attachment_name || 'Image'}
            className="max-w-full w-auto h-auto max-h-48 object-contain rounded-lg hover:opacity-90 transition-opacity"
            loading="lazy"
          />
        </a>
      );
    }

    const isPdf = msg.attachment_type === 'pdf';
    const Icon = isPdf ? FileText : File;

    return (
      <a
        href={msg.attachment_url}
        target="_blank"
        rel="noopener noreferrer"
        download
        className="flex items-center gap-2 mt-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
      >
        <Icon className="w-5 h-5 shrink-0" />
        <span className="text-sm truncate flex-1">{msg.attachment_name || 'Document'}</span>
        <Download className="w-4 h-4 shrink-0 opacity-60" />
      </a>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-[80vh] bg-[#050810] py-8 sm:py-12"
    >
      <div className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl text-white italic mb-2 sm:mb-4">Messagerie</h1>
          <p className="text-gray-400 text-sm sm:text-base">Communiquez directement avec le Dr. Djalane</p>
        </div>

        <AnimatePresence mode="wait">
          {view === 'start' && (
            <motion.div
              key="start"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-xl mx-auto"
            >
              <div className="bg-[#141B3D] border border-[#0A0F2C] rounded-xl p-4 sm:p-6">
                <div className="text-center mb-6">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#3B6FE8]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageCircle className="w-7 h-7 sm:w-8 sm:h-8 text-[#3B6FE8]" />
                  </div>
                  <p className="text-gray-400 text-xs sm:text-sm">Pas besoin de compte. Complétez le formulaire ci-dessous pour commencer.</p>
                </div>
                <form onSubmit={handleStartConversation} className="space-y-4 sm:space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      <User className="w-4 h-4 inline mr-2" />Votre nom
                    </label>
                    <input
                      type="text"
                      value={userName}
                      onChange={e => setUserName(e.target.value)}
                      className="w-full px-4 py-3 bg-[#0A0F2C] border border-[#141B3D] rounded-lg text-white focus:outline-none focus:border-[#3B6FE8] transition-colors"
                      placeholder="Votre nom complet"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Adresse email</label>
                    <input
                      type="email"
                      value={userEmail}
                      onChange={e => setUserEmail(e.target.value)}
                      className="w-full px-4 py-3 bg-[#0A0F2C] border border-[#141B3D] rounded-lg text-white focus:outline-none focus:border-[#3B6FE8] transition-colors"
                      placeholder="votre@email.com"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Votre message</label>
                    <textarea
                      rows={4}
                      value={startMessage}
                      onChange={e => setStartMessage(e.target.value)}
                      className="w-full px-4 py-3 bg-[#0A0F2C] border border-[#141B3D] rounded-lg text-white focus:outline-none focus:border-[#3B6FE8] resize-none transition-colors"
                      placeholder="Bonjour, je souhaite..."
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 bg-[#3B6FE8] hover:bg-[#5A89FF] text-white rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Envoi...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Démarrer la conversation
                      </>
                    )}
                  </button>
                </form>
              </div>
            </motion.div>
          )}

          {view === 'chat' && (
            <motion.div
              key="chat"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl mx-auto"
            >
              <div className="bg-[#141B3D] border border-[#0A0F2C] rounded-xl overflow-hidden flex flex-col h-[calc(100vh-180px)] sm:h-[600px]">
                {/* Header */}
                <div className="bg-[#0A0F2C] p-3 sm:p-4 flex items-center justify-between border-b border-[#141B3D] shrink-0">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <button
                      onClick={() => { setView('start'); setMessages([]); setConversationCode(''); }}
                      className="p-2 hover:bg-[#141B3D] rounded-lg transition-colors shrink-0"
                    >
                      <ArrowLeft className="w-5 h-5 text-gray-400" />
                    </button>
                    <div className="min-w-0">
                      <h3 className="text-white font-medium text-sm sm:text-base truncate">Dr. Aziz Djalane</h3>
                      <p className="text-gray-500 text-xs truncate">Code : {conversationCode}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className="text-gray-400 text-xs sm:text-sm truncate max-w-[120px] sm:max-w-none">{userName}</p>
                    <p className="text-gray-500 text-xs truncate max-w-[120px] sm:max-w-none">{userEmail}</p>
                  </div>
                </div>

                {/* Info banner */}
                <div className="p-3 sm:p-4 bg-[#141B3D]/50 border-b border-[#0A0F2C] flex items-center gap-2 shrink-0">
                  <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                  <span className="text-gray-400 text-xs sm:text-sm">
                    Code de retour : <span className="text-[#3B6FE8] font-mono font-medium">{conversationCode}</span>
                  </span>
                </div>

                {/* Messages */}
                <div
                  ref={messagesContainerRef}
                  className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 bg-[#0A0F2C]"
                >
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender_type === 'patient' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`
                          max-w-[85%] sm:max-w-[75%] p-3 sm:p-4 rounded-2xl
                          ${msg.sender_type === 'patient'
                            ? 'bg-[#3B6FE8] text-white rounded-br-sm'
                            : 'bg-[#141B3D] text-gray-300 rounded-bl-sm'
                          }
                        `}
                      >
                        {msg.sender_type === 'doctor' && (
                          <p className="text-[#3B6FE8] text-xs font-medium mb-1">Dr. Djalane</p>
                        )}
                        {msg.content !== '[Fichier joint]' && (
                          <p className="text-sm whitespace-pre-wrap break-words overflow-wrap-anywhere">
                            {msg.content}
                          </p>
                        )}
                        {renderAttachment(msg)}
                        <p
                          className={`
                            text-[10px] sm:text-xs mt-1 sm:mt-2
                            ${msg.sender_type === 'patient' ? 'text-blue-100/70' : 'text-gray-500'}
                          `}
                        >
                          {new Date(msg.created_at).toLocaleString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} className="h-1" />
                </div>

                {/* Input */}
                <form
                  onSubmit={handleSendMessage}
                  className="p-3 sm:p-4 bg-[#0A0F2C] border-t border-[#141B3D] flex gap-2 sm:gap-3 shrink-0"
                >
                  <label
                    className={`
                      p-2 sm:p-3 bg-[#141B3D] rounded-lg cursor-pointer
                      hover:bg-[#1a2147] transition-colors shrink-0
                      ${uploading ? 'opacity-50 cursor-wait' : ''}
                    `}
                    title="Joindre un fichier (image, PDF, Word, max 10 Mo)"
                  >
                    <input
                      type="file"
                      accept="image/*,.pdf,.doc,.docx"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={uploading || submitting}
                    />
                    {uploading ? (
                      <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                    ) : (
                      <Paperclip className="w-5 h-5 text-gray-400" />
                    )}
                  </label>
                  <input
                    type="text"
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    placeholder="Votre message..."
                    className="flex-1 min-w-0 bg-[#141B3D] border border-[#0A0F2C] rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#3B6FE8] transition-colors text-sm sm:text-base"
                    disabled={submitting || uploading}
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || submitting || uploading}
                    className="p-2 sm:p-3 bg-[#3B6FE8] hover:bg-[#5A89FF] text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed shrink-0 transition-colors"
                  >
                    {submitting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
