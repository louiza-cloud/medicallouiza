-- Create appointments table
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

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "appointments_select_all" ON appointments FOR SELECT
  TO authenticated, anon USING (true);

CREATE POLICY "appointments_insert_all" ON appointments FOR INSERT
  TO authenticated, anon WITH CHECK (true);

CREATE POLICY "appointments_update_authenticated" ON appointments FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "appointments_delete_authenticated" ON appointments FOR DELETE
  TO authenticated USING (true);

-- Create messages table
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

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages_select_all" ON messages FOR SELECT
  TO authenticated, anon USING (true);

CREATE POLICY "messages_insert_all" ON messages FOR INSERT
  TO authenticated, anon WITH CHECK (true);

CREATE POLICY "messages_update_authenticated" ON messages FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "messages_delete_authenticated" ON messages FOR DELETE
  TO authenticated USING (true);

-- Create documents table
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "documents_select_all" ON documents FOR SELECT
  TO authenticated, anon USING (true);

CREATE POLICY "documents_insert_authenticated" ON documents FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "documents_delete_authenticated" ON documents FOR DELETE
  TO authenticated USING (true);

-- Create testimonials table
CREATE TABLE testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_name TEXT,
  content TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "testimonials_select_approved" ON testimonials FOR SELECT
  TO authenticated, anon USING (approved = true OR auth.role() = 'authenticated');

CREATE POLICY "testimonials_insert_all" ON testimonials FOR INSERT
  TO authenticated, anon WITH CHECK (true);

CREATE POLICY "testimonials_update_authenticated" ON testimonials FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "testimonials_delete_authenticated" ON testimonials FOR DELETE
  TO authenticated USING (true);

-- Create time_slots table
CREATE TABLE time_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_date DATE NOT NULL,
  slot_time TEXT NOT NULL,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(slot_date, slot_time)
);

ALTER TABLE time_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "time_slots_select_all" ON time_slots FOR SELECT
  TO authenticated, anon USING (true);

CREATE POLICY "time_slots_insert_authenticated" ON time_slots FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "time_slots_update_authenticated" ON time_slots FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "time_slots_delete_authenticated" ON time_slots FOR DELETE
  TO authenticated USING (true);

-- Create doctor_settings table
CREATE TABLE doctor_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE doctor_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "doctor_settings_select_all" ON doctor_settings FOR SELECT
  TO authenticated, anon USING (true);

CREATE POLICY "doctor_settings_update_authenticated" ON doctor_settings FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "doctor_settings_insert_authenticated" ON doctor_settings FOR INSERT
  TO authenticated WITH CHECK (true);

-- Insert default settings
INSERT INTO doctor_settings (setting_key, setting_value) VALUES
  ('facebook_followers', '6700'),
  ('telegram_followers', '700'),
  ('doctor_name', 'Dr. Aziz Djalane'),
  ('doctor_specialty', 'Médecine générale'),
  ('doctor_subtitle', 'Médecine fonctionnelle & intégrative'),
  ('doctor_experience', '35 ans d''expérience'),
  ('doctor_languages', 'Français, Arabe');

-- Create video_rooms table
CREATE TABLE video_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_name TEXT NOT NULL,
  room_url TEXT NOT NULL,
  appointment_id UUID REFERENCES appointments(id),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'ended')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

ALTER TABLE video_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "video_rooms_select_all" ON video_rooms FOR SELECT
  TO authenticated, anon USING (true);

CREATE POLICY "video_rooms_insert_authenticated" ON video_rooms FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "video_rooms_update_authenticated" ON video_rooms FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_appointments_tracking_code ON appointments(tracking_code);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_time_slots_date ON time_slots(slot_date);
CREATE INDEX idx_testimonials_approved ON testimonials(approved);