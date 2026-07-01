import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { BookingPage } from './pages/BookingPage';
import { PatientPortalPage } from './pages/PatientPortalPage';
import { MessagingPage } from './pages/MessagingPage';
import { LibraryPage } from './pages/LibraryPage';
import { ContactPage } from './pages/ContactPage';
import { TestimonialPage } from './pages/TestimonialPage';
import { AdminDashboard } from './pages/admin/DashboardPage';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/booking" element={<BookingPage />} />
          <Route path="/portal" element={<PatientPortalPage />} />
          <Route path="/messaging" element={<MessagingPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/testimonial" element={<TestimonialPage />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
