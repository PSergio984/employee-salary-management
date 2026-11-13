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

export interface SalarySummaryResponse {
  employeeId: number;
  hasBasicSalary: boolean;
  basicSalary: string | null;
  rates: {
    basic: SalaryRates | null;
    total: SalaryRates | null;
  };
  components: Array<unknown>;
}

export interface UpdateBasicSalaryPayload {
  amount: string;
  expectedCurrentId?: number | null;
  expectedVersion?: number;
}
