import multer from 'multer';
import { Request } from 'express';
import { ApiError } from '../utils/api-error';
import crypto from 'crypto';
import path from 'path';

// Allowed file types
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
];
export const ALLOWED_ALL_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOCUMENT_TYPES];

// File size limits (in bytes)
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB default
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB for images
export const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10MB for documents

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter function
const createFileFilter = (allowedTypes: string[]) => {
  return (_req: Request, file: Express.Multer.File, callback: multer.FileFilterCallback) => {
    if (allowedTypes.includes(file.mimetype)) {
      callback(null, true);
    } else {
      callback(
        new ApiError(
          400,
          `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`
        )
      );
    }
  };
};

// Generate unique filename with organization prefix
export const generateUniqueFilename = (
  organizationId: string,
  originalFilename: string
): string => {
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(8).toString('hex');
  const ext = path.extname(originalFilename);
  const baseName = path.basename(originalFilename, ext);
  const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9-_]/g, '_').substring(0, 50);

  return `${organizationId}/${timestamp}-${randomString}-${sanitizedBaseName}${ext}`;
};

// Single file upload middleware
export const uploadSingleFile = (fieldName: string, allowedTypes: string[] = ALLOWED_ALL_TYPES, maxSize: number = MAX_FILE_SIZE) => {
  return multer({
    storage,
    fileFilter: createFileFilter(allowedTypes),
    limits: {
      fileSize: maxSize,
    },
  }).single(fieldName);
};

// Multiple files upload middleware
export const uploadMultipleFiles = (
  fieldName: string,
  maxCount: number = 10,
  allowedTypes: string[] = ALLOWED_ALL_TYPES,
  maxSize: number = MAX_FILE_SIZE
) => {
  return multer({
    storage,
    fileFilter: createFileFilter(allowedTypes),
    limits: {
      fileSize: maxSize,
      files: maxCount,
    },
  }).array(fieldName, maxCount);
};

// Image upload middleware
export const uploadImage = (fieldName: string = 'image') => {
  return uploadSingleFile(fieldName, ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE);
};

// Multiple images upload middleware
export const uploadImages = (fieldName: string = 'images', maxCount: number = 5) => {
  return uploadMultipleFiles(fieldName, maxCount, ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE);
};

// Document upload middleware
export const uploadDocument = (fieldName: string = 'document') => {
  return uploadSingleFile(fieldName, ALLOWED_DOCUMENT_TYPES, MAX_DOCUMENT_SIZE);
};

// Multiple documents upload middleware
export const uploadDocuments = (fieldName: string = 'documents', maxCount: number = 10) => {
  return uploadMultipleFiles(fieldName, maxCount, ALLOWED_DOCUMENT_TYPES, MAX_DOCUMENT_SIZE);
};

// Helper to validate uploaded file
export const validateUploadedFile = (file: Express.Multer.File | undefined): Express.Multer.File => {
  if (!file) {
    throw ApiError.badRequest('No file uploaded');
  }
  return file;
};

// Helper to validate uploaded files
export const validateUploadedFiles = (files: Express.Multer.File[] | undefined): Express.Multer.File[] => {
  if (!files || files.length === 0) {
    throw ApiError.badRequest('No files uploaded');
  }
  return files;
};

// Get file extension from mimetype
export const getFileExtension = (mimetype: string): string => {
  const mimeToExt: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'application/pdf': '.pdf',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/vnd.ms-excel': '.xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'text/csv': '.csv',
  };
  return mimeToExt[mimetype] || '';
};
