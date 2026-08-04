import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, MessageSquare, FileText, Users, Settings, Video, LogOut, Clock, CheckCircle, XCircle, RefreshCw, Eye, Upload, Trash2, Star, Send, AlertCircle, Lock, User, Paperclip, ImageIcon, File, Download, Reply, Edit2, Copy, MoreVertical, Check, CheckCheck, X, Search, Loader2, CornerDownLeft, Forward, Mic, Pin, Archive, EyeOff, Filter, ChevronDown, Menu
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { uploadMultipleFiles, uploadFile, uploadToCloudinary, createFilePreview, validateFiles, formatFileSize, FilePreview } from '../../lib/storage';
import { FilePreviewModal } from '../../components/FilePreviewModal';
import { FileUploadPreview } from '../../components/FileUploadPreview';
import { VoiceRecorder, AudioPlayer } from '../../components/VoiceRecorder';
import type { Appointment, Message, Document, Testimonial, TimeSlot, TypingIndicator, Conversation, OnlineStatus } from '../../types';

type Tab = 'agenda' | 'reservations' | 'messagerie' | 'bibliotheque' | 'teleconsultation' | 'temoignages' | 'parametres';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  en_attente: { label: 'En attente', color: 'yellow', icon: Clock },
  confirme: { label: 'Confirmé', color: 'green', icon: CheckCircle },
  annule: { label: 'Annulé', color: 'red', icon: XCircle },
  reporte: { label: 'Reporté', color: 'blue', icon: RefreshCw },
};

const TABS: { id: Tab; label: string; icon: typeof Calendar }[] = [
  { id: 'agenda', label: 'Agenda', icon: Calendar },
  { id: 'reservations', label: 'Réservations', icon: Clock },
  { id: 'messagerie', label: 'Messagerie', icon: MessageSquare },
  { id: 'bibliotheque', label: 'Bibliothèque', icon: FileText },
  { id: 'teleconsultation', label: 'Téléconsultation', icon: Video },
  { id: 'temoignages', label: 'Témoignages', icon: Star },
  { id: 'parametres', label: 'Paramètres', icon: Settings },
];

function DashboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>('agenda');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchConversation, setSearchConversation] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'pinned' | 'archived' | 'unread'>('all');

  useEffect(() => {
    const fetchData = async () => {
      const [appointmentsData, messagesData, documentsData, testimonialsData, slotsData] = await Promise.all([
        supabase.from('appointments').select('*').order('created_at', { ascending: false }),
        supabase.from('messages').select('*').order('created_at', { ascending: true }),
        supabase.from('documents').select('*').order('created_at', { ascending: false }),
        supabase.from('testimonials').select('*').order('created_at', { ascending: false }),
        supabase.from('time_slots').select('*').order('slot_date', { ascending: true }),
      ]);

      if (appointmentsData.data) setAppointments(appointmentsData.data);
      if (messagesData.data) setMessages(messagesData.data);
      if (documentsData.data) setDocuments(documentsData.data);
      if (testimonialsData.data) setTestimonials(testimonialsData.data);
      if (slotsData.data) setTimeSlots(slotsData.data);
    };
    fetchData();

    // Real-time subscriptions
    const appointmentsChannel = supabase.channel('appointments-admin').on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
      supabase.from('appointments').select('*').order('created_at', { ascending: false }).then(({ data }) => { if (data) setAppointments(data); });
    }).subscribe();

    const messagesChannel = supabase.channel('messages-admin').on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
      supabase.from('messages').select('*').order('created_at', { ascending: true }).then(({ data }) => { if (data) setMessages(data); });
    }).subscribe();

    return () => { appointmentsChannel.unsubscribe(); messagesChannel.unsubscribe(); };
  }, []);

  // Update conversations from messages
  useEffect(() => {
    const convMap = new Map<string, Conversation>();
    messages.forEach(msg => {
      if (!convMap.has(msg.conversation_id)) {
        convMap.set(msg.conversation_id, {
          id: msg.conversation_id,
          patient_name: msg.sender_type === 'patient' ? msg.sender_name : 'Patient',
          patient_email: msg.sender_email || '',
          last_message_at: msg.created_at,
          last_message_content: msg.content,
          last_message_sender: msg.sender_type,
          created_at: msg.created_at,
          updated_at: msg.created_at,
        });
      } else {
        const conv = convMap.get(msg.conversation_id)!;
        if (new Date(msg.created_at) > new Date(conv.last_message_at)) {
          conv.last_message_at = msg.created_at;
          conv.last_message_content = msg.content;
          conv.last_message_sender = msg.sender_type;
        }
      }
    });
    setConversations(Array.from(convMap.values()).sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()));
  }, [messages]);

  const handleLogout = () => {
    if (confirm('Déconnexion ?')) {
      window.location.reload();
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'agenda':
        return <AgendaTab appointments={appointments} />;
      case 'reservations':
        return <ReservationsTab appointments={appointments} setAppointments={setAppointments} />;
      case 'messagerie':
        return <MessagerieTab messages={messages} setMessages={setMessages} conversations={conversations} selectedConversation={selectedConversation} setSelectedConversation={setSelectedConversation} searchConversation={searchConversation} setSearchConversation={setSearchConversation} filterMode={filterMode} setFilterMode={setFilterMode} />;
      case 'bibliotheque':
        return <BibliothequeTab documents={documents} setDocuments={setDocuments} />;
      case 'teleconsultation':
        return <TeleconsultationTab />;
      case 'temoignages':
        return <TemoignagesTab testimonials={testimonials} setTestimonials={setTestimonials} />;
      case 'parametres':
        return <ParametresTab />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#050810]">
      <div className="flex h-screen overflow-hidden">
        {/* Mobile menu button */}
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-[#141B3D] rounded-lg">
          <Menu className="w-6 h-6 text-white" />
        </button>

        {/* Sidebar */}
        <motion.aside initial={{ x: -280 }} animate={{ x: sidebarOpen ? 0 : window.innerWidth >= 1024 ? 0 : -280 }} className="fixed lg:static inset-y-0 left-0 z-40 w-64 bg-[#0A0F2C] border-r border-[#141B3D] flex flex-col">
          <div className="p-4 border-b border-[#141B3D]">
            <h1 className="text-white font-serif text-xl">Dr. Djalane</h1>
            <p className="text-gray-500 text-sm">Tableau de bord</p>
          </div>
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === tab.id ? 'bg-[#3B6FE8] text-white' : 'text-gray-400 hover:bg-[#141B3D]'}`}>
                <tab.icon className="w-5 h-5" />
                <span className="text-sm">{tab.label}</span>
              </button>
            ))}
          </nav>
          <div className="p-4 border-t border-[#141B3D]">
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors">
              <LogOut className="w-5 h-5" />
              <span className="text-sm">Déconnexion</span>
            </button>
          </div>
        </motion.aside>

        {/* Overlay */}
        {sidebarOpen && <div className="lg:hidden fixed inset-0 bg-black/50 z-30" onClick={() => setSidebarOpen(false)} />}

        {/* Main content */}
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
          <div className="max-w-6xl mx-auto pt-12 lg:pt-0">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              {renderTabContent()}
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  );
}

// Agenda Tab
function AgendaTab({ appointments }: { appointments: Appointment[] }) {
  const todayAppointments = appointments.filter(a => new Date(a.appointment_date).toDateString() === new Date().toDateString() && a.status !== 'annule');

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-serif text-white">Agenda du jour</h2>
      {todayAppointments.length === 0 ? (
        <div className="bg-[#141B3D] rounded-xl p-8 text-center">
          <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">Aucun rendez-vous aujourd'hui</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {todayAppointments.map(apt => (
            <motion.div key={apt.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-[#141B3D] rounded-xl p-4 border border-[#0A0F2C]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">{apt.patient_name}</p>
                  <p className="text-gray-400 text-sm">{apt.motive}</p>
                </div>
                <div className="flex items-center gap-2 text-[#3B6FE8]">
                  <Clock className="w-4 h-4" />
                  <span>{apt.time_slot}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// Reservations Tab
function ReservationsTab({ appointments, setAppointments }: { appointments: Appointment[]; setAppointments: (a: Appointment[]) => void }) {
  const [filter, setFilter] = useState<string>('all');

  const filteredAppointments = filter === 'all' ? appointments : appointments.filter(a => a.status === filter);

  const updateStatus = async (id: string, status: Appointment['status']) => {
    await supabase.from('appointments').update({ status }).eq('id', id);
    setAppointments(appments => appments.map(a => a.id === id ? { ...a, status } : a));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-serif text-white">Réservations</h2>
        <div className="flex gap-2 flex-wrap">
          {['all', 'en_attente', 'confirme', 'annule', 'reporte'].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1 rounded text-sm ${filter === f ? 'bg-[#3B6FE8] text-white' : 'bg-[#141B3D] text-gray-400'}`}>
              {f === 'all' ? 'Tous' : STATUS_CONFIG[f]?.label || f}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {filteredAppointments.map(apt => {
          const StatusIcon = STATUS_CONFIG[apt.status]?.icon || Clock;
          const statusConfig = STATUS_CONFIG[apt.status];

          return (
            <motion.div key={apt.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-[#141B3D] rounded-xl p-4 border border-[#0A0F2C]">
              <div className="flex flex-col sm:flex-row items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <StatusIcon className={`w-4 h-4 ${statusConfig?.color === 'green' ? 'text-green-400' : statusConfig?.color === 'red' ? 'text-red-400' : statusConfig?.color === 'yellow' ? 'text-yellow-400' : 'text-blue-400'}`} />
                    <span className="text-white font-medium truncate">{apt.patient_name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${statusConfig?.color === 'green' ? 'bg-green-500/20 text-green-400' : statusConfig?.color === 'red' ? 'bg-red-500/20 text-red-400' : statusConfig?.color === 'yellow' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-blue-500/20 text-blue-400'}`}>
                      {STATUS_CONFIG[apt.status]?.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-gray-400">
                    <span className="truncate">{apt.patient_email}</span>
                    <span>{apt.appointment_date} à {apt.time_slot}</span>
                    <span className="truncate">{apt.motive}</span>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  {apt.status === 'en_attente' && (
                    <>
                      <button onClick={() => updateStatus(apt.id, 'confirme')} className="p-2 bg-green-500/20 text-green-400 rounded hover:bg-green-500/30 transition-colors" title="Confirmer">
                        <CheckCircle className="w-5 h-5" />
                      </button>
                      <button onClick={() => updateStatus(apt.id, 'annule')} className="p-2 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors" title="Annuler">
                        <XCircle className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// Messagerie Tab
function MessagerieTab({ messages, setMessages, conversations, selectedConversation, setSelectedConversation, searchConversation, setSearchConversation, filterMode, setFilterMode }: {
  messages: Message[];
  setMessages: (m: Message[]) => void;
  conversations: Conversation[];
  selectedConversation: string | null;
  setSelectedConversation: (id: string | null) => void;
  searchConversation: string;
  setSearchConversation: (s: string) => void;
  filterMode: 'all' | 'pinned' | 'archived' | 'unread';
  setFilterMode: (m: 'all' | 'pinned' | 'archived' | 'unread') => void;
}) {
  const [replyContent, setReplyContent] = useState('');
  const [sending, setSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [contextMenu, setContextMenu] = useState<{ messageId: string; x: number; y: number } | null>(null);
  const [convMenu, setConvMenu] = useState<{ convId: string; x: number; y: number } | null>(null);
  const [typing, setTyping] = useState<TypingIndicator | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [patientOnline, setPatientOnline] = useState<OnlineStatus | null>(null);
  const [pendingFiles, setPendingFiles] = useState<FilePreview[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Map<string, number>>(new Map());
  const [uploadStatus, setUploadStatus] = useState<Map<string, 'pending' | 'uploading' | 'complete' | 'error'>>(new Map());
  const [uploadErrors, setUploadErrors] = useState<Map<string, string>>(new Map());
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [previewFiles, setPreviewFiles] = useState<Array<{ url: string; name: string; type: string }>>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [pinnedConvs, setPinnedConvs] = useState<Set<string>>(new Set());
  const [archivedConvs, setArchivedConvs] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const convMessages = messages.filter(m => m.conversation_id === selectedConversation && !m.deleted_at);

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [convMessages, scrollToBottom]);

  // Load pinned/archived status
  useEffect(() => {
    supabase.from('conversation_participants').select('conversation_id, is_pinned, is_archived').eq('user_type', 'doctor').then(({ data }) => {
      if (data) {
        const pinned = new Set<string>();
        const archived = new Set<string>();
        data.forEach(p => {
          if (p.is_pinned) pinned.add(p.conversation_id);
          if (p.is_archived) archived.add(p.conversation_id);
        });
        setPinnedConvs(pinned);
        setArchivedConvs(archived);
      }
    });
  }, []);

  // Mark messages as read when viewing
  useEffect(() => {
    if (selectedConversation && convMessages.length > 0) {
      supabase.rpc('mark_messages_read', { p_conversation_id: selectedConversation, p_user_type: 'doctor' });
    }
  }, [selectedConversation, convMessages.length]);

  // Real-time subscription
  useEffect(() => {
    if (!selectedConversation) return;
    const channel = supabase.channel(`admin-messages-${selectedConversation}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${selectedConversation}` },
        (payload) => { setMessages(prev => prev.some(m => m.id === payload.new.id) ? prev : [...prev, payload.new as Message]); })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${selectedConversation}` },
        (payload) => { setMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new as Message : m)); })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${selectedConversation}` },
        (payload) => { setMessages(prev => prev.filter(m => m.id !== payload.old.id)); })
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [selectedConversation, setMessages]);

  // Typing indicator
  useEffect(() => {
    if (!selectedConversation) return;
    const channel = supabase.channel(`admin-typing-${selectedConversation}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'typing_indicators', filter: `conversation_id=eq.${selectedConversation}` },
        (payload) => {
          const data = payload.new as TypingIndicator;
          if (data.user_type === 'patient') { setTyping(data); setTimeout(() => setTyping(null), 3000); }
        })
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [selectedConversation]);

  // Online status
  useEffect(() => {
    if (!selectedConversation) return;
    const channel = supabase.channel(`admin-online-${selectedConversation}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_online_status', filter: `conversation_id=eq.${selectedConversation}` },
        async () => {
          const { data } = await supabase.from('user_online_status').select('*').eq('conversation_id', selectedConversation).eq('user_type', 'patient').single();
          if (data) setPatientOnline(data as OnlineStatus);
        })
      .subscribe();

    supabase.from('user_online_status').select('*').eq('conversation_id', selectedConversation).eq('user_type', 'patient').single().then(({ data }) => {
      if (data) setPatientOnline(data as OnlineStatus);
    });

    // Set doctor online
    supabase.rpc('set_user_online', { p_conversation_id: selectedConversation, p_user_type: 'doctor', p_is_online: true });

    return () => { channel.unsubscribe(); };
  }, [selectedConversation]);

  const sendTypingIndicator = useCallback(async () => {
    if (!selectedConversation) return;
    await supabase.from('typing_indicators').upsert({
      conversation_id: selectedConversation, user_type: 'doctor', user_name: 'Dr. Djalane', created_at: new Date().toISOString()
    }, { onConflict: 'conversation_id,user_type' });
  }, [selectedConversation]);

  const processFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validation = validateFiles(fileArray);
    if (!validation.valid) { validation.errors.forEach(err => alert(err)); return; }
    const previews: FilePreview[] = [];
    for (const file of fileArray) previews.push(await createFilePreview(file));
    setPendingFiles(prev => [...prev, ...previews]);
  }, []);

  const removePendingFile = useCallback((index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Conversation management functions
  const handlePinConversation = async (convId: string) => {
    const isPinned = pinnedConvs.has(convId);
    if (!isPinned && pinnedConvs.size >= 3) {
      alert('Maximum 3 conversations épinglées');
      return;
    }
    await supabase.rpc('toggle_pin_conversation', { p_conversation_id: convId, p_user_type: 'doctor', p_pin: !isPinned });
    setPinnedConvs(prev => {
      const newSet = new Set(prev);
      if (isPinned) newSet.delete(convId);
      else newSet.add(convId);
      return newSet;
    });
    setConvMenu(null);
  };

  const handleArchiveConversation = async (convId: string) => {
    const isArchived = archivedConvs.has(convId);
    await supabase.rpc('toggle_archive_conversation', { p_conversation_id: convId, p_user_type: 'doctor', p_archive: !isArchived });
    setArchivedConvs(prev => {
      const newSet = new Set(prev);
      if (isArchived) newSet.delete(convId);
      else newSet.add(convId);
      return newSet;
    });
    setConvMenu(null);
  };

  const handleDeleteConversation = async (convId: string) => {
    if (!confirm('Supprimer cette conversation ?')) return;
    await supabase.rpc('delete_conversation_for_user', { p_conversation_id: convId, p_user_type: 'doctor' });
    if (selectedConversation === convId) setSelectedConversation(null);
    setMessages(prev => prev.filter(m => m.conversation_id !== convId));
    setConvMenu(null);
  };

  const handleMarkAsRead = async (convId: string) => {
    await supabase.rpc('mark_conversation_read', { p_conversation_id: convId, p_user_type: 'doctor' });
    setConvMenu(null);
  };

  const handleMarkAsUnread = async (convId: string) => {
    await supabase.rpc('mark_conversation_unread', { p_conversation_id: convId, p_user_type: 'doctor' });
    setConvMenu(null);
  };

  const handleSendFiles = async () => {
    if (pendingFiles.length === 0 || !selectedConversation) return;
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
          conversation_id: selectedConversation, sender_type: 'doctor', sender_name: 'Dr. Djalane',
          content: '[Fichier joint]', attachment_url: result.url, attachment_name: result.name, attachment_type: result.type,
        };
        if (replyingTo) msgData.reply_to_id = replyingTo.id;
        const { data, error } = await supabase.from('messages').insert(msgData).select().single();
        if (data && !error) setMessages(prev => [...prev, data]);
      }
      setPendingFiles([]); setUploadProgress(new Map()); setUploadStatus(new Map()); setUploadErrors(new Map()); setReplyingTo(null);
    } catch (err) { console.error(err); alert('Erreur'); }
    setIsUploading(false);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); }, []);
  const handleDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); if (e.dataTransfer.files.length > 0) processFiles(e.dataTransfer.files); }, [processFiles]);

  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items; if (!items) return;
      const files: File[] = [];
      for (const item of items) { if (item.type.startsWith('image/')) { const file = item.getAsFile(); if (file) files.push(file); } }
      if (files.length > 0) { e.preventDefault(); await processFiles(files); }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [processFiles]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) processFiles(e.target.files);
    e.target.value = '';
  };

  const handleVoiceSend = async (audioBlob: Blob, duration: number) => {
    if (!selectedConversation) return;
    setIsUploading(true);
    try {
      const file = new File([audioBlob], `voice_${Date.now()}.webm`, { type: 'audio/webm' });
      const result = await uploadFile(file, 'messages');
      if (result) {
        const msgData: Record<string, unknown> = {
          conversation_id: selectedConversation, sender_type: 'doctor', sender_name: 'Dr. Djalane',
          content: '[Message vocal]', attachment_url: result.url, attachment_name: 'Message vocal',
          attachment_type: 'audio', attachment_duration: Math.round(duration),
        };
        if (replyingTo) msgData.reply_to_id = replyingTo.id;
        const { data, error } = await supabase.from('messages').insert(msgData).select().single();
        if (data && !error) setMessages(prev => [...prev, data]);
        setReplyingTo(null);
      }
    } catch (err) { console.error(err); alert('Erreur'); }
    setIsUploading(false);
    setShowVoiceRecorder(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleReply(e as unknown as React.FormEvent);
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pendingFiles.length > 0) { await handleSendFiles(); return; }
    if (!replyContent.trim() || !selectedConversation) return;

    const content = replyContent.trim();
    setReplyContent('');

    if (editingMessage) {
      const { error } = await supabase.from('messages').update({
        content, is_edited: true, edited_at: new Date().toISOString()
      }).eq('id', editingMessage.id);
      if (!error) setMessages(prev => prev.map(m => m.id === editingMessage.id ? { ...m, content, is_edited: true, edited_at: new Date().toISOString() } : m));
      setEditingMessage(null);
    } else {
      setSending(true);
      const msgData: Record<string, unknown> = { conversation_id: selectedConversation, sender_type: 'doctor', sender_name: 'Dr. Djalane', content };
      if (replyingTo) msgData.reply_to_id = replyingTo.id;
      const { data, error } = await supabase.from('messages').insert(msgData).select().single();
      if (data && !error) setMessages(prev => [...prev, data]);
      if (error) setReplyContent(content);
      setReplyingTo(null);
      setSending(false);
    }
  };

  const handleEdit = (msg: Message) => {
    if (msg.sender_type !== 'doctor') return;
    setEditingMessage(msg); setReplyContent(msg.content); setReplyingTo(null); inputRef.current?.focus();
  };
  const handleDelete = async (msg: Message) => {
    if (msg.sender_type !== 'doctor') return;
    if (!confirm('Supprimer ?')) return;
    await supabase.from('messages').update({ deleted_at: new Date().toISOString(), content: '[Message supprimé]' }).eq('id', msg.id);
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, deleted_at: new Date().toISOString(), content: '[Message supprimé]' } : m));
    setContextMenu(null);
  };
  const handleCopy = (content: string) => { navigator.clipboard.writeText(content); setContextMenu(null); };

  const formatTime = (date: Date) => date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const formatLastTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "À l'instant";
    if (mins < 60) return `Il y a ${mins} min`;
    if (mins < 1440) return `Il y a ${Math.floor(mins / 60)}h`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const openGallery = (msg: Message, allMsgs: Message[]) => {
    const images = allMsgs.filter(m => m.attachment_type === 'image' && m.attachment_url);
    const index = images.findIndex(m => m.id === msg.id);
    setPreviewFiles(images.map(m => ({ url: m.attachment_url!, name: m.attachment_name || 'Image', type: 'image' })));
    setPreviewIndex(index >= 0 ? index : 0);
    setShowPreview(true);
  };

  const renderAttachment = (msg: Message, allMsgs: Message[]) => {
    if (!msg.attachment_url) return null;
    if (msg.attachment_type === 'audio') {
      return <div className="mt-2"><AudioPlayer src={msg.attachment_url} duration={msg.attachment_duration} isOwn={msg.sender_type === 'doctor'} /></div>;
    }
    if (msg.attachment_type === 'image') {
      const imagesInChat = allMsgs.filter(m => m.attachment_type === 'image' && m.attachment_url);
      return (
        <div className="mt-2 relative group">
          <button onClick={() => openGallery(msg, allMsgs)} className="block rounded-lg overflow-hidden">
            <img src={msg.attachment_url} alt={msg.attachment_name || 'Image'} className="max-w-full max-h-48 object-contain rounded-lg" loading="lazy" />
          </button>
          {imagesInChat.length > 1 && (
            <span className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 rounded text-white text-xs flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <ImageIcon className="w-3 h-3" /> {imagesInChat.findIndex(m => m.id === msg.id) + 1}/{imagesInChat.length}
            </span>
          )}
        </div>
      );
    }
    const Icon = msg.attachment_type === 'pdf' ? FileText : File;
    return (
      <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" download={msg.attachment_name} className="flex items-center gap-2 mt-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
        <Icon className={`w-5 h-5 shrink-0 ${msg.attachment_type === 'pdf' ? 'text-red-400' : 'text-blue-400'}`} />
        <span className="text-sm truncate flex-1">{msg.attachment_name || 'Document'}</span>
        <Download className="w-4 h-4 opacity-60" />
      </a>
    );
  };

  const renderStatus = (msg: Message) => {
    if (msg.sender_type !== 'doctor') return null;
    if (msg.status === 'read' || msg.read_at) return <CheckCheck className="w-4 h-4 text-blue-300" />;
    if (msg.status === 'delivered') return <CheckCheck className="w-4 h-4 text-gray-400" />;
    return <Check className="w-4 h-4 text-gray-400" />;
  };

  const filteredMessages = searchQuery ? convMessages.filter(m => m.content.toLowerCase().includes(searchQuery.toLowerCase())) : convMessages;

  // Sort conversations: pinned first, then by last message time
  const sortedConversations = [...conversations].sort((a, b) => {
    const aPinned = pinnedConvs.has(a.id);
    const bPinned = pinnedConvs.has(b.id);
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
  });

  const filteredConversations = sortedConversations.filter(c => {
    // Filter out archived conversations unless filterMode is archived
    if (filterMode === 'archived') {
      return archivedConvs.has(c.id);
    }
    if (archivedConvs.has(c.id) && filterMode !== 'all') return false;

    // Apply search
    if (searchConversation && !c.patient_name.toLowerCase().includes(searchConversation.toLowerCase()) && !c.last_message_content.toLowerCase().includes(searchConversation.toLowerCase())) {
      return false;
    }

    // Apply unread filter
    if (filterMode === 'unread') {
      const unread = messages.filter(m => m.conversation_id === c.id && m.sender_type === 'patient' && !m.read_at).length;
      return unread > 0;
    }

    // Apply pinned filter
    if (filterMode === 'pinned') {
      return pinnedConvs.has(c.id);
    }

    return true;
  });

  const getUnreadCount = (convId: string) => messages.filter(m => m.conversation_id === convId && m.sender_type === 'patient' && !m.read_at).length;

  useEffect(() => {
    const handleClick = () => { setContextMenu(null); setConvMenu(null); };
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
      <div ref={dropZoneRef} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} className={`bg-[#141B3D] border border-[#0A0F2C] rounded-xl h-[500px] sm:h-[600px] flex flex-col sm:flex-row relative ${isDragOver ? 'ring-2 ring-[#3B6FE8] ring-inset' : ''}`}>
        {/* Drag overlay */}
        <AnimatePresence>
          {isDragOver && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-30 bg-[#3B6FE8]/20 flex items-center justify-center">
              <div className="bg-[#141B3D] px-6 py-4 rounded-xl border-2 border-dashed border-[#3B6FE8] flex items-center gap-3">
                <Upload className="w-6 h-6 text-[#3B6FE8]" />
                <span className="text-white font-medium">Déposez vos fichiers ici</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Conversations list */}
        <div className="w-full sm:w-80 border-b sm:border-b-0 sm:border-r border-[#0A0F2C] overflow-y-auto max-h-[180px] sm:max-h-none flex flex-col">
          <div className="p-3 border-b border-[#0A0F2C] sticky top-0 bg-[#141B3D] z-10">
            <div className="flex items-center gap-2 mb-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input type="text" value={searchConversation} onChange={e => setSearchConversation(e.target.value)} placeholder="Rechercher..." className="w-full pl-9 pr-3 py-2 bg-[#0A0F2C] border border-[#141B3D] rounded-lg text-white text-sm focus:outline-none focus:border-[#3B6FE8]" />
              </div>
              <button onClick={() => setFilterMode(f => f === 'unread' ? 'all' : f === 'all' ? 'pinned' : f === 'pinned' ? 'archived' : 'unread')} className={`p-2 rounded-lg ${filterMode !== 'all' ? 'bg-[#3B6FE8] text-white' : 'bg-[#0A0F2C] text-gray-400'}`} title={`Filtre: ${filterMode === 'all' ? 'Tous' : filterMode === 'unread' ? 'Non lus' : filterMode === 'pinned' ? 'Épinglés' : 'Archivés'}`}>
                <Filter className="w-4 h-4" />
              </button>
              <button onClick={() => setFilterMode('all')} className="p-2 rounded-lg bg-[#0A0F2C] text-gray-400 hover:text-white transition-colors" title="Réinitialiser">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-1 text-[10px]">
              {filterMode !== 'all' && (
                <span className="px-2 py-0.5 bg-[#3B6FE8]/20 text-[#3B6FE8] rounded">{filterMode === 'unread' ? 'Non lus' : filterMode === 'pinned' ? 'Épinglés' : 'Archivés'}</span>
              )}
            </div>
          </div>

          <div className="divide-y divide-[#0A0F2C] flex-1 overflow-y-auto">
            {filteredConversations.map(conv => {
              const unread = getUnreadCount(conv.id);
              const isSelected = selectedConversation === conv.id;
              const isPinned = pinnedConvs.has(conv.id);
              const isArchived = archivedConvs.has(conv.id);

              return (
                <div key={conv.id} className="relative">
                  <button onClick={() => setSelectedConversation(conv.id)} className={`w-full p-3 text-left hover:bg-[#0A0F2C] transition-colors ${isSelected ? 'bg-[#0A0F2C]' : ''}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#3B6FE8]/20 flex items-center justify-center shrink-0 relative">
                        <User className="w-5 h-5 text-[#3B6FE8]" />
                        {isPinned && <Pin className="w-3 h-3 text-yellow-400 absolute -top-1 -right-1" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className={`font-medium text-sm truncate ${unread > 0 ? 'text-white' : 'text-gray-300'}`}>
                            {conv.patient_name}
                          </span>
                          <span className="text-[10px] text-gray-500 shrink-0 ml-2">{formatLastTime(conv.last_message_at)}</span>
                        </div>
                        <p className={`text-xs truncate mt-0.5 ${unread > 0 ? 'text-gray-300' : 'text-gray-500'}`}>
                          {conv.last_message_sender === 'doctor' ? 'Vous: ' : ''}{conv.last_message_content.substring(0, 40)}
                        </p>
                      </div>
                      {unread > 0 && (
                        <span className="ml-2 px-2 py-0.5 bg-[#3B6FE8] text-white text-xs rounded-full shrink-0">{unread}</span>
                      )}
                    </div>
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setConvMenu({ convId: conv.id, x: Math.min(e.clientX, window.innerWidth - 180), y: Math.min(e.clientY, window.innerHeight - 250) }); }} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded hover:bg-[#0A0F2C] transition-colors">
                    <MoreVertical className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col min-h-0">
          {selectedConversation ? (
            <>
              {/* Header */}
              <div className="p-3 sm:p-4 border-b border-[#0A0F2C] bg-[#0A0F2C]/50 shrink-0 flex items-center justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-white font-medium text-sm sm:text-base truncate">
                      {conversations.find(c => c.id === selectedConversation)?.patient_name || 'Patient'}
                    </h3>
                    <span className={`w-2 h-2 rounded-full shrink-0 ${patientOnline?.is_online ? 'bg-green-500' : 'bg-gray-500'}`} />
                  </div>
                  {typing ? (
                    <p className="text-[#3B6FE8] text-xs animate-pulse">En train d'écrire...</p>
                  ) : patientOnline?.is_online ? (
                    <p className="text-green-400 text-xs">En ligne</p>
                  ) : (
                    <p className="text-gray-500 text-xs">Hors ligne</p>
                  )}
                </div>
                <div className="relative">
                  <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Rechercher..." className="w-32 sm:w-40 px-3 py-1 bg-[#141B3D] border border-[#0A0F2C] rounded-lg text-white text-xs focus:outline-none focus:border-[#3B6FE8]" />
                  {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2"><X className="w-3 h-3 text-gray-500" /></button>}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 bg-[#0A0F2C]" onClick={() => { setContextMenu(null); setConvMenu(null); }}>
                {filteredMessages.map(msg => {
                  const isOwn = msg.sender_type === 'doctor';
                  return (
                    <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} relative group`}>
                      <div className={`max-w-[85%] sm:max-w-[75%] p-3 rounded-2xl relative ${isOwn ? 'bg-[#3B6FE8] text-white rounded-br-sm' : 'bg-[#141B3D] text-gray-300 rounded-bl-sm'} ${msg.deleted_at ? 'opacity-50 italic' : ''}`}>
                        {msg.reply_to_id && <div className={`mb-2 pl-2 border-l-2 text-xs ${isOwn ? 'border-blue-200 text-blue-100' : 'border-gray-500 text-gray-500'}`}>↳ Message...</div>}
                        <button onClick={(e) => { e.stopPropagation(); setContextMenu({ messageId: msg.id, x: Math.min(e.clientX, window.innerWidth - 160), y: Math.min(e.clientY, window.innerHeight - 180) }); }} className="absolute top-1 right-1 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-white/10 transition-opacity">
                          <MoreVertical className="w-4 h-4 opacity-50" />
                        </button>
                        {msg.content !== '[Fichier joint]' && msg.content !== '[Message supprimé]' ? (
                          <p className="text-sm whitespace-pre-wrap break-words pr-5">{msg.content}</p>
                        ) : (
                          <p className="text-sm italic opacity-70 pr-5">{msg.content}</p>
                        )}
                        {renderAttachment(msg, messages)}
                        <div className={`flex items-center justify-end gap-1 mt-1 ${isOwn ? 'text-blue-100/70' : 'text-gray-500'}`}>
                          <span className="text-[10px] sm:text-xs">{formatTime(new Date(msg.created_at))}</span>
                          {msg.is_edited && <span className="text-[10px]">(modifié)</span>}
                          {renderStatus(msg)}
                        </div>
                      </div>

                      {contextMenu?.messageId === msg.id && (
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="fixed z-50 bg-[#1a2147] border border-[#3B6FE8]/30 rounded-lg shadow-lg py-1 min-w-[130px]" style={{ left: contextMenu.x, top: contextMenu.y }} onClick={e => e.stopPropagation()}>
                          <button onClick={() => { setReplyingTo(msg); setContextMenu(null); }} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[#3B6FE8]/20 text-gray-300 text-xs"><Reply className="w-4 h-4" /> Répondre</button>
                          <button onClick={() => handleCopy(msg.content)} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[#3B6FE8]/20 text-gray-300 text-xs"><Copy className="w-4 h-4" /> Copier</button>
                          {isOwn && !msg.deleted_at && (
                            <>
                              <button onClick={() => handleEdit(msg)} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[#3B6FE8]/20 text-gray-300 text-xs"><Edit2 className="w-4 h-4" /> Modifier</button>
                              <button onClick={() => handleDelete(msg)} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-red-500/20 text-red-400 text-xs"><Trash2 className="w-4 h-4" /> Supprimer</button>
                            </>
                          )}
                        </motion.div>
                      )}
                    </motion.div>
                  );
                })}
                <div ref={messagesEndRef} className="h-1" />
              </div>

              {/* File preview */}
              <FileUploadPreview files={pendingFiles} uploadProgress={uploadProgress} uploadStatus={uploadStatus} uploadErrors={uploadErrors} onRemove={removePendingFile} />

              {/* Reply/Edit indicator */}
              <AnimatePresence>
                {(replyingTo || editingMessage) && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                    <div className="px-4 py-2 bg-[#0A0F2C] border-t border-[#141B3D] flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs">
                        {replyingTo && <><CornerDownLeft className="w-4 h-4 text-[#3B6FE8]" /><span className="text-gray-400">Répondre à: </span><span className="text-gray-300 truncate max-w-[150px]">{replyingTo.content.substring(0, 30)}...</span></>}
                        {editingMessage && <><Edit2 className="w-4 h-4 text-yellow-400" /><span className="text-gray-400">Modifier le message</span></>}
                      </div>
                      <button onClick={() => { setReplyingTo(null); setEditingMessage(null); setReplyContent(''); }} className="p-1 hover:bg-[#141B3D] rounded"><X className="w-4 h-4 text-gray-500" /></button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Voice recorder or Input */}
              <AnimatePresence mode="wait">
                {showVoiceRecorder ? (
                  <VoiceRecorder onSend={handleVoiceSend} onCancel={() => setShowVoiceRecorder(false)} />
                ) : (
                  <motion.div key="input" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-3 sm:p-4 border-t border-[#0A0F2C] shrink-0">
                    <form onSubmit={handleReply} className="flex gap-2 items-end">
                      <label className={`p-2 sm:p-2.5 bg-[#0A0F2C] rounded-lg cursor-pointer hover:bg-[#1a2147] transition-colors shrink-0 ${isUploading ? 'opacity-50' : ''}`}>
                        <input ref={fileInputRef} type="file" accept="image/*,.pdf,.doc,.docx" multiple onChange={handleFileSelect} className="hidden" disabled={sending || isUploading} />
                        {isUploading ? <Loader2 className="w-5 h-5 text-gray-400 animate-spin" /> : <Paperclip className="w-5 h-5 text-gray-400" />}
                      </label>
                      <div className="flex-1 min-w-0">
                        <textarea
                          ref={inputRef}
                          value={replyContent}
                          onChange={e => { setReplyContent(e.target.value); sendTypingIndicator(); }}
                          onKeyDown={handleKeyDown}
                          placeholder={pendingFiles.length > 0 ? `${pendingFiles.length} fichier(s)` : "Message... (Entrée = envoyer)"}
                          className="w-full min-h-[40px] max-h-32 px-3 py-2 bg-[#0A0F2C] border border-[#141B3D] rounded-lg text-white text-sm focus:outline-none focus:border-[#3B6FE8] resize-none"
                          disabled={sending || isUploading}
                          rows={1}
                          onInput={(e) => {
                            const target = e.target as HTMLTextAreaElement;
                            target.style.height = 'auto';
                            target.style.height = Math.min(target.scrollHeight, 128) + 'px';
                          }}
                        />
                      </div>
                      <button type="button" onClick={() => setShowVoiceRecorder(true)} className="p-2 sm:p-2.5 bg-[#0A0F2C] hover:bg-[#1a2147] rounded-lg transition-colors shrink-0" title="Message vocal">
                        <Mic className="w-5 h-5 text-gray-400" />
                      </button>
                      <button type="submit" disabled={sending || isUploading || (!replyContent.trim() && pendingFiles.length === 0)} className="p-2 sm:p-2.5 bg-[#3B6FE8] hover:bg-[#5A89FF] text-white rounded-lg disabled:opacity-50 shrink-0">
                        {sending || isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                      </button>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="text-center"><MessageSquare className="w-12 h-12 text-gray-700 mx-auto mb-3" /><p className="text-gray-500 text-sm">Sélectionnez une conversation</p></div>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showPreview && previewFiles.length > 0 && (
          <FilePreviewModal files={previewFiles} initialIndex={previewIndex} onClose={() => setShowPreview(false)} />
        )}
      </AnimatePresence>

      {/* Conversation context menu */}
      <AnimatePresence>
        {convMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed z-50 bg-[#1a2147] border border-[#3B6FE8]/30 rounded-lg shadow-lg py-1 min-w-[160px]"
            style={{ left: convMenu.x, top: convMenu.y }}
            onClick={e => e.stopPropagation()}
          >
            <button onClick={() => handlePinConversation(convMenu.convId)} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[#3B6FE8]/20 text-gray-300 text-xs">
              <Pin className="w-4 h-4" />
              {pinnedConvs.has(convMenu.convId) ? 'Désépingler' : 'Épingler'}
            </button>
            <button onClick={() => handleArchiveConversation(convMenu.convId)} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[#3B6FE8]/20 text-gray-300 text-xs">
              <Archive className="w-4 h-4" />
              {archivedConvs.has(convMenu.convId) ? 'Désarchiver' : 'Archiver'}
            </button>
            <button onClick={() => handleMarkAsRead(convMenu.convId)} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[#3B6FE8]/20 text-gray-300 text-xs">
              <Eye className="w-4 h-4" />
              Marquer comme lu
            </button>
            <button onClick={() => handleMarkAsUnread(convMenu.convId)} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[#3B6FE8]/20 text-gray-300 text-xs">
              <EyeOff className="w-4 h-4" />
              Marquer comme non lu
            </button>
            <div className="border-t border-[#0A0F2C] my-1" />
            <button onClick={() => handleDeleteConversation(convMenu.convId)} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-red-500/20 text-red-400 text-xs">
              <Trash2 className="w-4 h-4" />
              Supprimer
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Bibliotheque Tab
function BibliothequeTab({ documents, setDocuments }: { documents: Document[]; setDocuments: (d: Document[]) => void }) {
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const channel = supabase.channel('documents-admin').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'documents' }, (payload) => {
      setDocuments(prev => prev.some(d => d.id === payload.new.id) ? prev : [payload.new as Document, ...prev]);
    }).on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'documents' }, (payload) => {
      setDocuments(prev => prev.filter(d => d.id !== payload.old.id));
    }).subscribe();
    return () => { channel.unsubscribe(); };
  }, [setDocuments]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      const { error } = await supabase.from('documents').insert({ title: file.name.split('.')[0], file_url: url, file_name: file.name, file_size: file.size });
      if (error) throw error;
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Erreur lors de l\'envoi du fichier');
    }
    setUploading(false);
    e.target.value = '';
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ?')) return;
    await supabase.from('documents').delete().eq('id', id);
    setDocuments(prev => prev.filter(d => d.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-serif text-white">Bibliothèque</h2>
        <label className="flex items-center gap-2 px-4 py-2 bg-[#3B6FE8] hover:bg-[#5A89FF] rounded-lg cursor-pointer transition-colors text-white">
          <Upload className="w-4 h-4" />
          <span>{uploading ? 'Envoi...' : 'Ajouter'}</span>
          <input type="file" onChange={handleUpload} className="hidden" accept=".pdf,.doc,.docx" disabled={uploading} />
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {documents.map(doc => (
          <motion.div key={doc.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#141B3D] rounded-xl p-4 border border-[#0A0F2C] group">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="w-8 h-8 text-red-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-white font-medium truncate">{doc.title}</p>
                  <p className="text-gray-500 text-sm">{doc.file_name}</p>
                  {doc.file_size && <p className="text-gray-600 text-xs">{formatFileSize(doc.file_size)}</p>}
                </div>
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-[#0A0F2C] rounded text-gray-400 hover:text-white transition-colors">
                  <Download className="w-4 h-4" />
                </a>
                <button onClick={() => handleDelete(doc.id)} className="p-2 hover:bg-red-500/20 rounded text-red-400 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// Teleconsultation Tab
function TeleconsultationTab() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-serif text-white">Téléconsultation</h2>
      <div className="bg-[#141B3D] rounded-xl p-8 text-center border border-[#0A0F2C]">
        <Video className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <p className="text-gray-400">Gérez vos consultations vidéo</p>
      </div>
    </div>
  );
}

// Temoignages Tab
function TemoignagesTab({ testimonials, setTestimonials }: { testimonials: Testimonial[]; setTestimonials: (t: Testimonial[]) => void }) {
  const pending = testimonials.filter(t => !t.approved);

  const handleApprove = async (id: string, approve: boolean) => {
    await supabase.from('testimonials').update({ approved: approve }).eq('id', id);
    setTestimonials(prev => prev.map(t => t.id === id ? { ...t, approved: approve } : t));
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ?')) return;
    await supabase.from('testimonials').delete().eq('id', id);
    setTestimonials(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-serif text-white">Témoignages ({pending.length} en attente)</h2>

      {pending.length === 0 ? (
        <div className="bg-[#141B3D] rounded-xl p-8 text-center border border-[#0A0F2C]">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <p className="text-gray-400">Aucun témoignage en attente</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pending.map(t => (
            <motion.div key={t.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-[#141B3D] rounded-xl p-4 border border-[#0A0F2C]">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  {t.patient_name && <p className="text-white font-medium">{t.patient_name}</p>}
                  <div className="flex items-center gap-1 my-2">
                    {[...Array(5)].map((_, i) => <Star key={i} className={`w-4 h-4 ${i < t.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`} />)}
                  </div>
                  <p className="text-gray-300 text-sm whitespace-pre-wrap">{t.content}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => handleApprove(t.id, true)} className="p-2 bg-green-500/20 text-green-400 rounded hover:bg-green-500/30 transition-colors" title="Approuver">
                    <CheckCircle className="w-5 h-5" />
                  </button>
                  <button onClick={() => handleDelete(t.id)} className="p-2 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors" title="Supprimer">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// Parametres Tab
function ParametresTab() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-serif text-white">Paramètres</h2>
      <div className="bg-[#141B3D] rounded-xl p-8 text-center border border-[#0A0F2C]">
        <Settings className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <p className="text-gray-400">Configuration du compte</p>
      </div>
    </div>
  );
}

// Export for backward compatibility
export { DashboardPage as AdminDashboard };
export default DashboardPage;
