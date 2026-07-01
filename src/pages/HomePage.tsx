import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Users, Play, Star, Leaf, Pill, Flower2, Heart, Activity, Zap } from 'lucide-react';
import { useSettings, useTestimonials } from '../hooks/useSettings';

const ICONS: Record<string, typeof Leaf> = { leaf: Leaf, pill: Pill, flower: Flower2, heart: Heart, activity: Activity, zap: Zap };

const SPECIALTIES = [
  { title: 'Médecine fonctionnelle & nutrithérapie', description: 'Approche holistique traitant les causes profondes des maladies par la nutrition', icon: 'leaf' },
  { title: 'Micronutrition & médecine orthomoléculaire', description: 'Optimisation des apports en vitamines, minéraux et oligo-éléments', icon: 'pill' },
  { title: 'Phytothérapie & aromathérapie', description: 'Soins par les plantes médicinales et huiles essentielles', icon: 'flower' },
  { title: 'Médecine oxydative', description: "Traitements par l'oxygénothérapie et les dérivés oxygénés", icon: 'heart' },
  { title: 'Hormonothérapie bio-identique', description: 'Équilibrage hormonal naturel et personnalisé', icon: 'activity' },
  { title: 'Thérapies fréquentielles', description: 'Utilisation des fréquences électromagnétiques pour le soin', icon: 'zap' },
];

export function HomePage() {
  const { settings } = useSettings();
  const { testimonials } = useTestimonials(true);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Hero Section */}
      <section className="relative min-h-[85vh] flex items-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="grid lg:grid-cols-5 gap-0 rounded-2xl overflow-hidden shadow-2xl">
            <div className="lg:col-span-2 bg-[#1a47b8] p-8 lg:p-12 flex flex-col justify-center">
              <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="font-serif text-4xl lg:text-5xl text-white italic mb-3">Dr.Aziz Djalane</motion.h1>
              <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="text-blue-200 text-lg mb-1">{settings.doctor_specialty || 'Médecine générale'}</motion.p>
              <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="text-white font-semibold text-xl mb-6">{settings.doctor_subtitle || 'Médecine fonctionnelle & intégrative'}</motion.h2>
              <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="text-blue-100 italic text-base mb-8 leading-relaxed">Comprendre avant d'agir – Restaurer l'équilibre – Déprescrire dès que c'est possible</motion.p>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
                <Link to="/booking" className="inline-flex items-center gap-2 px-6 py-3 border-2 border-white text-white rounded-full font-medium hover:bg-white hover:text-[#1a47b8] transition-all duration-300 w-fit">
                  CONSULTATIONS EN LIGNE <Play className="w-4 h-4" />
                </Link>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="mt-8 flex items-center gap-4 text-blue-100 text-sm">
                <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{settings.facebook_followers || '6 700'} abonnés Facebook</span>
                <span className="flex items-center gap-1"><Users className="w-4 h-4" />{settings.telegram_followers || '700'} abonnés Telegram</span>
              </motion.div>
            </div>
            <div className="lg:col-span-3 bg-[#141B3D] relative min-h-[300px] lg:min-h-[500px]">
              <motion.div initial={{ scale: 1.1, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.8, delay: 0.3 }} className="absolute inset-0 flex items-center justify-center">
                <div className="w-48 h-48 lg:w-64 lg:h-64 rounded-full bg-gradient-to-br from-[#3B6FE8]/20 to-[#0A0F2C] border-2 border-[#3B6FE8]/30 flex items-center justify-center">
                  <div className="w-32 h-32 lg:w-48 lg:h-48 rounded-full bg-[#0A0F2C] flex items-center justify-center text-6xl lg:text-7xl font-serif italic text-[#3B6FE8]">AD</div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-20 bg-[#050810]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div initial={{ opacity: 0, x: -50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="flex justify-center">
              <div className="relative">
                <div className="w-64 h-64 lg:w-80 lg:h-80 rounded-full border-4 border-[#3B6FE8]/30 bg-[#141B3D] flex items-center justify-center text-5xl font-serif italic text-[#3B6FE8]">Dr.Aziz</div>
                <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-[#3B6FE8] rounded-full flex items-center justify-center">
                  <div className="text-center"><div className="text-white font-bold text-lg">{settings.doctor_experience?.split(' ')[0] || '35'}</div><div className="text-white/80 text-xs">ans d'exp.</div></div>
                </div>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.2 }}>
              <h2 className="font-serif text-3xl lg:text-4xl text-white italic mb-6">{settings.doctor_name || 'Dr. Aziz Djalane'}</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-3"><div className="w-2 h-2 bg-[#3B6FE8] rounded-full" /><span className="text-gray-400">{settings.doctor_specialty || 'Médecine générale'}</span></div>
                <div className="flex items-center gap-3"><div className="w-2 h-2 bg-[#3B6FE8] rounded-full" /><span className="text-white font-medium">{settings.doctor_subtitle || 'Médecine fonctionnelle & intégrative'}</span></div>
                <div className="flex items-center gap-3"><div className="w-2 h-2 bg-[#3B6FE8] rounded-full" /><span className="text-gray-400">{settings.doctor_experience || '35 ans d\'expérience'}</span></div>
                <div className="flex items-center gap-3"><div className="w-2 h-2 bg-[#3B6FE8] rounded-full" /><span className="text-gray-400">Langues: {settings.doctor_languages || 'Français, Arabe'}</span></div>
                <div className="flex items-center gap-3"><div className="w-2 h-2 bg-[#3B6FE8] rounded-full" /><span className="text-[#3B6FE8]">Consultation: En ligne uniquement</span></div>
                <div className="flex items-center gap-3"><div className="w-2 h-2 bg-[#3B6FE8] rounded-full" /><span className="text-gray-400">Tarif: Sur demande</span></div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Specialties Section */}
      <section className="py-20 bg-[#0A0F2C]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
            <h2 className="font-serif text-3xl lg:text-4xl text-white italic mb-4">Domaines d'expertise</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">Une approche personnalisée combinant les meilleures pratiques de la médecine intégrative</p>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {SPECIALTIES.map((specialty, i) => {
              const Icon = ICONS[specialty.icon];
              return (
                <motion.div key={specialty.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="bg-[#141B3D] border border-[#0A0F2C] rounded-xl p-6 hover:border-[#3B6FE8]/30 transition-all">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#3B6FE8]/10 flex items-center justify-center"><Icon className="w-6 h-6 text-[#3B6FE8]" /></div>
                    <div className="flex-1">
                      <h3 className="text-white font-medium mb-2 hover:text-[#3B6FE8] transition-colors">{specialty.title}</h3>
                      <p className="text-gray-500 text-sm">{specialty.description}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-[#050810]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
            <h2 className="font-serif text-3xl lg:text-4xl text-white italic mb-4">Témoignages patients</h2>
            <p className="text-gray-400">Ce que disent nos patients</p>
          </motion.div>
          {testimonials.length === 0 ? (
            <div className="text-center text-gray-500">Aucun témoignage pour le moment</div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {testimonials.slice(0, 6).map((testimonial) => (
                <motion.div key={testimonial.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="bg-[#141B3D] border border-[#0A0F2C] rounded-xl p-6">
                  <div className="flex items-center gap-1 mb-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`w-5 h-5 ${i < testimonial.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`} />
                    ))}
                  </div>
                  <p className="text-gray-300 mb-4 leading-relaxed">"{testimonial.content}"</p>
                  <p className="text-[#3B6FE8] text-sm font-medium">— {testimonial.patient_name || 'Anonyme'}</p>
                </motion.div>
              ))}
            </div>
          )}
          <div className="mt-12 text-center">
            <Link to="/testimonial" className="px-6 py-3 bg-[#3B6FE8] hover:bg-[#5A89FF] text-white font-medium rounded-lg transition-all inline-flex items-center gap-2">
              <Star className="w-4 h-4" /> Laisser un témoignage
            </Link>
          </div>
        </div>
      </section>
    </motion.div>
  );
}
