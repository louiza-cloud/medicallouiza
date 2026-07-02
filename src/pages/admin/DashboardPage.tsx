import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, MessageSquare, FileText, Users, Settings, Video, LogOut, Clock, CheckCircle, XCircle, RefreshCw, Eye, Upload, Trash2, Star, Send, AlertCircle, Lock, User, Paperclip, Image as ImageIcon, File, Download } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { uploadToCloudinary, getFileType, isAllowedFile, validateFile } from '../../lib/storage';
import type { Appointment, Message, Document, Testimonial, TimeSlot } from '../../types';

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
  { id: 'temoignages', label: 'Témoignages', icon: Users },
  { id: 'parametres', label: 'Paramètres', icon: Settings },
];

const ADMIN_EMAIL = 'louizadjalane20@gmail.com';

export function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('agenda');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user?.email === ADMIN_EMAIL) {
        setIsAuthenticated(true);
        setLoading(false);
      } else if (session?.user?.email === ADMIN_EMAIL) {
        setIsAuthenticated(true);
        setLoading(false);
      } else if (session?.user && session.user.email !== ADMIN_EMAIL) {
        await supabase.auth.signOut();
        setLoading(false);
      } else {
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email === ADMIN_EMAIL) {
        setIsAuthenticated(true);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchData = async () => {
      const [{ data: a }, { data: m }, { data: d }, { data: t }, { data: s }] = await Promise.all([
        supabase.from('appointments').select('*').order('created_at', { ascending: false }),
        supabase.from('messages').select('*').order('created_at', { ascending: false }),
        supabase.from('documents').select('*').order('created_at', { ascending: false }),
        supabase.from('testimonials').select('*').order('created_at', { ascending: false }),
        supabase.from('time_slots').select('*').order('slot_date', { ascending: true }),
      ]);
      if (a) setAppointments(a);
      if (m) setMessages(m);
      if (d) setDocuments(d);
      if (t) setTestimonials(t);
      if (s) setTimeSlots(s);
    };
    fetchData();
  }, [isAuthenticated]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    if (loginEmail.trim().toLowerCase() !== ADMIN_EMAIL) {
      setLoginError('Accès non autorisé.');
      return;
    }

    setLoggingIn(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail.trim().toLowerCase(),
      password: loginPassword,
    });

    if (error) {
      setLoginError('Email ou mot de passe incorrect.');
      setLoggingIn(false);
      return;
    }

    setLoggingIn(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setLoginEmail('');
    setLoginPassword('');
  };

  if (loading) {
    return <div className="min-h-screen bg-[#050810] flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#3B6FE8] border-t-[#0A0F2C] rounded-full animate-spin" /></div>;
  }

  if (!isAuthenticated) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-[#050810] flex items-center justify-center p-4">
        <div className="bg-[#141B3D] border border-[#0A0F2C] rounded-xl p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-[#3B6FE8]/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Lock className="w-10 h-10 text-[#3B6FE8]" />
            </div>
            <h1 className="font-serif text-2xl text-white italic mb-2">Accès Médecin</h1>
            <p className="text-gray-400 text-sm">Connectez-vous au tableau de bord</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                <User className="w-4 h-4 inline mr-2" />
                Adresse email
              </label>
              <input
                type="email"
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
                className="w-full px-4 py-3 bg-[#0A0F2C] border border-[#141B3D] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#3B6FE8] transition-colors"
                placeholder="votre@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                <Lock className="w-4 h-4 inline mr-2" />
                Mot de passe
              </label>
              <input
                type="password"
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                className="w-full px-4 py-3 bg-[#0A0F2C] border border-[#141B3D] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#3B6FE8] transition-colors"
                placeholder="••••••••"
                required
              />
            </div>

            {loginError && (
              <div className="p-3 bg-red-900/20 border border-red-800/30 rounded-lg flex items-center gap-2 text-red-400">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="text-sm">{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loggingIn || !loginEmail.trim() || !loginPassword.trim()}
              className="w-full py-3 bg-[#3B6FE8] hover:bg-[#5A89FF] text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loggingIn ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-[#050810]">
      <header className="bg-[#0A0F2C] border-b border-[#141B3D]">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-[#3B6FE8] rounded-lg flex items-center justify-center"><Calendar className="w-5 h-5 text-white" /></div>
            <div><h1 className="text-white font-medium">Tableau de bord</h1><p className="text-gray-500 text-sm">Dr. Aziz Djalane</p></div>
          </div>
          <button onClick={handleSignOut} className="p-2 hover:bg-[#141B3D] rounded-lg text-gray-400 hover:text-red-400"><LogOut className="w-5 h-5" /></button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-[240px_1fr] gap-8">
          <nav className="lg:sticky lg:top-8 lg:self-start">
            <div className="bg-[#141B3D] border border-[#0A0F2C] rounded-xl space-y-1">
              {TABS.map(tab => {
                const Icon = tab.icon;
                const unread = messages.filter(m => !m.read_at && m.sender_type === 'patient').length;
                return (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === tab.id ? 'bg-[#3B6FE8] text-white' : 'text-gray-400 hover:bg-[#0A0F2C] hover:text-white'}`}>
                    <Icon className="w-5 h-5" />
                    <span className="text-sm font-medium">{tab.label}</span>
                    {tab.id === 'messagerie' && unread > 0 && <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-0.5">{unread}</span>}
                  </button>
                );
              })}
            </div>
          </nav>

          <main>
            <AnimatePresence mode="wait">
              {activeTab === 'agenda' && <AgendaTab key="agenda" timeSlots={timeSlots} setTimeSlots={setTimeSlots} />}
              {activeTab === 'reservations' && <ReservationsTab key="reservations" appointments={appointments} setAppointments={setAppointments} />}
              {activeTab === 'messagerie' && <MessagerieTab key="messagerie" messages={messages} setMessages={setMessages} selectedConversation={selectedConversation} setSelectedConversation={setSelectedConversation} />}
              {activeTab === 'bibliotheque' && <BibliothequeTab key="bibliotheque" documents={documents} setDocuments={setDocuments} />}
              {activeTab === 'teleconsultation' && <TeleconsultationTab key="teleconsultation" appointments={appointments} />}
              {activeTab === 'temoignages' && <TemoignagesTab key="temoignages" testimonials={testimonials} setTestimonials={setTestimonials} />}
              {activeTab === 'parametres' && <ParametresTab key="parametres" />}
            </AnimatePresence>
          </main>
        </div>
      </div>
    </motion.div>
  );
}

function AgendaTab({ timeSlots, setTimeSlots }: { timeSlots: TimeSlot[]; setTimeSlots: (slots: TimeSlot[]) => void }) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [adding, setAdding] = useState(false);
  const daySlots = timeSlots.filter(s => s.slot_date === selectedDate);
  const defaultTimes = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'];

  const handleAddSlot = async () => {
    setAdding(true);
    const slotsToInsert = defaultTimes.map(time => ({ slot_date: selectedDate, slot_time: time, is_available: true }));
    await supabase.from('time_slots').upsert(slotsToInsert, { onConflict: 'slot_date,slot_time' });
    const { data } = await supabase.from('time_slots').select('*').eq('slot_date', selectedDate);
    if (data) setTimeSlots([...timeSlots.filter(s => s.slot_date !== selectedDate), ...data]);
    setAdding(false);
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
      <div className="bg-[#141B3D] border border-[#0A0F2C] rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white font-medium text-lg">Gestion des créneaux</h2>
          <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} min={new Date().toISOString().split('T')[0]} className="px-4 py-2 bg-[#0A0F2C] border border-[#141B3D] rounded-lg text-white" />
        </div>
        {daySlots.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="w-12 h-12 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 mb-4">Aucun créneau configuré</p>
            <button onClick={handleAddSlot} disabled={adding} className="py-3 px-6 bg-[#3B6FE8] hover:bg-[#5A89FF] text-white rounded-lg font-medium disabled:opacity-50">{adding ? 'Ajout...' : 'Ajouter des créneaux par défaut'}</button>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {daySlots.map(slot => (
              <button key={slot.id} onClick={async () => {
                await supabase.from('time_slots').update({ is_available: !slot.is_available }).eq('id', slot.id);
                setTimeSlots(timeSlots.map(s => s.id === slot.id ? { ...s, is_available: !s.is_available } : s));
              }} className={`p-2 rounded-lg text-sm font-medium border ${slot.is_available ? 'bg-green-900/30 border-green-800/30 text-green-400' : 'bg-red-900/30 border-red-800/30 text-red-400'}`}>{slot.slot_time}</button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function ReservationsTab({ appointments, setAppointments }: { appointments: Appointment[]; setAppointments: (a: Appointment[]) => void }) {
  const [filter, setFilter] = useState('all');
  const filtered = appointments.filter(a => filter === 'all' || a.status === filter);

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
      <div className="bg-[#141B3D] border border-[#0A0F2C] rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white font-medium text-lg">Réservations</h2>
          <select value={filter} onChange={e => setFilter(e.target.value)} className="px-4 py-2 bg-[#0A0F2C] border border-[#141B3D] rounded-lg text-white">
            <option value="all">Tous</option>
            <option value="en_attente">En attente</option>
            <option value="confirme">Confirmés</option>
            <option value="annule">Annulés</option>
          </select>
        </div>
        <div className="space-y-4">
          {filtered.length === 0 ? <p className="text-gray-500 text-center py-8">Aucune réservation</p> : filtered.map(app => {
            const status = STATUS_CONFIG[app.status];
            const StatusIcon = status.icon;
            return (
              <div key={app.id} className="p-4 bg-[#0A0F2C] rounded-lg border border-[#141B3D]">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-white font-medium">{app.patient_name}</span>
                    <span className={`ml-2 px-2 py-0.5 rounded-full text-xs flex items-center gap-1 ${status.color === 'green' ? 'bg-green-900/30 text-green-400' : status.color === 'yellow' ? 'bg-yellow-900/30 text-yellow-400' : status.color === 'red' ? 'bg-red-900/30 text-red-400' : 'bg-blue-900/30 text-blue-400'}`}><StatusIcon className="w-3 h-3" />{status.label}</span>
                    <p className="text-gray-500 text-sm">{app.appointment_date} à {app.time_slot}</p>
                  </div>
                  {app.status === 'en_attente' && (
                    <div className="flex gap-2">
                      <button onClick={async () => { await supabase.from('appointments').update({ status: 'confirme' }).eq('id', app.id); setAppointments(appointments.map(a => a.id === app.id ? { ...a, status: 'confirme' } : a)); }} className="px-3 py-1 bg-green-900/30 text-green-400 rounded-lg text-sm hover:bg-green-900/50">Confirmer</button>
                      <button onClick={async () => { await supabase.from('appointments').update({ status: 'annule' }).eq('id', app.id); setAppointments(appointments.map(a => a.id === app.id ? { ...a, status: 'annule' } : a)); }} className="px-3 py-1 bg-red-900/30 text-red-400 rounded-lg text-sm hover:bg-red-900/50">Annuler</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

function MessagerieTab({ messages, setMessages, selectedConversation, setSelectedConversation }: { messages: Message[]; setMessages: (m: Message[]) => void; selectedConversation: string | null; setSelectedConversation: (id: string | null) => void }) {
  const [replyContent, setReplyContent] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conversations = Array.from(new Set(messages.map(m => m.conversation_id)));
  const convMessages = messages.filter(m => m.conversation_id === selectedConversation);

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [convMessages, scrollToBottom]);

  useEffect(() => {
    if (!selectedConversation) return;
    const channel = supabase
      .channel(`admin-messages-${selectedConversation}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${selectedConversation}` },
        (payload) => {
          setMessages(prev => {
            if (prev.some(m => m.id === payload.new.id)) return prev;
            return [...prev, payload.new as Message];
          });
        }
      )
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [selectedConversation, setMessages]);

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim() || !selectedConversation) return;

    const content = replyContent.trim();
    setReplyContent('');
    setSending(true);

    const { data, error } = await supabase.from('messages').insert({
      conversation_id: selectedConversation,
      sender_type: 'doctor',
      sender_name: 'Dr. Djalane',
      content: content
    }).select().single();

    if (data && !error) setMessages(prev => [...prev, data]);
    if (error) {
      console.error('Error:', error);
      setReplyContent(content);
    }
    setSending(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedConversation) return;
    if (file.size > 10 * 1024 * 1024) { alert('Fichier trop volumineux (max 10 Mo)'); e.target.value = ''; return; }
    if (!isAllowedFile(file)) { alert('Type de fichier non autorisé.'); e.target.value = ''; return; }

    setUploading(true);
    try {
      const result = await uploadToCloudinary(file, 'messages');
      if (result) {
        const { data, error } = await supabase.from('messages').insert({
          conversation_id: selectedConversation,
          sender_type: 'doctor',
          sender_name: 'Dr. Djalane',
          content: '[Fichier joint]',
          attachment_url: result.secure_url,
          attachment_name: file.name,
          attachment_type: getFileType(file),
        }).select().single();
        if (data && !error) setMessages(prev => [...prev, data]);
      }
    } catch (err) {
      console.error(err);
      alert('Erreur lors de l\'envoi du fichier');
    }
    setUploading(false);
    e.target.value = '';
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

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
      <div className="bg-[#141B3D] border border-[#0A0F2C] rounded-xl h-[500px] sm:h-[600px] flex flex-col sm:flex-row">
        {/* Conversations list */}
        <div className="w-full sm:w-1/3 border-b sm:border-b-0 sm:border-r border-[#0A0F2C] overflow-y-auto max-h-[200px] sm:max-h-none">
          <div className="p-3 sm:p-4 border-b border-[#0A0F2C] sticky top-0 bg-[#141B3D]">
            <h2 className="text-white font-medium text-sm sm:text-base">Conversations</h2>
          </div>
          <div className="divide-y divide-[#0A0F2C]">
            {conversations.map(convId => {
              const patientMsg = messages.find(m => m.conversation_id === convId && m.sender_type === 'patient');
              if (!patientMsg) return null;
              return (
                <button
                  key={convId}
                  onClick={() => setSelectedConversation(convId)}
                  className={`w-full p-3 sm:p-4 text-left hover:bg-[#0A0F2C] transition-colors ${selectedConversation === convId ? 'bg-[#0A0F2C]' : ''}`}
                >
                  <span className="text-white font-medium text-sm">{patientMsg.sender_name}</span>
                  <p className="text-gray-500 text-xs sm:text-sm truncate mt-0.5">{messages.find(m => m.conversation_id === convId)?.content}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col min-h-0">
          {selectedConversation ? (
            <>
              {/* Header */}
              <div className="p-3 sm:p-4 border-b border-[#0A0F2C] bg-[#0A0F2C]/50 shrink-0">
                <h3 className="text-white font-medium text-sm sm:text-base">
                  {messages.find(m => m.conversation_id === selectedConversation)?.sender_name}
                </h3>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 min-h-0">
                {convMessages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.sender_type === 'doctor' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] sm:max-w-[75%] p-3 rounded-2xl ${msg.sender_type === 'doctor' ? 'bg-[#3B6FE8] text-white rounded-br-sm' : 'bg-[#0A0F2C] text-gray-300 rounded-bl-sm'}`}>
                      {msg.content !== '[Fichier joint]' && (
                        <p className="text-sm whitespace-pre-wrap break-words overflow-wrap-anywhere">{msg.content}</p>
                      )}
                      {renderAttachment(msg)}
                      <p className={`text-[10px] sm:text-xs mt-1 sm:mt-2 ${msg.sender_type === 'doctor' ? 'text-blue-100/70' : 'text-gray-500'}`}>
                        {new Date(msg.created_at).toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} className="h-1" />
              </div>

              {/* Input */}
              <form onSubmit={handleReply} className="p-3 sm:p-4 border-t border-[#0A0F2C] flex gap-2 shrink-0">
                <label className={`p-2 sm:p-2.5 bg-[#0A0F2C] rounded-lg cursor-pointer hover:bg-[#1a2147] transition-colors shrink-0 ${uploading ? 'opacity-50 cursor-wait' : ''}`} title="Joindre un fichier">
                  <input type="file" accept="image/*,.pdf,.doc,.docx" onChange={handleFileUpload} className="hidden" disabled={sending || uploading} />
                  {uploading ? <RefreshCw className="w-5 h-5 text-gray-400 animate-spin" /> : <Paperclip className="w-5 h-5 text-gray-400" />}
                </label>
                <input
                  type="text"
                  value={replyContent}
                  onChange={e => setReplyContent(e.target.value)}
                  placeholder="Votre réponse..."
                  className="flex-1 min-w-0 px-3 sm:px-4 py-2 sm:py-2.5 bg-[#0A0F2C] border border-[#141B3D] rounded-lg text-white focus:outline-none focus:border-[#3B6FE8] transition-colors text-sm"
                  disabled={sending || uploading}
                />
                <button
                  type="submit"
                  disabled={sending || uploading || !replyContent.trim()}
                  className="p-2 sm:p-2.5 bg-[#3B6FE8] hover:bg-[#5A89FF] text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed shrink-0 transition-colors"
                >
                  {sending ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Selectionnez une conversation</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function BibliothequeTab({ documents, setDocuments }: { documents: Document[]; setDocuments: (d: Document[]) => void }) {
  const [uploading, setUploading] = useState(false);

  // Real-time subscription for documents
  useEffect(() => {
    const channel = supabase
      .channel('documents-admin')
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

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { alert('Fichier trop volumineux (max 10 Mo)'); return; }
    if (!isAllowedFile(file)) { alert('Type de fichier non autorisé. Images, PDF et Word uniquement.'); return; }

    setUploading(true);
    try {
      const result = await uploadToCloudinary(file, 'documents');
      if (result) {
        const { data: docData } = await supabase.from('documents').insert({
          title: file.name.replace(/\.[^/.]+$/, ''),
          file_url: result.secure_url,
          file_name: file.name,
          file_size: file.size,
          file_type: getFileType(file),
        }).select().single();
        if (docData) setDocuments([docData, ...documents]);
      }
    } catch (err) {
      console.error(err);
      alert('Erreur lors de l\'envoi du fichier');
    }
    setUploading(false);
    e.target.value = '';
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce document?')) return;
    await supabase.from('documents').delete().eq('id', id);
    setDocuments(documents.filter(d => d.id !== id));
  };

  const getDocIcon = (doc: Document) => {
    if (doc.file_type === 'image') return <ImageIcon className="w-6 h-6 text-green-400" />;
    if (doc.file_type === 'word') return <File className="w-6 h-6 text-blue-400" />;
    return <FileText className="w-6 h-6 text-red-400" />;
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
      <div className="bg-[#141B3D] border border-[#0A0F2C] rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white font-medium text-lg">Bibliothèque de documents</h2>
          <label className="py-3 px-6 bg-[#3B6FE8] hover:bg-[#5A89FF] text-white rounded-lg font-medium cursor-pointer">
            {uploading ? 'Upload...' : <><Upload className="w-4 h-4 mr-2 inline" />Ajouter un document</>}
            <input type="file" accept="image/*,.pdf,.doc,.docx" onChange={handleUpload} className="hidden" disabled={uploading} />
          </label>
        </div>
        <div className="space-y-3">
          {documents.length === 0 ? <p className="text-gray-500 text-center py-8">Aucun document</p> : documents.map(doc => (
            <div key={doc.id} className="p-4 bg-[#0A0F2C] rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getDocIcon(doc)}
                <div>
                  <p className="text-white font-medium">{doc.title}</p>
                  {doc.file_size && <p className="text-gray-500 text-sm">{formatSize(doc.file_size)}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-[#141B3D] rounded-lg text-gray-400"><Eye className="w-5 h-5" /></a>
                <button onClick={() => handleDelete(doc.id)} className="p-2 hover:bg-red-900/30 rounded-lg text-gray-400 hover:text-red-400"><Trash2 className="w-5 h-5" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function TeleconsultationTab({ appointments }: { appointments: Appointment[] }) {
  const [creating, setCreating] = useState<string | null>(null);
  const confirmed = appointments.filter(a => a.status === 'confirme');

  const createRoom = async (appointmentId: string) => {
    setCreating(appointmentId);
    try {
      const apiKey = import.meta.env.VITE_DAILY_API_KEY;
      if (!apiKey) { alert('Clé API Daily.co non configurée'); setCreating(null); return; }
      const res = await fetch('https://api.daily.co/v1/rooms/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ properties: { enable_chat: true } }),
      });
      const data = await res.json();
      if (data.url) {
        await supabase.from('video_rooms').insert({ room_name: data.name, room_url: data.url, appointment_id: appointmentId, status: 'active' });
        window.open(data.url, '_blank');
      }
    } catch (err) { console.error(err); alert('Erreur'); }
    setCreating(null);
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
      <div className="bg-[#141B3D] border border-[#0A0F2C] rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6"><Video className="w-6 h-6 text-[#3B6FE8]" /><h2 className="text-white font-medium text-lg">Téléconsultation</h2></div>
        <h3 className="text-gray-400 text-sm mb-4">Rendez-vous confirmés</h3>
        <div className="space-y-3">
          {confirmed.length === 0 ? <p className="text-gray-500 text-center py-8">Aucun rendez-vous confirmé</p> : confirmed.map(app => (
            <div key={app.id} className="p-4 bg-[#0A0F2C] rounded-lg flex items-center justify-between">
              <div><p className="text-white font-medium">{app.patient_name}</p><p className="text-gray-500 text-sm">{app.appointment_date} à {app.time_slot}</p></div>
              <button onClick={() => createRoom(app.id)} disabled={creating === app.id} className="py-2 px-4 bg-[#3B6FE8] hover:bg-[#5A89FF] text-white rounded-lg text-sm disabled:opacity-50">{creating === app.id ? 'Création...' : 'Créer une salle'}</button>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function TemoignagesTab({ testimonials, setTestimonials }: { testimonials: Testimonial[]; setTestimonials: (t: Testimonial[]) => void }) {
  const pending = testimonials.filter(t => !t.approved);
  const approved = testimonials.filter(t => t.approved);

  const handleApprove = async (id: string) => {
    await supabase.from('testimonials').update({ approved: true }).eq('id', id);
    setTestimonials(testimonials.map(t => t.id === id ? { ...t, approved: true } : t));
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer?')) return;
    await supabase.from('testimonials').delete().eq('id', id);
    setTestimonials(testimonials.filter(t => t.id !== id));
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
      <div className="space-y-6">
        <div className="bg-[#141B3D] border border-[#0A0F2C] rounded-xl p-6">
          <h2 className="text-white font-medium text-lg mb-6 flex items-center gap-2"><Clock className="w-5 h-5 text-yellow-400" />En attente ({pending.length})</h2>
          <div className="space-y-4">
            {pending.length === 0 ? <p className="text-gray-500 text-center py-4">Aucun témoignage en attente</p> : pending.map(t => (
              <div key={t.id} className="p-4 bg-[#0A0F2C] rounded-lg">
                <div className="flex items-center gap-1 mb-2">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`w-4 h-4 ${i < t.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`} />)}</div>
                <p className="text-gray-300 mb-2">"{t.content}"</p>
                <p className="text-gray-500 text-sm mb-4">— {t.patient_name || 'Anonyme'}</p>
                <div className="flex gap-2">
                  <button onClick={() => handleApprove(t.id)} className="py-2 px-4 bg-green-900/30 text-green-400 rounded-lg text-sm hover:bg-green-900/50"><CheckCircle className="w-4 h-4 mr-1 inline" />Approuver</button>
                  <button onClick={() => handleDelete(t.id)} className="py-2 px-4 bg-red-900/30 text-red-400 rounded-lg text-sm hover:bg-red-900/50"><Trash2 className="w-4 h-4 mr-1 inline" />Supprimer</button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-[#141B3D] border border-[#0A0F2C] rounded-xl p-6">
          <h2 className="text-white font-medium text-lg mb-6 flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-400" />Approuvés ({approved.length})</h2>
          <div className="space-y-4">
            {approved.length === 0 ? <p className="text-gray-500 text-center py-4">Aucun témoignage publié</p> : approved.map(t => (
              <div key={t.id} className="p-4 bg-[#0A0F2C] rounded-lg flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1 mb-2">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`w-4 h-4 ${i < t.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`} />)}</div>
                  <p className="text-gray-300 text-sm">"{t.content.substring(0, 100)}..."</p>
                  <p className="text-gray-500 text-sm mt-1">— {t.patient_name || 'Anonyme'}</p>
                </div>
                <button onClick={() => handleDelete(t.id)} className="p-2 hover:bg-red-900/30 rounded-lg text-gray-400 hover:text-red-400"><Trash2 className="w-5 h-5" /></button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ParametresTab() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('doctor_settings').select('*').then(({ data }) => {
      if (data) { const map: Record<string, string> = {}; data.forEach(s => map[s.setting_key] = s.setting_value); setSettings(map); }
    });
  }, []);

  const handleSave = async (key: string, value: string) => {
    setSaving(key);
    await supabase.from('doctor_settings').upsert({ setting_key: key, setting_value: value, updated_at: new Date().toISOString() }, { onConflict: 'setting_key' });
    setSettings({ ...settings, [key]: value });
    setSaving(null);
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
      <div className="bg-[#141B3D] border border-[#0A0F2C] rounded-xl p-6">
        <h2 className="text-white font-medium text-lg mb-6">Paramètres du cabinet</h2>
        <div className="space-y-6">
          {[
            { key: 'facebook_followers', label: 'Abonnés Facebook' },
            { key: 'telegram_followers', label: 'Abonnés Telegram' },
            { key: 'doctor_name', label: 'Nom du médecin' },
            { key: 'doctor_specialty', label: 'Spécialité' },
            { key: 'doctor_subtitle', label: 'Sous-titre' },
            { key: 'doctor_experience', label: 'Expérience' },
            { key: 'doctor_languages', label: 'Langues' },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center gap-4">
              <label className="text-gray-400 min-w-[150px]">{label}</label>
              <input type="text" value={settings[key] || ''} onChange={e => setSettings({ ...settings, [key]: e.target.value })} className="flex-1 px-4 py-2 bg-[#0A0F2C] border border-[#141B3D] rounded-lg text-white focus:outline-none focus:border-[#3B6FE8]" />
              <button onClick={() => handleSave(key, settings[key] || '')} disabled={saving === key} className="py-2 px-4 bg-[#3B6FE8] hover:bg-[#5A89FF] text-white rounded-lg text-sm disabled:opacity-50">{saving === key ? '...' : 'Sauver'}</button>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
