

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { StudentFee } from '../student-fees-pay/studentFeesPaySlice';

export interface StudentFeePayment {
    id: string;
    created_at: string;
    organization_key: string;
    student_fee_id: string; // Foreign key to student_fees table
    student_id: string;
    student_name?: string;
    amount_paid: number;
    payment_date: string;
    received_by_id?: string;
    received_by_name?: string;
}

export type AddPaymentPayload = Omit<StudentFeePayment, 'id' | 'created_at'>;

interface AddPaymentSuccessPayload {
    payment: StudentFeePayment;
    studentFee: StudentFee;
}

interface StudentFeePaymentsState {
  payments: StudentFeePayment[];
  loading: boolean;
  error: string | null;
  lastPayment: StudentFeePayment | null;
  lastPaymentStudentFee: StudentFee | null; // New state to hold the full student fee context
}

const initialState: StudentFeePaymentsState = {
  payments: [],
  loading: false,
  error: null,
  lastPayment: null,
  lastPaymentStudentFee: null,
};

const studentFeePaymentsSlice = createSlice({
  name: 'studentFeePayments',
  initialState,
  reducers: {
    // Fetch payments for a specific student fee record
    fetchPaymentsForStudentRequest: (state, _action: PayloadAction<string>) => {
        state.loading = true;
        state.error = null;
        state.payments = []; // Clear previous student's payments
    },
    fetchPaymentsForStudentSuccess: (state, action: PayloadAction<StudentFeePayment[]>) => {
        state.loading = false;
        state.payments = action.payload;
    },
    fetchPaymentsForStudentFailure: (state, action: PayloadAction<string>) => {
        state.loading = false;
        state.error = action.payload;
    },
    // Add a new payment
    addPaymentRequest: (state, _action: PayloadAction<AddPaymentPayload>) => {
        state.loading = true;
        state.error = null;
        state.lastPayment = null;
        state.lastPaymentStudentFee = null;
    },
    addPaymentSuccess: (state, action: PayloadAction<AddPaymentSuccessPayload>) => {
        state.loading = false;
        state.payments.push(action.payload.payment);
        state.lastPayment = action.payload.payment; // Set for receipt printing
        state.lastPaymentStudentFee = action.payload.studentFee; // Set the full context
    },
    addPaymentFailure: (state, action: PayloadAction<string>) => {
        state.loading = false;
        state.error = action.payload;
    },
    clearLastPayment: (state) => {
        state.lastPayment = null;
        state.lastPaymentStudentFee = null;
    }
  },
});

export const {
    fetchPaymentsForStudentRequest,
    fetchPaymentsForStudentSuccess,
    fetchPaymentsForStudentFailure,
    addPaymentRequest,
    addPaymentSuccess,
    addPaymentFailure,
    clearLastPayment,
} = studentFeePaymentsSlice.actions;

export const selectPaymentsForStudent = (state: { studentFeePayments: StudentFeePaymentsState }) => state.studentFeePayments.payments;

export default studentFeePaymentsSlice.reducer;

    