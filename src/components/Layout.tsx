import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Stethoscope } from 'lucide-react';
import type { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

const NAV_ITEMS = [
  { name: 'Accueil', path: '/' },
  { name: 'Rendez-vous', path: '/booking' },
  { name: 'Mon Portail', path: '/portal' },
  { name: 'Messages', path: '/messaging' },
  { name: 'Écrits', path: '/library' },
  { name: 'Contact', path: '/contact' },
];

export function Layout({ children }: LayoutProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-[#050810]">
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#050810]/95 backdrop-blur-md shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#3B6FE8] rounded-lg flex items-center justify-center">
                <Stethoscope className="w-6 h-6 text-white" />
              </div>
              <span className="font-serif text-xl text-white italic">Dr. Aziz Djalane</span>
            </Link>

            <nav className="hidden lg:flex items-center gap-8">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`relative text-sm font-medium transition-colors ${
                    location.pathname === item.path ? 'text-[#3B6FE8]' : 'text-gray-300 hover:text-white'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
              <Link
                to="/admin"
                className="px-4 py-2 bg-[#141B3D] border border-[#3B6FE8]/50 rounded-lg text-[#3B6FE8] text-sm font-medium hover:bg-[#3B6FE8] hover:text-white transition-all"
              >
                Admin
              </Link>
            </nav>

            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-2 text-gray-300 hover:text-white"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden bg-[#050810]/95 backdrop-blur-md border-t border-[#0A0F2C]"
            >
              <nav className="max-w-7xl mx-auto px-4 py-6 flex flex-col gap-4">
                {NAV_ITEMS.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`text-base font-medium ${
                      location.pathname === item.path ? 'text-[#3B6FE8]' : 'text-gray-300'
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.name}
                  </Link>
                ))}
                <Link to="/admin" className="mt-2 px-4 py-2 bg-[#3B6FE8] rounded-lg text-white text-center font-medium">
                  Admin
                </Link>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="pt-20">{children}</main>

      <footer className="bg-[#141B3D] border-t border-[#0A0F2C] mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-serif text-lg text-white italic mb-4">Dr. Aziz Djalane</h3>
              <p className="text-gray-400 text-sm">Médecine fonctionnelle & intégrative - Comprendre avant d'agir</p>
            </div>
            <div>
              <h4 className="text-white font-medium mb-4">Navigation</h4>
              <div className="flex flex-col gap-2">
                {NAV_ITEMS.map((item) => (
                  <Link key={item.path} to={item.path} className="text-gray-400 text-sm hover:text-[#3B6FE8] transition-colors">
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-white font-medium mb-4">Contact</h4>
              <div className="flex flex-col gap-2 text-sm text-gray-400">
                <a href="https://t.me/DrAzizDjalane_Teleconsult" target="_blank" rel="noopener noreferrer" className="hover:text-[#3B6FE8]">Telegram: @DrAzizDjalane_Teleconsult</a>
                <a href="https://www.facebook.com/Dr.Aziz.Djalane/" target="_blank" rel="noopener noreferrer" className="hover:text-[#3B6FE8]">Facebook: Dr.Aziz.Djalane</a>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-[#0A0F2C] text-center">
            <p className="text-gray-500 text-sm">© 2024 Dr. Aziz Djalane. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
