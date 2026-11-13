import { apiClient } from './client.js';
import {
  SalaryComponent,
  PaginatedSalaryComponents,
  CreateSalaryComponentInput,
  UpdateSalaryComponentInput,
  ListSalaryComponentsQuery,
  ComponentArchiveImpact,
  ArchiveSalaryComponentPayload,
  ArchiveSalaryComponentResponse,
} from '../types/salary-component.js';

export async function fetchSalaryComponents(
  query: ListSalaryComponentsQuery = {},
): Promise<PaginatedSalaryComponents> {
  const params = new URLSearchParams();
  if (query.search && query.search.trim()) {
    params.set('search', query.search.trim());
  }
  if (query.status) {
    params.set('status', query.status);
  }
  if (query.page) {
    params.set('page', query.page.toString());
  }
  if (query.pageSize) {
    params.set('pageSize', query.pageSize.toString());
  }

  const queryString = params.toString();
  const endpoint = `/api/salary-components${queryString ? `?${queryString}` : ''}`;
  return apiClient<PaginatedSalaryComponents>(endpoint, { method: 'GET' });
}

export async function fetchSalaryComponentById(id: number): Promise<SalaryComponent> {
  return apiClient<SalaryComponent>(`/api/salary-components/${id}`, {
    method: 'GET',
  });
}

export async function createSalaryComponent(
  data: CreateSalaryComponentInput,
): Promise<SalaryComponent> {
  return apiClient<SalaryComponent>('/api/salary-components', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateSalaryComponent(
  id: number,
  data: UpdateSalaryComponentInput,
): Promise<SalaryComponent> {
  return apiClient<SalaryComponent>(`/api/salary-components/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function fetchComponentArchiveImpact(
  id: number,
): Promise<ComponentArchiveImpact> {
  return apiClient<ComponentArchiveImpact>(
    `/api/salary-components/${id}/archive-impact`,
    { method: 'GET' },
  );
}

export async function archiveSalaryComponent(
  id: number,
  data: ArchiveSalaryComponentPayload,
): Promise<ArchiveSalaryComponentResponse> {
  return apiClient<ArchiveSalaryComponentResponse>(
    `/api/salary-components/${id}/archive`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
  );
}
