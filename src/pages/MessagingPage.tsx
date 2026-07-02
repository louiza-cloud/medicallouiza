import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Paperclip, User, ArrowLeft, MessageCircle, FileText, CheckCircle, File, Download,
  Reply, Edit2, Trash2, Copy, Forward, Search, X, MoreVertical, Check, CheckCheck,
  Loader2, CornerDownLeft
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { uploadToCloudinary, getFileType, isAllowedFile } from '../lib/storage';
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
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [contextMenu, setContextMenu] = useState<{ messageId: string; x: number; y: number } | null>(null);
  const [typing, setTyping] = useState<TypingIndicator | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const conversationId = messages.length > 0 ? messages[0].conversation_id : null;

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Mark messages as read when viewing
  useEffect(() => {
    if (view === 'chat' && conversationId && messages.length > 0) {
      supabase.rpc('mark_messages_read', {
        p_conversation_id: conversationId,
        p_user_type: 'patient'
      }).then(() => {
        // Update local messages status
        setMessages(prev => prev.map(m =>
          m.sender_type === 'doctor' && !m.read_at
            ? { ...m, status: 'read', read_at: new Date().toISOString() }
            : m
        ));
      });
    }
  }, [view, conversationId, messages.length]);

  // Real-time subscription for messages
  useEffect(() => {
    if (view !== 'chat' || !conversationId) return;

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          // Mark as read immediately if we're viewing
          if (newMsg.sender_type === 'doctor') {
            supabase.rpc('mark_messages_read', {
              p_conversation_id: conversationId,
              p_user_type: 'patient'
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          setMessages(prev => prev.map(m =>
            m.id === payload.new.id ? payload.new as Message : m
          ));
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          setMessages(prev => prev.filter(m => m.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [view, conversationId]);

  // Typing indicator subscription
  useEffect(() => {
    if (view !== 'chat' || !conversationId) return;

    const channel = supabase
      .channel(`typing-${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'typing_indicators', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const data = payload.new as TypingIndicator;
          if (data.user_type === 'doctor') {
            setTyping(data);
            // Auto-clear after 3 seconds
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => setTyping(null), 3000);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'typing_indicators', filter: `conversation_id=eq.${conversationId}` },
        () => setTyping(null)
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [view, conversationId]);

  // Send typing indicator
  const sendTypingIndicator = useCallback(async () => {
    if (!conversationId) return;
    await supabase.from('typing_indicators').upsert({
      conversation_id: conversationId,
      user_type: 'patient',
      user_name: userName,
      created_at: new Date().toISOString()
    }, { onConflict: 'conversation_id,user_type' });
  }, [conversationId, userName]);

  const handleStartConversation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName || !userEmail || !startMessage) return;

    setSubmitting(true);
    const code = generateConversationCode();
    const convId = `conv-${Date.now()}`;

    try {
      const { error } = await supabase.from('messages').insert({
        conversation_id: convId,
        sender_type: 'patient',
        sender_name: userName,
        sender_email: userEmail,
        content: startMessage,
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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !editingMessage) || submitting || messages.length === 0) return;

    setSubmitting(true);

    try {
      if (editingMessage) {
        // Edit existing message
        const { error } = await supabase.from('messages').update({
          content: newMessage.trim(),
          is_edited: true,
          edited_at: new Date().toISOString()
        }).eq('id', editingMessage.id);

        if (error) throw error;
        setMessages(prev => prev.map(m =>
          m.id === editingMessage.id
            ? { ...m, content: newMessage.trim(), is_edited: true, edited_at: new Date().toISOString() }
            : m
        ));
        setEditingMessage(null);
      } else {
        // Send new message
        const msgData: Record<string, unknown> = {
          conversation_id: messages[0].conversation_id,
          sender_type: 'patient',
          sender_name: userName,
          sender_email: userEmail,
          content: newMessage.trim(),
        };
        if (replyingTo) {
          msgData.reply_to_id = replyingTo.id;
        }

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
        const msgData: Record<string, unknown> = {
          conversation_id: messages[0].conversation_id,
          sender_type: 'patient',
          sender_name: userName,
          sender_email: userEmail,
          content: '[Fichier joint]',
          attachment_url: result.secure_url,
          attachment_name: file.name,
          attachment_type: getFileType(file),
        };
        if (replyingTo) {
          msgData.reply_to_id = replyingTo.id;
        }

        const { data, error } = await supabase.from('messages').insert(msgData).select().single();
        if (error) throw error;
        if (data) setMessages(prev => [...prev, data]);
        setReplyingTo(null);
      }
    } catch (err) {
      console.error(err);
      alert('Erreur lors de l\'envoi du fichier');
    }
    setUploading(false);
    e.target.value = '';
  };

  const handleReply = (msg: Message) => {
    setReplyingTo(msg);
    setEditingMessage(null);
    inputRef.current?.focus();
  };

  const handleEdit = (msg: Message) => {
    if (msg.sender_type !== 'patient') return;
    setEditingMessage(msg);
    setNewMessage(msg.content);
    setReplyingTo(null);
    inputRef.current?.focus();
  };

  const handleDelete = async (msg: Message) => {
    if (msg.sender_type !== 'patient') return;
    if (!confirm('Supprimer ce message ?')) return;

    const { error } = await supabase.from('messages').update({
      deleted_at: new Date().toISOString(),
      content: '[Message supprimé]'
    }).eq('id', msg.id);

    if (!error) {
      setMessages(prev => prev.map(m =>
        m.id === msg.id
          ? { ...m, deleted_at: new Date().toISOString(), content: '[Message supprimé]' }
          : m
      ));
    }
    setContextMenu(null);
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    setContextMenu(null);
  };

  const handleForward = async (msg: Message) => {
    // Simple forward - just copy content to input
    setNewMessage(msg.content);
    setReplyingTo(null);
    setEditingMessage(null);
    inputRef.current?.focus();
    setContextMenu(null);
  };

  const renderAttachment = (msg: Message) => {
    if (!msg.attachment_url) return null;

    if (msg.attachment_type === 'image') {
      return (
        <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className="block mt-2 rounded-lg overflow-hidden">
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

  const renderMessageStatus = (msg: Message) => {
    if (msg.sender_type !== 'patient') return null;

    if (msg.status === 'read' || msg.read_at) {
      return <CheckCheck className="w-4 h-4 text-blue-300" title="Lu" />;
    }
    if (msg.status === 'delivered') {
      return <CheckCheck className="w-4 h-4 text-gray-400" title="Délivré" />;
    }
    return <Check className="w-4 h-4 text-gray-400" title="Envoyé" />;
  };

  const filteredMessages = searchQuery
    ? messages.filter(m =>
        m.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.sender_name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : messages;

  const groupedMessages = groupMessagesByDay(filteredMessages);

  // Close context menu on click outside
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
                    <input type="text" value={userName} onChange={e => setUserName(e.target.value)} className="w-full px-4 py-3 bg-[#0A0F2C] border border-[#141B3D] rounded-lg text-white focus:outline-none focus:border-[#3B6FE8] transition-colors" placeholder="Votre nom complet" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Adresse email</label>
                    <input type="email" value={userEmail} onChange={e => setUserEmail(e.target.value)} className="w-full px-4 py-3 bg-[#0A0F2C] border border-[#141B3D] rounded-lg text-white focus:outline-none focus:border-[#3B6FE8] transition-colors" placeholder="votre@email.com" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Votre message</label>
                    <textarea rows={4} value={startMessage} onChange={e => setStartMessage(e.target.value)} className="w-full px-4 py-3 bg-[#0A0F2C] border border-[#141B3D] rounded-lg text-white focus:outline-none focus:border-[#3B6FE8] resize-none transition-colors" placeholder="Bonjour, je souhaite..." required />
                  </div>
                  <button type="submit" disabled={submitting} className="w-full py-3 bg-[#3B6FE8] hover:bg-[#5A89FF] text-white rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition-colors">
                    {submitting ? <><Loader2 className="w-4 h-4 animate-spin" />Envoi...</> : <><Send className="w-4 h-4" />Démarrer la conversation</>}
                  </button>
                </form>
              </div>
            </motion.div>
          )}

          {view === 'chat' && (
            <motion.div key="chat" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="max-w-2xl mx-auto">
              <div className="bg-[#141B3D] border border-[#0A0F2C] rounded-xl overflow-hidden flex flex-col h-[calc(100vh-180px)] sm:h-[600px]">
                {/* Header */}
                <div className="bg-[#0A0F2C] p-3 sm:p-4 flex items-center justify-between border-b border-[#141B3D] shrink-0">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <button onClick={() => { setView('start'); setMessages([]); setConversationCode(''); }} className="p-2 hover:bg-[#141B3D] rounded-lg transition-colors shrink-0">
                      <ArrowLeft className="w-5 h-5 text-gray-400" />
                    </button>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-white font-medium text-sm sm:text-base truncate">Dr. Aziz Djalane</h3>
                        <span className="w-2 h-2 bg-green-500 rounded-full shrink-0" title="En ligne" />
                      </div>
                      {typing ? (
                        <p className="text-[#3B6FE8] text-xs animate-pulse">En train d'écrire...</p>
                      ) : (
                        <p className="text-gray-500 text-xs truncate">Code : {conversationCode}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 bg-[#3B6FE8] text-white text-xs rounded-full">{unreadCount}</span>
                    )}
                    <button onClick={() => setShowSearch(!showSearch)} className="p-2 hover:bg-[#141B3D] rounded-lg transition-colors">
                      <Search className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>
                </div>

                {/* Search */}
                <AnimatePresence>
                  {showSearch && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                      <div className="p-3 bg-[#0A0F2C] border-b border-[#141B3D]">
                        <div className="relative">
                          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Rechercher dans la conversation..."
                            className="w-full pl-10 pr-8 py-2 bg-[#141B3D] border border-[#0A0F2C] rounded-lg text-white text-sm focus:outline-none focus:border-[#3B6FE8]"
                            autoFocus
                          />
                          {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-[#0A0F2C] rounded">
                              <X className="w-3 h-3 text-gray-500" />
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Info banner */}
                <div className="p-3 sm:p-4 bg-[#141B3D]/50 border-b border-[#0A0F2C] flex items-center gap-2 shrink-0">
                  <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                  <span className="text-gray-400 text-xs sm:text-sm">Code de retour : <span className="text-[#3B6FE8] font-mono font-medium">{conversationCode}</span></span>
                </div>

                {/* Messages */}
                <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 bg-[#0A0F2C]">
                  {groupedMessages.map(({ date, messages: msgs }) => (
                    <div key={date}>
                      <div className="flex justify-center mb-3">
                        <span className="px-3 py-1 bg-[#141B3D] rounded-full text-gray-400 text-xs">{date}</span>
                      </div>
                      {msgs.map(msg => (
                        <div key={msg.id} className={`flex ${msg.sender_type === 'patient' ? 'justify-end' : 'justify-start'} mb-2`}>
                          <div className={`relative max-w-[85%] sm:max-w-[75%] p-3 sm:p-4 rounded-2xl ${msg.sender_type === 'patient' ? 'bg-[#3B6FE8] text-white rounded-br-sm' : 'bg-[#141B3D] text-gray-300 rounded-bl-sm'} ${msg.deleted_at ? 'opacity-50 italic' : ''}`}>
                            {/* Reply preview */}
                            {msg.reply_to_id && (
                              <div className={`mb-2 pl-2 border-l-2 ${msg.sender_type === 'patient' ? 'border-blue-200 text-blue-100' : 'border-gray-500 text-gray-500'} text-xs`}>
                                {msg.reply_to?.content?.substring(0, 50) || 'Message...'}
                              </div>
                            )}

                            {/* Context menu button */}
                            <button
                              onClick={(e) => { e.stopPropagation(); setContextMenu({ messageId: msg.id, x: e.clientX, y: e.clientY }); }}
                              className={`absolute top-1 right-1 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-white/10 ${msg.sender_type === 'patient' ? 'text-blue-100' : 'text-gray-500'}`}
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {/* Add group class for hover effect */}
                            <div className="group">
                              {msg.sender_type === 'doctor' && (
                                <p className="text-[#3B6FE8] text-xs font-medium mb-1">Dr. Djalane</p>
                              )}
                              {msg.content !== '[Fichier joint]' && msg.content !== '[Message supprimé]' && (
                                <p className="text-sm whitespace-pre-wrap break-words pr-4">{msg.content}</p>
                              )}
                              {(msg.content === '[Fichier joint]' || msg.content === '[Message supprimé]') && (
                                <p className="text-sm italic opacity-70">{msg.content}</p>
                              )}
                              {renderAttachment(msg)}
                              <div className={`flex items-center justify-end gap-1 mt-1 ${msg.sender_type === 'patient' ? 'text-blue-100/70' : 'text-gray-500'}`}>
                                <span className="text-[10px] sm:text-xs">
                                  {new Date(msg.created_at).toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {msg.is_edited && <span className="text-[10px]">(modifié)</span>}
                                {renderMessageStatus(msg)}
                              </div>
                            </div>
                          </div>

                          {/* Context Menu */}
                          {contextMenu?.messageId === msg.id && (
                            <div
                              className="fixed z-50 bg-[#1a2147] border border-[#3B6FE8]/30 rounded-lg shadow-lg py-1 min-w-[140px]"
                              style={{ left: contextMenu.x, top: contextMenu.y }}
                              onClick={e => e.stopPropagation()}
                            >
                              <button onClick={() => handleReply(msg)} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[#3B6FE8]/20 text-gray-300 text-sm">
                                <Reply className="w-4 h-4" /> Répondre
                              </button>
                              <button onClick={() => handleCopy(msg.content)} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[#3B6FE8]/20 text-gray-300 text-sm">
                                <Copy className="w-4 h-4" /> Copier
                              </button>
                              <button onClick={() => handleForward(msg)} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[#3B6FE8]/20 text-gray-300 text-sm">
                                <Forward className="w-4 h-4" /> Transférer
                              </button>
                              {msg.sender_type === 'patient' && !msg.deleted_at && (
                                <>
                                  <button onClick={() => handleEdit(msg)} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[#3B6FE8]/20 text-gray-300 text-sm">
                                    <Edit2 className="w-4 h-4" /> Modifier
                                  </button>
                                  <button onClick={() => handleDelete(msg)} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-red-500/20 text-red-400 text-sm">
                                    <Trash2 className="w-4 h-4" /> Supprimer
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                  <div ref={messagesEndRef} className="h-1" />
                </div>

                {/* Reply/Edit indicator */}
                <AnimatePresence>
                  {(replyingTo || editingMessage) && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                      <div className="px-4 py-2 bg-[#0A0F2C] border-t border-[#141B3D] flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm">
                          {replyingTo && <><CornerDownLeft className="w-4 h-4 text-[#3B6FE8]" /><span className="text-gray-400">Répondre à: </span><span className="text-white truncate max-w-[200px]">{replyingTo.content.substring(0, 30)}...</span></>}
                          {editingMessage && <><Edit2 className="w-4 h-4 text-yellow-400" /><span className="text-gray-400">Modifier: </span><span className="text-yellow-400">Message en cours d'édition</span></>}
                        </div>
                        <button onClick={() => { setReplyingTo(null); setEditingMessage(null); setNewMessage(''); }} className="p-1 hover:bg-[#141B3D] rounded">
                          <X className="w-4 h-4 text-gray-500" />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Input */}
                <form onSubmit={handleSendMessage} className="p-3 sm:p-4 bg-[#0A0F2C] border-t border-[#141B3D] flex gap-2 sm:gap-3 shrink-0">
                  <label className={`p-2 sm:p-3 bg-[#141B3D] rounded-lg cursor-pointer hover:bg-[#1a2147] transition-colors shrink-0 ${uploading ? 'opacity-50 cursor-wait' : ''}`} title="Joindre un fichier">
                    <input type="file" accept="image/*,.pdf,.doc,.docx" onChange={handleFileUpload} className="hidden" disabled={uploading || submitting} />
                    {uploading ? <Loader2 className="w-5 h-5 text-gray-400 animate-spin" /> : <Paperclip className="w-5 h-5 text-gray-400" />}
                  </label>
                  <input
                    ref={inputRef}
                    type="text"
                    value={newMessage}
                    onChange={e => { setNewMessage(e.target.value); sendTypingIndicator(); }}
                    placeholder={editingMessage ? "Modifier le message..." : "Votre message..."}
                    className="flex-1 min-w-0 bg-[#141B3D] border border-[#0A0F2C] rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#3B6FE8] transition-colors text-sm sm:text-base"
                    disabled={submitting || uploading}
                  />
                  <button type="submit" disabled={(!newMessage.trim() && !editingMessage) || submitting || uploading} className="p-2 sm:p-3 bg-[#3B6FE8] hover:bg-[#5A89FF] text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed shrink-0 transition-colors">
                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
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
