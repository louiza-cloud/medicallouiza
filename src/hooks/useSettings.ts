import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Testimonial, Message, Document, DoctorSettings, SettingsMap } from '../types';

export function useSettings() {
  const [settings, setSettings] = useState<SettingsMap>({});
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('doctor_settings').select('*');
      if (error) throw error;
      const settingsMap: SettingsMap = {};
      data?.forEach((item: DoctorSettings) => {
        settingsMap[item.setting_key] = item.setting_value;
      });
      setSettings(settingsMap);
    } catch (err) {
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return { settings, loading, refetch: fetchSettings };
}

export function useTestimonials(approvedOnly = true) {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      let query = supabase.from('testimonials').select('*').order('created_at', { ascending: false });
      if (approvedOnly) query = query.eq('approved', true);
      const { data, error } = await query;
      if (!error && data) setTestimonials(data);
      setLoading(false);
    };
    fetchData();
  }, [approvedOnly]);

  return { testimonials, loading };
}

export function useMessages(conversationId?: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!conversationId) {
      setLoading(false);
      return;
    }

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      if (!error && data) setMessages(data);
      setLoading(false);
    };

    fetchMessages();
  }, [conversationId]);

  return { messages, loading };
}

export function useDocuments() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase.from('documents').select('*').order('created_at', { ascending: false });
      if (!error && data) setDocuments(data);
      setLoading(false);
    };
    fetchData();
  }, []);

  return { documents, loading };
}
