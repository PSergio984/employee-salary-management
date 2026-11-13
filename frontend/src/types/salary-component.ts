export interface SalaryComponent {
  id: number;
  name: string;
  nameKey: string;
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedSalaryComponents {
  items: SalaryComponent[];
  page: number;
  pageSize: number;
  total: number;
}

export interface CreateSalaryComponentInput {
  name: string;
}

export interface UpdateSalaryComponentInput {
  name: string;
  expectedVersion: number;
}

export interface ListSalaryComponentsQuery {
  search?: string;
  status?: 'active' | 'archived' | 'all';
  page?: number;
  pageSize?: number;
}

export interface ComponentArchiveImpact {
  id: number;
  name: string;
  version: number;
  isActive: boolean;
  affectedEmployeeCount: number;
}

export interface ArchiveSalaryComponentPayload {
  expectedVersion: number;
  expectedAffectedCount: number;
}

export interface ArchiveSalaryComponentResponse {
  id: number;
  name: string;
  isActive: boolean;
  version: number;
  deactivatedAssignmentsCount: number;
}
