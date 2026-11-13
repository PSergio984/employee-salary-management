import { apiClient } from './client.js';
import {
  BasicSalaryResponse,
  BasicSalaryHistoryResponse,
  SalarySummaryResponse,
  UpdateBasicSalaryPayload,
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
};
