
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface StaffSalaryDetail {
  id?: string;
  organization_key: string;
  staff_name: string;
  staff_code: string;
  phone: string;
  total_salary: number;
  payment: number;
  balance: number;
  pf_salary?: number;
  payment_date: string;
  status: 'Pending' | 'Complete';
  created_by_name?: string;
  created_by_phone?: string;
}

export interface FetchSalaryHistoryPayload {
    organizationKey: string;
    staffCode: string;
}

export interface SalaryHistoryRecord {
    payment: number;
}

interface StaffSalaryState {
  history: SalaryHistoryRecord[];
  monthlyPayments: { staff_code: string; payment: number }[];
  loading: boolean;
  error: string | null;
}

const initialState: StaffSalaryState = {
  history: [],
  monthlyPayments: [],
  loading: false,
  error: null,
};

const staffSalarySlice = createSlice({
  name: 'staffSalary',
  initialState,
  reducers: {
    saveSalaryDetailRequest: (state, _action: PayloadAction<StaffSalaryDetail>) => {
      state.loading = true;
      state.error = null;
    },
    saveSalaryDetailSuccess: (state) => {
      state.loading = false;
    },
    saveSalaryDetailFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    fetchSalaryHistoryRequest: (state, _action: PayloadAction<FetchSalaryHistoryPayload>) => {
        state.loading = true;
        state.error = null;
    },
    fetchSalaryHistorySuccess: (state, action: PayloadAction<SalaryHistoryRecord[]>) => {
        state.loading = false;
        state.history = action.payload;
    },
    fetchSalaryHistoryFailure: (state, action: PayloadAction<string>) => {
        state.loading = false;
        state.error = action.payload;
    },
    fetchMonthSalaryDetailsRequest: (state, _action: PayloadAction<string>) => {
        state.loading = true;
        state.error = null;
    },
    fetchMonthSalaryDetailsSuccess: (state, action: PayloadAction<{ staff_code: string; payment: number }[]>) => {
        state.loading = false;
        state.monthlyPayments = action.payload;
    },
    fetchMonthSalaryDetailsFailure: (state, action: PayloadAction<string>) => {
        state.loading = false;
        state.error = action.payload;
    },
  },
});

export const {
  saveSalaryDetailRequest,
  saveSalaryDetailSuccess,
  saveSalaryDetailFailure,
  fetchSalaryHistoryRequest,
  fetchSalaryHistorySuccess,
  fetchSalaryHistoryFailure,
  fetchMonthSalaryDetailsRequest,
  fetchMonthSalaryDetailsSuccess,
  fetchMonthSalaryDetailsFailure,
} = staffSalarySlice.actions;

export default staffSalarySlice.reducer;
