export interface Shift {
  id: string;
  employeeName?: string; // 用於過濾特定員工
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  breakMinutes: number;
  totalHours: number;
  notes?: string;
}

export interface MonthlyReport {
  month: string; // YYYY-MM
  totalHours: number;
  hourlyRate: number;
  totalPay: number;
  shifts: Shift[];
}

export enum AppState {
  SETUP = 'SETUP',
  DASHBOARD = 'DASHBOARD',
  PRINT_PREVIEW = 'PRINT_PREVIEW'
}

export interface GoogleSheetConfig {
  url: string;
  sheetName?: string;
}