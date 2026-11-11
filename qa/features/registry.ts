export type CoverageStatus = 'PASS' | 'UNCOVERED' | 'NOT_EXECUTED' | 'NOT_IMPLEMENTED' | 'BLOCKED';
export type Feature = { id: string; route: string; kind: 'page' | 'api'; method?: string; area: string; tags: string[]; profile: ('quick' | 'full')[]; status: CoverageStatus; implementation?: string };

// Discovery alone never constitutes behavioral coverage. Add entries only for executable checks.
export const features: Feature[] = [];
