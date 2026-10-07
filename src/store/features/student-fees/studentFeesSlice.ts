
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

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

interface StudentFeesState {
  loading: boolean;
  error: string | null;
}

const initialState: StudentFeesState = {
  loading: false,
  error: null,
};

const studentFeesSlice = createSlice({
  name: 'studentFees',
  initialState,
  reducers: {
    saveStudentFeesRequest: (state, _action: PayloadAction<Omit<StudentFee, 'id' | 'balance_amount'>[]>) => {
      state.loading = true;
      state.error = null;
    },
    saveStudentFeesSuccess: (state) => {
      state.loading = false;
    },
    saveStudentFeesFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
  },
});

export const {
  saveStudentFeesRequest,
  saveStudentFeesSuccess,
  saveStudentFeesFailure,
} = studentFeesSlice.actions;

export default studentFeesSlice.reducer;
