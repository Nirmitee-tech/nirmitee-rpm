'use client';

import { useState } from 'react';
import { useTranslations } from '@/lib/i18n/i18n-context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pencil, ChevronRight, X, Users, UserCircle, Phone, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CareTeamMember {
  id: string;
  name: string;
  role: string;
  roleAbbreviation?: string;
  phone?: string;
  email?: string;
}

interface PatientCareTeamCardProps {
  careTeam: CareTeamMember[];
  onEdit?: () => void;
  className?: string;
}

export function PatientCareTeamCard({
  careTeam,
  onEdit,
  className,
}: PatientCareTeamCardProps) {
  const { t } = useTranslations('patientDetail');
  const [showDrawer, setShowDrawer] = useState(false);

  return (
    <>
      <Card className={cn('w-full', className)}>
        <CardContent className="px-2 py-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3 text-blue-600" />
              <span className="text-[11px] font-semibold">{t('careTeam')}</span>
              <span className="text-[9px] text-gray-400">({careTeam.length})</span>
            </div>
            {onEdit && (
              <Button variant="ghost" size="sm" onClick={onEdit} className="h-4 w-4 p-0">
                <Pencil className="w-2.5 h-2.5" />
              </Button>
            )}
          </div>
          {careTeam.length === 0 ? (
            <p className="text-[9px] text-gray-400 text-center">{t('noCareTeam')}</p>
          ) : (
            <div className="flex flex-wrap gap-0.5 mt-1">
              {careTeam.map((m) => (
                <span key={m.id} className="px-1 py-px text-[9px] font-medium rounded bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 flex items-center gap-0.5">
                  <UserCircle className="w-2 h-2" />
                  {m.name.split(' ')[0]} ({m.roleAbbreviation || m.role})
                </span>
              ))}
              <button
                onClick={() => setShowDrawer(true)}
                className="px-1 py-px text-[9px] font-medium rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center"
              >
                Details <ChevronRight className="w-2 h-2" />
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Drawer */}
      {showDrawer && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setShowDrawer(false)} />
          <div className="fixed right-0 top-0 h-full w-80 bg-white dark:bg-gray-900 shadow-xl z-50 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                {t('careTeam')} ({careTeam.length})
              </h2>
              <button onClick={() => setShowDrawer(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <div className="space-y-2">
                {careTeam.map((m) => (
                  <div key={m.id} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                    <div className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-semibold">
                        {m.name.split(' ').map(n => n[0]).join('')}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{m.name}</p>
                        <p className="text-xs text-gray-500">{m.roleAbbreviation || m.role}</p>
                      </div>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-medium rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600">
                        <Phone className="w-3 h-3" /> Call
                      </button>
                      <button className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-medium rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600">
                        <Mail className="w-3 h-3" /> Email
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {onEdit && (
              <div className="p-3 border-t">
                <Button onClick={onEdit} size="sm" className="w-full h-8 text-xs">
                  <Pencil className="w-3 h-3 mr-1" /> {t('edit')}
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
