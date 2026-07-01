import { motion } from 'framer-motion';
import { Send, BookOpen, Mail, AlertCircle, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export function ContactPage() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-[80vh] bg-[#050810] py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="font-serif text-3xl lg:text-4xl text-white italic mb-4">Contact</h1>
          <p className="text-gray-400">Plusieurs façons de communiquer avec le cabinet</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <motion.a href="https://t.me/DrAzizDjalane_Teleconsult" target="_blank" rel="noopener noreferrer" whileHover={{ y: -5 }} className="bg-[#141B3D] border border-[#0A0F2C] rounded-xl p-8 block hover:border-blue-500/50 text-center">
            <div className="w-16 h-16 bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Send className="w-8 h-8 text-blue-400" />
            </div>
            <h3 className="text-white font-medium text-lg mb-2">Telegram</h3>
            <p className="text-gray-400 text-sm mb-4">@DrAzizDjalane_Teleconsult</p>
            <span className="text-blue-400 text-sm font-medium">Ouvrir Telegram →</span>
          </motion.a>

          <motion.a href="https://www.facebook.com/Dr.Aziz.Djalane/" target="_blank" rel="noopener noreferrer" whileHover={{ y: -5 }} className="bg-[#141B3D] border border-[#0A0F2C] rounded-xl p-8 block hover:border-blue-500/50 text-center">
            <div className="w-16 h-16 bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8 text-blue-400" />
            </div>
            <h3 className="text-white font-medium text-lg mb-2">Facebook</h3>
            <p className="text-gray-400 text-sm mb-4">Dr.Aziz.Djalane</p>
            <span className="text-blue-400 text-sm font-medium">Voir la page →</span>
          </motion.a>

          <motion.a href="mailto:dr.a.djalane.econsultation@gmail.com" whileHover={{ y: -5 }} className="bg-[#141B3D] border border-[#0A0F2C] rounded-xl p-8 block hover:border-[#3B6FE8]/50 text-center">
            <div className="w-16 h-16 bg-[#3B6FE8]/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-[#3B6FE8]" />
            </div>
            <h3 className="text-white font-medium text-lg mb-2">Email</h3>
            <p className="text-gray-400 text-sm mb-4">dr.a.djalane.econsultation@gmail.com</p>
            <span className="text-[#3B6FE8] text-sm font-medium">Envoyer un email →</span>
          </motion.a>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto">
          <div className="bg-[#141B3D] border border-yellow-800/30 rounded-xl p-6 text-center bg-yellow-900/10">
            <AlertCircle className="w-8 h-8 text-yellow-400 mx-auto mb-3" />
            <h3 className="text-white font-medium mb-2">Important</h3>
            <p className="text-gray-400 text-sm">Aucun conseil médical ne sera donné en-dehors d'une consultation formelle. Pour toute question de santé, veuillez prendre rendez-vous.</p>
            <Link to="/booking" className="mt-4 py-3 px-6 bg-[#3B6FE8] hover:bg-[#5A89FF] text-white rounded-lg font-medium inline-flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />Prendre rendez-vous
            </Link>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
