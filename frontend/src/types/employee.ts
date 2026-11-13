export interface Employee {
  id: number;
  employeeId: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  dateHired: string;
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEmployeePayload {
  employeeId: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  dateHired: string;
}

export interface UpdateEmployeePayload {
  expectedVersion: number;
  employeeId?: string;
  firstName?: string;
  middleName?: string | null;
  lastName?: string;
  dateHired?: string;
}

export interface PaginatedEmployeesResponse {
  items: Employee[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
