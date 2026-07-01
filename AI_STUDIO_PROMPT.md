# Complete Medical Consultation Website - Full Reproduction Prompt

Create a production-ready medical consultation website for Dr. Aziz Djalane using React, TypeScript, Tailwind CSS, Framer Motion, and Supabase. The website is in French and features a dark navy theme with electric blue accents.

---

## DESIGN SYSTEM

### Colors (Hex Values)
- `#050810` - Navy Dark (main background)
- `#0A0F2C` - Navy Default (card backgrounds, borders)
- `#141B3D` - Navy Light (elevated surfaces)
- `#3B6FE8` - Electric Blue (primary accent, links, buttons)
- `#5A89FF` - Electric Light (hover states)
- `#2655B8` - Electric Dark
- `#1a47b8` - Medical Blue (hero section)
- White (#ffffff) - Headings, important text
- Gray-100 (#f3f4f6) - Body text
- Gray-300 (#d1d5db) - Secondary text
- Gray-400 (#9ca3af) - Labels, muted text
- Gray-500 (#6b7280) - Placeholder text
- Yellow-400 (#facc15) - Stars, warnings
- Green-400 (#4ade80) - Success, confirmed status
- Red-400 (#f87171) - Errors, cancelled status

### Fonts
- **Headings**: Playfair Display, serif, italic
- **Body**: Inter, sans-serif
- **Font sizes**: text-sm (0.875rem), text-base (1rem), text-lg (1.125rem), text-xl (1.25rem), text-2xl (1.5rem), text-3xl (1.875rem), text-4xl (2.25rem), text-5xl (3rem)

### Tailwind Custom Classes
```css
.btn-primary: px-6 py-3 bg-[#3B6FE8] hover:bg-[#5A89FF] text-white font-medium rounded-lg transition-all duration-300 transform hover:scale-105
.card: bg-[#141B3D] border border-[#0A0F2C] rounded-xl p-6 transition-all duration-300
.card:hover: border-[#3B6FE8]/30 shadow-lg shadow-[#3B6FE8]/10
.input-field: w-full px-4 py-3 bg-[#141B3D] border border-[#0A0F2C] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#3B6FE8] focus:ring-1 focus:ring-[#3B6FE8] transition-all duration-300
```

### Scrollbar Styling
```css
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: #0A0F2C; }
::-webkit-scrollbar-thumb { background: #3B6FE8; border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: #5A89FF; }
::selection { background: #3B6FE8; color: white; }
```

---

## ROUTES & NAVIGATION

### Routes
- `/` - Homepage
- `/booking` - Appointment booking calendar
- `/portal` - Patient portal (track appointments, messages, documents)
- `/messaging` - Secure messaging system
- `/library` - Document library
- `/contact` - Contact information
- `/testimonial` - Leave a testimonial
- `/admin` - Admin dashboard (Magic Link authentication required)

### Navigation Items
```typescript
const NAV_ITEMS = [
  { name: 'Accueil', path: '/' },
  { name: 'Rendez-vous', path: '/booking' },
  { name: 'Mon Portail', path: '/portal' },
  { name: 'Messages', path: '/messaging' },
  { name: 'Écrits', path: '/library' },
  { name: 'Contact', path: '/contact' },
];
// Plus Admin button styled differently
```

---

## LAYOUT COMPONENT

### Fixed Header
- Position: fixed top-0 left-0 right-0 z-50
- Background: `#050810/95` with backdrop-blur-md
- Height: h-20 (80px)
- Logo: 40x40 blue rounded square with Stethoscope icon
- Desktop nav: hidden items on mobile, visible lg:flex
- Mobile menu: hamburger icon, AnimatePresence for dropdown

### Footer
- Background: `#141B3D`, border-top: `#0A0F2C`
- Three columns: About, Navigation links, Contact
- Social links: Telegram (@DrAzizDjalane_Teleconsult), Facebook (Dr.Aziz.Djalane)
- Copyright: © 2024 Dr. Aziz Djalane

---

## PAGE 1: HOMEPAGE

### Hero Section
- Min-height: 85vh
- Grid: lg:grid-cols-5 (2:3 ratio)
- **Left panel (col-span-2)**: Medical blue `#1a47b8` background
  - Title: "Dr.Aziz Djalane" (font-serif text-4xl/5xl italic white)
  - Subtitle: "Médecine générale" (text-blue-200)
  - Tagline: "Médecine fonctionnelle & intégrative" (text-white font-semibold)
  - Quote: "Comprendre avant d'agir – Restaurer l'équilibre – Déprescrire dès que c'est possible" (italic text-blue-100)
  - CTA button: "CONSULTATIONS EN LIGNE" with Play icon, border-2 border-white, rounded-full
  - Social proof: Facebook followers (6,700) and Telegram followers (700) with icons

- **Right panel (col-span-3)**: Navy light `#141B3D`
  - Animated avatar circle: 64x64 (lg) with "AD" initials
  - Gradient border: `border-2 border-[#3B6FE8]/30`
  - Concentric circles design

### About Section
- Grid: lg:grid-cols-2, gap-12
- Left: Large circular avatar with "Dr.Aziz" text, experience badge (35 years) overlay
- Right: Bullet points with blue dots
  - Médecine générale
  - Médecine fonctionnelle & intégrative
  - 35 ans d'expérience
  - Langues: Français, Arabe
  - Consultation: En ligne uniquement
  - Tarif: Sur demande

### Specialties Section (6 cards)
- Background: `#0A0F2C`
- Grid: md:grid-cols-2 lg:grid-cols-3
- Each card: icon (12x12 bg-blue/10 rounded-xl) + title + description
- Specialties:
  1. Médecine fonctionnelle & nutrithérapie (leaf icon)
  2. Micronutrition & médecine orthomoléculaire (pill icon)
  3. Phytothérapie & aromathérapie (flower icon)
  4. Médecine oxydative (heart icon)
  5. Hormonothérapie bio-identique (activity icon)
  6. Thérapies fréquentielles (zap icon)

### Testimonials Section
- Grid: md:grid-cols-2 lg:grid-cols-3
- Each card: 5 yellow stars, quote text, patient name
- CTA: "Laisser un témoignage" button linking to /testimonial

---

## PAGE 2: BOOKING PAGE

### Calendar Section
- Title: "Prendre rendez-vous"
- Multi-step form: calendar → form → confirmation
- **Step 1 - Calendar**:
  - Grid: lg:grid-cols-2 (calendar + time slots)
  - Left: Interactive calendar with month navigation
  - Past dates: disabled, gray
  - Weekends: red background `bg-red-900/20`
  - Selected date: blue `bg-[#3B6FE8]`
  - Right: Time slots grid (3 columns)
  - Default slots: 09:00, 09:30, 10:00, 10:30, 11:00, 11:30, 14:00, 14:30, 15:00, 15:30, 16:00, 16:30, 17:00
  - Available: navy background
  - Unavailable: gray with X icon
  - Selected: blue

### Form Fields (Step 2)
- Nom complet (text, required)
- Email (email, required)
- Téléphone (tel, required, placeholder: +213 6 XX XX XX XX)
- Motif de consultation (textarea, 4 rows, required)

### Confirmation (Step 3)
- CheckCircle icon with success message
- 6-digit tracking code displayed in large font-mono
- Buttons: "Mon Portail Patient" and "Retour à l'accueil"

---

## PAGE 3: PATIENT PORTAL

### Login Form
- Email field with Mail icon
- 6-digit tracking code field (text-center, font-mono, text-2xl, tracking-widest)
- Validation: must be 6 digits
- "Accéder à mon portail" button

### Dashboard (after login)
- Welcome message with patient name
- Tab navigation: Rendez-vous, Messages, Documents
- **Appointments tab**: List of appointments with date, time, status badge
  - Status colors: yellow (en_attente), green (confirme), red (annule), blue (reporte)
  - Video consultation link if confirmed and room available
- **Messages tab**: Chat interface (empty state or message bubbles)
- **Documents tab**: Grid of downloadable PDFs

---

## PAGE 4: MESSAGING PAGE

### Start Conversation Form
- Icon: MessageCircle in blue circle
- Fields: Nom (text), Email (email), Message (textarea)
- Button: "Démarrer la conversation"

### Chat Interface
- Header: Doctor name, conversation code
- Success banner: green with CheckCircle, code displayed
- Messages area: 400px height, overflow-y-auto
- Patient messages: right-aligned, blue background
- Doctor messages: left-aligned, navy background
- Input: text field + Paperclip button + Send button
- File upload: accept image/*,.pdf,.doc,.docx, max 10MB

---

## PAGE 5: LIBRARY PAGE

- Title: "Les écrits du Dr. Djalane"
- Subtitle: "Articles, guides et documents pédagogiques"
- Grid: md:grid-cols-2 lg:grid-cols-3
- Each document card:
  - FileText icon (red, 14x14 rounded-xl)
  - Title (truncated)
  - File size in MB
  - "Voir" and "Télécharger" links
- Empty state: large FileText icon, gray text

---

## PAGE 6: CONTACT PAGE

- Grid: md:grid-cols-3 with 3 contact cards
- **Telegram card**: blue background hover, @DrAzizDjalane_Teleconsult
- **Facebook card**: blue background hover, Dr.Aziz.Djalane
- **Email card**: electric blue hover, dr.a.djalane.econsultation@gmail.com
- Warning box: yellow border, no medical advice outside consultation, CTA to /booking

---

## PAGE 7: TESTIMONIAL PAGE

- Title: "Laisser un témoignage"
- **Star rating**: 5 clickable stars (yellow filled / gray empty)
- **Name field**: optional, placeholder "Laissez vide pour rester anonyme"
- **Testimonial textarea**: 5 rows, minimum 10 characters
- **Submit**: "Envoyer le témoignage"
- **Success state**: CheckCircle, "Merci pour votre témoignage!", pending approval message

---

## PAGE 8: ADMIN DASHBOARD

### Authentication (Magic Link)
- Centered login card
- Mail icon in blue circle
- Email input field
- "Recevoir le lien de connexion" button
- After send: CheckCircle, check email message
- Admin email: **louizadjalane20@gmail.com** (only authorized email)
- Unauthorized attempts: "Accès non autorisé"
- emailRedirectTo: `window.location.origin + '/admin'`

### Dashboard Layout
- Header with logout button
- Sidebar: sticky, 240px, 7 tabs
- Main content area with AnimatePresence

### Tab 1: Agenda
- Date picker for selecting day
- Time slots grid (6 columns)
- Each slot: clickable to toggle availability
- Green = available, Red = unavailable
- "Ajouter des créneaux par défaut" button

### Tab 2: Réservations
- Filter dropdown: Tous, En attente, Confirmés, Annulés
- Each reservation card:
  - Patient name
  - Status badge with icon
  - Date and time
  - Actions: Confirmer (green), Annuler (red)

### Tab 3: Messagerie
- Split view: conversations list (1/3) + chat (2/3)
- Unread badge count on sidebar
- Chat interface same as patient messaging
- Reply input at bottom

### Tab 4: Bibliothèque
- Upload button: blue, "Ajouter un PDF"
- Document list with:
  - FileText icon (red)
  - Title, file size
  - Eye icon (view), Trash icon (delete)
- File upload to Cloudinary

### Tab 5: Téléconsultation
- List of confirmed appointments
- Each: patient name, date/time, "Créer une salle" button
- Creates Daily.co room, opens in new tab

### Tab 6: Témoignages
- Two sections: En attente, Approuvés
- Pending: star rating, quote, name, Approve/Delete buttons
- Approved: same format, delete only

### Tab 7: Paramètres
- 7 settings fields:
  1. Abonnés Facebook
  2. Abonnés Telegram
  3. Nom du médecin
  4. Spécialité
  5. Sous-titre
  6. Expérience
  7. Langues
- Each: label, input, "Sauver" button

---

## SUPABASE CONFIGURATION

### Tables Required
```sql
-- appointments
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_name TEXT NOT NULL,
  patient_email TEXT NOT NULL,
  patient_phone TEXT NOT NULL,
  motive TEXT NOT NULL,
  appointment_date DATE NOT NULL,
  time_slot TEXT NOT NULL,
  tracking_code TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'en_attente' CHECK (status IN ('en_attente', 'confirme', 'annule', 'reporte')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

-- messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id TEXT NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('patient', 'doctor')),
  sender_name TEXT NOT NULL,
  sender_email TEXT,
  content TEXT NOT NULL,
  attachment_url TEXT,
  attachment_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

-- documents
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- testimonials
CREATE TABLE testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_name TEXT,
  content TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- time_slots
CREATE TABLE time_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_date DATE NOT NULL,
  slot_time TEXT NOT NULL,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(slot_date, slot_time)
);

-- doctor_settings
CREATE TABLE doctor_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- video_rooms
CREATE TABLE video_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_name TEXT NOT NULL,
  room_url TEXT NOT NULL,
  appointment_id UUID REFERENCES appointments(id),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'ended')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);
```

### RLS Policies
- All tables: Enable RLS
- appointments: SELECT/INSERT public, UPDATE/DELETE authenticated
- messages: SELECT/INSERT public, UPDATE/DELETE authenticated
- documents: SELECT public, INSERT/DELETE authenticated
- testimonials: SELECT approved=true OR authenticated, INSERT public
- time_slots: SELECT public, INSERT/UPDATE/DELETE authenticated
- doctor_settings: SELECT public, INSERT/UPDATE authenticated
- video_rooms: SELECT public, INSERT/UPDATE authenticated

### Environment Variables
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_DAILY_API_KEY=your-daily-api-key (for video consultations)
```

### Supabase Client Configuration
```typescript
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
});
```

---

## CLOUDINARY CONFIGURATION

### Upload Presets
- Preset name: `cabinet_djalane`
- Folder structure: `/documents/`, `/messages/`
- Cloud name: `djalane-louiza`
- Auto-upload endpoint: `https://api.cloudinary.com/v1_1/djalane-louiza/auto/upload`

---

## ANIMATIONS

### Framer Motion Variants
- **Page transitions**: opacity 0→1, y 20→0 (0.6s ease-out)
- **Card hovers**: y -5px, border color change
- **Button hovers**: scale 1.02 (whileHover), 0.98 (whileTap)
- **Menu dropdown**: height 0→auto, opacity 0→1
- **Tab content**: x 20→0 (in), x -20 (out)
- **Success states**: scale 0.9→1, opacity 0→1

---

## TYPESCRIPT INTERFACES

```typescript
interface Appointment {
  id: string;
  patient_name: string;
  patient_email: string;
  patient_phone: string;
  motive: string;
  appointment_date: string;
  time_slot: string;
  tracking_code: string;
  status: 'en_attente' | 'confirme' | 'annule' | 'reporte';
  created_at: string;
  notes?: string;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_type: 'patient' | 'doctor';
  sender_name: string;
  sender_email?: string;
  content: string;
  attachment_url?: string;
  attachment_name?: string;
  created_at: string;
  read_at?: string;
}

interface Document {
  id: string;
  title: string;
  file_url: string;
  file_name: string;
  file_size?: number;
  created_at: string;
}

interface Testimonial {
  id: string;
  patient_name?: string;
  content: string;
  rating: number;
  approved: boolean;
  created_at: string;
}

interface TimeSlot {
  id: string;
  slot_date: string;
  slot_time: string;
  is_available: boolean;
  created_at: string;
}

interface VideoRoom {
  id: string;
  room_name: string;
  room_url: string;
  appointment_id?: string;
  status: 'active' | 'ended';
  created_at: string;
  expires_at?: string;
}
```

---

## REQUIREMENTS

1. Use React 18 with TypeScript
2. Use React Router v7 for routing
3. Use Tailwind CSS with custom theme
4. Use Framer Motion for animations
5. Use Lucide React for icons
6. Use Supabase for backend (auth, database, RLS)
7. Use Cloudinary for file uploads
8. Use Daily.co API for video consultations
9. Implement Magic Link authentication
10. All text in French
11. Mobile-responsive design
12. Dark theme only (no light mode toggle)
13. Generate 6-digit tracking codes for appointments
14. Real-time message updates in admin dashboard
15. File upload progress indicators
16. Form validation with error messages
17. Loading spinners (border-2 border-blue border-t-navy)
18. Confirmation dialogs for destructive actions

---

## KEY FEATURES

1. **Appointment System**: Calendar picker, time slots, form, tracking code generation
2. **Patient Portal**: Email + code login, view appointments, documents, messages
3. **Secure Messaging**: Create conversation, send messages, attach files
4. **Document Library**: Upload PDFs, view/download documents
5. **Testimonials**: Star rating, submit for admin approval
6. **Admin Dashboard**: Magic link auth, manage all data, video room creation
7. **Video Consultation**: Daily.co integration for confirmed appointments

Build this complete website with all features functional, connected to Supabase, with beautiful dark navy theme and smooth animations.
