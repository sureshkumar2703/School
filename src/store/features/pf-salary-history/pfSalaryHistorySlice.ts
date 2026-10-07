
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface UniqueStaff {
    staff_name: string;
    staff_code: string;
}

export interface PfSalaryDetail {
    id: string;
    payment_date: string;
    pf_salary: number;
}

export interface FetchPfHistoryPayload {
    organizationKey: string;
    staffCode: string;
}

interface PfSalaryHistoryState {
  uniqueStaff: UniqueStaff[];
  history: PfSalaryDetail[];
  loading: boolean;
  error: string | null;
}

const initialState: PfSalaryHistoryState = {
  uniqueStaff: [],
  history: [],
  loading: false,
  error: null,
};

const pfSalaryHistorySlice = createSlice({
  name: 'pfSalaryHistory',
  initialState,
  reducers: {
    // Fetch unique staff members
    fetchUniqueStaffRequest: (state, _action: PayloadAction<string>) => {
      state.loading = true;
      state.error = null;
    },
    fetchUniqueStaffSuccess: (state, action: PayloadAction<UniqueStaff[]>) => {
      state.loading = false;
      state.uniqueStaff = action.payload;
    },
    fetchUniqueStaffFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    // Fetch history for a specific staff
    fetchPfHistoryForStaffRequest: (state, _action: PayloadAction<FetchPfHistoryPayload>) => {
        state.loading = true;
        state.error = null;
        state.history = []; // Clear previous history
    },
    fetchPfHistoryForStaffSuccess: (state, action: PayloadAction<PfSalaryDetail[]>) => {
        state.loading = false;
        state.history = action.payload;
    },
    fetchPfHistoryForStaffFailure: (state, action: PayloadAction<string>) => {
        state.loading = false;
        state.error = action.payload;
    },
  },
});

export const {
  fetchUniqueStaffRequest,
  fetchUniqueStaffSuccess,
  fetchUniqueStaffFailure,
  fetchPfHistoryForStaffRequest,
  fetchPfHistoryForStaffSuccess,
  fetchPfHistoryForStaffFailure,
} = pfSalaryHistorySlice.actions;

export default pfSalaryHistorySlice.reducer;
