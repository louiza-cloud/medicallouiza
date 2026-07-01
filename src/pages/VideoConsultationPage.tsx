import { useState } from 'react';
import { motion } from 'framer-motion';
import { Video, AlertCircle, CheckCircle, Phone, Calendar, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PageTransition, SlideIn } from '../components/PageTransition';
import type { Appointment, VideoRoom } from '../types';

export function VideoConsultationPage() {
  const [appointmentCode, setAppointmentCode] = useState('');
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [videoRoom, setVideoRoom] = useState<VideoRoom | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [joining, setJoining] = useState(false);

  const handleCheckAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (appointmentCode.length !== 6 || !/^\d{6}$/.test(appointmentCode)) {
      setError('Le code doit contenir 6 chiffres');
      return;
    }

    setLoading(true);

    try {
      const { data, error: fetchError } = await supabase
        .from('appointments')
        .select('*')
        .eq('tracking_code', appointmentCode)
        .eq('status', 'confirme')
        .single();

      if (fetchError || !data) {
        setError('Aucun rendez-vous confirmé trouvé avec ce code');
        setLoading(false);
        return;
      }

      setAppointment(data);

      // Check for video room
      const { data: roomData } = await supabase
        .from('video_rooms')
        .select('*')
        .eq('appointment_id', data.id)
        .eq('status', 'active')
        .single();

      if (roomData) {
        setVideoRoom(roomData);
      }
    } catch (err) {
      console.error('Error checking appointment:', err);
      setError('Erreur lors de la vérification');
    }

    setLoading(false);
  };

  const handleJoinCall = () => {
    if (!videoRoom || !userName.trim()) return;
    setJoining(true);
  };

  return (
    <PageTransition>
      <div className="min-h-[80vh] bg-navy-dark py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <SlideIn direction="up">
            <div className="text-center mb-12">
              <h1 className="font-serif text-3xl lg:text-4xl text-white italic mb-4">
                Téléconsultation
              </h1>
              <p className="text-gray-400">
                Rejoignez votre consultation vidéo
              </p>
            </div>
          </SlideIn>

          {joining && videoRoom ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="card overflow-hidden"
            >
              <div className="p-6 bg-navy-light/50 border-b border-navy">
                <h2 className="text-white font-medium mb-2">Votre consultation</h2>
                <p className="text-gray-400 text-sm">
                  {userName} - {appointment?.patient_email}
                </p>
              </div>

              <div className="aspect-video bg-navy relative">
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                  <Video className="w-16 h-16 text-electric mb-4" />
                  <p className="text-white text-lg mb-2">Votre consultation vidéo est prête</p>
                  <p className="text-gray-500 mb-6">
                    Cliquez sur le bouton ci-dessous pour rejoindre (ouvre dans une nouvelle fenêtre)
                  </p>
                  <a
                    href={videoRoom.room_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary"
                  >
                    <Phone className="w-5 h-5 mr-2" />
                    Rejoindre l'appel
                  </a>
                </div>
              </div>

              <div className="p-6 bg-navy-light/30 text-center">
                <p className="text-gray-500 text-sm">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  {appointment?.appointment_date} •
                  <Clock className="w-4 h-4 inline mx-1" />
                  {appointment?.time_slot}
                </p>
              </div>
            </motion.div>
          ) : appointment ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card"
            >
              <div className="p-4 bg-green-900/20 border border-green-800/30 rounded-lg flex items-center gap-3 mb-6">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <div>
                  <p className="text-white font-medium">Rendez-vous confirmé</p>
                  <p className="text-gray-400 text-sm">
                    {new Date(appointment.appointment_date).toLocaleDateString('fr-FR')} à {appointment.time_slot}
                  </p>
                </div>
              </div>

              {videoRoom ? (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Votre nom (pour le rejoindre)
                    </label>
                    <input
                      type="text"
                      value={userName}
                      onChange={e => setUserName(e.target.value)}
                      className="input-field"
                      placeholder="Votre nom"
                    />
                  </div>

                  <div className="p-4 bg-navy rounded-lg border border-electric/30 flex items-center gap-3">
                    <Video className="w-5 h-5 text-electric" />
                    <div className="flex-1">
                      <p className="text-white">Consultation vidéo active</p>
                      <p className="text-gray-500 text-sm">Prête pour démarrer</p>
                    </div>
                  </div>

                  <button
                    onClick={handleJoinCall}
                    disabled={!userName.trim()}
                    className="btn-primary w-full"
                  >
                    <Phone className="w-5 h-5 mr-2" />
                    Démarrer la consultation
                  </button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-navy rounded-full flex items-center justify-center mx-auto mb-4">
                    <Video className="w-8 h-8 text-gray-600" />
                  </div>
                  <p className="text-gray-400 mb-2">
                    Le médecin n'a pas encore démarré la consultation
                  </p>
                  <p className="text-gray-500 text-sm">
                    Rejoignez ce lien à l'heure prévue. Vous recevrez une notification par email.
                  </p>
                </div>
              )}

              <button
                onClick={() => {
                  setAppointment(null);
                  setVideoRoom(null);
                  setAppointmentCode('');
                }}
                className="mt-6 text-gray-500 text-sm hover:text-electric transition-colors"
              >
                Rechercher un autre code
              </button>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-md mx-auto"
            >
              <div className="card">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-electric/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Video className="w-8 h-8 text-electric" />
                  </div>
                  <p className="text-gray-400 text-sm">
                    Entrez le code de suivi de votre rendez-vous confirmé
                  </p>
                </div>

                <form onSubmit={handleCheckAppointment} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Code de suivi (6 chiffres)
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={appointmentCode}
                      onChange={e => setAppointmentCode(e.target.value.replace(/\D/g, ''))}
                      className="input-field text-center text-2xl tracking-widest font-mono"
                      placeholder="000000"
                    />
                  </div>

                  {error && (
                    <div className="p-3 bg-red-900/20 border border-red-800/30 rounded-lg flex items-center gap-2 text-red-400">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span className="text-sm">{error}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary w-full"
                  >
                    {loading ? 'Vérification...' : 'Vérifier'}
                  </button>
                </form>
              </div>

              <p className="text-center text-gray-500 text-sm mt-4">
                Pas encore de rendez-vous?{' '}
                <a href="/booking" className="text-electric hover:underline">
                  Prendre rendez-vous
                </a>
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
