/**
 * Request-body schemas for the auth and parent routes, one per wire type in
 * lib/tutor/wire.ts. Unknown keys are dropped; every schema's output type is
 * the wire request type, checked by the routes' type annotations.
 */
import { z } from 'zod';

import { PASSWORD_MIN_LENGTH } from '@/lib/tutor/auth/password';

const idField = z.string().trim().min(1).max(64);
const versionField = z.string().trim().min(1).max(64);
const emailField = z
  .string()
  .max(254)
  .transform((value) => value.trim().toLowerCase())
  .pipe(z.email('Enter a valid email address.'));
const passwordField = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Passwords must be at least ${PASSWORD_MIN_LENGTH} characters.`)
  .max(200);
const displayNameField = z.string().trim().min(1).max(60);
const birthYearField = z
  .number()
  .int()
  .min(1900)
  .refine((year) => year <= new Date().getUTCFullYear(), 'Birth year cannot be in the future.');

export const signUpSchema = z.object({
  email: emailField,
  password: passwordField,
  displayName: displayNameField,
  kind: z.enum(['parent', 'adult']),
  birthYear: birthYearField.optional(),
});

export const signInSchema = z.object({
  email: z.string().max(254),
  password: z.string().max(200),
});

export const selectLearnerSchema = z.object({ learnerId: idField });

export const teenSignInSchema = z.object({
  loginName: z.string().max(64),
  password: z.string().max(200),
});

export const requestPasswordResetSchema = z.object({ email: emailField });

export const teenInviteSchema = z.object({
  displayName: displayNameField,
  birthYear: birthYearField,
  loginName: z.string().max(64),
  password: passwordField,
  parentEmail: emailField,
});

export const acceptParentInviteSchema = z.object({
  token: z.string().trim().min(20).max(200),
  displayName: displayNameField.optional(),
  password: passwordField.optional(),
  loginName: z.string().max(64).optional(),
});

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(20).max(200),
  password: passwordField,
});

export const createLearnerSchema = z.object({
  displayName: displayNameField,
  birthYear: birthYearField,
  loginName: z.string().max(64).optional(),
  password: z.string().max(200).optional(),
});

export const updateLearnerSchema = z.object({
  learnerId: idField,
  displayName: displayNameField.optional(),
  loginName: z.string().max(64).optional(),
  password: z.string().max(200).optional(),
});

export const deleteLearnerSchema = z.object({ learnerId: idField });

export const createConsentSchema = z.object({
  learnerId: idField,
  camera: z.boolean(),
  noticeVersion: versionField,
  policyVersion: versionField,
  method: z.enum(['checkbox', 'checkbox_card']),
});

export const revokeConsentSchema = z.object({ learnerId: idField });

export const updateSettingsSchema = z
  .object({
    cameraSensing: z.boolean(),
    recoveryStepsDisabled: z.array(z.number().int().min(1).max(6)).max(6),
    weeklyEmail: z.boolean(),
  })
  .partial();

export const dataDeleteSchema = z.object({ learnerId: idField.nullable() });
