
/* eslint-disable @typescript-eslint/no-explicit-any */
import { call, put, takeLatest, all, select } from 'redux-saga/effects';
import { supabase } from '../../../service/supabaseClient';
import {
    fetchStudentFeesRequest,
    fetchStudentFeesSuccess,
    fetchStudentFeesFailure,
    fetchAllStudentFeesRequest,
    fetchAllStudentFeesSuccess,
    fetchAllStudentFeesFailure,
} from './studentFeesPaySlice';
import { message } from 'antd';
import type { RootState } from '../../store';
import { addPaymentRequest } from '../student-fee-payments/studentFeePaymentsSlice';


// eslint-disable-next-line @typescript-eslint/no-explicit-any
function* handleFetchStudentFees(action: ReturnType<typeof fetchStudentFeesRequest>): Generator<any, void, any> {
    try {
        const { organizationKey, academicYear } = action.payload;

        const { data, error } = yield call(() =>
            supabase
                .from('student_fees')
                .select('*')
                .eq('organization_key', organizationKey)
                .eq('academic_year', academicYear)
                .order('roll_no', { ascending: true, nullsFirst: false })
        );

        if (error) {
            throw error;
        }

        yield put(fetchStudentFeesSuccess(data || []));

    } catch (err: any) {
        message.error(`Failed to fetch student fees: ${err.message}`);
        yield put(fetchStudentFeesFailure(err.message));
    }
}

function* handleFetchAllStudentFees(action: ReturnType<typeof fetchAllStudentFeesRequest>): Generator<any, void, any> {
    try {
        const organizationKey = action.payload;
        const { data, error } = yield call(() =>
            supabase
                .from('student_fees')
                .select('*')
                .eq('organization_key', organizationKey)
        );
        if (error) throw error;
        yield put(fetchAllStudentFeesSuccess(data || []));
    } catch (err: any) {
        message.error(`Failed to fetch all student fees: ${err.message}`);
        yield put(fetchAllStudentFeesFailure(err.message));
    }
}


function* studentFeesPaySaga() {
  yield all([
    takeLatest(fetchStudentFeesRequest.type, handleFetchStudentFees),
    takeLatest(fetchAllStudentFeesRequest.type, handleFetchAllStudentFees),
  ]);
}

export default studentFeesPaySaga;

    