import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Paperclip, User, ArrowLeft, MessageCircle, FileText, CheckCircle, File, Download,
  Reply, Edit2, Trash2, Copy, Forward, Search, X, MoreVertical, Check, CheckCheck,
  Loader2, CornerDownLeft, ZoomIn, Image as ImageIcon, AlertCircle, Upload
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  uploadMultipleFiles,
  getFileType,
  isAllowedFile,
  createFilePreview,
  validateFiles,
  formatFileSize,
  FilePreview,
} from '../lib/storage';
import { FilePreviewModal } from '../components/FilePreviewModal';
import { FileUploadPreview } from '../components/FileUploadPreview';
import type { Message, TypingIndicator } from '../types';

function generateConversationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function formatDateHeader(date: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Aujourd'hui";
  if (date.toDateString() === yesterday.toDateString()) return 'Hier';
  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function groupMessagesByDay(messages: Message[]): { date: string; messages: Message[] }[] {
  const groups: { [key: string]: Message[] } = {};
  messages.forEach(msg => {
    const date = new Date(msg.created_at).toDateString();
    if (!groups[date]) groups[date] = [];
    groups[date].push(msg);
  });
  return Object.entries(groups).map(([dateKey, msgs]) => ({
    date: formatDateHeader(new Date(dateKey)),
    messages: msgs
  }));
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
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [contextMenu, setContextMenu] = useState<{ messageId: string; x: number; y: number } | null>(null);
  const [typing, setTyping] = useState<TypingIndicator | null>(null);

  // File upload states
  const [pendingFiles, setPendingFiles] = useState<FilePreview[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Map<string, number>>(new Map());
  const [uploadStatus, setUploadStatus] = useState<Map<string, 'pending' | 'uploading' | 'complete' | 'error'>>(new Map());
  const [uploadErrors, setUploadErrors] = useState<Map<string, string>>(new Map());
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Image preview modal
  const [previewFiles, setPreviewFiles] = useState<Array<{ url: string; name: string; type: string; size?: number }>>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [showPreview, setShowPreview] = useState(false);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const conversationId = messages.length > 0 ? messages[0].conversation_id : null;

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Mark messages as read
  useEffect(() => {
    if (view === 'chat' && conversationId && messages.length > 0) {
      supabase.rpc('mark_messages_read', {
        p_conversation_id: conversationId,
        p_user_type: 'patient'
      });
    }
  }, [view, conversationId, messages.length]);

  // Real-time subscription
  useEffect(() => {
    if (view !== 'chat' || !conversationId) return;

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages(prev => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);
          if (newMsg.sender_type === 'doctor') {
            supabase.rpc('mark_messages_read', { p_conversation_id: conversationId, p_user_type: 'patient' });
          }
        })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => setMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new as Message : m)))
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => setMessages(prev => prev.filter(m => m.id !== payload.old.id)))
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [view, conversationId]);

  // Typing indicator
  useEffect(() => {
    if (view !== 'chat' || !conversationId) return;

    const channel = supabase
      .channel(`typing-${conversationId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'typing_indicators', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const data = payload.new as TypingIndicator;
          if (data.user_type === 'doctor') {
            setTyping(data);
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => setTyping(null), 3000);
          }
        })
      .subscribe();

    return () => { channel.unsubscribe(); if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current); };
  }, [view, conversationId]);

  const sendTypingIndicator = useCallback(async () => {
    if (!conversationId) return;
    await supabase.from('typing_indicators').upsert({
      conversation_id: conversationId, user_type: 'patient', user_name: userName, created_at: new Date().toISOString()
    }, { onConflict: 'conversation_id,user_type' });
  }, [conversationId, userName]);

  const handleStartConversation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName || !userEmail || !startMessage) return;

    setSubmitting(true);
    const convId = `conv-${Date.now()}`;
    const code = generateConversationCode();

    try {
      const { error } = await supabase.from('messages').insert({
        conversation_id: convId, sender_type: 'patient', sender_name: userName, sender_email: userEmail, content: startMessage,
      });
      if (error) throw error;

      setConversationCode(code);
      const { data } = await supabase.from('messages').select('*').eq('conversation_id', convId).order('created_at', { ascending: true });
      if (data) setMessages(data);
      setView('chat');
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la création de la conversation');
    }
    setSubmitting(false);
  };

  // File handling
  const processFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validation = validateFiles(fileArray);

    if (!validation.valid) {
      validation.errors.forEach(err => alert(err));
      return;
    }

    const previews: FilePreview[] = [];
    for (const file of fileArray) {
      const preview = await createFilePreview(file);
      previews.push(preview);
    }

    setPendingFiles(prev => [...prev, ...previews]);
    setUploadProgress(prev => { const m = new Map(prev); previews.forEach((_, i) => m.set(`file-${prev.length + i}`, 0)); return m; });
    setUploadStatus(prev => { const m = new Map(prev); previews.forEach((_, i) => m.set(`file-${prev.length + i}`, 'pending')); return m; });
  }, []);

  const removePendingFile = useCallback((index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleSendFiles = async () => {
    if (pendingFiles.length === 0 || messages.length === 0) return;

    setIsUploading(true);
    const files = pendingFiles.map(p => p.file);

    try {
      const results = await uploadMultipleFiles(files, 'messages', (progress) => {
        const key = `file-${progress.fileIndex}`;
        setUploadProgress(prev => new Map(prev).set(key, progress.progress));
        setUploadStatus(prev => new Map(prev).set(key, progress.status));
        if (progress.error) setUploadErrors(prev => new Map(prev).set(key, progress.error));
      });

      for (const result of results) {
        const msgData: Record<string, unknown> = {
          conversation_id: messages[0].conversation_id,
          sender_type: 'patient',
          sender_name: userName,
          sender_email: userEmail,
          content: '[Fichier joint]',
          attachment_url: result.url,
          attachment_name: result.name,
          attachment_type: result.type,
        };
        if (replyingTo) msgData.reply_to_id = replyingTo.id;

        const { data, error } = await supabase.from('messages').insert(msgData).select().single();
        if (data && !error) setMessages(prev => [...prev, data]);
      }

      setPendingFiles([]);
      setUploadProgress(new Map());
      setUploadStatus(new Map());
      setUploadErrors(new Map());
      setReplyingTo(null);
    } catch (err) {
      console.error(err);
      alert('Erreur lors de l\'envoi des fichiers');
    }
    setIsUploading(false);
  };

  // Drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  }, [processFiles]);

  // Paste from clipboard
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      if (view !== 'chat') return;
      const items = e.clipboardData?.items;
      if (!items) return;

      const files: File[] = [];
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }

      if (files.length > 0) {
        e.preventDefault();
        await processFiles(files);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [view, processFiles]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
    e.target.value = '';
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pendingFiles.length > 0) {
      await handleSendFiles();
      return;
    }
    if (!newMessage.trim() || submitting || messages.length === 0) return;

    setSubmitting(true);

    try {
      if (editingMessage) {
        const { error } = await supabase.from('messages').update({
          content: newMessage.trim(), is_edited: true, edited_at: new Date().toISOString()
        }).eq('id', editingMessage.id);
        if (error) throw error;
        setMessages(prev => prev.map(m => m.id === editingMessage.id ? { ...m, content: newMessage.trim(), is_edited: true, edited_at: new Date().toISOString() } : m));
        setEditingMessage(null);
      } else {
        const msgData: Record<string, unknown> = {
          conversation_id: messages[0].conversation_id,
          sender_type: 'patient', sender_name: userName, sender_email: userEmail, content: newMessage.trim(),
        };
        if (replyingTo) msgData.reply_to_id = replyingTo.id;
        const { data, error } = await supabase.from('messages').insert(msgData).select().single();
        if (error) throw error;
        if (data) setMessages(prev => [...prev, data]);
        setReplyingTo(null);
      }
      setNewMessage('');
    } catch (err) {
      console.error(err);
      alert('Erreur lors de l\'envoi du message');
    }
    setSubmitting(false);
    inputRef.current?.focus();
  };

  const handleReply = (msg: Message) => { setReplyingTo(msg); setEditingMessage(null); inputRef.current?.focus(); };
  const handleEdit = (msg: Message) => {
    if (msg.sender_type !== 'patient') return;
    setEditingMessage(msg); setNewMessage(msg.content); setReplyingTo(null); inputRef.current?.focus();
  };
  const handleDelete = async (msg: Message) => {
    if (msg.sender_type !== 'patient') return;
    if (!confirm('Supprimer ce message ?')) return;
    await supabase.from('messages').update({ deleted_at: new Date().toISOString(), content: '[Message supprimé]' }).eq('id', msg.id);
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, deleted_at: new Date().toISOString(), content: '[Message supprimé]' } : m));
    setContextMenu(null);
  };
  const handleCopy = (content: string) => { navigator.clipboard.writeText(content); setContextMenu(null); };
  const handleForward = (msg: Message) => { setNewMessage(msg.content); setReplyingTo(null); setEditingMessage(null); inputRef.current?.focus(); setContextMenu(null); };

  // Image gallery
  const openGallery = (msg: Message, allMessages: Message[]) => {
    const images = allMessages.filter(m => m.attachment_type === 'image' && m.attachment_url);
    const index = images.findIndex(m => m.id === msg.id);
    setPreviewFiles(images.map(m => ({ url: m.attachment_url!, name: m.attachment_name || 'Image', type: 'image', size: undefined })));
    setPreviewIndex(index >= 0 ? index : 0);
    setShowPreview(true);
  };

  const renderAttachment = (msg: Message, allMsgs: Message[]) => {
    if (!msg.attachment_url) return null;

    if (msg.attachment_type === 'image') {
      const imagesInChat = allMsgs.filter(m => m.attachment_type === 'image' && m.attachment_url);
      const imageIndex = imagesInChat.findIndex(m => m.id === msg.id);
      const totalImages = imagesInChat.length;

      return (
        <div className="mt-2 relative group">
          <button
            onClick={() => openGallery(msg, allMsgs)}
            className="block rounded-lg overflow-hidden"
          >
            <img
              src={msg.attachment_url}
              alt={msg.attachment_name || 'Image'}
              className="max-w-full max-h-48 object-contain rounded-lg hover:opacity-90 transition-opacity"
              loading="lazy"
            />
          </button>
          {totalImages > 1 && (
            <button
              onClick={() => openGallery(msg, allMsgs)}
              className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 rounded text-white text-xs flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ImageIcon className="w-3 h-3" />
              {imageIndex + 1}/{totalImages}
            </button>
          )}
          {msg.attachment_name && (
            <p className="text-xs text-gray-400 mt-1 truncate">{msg.attachment_name}</p>
          )}
        </div>
      );
    }

    const isPdf = msg.attachment_type === 'pdf';
    const Icon = isPdf ? FileText : File;

    return (
      <div className="mt-2">
        <a
          href={msg.attachment_url}
          target="_blank"
          rel="noopener noreferrer"
          download={msg.attachment_name}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
        >
          <Icon className={`w-5 h-5 shrink-0 ${isPdf ? 'text-red-400' : 'text-blue-400'}`} />
          <div className="flex-1 min-w-0">
            <p className="text-sm truncate">{msg.attachment_name || 'Document'}</p>
          </div>
          <Download className="w-4 h-4 shrink-0 opacity-60" />
        </a>
      </div>
    );
  };

  const renderStatus = (msg: Message) => {
    if (msg.sender_type !== 'patient') return null;
    if (msg.status === 'read' || msg.read_at) return <CheckCheck className="w-4 h-4 text-blue-300" />;
    if (msg.status === 'delivered') return <CheckCheck className="w-4 h-4 text-gray-400" />;
    return <Check className="w-4 h-4 text-gray-400" />;
  };

  const filteredMessages = searchQuery ? messages.filter(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()) || m.sender_name.toLowerCase().includes(searchQuery.toLowerCase())) : messages;
  const groupedMessages = groupMessagesByDay(filteredMessages);

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-[80vh] bg-[#050810] py-8 sm:py-12">
      <div className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl text-white italic mb-2 sm:mb-4">Messagerie</h1>
          <p className="text-gray-400 text-sm sm:text-base">Communiquez directement avec le Dr. Djalane</p>
        </div>

        <AnimatePresence mode="wait">
          {view === 'start' && (
            <motion.div key="start" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="max-w-xl mx-auto">
              <div className="bg-[#141B3D] border border-[#0A0F2C] rounded-xl p-4 sm:p-6">
                <div className="text-center mb-6">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#3B6FE8]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageCircle className="w-7 h-7 sm:w-8 sm:h-8 text-[#3B6FE8]" />
                  </div>
                  <p className="text-gray-400 text-xs sm:text-sm">Pas besoin de compte. Complétez le formulaire ci-dessous pour commencer.</p>
                </div>
                <form onSubmit={handleStartConversation} className="space-y-4 sm:space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2"><User className="w-4 h-4 inline mr-2" />Votre nom</label>
                    <input type="text" value={userName} onChange={e => setUserName(e.target.value)} className="w-full px-4 py-3 bg-[#0A0F2C] border border-[#141B3D] rounded-lg text-white focus:outline-none focus:border-[#3B6FE8]" placeholder="Votre nom complet" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Adresse email</label>
                    <input type="email" value={userEmail} onChange={e => setUserEmail(e.target.value)} className="w-full px-4 py-3 bg-[#0A0F2C] border border-[#141B3D] rounded-lg text-white focus:outline-none focus:border-[#3B6FE8]" placeholder="votre@email.com" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Votre message</label>
                    <textarea rows={4} value={startMessage} onChange={e => setStartMessage(e.target.value)} className="w-full px-4 py-3 bg-[#0A0F2C] border border-[#141B3D] rounded-lg text-white focus:outline-none focus:border-[#3B6FE8] resize-none" placeholder="Bonjour, je souhaite..." required />
                  </div>
                  <button type="submit" disabled={submitting} className="w-full py-3 bg-[#3B6FE8] hover:bg-[#5A89FF] text-white rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50">
                    {submitting ? <><Loader2 className="w-4 h-4 animate-spin" />Envoi...</> : <><Send className="w-4 h-4" />Démarrer la conversation</>}
                  </button>
                </form>
              </div>
            </motion.div>
          )}

          {view === 'chat' && (
            <motion.div key="chat" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="max-w-2xl mx-auto">
              <div
                ref={dropZoneRef}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`bg-[#141B3D] border border-[#0A0F2C] rounded-xl overflow-hidden flex flex-col h-[calc(100vh-180px)] sm:h-[600px] relative transition-all ${isDragOver ? 'ring-2 ring-[#3B6FE8] ring-inset' : ''}`}
              >
                {/* Drag overlay */}
                <AnimatePresence>
                  {isDragOver && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 z-30 bg-[#3B6FE8]/20 flex items-center justify-center"
                    >
                      <div className="bg-[#141B3D] px-6 py-4 rounded-xl border-2 border-dashed border-[#3B6FE8] flex items-center gap-3">
                        <Upload className="w-6 h-6 text-[#3B6FE8]" />
                        <span className="text-white font-medium">Déposez vos fichiers ici</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Header */}
                <div className="bg-[#0A0F2C] p-3 sm:p-4 flex items-center justify-between border-b border-[#141B3D] shrink-0">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <button onClick={() => { setView('start'); setMessages([]); }} className="p-2 hover:bg-[#141B3D] rounded-lg transition-colors shrink-0">
                      <ArrowLeft className="w-5 h-5 text-gray-400" />
                    </button>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-white font-medium text-sm sm:text-base truncate">Dr. Aziz Djalane</h3>
                        <span className="w-2 h-2 bg-green-500 rounded-full shrink-0" title="En ligne" />
                      </div>
                      {typing ? <p className="text-[#3B6FE8] text-xs animate-pulse">En train d'écrire...</p> : <p className="text-gray-500 text-xs truncate">Code : {conversationCode}</p>}
                    </div>
                  </div>
                  <button onClick={() => setShowSearch(!showSearch)} className="p-2 hover:bg-[#141B3D] rounded-lg transition-colors shrink-0">
                    <Search className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                {/* Search */}
                <AnimatePresence>
                  {showSearch && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                      <div className="p-3 bg-[#0A0F2C] border-b border-[#141B3D]">
                        <div className="relative">
                          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Rechercher..." className="w-full pl-10 pr-8 py-2 bg-[#141B3D] border border-[#0A0F2C] rounded-lg text-white text-sm focus:outline-none focus:border-[#3B6FE8]" autoFocus />
                          {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1"><X className="w-3 h-3 text-gray-500" /></button>}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Info banner */}
                <div className="p-3 sm:p-4 bg-[#141B3D]/50 border-b border-[#0A0F2C] flex items-center gap-2 shrink-0">
                  <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                  <span className="text-gray-400 text-xs sm:text-sm">Code de retour : <span className="text-[#3B6FE8] font-mono">{conversationCode}</span></span>
                </div>

                {/* Messages */}
                <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 bg-[#0A0F2C]">
                  {groupedMessages.map(({ date, messages: msgs }) => (
                    <div key={date}>
                      <div className="flex justify-center mb-3">
                        <span className="px-3 py-1 bg-[#141B3D] rounded-full text-gray-400 text-xs">{date}</span>
                      </div>
                      {msgs.map(msg => (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ duration: 0.2 }}
                          className={`flex ${msg.sender_type === 'patient' ? 'justify-end' : 'justify-start'} mb-2`}
                        >
                          <div className={`relative max-w-[85%] sm:max-w-[75%] p-3 sm:p-4 rounded-2xl ${msg.sender_type === 'patient' ? 'bg-[#3B6FE8] text-white rounded-br-sm' : 'bg-[#141B3D] text-gray-300 rounded-bl-sm'} ${msg.deleted_at ? 'opacity-50 italic' : ''}`}>
                            {msg.reply_to_id && <div className={`mb-2 pl-2 border-l-2 text-xs ${msg.sender_type === 'patient' ? 'border-blue-200 text-blue-100' : 'border-gray-500 text-gray-500'}`}>↳ Message...</div>}
                            <button onClick={(e) => { e.stopPropagation(); setContextMenu({ messageId: msg.id, x: e.clientX, y: e.clientY }); }} className="absolute top-1 right-1 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-white/10 text-white/50">
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            <div className="group">
                              {msg.sender_type === 'doctor' && <p className="text-[#3B6FE8] text-xs font-medium mb-1">Dr. Djalane</p>}
                              {msg.content !== '[Fichier joint]' && msg.content !== '[Message supprimé]' && <p className="text-sm whitespace-pre-wrap break-words pr-4">{msg.content}</p>}
                              {(msg.content === '[Fichier joint]' || msg.content === '[Message supprimé]') && <p className="text-sm italic opacity-70">{msg.content}</p>}
                              {renderAttachment(msg, messages)}
                              <div className={`flex items-center justify-end gap-1 mt-1 ${msg.sender_type === 'patient' ? 'text-blue-100/70' : 'text-gray-500'}`}>
                                <span className="text-[10px] sm:text-xs">{new Date(msg.created_at).toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                                {msg.is_edited && <span className="text-[10px]">(modifié)</span>}
                                {renderStatus(msg)}
                              </div>
                            </div>
                          </div>
                          {contextMenu?.messageId === msg.id && (
                            <div className="fixed z-50 bg-[#1a2147] border border-[#3B6FE8]/30 rounded-lg shadow-lg py-1 min-w-[140px]" style={{ left: contextMenu.x, top: contextMenu.y }} onClick={e => e.stopPropagation()}>
                              <button onClick={() => handleReply(msg)} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[#3B6FE8]/20 text-gray-300 text-sm"><Reply className="w-4 h-4" /> Répondre</button>
                              <button onClick={() => handleCopy(msg.content)} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[#3B6FE8]/20 text-gray-300 text-sm"><Copy className="w-4 h-4" /> Copier</button>
                              <button onClick={() => handleForward(msg)} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[#3B6FE8]/20 text-gray-300 text-sm"><Forward className="w-4 h-4" /> Transférer</button>
                              {msg.sender_type === 'patient' && !msg.deleted_at && (
                                <>
                                  <button onClick={() => handleEdit(msg)} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[#3B6FE8]/20 text-gray-300 text-sm"><Edit2 className="w-4 h-4" /> Modifier</button>
                                  <button onClick={() => handleDelete(msg)} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-red-500/20 text-red-400 text-sm"><Trash2 className="w-4 h-4" /> Supprimer</button>
                                </>
                              )}
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  ))}
                  <div ref={messagesEndRef} className="h-1" />
                </div>

                {/* File preview area */}
                <FileUploadPreview
                  files={pendingFiles}
                  uploadProgress={uploadProgress}
                  uploadStatus={uploadStatus}
                  uploadErrors={uploadErrors}
                  onRemove={removePendingFile}
                />

                {/* Reply/Edit indicator */}
                <AnimatePresence>
                  {(replyingTo || editingMessage) && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                      <div className="px-4 py-2 bg-[#0A0F2C] border-t border-[#141B3D] flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm">
                          {replyingTo && <><CornerDownLeft className="w-4 h-4 text-[#3B6FE8]" /><span className="text-gray-400">Répondre à: </span><span className="text-white truncate max-w-[200px]">{replyingTo.content.substring(0, 30)}...</span></>}
                          {editingMessage && <><Edit2 className="w-4 h-4 text-yellow-400" /><span className="text-gray-400">Modifier le message</span></>}
                        </div>
                        <button onClick={() => { setReplyingTo(null); setEditingMessage(null); setNewMessage(''); }} className="p-1 hover:bg-[#141B3D] rounded"><X className="w-4 h-4 text-gray-500" /></button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Input */}
                <form onSubmit={handleSendMessage} className="p-3 sm:p-4 bg-[#0A0F2C] border-t border-[#141B3D] flex gap-2 sm:gap-3 shrink-0">
                  <label className={`p-2 sm:p-3 bg-[#141B3D] rounded-lg cursor-pointer hover:bg-[#1a2147] transition-colors shrink-0 ${isUploading ? 'opacity-50' : ''}`} title="Joindre des fichiers">
                    <input ref={fileInputRef} type="file" accept="image/*,.pdf,.doc,.docx" multiple onChange={handleFileSelect} className="hidden" disabled={isUploading || submitting} />
                    {isUploading ? <Loader2 className="w-5 h-5 text-gray-400 animate-spin" /> : <Paperclip className="w-5 h-5 text-gray-400" />}
                  </label>
                  <input
                    ref={inputRef}
                    type="text"
                    value={newMessage}
                    onChange={e => { setNewMessage(e.target.value); sendTypingIndicator(); }}
                    placeholder={pendingFiles.length > 0 ? `${pendingFiles.length} fichier${pendingFiles.length > 1 ? 's' : ''} à envoyer` : "Votre message... (ou collez une image)"}
                    className="flex-1 min-w-0 bg-[#141B3D] border border-[#0A0F2C] rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#3B6FE8] text-sm sm:text-base"
                    disabled={submitting || isUploading}
                  />
                  <button type="submit" disabled={(!newMessage.trim() && pendingFiles.length === 0) || submitting || isUploading} className="p-2 sm:p-3 bg-[#3B6FE8] hover:bg-[#5A89FF] text-white rounded-lg disabled:opacity-50 shrink-0 transition-colors">
                    {submitting || isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  </button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Image preview modal */}
      <AnimatePresence>
        {showPreview && previewFiles.length > 0 && (
          <FilePreviewModal
            files={previewFiles}
            initialIndex={previewIndex}
            onClose={() => setShowPreview(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
