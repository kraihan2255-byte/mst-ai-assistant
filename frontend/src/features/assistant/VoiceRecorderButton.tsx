import { useState, useRef, useEffect } from 'react';
import { Mic, Square, X, AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useToast } from '../../components/ui/toast';

export interface VoiceRecorderButtonProps {
  onAudioRecorded: (blob: Blob, filename: string) => Promise<void>;
  disabled?: boolean;
  isProcessing?: boolean;
}

export function VoiceRecorderButton({
  onAudioRecorded,
  disabled = false,
  isProcessing = false,
}: VoiceRecorderButtonProps) {
  const toast = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const currentFormatRef = useRef<{ mimeType: string; extension: string }>({
    mimeType: 'audio/webm',
    extension: 'webm',
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTracks();
      if (timerIntervalRef.current) {
        window.clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  const stopTracks = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const getBestMimeType = (): { mimeType: string; extension: string } => {
    if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') {
      return { mimeType: 'audio/webm', extension: 'webm' };
    }

    const types = [
      { mimeType: 'audio/webm;codecs=opus', extension: 'webm' },
      { mimeType: 'audio/webm', extension: 'webm' },
      { mimeType: 'audio/mp4', extension: 'mp4' },
      { mimeType: 'audio/aac', extension: 'aac' },
      { mimeType: 'audio/ogg;codecs=opus', extension: 'ogg' },
    ];

    for (const t of types) {
      if (MediaRecorder.isTypeSupported(t.mimeType)) {
        return t;
      }
    }

    return { mimeType: '', extension: 'webm' };
  };

  const startRecording = async () => {
    if (isRecording || disabled || isProcessing) return;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast.error(
        'Voice recording is not supported in this browser. Please use Chrome or Safari.',
        'Not Supported',
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;
      const format = getBestMimeType();
      currentFormatRef.current = format;

      const options: MediaRecorderOptions = format.mimeType
        ? { mimeType: format.mimeType }
        : {};

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const mime = currentFormatRef.current.mimeType || 'audio/webm';
        const ext = currentFormatRef.current.extension || 'webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mime });
        audioChunksRef.current = [];
        stopTracks();

        if (audioBlob.size > 1000) {
          await onAudioRecorded(audioBlob, `voice-delivery.${ext}`);
        } else {
          toast.warning('Recording was too short. Please try speaking again.', 'No Audio');
        }
      };

      mediaRecorder.start(250); // Slice chunks every 250ms
      setIsRecording(true);
      setRecordingSeconds(0);

      timerIntervalRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 60) {
            // Auto stop at 60 seconds
            stopRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: unknown) {
      stopTracks();
      const errorMsg =
        err instanceof Error ? err.message : 'Microphone access denied.';
      toast.error(
        'Could not access microphone. Please grant microphone permissions in your browser or iPhone settings.',
        'Microphone Permission',
      );
    }
  };

  const stopRecording = () => {
    if (timerIntervalRef.current) {
      window.clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (mediaRecorderRef.current && isRecording) {
      setIsRecording(false);
      try {
        if (mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
      } catch {
        // ignore state error
      }
    }
  };

  const cancelRecording = () => {
    if (timerIntervalRef.current) {
      window.clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    setIsRecording(false);
    audioChunksRef.current = [];

    if (mediaRecorderRef.current) {
      try {
        if (mediaRecorderRef.current.state !== 'inactive') {
          // Replace onstop with no-op to cancel sending
          mediaRecorderRef.current.onstop = null;
          mediaRecorderRef.current.stop();
        }
      } catch {
        // ignore
      }
    }
    stopTracks();
    toast.info('Voice recording discarded.', 'Cancelled');
  };

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
  };

  if (isRecording) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 shadow-xs animate-in fade-in duration-200">
        {/* Pulsing red dot */}
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-600"></span>
        </span>

        {/* Timer */}
        <span className="font-mono text-xs font-bold text-rose-700">
          {formatTimer(recordingSeconds)}
        </span>

        {/* Live equalizing bars effect */}
        <div className="flex items-center gap-0.5 h-3 px-1">
          <span className="w-0.5 h-2.5 bg-rose-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
          <span className="w-0.5 h-3 bg-rose-600 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
          <span className="w-0.5 h-1.5 bg-rose-400 rounded-full animate-bounce"></span>
          <span className="w-0.5 h-3 bg-rose-600 rounded-full animate-bounce [animation-delay:-0.25s]"></span>
        </div>

        <span className="text-[11px] font-semibold text-rose-800 hidden sm:inline">
          Listening... (Malayalam / English)
        </span>

        {/* Cancel button */}
        <button
          type="button"
          onClick={cancelRecording}
          title="Cancel recording"
          className="p-1 rounded-lg text-rose-400 hover:text-rose-700 hover:bg-rose-100 transition-colors ml-1"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Stop & Transcribe button */}
        <button
          type="button"
          onClick={stopRecording}
          title="Send voice note"
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-colors ml-auto"
        >
          <Square className="h-3 w-3 fill-current" />
          <span>Done</span>
        </button>
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="md"
      onClick={startRecording}
      disabled={disabled || isProcessing}
      isLoading={isProcessing}
      title="Speak delivery in Malayalam or English (Voice Note)"
      className="h-11 px-3 rounded-xl border-stone-300 text-stone-700 hover:text-brand-primary hover:border-brand-primary hover:bg-brand-accent/30 transition-all shrink-0"
    >
      <Mic className="h-4.5 w-4.5 text-brand-primary" />
      <span className="hidden md:inline text-xs font-bold text-stone-700">Voice</span>
    </Button>
  );
}
