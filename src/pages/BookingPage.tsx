import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Clock, CheckCircle, AlertCircle, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { TimeSlot } from '../types';

const WEEKDAYS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const DEFAULT_TIME_SLOTS = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'];

function generateTrackingCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function BookingPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [step, setStep] = useState<'calendar' | 'form' | 'confirm'>('calendar');
  const [trackingCode, setTrackingCode] = useState('');
  const [formData, setFormData] = useState({ patient_name: '', patient_email: '', patient_phone: '', motive: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const startDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const handleDateClick = async (day: number) => {
    const clickedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (clickedDate < today) return;

    setSelectedDate(clickedDate);
    setSelectedSlot(null);
    setLoadingSlots(true);

    try {
      const dateStr = clickedDate.toISOString().split('T')[0];
      const { data } = await supabase.from('time_slots').select('*').eq('slot_date', dateStr);
      if (data && data.length > 0) {
        setTimeSlots(data);
      } else {
        const defaultSlots = DEFAULT_TIME_SLOTS.map(time => ({ id: `${dateStr}-${time}`, slot_date: dateStr, slot_time: time, is_available: true, created_at: new Date().toISOString() }));
        setTimeSlots(defaultSlots);
      }
    } catch (err) {
      console.error('Error fetching time slots:', err);
    }
    setLoadingSlots(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedSlot) return;

    setSubmitting(true);
    setError(null);
    const code = generateTrackingCode();
    const dateStr = selectedDate.toISOString().split('T')[0];

    try {
      const { error: insertError } = await supabase.from('appointments').insert({
        ...formData,
        appointment_date: dateStr,
        time_slot: selectedSlot,
        tracking_code: code,
        status: 'en_attente',
      });
      if (insertError) throw insertError;
      setTrackingCode(code);
      setStep('confirm');
    } catch (err) {
      setError('Erreur lors de la réservation. Veuillez réessayer.');
      console.error(err);
    }
    setSubmitting(false);
  };

  const renderCalendarDays = () => {
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < startDay; i++) days.push(<div key={`empty-${i}`} className="w-full" />);
    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const isPast = dateObj < today;
      const isSelected = selectedDate?.getDate() === day && selectedDate?.getMonth() === currentDate.getMonth();
      const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;

      days.push(
        <motion.button
          key={day}
          whileHover={{ scale: isPast ? 1 : 1.05 }}
          whileTap={{ scale: isPast ? 1 : 0.95 }}
          onClick={() => !isPast && handleDateClick(day)}
          disabled={isPast}
          className={`aspect-square rounded-lg flex flex-col items-center justify-center text-sm font-medium transition-all duration-200 relative ${
            isPast ? 'bg-[#141B3D] text-gray-600 cursor-not-allowed' :
            isWeekend ? 'bg-red-900/20 text-red-400 border border-red-800/30' :
            isSelected ? 'bg-[#3B6FE8] text-white shadow-lg shadow-[#3B6FE8]/30' :
            'bg-[#141B3D] text-gray-300 hover:bg-[#3B6FE8]/20 border border-[#0A0F2C] hover:border-[#3B6FE8]/30'
          }`}
        >
          <span>{day}</span>
          {!isPast && !isWeekend && <span className="text-xs text-gray-500 mt-0.5">{WEEKDAYS[dateObj.getDay()]}</span>}
        </motion.button>
      );
    }
    return days;
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-[80vh] bg-[#050810] py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="font-serif text-3xl lg:text-4xl text-white italic mb-4">Prendre rendez-vous</h1>
          <p className="text-gray-400">Sélectionnez une date et un créneau horaire</p>
        </div>

        <AnimatePresence mode="wait">
          {step === 'calendar' && (
            <motion.div key="calendar" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="grid lg:grid-cols-2 gap-8">
              <div className="bg-[#141B3D] border border-[#0A0F2C] rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="p-2 hover:bg-[#0A0F2C] rounded-lg"><ChevronLeft className="w-5 h-5 text-gray-400" /></button>
                  <h2 className="font-serif text-xl text-white">{MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}</h2>
                  <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="p-2 hover:bg-[#0A0F2C] rounded-lg"><ChevronRight className="w-5 h-5 text-gray-400" /></button>
                </div>
                <div className="grid grid-cols-7 gap-2 mb-4">
                  {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map(d => <div key={d} className="text-center text-xs font-medium text-gray-500 py-2">{d}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-2">{renderCalendarDays()}</div>
                <div className="mt-6 flex items-center gap-6 text-xs">
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-[#3B6FE8]" /><span className="text-gray-500">Disponible</span></div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-red-900/50" /><span className="text-gray-500">Week-end</span></div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-[#141B3D]" /><span className="text-gray-500">Passé</span></div>
                </div>
              </div>

              <div className="bg-[#141B3D] border border-[#0A0F2C] rounded-xl p-6">
                {selectedDate ? (
                  <>
                    <h3 className="font-medium text-white mb-4">Créneaux disponibles - {selectedDate.getDate()} {MONTHS[selectedDate.getMonth()]}</h3>
                    {loadingSlots ? (
                      <div className="text-center text-gray-500 py-8">Chargement...</div>
                    ) : (
                      <div className="grid grid-cols-3 gap-3">
                        {timeSlots.map(slot => (
                          <motion.button
                            key={slot.id}
                            whileHover={{ scale: slot.is_available ? 1.02 : 1 }}
                            whileTap={{ scale: slot.is_available ? 0.98 : 1 }}
                            onClick={() => slot.is_available && setSelectedSlot(slot.slot_time)}
                            disabled={!slot.is_available}
                            className={`py-3 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                              selectedSlot === slot.slot_time ? 'bg-[#3B6FE8] text-white shadow-lg' :
                              slot.is_available ? 'bg-[#0A0F2C] text-gray-300 hover:bg-[#141B3D] border border-[#0A0F2C] hover:border-[#3B6FE8]/30' :
                              'bg-[#141B3D] text-gray-600 cursor-not-allowed'
                            }`}
                          >
                            <Clock className="w-4 h-4" />{slot.slot_time}{!slot.is_available && <X className="w-3 h-3 ml-1" />}
                          </motion.button>
                        ))}
                      </div>
                    )}
                    {selectedSlot && (
                      <button onClick={() => setStep('form')} className="mt-6 w-full px-6 py-3 bg-[#3B6FE8] hover:bg-[#5A89FF] text-white font-medium rounded-lg transition-all">
                        Continuer
                      </button>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Clock className="w-16 h-16 text-gray-700 mb-4" />
                    <p className="text-gray-500">Sélectionnez une date pour voir les créneaux</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {step === 'form' && (
            <motion.div key="form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="max-w-xl mx-auto">
              <div className="bg-[#141B3D] border border-[#0A0F2C] rounded-xl p-6">
                <div className="mb-6 p-4 bg-[#3B6FE8]/10 border border-[#3B6FE8]/30 rounded-lg flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-[#3B6FE8]" />
                  <div>
                    <p className="text-white font-medium">{selectedDate?.getDate()} {selectedDate ? MONTHS[selectedDate.getMonth()] : ''} à {selectedSlot}</p>
                    <p className="text-gray-400 text-sm">Créneau sélectionné</p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Nom complet</label>
                    <input type="text" required value={formData.patient_name} onChange={e => setFormData(p => ({ ...p, patient_name: e.target.value }))} className="w-full px-4 py-3 bg-[#141B3D] border border-[#0A0F2C] rounded-lg text-white focus:outline-none focus:border-[#3B6FE8]" placeholder="Votre nom complet" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Email</label>
                    <input type="email" required value={formData.patient_email} onChange={e => setFormData(p => ({ ...p, patient_email: e.target.value }))} className="w-full px-4 py-3 bg-[#141B3D] border border-[#0A0F2C] rounded-lg text-white focus:outline-none focus:border-[#3B6FE8]" placeholder="votre@email.com" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Téléphone</label>
                    <input type="tel" required value={formData.patient_phone} onChange={e => setFormData(p => ({ ...p, patient_phone: e.target.value }))} className="w-full px-4 py-3 bg-[#141B3D] border border-[#0A0F2C] rounded-lg text-white focus:outline-none focus:border-[#3B6FE8]" placeholder="+213 6 XX XX XX XX" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Motif de consultation</label>
                    <textarea required rows={4} value={formData.motive} onChange={e => setFormData(p => ({ ...p, motive: e.target.value }))} className="w-full px-4 py-3 bg-[#141B3D] border border-[#0A0F2C] rounded-lg text-white focus:outline-none focus:border-[#3B6FE8] resize-none" placeholder="Décrivez brièvement le motif de votre consultation..." />
                  </div>

                  {error && (
                    <div className="p-3 bg-red-900/20 border border-red-800/30 rounded-lg flex items-center gap-2 text-red-400">
                      <AlertCircle className="w-4 h-4" /><span className="text-sm">{error}</span>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button type="button" onClick={() => setStep('calendar')} className="flex-1 py-3 bg-[#141B3D] text-white rounded-lg font-medium hover:bg-[#0A0F2C]">Retour</button>
                    <button type="submit" disabled={submitting} className="flex-1 py-3 bg-[#3B6FE8] hover:bg-[#5A89FF] text-white rounded-lg font-medium disabled:opacity-50">{submitting ? 'Réservation...' : 'Confirmer'}</button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}

          {step === 'confirm' && (
            <motion.div key="confirm" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-xl mx-auto">
              <div className="bg-[#141B3D] border border-[#0A0F2C] rounded-xl p-6 text-center">
                <div className="w-20 h-20 bg-[#3B6FE8]/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-10 h-10 text-[#3B6FE8]" />
                </div>
                <h2 className="font-serif text-2xl text-white mb-4">Rendez-vous confirmé</h2>
                <div className="p-6 bg-[#0A0F2C] rounded-xl mb-6">
                  <p className="text-gray-400 text-sm mb-2">Votre code de suivi</p>
                  <p className="text-4xl font-bold text-[#3B6FE8] font-mono tracking-wider">{trackingCode}</p>
                </div>
                <p className="text-gray-500 text-sm mb-6">Conservez ce code pour suivre votre rendez-vous dans votre portail patient.</p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <a href="/portal" className="flex-1 py-3 bg-[#3B6FE8] hover:bg-[#5A89FF] text-white rounded-lg font-medium text-center">Mon Portail Patient</a>
                  <a href="/" className="flex-1 py-3 bg-[#141B3D] text-white rounded-lg font-medium text-center hover:bg-[#0A0F2C]">Retour à l'accueil</a>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
