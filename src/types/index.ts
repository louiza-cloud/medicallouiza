export interface Appointment {
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

export interface Message {
  id: string;
  conversation_id: string;
  sender_type: 'patient' | 'doctor';
  sender_name: string;
  sender_email?: string;
  content: string;
  attachment_url?: string;
  attachment_name?: string;
  attachment_type?: 'image' | 'pdf' | 'word' | 'other';
  created_at: string;
  read_at?: string;
  reply_to_id?: string;
  reply_to?: Message;
  is_edited?: boolean;
  edited_at?: string;
  deleted_at?: string;
  status?: 'sent' | 'delivered' | 'read';
}

export interface TypingIndicator {
  id: string;
  conversation_id: string;
  user_type: 'patient' | 'doctor';
  user_name: string;
  created_at: string;
}

export interface ConversationReadStatus {
  id: string;
  conversation_id: string;
  user_type: 'patient' | 'doctor';
  last_read_at: string;
}

export interface Document {
  id: string;
  title: string;
  file_url: string;
  file_name: string;
  file_size?: number;
  file_type?: 'pdf' | 'word' | 'image' | 'other';
  created_at: string;
}

export interface Testimonial {
  id: string;
  patient_name?: string;
  content: string;
  rating: number;
  approved: boolean;
  created_at: string;
}

export interface TimeSlot {
  id: string;
  slot_date: string;
  slot_time: string;
  is_available: boolean;
  created_at: string;
}

export interface VideoRoom {
  id: string;
  room_name: string;
  room_url: string;
  appointment_id?: string;
  status: 'active' | 'ended';
  created_at: string;
  expires_at?: string;
}

export interface DoctorSettings {
  id: string;
  setting_key: string;
  setting_value: string;
  updated_at: string;
}

export type SettingsMap = Record<string, string>;

export const SPECIALTIES = [
  { title: 'Médecine fonctionnelle & nutrithérapie', description: 'Approche holistique traitant les causes profondes des maladies par la nutrition', icon: 'leaf' },
  { title: 'Micronutrition & médecine orthomoléculaire', description: 'Optimisation des apports en vitamines, minéraux et oligo-éléments', icon: 'pill' },
  { title: 'Phytothérapie & aromathérapie', description: 'Soins par les plantes médicinales et huiles essentielles', icon: 'flower' },
  { title: 'Médecine oxydative', description: "Traitements par l'oxygénothérapie et les dérivés oxygénés", icon: 'heart' },
  { title: 'Hormonothérapie bio-identique', description: 'Équilibrage hormonal naturel et personnalisé', icon: 'activity' },
  { title: 'Thérapies fréquentielles', description: 'Utilisation des fréquences électromagnétiques pour le soin', icon: 'zap' },
] as const;
