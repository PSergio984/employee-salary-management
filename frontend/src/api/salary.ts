import { apiClient } from './client.js';
import {
  BasicSalaryResponse,
  BasicSalaryHistoryResponse,
  EmployeeComponentRecord,
  SalarySummaryResponse,
  UpdateBasicSalaryPayload,
  AssignEmployeeComponentPayload,
  UpdateEmployeeComponentPayload,
  RemoveEmployeeComponentPayload,
} from '../types/salary.js';

export const salaryApi = {
  async getBasicSalary(employeeId: number): Promise<BasicSalaryResponse> {
    return apiClient<BasicSalaryResponse>(`/api/employees/${employeeId}/basic-salary`, {
      method: 'GET',
    });
  },

  async updateBasicSalary(
    employeeId: number,
    payload: UpdateBasicSalaryPayload,
  ): Promise<BasicSalaryResponse> {
    return apiClient<BasicSalaryResponse>(`/api/employees/${employeeId}/basic-salary`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async getBasicSalaryHistory(employeeId: number): Promise<BasicSalaryHistoryResponse> {
    return apiClient<BasicSalaryHistoryResponse>(`/api/employees/${employeeId}/basic-salary/history`, {
      method: 'GET',
    });
  },

  async getSalarySummary(employeeId: number): Promise<SalarySummaryResponse> {
    return apiClient<SalarySummaryResponse>(`/api/employees/${employeeId}/salary-summary`, {
      method: 'GET',
    });
  },

  // --- TICKET 05: EMPLOYEE COMPONENTS ---

  async getEmployeeComponents(employeeId: number): Promise<{ items: EmployeeComponentRecord[]; total: number }> {
    return apiClient<{ items: EmployeeComponentRecord[]; total: number }>(
      `/api/employees/${employeeId}/components`,
      { method: 'GET' },
    );
  },

  async assignEmployeeComponent(
    employeeId: number,
    payload: AssignEmployeeComponentPayload,
  ): Promise<{ item: EmployeeComponentRecord; employeeVersion: number }> {
    return apiClient<{ item: EmployeeComponentRecord; employeeVersion: number }>(
      `/api/employees/${employeeId}/components`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
  },

  async updateEmployeeComponent(
    employeeId: number,
    componentId: number,
    payload: UpdateEmployeeComponentPayload,
  ): Promise<{ item: EmployeeComponentRecord; employeeVersion: number }> {
    return apiClient<{ item: EmployeeComponentRecord; employeeVersion: number }>(
      `/api/employees/${employeeId}/components/${componentId}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      },
    );
  },

  async removeEmployeeComponent(
    employeeId: number,
    componentId: number,
    payload: RemoveEmployeeComponentPayload,
  ): Promise<{ success: boolean; employeeVersion: number }> {
    return apiClient<{ success: boolean; employeeVersion: number }>(
      `/api/employees/${employeeId}/components/${componentId}/remove`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
  },

  async getEmployeeComponentsHistory(
    employeeId: number,
  ): Promise<{ items: EmployeeComponentRecord[]; total: number }> {
    return apiClient<{ items: EmployeeComponentRecord[]; total: number }>(
      `/api/employees/${employeeId}/components/history`,
      { method: 'GET' },
    );
  },
};
