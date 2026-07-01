import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Calendar, Clock, Mail, MessageCircle, FileText, Video, AlertCircle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Appointment, Message, VideoRoom, Document } from '../types';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  en_attente: { label: 'En attente', color: 'yellow', icon: Clock },
  confirme: { label: 'Confirmé', color: 'green', icon: CheckCircle },
  annule: { label: 'Annulé', color: 'red', icon: XCircle },
  reporte: { label: 'Reporté', color: 'blue', icon: RefreshCw },
};

const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

export function PatientPortalPage() {
  const [email, setEmail] = useState('');
  const [trackingCode, setTrackingCode] = useState('');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [videoRoom, setVideoRoom] = useState<VideoRoom | null>(null);
  const [activeTab, setActiveTab] = useState<'appointments' | 'messages' | 'documents'>('appointments');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !trackingCode) { setError('Veuillez remplir tous les champs'); return; }
    if (trackingCode.length !== 6 || !/^\d{6}$/.test(trackingCode)) { setError('Le code doit contenir 6 chiffres'); return; }

    setSearching(true);
    try {
      const { data, error: fetchError } = await supabase.from('appointments').select('*').eq('patient_email', email).eq('tracking_code', trackingCode).order('created_at', { ascending: false });
      if (fetchError) throw fetchError;
      if (!data || data.length === 0) { setError('Aucun rendez-vous trouvé'); setSearching(false); return; }

      setAppointments(data);

      const { data: docData } = await supabase.from('documents').select('*').order('created_at', { ascending: false });
      if (docData) setDocuments(docData);

      const { data: roomData } = await supabase.from('video_rooms').select('*').eq('appointment_id', data[0].id).eq('status', 'active').single();
      if (roomData) setVideoRoom(roomData);
    } catch (err) {
      setError('Erreur lors de la recherche');
    }
    setSearching(false);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-[80vh] bg-[#050810] py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="font-serif text-3xl lg:text-4xl text-white italic mb-4">Mon Portail Patient</h1>
          <p className="text-gray-400">Accédez à vos rendez-vous, messages et documents</p>
        </div>

        {appointments.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md mx-auto">
            <div className="bg-[#141B3D] border border-[#0A0F2C] rounded-xl p-6">
              <form onSubmit={handleSearch} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2"><Mail className="w-4 h-4 inline mr-2" />Votre email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-3 bg-[#141B3D] border border-[#0A0F2C] rounded-lg text-white focus:outline-none focus:border-[#3B6FE8]" placeholder="votre@email.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Code de suivi (6 chiffres)</label>
                  <input type="text" maxLength={6} value={trackingCode} onChange={e => setTrackingCode(e.target.value.replace(/\D/g, ''))} className="w-full px-4 py-3 bg-[#141B3D] border border-[#0A0F2C] rounded-lg text-white text-center text-2xl tracking-widest font-mono focus:outline-none focus:border-[#3B6FE8]" placeholder="000000" />
                </div>
                {error && (
                  <div className="p-3 bg-red-900/20 border border-red-800/30 rounded-lg flex items-center gap-2 text-red-400">
                    <AlertCircle className="w-4 h-4 shrink-0" /><span className="text-sm">{error}</span>
                  </div>
                )}
                <button type="submit" disabled={searching} className="w-full py-3 bg-[#3B6FE8] hover:bg-[#5A89FF] text-white rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50">
                  <Search className="w-4 h-4" />{searching ? 'Recherche...' : 'Accéder à mon portail'}
                </button>
              </form>
            </div>
            <p className="text-center text-gray-500 text-sm mt-4">Pas encore de code? <a href="/booking" className="text-[#3B6FE8] hover:underline">Prendre rendez-vous</a></p>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex justify-between items-center mb-6">
              <div><h2 className="text-white font-medium">Bienvenue, {appointments[0]?.patient_name}</h2><p className="text-gray-500 text-sm">Code: {trackingCode}</p></div>
              <button onClick={() => { setAppointments([]); setMessages([]); }} className="text-[#3B6FE8] text-sm hover:underline">Déconnexion</button>
            </div>

            <div className="flex gap-2 mb-6">
              <button onClick={() => setActiveTab('appointments')} className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'appointments' ? 'bg-[#3B6FE8] text-white' : 'bg-[#141B3D] text-gray-400'}`}>
                <Calendar className="w-4 h-4 inline mr-2" />Rendez-vous ({appointments.length})
              </button>
              <button onClick={() => setActiveTab('messages')} className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'messages' ? 'bg-[#3B6FE8] text-white' : 'bg-[#141B3D] text-gray-400'}`}>
                <MessageCircle className="w-4 h-4 inline mr-2" />Messages
              </button>
              <button onClick={() => setActiveTab('documents')} className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'documents' ? 'bg-[#3B6FE8] text-white' : 'bg-[#141B3D] text-gray-400'}`}>
                <FileText className="w-4 h-4 inline mr-2" />Documents
              </button>
            </div>

            <AnimatePresence mode="wait">
              {activeTab === 'appointments' && (
                <motion.div key="appointments" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-4">
                  {appointments.map(appt => {
                    const status = STATUS_CONFIG[appt.status];
                    const StatusIcon = status.icon;
                    const dateObj = new Date(appt.appointment_date);
                    return (
                      <div key={appt.id} className="bg-[#141B3D] border border-[#0A0F2C] rounded-xl p-4">
                        <div className="flex justify-between items-center">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-[#3B6FE8]/20 rounded-lg flex flex-col items-center justify-center">
                              <span className="text-[#3B6FE8] text-lg font-bold">{dateObj.getDate()}</span>
                              <span className="text-[#3B6FE8] text-xs">{MONTHS[dateObj.getMonth()].substring(0, 3)}</span>
                            </div>
                            <div>
                              <p className="text-white font-medium">{appt.motive}</p>
                              <p className="text-gray-400 text-sm"><Clock className="w-4 h-4 inline mr-1" />{appt.time_slot}</p>
                            </div>
                          </div>
                          <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm ${
                            status.color === 'green' ? 'bg-green-900/30 text-green-400' :
                            status.color === 'yellow' ? 'bg-yellow-900/30 text-yellow-400' :
                            status.color === 'red' ? 'bg-red-900/30 text-red-400' :
                            'bg-blue-900/30 text-blue-400'
                          }`}>
                            <StatusIcon className="w-4 h-4" />{status.label}
                          </div>
                        </div>
                        {videoRoom && appt.status === 'confirme' && (
                          <div className="mt-4 p-4 bg-[#0A0F2C] rounded-lg border border-[#3B6FE8]/30 flex justify-between items-center">
                            <div><p className="text-[#3B6FE8] flex items-center gap-2"><Video className="w-4 h-4" />Consultation vidéo disponible</p><p className="text-gray-500 text-sm">Cliquez pour rejoindre</p></div>
                            <a href={videoRoom.room_url} target="_blank" rel="noopener noreferrer" className="py-2 px-4 bg-[#3B6FE8] hover:bg-[#5A89FF] text-white rounded-lg text-sm">Rejoindre</a>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </motion.div>
              )}

              {activeTab === 'messages' && (
                <motion.div key="messages" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                  {messages.length === 0 ? (
                    <div className="bg-[#141B3D] border border-[#0A0F2C] rounded-xl p-6 text-center">
                      <MessageCircle className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                      <p className="text-gray-500">Aucun message</p>
                      <a href="/messaging" className="text-[#3B6FE8] text-sm hover:underline">Envoyer un message</a>
                    </div>
                  ) : (
                    <div className="bg-[#141B3D] border border-[#0A0F2C] rounded-xl p-4 space-y-4 max-h-[500px] overflow-y-auto">
                      {messages.map(msg => (
                        <div key={msg.id} className={`flex ${msg.sender_type === 'patient' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[75%] p-4 rounded-xl ${msg.sender_type === 'patient' ? 'bg-[#3B6FE8] text-white' : 'bg-[#141B3D] text-gray-300'}`}>
                            <p className="text-sm">{msg.content}</p>
                            <p className={`text-xs mt-2 ${msg.sender_type === 'patient' ? 'text-blue-100' : 'text-gray-500'}`}>{new Date(msg.created_at).toLocaleString('fr-FR')}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'documents' && (
                <motion.div key="documents" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                  {documents.length === 0 ? (
                    <div className="bg-[#141B3D] border border-[#0A0F2C] rounded-xl p-6 text-center">
                      <FileText className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                      <p className="text-gray-500">Aucun document disponible</p>
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-2 gap-4">
                      {documents.map(doc => (
                        <a key={doc.id} href={doc.file_url} target="_blank" rel="noopener noreferrer" className="bg-[#141B3D] border border-[#0A0F2C] rounded-xl p-4 flex items-center gap-4 hover:border-[#3B6FE8]/50">
                          <div className="w-12 h-12 bg-red-900/30 rounded-lg flex items-center justify-center"><FileText className="w-6 h-6 text-red-400" /></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-medium truncate">{doc.title}</p>
                            {doc.file_size && <p className="text-gray-500 text-sm">{(doc.file_size / 1024).toFixed(1)} KB</p>}
                          </div>
                        </a>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
