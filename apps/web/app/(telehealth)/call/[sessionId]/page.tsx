'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from '@/lib/i18n/i18n-context';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
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
  AlertTriangle,
  User,
  Calendar,
  Pill,
  ClipboardList,
  Send,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
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
  Bot,
  Battery,
  BatteryLow,
  BatteryMedium,
  BatteryFull,
  Signal,
  Target,
  AlertCircle,
  Bell,
  Clock,
  FileCheck,
  History,
  Phone,
  ShieldAlert,
  Gauge,
  CheckCircle2,
  Circle,
  ListChecks,
  X,
} from 'lucide-react';
import { cn } from '@nirmitee/ui';

// ============ MOCK DATA ============

// Patient Data with RPM-specific fields
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
  riskScore: 78, // 0-100, higher = more risk
  riskLevel: 'high', // low, medium, high, critical
  compliance: 85, // Reading compliance percentage
  conditions: [
    { name: 'Hypertension (High Blood Pressure)', code: 'I10', severity: 'high' },
    { name: 'Type 2 Diabetes Mellitus', code: 'E11.9', severity: 'medium' },
    { name: 'Congestive Heart Failure', code: 'I50.9', severity: 'high' },
  ],
  allergies: ['Penicillin', 'Sulfa drugs', 'Aspirin'],
  medications: [
    { name: 'Metformin', dose: '500mg', frequency: 'Twice daily', purpose: 'Diabetes', adherence: 92 },
    { name: 'Lisinopril', dose: '10mg', frequency: 'Once daily', purpose: 'Blood Pressure', adherence: 88 },
    { name: 'Atorvastatin', dose: '20mg', frequency: 'At bedtime', purpose: 'Cholesterol', adherence: 95 },
    { name: 'Metoprolol', dose: '25mg', frequency: 'Twice daily', purpose: 'Heart Rate', adherence: 85 },
  ],
  devices: [
    { type: 'Blood Pressure Monitor', model: 'Omron HEM-7156', lastSync: '2 min ago', status: 'online', battery: 78, signal: 'excellent' },
    { type: 'Weighing Scale', model: 'Withings Body+', lastSync: 'Today', status: 'online', battery: 92, signal: 'good' },
    { type: 'Glucose Meter', model: 'Accu-Chek Guide', lastSync: '4 hrs ago', status: 'online', battery: 45, signal: 'good' },
    { type: 'Pulse Oximeter', model: 'Masimo MightySat', lastSync: '1 hr ago', status: 'online', battery: 65, signal: 'excellent' },
  ],
  careTeam: [
    { name: 'Dr. Sarah Chen', role: 'Primary Physician', type: 'MD', phone: '+1 (405) 555-0101' },
    { name: 'Alex Martin', role: 'Care Manager', type: 'CM', phone: '+1 (405) 555-0102' },
    { name: 'Josh Droxi', role: 'Care Coordinator', type: 'SCM', phone: '+1 (405) 555-0103' },
  ],
  emergencyContacts: [
    { name: 'Mary Johnson', relation: 'Spouse', phone: '+1 (405) 638-3127' },
    { name: 'James Johnson', relation: 'Son', phone: '+1 (405) 555-9876' },
  ],
  rpmProgram: 'CCM + RPM',
  enrollmentDate: 'Nov 15, 2025',
  lastVisit: 'Jan 02, 2026',
};

// Active Alerts
const MOCK_ALERTS = [
  { id: 1, type: 'critical', vital: 'Blood Pressure', message: 'BP 180/110 exceeded critical threshold (>180/120)', time: 'Yesterday 8:42 PM', acknowledged: false },
  { id: 2, type: 'warning', vital: 'Weight', message: 'Weight gain +2.1 lbs in 48 hours (CHF risk)', time: 'Today 7:15 AM', acknowledged: false },
  { id: 3, type: 'warning', vital: 'Glucose', message: 'Post-meal glucose 186 mg/dL above target', time: 'Yesterday 1:30 PM', acknowledged: true },
];

// Vitals with thresholds
const MOCK_VITALS = {
  bloodPressure: {
    systolic: 142, diastolic: 88, pulse: 78,
    status: 'warning', trend: 'up', time: '2 min ago',
    threshold: { systolic: { min: 90, max: 140 }, diastolic: { min: 60, max: 90 } },
    readings: 48, average: { systolic: 148, diastolic: 95 },
    sparkline: [130, 138, 145, 140, 148, 142, 146, 142],
  },
  heartRate: {
    value: 78, status: 'normal', trend: 'stable', time: '2 min ago',
    threshold: { min: 60, max: 100 },
    sparkline: [72, 75, 78, 76, 80, 77, 78, 78],
  },
  spo2: {
    value: 96, status: 'normal', trend: 'stable', time: '5 min ago',
    threshold: { min: 92, max: 100 },
    sparkline: [97, 96, 97, 96, 95, 96, 96, 96],
  },
  glucose: {
    value: 156, status: 'warning', trend: 'up', time: '4 hrs ago', fasting: false,
    threshold: { fasting: { min: 70, max: 130 }, postMeal: { min: 70, max: 180 } },
    sparkline: [120, 135, 142, 150, 148, 155, 152, 156],
  },
  weight: {
    value: 187.4, change: '+2.1', status: 'warning', trend: 'up', time: 'Today',
    baseline: 185.3, dryWeight: 183.0,
    sparkline: [185, 185.5, 186, 185.8, 186.5, 187, 187.2, 187.4],
  },
};

// RPM Metrics
const MOCK_METRICS = {
  totalReadings: 48,
  readingsGoal: 16,
  readingDays: 28,
  totalMinutes: 14,
  minutesGoal: 20,
  lastCall: 'Dec 30, 2025',
  callStatus: 'Successful',
};

// Previous Encounter
const MOCK_PREVIOUS_ENCOUNTER = {
  date: 'Dec 30, 2025',
  duration: '18 min',
  provider: 'Dr. Sarah Chen',
  summary: 'Reviewed BP trends, adjusted Lisinopril dosage from 5mg to 10mg. Patient reported occasional dizziness. Recommended increasing water intake and monitoring symptoms.',
  cptCode: '99457',
  followUp: 'Weekly BP monitoring, call in 1 week',
};

// Patient Goals (Care Plan)
const MOCK_GOALS = [
  { id: 1, goal: 'Maintain BP below 140/90', progress: 65, status: 'in_progress', dueDate: 'Jan 31, 2026' },
  { id: 2, goal: 'Reduce weight by 5 lbs', progress: 20, status: 'in_progress', dueDate: 'Feb 28, 2026' },
  { id: 3, goal: 'Fasting glucose below 130 mg/dL', progress: 45, status: 'in_progress', dueDate: 'Jan 15, 2026' },
  { id: 4, goal: 'Take readings daily', progress: 85, status: 'on_track', dueDate: 'Ongoing' },
];

// Protocol Checklist
const MOCK_PROTOCOL = [
  { id: 1, item: 'Verify patient identity', completed: true },
  { id: 2, item: 'Review active alerts', completed: false },
  { id: 3, item: 'Check medication adherence', completed: false },
  { id: 4, item: 'Review vital trends', completed: false },
  { id: 5, item: 'Assess symptoms & concerns', completed: false },
  { id: 6, item: 'Update care plan if needed', completed: false },
  { id: 7, item: 'Schedule follow-up', completed: false },
  { id: 8, item: 'Document encounter notes', completed: false },
];

// Billable Activities
const MOCK_ACTIVITIES = [
  { time: '10:02', activity: 'Call Started', duration: 0, billable: true },
  { time: '10:03', activity: 'Reviewed vitals', duration: 2, billable: true },
  { time: '10:05', activity: 'Patient education - BP management', duration: 3, billable: true },
  { time: '10:08', activity: 'Medication reconciliation', duration: 4, billable: true },
  { time: '10:12', activity: 'Care plan discussion', duration: 2, billable: true },
];

// Chat messages
const MOCK_MESSAGES = [
  { id: 1, sender: 'patient', text: 'Good morning, Doctor.', time: '10:02 AM' },
  { id: 2, sender: 'provider', text: 'Good morning, Robert. How are you feeling today?', time: '10:02 AM' },
  { id: 3, sender: 'patient', text: "I've been having some headaches in the morning.", time: '10:03 AM' },
];

// ============ COMPONENTS ============

// Sparkline Component
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
      <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={points} />
      <polygon fill={`url(#sparkGradient-${color.replace('#', '')})`} points={`0,${height} ${points} ${width},${height}`} />
    </svg>
  );
}

// Audio Waveform Component
function AudioWaveform({ isActive, color = '#745EE1' }: { isActive: boolean; color?: string }) {
  return (
    <div className="flex items-center gap-0.5 h-4">
      {[1, 2, 3, 4, 5].map((bar) => (
        <div
          key={bar}
          className={cn("w-0.5 rounded-full transition-all duration-150", isActive ? "animate-pulse" : "h-1")}
          style={{ backgroundColor: color, height: isActive ? `${Math.random() * 12 + 4}px` : '4px', animationDelay: `${bar * 0.1}s` }}
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
        <div key={bar} className={cn("w-1 rounded-sm", bar <= bars ? 'opacity-100' : 'opacity-30')}
          style={{ height: `${bar * 4}px`, backgroundColor: bar <= bars ? color : '#6B7280' }} />
      ))}
    </div>
  );
}

// Risk Score Gauge
function RiskGauge({ score, level }: { score: number; level: string }) {
  const color = level === 'critical' ? '#FF4351' : level === 'high' ? '#FF8C00' : level === 'medium' ? '#FFB800' : '#5BCC56';
  return (
    <div className="flex items-center gap-2">
      <div className="relative w-10 h-10">
        <svg className="w-10 h-10 -rotate-90">
          <circle cx="20" cy="20" r="16" fill="none" stroke="#1f1f2e" strokeWidth="4" />
          <circle cx="20" cy="20" r="16" fill="none" stroke={color} strokeWidth="4"
            strokeDasharray={`${score} 100`} strokeLinecap="round" className="transition-all duration-500" />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-caption font-bold" style={{ color }}>{score}</span>
      </div>
      <div>
        <div className="text-caption text-text-secondary">Risk Score</div>
        <div className="text-small font-semibold capitalize" style={{ color }}>{level}</div>
      </div>
    </div>
  );
}

// Battery Icon Component
function BatteryIcon({ level }: { level: number }) {
  const color = level > 50 ? '#5BCC56' : level > 20 ? '#FFB800' : '#FF4351';
  const Icon = level > 75 ? BatteryFull : level > 50 ? BatteryMedium : level > 20 ? BatteryMedium : BatteryLow;
  return <Icon className="w-4 h-4" style={{ color }} />;
}

// ============ MAIN COMPONENT ============

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
  const [activeTab, setActiveTab] = useState<'vitals' | 'notes' | 'chat' | 'info' | 'rpm'>('rpm');
  const [callDuration, setCallDuration] = useState(0);
  const [loggedMinutes, setLoggedMinutes] = useState(14);
  const [isAiListening, setIsAiListening] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showAlertBanner, setShowAlertBanner] = useState(true);
  const [protocol, setProtocol] = useState(MOCK_PROTOCOL);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Notes state
  const [soapNotes, setSoapNotes] = useState({ subjective: '', objective: '', assessment: '', plan: '' });
  const [messages, setMessages] = useState(MOCK_MESSAGES);
  const [newMessage, setNewMessage] = useState('');

  // Timer effect
  useEffect(() => {
    if (isCallActive && !isCallPaused) {
      timerRef.current = setInterval(() => setCallDuration(prev => prev + 1), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isCallActive, isCallPaused]);

  // Simulate speaking
  useEffect(() => {
    const interval = setInterval(() => setIsSpeaking(Math.random() > 0.5), 500);
    return () => clearInterval(interval);
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndCall = () => {
    setIsCallActive(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    setMessages(prev => [...prev, { id: prev.length + 1, sender: 'provider', text: newMessage, time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) }]);
    setNewMessage('');
  };

  const toggleProtocolItem = (id: number) => {
    setProtocol(prev => prev.map(item => item.id === id ? { ...item, completed: !item.completed } : item));
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
    return { code: `${20 - mins}m to 99457`, color: 'text-warning', achieved: false };
  };

  const cptInfo = getCptCode();
  const totalMinutes = loggedMinutes + Math.floor(callDuration / 60);
  const activeAlerts = MOCK_ALERTS.filter(a => !a.acknowledged);
  const criticalAlerts = activeAlerts.filter(a => a.type === 'critical');

  return (
    <div className="h-screen flex flex-col bg-bg-primary dark:bg-[#0a0a12]">
      {/* Critical Alert Banner */}
      {showAlertBanner && criticalAlerts.length > 0 && (
        <div className="bg-danger/10 border-b border-danger/30 px-4 py-2 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-danger/20 animate-pulse">
              <ShieldAlert className="w-5 h-5 text-danger" />
            </div>
            <div>
              <span className="text-small font-semibold text-danger">Critical Alert: </span>
              <span className="text-small text-text-primary dark:text-white">{criticalAlerts[0].message}</span>
            </div>
            <span className="text-caption text-text-secondary">{criticalAlerts[0].time}</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1 rounded-lg bg-danger text-white text-small font-medium hover:bg-danger/80 transition-colors">
              Acknowledge
            </button>
            <button onClick={() => setShowAlertBanner(false)} className="p-1 hover:bg-danger/20 rounded transition-colors">
              <X className="w-4 h-4 text-danger" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="h-16 navbar-gradient border-b border-border-primary dark:border-[#1f1f2e] flex items-center justify-between px-4 shrink-0 backdrop-blur-xl">
        {/* Left: Patient Info */}
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/telehealth')} className="p-2 hover:bg-bg-secondary dark:hover:bg-white/5 rounded-lg transition-all group">
            <ChevronLeft className="w-5 h-5 text-text-secondary group-hover:text-brand" />
          </button>

          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-brand to-brand-dark flex items-center justify-center text-white font-bold shadow-brand">
            {MOCK_PATIENT.firstName[0]}{MOCK_PATIENT.lastName[0]}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-h3 font-semibold text-text-primary dark:text-white">{MOCK_PATIENT.name}</h1>
              <span className="chip-brand px-2 py-0.5 rounded text-caption font-medium">{MOCK_PATIENT.rpmProgram}</span>
              {activeAlerts.length > 0 && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-danger/10 text-danger text-caption font-medium">
                  <Bell className="w-3 h-3" /> {activeAlerts.length} Alert{activeAlerts.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-small text-text-secondary">
              <span>{MOCK_PATIENT.age}y {MOCK_PATIENT.gender}</span>
              <span>•</span>
              <span>{MOCK_PATIENT.mrn}</span>
              <span>•</span>
              <span className="text-brand">{MOCK_PATIENT.phone}</span>
            </div>
          </div>
        </div>

        {/* Center: Status */}
        <div className="flex items-center gap-3">
          {/* Risk Score */}
          <RiskGauge score={MOCK_PATIENT.riskScore} level={MOCK_PATIENT.riskLevel} />

          <div className="w-px h-10 bg-border-primary dark:bg-[#1f1f2e]" />

          {/* Live + Timer */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-danger/10 border border-danger/30">
            <div className="w-2 h-2 rounded-full bg-danger animate-pulse" />
            <span className="text-small font-medium text-danger">LIVE</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-2 rounded-xl dark-card">
            <div className={cn("w-2 h-2 rounded-full", isCallActive && !isCallPaused ? "bg-success animate-pulse" : "bg-warning")} />
            <span className="text-h3 font-mono font-bold text-text-primary dark:text-white tabular-nums">{formatDuration(callDuration)}</span>
          </div>

          {/* Billing */}
          <div className="text-center px-3 py-1.5 rounded-xl dark-card">
            <div className={cn("text-small font-bold flex items-center gap-1", cptInfo.color)}>
              {cptInfo.achieved && <Check className="w-3 h-3" />}
              {cptInfo.code}
            </div>
          </div>

          {/* Total Time */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-brand/10 border border-brand/30">
            <Timer className="w-4 h-4 text-brand" />
            <div className="text-small font-bold text-brand">{totalMinutes}m</div>
            <div className="text-caption text-brand/70">/{MOCK_METRICS.minutesGoal}m</div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all", isAiListening ? "bg-brand/10 border border-brand/30" : "bg-bg-secondary")}>
            <Bot className={cn("w-4 h-4", isAiListening ? "text-brand" : "text-text-secondary")} />
            <span className={cn("text-small font-medium", isAiListening ? "text-brand" : "text-text-secondary")}>AI</span>
            {isAiListening && <Sparkles className="w-3 h-3 text-brand animate-pulse" />}
          </div>

          <button onClick={() => setShowSidebar(!showSidebar)} className="p-2 hover:bg-bg-secondary dark:hover:bg-white/5 rounded-lg transition-all group">
            {showSidebar ? <PanelRightClose className="w-5 h-5 text-text-secondary group-hover:text-brand" /> : <PanelRightOpen className="w-5 h-5 text-text-secondary group-hover:text-brand" />}
          </button>
          <button className="p-2 hover:bg-bg-secondary dark:hover:bg-white/5 rounded-lg transition-all group">
            <Settings className="w-5 h-5 text-text-secondary group-hover:text-brand" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video Area */}
        <div className="flex-1 flex flex-col bg-gradient-to-br from-[#0a0a12] via-[#0d0d1a] to-[#12101f] relative">
          <div className="flex-1 relative">
            {/* Patient Video Placeholder */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="relative">
                  <div className={cn("w-40 h-40 rounded-full bg-gradient-to-br from-brand/30 to-brand-dark/30 flex items-center justify-center mx-auto mb-4 border-4 transition-all", isSpeaking ? "border-brand shadow-[0_0_30px_rgba(116,94,225,0.5)]" : "border-brand/30")}>
                    <User className="w-16 h-16 text-brand/50" />
                  </div>
                  {isSpeaking && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
                      <AudioWaveform isActive={isSpeaking} color="#745EE1" />
                    </div>
                  )}
                </div>
                <p className="text-white text-lg font-medium">{MOCK_PATIENT.name}</p>
                <p className="text-white/50 text-sm flex items-center justify-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-success animate-pulse" /> Video Connected
                </p>
              </div>
            </div>

            {/* Top Badges */}
            <div className="absolute top-4 left-4 flex items-center gap-3 px-4 py-2 rounded-xl bg-black/40 backdrop-blur-md border border-white/10">
              <NetworkQuality quality="good" />
              <span className="text-sm text-white/90 font-medium">HD</span>
              <div className="w-px h-4 bg-white/20" />
              <Wifi className="w-4 h-4 text-success" />
              <span className="text-sm text-white/70">32ms</span>
            </div>

            <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-xl bg-brand/20 backdrop-blur-md border border-brand/30">
              <Bot className="w-4 h-4 text-brand" />
              <span className="text-sm text-brand font-medium">AI Transcribing</span>
              <div className="flex gap-1">{[1, 2, 3].map(d => <div key={d} className="w-1.5 h-1.5 rounded-full bg-brand animate-bounce" style={{ animationDelay: `${d * 0.15}s` }} />)}</div>
            </div>

            <div className="absolute top-4 right-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-danger/20 backdrop-blur-md border border-danger/30">
              <div className="w-2 h-2 rounded-full bg-danger animate-pulse" />
              <span className="text-sm text-danger font-medium">REC</span>
              <span className="text-sm text-white/50">{formatDuration(callDuration)}</span>
            </div>

            {/* Self View PiP */}
            <div className={cn("absolute bottom-28 right-4 w-48 h-32 rounded-2xl overflow-hidden shadow-2xl border-2 transition-all group cursor-pointer hover:scale-105", isVideoOn ? "border-brand/50 shadow-[0_0_20px_rgba(116,94,225,0.3)]" : "border-white/10")}>
              <div className="absolute inset-0 bg-gradient-to-br from-[#15122a] to-[#0a0a12] flex items-center justify-center">
                {isVideoOn ? (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand to-brand-dark flex items-center justify-center shadow-brand">
                    <span className="text-white text-sm font-bold">You</span>
                  </div>
                ) : (
                  <div className="text-center"><VideoOff className="w-6 h-6 text-white/30 mx-auto" /><span className="text-xs text-white/30">Off</span></div>
                )}
              </div>
              {isAudioOn && isSpeaking && <div className="absolute bottom-2 left-1/2 -translate-x-1/2"><AudioWaveform isActive color="#5BCC56" /></div>}
              <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/60 text-xs text-white/80">You</div>
            </div>
          </div>

          {/* Video Controls */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 p-2 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10">
            <button onClick={() => setIsAudioOn(!isAudioOn)} className={cn("p-3 rounded-xl transition-all relative", isAudioOn ? "bg-white/10 hover:bg-white/20 text-white" : "bg-danger text-white")}>
              {isAudioOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              {isAudioOn && isSpeaking && <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-success animate-pulse" />}
            </button>
            <button onClick={() => setIsVideoOn(!isVideoOn)} className={cn("p-3 rounded-xl transition-all", isVideoOn ? "bg-white/10 hover:bg-white/20 text-white" : "bg-danger text-white")}>
              {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </button>
            <button onClick={() => setIsSpeakerOn(!isSpeakerOn)} className={cn("p-3 rounded-xl transition-all", isSpeakerOn ? "bg-white/10 hover:bg-white/20 text-white" : "bg-warning text-white")}>
              {isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
            <div className="w-px h-8 bg-white/20" />
            <button onClick={() => setIsScreenSharing(!isScreenSharing)} className={cn("p-3 rounded-xl transition-all", isScreenSharing ? "bg-brand text-white" : "bg-white/10 hover:bg-white/20 text-white")}>
              <MonitorUp className="w-5 h-5" />
            </button>
            <button className="p-3 rounded-xl bg-white/10 hover:bg-white/20 text-white"><PictureInPicture className="w-5 h-5" /></button>
            <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-3 rounded-xl bg-white/10 hover:bg-white/20 text-white">
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
            <div className="w-px h-8 bg-white/20" />
            <button onClick={() => setIsCallPaused(!isCallPaused)} className={cn("p-3 rounded-xl transition-all", isCallPaused ? "bg-warning text-white" : "bg-white/10 hover:bg-white/20 text-white")}>
              {isCallPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
            </button>
            <button onClick={handleEndCall} className="p-3 px-6 rounded-xl bg-danger hover:bg-danger/80 text-white flex items-center gap-2 hover:shadow-[0_0_20px_rgba(255,67,81,0.4)]">
              <PhoneOff className="w-5 h-5" /><span className="font-medium">End</span>
            </button>
          </div>
        </div>

        {/* Right Sidebar */}
        {showSidebar && (
          <div className="w-[420px] background-white dark:bg-[#0f0f1a]/95 backdrop-blur-xl border-l border-border-primary dark:border-[#1f1f2e] flex flex-col shrink-0">
            {/* Tabs */}
            <div className="flex border-b border-border-primary dark:border-[#1f1f2e]">
              {[
                { id: 'rpm', label: 'RPM', icon: Gauge },
                { id: 'vitals', label: 'Vitals', icon: Activity },
                { id: 'notes', label: 'Notes', icon: FileText },
                { id: 'chat', label: 'Chat', icon: MessageSquare },
                { id: 'info', label: 'Info', icon: User },
              ].map((tab) => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={cn("flex-1 flex items-center justify-center gap-1.5 py-3 text-small font-medium border-b-2 transition-all",
                    activeTab === tab.id ? "text-brand border-brand bg-brand/5" : "text-text-secondary border-transparent hover:text-text-primary hover:bg-bg-secondary dark:hover:bg-white/5")}>
                  <tab.icon className="w-4 h-4" />{tab.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {/* RPM Tab - NEW */}
              {activeTab === 'rpm' && (
                <div className="p-4 space-y-4">
                  {/* Compliance & Reading Stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl dark-card">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="w-4 h-4 text-brand" />
                        <span className="text-caption text-text-secondary">Compliance</span>
                      </div>
                      <div className="text-h1 font-bold text-brand">{MOCK_PATIENT.compliance}%</div>
                      <div className="mt-2 h-2 bg-brand/20 rounded-full overflow-hidden">
                        <div className="h-full bg-brand rounded-full transition-all" style={{ width: `${MOCK_PATIENT.compliance}%` }} />
                      </div>
                    </div>
                    <div className="p-3 rounded-xl dark-card">
                      <div className="flex items-center gap-2 mb-2">
                        <Activity className="w-4 h-4 text-success" />
                        <span className="text-caption text-text-secondary">Readings</span>
                      </div>
                      <div className="text-h1 font-bold text-text-primary dark:text-white">{MOCK_METRICS.totalReadings}</div>
                      <div className="text-caption text-success">✓ {MOCK_METRICS.readingDays} days this month</div>
                    </div>
                  </div>

                  {/* Active Alerts */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-caption font-medium text-text-secondary uppercase tracking-wide flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-danger" /> Active Alerts ({activeAlerts.length})
                      </h4>
                    </div>
                    <div className="space-y-2">
                      {activeAlerts.map((alert) => (
                        <div key={alert.id} className={cn("p-3 rounded-xl border", alert.type === 'critical' ? "bg-danger/5 border-danger/30" : "bg-warning/5 border-warning/30")}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className={cn("text-small font-semibold", alert.type === 'critical' ? "text-danger" : "text-warning")}>{alert.vital}</div>
                              <div className="text-caption text-text-primary dark:text-white mt-0.5">{alert.message}</div>
                              <div className="text-caption text-text-secondary mt-1">{alert.time}</div>
                            </div>
                            <button className={cn("px-2 py-1 rounded text-caption font-medium", alert.type === 'critical' ? "bg-danger/20 text-danger" : "bg-warning/20 text-warning")}>
                              Review
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Protocol Checklist */}
                  <div>
                    <h4 className="text-caption font-medium text-text-secondary uppercase tracking-wide mb-2 flex items-center gap-2">
                      <ListChecks className="w-4 h-4 text-brand" /> Call Protocol
                    </h4>
                    <div className="space-y-1">
                      {protocol.map((item) => (
                        <button key={item.id} onClick={() => toggleProtocolItem(item.id)}
                          className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-bg-secondary dark:hover:bg-white/5 transition-colors text-left group">
                          {item.completed ? <CheckCircle2 className="w-5 h-5 text-success shrink-0" /> : <Circle className="w-5 h-5 text-text-secondary shrink-0 group-hover:text-brand" />}
                          <span className={cn("text-small", item.completed ? "text-text-secondary line-through" : "text-text-primary dark:text-white")}>{item.item}</span>
                        </button>
                      ))}
                    </div>
                    <div className="mt-2 text-caption text-text-secondary text-center">
                      {protocol.filter(p => p.completed).length}/{protocol.length} completed
                    </div>
                  </div>

                  {/* Patient Goals */}
                  <div>
                    <h4 className="text-caption font-medium text-text-secondary uppercase tracking-wide mb-2 flex items-center gap-2">
                      <Target className="w-4 h-4 text-success" /> Care Plan Goals
                    </h4>
                    <div className="space-y-2">
                      {MOCK_GOALS.map((goal) => (
                        <div key={goal.id} className="p-3 rounded-xl dark-card">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-small text-text-primary dark:text-white">{goal.goal}</span>
                            <span className="text-caption text-brand font-medium">{goal.progress}%</span>
                          </div>
                          <div className="h-1.5 bg-brand/20 rounded-full overflow-hidden">
                            <div className="h-full bg-brand rounded-full transition-all" style={{ width: `${goal.progress}%` }} />
                          </div>
                          <div className="text-caption text-text-secondary mt-1">Due: {goal.dueDate}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Previous Encounter */}
                  <div>
                    <h4 className="text-caption font-medium text-text-secondary uppercase tracking-wide mb-2 flex items-center gap-2">
                      <History className="w-4 h-4 text-info" /> Last Encounter
                    </h4>
                    <div className="p-3 rounded-xl dark-card">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-small font-medium text-text-primary dark:text-white">{MOCK_PREVIOUS_ENCOUNTER.date}</span>
                        <span className="chip-brand px-2 py-0.5 rounded text-caption">{MOCK_PREVIOUS_ENCOUNTER.cptCode}</span>
                      </div>
                      <div className="text-caption text-text-secondary mb-2">
                        {MOCK_PREVIOUS_ENCOUNTER.duration} • {MOCK_PREVIOUS_ENCOUNTER.provider}
                      </div>
                      <p className="text-small text-text-primary dark:text-white/80">{MOCK_PREVIOUS_ENCOUNTER.summary}</p>
                      <div className="mt-2 pt-2 border-t border-border-primary dark:border-[#1f1f2e]">
                        <span className="text-caption text-text-secondary">Follow-up: </span>
                        <span className="text-caption text-brand">{MOCK_PREVIOUS_ENCOUNTER.followUp}</span>
                      </div>
                    </div>
                  </div>

                  {/* Devices Status */}
                  <div>
                    <h4 className="text-caption font-medium text-text-secondary uppercase tracking-wide mb-2 flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-success" /> Devices ({MOCK_PATIENT.devices.length})
                    </h4>
                    <div className="space-y-2">
                      {MOCK_PATIENT.devices.map((device, i) => (
                        <div key={i} className="p-3 rounded-xl dark-card flex items-center justify-between">
                          <div className="flex-1">
                            <div className="text-small font-medium text-text-primary dark:text-white">{device.type}</div>
                            <div className="text-caption text-text-secondary">{device.model}</div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1">
                              <BatteryIcon level={device.battery} />
                              <span className="text-caption text-text-secondary">{device.battery}%</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Signal className={cn("w-4 h-4", device.signal === 'excellent' ? "text-success" : "text-warning")} />
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 rounded-full bg-success" />
                              <span className="text-caption text-success">{device.lastSync}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Time Log */}
                  <div>
                    <h4 className="text-caption font-medium text-text-secondary uppercase tracking-wide mb-2 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-warning" /> Billable Activities
                    </h4>
                    <div className="space-y-1">
                      {MOCK_ACTIVITIES.map((act, i) => (
                        <div key={i} className="flex items-center justify-between py-1.5 border-b border-border-primary dark:border-[#1f1f2e] last:border-0">
                          <div className="flex items-center gap-2">
                            <span className="text-caption text-text-secondary font-mono">{act.time}</span>
                            <span className="text-small text-text-primary dark:text-white">{act.activity}</span>
                          </div>
                          {act.duration > 0 && <span className="text-caption text-brand font-medium">+{act.duration}m</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Vitals Tab */}
              {activeTab === 'vitals' && (
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl dark-card">
                      <div className="text-caption text-text-secondary mb-1">Readings</div>
                      <div className="text-h2 font-bold text-text-primary dark:text-white">{MOCK_METRICS.totalReadings}</div>
                      <div className="text-caption text-success">✓ {MOCK_METRICS.readingsGoal}+ goal</div>
                    </div>
                    <div className="p-3 rounded-xl dark-card">
                      <div className="text-caption text-text-secondary mb-1">Minutes</div>
                      <div className="text-h2 font-bold text-text-primary dark:text-white">{totalMinutes}</div>
                      <div className={cn("text-caption", totalMinutes >= MOCK_METRICS.minutesGoal ? "text-success" : "text-warning")}>
                        {totalMinutes >= MOCK_METRICS.minutesGoal ? '✓ Goal met' : `${MOCK_METRICS.minutesGoal - totalMinutes}m to go`}
                      </div>
                    </div>
                  </div>

                  {/* BP */}
                  <div className={cn("p-4 rounded-xl border", getStatusColor(MOCK_VITALS.bloodPressure.status))}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Activity className={cn("w-5 h-5", getStatusTextColor(MOCK_VITALS.bloodPressure.status))} />
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
                    <div className="text-caption text-text-secondary mt-1">
                      Target: {MOCK_VITALS.bloodPressure.threshold.systolic.max}/{MOCK_VITALS.bloodPressure.threshold.diastolic.max} • Pulse: {MOCK_VITALS.bloodPressure.pulse}
                    </div>
                  </div>

                  {/* HR */}
                  <div className={cn("p-4 rounded-xl border", getStatusColor(MOCK_VITALS.heartRate.status))}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Heart className={cn("w-5 h-5", getStatusTextColor(MOCK_VITALS.heartRate.status))} />
                        <span className="font-semibold text-text-primary dark:text-white">Heart Rate</span>
                      </div>
                      <Sparkline data={MOCK_VITALS.heartRate.sparkline} color="#5BCC56" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className={cn("text-h1 font-bold", getStatusTextColor(MOCK_VITALS.heartRate.status))}>{MOCK_VITALS.heartRate.value}</span>
                      <span className="text-small text-text-secondary">bpm</span>
                      {getTrendIcon(MOCK_VITALS.heartRate.trend)}
                    </div>
                    <div className="text-caption text-text-secondary mt-1">Range: {MOCK_VITALS.heartRate.threshold.min}-{MOCK_VITALS.heartRate.threshold.max}</div>
                  </div>

                  {/* SpO2 */}
                  <div className={cn("p-4 rounded-xl border", getStatusColor(MOCK_VITALS.spo2.status))}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Wind className={cn("w-5 h-5", getStatusTextColor(MOCK_VITALS.spo2.status))} />
                        <span className="font-semibold text-text-primary dark:text-white">SpO2</span>
                      </div>
                      <Sparkline data={MOCK_VITALS.spo2.sparkline} color="#5BCC56" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className={cn("text-h1 font-bold", getStatusTextColor(MOCK_VITALS.spo2.status))}>{MOCK_VITALS.spo2.value}</span>
                      <span className="text-small text-text-secondary">%</span>
                    </div>
                    <div className="text-caption text-text-secondary mt-1">Target: ≥{MOCK_VITALS.spo2.threshold.min}%</div>
                  </div>

                  {/* Glucose */}
                  <div className={cn("p-4 rounded-xl border", getStatusColor(MOCK_VITALS.glucose.status))}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Droplet className={cn("w-5 h-5", getStatusTextColor(MOCK_VITALS.glucose.status))} />
                        <span className="font-semibold text-text-primary dark:text-white">Glucose</span>
                      </div>
                      <Sparkline data={MOCK_VITALS.glucose.sparkline} color="#FFB800" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className={cn("text-h1 font-bold", getStatusTextColor(MOCK_VITALS.glucose.status))}>{MOCK_VITALS.glucose.value}</span>
                      <span className="text-small text-text-secondary">mg/dL</span>
                      {getTrendIcon(MOCK_VITALS.glucose.trend)}
                      <span className="chip-brand px-2 py-0.5 rounded text-caption">{MOCK_VITALS.glucose.fasting ? 'Fasting' : 'Post-meal'}</span>
                    </div>
                    <div className="text-caption text-text-secondary mt-1">Target: {MOCK_VITALS.glucose.threshold.postMeal.min}-{MOCK_VITALS.glucose.threshold.postMeal.max}</div>
                  </div>

                  {/* Weight */}
                  <div className={cn("p-4 rounded-xl border", getStatusColor(MOCK_VITALS.weight.status))}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Scale className={cn("w-5 h-5", getStatusTextColor(MOCK_VITALS.weight.status))} />
                        <span className="font-semibold text-text-primary dark:text-white">Weight</span>
                      </div>
                      <Sparkline data={MOCK_VITALS.weight.sparkline} color="#FFB800" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className={cn("text-h1 font-bold", getStatusTextColor(MOCK_VITALS.weight.status))}>{MOCK_VITALS.weight.value}</span>
                      <span className="text-small text-text-secondary">lbs</span>
                      <span className="text-small text-danger font-medium">{MOCK_VITALS.weight.change}</span>
                    </div>
                    <div className="text-caption text-text-secondary mt-1">Dry: {MOCK_VITALS.weight.dryWeight} lbs • Baseline: {MOCK_VITALS.weight.baseline} lbs</div>
                  </div>
                </div>
              )}

              {/* Notes Tab */}
              {activeTab === 'notes' && (
                <div className="p-4 space-y-4">
                  <div className="p-3 rounded-xl bg-brand/10 border border-brand/30 flex items-center gap-3">
                    <Sparkles className="w-5 h-5 text-brand" />
                    <div className="flex-1">
                      <div className="text-small font-medium text-brand">AI Suggestion</div>
                      <div className="text-caption text-brand/70">Auto-fill SOAP from conversation?</div>
                    </div>
                    <button className="px-3 py-1.5 rounded-lg bg-brand text-white text-small font-medium hover:bg-brand-dark">Apply</button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {['HTN Follow-up', 'DM Review', 'CHF Check', 'Wellness'].map(t => (
                      <button key={t} className="p-2 text-small rounded-lg dark-card hover:border-brand/50 text-left text-text-primary dark:text-white">{t}</button>
                    ))}
                  </div>

                  <div className="space-y-3">
                    {[{ key: 'subjective', label: 'Subjective' }, { key: 'objective', label: 'Objective' }, { key: 'assessment', label: 'Assessment' }, { key: 'plan', label: 'Plan' }].map(f => (
                      <div key={f.key}>
                        <label className="text-small font-medium text-brand">{f.label}</label>
                        <textarea value={soapNotes[f.key as keyof typeof soapNotes]} onChange={(e) => setSoapNotes(p => ({ ...p, [f.key]: e.target.value }))} placeholder={`Enter ${f.label.toLowerCase()}...`}
                          className="w-full mt-1 p-2.5 text-small rounded-lg dark-card focus:outline-none focus:ring-2 focus:ring-brand/30 resize-none" rows={2} />
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button className="flex items-center gap-2 p-2.5 text-small rounded-lg bg-info/10 text-info"><ClipboardList className="w-4 h-4" />Order Labs</button>
                    <button className="flex items-center gap-2 p-2.5 text-small rounded-lg bg-success/10 text-success"><Pill className="w-4 h-4" />Prescribe</button>
                    <button className="flex items-center gap-2 p-2.5 text-small rounded-lg bg-brand/10 text-brand"><Calendar className="w-4 h-4" />Schedule</button>
                    <button className="flex items-center gap-2 p-2.5 text-small rounded-lg bg-warning/10 text-warning"><Users className="w-4 h-4" />Refer</button>
                  </div>

                  <button className="w-full py-2.5 rounded-lg bg-brand hover:bg-brand-dark text-white font-medium flex items-center justify-center gap-2">
                    <Check className="w-4 h-4" />Save Notes
                  </button>
                </div>
              )}

              {/* Chat Tab */}
              {activeTab === 'chat' && (
                <div className="flex flex-col h-full">
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {messages.map((msg) => (
                      <div key={msg.id} className={cn("flex flex-col max-w-[85%]", msg.sender === 'provider' ? "ml-auto items-end" : "items-start")}>
                        <div className={cn("px-4 py-2.5 rounded-2xl text-small", msg.sender === 'provider' ? "bg-brand text-white rounded-br-md" : "dark-card text-text-primary dark:text-white rounded-bl-md")}>{msg.text}</div>
                        <span className="text-caption text-text-secondary mt-1">{msg.time}</span>
                      </div>
                    ))}
                  </div>
                  <div className="p-4 border-t border-border-primary dark:border-[#1f1f2e]">
                    <div className="flex items-center gap-2">
                      <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Type a message..." className="flex-1 px-4 py-2.5 rounded-xl dark-card text-small focus:outline-none focus:ring-2 focus:ring-brand/30" />
                      <button onClick={handleSendMessage} className="p-2.5 rounded-xl bg-brand hover:bg-brand-dark text-white"><Send className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              )}

              {/* Info Tab */}
              {activeTab === 'info' && (
                <div className="p-4 space-y-4">
                  <div>
                    <h4 className="text-caption font-medium text-text-secondary uppercase mb-2 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-warning" />Conditions</h4>
                    {MOCK_PATIENT.conditions.map((c, i) => (
                      <div key={i} className="p-2 rounded-lg dark-card flex justify-between mb-2">
                        <span className="text-small text-text-primary dark:text-white">{c.name}</span>
                        <span className="text-caption text-text-secondary font-mono">{c.code}</span>
                      </div>
                    ))}
                  </div>

                  <div>
                    <h4 className="text-caption font-medium text-text-secondary uppercase mb-2">Allergies</h4>
                    <div className="flex flex-wrap gap-2">
                      {MOCK_PATIENT.allergies.map((a, i) => <span key={i} className="chip-danger px-3 py-1 rounded-full text-small">{a}</span>)}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-caption font-medium text-text-secondary uppercase mb-2 flex items-center gap-2"><Pill className="w-4 h-4 text-info" />Medications</h4>
                    {MOCK_PATIENT.medications.map((m, i) => (
                      <div key={i} className="p-2 rounded-lg dark-card mb-2">
                        <div className="flex justify-between">
                          <span className="text-small font-medium text-text-primary dark:text-white">{m.name}</span>
                          <span className="text-caption text-brand">{m.dose}</span>
                        </div>
                        <div className="flex justify-between text-caption text-text-secondary mt-0.5">
                          <span>{m.frequency}</span>
                          <span>Adherence: {m.adherence}%</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div>
                    <h4 className="text-caption font-medium text-text-secondary uppercase mb-2 flex items-center gap-2"><Users className="w-4 h-4 text-brand" />Care Team</h4>
                    {MOCK_PATIENT.careTeam.map((m, i) => (
                      <div key={i} className="p-2 rounded-lg dark-card flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center text-brand text-caption font-bold">{m.type}</div>
                        <div className="flex-1">
                          <div className="text-small font-medium text-text-primary dark:text-white">{m.name}</div>
                          <div className="text-caption text-text-secondary">{m.role}</div>
                        </div>
                        <Phone className="w-4 h-4 text-text-secondary" />
                      </div>
                    ))}
                  </div>

                  <div>
                    <h4 className="text-caption font-medium text-text-secondary uppercase mb-2 flex items-center gap-2"><Phone className="w-4 h-4 text-danger" />Emergency Contacts</h4>
                    {MOCK_PATIENT.emergencyContacts.map((c, i) => (
                      <div key={i} className="p-2 rounded-lg dark-card flex justify-between mb-2">
                        <div>
                          <div className="text-small font-medium text-text-primary dark:text-white">{c.name}</div>
                          <div className="text-caption text-text-secondary">{c.relation}</div>
                        </div>
                        <span className="text-small text-brand">{c.phone}</span>
                      </div>
                    ))}
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
