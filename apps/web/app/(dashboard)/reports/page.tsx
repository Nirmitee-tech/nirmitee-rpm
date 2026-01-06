import { FileText, Download, Calendar, Filter } from 'lucide-react';
import { Button, Badge } from '@nirmitee/ui';

const reports = [
  {
    id: '1',
    name: 'Monthly Performance Report',
    type: 'Performance',
    date: '2026-01-05',
    status: 'ready',
  },
  {
    id: '2',
    name: 'User Activity Summary',
    type: 'Activity',
    date: '2026-01-04',
    status: 'ready',
  },
  {
    id: '3',
    name: 'Security Audit Report',
    type: 'Security',
    date: '2026-01-03',
    status: 'processing',
  },
  {
    id: '4',
    name: 'Financial Overview Q4',
    type: 'Financial',
    date: '2026-01-02',
    status: 'ready',
  },
  {
    id: '5',
    name: 'Compliance Report',
    type: 'Compliance',
    date: '2026-01-01',
    status: 'failed',
  },
];

const statusColors = {
  ready: 'success',
  processing: 'warning',
  failed: 'danger',
} as const;

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-h1 text-primary">Reports</h1>
          <p className="text-secondary mt-1">View and download generated reports</p>
        </div>
        <Button>
          <FileText className="h-4 w-4 mr-2" />
          Generate Report
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm">
          <Calendar className="h-4 w-4 mr-2" />
          Date Range
        </Button>
        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4 mr-2" />
          Filter by Type
        </Button>
      </div>

      {/* Reports List */}
      <div className="background-white border-primary rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#D7D7D7] dark:border-[#212121]">
                <th className="text-left px-4 py-3 text-sm font-semibold text-primary">Report Name</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-primary">Type</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-primary">Date</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-primary">Status</th>
                <th className="text-right px-4 py-3 text-sm font-semibold text-primary">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr
                  key={report.id}
                  className="border-b border-[#D7D7D7] dark:border-[#212121] last:border-0 hover:bg-gray-50 dark:hover:bg-gray-900/50"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-brand" />
                      <span className="text-sm font-medium text-primary">{report.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-secondary">{report.type}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-secondary">{report.date}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusColors[report.status]} className="capitalize">
                      {report.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={report.status !== 'ready'}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
