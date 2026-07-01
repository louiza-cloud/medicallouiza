import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, User, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function TestimonialPage() {
  const [formData, setFormData] = useState({ patient_name: '', content: '', rating: 5 });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    if (formData.content.trim().length < 10) { setError('Le témoignage doit contenir au moins 10 caractères'); setSubmitting(false); return; }

    try {
      const { error: insertError } = await supabase.from('testimonials').insert({
        patient_name: formData.patient_name.trim() || null,
        content: formData.content.trim(),
        rating: formData.rating,
        approved: false,
      });
      if (insertError) throw insertError;
      setSuccess(true);
      setFormData({ patient_name: '', content: '', rating: 5 });
    } catch (err) {
      setError('Erreur lors de l\'envoi. Veuillez réessayer.');
    }
    setSubmitting(false);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-[80vh] bg-[#050810] py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="font-serif text-3xl lg:text-4xl text-white italic mb-4">Laisser un témoignage</h1>
          <p className="text-gray-400">Partagez votre expérience avec le Dr. Djalane</p>
        </div>

        <AnimatePresence mode="wait">
          {success ? (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#141B3D] border border-[#0A0F2C] rounded-xl p-6 text-center py-12">
              <div className="w-20 h-20 bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-400" />
              </div>
              <h2 className="text-white text-xl mb-4">Merci pour votre témoignage!</h2>
              <p className="text-gray-400 mb-6">Il sera publié après validation par le Dr. Djalane.</p>
              <button onClick={() => setSuccess(false)} className="py-3 px-6 bg-[#3B6FE8] hover:bg-[#5A89FF] text-white rounded-lg font-medium">Laisser un autre témoignage</button>
            </motion.div>
          ) : (
            <motion.div key="form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <div className="bg-[#141B3D] border border-[#0A0F2C] rounded-xl p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-3">Votre note</label>
                    <div className="flex items-center gap-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <button key={i} type="button" onClick={() => setFormData(p => ({ ...p, rating: i + 1 }))} className="p-1 transition-transform hover:scale-110">
                          <Star className={`w-8 h-8 ${i < formData.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`} />
                        </button>
                      ))}
                      <span className="ml-2 text-gray-500 text-sm">{formData.rating}/5</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2"><User className="w-4 h-4 inline mr-2" />Votre nom (optionnel)</label>
                    <input type="text" value={formData.patient_name} onChange={e => setFormData(p => ({ ...p, patient_name: e.target.value }))} className="w-full px-4 py-3 bg-[#141B3D] border border-[#0A0F2C] rounded-lg text-white focus:outline-none focus:border-[#3B6FE8]" placeholder="Laissez vide pour rester anonyme" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Votre témoignage</label>
                    <textarea rows={5} required value={formData.content} onChange={e => setFormData(p => ({ ...p, content: e.target.value }))} className="w-full px-4 py-3 bg-[#141B3D] border border-[#0A0F2C] rounded-lg text-white focus:outline-none focus:border-[#3B6FE8] resize-none" placeholder="Décrivez votre expérience..." />
                  </div>

                  {error && (
                    <div className="p-3 bg-red-900/20 border border-red-800/30 rounded-lg flex items-center gap-2 text-red-400">
                      <AlertCircle className="w-4 h-4 shrink-0" /><span className="text-sm">{error}</span>
                    </div>
                  )}

                  <button type="submit" disabled={submitting} className="w-full py-3 bg-[#3B6FE8] hover:bg-[#5A89FF] text-white rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50">
                    <Star className="w-4 h-4" />{submitting ? 'Envoi...' : 'Envoyer le témoignage'}
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
