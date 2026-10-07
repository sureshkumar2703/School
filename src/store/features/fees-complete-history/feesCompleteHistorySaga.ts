
import { call, put, takeLatest, all } from 'redux-saga/effects';
import { supabase } from '../../../service/supabaseClient';
import {
    fetchFeesCompleteHistoryRequest,
    fetchFeesCompleteHistorySuccess,
    fetchFeesCompleteHistoryFailure,
} from './feesCompleteHistorySlice';
import { message } from 'antd';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function* handleFetchFeesCompleteHistory(action: ReturnType<typeof fetchFeesCompleteHistoryRequest>): Generator<any, void, any> {
    try {
        const organizationKey = action.payload;

        const { data, error } = yield call(() =>
            supabase
                .from('student_fees')
                .select('*')
                .eq('organization_key', organizationKey)
                .eq('status', 'Paid') // Fetch only where status is 'Paid'
                .order('class_name')
                .order('section_name')
                .order('roll_no', { ascending: true, nullsFirst: false })
        );

        if (error) {
            throw error;
        }

        yield put(fetchFeesCompleteHistorySuccess(data || []));

    } catch (err: any) {
        message.error(`Failed to fetch completed fees history: ${err.message}`);
        yield put(fetchFeesCompleteHistoryFailure(err.message));
    }
}


function* feesCompleteHistorySaga() {
  yield all([
    takeLatest(fetchFeesCompleteHistoryRequest.type, handleFetchFeesCompleteHistory),
  ]);
}

export default feesCompleteHistorySaga;
