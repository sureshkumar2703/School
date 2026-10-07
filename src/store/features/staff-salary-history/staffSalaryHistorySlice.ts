

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { StaffSalaryDetail } from '../staff-salary/staffSalarySlice';

export type { StaffSalaryDetail };

interface StaffSalaryHistoryState {
  history: StaffSalaryDetail[];
  loading: boolean;
  error: string | null;
}

const initialState: StaffSalaryHistoryState = {
  history: [],
  loading: false,
  error: null,
};

const staffSalaryHistorySlice = createSlice({
  name: 'staffSalaryHistory',
  initialState,
  reducers: {
    fetchAllSalaryHistoryRequest: (state, _action: PayloadAction<string>) => {
      state.loading = true;
      state.error = null;
    },
    fetchAllSalaryHistorySuccess: (state, action: PayloadAction<StaffSalaryDetail[]>) => {
      state.loading = false;
      state.history = action.payload;
    },
    fetchAllSalaryHistoryFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
  },
});

export const {
  fetchAllSalaryHistoryRequest,
  fetchAllSalaryHistorySuccess,
  fetchAllSalaryHistoryFailure,
} = staffSalaryHistorySlice.actions;

export default staffSalaryHistorySlice.reducer;

