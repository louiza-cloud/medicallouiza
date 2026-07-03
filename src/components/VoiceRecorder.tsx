import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Square, Play, Pause, X, Send, Trash2 } from 'lucide-react';

interface VoiceRecorderProps {
  onSend: (audioBlob: Blob, duration: number) => void;
  onCancel: () => void;
}

export function VoiceRecorder({ onSend, onCancel }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playbackTimerRef = useRef<NodeJS.Timeout | null>(null);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 300) { // Max 5 minutes
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Impossible d\'accéder au microphone. Veuillez vérifier les permissions.');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isRecording]);

  const playAudio = useCallback(() => {
    if (audioUrl && audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, [audioUrl]);

  const pauseAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const handleSend = useCallback(() => {
    if (audioBlob) {
      onSend(audioBlob, recordingTime);
      cleanup();
    }
  }, [audioBlob, recordingTime, onSend]);

  const handleDelete = useCallback(() => {
    cleanup();
    onCancel();
  }, [onCancel]);

  const cleanup = useCallback(() => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    setPlaybackTime(0);
    setIsPlaying(false);
  }, [audioUrl]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.ontimeupdate = () => {
        setPlaybackTime(Math.floor(audioRef.current?.currentTime || 0));
      };
      audioRef.current.onended = () => {
        setIsPlaying(false);
        setPlaybackTime(0);
      };
    }
  }, [audioUrl]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="p-4 bg-[#0A0F2C] border-t border-[#141B3D]"
    >
      {audioUrl && (
        <audio ref={audioRef} src={audioUrl} preload="metadata" />
      )}

      <div className="flex items-center gap-4">
        {isRecording ? (
          // Recording state
          <>
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
              className="w-3 h-3 bg-red-500 rounded-full"
            />
            <div className="flex-1">
              <p className="text-white text-sm font-medium">Enregistrement en cours...</p>
              <p className="text-[#3B6FE8] font-mono text-lg">{formatTime(recordingTime)}</p>
            </div>
            <button
              onClick={stopRecording}
              className="p-3 bg-red-500 hover:bg-red-600 rounded-full transition-colors"
            >
              <Square className="w-5 h-5 text-white" />
            </button>
          </>
        ) : audioBlob ? (
          // Preview state
          <>
            <div className="flex-1 flex items-center gap-3">
              <button
                onClick={isPlaying ? pauseAudio : playAudio}
                className="p-3 bg-[#3B6FE8] hover:bg-[#5A89FF] rounded-full transition-colors"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 text-white" />
                ) : (
                  <Play className="w-5 h-5 text-white" />
                )}
              </button>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-sm">Message vocal</span>
                  <span className="text-white font-mono">
                    {formatTime(isPlaying ? playbackTime : recordingTime)} / {formatTime(recordingTime)}
                  </span>
                </div>
                <div className="h-1 bg-[#141B3D] rounded-full mt-1 overflow-hidden">
                  <motion.div
                    className="h-full bg-[#3B6FE8]"
                    style={{ width: `${((isPlaying ? playbackTime : 0) / recordingTime) * 100}%` }}
                  />
                </div>
              </div>
            </div>
            <button
              onClick={handleDelete}
              className="p-3 bg-[#141B3D] hover:bg-red-500/20 rounded-full transition-colors"
              title="Supprimer"
            >
              <Trash2 className="w-5 h-5 text-red-400" />
            </button>
            <button
              onClick={handleSend}
              className="p-3 bg-[#3B6FE8] hover:bg-[#5A89FF] rounded-full transition-colors"
              title="Envoyer"
            >
              <Send className="w-5 h-5 text-white" />
            </button>
          </>
        ) : (
          // Initial state
          <>
            <div className="flex-1 text-center text-gray-400 text-sm">
              Appuyez sur le micro pour enregistrer
            </div>
            <button
              onClick={startRecording}
              className="p-3 bg-[#3B6FE8] hover:bg-[#5A89FF] rounded-full transition-colors"
            >
              <Mic className="w-5 h-5 text-white" />
            </button>
          </>
        )}

        <button
          onClick={onCancel}
          className="p-2 hover:bg-[#141B3D] rounded-full transition-colors"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      <p className="text-gray-500 text-xs mt-2 text-center">
        Durée maximale : 5 minutes
      </p>
    </motion.div>
  );
}

interface AudioPlayerProps {
  src: string;
  duration?: number;
  isOwn: boolean;
}

export function AudioPlayer({ src, duration: initialDuration, isOwn }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialDuration || 0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
        setCurrentTime(0);
      }
      setIsPlaying(!isPlaying);
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={`flex items-center gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
      <audio ref={audioRef} src={src} preload="metadata" />
      <button
        onClick={togglePlay}
        className={`p-2 rounded-full transition-colors shrink-0 ${
          isOwn ? 'bg-blue-400/20 hover:bg-blue-400/30' : 'bg-[#3B6FE8]/20 hover:bg-[#3B6FE8]/30'
        }`}
      >
        {isPlaying ? (
          <Pause className={`w-4 h-4 ${isOwn ? 'text-blue-100' : 'text-[#3B6FE8]'}`} />
        ) : (
          <Play className={`w-4 h-4 ${isOwn ? 'text-blue-100' : 'text-[#3B6FE8]'}`} />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <div className={`flex items-center gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
          <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-current"
              initial={{ width: 0 }}
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-[10px] font-mono opacity-70 shrink-0">
            {formatTime(isPlaying ? currentTime : duration)}
          </span>
        </div>
      </div>
    </div>
  );
}
