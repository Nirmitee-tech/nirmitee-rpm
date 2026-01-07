import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/auth-middleware';
import {
  uploadSingleFile,
  uploadMultipleFiles,
  validateUploadedFile,
  validateUploadedFiles,
  generateUniqueFilename,
  ALLOWED_ALL_TYPES,
  MAX_FILE_SIZE,
} from '../../middleware/upload-middleware';
import { storageService } from '../../services/storage-service';
import { prisma } from '../../utils/prisma';
import { ApiError } from '../../utils/api-error';
import { z } from 'zod';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Validation schemas
const presignedUrlSchema = z.object({
  filename: z.string().min(1, 'Filename is required'),
  contentType: z.string().min(1, 'Content type is required'),
  expiresIn: z.number().optional().default(3600),
});

// POST /api/uploads - Upload single file
router.post(
  '/',
  uploadSingleFile('file', ALLOWED_ALL_TYPES, MAX_FILE_SIZE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const file = validateUploadedFile(req.file);
      const organizationId = req.organizationId!;
      const userId = req.user!.userId;

      // Generate unique key with organization prefix
      const key = generateUniqueFilename(organizationId, file.originalname);

      // Upload to S3/Minio
      const uploadResult = await storageService.upload(
        file.buffer,
        key,
        file.mimetype
      );

      // Save file metadata to database
      const fileRecord = await prisma.file.create({
        data: {
          organizationId,
          uploadedBy: userId,
          key: uploadResult.key,
          filename: file.originalname,
          contentType: file.mimetype,
          size: file.size,
          metadata: {},
        },
      });

      res.status(201).json({
        message: 'File uploaded successfully',
        file: {
          id: fileRecord.id,
          key: fileRecord.key,
          filename: fileRecord.filename,
          contentType: fileRecord.contentType,
          size: fileRecord.size,
          url: uploadResult.url,
          createdAt: fileRecord.createdAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/uploads/multiple - Upload multiple files
router.post(
  '/multiple',
  uploadMultipleFiles('files', 10, ALLOWED_ALL_TYPES, MAX_FILE_SIZE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const files = validateUploadedFiles(req.files as Express.Multer.File[]);
      const organizationId = req.organizationId!;
      const userId = req.user!.userId;

      // Upload all files
      const uploadPromises = files.map(async (file) => {
        const key = generateUniqueFilename(organizationId, file.originalname);

        const uploadResult = await storageService.upload(
          file.buffer,
          key,
          file.mimetype
        );

        const fileRecord = await prisma.file.create({
          data: {
            organizationId,
            uploadedBy: userId,
            key: uploadResult.key,
            filename: file.originalname,
            contentType: file.mimetype,
            size: file.size,
            metadata: {},
          },
        });

        return {
          id: fileRecord.id,
          key: fileRecord.key,
          filename: fileRecord.filename,
          contentType: fileRecord.contentType,
          size: fileRecord.size,
          url: uploadResult.url,
          createdAt: fileRecord.createdAt,
        };
      });

      const uploadedFiles = await Promise.all(uploadPromises);

      res.status(201).json({
        message: `${uploadedFiles.length} file(s) uploaded successfully`,
        files: uploadedFiles,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/uploads/:key - Get signed download URL for a file
router.get('/:key(*)', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const key = req.params.key;
    const organizationId = req.organizationId!;

    // Verify file exists and belongs to organization
    const fileRecord = await prisma.file.findFirst({
      where: {
        key,
        organizationId,
      },
    });

    if (!fileRecord) {
      throw ApiError.notFound('File not found');
    }

    // Generate signed URL
    const expiresIn = parseInt(req.query.expiresIn as string) || 3600;
    const url = await storageService.getSignedUrl(key, expiresIn);

    res.json({
      key: fileRecord.key,
      filename: fileRecord.filename,
      contentType: fileRecord.contentType,
      size: fileRecord.size,
      url,
      expiresIn,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/uploads/:key - Delete a file
router.delete('/:key(*)', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const key = req.params.key;
    const organizationId = req.organizationId!;

    // Verify file exists and belongs to organization
    const fileRecord = await prisma.file.findFirst({
      where: {
        key,
        organizationId,
      },
    });

    if (!fileRecord) {
      throw ApiError.notFound('File not found');
    }

    // Delete from S3/Minio
    await storageService.delete(key);

    // Delete from database
    await prisma.file.delete({
      where: {
        id: fileRecord.id,
      },
    });

    res.json({
      message: 'File deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/uploads/presigned - Get presigned upload URL (for direct browser uploads)
router.post('/presigned', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = presignedUrlSchema.parse(req.body);
    const organizationId = req.organizationId!;

    // Generate unique key
    const key = generateUniqueFilename(organizationId, data.filename);

    // Generate presigned upload URL
    const url = await storageService.getSignedUploadUrl(
      key,
      data.contentType,
      data.expiresIn
    );

    res.json({
      key,
      url,
      expiresIn: data.expiresIn,
      method: 'PUT',
      headers: {
        'Content-Type': data.contentType,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(ApiError.badRequest(error.errors[0].message));
    } else {
      next(error);
    }
  }
});

// GET /api/uploads - List files for organization
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.organizationId!;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [files, total] = await Promise.all([
      prisma.file.findMany({
        where: {
          organizationId,
        },
        select: {
          id: true,
          key: true,
          filename: true,
          contentType: true,
          size: true,
          createdAt: true,
          uploadedBy: true,
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.file.count({
        where: {
          organizationId,
        },
      }),
    ]);

    res.json({
      files,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

export { router as uploadRouter };
