'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from '@/lib/i18n/i18n-context';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  MonitorUp,
  Maximize2,
  Minimize2,
  MessageSquare,
  FileText,
  Activity,
  Heart,
  Droplet,
  Wind,
  Scale,
  Thermometer,
  Clock,
  AlertTriangle,
  User,
  Calendar,
  Pill,
  Stethoscope,
  ClipboardList,
  Send,
  ChevronLeft,
  Settings,
  Volume2,
  VolumeX,
  Pause,
  Play,
  PictureInPicture,
  Users,
  Check,
  TrendingUp,
  TrendingDown,
  Minus,
  Timer,
  Smartphone,
  PanelRightClose,
  PanelRightOpen,
  Sparkles,
  Wifi,
  WifiOff,
  Bot,
  Zap,
} from 'lucide-react';
import { cn } from '@nirmitee/ui';

// Mock patient data
const MOCK_PATIENT = {
  id: 'pat-001',
  name: 'Robert Johnson',
  firstName: 'Robert',
  lastName: 'Johnson',
  age: 67,
  gender: 'Male',
  dob: 'Mar 15, 1957',
  mrn: 'MRN-44870',
  phone: '+1 (405) 638-3126',
  email: 'robert.johnson@email.com',
  address: '123 Oak Street, Boston, MA 02101',
  conditions: [
    { name: 'Hypertension (High Blood Pressure)', code: 'I10', severity: 'high' },
    { name: 'Type 2 Diabetes Mellitus', code: 'E11.9', severity: 'medium' },
    { name: 'Congestive Heart Failure', code: 'I50.9', severity: 'high' },
  ],
  allergies: ['Penicillin', 'Sulfa drugs', 'Aspirin'],
  medications: [
    { name: 'Metformin', dose: '500mg', frequency: 'Twice daily', purpose: 'Diabetes' },
    { name: 'Lisinopril', dose: '10mg', frequency: 'Once daily', purpose: 'Blood Pressure' },
    { name: 'Atorvastatin', dose: '20mg', frequency: 'At bedtime', purpose: 'Cholesterol' },
    { name: 'Metoprolol', dose: '25mg', frequency: 'Twice daily', purpose: 'Heart Rate' },
  ],
  devices: [
    { type: 'Blood Pressure Monitor', model: 'Omron HEM-7156', lastSync: '2 min ago', status: 'online' },
    { type: 'Weighing Scale', model: 'Withings Body+', lastSync: 'Today', status: 'online' },
    { type: 'Glucose Meter', model: 'Accu-Chek Guide', lastSync: '4 hrs ago', status: 'online' },
  ],
  careTeam: [
    { name: 'Dr. Sarah Chen', role: 'Primary Physician', type: 'MD' },
    { name: 'Alex Martin', role: 'Care Manager', type: 'CM' },
    { name: 'Josh Droxi', role: 'Care Coordinator', type: 'SCM' },
  ],
  rpmProgram: 'CCM + RPM',
  enrollmentDate: 'Nov 15, 2025',
  lastVisit: 'Jan 02, 2026',
};

// Mock vitals with sparkline data
const MOCK_VITALS = {
  bloodPressure: {
    systolic: 142,
    diastolic: 88,
    pulse: 78,
    status: 'warning',
    trend: 'up',
    time: '2 min ago',
    readings: 48,
    average: { systolic: 148, diastolic: 95 },
    sparkline: [130, 138, 145, 140, 148, 142, 146, 142],
  },
  heartRate: {
    value: 78,
    status: 'normal',
    trend: 'stable',
    time: '2 min ago',
    sparkline: [72, 75, 78, 76, 80, 77, 78, 78],
  },
  spo2: {
    value: 96,
    status: 'normal',
    trend: 'stable',
    time: '5 min ago',
    sparkline: [97, 96, 97, 96, 95, 96, 96, 96],
  },
  glucose: {
    value: 156,
    status: 'warning',
    trend: 'up',
    time: '4 hrs ago',
    fasting: false,
    sparkline: [120, 135, 142, 150, 148, 155, 152, 156],
  },
  weight: {
    value: 187.4,
    change: '+2.1',
    status: 'warning',
    trend: 'up',
    time: 'Today',
    baseline: 185.3,
    sparkline: [185, 185.5, 186, 185.8, 186.5, 187, 187.2, 187.4],
  },
};

// RPM Metrics
const MOCK_METRICS = {
  totalReadings: 48,
  readingsGoal: 16,
  totalMinutes: 14,
  minutesGoal: 20,
  lastCall: 'Dec 30, 2025',
  callStatus: 'Successful',
};

// Chat messages
const MOCK_MESSAGES = [
  { id: 1, sender: 'patient', text: 'Good morning, Doctor.', time: '10:02 AM' },
  { id: 2, sender: 'provider', text: 'Good morning, Robert. How are you feeling today?', time: '10:02 AM' },
  { id: 3, sender: 'patient', text: "I've been having some headaches in the morning.", time: '10:03 AM' },
];

// Mini Sparkline Component
function Sparkline({ data, color = '#745EE1', height = 24 }: { data: number[]; color?: string; height?: number }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 60;
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`sparkGradient-${color.replace('#', '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
      <polygon
        fill={`url(#sparkGradient-${color.replace('#', '')})`}
        points={`0,${height} ${points} ${width},${height}`}
      />
    </svg>
  );
}

// Audio Waveform Animation Component
function AudioWaveform({ isActive, color = '#745EE1' }: { isActive: boolean; color?: string }) {
  return (
    <div className="flex items-center gap-0.5 h-4">
      {[1, 2, 3, 4, 5].map((bar) => (
        <div
          key={bar}
          className={cn(
            "w-0.5 rounded-full transition-all duration-150",
            isActive ? "animate-pulse" : "h-1"
          )}
          style={{
            backgroundColor: color,
            height: isActive ? `${Math.random() * 12 + 4}px` : '4px',
            animationDelay: `${bar * 0.1}s`,
          }}
        />
      ))}
    </div>
  );
}

// Network Quality Component
function NetworkQuality({ quality = 'good' }: { quality: 'excellent' | 'good' | 'fair' | 'poor' }) {
  const bars = quality === 'excellent' ? 4 : quality === 'good' ? 3 : quality === 'fair' ? 2 : 1;
  const color = quality === 'excellent' || quality === 'good' ? '#5BCC56' : quality === 'fair' ? '#FFB800' : '#FF4351';

  return (
    <div className="flex items-end gap-0.5 h-4">
      {[1, 2, 3, 4].map((bar) => (
        <div
          key={bar}
          className={cn(
            "w-1 rounded-sm transition-all duration-300",
            bar <= bars ? 'opacity-100' : 'opacity-30'
          )}
          style={{
            height: `${bar * 4}px`,
            backgroundColor: bar <= bars ? color : '#6B7280',
          }}
        />
      ))}
    </div>
  );
}

export default function TelehealthSessionPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useTranslations('telehealth');

  // States
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCallActive, setIsCallActive] = useState(true);
  const [isCallPaused, setIsCallPaused] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [activeTab, setActiveTab] = useState<'vitals' | 'notes' | 'chat' | 'info'>('vitals');
  const [callDuration, setCallDuration] = useState(0);
  const [loggedMinutes, setLoggedMinutes] = useState(14);
  const [isAiListening, setIsAiListening] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Notes state
  const [soapNotes, setSoapNotes] = useState({
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
  });

  // Chat state
  const [messages, setMessages] = useState(MOCK_MESSAGES);
  const [newMessage, setNewMessage] = useState('');

  // Timer effect
  useEffect(() => {
    if (isCallActive && !isCallPaused) {
      timerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isCallActive, isCallPaused]);

  // Simulate speaking detection
  useEffect(() => {
    const speakInterval = setInterval(() => {
      setIsSpeaking(Math.random() > 0.5);
    }, 500);
    return () => clearInterval(speakInterval);
  }, []);

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndCall = () => {
    setIsCallActive(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    setMessages(prev => [...prev, {
      id: prev.length + 1,
      sender: 'provider',
      text: newMessage,
      time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    }]);
    setNewMessage('');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'border-danger/50 bg-danger/5';
      case 'warning': return 'border-warning/50 bg-warning/5';
      case 'normal': return 'border-success/50 bg-success/5';
      default: return 'border-border-primary bg-bg-secondary';
    }
  };

  const getStatusTextColor = (status: string) => {
    switch (status) {
      case 'critical': return 'text-danger';
      case 'warning': return 'text-warning';
      case 'normal': return 'text-success';
      default: return 'text-text-secondary';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-danger" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-success" />;
      default: return <Minus className="w-4 h-4 text-text-secondary" />;
    }
  };

  const getCptCode = () => {
    const mins = Math.floor(callDuration / 60) + loggedMinutes;
    if (mins >= 40) return { code: 'CPT 99458', color: 'text-success', achieved: true };
    if (mins >= 20) return { code: 'CPT 99457', color: 'text-success', achieved: true };
    return { code: `${20 - mins} min to 99457`, color: 'text-warning', achieved: false };
  };

  const cptInfo = getCptCode();
  const totalMinutes = loggedMinutes + Math.floor(callDuration / 60);
  const minutesProgress = Math.min((totalMinutes / MOCK_METRICS.minutesGoal) * 100, 100);

  return (
    <div className="h-screen flex flex-col bg-bg-primary dark:bg-[#0a0a12]">
      {/* Header with glassmorphism */}
      <header className="h-16 navbar-gradient border-b border-border-primary dark:border-[#1f1f2e] flex items-center justify-between px-4 shrink-0 backdrop-blur-xl">
        {/* Left: Back + Patient Info */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/telehealth')}
            className="p-2 hover:bg-bg-secondary dark:hover:bg-white/5 rounded-lg transition-all duration-200 group"
          >
            <ChevronLeft className="w-5 h-5 text-text-secondary group-hover:text-brand transition-colors" />
          </button>

          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-brand to-brand-dark flex items-center justify-center text-white font-bold text-base shadow-brand animate-pulse-purple">
            {MOCK_PATIENT.firstName[0]}{MOCK_PATIENT.lastName[0]}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-h3 font-semibold text-text-primary dark:text-white">{MOCK_PATIENT.name}</h1>
              <span className="chip-brand px-2 py-0.5 rounded text-caption font-medium">
                {MOCK_PATIENT.gender.toUpperCase()}
              </span>
              <span className="px-2 py-0.5 rounded text-caption font-medium bg-brand/10 text-brand">
                {MOCK_PATIENT.rpmProgram}
              </span>
            </div>
            <div className="flex items-center gap-3 text-small text-text-secondary">
              <span>{MOCK_PATIENT.dob} ({MOCK_PATIENT.age} yrs)</span>
              <span>•</span>
              <span>{MOCK_PATIENT.mrn}</span>
              <span>•</span>
              <span className="text-brand">{MOCK_PATIENT.phone}</span>
            </div>
          </div>
        </div>

        {/* Center: Call Status & Timer */}
        <div className="flex items-center gap-4">
          {/* Live Indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-danger/10 border border-danger/30">
            <div className="w-2 h-2 rounded-full bg-danger animate-pulse" />
            <span className="text-small font-medium text-danger">LIVE</span>
          </div>

          {/* Call Timer */}
          <div className="flex items-center gap-3 px-4 py-2 rounded-xl dark-card">
            <div className={cn(
              "w-2.5 h-2.5 rounded-full transition-colors",
              isCallActive && !isCallPaused ? "bg-success animate-pulse" : isCallPaused ? "bg-warning" : "bg-danger"
            )} />
            <div className="text-center">
              <div className="text-h2 font-mono font-bold text-text-primary dark:text-white tabular-nums">
                {formatDuration(callDuration)}
              </div>
            </div>
          </div>

          {/* Billing Status */}
          <div className="text-center px-4 py-2 rounded-xl dark-card">
            <div className={cn("text-h4 font-bold flex items-center gap-1", cptInfo.color)}>
              {cptInfo.achieved && <Check className="w-4 h-4" />}
              {cptInfo.code}
            </div>
            <div className="text-caption text-text-secondary uppercase tracking-wide">Billing</div>
          </div>

          {/* Total Time with Progress Ring */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand/10 border border-brand/30">
            <div className="relative w-10 h-10">
              <svg className="w-10 h-10 -rotate-90">
                <circle
                  cx="20"
                  cy="20"
                  r="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  className="text-brand/20"
                />
                <circle
                  cx="20"
                  cy="20"
                  r="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeDasharray={`${minutesProgress} 100`}
                  strokeLinecap="round"
                  className="text-brand transition-all duration-500"
                />
              </svg>
              <Timer className="w-4 h-4 text-brand absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <div>
              <div className="text-h4 font-bold text-brand">{totalMinutes} min</div>
              <div className="text-caption text-brand/70">This Month</div>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* AI Listening Indicator */}
          <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-300",
            isAiListening
              ? "bg-brand/10 border border-brand/30"
              : "bg-bg-secondary dark:bg-white/5"
          )}>
            <Bot className={cn("w-4 h-4 transition-colors", isAiListening ? "text-brand" : "text-text-secondary")} />
            <span className={cn("text-small font-medium", isAiListening ? "text-brand" : "text-text-secondary")}>
              AI {isAiListening ? 'Listening' : 'Paused'}
            </span>
            {isAiListening && <Sparkles className="w-3 h-3 text-brand animate-pulse" />}
          </div>

          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="p-2 hover:bg-bg-secondary dark:hover:bg-white/5 rounded-lg transition-all duration-200 group"
            title={showSidebar ? 'Hide Panel' : 'Show Panel'}
          >
            {showSidebar ? (
              <PanelRightClose className="w-5 h-5 text-text-secondary group-hover:text-brand transition-colors" />
            ) : (
              <PanelRightOpen className="w-5 h-5 text-text-secondary group-hover:text-brand transition-colors" />
            )}
          </button>
          <button className="p-2 hover:bg-bg-secondary dark:hover:bg-white/5 rounded-lg transition-all duration-200 group">
            <Settings className="w-5 h-5 text-text-secondary group-hover:text-brand transition-colors" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video Area */}
        <div className="flex-1 flex flex-col bg-gradient-to-br from-[#0a0a12] via-[#0d0d1a] to-[#12101f] relative">
          {/* Main Video Feed */}
          <div className="flex-1 relative">
            {/* Patient Video (Placeholder) */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="relative">
                  <div className={cn(
                    "w-44 h-44 rounded-full bg-gradient-to-br from-brand/30 to-brand-dark/30 flex items-center justify-center mx-auto mb-6 border-4 transition-all duration-300",
                    isSpeaking ? "border-brand shadow-[0_0_30px_rgba(116,94,225,0.5)]" : "border-brand/30"
                  )}>
                    <User className="w-20 h-20 text-brand/50" />
                  </div>
                  {/* Speaking indicator */}
                  {isSpeaking && (
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
                      <AudioWaveform isActive={isSpeaking} color="#745EE1" />
                    </div>
                  )}
                </div>
                <p className="text-white text-xl font-medium">{MOCK_PATIENT.name}</p>
                <p className="text-white/50 text-sm mt-1 flex items-center justify-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                  Video Connected
                </p>
              </div>
            </div>

            {/* Connection Quality Badge */}
            <div className="absolute top-4 left-4 flex items-center gap-3 px-4 py-2 rounded-xl bg-black/40 backdrop-blur-md border border-white/10">
              <NetworkQuality quality="good" />
              <span className="text-sm text-white/90 font-medium">HD 1080p</span>
              <div className="w-px h-4 bg-white/20" />
              <div className="flex items-center gap-1.5">
                <Wifi className="w-4 h-4 text-success" />
                <span className="text-sm text-white/70">32 ms</span>
              </div>
            </div>

            {/* Recording Badge */}
            <div className="absolute top-4 right-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-danger/20 backdrop-blur-md border border-danger/30">
              <div className="w-2.5 h-2.5 rounded-full bg-danger animate-pulse" />
              <span className="text-sm text-danger font-medium">Recording</span>
              <span className="text-sm text-white/50">{formatDuration(callDuration)}</span>
            </div>

            {/* AI Transcription Indicator */}
            {isAiListening && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-xl bg-brand/20 backdrop-blur-md border border-brand/30">
                <Bot className="w-4 h-4 text-brand" />
                <span className="text-sm text-brand font-medium">AI Transcribing...</span>
                <div className="flex gap-1">
                  {[1, 2, 3].map(dot => (
                    <div
                      key={dot}
                      className="w-1.5 h-1.5 rounded-full bg-brand animate-bounce"
                      style={{ animationDelay: `${dot * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Self View (PiP) with glow */}
            <div className={cn(
              "absolute bottom-28 right-4 w-52 h-36 rounded-2xl overflow-hidden shadow-2xl border-2 transition-all duration-300 group cursor-pointer hover:scale-105",
              isVideoOn ? "border-brand/50 shadow-[0_0_20px_rgba(116,94,225,0.3)]" : "border-white/10"
            )}>
              <div className="absolute inset-0 bg-gradient-to-br from-[#15122a] to-[#0a0a12] flex items-center justify-center">
                {isVideoOn ? (
                  <div className="text-center">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-brand to-brand-dark flex items-center justify-center mx-auto shadow-brand">
                      <span className="text-white font-bold">You</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <VideoOff className="w-8 h-8 text-white/30 mx-auto mb-1" />
                    <span className="text-xs text-white/30">Camera Off</span>
                  </div>
                )}
              </div>
              {isAudioOn && isSpeaking && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
                  <AudioWaveform isActive={true} color="#5BCC56" />
                </div>
              )}
              <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/60 text-xs text-white/80">
                You
              </div>
              {/* PiP hover overlay */}
              <div className="absolute inset-0 bg-brand/0 group-hover:bg-brand/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                <PictureInPicture className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          {/* Video Controls */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 p-2 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10">
            <button
              onClick={() => setIsAudioOn(!isAudioOn)}
              className={cn(
                "p-3 rounded-xl transition-all duration-200 group relative",
                isAudioOn
                  ? "bg-white/10 hover:bg-white/20 text-white"
                  : "bg-danger hover:bg-danger/80 text-white"
              )}
              title={isAudioOn ? 'Mute' : 'Unmute'}
            >
              {isAudioOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              {isAudioOn && isSpeaking && (
                <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-success animate-pulse" />
              )}
            </button>

            <button
              onClick={() => setIsVideoOn(!isVideoOn)}
              className={cn(
                "p-3 rounded-xl transition-all duration-200",
                isVideoOn
                  ? "bg-white/10 hover:bg-white/20 text-white"
                  : "bg-danger hover:bg-danger/80 text-white"
              )}
              title={isVideoOn ? 'Turn Off Camera' : 'Turn On Camera'}
            >
              {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </button>

            <button
              onClick={() => setIsSpeakerOn(!isSpeakerOn)}
              className={cn(
                "p-3 rounded-xl transition-all duration-200",
                isSpeakerOn
                  ? "bg-white/10 hover:bg-white/20 text-white"
                  : "bg-warning hover:bg-warning/80 text-white"
              )}
              title={isSpeakerOn ? 'Mute Speaker' : 'Unmute Speaker'}
            >
              {isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>

            <div className="w-px h-8 bg-white/20" />

            <button
              onClick={() => setIsScreenSharing(!isScreenSharing)}
              className={cn(
                "p-3 rounded-xl transition-all duration-200",
                isScreenSharing
                  ? "bg-brand hover:bg-brand-dark text-white"
                  : "bg-white/10 hover:bg-white/20 text-white"
              )}
              title={isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
            >
              <MonitorUp className="w-5 h-5" />
            </button>

            <button
              className="p-3 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all duration-200"
              title="Picture in Picture"
            >
              <PictureInPicture className="w-5 h-5" />
            </button>

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-3 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all duration-200"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>

            <div className="w-px h-8 bg-white/20" />

            <button
              onClick={() => setIsCallPaused(!isCallPaused)}
              className={cn(
                "p-3 rounded-xl transition-all duration-200",
                isCallPaused
                  ? "bg-warning hover:bg-warning/80 text-white"
                  : "bg-white/10 hover:bg-white/20 text-white"
              )}
              title={isCallPaused ? 'Resume Call' : 'Pause Call'}
            >
              {isCallPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
            </button>

            <button
              onClick={handleEndCall}
              className="p-3 px-6 rounded-xl bg-danger hover:bg-danger/80 text-white transition-all duration-200 flex items-center gap-2 hover:shadow-[0_0_20px_rgba(255,67,81,0.4)]"
              title="End Call"
            >
              <PhoneOff className="w-5 h-5" />
              <span className="font-medium">End</span>
            </button>
          </div>
        </div>

        {/* Right Sidebar with glassmorphism */}
        {showSidebar && (
          <div className="w-[400px] background-white dark:bg-[#0f0f1a]/95 backdrop-blur-xl border-l border-border-primary dark:border-[#1f1f2e] flex flex-col shrink-0">
            {/* Sidebar Tabs */}
            <div className="flex border-b border-border-primary dark:border-[#1f1f2e]">
              {[
                { id: 'vitals', label: 'Vitals', icon: Activity },
                { id: 'notes', label: 'Notes', icon: FileText },
                { id: 'chat', label: 'Chat', icon: MessageSquare },
                { id: 'info', label: 'Info', icon: User },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-3 text-small font-medium border-b-2 transition-all duration-200",
                    activeTab === tab.id
                      ? "text-brand border-brand bg-brand/5"
                      : "text-text-secondary border-transparent hover:text-text-primary hover:bg-bg-secondary dark:hover:bg-white/5"
                  )}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Sidebar Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {/* Vitals Tab */}
              {activeTab === 'vitals' && (
                <div className="p-4 space-y-4">
                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl dark-card">
                      <div className="text-caption text-text-secondary mb-1">Total Readings</div>
                      <div className="flex items-center justify-between">
                        <div className="text-h2 font-bold text-text-primary dark:text-white">{MOCK_METRICS.totalReadings}</div>
                        <div className="chip-success px-2 py-0.5 rounded text-caption">✓ {MOCK_METRICS.readingsGoal}+ goal</div>
                      </div>
                    </div>
                    <div className="p-3 rounded-xl dark-card">
                      <div className="text-caption text-text-secondary mb-1">Monthly Minutes</div>
                      <div className="flex items-center justify-between">
                        <div className="text-h2 font-bold text-text-primary dark:text-white">{totalMinutes}</div>
                        <div className={cn(
                          "px-2 py-0.5 rounded text-caption",
                          totalMinutes >= MOCK_METRICS.minutesGoal ? "chip-success" : "chip-warning"
                        )}>
                          {totalMinutes >= MOCK_METRICS.minutesGoal ? '✓ Goal met' : `${MOCK_METRICS.minutesGoal - totalMinutes} min to go`}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Blood Pressure */}
                  <div className={cn("p-4 rounded-xl border transition-all duration-200 hover:shadow-md", getStatusColor(MOCK_VITALS.bloodPressure.status))}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-danger/10">
                          <Activity className={cn("w-5 h-5", getStatusTextColor(MOCK_VITALS.bloodPressure.status))} />
                        </div>
                        <span className="font-semibold text-text-primary dark:text-white">Blood Pressure</span>
                      </div>
                      <Sparkline data={MOCK_VITALS.bloodPressure.sparkline} color={MOCK_VITALS.bloodPressure.status === 'warning' ? '#FFB800' : '#5BCC56'} />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className={cn("text-h1 font-bold", getStatusTextColor(MOCK_VITALS.bloodPressure.status))}>
                        {MOCK_VITALS.bloodPressure.systolic}/{MOCK_VITALS.bloodPressure.diastolic}
                      </span>
                      <span className="text-small text-text-secondary">mmHg</span>
                      {getTrendIcon(MOCK_VITALS.bloodPressure.trend)}
                    </div>
                    <div className="flex items-center justify-between mt-2 text-caption text-text-secondary">
                      <span>Pulse: {MOCK_VITALS.bloodPressure.pulse} bpm • {MOCK_VITALS.bloodPressure.time}</span>
                      <span>Avg: {MOCK_VITALS.bloodPressure.average.systolic}/{MOCK_VITALS.bloodPressure.average.diastolic}</span>
                    </div>
                  </div>

                  {/* Heart Rate */}
                  <div className={cn("p-4 rounded-xl border transition-all duration-200 hover:shadow-md", getStatusColor(MOCK_VITALS.heartRate.status))}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-danger/10">
                          <Heart className={cn("w-5 h-5", getStatusTextColor(MOCK_VITALS.heartRate.status))} />
                        </div>
                        <span className="font-semibold text-text-primary dark:text-white">Heart Rate</span>
                      </div>
                      <Sparkline data={MOCK_VITALS.heartRate.sparkline} color="#5BCC56" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className={cn("text-h1 font-bold", getStatusTextColor(MOCK_VITALS.heartRate.status))}>
                        {MOCK_VITALS.heartRate.value}
                      </span>
                      <span className="text-small text-text-secondary">bpm</span>
                      {getTrendIcon(MOCK_VITALS.heartRate.trend)}
                    </div>
                    <div className="text-caption text-text-secondary mt-2">{MOCK_VITALS.heartRate.time}</div>
                  </div>

                  {/* SpO2 */}
                  <div className={cn("p-4 rounded-xl border transition-all duration-200 hover:shadow-md", getStatusColor(MOCK_VITALS.spo2.status))}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-info/10">
                          <Wind className={cn("w-5 h-5", getStatusTextColor(MOCK_VITALS.spo2.status))} />
                        </div>
                        <span className="font-semibold text-text-primary dark:text-white">Oxygen Saturation</span>
                      </div>
                      <Sparkline data={MOCK_VITALS.spo2.sparkline} color="#5BCC56" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className={cn("text-h1 font-bold", getStatusTextColor(MOCK_VITALS.spo2.status))}>
                        {MOCK_VITALS.spo2.value}
                      </span>
                      <span className="text-small text-text-secondary">%</span>
                      {getTrendIcon(MOCK_VITALS.spo2.trend)}
                    </div>
                    <div className="text-caption text-text-secondary mt-2">{MOCK_VITALS.spo2.time}</div>
                  </div>

                  {/* Blood Glucose */}
                  <div className={cn("p-4 rounded-xl border transition-all duration-200 hover:shadow-md", getStatusColor(MOCK_VITALS.glucose.status))}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-warning/10">
                          <Droplet className={cn("w-5 h-5", getStatusTextColor(MOCK_VITALS.glucose.status))} />
                        </div>
                        <span className="font-semibold text-text-primary dark:text-white">Blood Glucose</span>
                      </div>
                      <Sparkline data={MOCK_VITALS.glucose.sparkline} color="#FFB800" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className={cn("text-h1 font-bold", getStatusTextColor(MOCK_VITALS.glucose.status))}>
                        {MOCK_VITALS.glucose.value}
                      </span>
                      <span className="text-small text-text-secondary">mg/dL</span>
                      {getTrendIcon(MOCK_VITALS.glucose.trend)}
                      <span className="chip-brand px-2 py-0.5 rounded text-caption ml-2">
                        {MOCK_VITALS.glucose.fasting ? 'Fasting' : 'Post-meal'}
                      </span>
                    </div>
                    <div className="text-caption text-text-secondary mt-2">{MOCK_VITALS.glucose.time}</div>
                  </div>

                  {/* Weight */}
                  <div className={cn("p-4 rounded-xl border transition-all duration-200 hover:shadow-md", getStatusColor(MOCK_VITALS.weight.status))}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-warning/10">
                          <Scale className={cn("w-5 h-5", getStatusTextColor(MOCK_VITALS.weight.status))} />
                        </div>
                        <span className="font-semibold text-text-primary dark:text-white">Weight</span>
                      </div>
                      <Sparkline data={MOCK_VITALS.weight.sparkline} color="#FFB800" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className={cn("text-h1 font-bold", getStatusTextColor(MOCK_VITALS.weight.status))}>
                        {MOCK_VITALS.weight.value}
                      </span>
                      <span className="text-small text-text-secondary">lbs</span>
                      <span className="text-small font-medium text-danger">{MOCK_VITALS.weight.change} lbs</span>
                    </div>
                    <div className="flex items-center justify-between mt-2 text-caption text-text-secondary">
                      <span>{MOCK_VITALS.weight.time}</span>
                      <span>Baseline: {MOCK_VITALS.weight.baseline} lbs</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes Tab */}
              {activeTab === 'notes' && (
                <div className="p-4 space-y-4">
                  {/* AI Suggestion Banner */}
                  <div className="p-3 rounded-xl bg-brand/10 border border-brand/30 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-brand/20">
                      <Sparkles className="w-5 h-5 text-brand" />
                    </div>
                    <div className="flex-1">
                      <div className="text-small font-medium text-brand">AI Suggestion Available</div>
                      <div className="text-caption text-brand/70">Based on conversation, auto-fill SOAP note?</div>
                    </div>
                    <button className="px-3 py-1.5 rounded-lg bg-brand text-white text-small font-medium hover:bg-brand-dark transition-colors">
                      Apply
                    </button>
                  </div>

                  {/* Quick Templates */}
                  <div>
                    <h4 className="text-caption font-medium text-text-secondary uppercase tracking-wide mb-2">Quick Templates</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {['HTN Follow-up', 'DM Review', 'CHF Check', 'Wellness'].map((template) => (
                        <button
                          key={template}
                          className="p-2.5 text-small rounded-lg dark-card hover:border-brand/50 transition-all duration-200 text-left group"
                        >
                          <span className="text-text-primary dark:text-white group-hover:text-brand transition-colors">{template}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* SOAP Notes */}
                  <div className="space-y-3">
                    <h4 className="text-caption font-medium text-text-secondary uppercase tracking-wide">SOAP Note</h4>

                    {[
                      { key: 'subjective', label: 'Subjective', placeholder: "Patient's symptoms, complaints..." },
                      { key: 'objective', label: 'Objective', placeholder: 'Vitals, exam findings...' },
                      { key: 'assessment', label: 'Assessment', placeholder: 'Diagnosis, clinical impression...' },
                      { key: 'plan', label: 'Plan', placeholder: 'Treatment plan, follow-up...' },
                    ].map((field) => (
                      <div key={field.key}>
                        <label className="text-small font-medium text-brand">{field.label}</label>
                        <textarea
                          value={soapNotes[field.key as keyof typeof soapNotes]}
                          onChange={(e) => setSoapNotes(prev => ({ ...prev, [field.key]: e.target.value }))}
                          placeholder={field.placeholder}
                          className="w-full mt-1 p-2.5 text-small rounded-lg dark-card border-border-primary dark:border-[#2a2a4a] focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand resize-none transition-all duration-200"
                          rows={2}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Quick Actions */}
                  <div>
                    <h4 className="text-caption font-medium text-text-secondary uppercase tracking-wide mb-2">Quick Actions</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <button className="flex items-center gap-2 p-2.5 text-small rounded-lg bg-info/10 text-info hover:bg-info/20 transition-all duration-200 group">
                        <ClipboardList className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        Order Labs
                      </button>
                      <button className="flex items-center gap-2 p-2.5 text-small rounded-lg bg-success/10 text-success hover:bg-success/20 transition-all duration-200 group">
                        <Pill className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        Prescribe
                      </button>
                      <button className="flex items-center gap-2 p-2.5 text-small rounded-lg bg-brand/10 text-brand hover:bg-brand/20 transition-all duration-200 group">
                        <Calendar className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        Schedule
                      </button>
                      <button className="flex items-center gap-2 p-2.5 text-small rounded-lg bg-warning/10 text-warning hover:bg-warning/20 transition-all duration-200 group">
                        <Users className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        Refer
                      </button>
                    </div>
                  </div>

                  <button className="w-full py-2.5 rounded-lg bg-brand hover:bg-brand-dark text-white font-medium transition-all duration-200 flex items-center justify-center gap-2 hover:shadow-brand">
                    <Check className="w-4 h-4" />
                    Save Notes
                  </button>
                </div>
              )}

              {/* Chat Tab */}
              {activeTab === 'chat' && (
                <div className="flex flex-col h-full">
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex flex-col max-w-[85%]",
                          msg.sender === 'provider' ? "ml-auto items-end" : "items-start"
                        )}
                      >
                        <div
                          className={cn(
                            "px-4 py-2.5 rounded-2xl text-small",
                            msg.sender === 'provider'
                              ? "bg-brand text-white rounded-br-md"
                              : "dark-card text-text-primary dark:text-white rounded-bl-md"
                          )}
                        >
                          {msg.text}
                        </div>
                        <span className="text-caption text-text-secondary mt-1">{msg.time}</span>
                      </div>
                    ))}
                  </div>
                  <div className="p-4 border-t border-border-primary dark:border-[#1f1f2e]">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Type a message..."
                        className="flex-1 px-4 py-2.5 rounded-xl dark-card border-border-primary dark:border-[#2a2a4a] text-small focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all duration-200"
                      />
                      <button
                        onClick={handleSendMessage}
                        className="p-2.5 rounded-xl bg-brand hover:bg-brand-dark text-white transition-all duration-200 hover:shadow-brand"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Info Tab */}
              {activeTab === 'info' && (
                <div className="p-4 space-y-4">
                  {/* Conditions */}
                  <div>
                    <h4 className="text-caption font-medium text-text-secondary uppercase tracking-wide mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-warning" />
                      Conditions
                    </h4>
                    <div className="space-y-2">
                      {MOCK_PATIENT.conditions.map((condition, i) => (
                        <div key={i} className="p-3 rounded-xl dark-card flex items-center justify-between group hover:border-brand/30 transition-all duration-200">
                          <span className="text-small text-text-primary dark:text-white">{condition.name}</span>
                          <span className="text-caption text-text-secondary font-mono">{condition.code}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Allergies */}
                  <div>
                    <h4 className="text-caption font-medium text-text-secondary uppercase tracking-wide mb-2">Allergies</h4>
                    <div className="flex flex-wrap gap-2">
                      {MOCK_PATIENT.allergies.map((allergy, i) => (
                        <span key={i} className="chip-danger px-3 py-1 rounded-full text-small font-medium">
                          {allergy}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Medications */}
                  <div>
                    <h4 className="text-caption font-medium text-text-secondary uppercase tracking-wide mb-2 flex items-center gap-2">
                      <Pill className="w-4 h-4 text-info" />
                      Current Medications
                    </h4>
                    <div className="space-y-2">
                      {MOCK_PATIENT.medications.map((med, i) => (
                        <div key={i} className="p-3 rounded-xl dark-card group hover:border-brand/30 transition-all duration-200">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-small text-text-primary dark:text-white">{med.name}</span>
                            <span className="text-caption text-brand font-medium">{med.dose}</span>
                          </div>
                          <div className="text-caption text-text-secondary mt-0.5">{med.frequency} • {med.purpose}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Devices */}
                  <div>
                    <h4 className="text-caption font-medium text-text-secondary uppercase tracking-wide mb-2 flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-success" />
                      Connected Devices
                    </h4>
                    <div className="space-y-2">
                      {MOCK_PATIENT.devices.map((device, i) => (
                        <div key={i} className="p-3 rounded-xl dark-card flex items-center justify-between group hover:border-brand/30 transition-all duration-200">
                          <div>
                            <div className="text-small font-medium text-text-primary dark:text-white">{device.type}</div>
                            <div className="text-caption text-text-secondary">{device.model}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                            <span className="text-caption text-success">{device.lastSync}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Care Team */}
                  <div>
                    <h4 className="text-caption font-medium text-text-secondary uppercase tracking-wide mb-2 flex items-center gap-2">
                      <Users className="w-4 h-4 text-brand" />
                      Care Team
                    </h4>
                    <div className="space-y-2">
                      {MOCK_PATIENT.careTeam.map((member, i) => (
                        <div key={i} className="p-3 rounded-xl dark-card flex items-center gap-3 group hover:border-brand/30 transition-all duration-200">
                          <div className="w-9 h-9 rounded-full bg-brand/10 flex items-center justify-center text-brand text-caption font-bold">
                            {member.type}
                          </div>
                          <div>
                            <div className="text-small font-medium text-text-primary dark:text-white">{member.name}</div>
                            <div className="text-caption text-text-secondary">{member.role}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
