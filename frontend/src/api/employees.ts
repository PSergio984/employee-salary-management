import { apiClient } from './client.js';
import {
  CreateEmployeePayload,
  Employee,
  PaginatedEmployeesResponse,
  UpdateEmployeePayload,
} from '../types/employee.js';

export interface GetEmployeesParams {
  search?: string;
  status?: 'active' | 'archived' | 'all';
  page?: number;
  pageSize?: number;
}

export async function getEmployeesApi(
  params: GetEmployeesParams = {},
): Promise<PaginatedEmployeesResponse> {
  const query = new URLSearchParams();
  if (params.search?.trim()) query.set('search', params.search.trim());
  if (params.status) query.set('status', params.status);
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));

  const url = `/api/employees${query.toString() ? `?${query.toString()}` : ''}`;
  return apiClient<PaginatedEmployeesResponse>(url, {
    method: 'GET',
  });
}

export async function getEmployeeByIdApi(id: number): Promise<Employee> {
  return apiClient<Employee>(`/api/employees/${id}`, {
    method: 'GET',
  });
}

export async function createEmployeeApi(
  payload: CreateEmployeePayload,
): Promise<Employee> {
  return apiClient<Employee>('/api/employees', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateEmployeeApi(
  id: number,
  payload: UpdateEmployeePayload,
): Promise<Employee> {
  return apiClient<Employee>(`/api/employees/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function archiveEmployeeApi(
  id: number,
  expectedVersion: number,
): Promise<Employee> {
  return apiClient<Employee>(`/api/employees/${id}/archive`, {
    method: 'POST',
    body: JSON.stringify({ expectedVersion }),
  });
}
