'use client';

import Link from 'next/link';
import { Badge } from '@nirmitee/ui';
import { cn } from '@/lib/utils';
import { Eye, Phone, AlertTriangle, AlertCircle, User } from 'lucide-react';

export interface PatientAttention {
  id: string;
  firstName: string;
  lastName: string;
  conditions: string[];
  lastVital?: {
    type: string;
    value: string;
    status: 'normal' | 'warning' | 'critical';
    time: string;
  };
  alertCount: number;
  alertSeverity: 'warning' | 'critical';
  phone?: string;
}

export interface PatientAttentionTableProps {
  patients: PatientAttention[];
  isLoading?: boolean;
  emptyMessage?: string;
  className?: string;
}

export function PatientAttentionTable({
  patients,
  isLoading,
  emptyMessage = 'No patients require attention',
  className,
}: PatientAttentionTableProps) {
  if (isLoading) {
    return (
      <div className={cn('bg-white dark:bg-gradient-to-br dark:from-[#0f0f1a] dark:to-[#15122a] border border-gray-200 dark:border-[#1f1f2e] rounded-xl p-6', className)}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('bg-white dark:bg-gradient-to-br dark:from-[#0f0f1a] dark:to-[#15122a] border border-gray-200 dark:border-[#1f1f2e] rounded-xl overflow-hidden', className)}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Patients Requiring Attention
          </h3>
          {patients.length > 0 && (
            <Badge variant="warning" className="ml-2">
              {patients.length}
            </Badge>
          )}
        </div>
      </div>

      {/* Table */}
      {patients.length === 0 ? (
        <div className="p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="h-6 w-6 text-emerald-500" />
          </div>
          <p className="text-gray-500 dark:text-gray-400">{emptyMessage}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Patient
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Conditions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Last Vital
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {patients.map((patient) => (
                <tr
                  key={patient.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                >
                  {/* Patient Name */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-[#745EE1]/10 flex items-center justify-center">
                        <User className="h-4 w-4 text-[#745EE1]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {patient.firstName} {patient.lastName}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Conditions */}
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {patient.conditions.slice(0, 2).map((condition, idx) => (
                        <Badge key={idx} variant="gray" className="text-xs">
                          {condition}
                        </Badge>
                      ))}
                      {patient.conditions.length > 2 && (
                        <Badge variant="gray" className="text-xs">
                          +{patient.conditions.length - 2}
                        </Badge>
                      )}
                    </div>
                  </td>

                  {/* Last Vital */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    {patient.lastVital ? (
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {patient.lastVital.type}: {patient.lastVital.value}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {patient.lastVital.time}
                        </p>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">No data</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge
                      variant={patient.alertSeverity === 'critical' ? 'danger' : 'warning'}
                    >
                      {patient.alertSeverity === 'critical' ? 'Critical' : 'Warning'}
                      {patient.alertCount > 1 && ` (${patient.alertCount})`}
                    </Badge>
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/patients/${patient.id}`}
                        className="p-2 text-gray-400 hover:text-[#745EE1] hover:bg-[#745EE1]/10 rounded-lg transition-colors"
                        title="View Patient"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      {patient.phone && (
                        <a
                          href={`tel:${patient.phone}`}
                          className="p-2 text-gray-400 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors"
                          title="Call Patient"
                        >
                          <Phone className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default PatientAttentionTable;
