import type { ScheduleStatus } from './types';

/**
 * Schedule workflow (spec §32–§34), shared by the server and the board UI so
 * the buttons offered always match what the API will accept.
 *
 *   DRAFT → PENDING_REVIEW → APPROVED → PUBLISHED → CANCELLED
 *   (review and approval can be sent back to DRAFT; any state → ARCHIVED)
 */
export const ALLOWED_TRANSITIONS: Record<ScheduleStatus, readonly ScheduleStatus[]> = {
  DRAFT: ['PENDING_REVIEW', 'ARCHIVED'],
  PENDING_REVIEW: ['DRAFT', 'APPROVED', 'ARCHIVED'],
  APPROVED: ['DRAFT', 'PUBLISHED', 'ARCHIVED'],
  PUBLISHED: ['CANCELLED', 'ARCHIVED'],
  CANCELLED: ['ARCHIVED'],
  ARCHIVED: [],
};

/**
 * Statuses an admin may still edit (move or delete). A PUBLISHED class is
 * locked: students may already rely on it, so it must be CANCELLED instead.
 */
export const EDITABLE_STATUSES: readonly ScheduleStatus[] = ['DRAFT', 'PENDING_REVIEW', 'APPROVED'];

export const STATUS_LABEL: Record<ScheduleStatus, string> = {
  DRAFT: 'Draft',
  PENDING_REVIEW: 'Pending review',
  APPROVED: 'Approved',
  PUBLISHED: 'Published',
  CANCELLED: 'Cancelled',
  ARCHIVED: 'Archived',
};

/** Verb shown on the button that moves a class INTO this status. */
export const TRANSITION_VERB: Record<ScheduleStatus, string> = {
  DRAFT: 'Return to draft',
  PENDING_REVIEW: 'Submit for review',
  APPROVED: 'Approve',
  PUBLISHED: 'Publish',
  CANCELLED: 'Cancel class',
  ARCHIVED: 'Archive',
};
