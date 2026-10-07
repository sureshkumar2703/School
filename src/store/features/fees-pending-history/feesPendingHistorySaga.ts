
import { call, put, takeLatest, all } from 'redux-saga/effects';
import { supabase } from '../../../service/supabaseClient';
import {
    fetchFeesPendingHistoryRequest,
    fetchFeesPendingHistorySuccess,
    fetchFeesPendingHistoryFailure,
} from './feesPendingHistorySlice';
import { message } from 'antd';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function* handleFetchFeesPendingHistory(action: ReturnType<typeof fetchFeesPendingHistoryRequest>): Generator<any, void, any> {
    try {
        const organizationKey = action.payload;

        const { data, error } = yield call(() =>
            supabase
                .from('student_fees')
                .select('*')
                .eq('organization_key', organizationKey)
                .gt('balance_amount', 0) // Fetch only where balance is greater than 0
                .order('class_name')
                .order('section_name')
                .order('roll_no', { ascending: true, nullsFirst: false })
        );

        if (error) {
            throw error;
        }

        yield put(fetchFeesPendingHistorySuccess(data || []));

    } catch (err: any) {
        message.error(`Failed to fetch pending fees history: ${err.message}`);
        yield put(fetchFeesPendingHistoryFailure(err.message));
    }
}


function* feesPendingHistorySaga() {
  yield all([
    takeLatest(fetchFeesPendingHistoryRequest.type, handleFetchFeesPendingHistory),
  ]);
}

export default feesPendingHistorySaga;
