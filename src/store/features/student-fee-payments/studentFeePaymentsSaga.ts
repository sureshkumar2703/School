
/* eslint-disable @typescript-eslint/no-explicit-any */
import { call, put, takeLatest, all } from 'redux-saga/effects';
import { supabase } from '../../../service/supabaseClient';
import {
    fetchPaymentsForStudentRequest,
    fetchPaymentsForStudentSuccess,
    fetchPaymentsForStudentFailure,
    addPaymentRequest,
    addPaymentSuccess,
    addPaymentFailure,
    type StudentFeePayment,
} from './studentFeePaymentsSlice';
import { message } from 'antd';
import { fetchFeesPendingHistoryRequest } from '../fees-pending-history/feesPendingHistorySlice';

function* handleFetchPaymentsForStudent(action: ReturnType<typeof fetchPaymentsForStudentRequest>): Generator<any, void, any> {
    try {
        const studentFeeId = action.payload;
        if (!studentFeeId) {
            yield put(fetchPaymentsForStudentSuccess([]));
            return;
        }

        const { data, error } = yield call(() =>
            supabase
                .from('student_fee_payments')
                .select('*')
                .eq('student_fee_id', studentFeeId)
                .order('payment_date', { ascending: true })
        );

        if (error) throw error;
        yield put(fetchPaymentsForStudentSuccess(data || []));

    } catch (err: any) {
        message.error(`Failed to fetch payment history: ${err.message}`);
        yield put(fetchPaymentsForStudentFailure(err.message));
    }
}

function* handleAddPayment(action: ReturnType<typeof addPaymentRequest>): Generator<any, void, any> {
    try {
        const newPaymentData = action.payload;

        if (!newPaymentData.student_id) {
            throw new Error('Student ID is missing. Cannot record payment.');
        }

        // Insert the new payment record
        const { data: newPayment, error } = yield call(() =>
            supabase
                .from('student_fee_payments')
                .insert([newPaymentData])
                .select()
                .single()
        );
        if (error) throw error;
        
        // After adding the payment, update the parent student_fees table status
        const { data: studentFeeData, error: fetchFeeError } = yield call(() => 
            supabase
            .from('student_fees')
            .select('total_fees')
            .eq('id', newPaymentData.student_fee_id)
            .single()
        );

        if (fetchFeeError) throw fetchFeeError;

        const { data: allPayments, error: fetchPaymentsError } = yield call(() => 
            supabase
            .from('student_fee_payments')
            .select('amount_paid')
            .eq('student_fee_id', newPaymentData.student_fee_id)
        );
        if (fetchPaymentsError) throw fetchPaymentsError;
        
        const totalPaid = allPayments.reduce((sum: number, p: {amount_paid: number}) => sum + p.amount_paid, 0);
        let newStatus: 'Paid' | 'Unpaid' | 'Partially Paid' = 'Partially Paid';
        const balance = studentFeeData.total_fees - totalPaid;
        if (balance <= 0) {
            newStatus = 'Paid';
        }

        // The balance_amount is calculated by a database trigger/function, so we don't send it here.
        const { data: updatedStudentFee, error: updateStatusError } = yield call(() =>
            supabase
            .from('student_fees')
            .update({ status: newStatus, paid_amount: totalPaid })
            .eq('id', newPaymentData.student_fee_id)
            .select()
            .single()
        );

        if (updateStatusError) throw updateStatusError;

        yield put(addPaymentSuccess({ payment: newPayment, studentFee: updatedStudentFee }));
        message.success("Payment recorded successfully!");
        
        // Refetch the pending history list
        if (newPaymentData.organization_key) {
            yield put(fetchFeesPendingHistoryRequest(newPaymentData.organization_key));
        }
        
    } catch (err: any) {
        message.error(`Failed to record payment: ${err.message}`);
        yield put(addPaymentFailure(err.message));
    }
}


function* studentFeePaymentsSaga() {
  yield all([
    takeLatest(fetchPaymentsForStudentRequest.type, handleFetchPaymentsForStudent),
    takeLatest(addPaymentRequest.type, handleAddPayment),
  ]);
}

export default studentFeePaymentsSaga;

      
