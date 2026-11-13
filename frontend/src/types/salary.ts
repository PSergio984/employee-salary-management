export interface SalaryRates {
  monthly: string;
  annual: string;
  daily: string;
  hourly: string;
  minute: string;
}

export interface BasicSalaryRecord {
  id: number;
  employeeId: number;
  amount: string;
  isActive: boolean;
  recordedAt: string;
  endedAt: string | null;
}

export interface BasicSalaryResponse {
  current: BasicSalaryRecord | null;
  employeeVersion: number;
}

export interface BasicSalaryHistoryResponse {
  items: BasicSalaryRecord[];
  total: number;
}

export interface EmployeeComponentRecord {
  id: number;
  employeeId: number;
  componentId: number;
  name: string;
  amount: string;
  isActive: boolean;
  recordedAt: string;
  endedAt: string | null;
}

export interface SalarySummaryComponentItem {
  id: number;
  componentId: number;
  name: string;
  amount: string;
  recordedAt?: string;
  isActive?: boolean;
}

export interface SalarySummaryResponse {
  employeeId: number;
  hasBasicSalary: boolean;
  basicSalary: string | null;
  rates: {
    basic: SalaryRates | null;
    total: SalaryRates | null;
  };
  components: SalarySummaryComponentItem[];
  totalMonthlyCompensation: string | null;
}

export interface UpdateBasicSalaryPayload {
  amount: string;
  expectedCurrentId: number | null;
  expectedVersion: number;
}

export interface AssignEmployeeComponentPayload {
  componentId: number;
  amount: string;
  expectedVersion: number;
}

export interface UpdateEmployeeComponentPayload {
  amount: string;
  expectedCurrentId: number;
  expectedVersion: number;
}

export interface RemoveEmployeeComponentPayload {
  expectedCurrentId: number;
  expectedVersion: number;
}
