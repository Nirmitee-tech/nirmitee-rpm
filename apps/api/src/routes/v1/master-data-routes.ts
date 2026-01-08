import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth-middleware';
import {
  medicalConditionsService,
  insuranceProvidersService,
  providersService,
  externalProvidersService,
  medicationsService,
  proceduresService,
  facilitiesService,
  deviceModelsService,
} from '../../services/master-data-service';

const router = Router();

// All master data routes require authentication
router.use(authenticate);

// Validation schemas
const createConditionSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  category: z.string().max(50).optional(),
  icdCode: z.string().max(20).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

const updateConditionSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  category: z.string().max(50).optional(),
  icdCode: z.string().max(20).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

const createInsuranceSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(100),
  payerId: z.string().max(50).optional(),
  phone: z.string().max(20).optional(),
  website: z.string().url().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

const updateInsuranceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  payerId: z.string().max(50).optional(),
  phone: z.string().max(20).optional(),
  website: z.string().url().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

// Helper to get organizationId from authenticated request
const getOrgId = (req: Request): string => {
  // organizationId is added by auth middleware to req object
  return req.organizationId || '';
};

// ============================================
// Medical Conditions Routes
// ============================================

router.get('/conditions', async (req: Request, res: Response) => {
  try {
    const organizationId = getOrgId(req);
    const includeInactive = req.query.includeInactive === 'true';
    const conditions = await medicalConditionsService.list(organizationId, includeInactive);
    res.json(conditions);
  } catch (error) {
    console.error('Error fetching conditions:', error);
    res.status(500).json({ error: 'Failed to fetch conditions' });
  }
});

router.get('/conditions/:id', async (req: Request, res: Response) => {
  try {
    const organizationId = getOrgId(req);
    const condition = await medicalConditionsService.get(organizationId, req.params.id);
    if (!condition) {
      return res.status(404).json({ error: 'Condition not found' });
    }
    res.json(condition);
  } catch (error) {
    console.error('Error fetching condition:', error);
    res.status(500).json({ error: 'Failed to fetch condition' });
  }
});

router.post('/conditions', async (req: Request, res: Response) => {
  try {
    const organizationId = getOrgId(req);
    const data = createConditionSchema.parse(req.body);
    const condition = await medicalConditionsService.create(organizationId, data);
    res.status(201).json(condition);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error creating condition:', error);
    res.status(500).json({ error: 'Failed to create condition' });
  }
});

router.patch('/conditions/:id', async (req: Request, res: Response) => {
  try {
    const organizationId = getOrgId(req);
    const data = updateConditionSchema.parse(req.body);
    await medicalConditionsService.update(organizationId, req.params.id, data);
    res.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error updating condition:', error);
    res.status(500).json({ error: 'Failed to update condition' });
  }
});

router.delete('/conditions/:id', async (req: Request, res: Response) => {
  try {
    const organizationId = getOrgId(req);
    await medicalConditionsService.delete(organizationId, req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting condition:', error);
    res.status(500).json({ error: 'Failed to delete condition' });
  }
});

router.post('/conditions/seed', async (req: Request, res: Response) => {
  try {
    const organizationId = getOrgId(req);
    await medicalConditionsService.seedDefaults(organizationId);
    res.json({ success: true, message: 'Default conditions seeded' });
  } catch (error) {
    console.error('Error seeding conditions:', error);
    res.status(500).json({ error: 'Failed to seed conditions' });
  }
});

// ============================================
// Insurance Providers Routes
// ============================================

router.get('/insurance-providers', async (req: Request, res: Response) => {
  try {
    const organizationId = getOrgId(req);
    const includeInactive = req.query.includeInactive === 'true';
    const providers = await insuranceProvidersService.list(organizationId, includeInactive);
    res.json(providers);
  } catch (error) {
    console.error('Error fetching insurance providers:', error);
    res.status(500).json({ error: 'Failed to fetch insurance providers' });
  }
});

router.get('/insurance-providers/:id', async (req: Request, res: Response) => {
  try {
    const organizationId = getOrgId(req);
    const provider = await insuranceProvidersService.get(organizationId, req.params.id);
    if (!provider) {
      return res.status(404).json({ error: 'Insurance provider not found' });
    }
    res.json(provider);
  } catch (error) {
    console.error('Error fetching insurance provider:', error);
    res.status(500).json({ error: 'Failed to fetch insurance provider' });
  }
});

router.post('/insurance-providers', async (req: Request, res: Response) => {
  try {
    const organizationId = getOrgId(req);
    const data = createInsuranceSchema.parse(req.body);
    const provider = await insuranceProvidersService.create(organizationId, data);
    res.status(201).json(provider);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error creating insurance provider:', error);
    res.status(500).json({ error: 'Failed to create insurance provider' });
  }
});

router.patch('/insurance-providers/:id', async (req: Request, res: Response) => {
  try {
    const organizationId = getOrgId(req);
    const data = updateInsuranceSchema.parse(req.body);
    await insuranceProvidersService.update(organizationId, req.params.id, data);
    res.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error updating insurance provider:', error);
    res.status(500).json({ error: 'Failed to update insurance provider' });
  }
});

router.delete('/insurance-providers/:id', async (req: Request, res: Response) => {
  try {
    const organizationId = getOrgId(req);
    await insuranceProvidersService.delete(organizationId, req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting insurance provider:', error);
    res.status(500).json({ error: 'Failed to delete insurance provider' });
  }
});

router.post('/insurance-providers/seed', async (req: Request, res: Response) => {
  try {
    const organizationId = getOrgId(req);
    await insuranceProvidersService.seedDefaults(organizationId);
    res.json({ success: true, message: 'Default insurance providers seeded' });
  } catch (error) {
    console.error('Error seeding insurance providers:', error);
    res.status(500).json({ error: 'Failed to seed insurance providers' });
  }
});

// ============================================
// Care Providers Routes (from Users)
// ============================================

router.get('/providers/physicians', async (req: Request, res: Response) => {
  try {
    const organizationId = getOrgId(req);
    const physicians = await providersService.getPhysicians(organizationId);
    res.json(physicians);
  } catch (error) {
    console.error('Error fetching physicians:', error);
    res.status(500).json({ error: 'Failed to fetch physicians' });
  }
});

router.get('/providers/care-coordinators', async (req: Request, res: Response) => {
  try {
    const organizationId = getOrgId(req);
    const coordinators = await providersService.getCareCoordinators(organizationId);
    res.json(coordinators);
  } catch (error) {
    console.error('Error fetching care coordinators:', error);
    res.status(500).json({ error: 'Failed to fetch care coordinators' });
  }
});

// ============================================
// External Providers Routes
// ============================================

const createExternalProviderSchema = z.object({
  npiNumber: z.string().min(1).max(10),
  name: z.string().min(1).max(200),
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  credentials: z.string().max(50).optional(),
  specialty: z.string().max(100).optional(),
  taxonomyCode: z.string().max(20).optional(),
  practiceName: z.string().max(200).optional(),
  licenseNumber: z.string().max(50).optional(),
  licenseState: z.string().max(2).optional(),
  deaNumber: z.string().max(20).optional(),
  phone: z.string().max(20).optional(),
  fax: z.string().max(20).optional(),
  email: z.string().email().optional(),
  address: z.record(z.unknown()).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

router.get('/external-providers', async (req: Request, res: Response) => {
  try {
    const organizationId = getOrgId(req);
    const includeInactive = req.query.includeInactive === 'true';
    const providers = await externalProvidersService.list(organizationId, includeInactive);
    res.json(providers);
  } catch (error) {
    console.error('Error fetching external providers:', error);
    res.status(500).json({ error: 'Failed to fetch external providers' });
  }
});

router.post('/external-providers', async (req: Request, res: Response) => {
  try {
    const organizationId = getOrgId(req);
    const data = createExternalProviderSchema.parse(req.body);
    const provider = await externalProvidersService.create(organizationId, data);
    res.status(201).json(provider);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error creating external provider:', error);
    res.status(500).json({ error: 'Failed to create external provider' });
  }
});

router.delete('/external-providers/:id', async (req: Request, res: Response) => {
  try {
    const organizationId = getOrgId(req);
    await externalProvidersService.delete(organizationId, req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting external provider:', error);
    res.status(500).json({ error: 'Failed to delete external provider' });
  }
});

// ============================================
// Medications Routes
// ============================================

const createMedicationSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(200),
  genericName: z.string().max(200).optional(),
  brandNames: z.array(z.string()).optional(),
  dosageForm: z.string().max(50).optional(),
  strength: z.string().max(50).optional(),
  ndc: z.string().max(20).optional(),
  rxcui: z.string().max(20).optional(),
  category: z.string().max(50).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

router.get('/medications', async (req: Request, res: Response) => {
  try {
    const organizationId = getOrgId(req);
    const includeInactive = req.query.includeInactive === 'true';
    const medications = await medicationsService.list(organizationId, includeInactive);
    res.json(medications);
  } catch (error) {
    console.error('Error fetching medications:', error);
    res.status(500).json({ error: 'Failed to fetch medications' });
  }
});

router.post('/medications', async (req: Request, res: Response) => {
  try {
    const organizationId = getOrgId(req);
    const data = createMedicationSchema.parse(req.body);
    const medication = await medicationsService.create(organizationId, data);
    res.status(201).json(medication);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error creating medication:', error);
    res.status(500).json({ error: 'Failed to create medication' });
  }
});

router.delete('/medications/:id', async (req: Request, res: Response) => {
  try {
    const organizationId = getOrgId(req);
    await medicationsService.delete(organizationId, req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting medication:', error);
    res.status(500).json({ error: 'Failed to delete medication' });
  }
});

// ============================================
// Procedures Routes
// ============================================

const createProcedureSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(200),
  cptCode: z.string().max(10).optional(),
  hcpcsCode: z.string().max(10).optional(),
  description: z.string().max(500).optional(),
  category: z.string().max(50).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

router.get('/procedures', async (req: Request, res: Response) => {
  try {
    const organizationId = getOrgId(req);
    const includeInactive = req.query.includeInactive === 'true';
    const procedures = await proceduresService.list(organizationId, includeInactive);
    res.json(procedures);
  } catch (error) {
    console.error('Error fetching procedures:', error);
    res.status(500).json({ error: 'Failed to fetch procedures' });
  }
});

router.post('/procedures', async (req: Request, res: Response) => {
  try {
    const organizationId = getOrgId(req);
    const data = createProcedureSchema.parse(req.body);
    const procedure = await proceduresService.create(organizationId, data);
    res.status(201).json(procedure);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error creating procedure:', error);
    res.status(500).json({ error: 'Failed to create procedure' });
  }
});

router.delete('/procedures/:id', async (req: Request, res: Response) => {
  try {
    const organizationId = getOrgId(req);
    await proceduresService.delete(organizationId, req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting procedure:', error);
    res.status(500).json({ error: 'Failed to delete procedure' });
  }
});

router.post('/procedures/seed', async (req: Request, res: Response) => {
  try {
    const organizationId = getOrgId(req);
    await proceduresService.seedDefaults(organizationId);
    res.json({ success: true, message: 'Default procedures seeded' });
  } catch (error) {
    console.error('Error seeding procedures:', error);
    res.status(500).json({ error: 'Failed to seed procedures' });
  }
});

// ============================================
// Facilities Routes
// ============================================

const createFacilitySchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(200),
  type: z.string().max(50).optional(),
  npi: z.string().max(10).optional(),
  phone: z.string().max(20).optional(),
  fax: z.string().max(20).optional(),
  email: z.string().email().optional(),
  address: z.record(z.unknown()).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

router.get('/facilities', async (req: Request, res: Response) => {
  try {
    const organizationId = getOrgId(req);
    const includeInactive = req.query.includeInactive === 'true';
    const facilities = await facilitiesService.list(organizationId, includeInactive);
    res.json(facilities);
  } catch (error) {
    console.error('Error fetching facilities:', error);
    res.status(500).json({ error: 'Failed to fetch facilities' });
  }
});

router.post('/facilities', async (req: Request, res: Response) => {
  try {
    const organizationId = getOrgId(req);
    const data = createFacilitySchema.parse(req.body);
    const facility = await facilitiesService.create(organizationId, data);
    res.status(201).json(facility);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error creating facility:', error);
    res.status(500).json({ error: 'Failed to create facility' });
  }
});

router.delete('/facilities/:id', async (req: Request, res: Response) => {
  try {
    const organizationId = getOrgId(req);
    await facilitiesService.delete(organizationId, req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting facility:', error);
    res.status(500).json({ error: 'Failed to delete facility' });
  }
});

// ============================================
// Device Models Routes
// ============================================

const createDeviceModelSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(200),
  manufacturer: z.string().max(100).optional(),
  modelNumber: z.string().max(50).optional(),
  category: z.string().max(50).optional(),
  description: z.string().max(500).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

router.get('/device-models', async (req: Request, res: Response) => {
  try {
    const organizationId = getOrgId(req);
    const includeInactive = req.query.includeInactive === 'true';
    const devices = await deviceModelsService.list(organizationId, includeInactive);
    res.json(devices);
  } catch (error) {
    console.error('Error fetching device models:', error);
    res.status(500).json({ error: 'Failed to fetch device models' });
  }
});

router.post('/device-models', async (req: Request, res: Response) => {
  try {
    const organizationId = getOrgId(req);
    const data = createDeviceModelSchema.parse(req.body);
    const device = await deviceModelsService.create(organizationId, data);
    res.status(201).json(device);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error creating device model:', error);
    res.status(500).json({ error: 'Failed to create device model' });
  }
});

router.delete('/device-models/:id', async (req: Request, res: Response) => {
  try {
    const organizationId = getOrgId(req);
    await deviceModelsService.delete(organizationId, req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting device model:', error);
    res.status(500).json({ error: 'Failed to delete device model' });
  }
});

router.post('/device-models/seed', async (req: Request, res: Response) => {
  try {
    const organizationId = getOrgId(req);
    await deviceModelsService.seedDefaults(organizationId);
    res.json({ success: true, message: 'Default device models seeded' });
  } catch (error) {
    console.error('Error seeding device models:', error);
    res.status(500).json({ error: 'Failed to seed device models' });
  }
});

export default router;
