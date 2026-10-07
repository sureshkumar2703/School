
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

// Re-using the same interface from the other slice
export interface StudentFee {
    id: string;
    organization_key: string;
    student_id: string;
    academic_year: string;
    class_name: string;
    section_name: string;
    register_no?: string;
    roll_no?: string;
    student_name?: string;
    total_fees: number;
    paid_amount: number;
    balance_amount: number;
    status: 'Paid' | 'Unpaid' | 'Partially Paid';
    created_at?: string;
}

interface FeesCompleteHistoryState {
  completeFees: StudentFee[];
  loading: boolean;
  error: string | null;
}

const initialState: FeesCompleteHistoryState = {
  completeFees: [],
  loading: false,
  error: null,
};

const feesCompleteHistorySlice = createSlice({
  name: 'feesCompleteHistory',
  initialState,
  reducers: {
    fetchFeesCompleteHistoryRequest: (state, _action: PayloadAction<string>) => {
        state.loading = true;
        state.error = null;
    },
    fetchFeesCompleteHistorySuccess: (state, action: PayloadAction<StudentFee[]>) => {
        state.loading = false;
        state.completeFees = action.payload;
    },
    fetchFeesCompleteHistoryFailure: (state, action: PayloadAction<string>) => {
        state.loading = false;
        state.error = action.payload;
    },
  },
});

export const { 
    fetchFeesCompleteHistoryRequest,
    fetchFeesCompleteHistorySuccess,
    fetchFeesCompleteHistoryFailure,
} = feesCompleteHistorySlice.actions;

export default feesCompleteHistorySlice.reducer;
