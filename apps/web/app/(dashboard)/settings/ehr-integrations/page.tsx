'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useTranslations } from '@/lib/i18n/i18n-context';
import { Button, Input, Badge } from '@nirmitee/ui';
import {
  Link2,
  Unlink,
  RefreshCw,
  Settings,
  CheckCircle,
  AlertCircle,
  Clock,
  Users,
  X,
  ExternalLink,
  Loader2,
  Info,
  Key,
  Globe,
  Eye,
  EyeOff,
  Shield,
  Zap,
} from 'lucide-react';

// EHR System type
interface EHRSystem {
  id: string;
  name: string;
  description: string;
  color: string;
  bgColor: string;
  textColor: string;
  logo?: string;
  status: 'connected' | 'disconnected' | 'pending';
  lastSync?: string;
  patientCount?: number;
  // Connection config
  config?: {
    apiUrl?: string;
    clientId?: string;
    clientSecret?: string;
    tenantId?: string;
  };
}

// EHR systems data
const INITIAL_EHR_SYSTEMS: EHRSystem[] = [
  {
    id: 'epic',
    name: 'Epic',
    description: 'Leading EHR for large healthcare organizations',
    color: '#C8102E',
    bgColor: 'bg-[#C8102E]',
    textColor: 'text-white',
    logo: '/ehr-logos/epic.svg',
    status: 'connected',
    lastSync: '2024-01-08T10:30:00Z',
    patientCount: 1250,
    config: {
      apiUrl: 'https://fhir.epic.com/interconnect-fhir-oauth',
      clientId: 'epic_client_123',
      tenantId: 'org_456',
    },
  },
  {
    id: 'cerner',
    name: 'Oracle Health (Cerner)',
    description: 'Comprehensive health IT solutions',
    color: '#C74634',
    bgColor: 'bg-[#C74634]',
    textColor: 'text-white',
    logo: '/ehr-logos/cerner.svg',
    status: 'connected',
    lastSync: '2024-01-07T15:45:00Z',
    patientCount: 890,
    config: {
      apiUrl: 'https://fhir.cerner.com/oauth2',
      clientId: 'cerner_client_789',
    },
  },
  {
    id: 'athena',
    name: 'athenahealth',
    description: 'Cloud-based services for healthcare',
    color: '#00A8E1',
    bgColor: 'bg-[#00A8E1]',
    textColor: 'text-white',
    logo: '/ehr-logos/athena.svg',
    status: 'disconnected',
  },
  {
    id: 'allscripts',
    name: 'Veradigm (Allscripts)',
    description: 'Open, connected health solutions',
    color: '#0072CE',
    bgColor: 'bg-[#0072CE]',
    textColor: 'text-white',
    logo: '/ehr-logos/allscripts.svg',
    status: 'disconnected',
  },
  {
    id: 'meditech',
    name: 'MEDITECH',
    description: 'Healthcare IT for hospitals',
    color: '#003366',
    bgColor: 'bg-[#003366]',
    textColor: 'text-white',
    logo: '/ehr-logos/meditech.svg',
    status: 'disconnected',
  },
  {
    id: 'eclinicalworks',
    name: 'eClinicalWorks',
    description: 'Ambulatory healthcare IT',
    color: '#00529B',
    bgColor: 'bg-[#00529B]',
    textColor: 'text-white',
    logo: '/ehr-logos/ecw.svg',
    status: 'disconnected',
  },
  {
    id: 'nextgen',
    name: 'NextGen Healthcare',
    description: 'Practice management solutions',
    color: '#00843D',
    bgColor: 'bg-[#00843D]',
    textColor: 'text-white',
    logo: '/ehr-logos/nextgen.svg',
    status: 'disconnected',
  },
  {
    id: 'drchrono',
    name: 'DrChrono',
    description: 'Mobile EHR platform',
    color: '#4A90D9',
    bgColor: 'bg-[#4A90D9]',
    textColor: 'text-white',
    logo: '/ehr-logos/drchrono.svg',
    status: 'disconnected',
  },
];

// EHR Logo Component
function EHRLogo({ ehr, size = 'md' }: { ehr: EHRSystem; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const [imgError, setImgError] = useState(false);
  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-14 h-14 text-xl',
    xl: 'w-20 h-20 text-3xl',
  };

  if (imgError || !ehr.logo) {
    return (
      <div
        className={`${sizeClasses[size]} rounded-xl flex items-center justify-center font-bold ${ehr.bgColor} ${ehr.textColor}`}
      >
        {ehr.name.charAt(0)}
      </div>
    );
  }

  return (
    <div className={`${sizeClasses[size]} rounded-xl flex items-center justify-center ${ehr.bgColor} p-2`}>
      <Image
        src={ehr.logo}
        alt={`${ehr.name} logo`}
        width={size === 'xl' ? 56 : size === 'lg' ? 40 : size === 'md' ? 28 : 20}
        height={size === 'xl' ? 56 : size === 'lg' ? 40 : size === 'md' ? 28 : 20}
        className="object-contain"
        onError={() => setImgError(true)}
      />
    </div>
  );
}

// Connection Configuration Modal
function ConnectionModal({
  isOpen,
  onClose,
  ehr,
  onSave,
  mode,
}: {
  isOpen: boolean;
  onClose: () => void;
  ehr: EHRSystem;
  onSave: (config: EHRSystem['config']) => void;
  mode: 'connect' | 'configure';
}) {
  const { t } = useTranslations('settings.ehrIntegrations');
  const [saving, setSaving] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [config, setConfig] = useState({
    apiUrl: ehr.config?.apiUrl || '',
    clientId: ehr.config?.clientId || '',
    clientSecret: ehr.config?.clientSecret || '',
    tenantId: ehr.config?.tenantId || '',
  });

  const handleSave = async () => {
    setSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    onSave(config);
    setSaving(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-4 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <EHRLogo ehr={ehr} size="lg" />
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {mode === 'connect' ? `Connect to ${ehr.name}` : `Configure ${ehr.name}`}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {mode === 'connect' ? 'Enter your FHIR API credentials' : 'Update connection settings'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4">
          {/* API URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              <Globe className="h-4 w-4 inline mr-1.5" />
              FHIR API URL
            </label>
            <Input
              value={config.apiUrl}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig(prev => ({ ...prev, apiUrl: e.target.value }))}
              placeholder={`https://fhir.${ehr.id}.com/api/FHIR/R4`}
            />
            <p className="text-xs text-gray-500 mt-1">The base URL of your {ehr.name} FHIR endpoint</p>
          </div>

          {/* Client ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              <Key className="h-4 w-4 inline mr-1.5" />
              Client ID
            </label>
            <Input
              value={config.clientId}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig(prev => ({ ...prev, clientId: e.target.value }))}
              placeholder="your-client-id"
            />
          </div>

          {/* Client Secret */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              <Shield className="h-4 w-4 inline mr-1.5" />
              Client Secret
            </label>
            <div className="relative">
              <Input
                type={showSecret ? 'text' : 'password'}
                value={config.clientSecret}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig(prev => ({ ...prev, clientSecret: e.target.value }))}
                placeholder="••••••••••••••••"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Tenant ID (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Tenant ID <span className="text-gray-400 font-normal">(Optional)</span>
            </label>
            <Input
              value={config.tenantId}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig(prev => ({ ...prev, tenantId: e.target.value }))}
              placeholder="your-tenant-id"
            />
          </div>

          {/* Info */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex gap-2">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-blue-700 dark:text-blue-300">
                <p className="font-medium">Need help finding these credentials?</p>
                <p className="mt-1">
                  Contact your {ehr.name} administrator or visit the{' '}
                  <a href="#" className="underline">developer documentation</a>.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !config.apiUrl || !config.clientId}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {mode === 'connect' ? 'Connecting...' : 'Saving...'}
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                {mode === 'connect' ? 'Connect' : 'Save Changes'}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// EHR Card Component
function EHRCard({
  ehr,
  onConnect,
  onConfigure,
  onDisconnect,
  onSync,
}: {
  ehr: EHRSystem;
  onConnect: () => void;
  onConfigure: () => void;
  onDisconnect: () => void;
  onSync: () => void;
}) {
  const [syncing, setSyncing] = useState(false);
  const isConnected = ehr.status === 'connected';

  const handleSync = async () => {
    setSyncing(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    onSync();
    setSyncing(false);
  };

  return (
    <div className={`relative bg-white dark:bg-gray-800 rounded-xl border-2 transition-all hover:shadow-lg ${
      isConnected
        ? 'border-green-200 dark:border-green-800'
        : 'border-gray-200 dark:border-gray-700 hover:border-[#745EE1] dark:hover:border-[#745EE1]'
    }`}>
      {/* Connected Badge */}
      {isConnected && (
        <div className="absolute -top-2 -right-2">
          <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center shadow-lg">
            <CheckCircle className="h-4 w-4 text-white" />
          </div>
        </div>
      )}

      <div className="p-5">
        {/* Logo & Name */}
        <div className="flex flex-col items-center text-center mb-4">
          <EHRLogo ehr={ehr} size="xl" />
          <h3 className="mt-3 font-semibold text-gray-900 dark:text-white">{ehr.name}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{ehr.description}</p>
        </div>

        {/* Stats (if connected) */}
        {isConnected && (
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="p-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg text-center">
              <p className="text-lg font-bold text-gray-900 dark:text-white">{ehr.patientCount?.toLocaleString()}</p>
              <p className="text-[10px] text-gray-500 uppercase">Patients</p>
            </div>
            <div className="p-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg text-center">
              <p className="text-xs font-medium text-gray-900 dark:text-white">
                {ehr.lastSync ? new Date(ehr.lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
              </p>
              <p className="text-[10px] text-gray-500 uppercase">Last Sync</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2">
          {isConnected ? (
            <>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={handleSync}
                  disabled={syncing}
                >
                  {syncing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  <span className="ml-1.5">Sync</span>
                </Button>
                <Button variant="outline" size="sm" onClick={onConfigure}>
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={onDisconnect}
              >
                <Unlink className="h-4 w-4 mr-1.5" />
                Disconnect
              </Button>
            </>
          ) : (
            <Button className="w-full" onClick={onConnect}>
              <Link2 className="h-4 w-4 mr-1.5" />
              Connect
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// Main Page Component
export default function EHRIntegrationsPage() {
  const { t } = useTranslations('settings.ehrIntegrations');

  const [ehrSystems, setEhrSystems] = useState<EHRSystem[]>(INITIAL_EHR_SYSTEMS);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEhr, setSelectedEhr] = useState<EHRSystem | null>(null);
  const [modalMode, setModalMode] = useState<'connect' | 'configure'>('connect');

  const connectedCount = ehrSystems.filter(ehr => ehr.status === 'connected').length;
  const totalPatients = ehrSystems
    .filter(ehr => ehr.status === 'connected')
    .reduce((sum, ehr) => sum + (ehr.patientCount || 0), 0);

  const handleConnect = (ehr: EHRSystem) => {
    setSelectedEhr(ehr);
    setModalMode('connect');
    setModalOpen(true);
  };

  const handleConfigure = (ehr: EHRSystem) => {
    setSelectedEhr(ehr);
    setModalMode('configure');
    setModalOpen(true);
  };

  const handleDisconnect = (ehrId: string) => {
    setEhrSystems(prev =>
      prev.map(ehr =>
        ehr.id === ehrId
          ? { ...ehr, status: 'disconnected' as const, lastSync: undefined, patientCount: undefined, config: undefined }
          : ehr
      )
    );
  };

  const handleSync = (ehrId: string) => {
    setEhrSystems(prev =>
      prev.map(ehr =>
        ehr.id === ehrId
          ? { ...ehr, lastSync: new Date().toISOString() }
          : ehr
      )
    );
  };

  const handleSaveConfig = (config: EHRSystem['config']) => {
    if (!selectedEhr) return;
    setEhrSystems(prev =>
      prev.map(ehr =>
        ehr.id === selectedEhr.id
          ? {
              ...ehr,
              status: 'connected' as const,
              config,
              lastSync: new Date().toISOString(),
              patientCount: ehr.patientCount || Math.floor(Math.random() * 1000) + 500,
            }
          : ehr
      )
    );
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            {t('title') || 'EHR Integrations'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {t('subtitle') || 'Connect your Electronic Health Record systems to import patient data'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            <span className="text-sm font-medium text-green-700 dark:text-green-300">
              {connectedCount} Connected
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
              {totalPatients.toLocaleString()} Patients
            </span>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="p-4 bg-gradient-to-r from-[#745EE1]/10 to-blue-500/10 rounded-xl border border-[#745EE1]/20">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#745EE1]/20 flex items-center justify-center flex-shrink-0">
            <Zap className="h-5 w-5 text-[#745EE1]" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {t('infoTitle') || 'Secure FHIR R4 Integration'}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
              {t('infoDesc') || 'All connections use industry-standard FHIR R4 APIs with OAuth 2.0. Patient data is encrypted in transit and at rest.'}
            </p>
          </div>
        </div>
      </div>

      {/* EHR Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {ehrSystems.map((ehr) => (
          <EHRCard
            key={ehr.id}
            ehr={ehr}
            onConnect={() => handleConnect(ehr)}
            onConfigure={() => handleConfigure(ehr)}
            onDisconnect={() => handleDisconnect(ehr.id)}
            onSync={() => handleSync(ehr.id)}
          />
        ))}
      </div>

      {/* Help Section */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-gray-500 mt-0.5" />
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">
                {t('needHelp') || 'Don\'t see your EHR?'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                We support custom FHIR integrations. Contact us to add your EHR system.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <ExternalLink className="h-4 w-4 mr-1.5" />
              {t('documentation') || 'Documentation'}
            </Button>
            <Button size="sm">
              {t('contactSupport') || 'Contact Support'}
            </Button>
          </div>
        </div>
      </div>

      {/* Connection Modal */}
      {selectedEhr && (
        <ConnectionModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setSelectedEhr(null);
          }}
          ehr={selectedEhr}
          onSave={handleSaveConfig}
          mode={modalMode}
        />
      )}
    </div>
  );
}
