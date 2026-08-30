/**
 * Institutional facts for the TRAC BSIT Class Schedule Management System.
 *
 * Each fact is sourced from an authoritative external source where possible,
 * and otherwise carries a PENDING_VERIFICATION status. Per spec §76, the
 * system must never present information as authoritative when the source
 * cannot be identified.
 *
 * Source registry IDs follow spec §75 conventions (e.g. SRC-BP384, SRC-TRAC-WEB).
 */

export type EvidenceStatus =
  | 'VERIFIED'
  | 'OFFICIAL'
  | 'GOVERNMENT_SUPPORTED'
  | 'CORROBORATED'
  | 'PENDING_VERIFICATION'
  | 'UNVERIFIED'
  | 'CONFLICTING'
  | 'DEPRECATED';

export type AuthorityLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface EvidenceSource {
  id: string;
  title: string;
  sourceType: 'LAW' | 'OFFICIAL_WEBSITE' | 'GOVERNMENT' | 'ACADEMIC_RECORD' | 'SECONDARY' | 'SOCIAL';
  authorityLevel: AuthorityLevel;
  publisher: string;
  url?: string;
  documentDate?: string;
  accessedAt: string;
  status: 'ACTIVE' | 'DEPRECATED';
  notes?: string;
}

export interface InstitutionalFact {
  id: string;
  category: string;
  key: string;
  value: string;
  valueType: 'string' | 'date' | 'enum' | 'list';
  status: EvidenceStatus;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNVERIFIED';
  sourceId: string;
  effectiveFrom?: string;
  verifiedAt: string;
  reviewDueAt?: string;
  notes?: string;
}

/**
 * Source registry — initial baseline per spec §75.
 * Each entry identifies where the institutional facts are derived from.
 */
export const EVIDENCE_SOURCES: readonly EvidenceSource[] = [
  {
    id: 'SRC-BP384',
    title: 'Batas Pambansa Blg. 384',
    sourceType: 'LAW',
    authorityLevel: 1,
    publisher: 'Supreme Court E-Library (cited by TRAC official website)',
    documentDate: '1983-04-08',
    accessedAt: '2026-08-31',
    status: 'ACTIVE',
    notes: 'Converts SNRAS into Tawi-Tawi Regional Agricultural College.',
  },
  {
    id: 'SRC-TRAC-WEB',
    title: 'Tawi-Tawi Regional Agricultural College Official Website',
    sourceType: 'OFFICIAL_WEBSITE',
    authorityLevel: 2,
    publisher: 'TRAC',
    url: 'https://trac.edu.ph/',
    accessedAt: '2026-08-31',
    status: 'ACTIVE',
    notes: 'Primary source for current institutional, program, and contact information.',
  },
] as const;

/**
 * Initial baseline institutional facts per spec §61.
 *
 * Each fact carries:
 *   - the source registry ID it is derived from,
 *   - its current verification status,
 *   - the date the verification was performed,
 *   - when the fact is due for review.
 */
export const INSTITUTIONAL_FACTS: readonly InstitutionalFact[] = [
  {
    id: 'FACT-LEGAL-NAME',
    category: 'institution',
    key: 'legal_name',
    value: 'Tawi-Tawi Regional Agricultural College',
    valueType: 'string',
    status: 'VERIFIED',
    confidence: 'HIGH',
    sourceId: 'SRC-BP384',
    effectiveFrom: '1983-04-08',
    verifiedAt: '2026-08-31',
    reviewDueAt: '2027-08-31',
    notes: 'Established by Batas Pambansa Blg. 384. Confirmed by TRAC official website.',
  },
  {
    id: 'FACT-LEGAL-FOUNDATION',
    category: 'institution',
    key: 'legal_foundation',
    value: 'Batas Pambansa Blg. 384',
    valueType: 'string',
    status: 'VERIFIED',
    confidence: 'HIGH',
    sourceId: 'SRC-BP384',
    effectiveFrom: '1983-04-08',
    verifiedAt: '2026-08-31',
    reviewDueAt: '2027-08-31',
  },
  {
    id: 'FACT-ESTABLISHMENT-YEAR',
    category: 'institution',
    key: 'established_year',
    value: '1983',
    valueType: 'string',
    status: 'VERIFIED',
    confidence: 'HIGH',
    sourceId: 'SRC-BP384',
    effectiveFrom: '1983-04-08',
    verifiedAt: '2026-08-31',
    reviewDueAt: '2027-08-31',
  },
  {
    id: 'FACT-LOCATION',
    category: 'institution',
    key: 'canonical_location',
    value: 'Nalil, Bongao, Tawi-Tawi, Philippines',
    valueType: 'string',
    status: 'VERIFIED',
    confidence: 'HIGH',
    sourceId: 'SRC-TRAC-WEB',
    verifiedAt: '2026-08-31',
    reviewDueAt: '2027-08-31',
    notes: 'TRAC official website: "finally transferred to its present site in Barangay, Nalil, Bongao, Tawi-Tawi in June 1979".',
  },
  {
    id: 'FACT-CURRENT-PROGRAMS',
    category: 'programs',
    key: 'bsit_currently_offered',
    value: 'Bachelor of Science in Information Technology',
    valueType: 'string',
    status: 'OFFICIAL',
    confidence: 'HIGH',
    sourceId: 'SRC-TRAC-WEB',
    effectiveFrom: '2018-06-01',
    verifiedAt: '2026-08-31',
    reviewDueAt: '2027-08-31',
    notes: 'Effective first semester, SY 2018-2019 per TRAC official website.',
  },
  {
    id: 'FACT-CURRENT-PROGRAMS-BSIS',
    category: 'programs',
    key: 'bsis_currently_offered',
    value: 'Bachelor of Science in Information System',
    valueType: 'string',
    status: 'OFFICIAL',
    confidence: 'HIGH',
    sourceId: 'SRC-TRAC-WEB',
    effectiveFrom: '2018-06-01',
    verifiedAt: '2026-08-31',
    reviewDueAt: '2027-08-31',
    notes: 'Listed as a separate program from BSIT on the TRAC official website.',
  },
  {
    id: 'FACT-INSTITUTE',
    category: 'organization',
    key: 'institute',
    value: 'Institute of Computing Studies',
    valueType: 'string',
    status: 'OFFICIAL',
    confidence: 'HIGH',
    sourceId: 'SRC-TRAC-WEB',
    verifiedAt: '2026-08-31',
    reviewDueAt: '2027-08-31',
    notes: 'TRAC official website identifies Institute of Computing Studies with a dean.',
  },
  {
    id: 'FACT-CONTACT-OP',
    category: 'contact',
    key: 'office_of_president_email',
    value: 'op@trac.edu.ph',
    valueType: 'string',
    status: 'OFFICIAL',
    confidence: 'HIGH',
    sourceId: 'SRC-TRAC-WEB',
    verifiedAt: '2026-08-31',
    reviewDueAt: '2026-11-30', // quarterly per §41
  },
  {
    id: 'FACT-CONTACT-REGISTRAR',
    category: 'contact',
    key: 'office_of_registrar_email',
    value: 'registrar@trac.edu.ph',
    valueType: 'string',
    status: 'OFFICIAL',
    confidence: 'HIGH',
    sourceId: 'SRC-TRAC-WEB',
    verifiedAt: '2026-08-31',
    reviewDueAt: '2026-11-30',
  },
  {
    id: 'FACT-CONTACT-ADMISSION',
    category: 'contact',
    key: 'office_of_admission_email',
    value: 'admission@trac.edu.ph',
    valueType: 'string',
    status: 'OFFICIAL',
    confidence: 'HIGH',
    sourceId: 'SRC-TRAC-WEB',
    verifiedAt: '2026-08-31',
    reviewDueAt: '2026-11-30',
  },
  {
    id: 'FACT-CONTACT-ADMISSION-MOBILE',
    category: 'contact',
    key: 'office_of_admission_mobile',
    value: '0951-733-7474',
    valueType: 'string',
    status: 'OFFICIAL',
    confidence: 'HIGH',
    sourceId: 'SRC-TRAC-WEB',
    verifiedAt: '2026-08-31',
    reviewDueAt: '2026-11-30',
  },
  {
    id: 'FACT-MISSION',
    category: 'identity',
    key: 'mission_current',
    value:
      'Provide professional, technical and special training and promote research, extension services and progressive leadership in agriculture, home technology, allied disciplines and technology education.',
    valueType: 'string',
    status: 'OFFICIAL',
    confidence: 'HIGH',
    sourceId: 'SRC-TRAC-WEB',
    verifiedAt: '2026-08-31',
    reviewDueAt: '2027-08-31',
    notes: 'Statutory formulation as cited on TRAC official website. Spec §8 distinguishes this from the website current formulation.',
  },
  {
    id: 'FACT-VISION',
    category: 'identity',
    key: 'vision_current',
    value:
      'The college is envisioned to become the center of excellence in the field of agriculture and allied disciplines in the Autonomous Region in Muslim Mindanao or in a Bangsa Moro Community.',
    valueType: 'string',
    status: 'OFFICIAL',
    confidence: 'HIGH',
    sourceId: 'SRC-TRAC-WEB',
    verifiedAt: '2026-08-31',
    reviewDueAt: '2027-08-31',
    notes: 'ARMM/Bangsamoro wording preserved per spec §7 (do not modernize).',
  },
  {
    id: 'FACT-MANDATE',
    category: 'identity',
    key: 'four_fold_thrust',
    value: 'Instruction, Research, Extension Service, Production',
    valueType: 'list',
    status: 'OFFICIAL',
    confidence: 'HIGH',
    sourceId: 'SRC-TRAC-WEB',
    verifiedAt: '2026-08-31',
    reviewDueAt: '2027-08-31',
    notes: 'Emphasis on agriculture, allied disciplines, and technology education.',
  },
  // Per spec §42: core values must NOT be invented. Initial status PENDING_VERIFICATION.
  {
    id: 'FACT-CORE-VALUES',
    category: 'identity',
    key: 'core_values',
    value: 'PENDING_VERIFICATION',
    valueType: 'enum',
    status: 'PENDING_VERIFICATION',
    confidence: 'UNVERIFIED',
    sourceId: 'SRC-TRAC-WEB',
    verifiedAt: '2026-08-31',
    reviewDueAt: '2026-11-30',
    notes: 'No authoritative TRAC source currently identified for core values. Will be sourced from Faculty Manual / official handbook per spec §42.',
  },
] as const;

/**
 * Items that explicitly require additional verification before public display,
 * per spec §62. These MUST NOT appear as authoritative institutional claims.
 */
export const PENDING_VERIFICATION_ITEMS = [
  'Current BSIT curriculum',
  'Exact BSIT subject codes',
  'Current BSIT faculty roster',
  'Faculty teaching loads',
  'Current classroom inventory',
  'Current room capacities',
  'Current academic calendar',
  'Current section list',
  'Current enrollment numbers',
  'Current tuition/fees',
  'Current BSIT admission requirements',
  'Official social-media accounts',
  'Current organizational chart',
  'Current department head',
  'Current policies',
  'Current class schedules',
] as const;

/**
 * Look up an evidence source by its registry ID.
 */
export function getSource(id: string): EvidenceSource | undefined {
  return EVIDENCE_SOURCES.find((s) => s.id === id);
}

/**
 * Look up an institutional fact by its fact ID.
 */
export function getFact(id: string): InstitutionalFact | undefined {
  return INSTITUTIONAL_FACTS.find((f) => f.id === id);
}

/**
 * Aggregate count of facts by verification status, per spec §66 dashboard.
 */
export function countByStatus(): Record<EvidenceStatus, number> {
  const counts: Record<EvidenceStatus, number> = {
    VERIFIED: 0,
    OFFICIAL: 0,
    GOVERNMENT_SUPPORTED: 0,
    CORROBORATED: 0,
    PENDING_VERIFICATION: 0,
    UNVERIFIED: 0,
    CONFLICTING: 0,
    DEPRECATED: 0,
  };
  for (const f of INSTITUTIONAL_FACTS) {
    counts[f.status] += 1;
  }
  return counts;
}

/**
 * Aggregate count of sources by authority level, per spec §66.
 */
export function countSourcesByAuthority(): Record<AuthorityLevel, number> {
  const counts: Record<AuthorityLevel, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  for (const s of EVIDENCE_SOURCES) {
    counts[s.authorityLevel] += 1;
  }
  return counts;
}