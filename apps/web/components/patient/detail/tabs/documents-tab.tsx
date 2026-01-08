'use client';

import { useTranslations } from '@/lib/i18n/i18n-context';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@nirmitee/ui';
import {
  FileText,
  Upload,
  Download,
  Eye,
  Calendar,
  Filter,
  File,
  FileImage,
  FileSpreadsheet,
  MoreVertical,
  CreditCard,
  Clipboard,
  Pill,
  HeartPulse,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Types
type DocumentType =
  | 'Consent Form'
  | 'Lab Report'
  | 'Prescription'
  | 'Insurance Card'
  | 'Medical Record'
  | 'Imaging'
  | 'Other';

interface Document {
  id: string;
  name: string;
  type: DocumentType;
  uploadDate: string;
  uploadedBy: string;
  fileSize: string;
  fileExtension: string;
  url?: string;
}

interface DocumentsTabProps {
  patientId: string;
  documents?: Document[];
  isLoading: boolean;
  onRefresh?: () => void;
  onUpload?: () => void;
  onDownload?: (id: string) => void;
  onPreview?: (id: string) => void;
  onDelete?: (id: string) => void;
}

// Mock data for demonstration
const mockDocuments: Document[] = [
  {
    id: '1',
    name: 'RPM Consent Form - Signed',
    type: 'Consent Form',
    uploadDate: '2024-01-05T09:00:00Z',
    uploadedBy: 'Dr. Sarah Johnson',
    fileSize: '245 KB',
    fileExtension: 'pdf',
  },
  {
    id: '2',
    name: 'HIPAA Privacy Notice',
    type: 'Consent Form',
    uploadDate: '2024-01-05T09:05:00Z',
    uploadedBy: 'Dr. Sarah Johnson',
    fileSize: '180 KB',
    fileExtension: 'pdf',
  },
  {
    id: '3',
    name: 'Complete Blood Count Results',
    type: 'Lab Report',
    uploadDate: '2024-01-04T14:30:00Z',
    uploadedBy: 'Lab Corp',
    fileSize: '320 KB',
    fileExtension: 'pdf',
  },
  {
    id: '4',
    name: 'Metformin 500mg - 90 days',
    type: 'Prescription',
    uploadDate: '2024-01-03T11:15:00Z',
    uploadedBy: 'Dr. Sarah Johnson',
    fileSize: '125 KB',
    fileExtension: 'pdf',
  },
  {
    id: '5',
    name: 'Blue Cross Insurance Card Front',
    type: 'Insurance Card',
    uploadDate: '2024-01-05T09:10:00Z',
    uploadedBy: 'Nurse Mary Williams',
    fileSize: '450 KB',
    fileExtension: 'jpg',
  },
  {
    id: '6',
    name: 'Blue Cross Insurance Card Back',
    type: 'Insurance Card',
    uploadDate: '2024-01-05T09:10:00Z',
    uploadedBy: 'Nurse Mary Williams',
    fileSize: '440 KB',
    fileExtension: 'jpg',
  },
  {
    id: '7',
    name: 'Chest X-Ray Report',
    type: 'Imaging',
    uploadDate: '2023-12-28T16:00:00Z',
    uploadedBy: 'Radiology Dept',
    fileSize: '1.2 MB',
    fileExtension: 'pdf',
  },
];

export function DocumentsTab({
  patientId,
  documents = mockDocuments,
  isLoading,
  onRefresh,
  onUpload,
  onDownload,
  onPreview,
  onDelete,
}: DocumentsTabProps) {
  const { t } = useTranslations('documents');
  const { t: tCommon } = useTranslations('common');

  // Get icon for document type
  const getDocumentIcon = (type: DocumentType) => {
    const icons = {
      'Consent Form': Clipboard,
      'Lab Report': HeartPulse,
      Prescription: Pill,
      'Insurance Card': CreditCard,
      'Medical Record': FileText,
      Imaging: FileImage,
      Other: File,
    };
    return icons[type] || File;
  };

  // Get color for document type
  const getDocumentColor = (type: DocumentType) => {
    const colors = {
      'Consent Form': 'bg-blue-50 text-blue-600',
      'Lab Report': 'bg-red-50 text-red-600',
      Prescription: 'bg-green-50 text-green-600',
      'Insurance Card': 'bg-purple-50 text-purple-600',
      'Medical Record': 'bg-yellow-50 text-yellow-600',
      Imaging: 'bg-indigo-50 text-indigo-600',
      Other: 'bg-gray-50 text-gray-600',
    };
    return colors[type] || 'bg-gray-50 text-gray-600';
  };

  // Get file icon based on extension
  const getFileIcon = (extension: string) => {
    if (extension === 'pdf') return FileText;
    if (['jpg', 'jpeg', 'png', 'gif'].includes(extension)) return FileImage;
    if (['xls', 'xlsx', 'csv'].includes(extension)) return FileSpreadsheet;
    return File;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#745EE1] mx-auto mb-2"></div>
          <p className="text-sm text-gray-500">{tCommon('loading')}</p>
        </div>
      </div>
    );
  }

  // Group documents by type
  const documentsByType = documents.reduce(
    (acc, doc) => {
      if (!acc[doc.type]) acc[doc.type] = [];
      acc[doc.type].push(doc);
      return acc;
    },
    {} as Record<DocumentType, Document[]>
  );

  return (
    <div className="space-y-4">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">{t('title')}</h3>
          <p className="text-sm text-gray-500 mt-0.5">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-8 text-xs">
            <Filter className="w-3.5 h-3.5 mr-1.5" />
            {t('filterByType')}
          </Button>
          <Button
            size="sm"
            className="bg-[#745EE1] hover:bg-[#5d4bc4]"
            onClick={onUpload}
          >
            <Upload className="w-4 h-4 mr-1.5" />
            {t('uploadDocument')}
          </Button>
        </div>
      </div>

      {/* Documents Grid */}
      {documents.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-600 mb-4">{t('noDocuments')}</p>
              <Button
                size="sm"
                className="bg-[#745EE1] hover:bg-[#5d4bc4]"
                onClick={onUpload}
              >
                <Upload className="w-4 h-4 mr-1.5" />
                {t('uploadFirst')}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        Object.entries(documentsByType).map(([type, docs]) => {
          const Icon = getDocumentIcon(type as DocumentType);
          const colorClass = getDocumentColor(type as DocumentType);

          return (
            <Card key={type}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', colorClass)}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <CardTitle className="text-base font-semibold">
                    {t(`types.${type}`)}
                  </CardTitle>
                  <Badge variant="gray" className="ml-auto text-xs">
                    {docs.length} {t('files')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid gap-2">
                  {docs.map((doc) => {
                    const FileIcon = getFileIcon(doc.fileExtension);
                    return (
                      <div
                        key={doc.id}
                        className="flex items-center gap-3 p-3 rounded-md border border-gray-200 hover:border-[#745EE1] hover:bg-purple-50/30 transition-colors group"
                      >
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center group-hover:border-[#745EE1]">
                          <FileIcon className="w-5 h-5 text-gray-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {doc.name}
                          </p>
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>
                                {new Date(doc.uploadDate).toLocaleDateString()}
                              </span>
                            </div>
                            <span>•</span>
                            <span>{doc.uploadedBy}</span>
                            <span>•</span>
                            <span className="text-gray-400">{doc.fileSize}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 hover:bg-purple-100 hover:text-[#745EE1]"
                            onClick={() => onPreview?.(doc.id)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 hover:bg-purple-100 hover:text-[#745EE1]"
                            onClick={() => onDownload?.(doc.id)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 hover:bg-purple-100 hover:text-[#745EE1]"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem
                                onClick={() => onPreview?.(doc.id)}
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                {t('preview')}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => onDownload?.(doc.id)}
                              >
                                <Download className="w-4 h-4 mr-2" />
                                {t('download')}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => onDelete?.(doc.id)}
                                className="text-red-600 focus:text-red-600"
                              >
                                <FileText className="w-4 h-4 mr-2" />
                                {t('delete')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })
      )}

      {/* Document Stats */}
      {documents.length > 0 && (
        <Card className="bg-gray-50">
          <CardContent className="py-3">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>
                {t('totalDocuments')}: <strong>{documents.length}</strong>
              </span>
              <span>
                {t('totalSize')}:{' '}
                <strong>
                  {documents
                    .reduce((sum, doc) => {
                      const size = parseFloat(doc.fileSize);
                      const unit = doc.fileSize.split(' ')[1];
                      return sum + (unit === 'MB' ? size * 1024 : size);
                    }, 0)
                    .toFixed(0)}{' '}
                  KB
                </strong>
              </span>
              <span>
                {t('lastUpload')}:{' '}
                <strong>
                  {new Date(
                    Math.max(
                      ...documents.map((d) => new Date(d.uploadDate).getTime())
                    )
                  ).toLocaleDateString()}
                </strong>
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
