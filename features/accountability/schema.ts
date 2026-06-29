import { z } from "zod";

const seatBaseFields = {
  organizationId: z.string().uuid("Invalid organization"),
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(200, "Title must be at most 200 characters"),
  parentId: z.string().uuid("Invalid parent seat").nullable().optional(),
  responsibilities: z.string().trim().max(2000).nullable().optional(),
  displayOrder: z.number().int().min(0).optional(),
};

export const createSeatSchema = z.object({
  ...seatBaseFields,
});

export const updateSeatSchema = z
  .object({
    seatId: z.string().uuid("Invalid seat"),
    organizationId: z.string().uuid("Invalid organization"),
    title: seatBaseFields.title.optional(),
    parentId: seatBaseFields.parentId,
    responsibilities: seatBaseFields.responsibilities,
    displayOrder: seatBaseFields.displayOrder,
  })
  .refine(
    (data) =>
      data.title !== undefined ||
      data.parentId !== undefined ||
      data.responsibilities !== undefined ||
      data.displayOrder !== undefined,
    { message: "At least one field must be updated" },
  );

export const assignUserSchema = z.object({
  organizationId: z.string().uuid("Invalid organization"),
  seatId: z.string().uuid("Invalid seat"),
  userId: z.string().uuid("Invalid user").nullable(),
});

export const deleteSeatSchema = z.object({
  organizationId: z.string().uuid("Invalid organization"),
  seatId: z.string().uuid("Invalid seat"),
});

export const reorderSeatsSchema = z.object({
  organizationId: z.string().uuid("Invalid organization"),
  orders: z
    .array(
      z.object({
        seatId: z.string().uuid("Invalid seat"),
        displayOrder: z.number().int().min(0),
      }),
    )
    .min(1, "At least one seat order is required"),
});

export type CreateSeatInput = z.infer<typeof createSeatSchema>;
export type UpdateSeatInput = z.infer<typeof updateSeatSchema>;
export type AssignUserInput = z.infer<typeof assignUserSchema>;
export type DeleteSeatInput = z.infer<typeof deleteSeatSchema>;
export type ReorderSeatsInput = z.infer<typeof reorderSeatsSchema>;
