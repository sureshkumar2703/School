
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

interface FeesPendingHistoryState {
  pendingFees: StudentFee[];
  loading: boolean;
  error: string | null;
}

const initialState: FeesPendingHistoryState = {
  pendingFees: [],
  loading: false,
  error: null,
};

const feesPendingHistorySlice = createSlice({
  name: 'feesPendingHistory',
  initialState,
  reducers: {
    fetchFeesPendingHistoryRequest: (state, _action: PayloadAction<string>) => {
        state.loading = true;
        state.error = null;
    },
    fetchFeesPendingHistorySuccess: (state, action: PayloadAction<StudentFee[]>) => {
        state.loading = false;
        state.pendingFees = action.payload;
    },
    fetchFeesPendingHistoryFailure: (state, action: PayloadAction<string>) => {
        state.loading = false;
        state.error = action.payload;
    },
  },
});

export const { 
    fetchFeesPendingHistoryRequest,
    fetchFeesPendingHistorySuccess,
    fetchFeesPendingHistoryFailure,
} = feesPendingHistorySlice.actions;

export default feesPendingHistorySlice.reducer;
