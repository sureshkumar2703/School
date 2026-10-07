
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

export interface FetchStudentFeesPayload {
    organizationKey: string;
    academicYear: string;
}

interface StudentFeesPayState {
  fees: StudentFee[];
  loading: boolean;
  error: string | null;
}

const initialState: StudentFeesPayState = {
  fees: [],
  loading: false,
  error: null,
};

const studentFeesPaySlice = createSlice({
  name: 'studentFeesPay',
  initialState,
  reducers: {
    fetchStudentFeesRequest: (state, _action: PayloadAction<FetchStudentFeesPayload>) => {
        state.loading = true;
        state.error = null;
    },
    fetchStudentFeesSuccess: (state, action: PayloadAction<StudentFee[]>) => {
        state.loading = false;
        state.fees = action.payload;
    },
    fetchStudentFeesFailure: (state, action: PayloadAction<string>) => {
        state.loading = false;
        state.error = action.payload;
    },
    fetchAllStudentFeesRequest: (state, _action: PayloadAction<string>) => {
      state.loading = true;
      state.error = null;
    },
    fetchAllStudentFeesSuccess: (state, action: PayloadAction<StudentFee[]>) => {
      state.loading = false;
      state.fees = action.payload;
    },
    fetchAllStudentFeesFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
  },
});

export const { 
    fetchStudentFeesRequest,
    fetchStudentFeesSuccess,
    fetchStudentFeesFailure,
    fetchAllStudentFeesRequest,
    fetchAllStudentFeesSuccess,
    fetchAllStudentFeesFailure,
} = studentFeesPaySlice.actions;

export default studentFeesPaySlice.reducer;

    