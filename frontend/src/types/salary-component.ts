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
