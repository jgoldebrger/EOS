import { z } from "zod";

export const LOAD_STATUSES = [
  "quote",
  "dispatched",
  "in_transit",
  "delivered",
  "cancelled",
] as const;

export const STOP_TYPES = ["pickup", "delivery"] as const;

export const STOP_STATUSES = ["pending", "arrived", "completed", "skipped"] as const;

export const ANALYSIS_TYPES = ["isochrone", "matrix"] as const;

export const ANALYSIS_STATUSES = ["pending", "running", "completed", "failed"] as const;

const orgContext = {
  organizationId: z.string().uuid(),
  orgSlug: z.string().trim().min(1),
};

export const createDepotSchema = z.object({
  ...orgContext,
  name: z.string().trim().min(1).max(120),
  address: z.string().trim().max(500).optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
});

export const createCarrierSchema = z.object({
  ...orgContext,
  name: z.string().trim().min(1).max(120),
  contactName: z.string().trim().max(120).optional(),
  contactEmail: z.string().trim().email().optional().or(z.literal("")),
  contactPhone: z.string().trim().max(40).optional(),
  mcNumber: z.string().trim().max(40).optional(),
  notes: z.string().trim().max(2000).optional(),
});

const stopInputSchema = z.object({
  stopType: z.enum(STOP_TYPES).default("delivery"),
  address: z.string().trim().min(1).max(500),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  contactName: z.string().trim().max(120).optional(),
  contactPhone: z.string().trim().max(40).optional(),
  serviceDurationMinutes: z.number().int().min(1).max(480).optional(),
});

export const createLoadSchema = z.object({
  ...orgContext,
  customerName: z.string().trim().min(1).max(200),
  customerPhone: z.string().trim().max(40).optional(),
  reference: z.string().trim().max(80).optional(),
  carrierId: z.string().uuid().nullable().optional(),
  driverId: z.string().uuid().nullable().optional(),
  depotId: z.string().uuid().nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
  scheduledDate: z.string().nullable().optional(),
  notes: z.string().trim().max(5000).optional(),
  stops: z.array(stopInputSchema).min(1).max(50),
});

export const updateLoadSchema = z.object({
  ...orgContext,
  loadId: z.string().uuid(),
  status: z.enum(LOAD_STATUSES).optional(),
  customerName: z.string().trim().min(1).max(200).optional(),
  customerPhone: z.string().trim().max(40).optional(),
  reference: z.string().trim().max(80).optional(),
  carrierId: z.string().uuid().nullable().optional(),
  driverId: z.string().uuid().nullable().optional(),
  depotId: z.string().uuid().nullable().optional(),
  scheduledDate: z.string().nullable().optional(),
  notes: z.string().trim().max(5000).optional(),
});

export const optimizeLoadRouteSchema = z.object({
  ...orgContext,
  loadId: z.string().uuid(),
});

export const createIsochroneAnalysisSchema = z.object({
  ...orgContext,
  depotId: z.string().uuid(),
  minutes: z.array(z.number().int().min(5).max(120)).min(1).max(5),
});

export const linkLoadEntitySchema = z.object({
  ...orgContext,
  loadId: z.string().uuid(),
  entityId: z.string().uuid(),
});

export const reorderStopsSchema = z.object({
  ...orgContext,
  loadId: z.string().uuid(),
  stopIds: z.array(z.string().uuid()).min(1),
});

export const updateStopStatusSchema = z.object({
  ...orgContext,
  loadId: z.string().uuid(),
  stopId: z.string().uuid(),
  status: z.enum(STOP_STATUSES),
});
