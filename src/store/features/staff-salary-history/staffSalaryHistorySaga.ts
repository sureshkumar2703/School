
import { call, put, takeLatest, all } from 'redux-saga/effects';
import { supabase } from '../../../service/supabaseClient';
import {
  fetchAllSalaryHistoryRequest,
  fetchAllSalaryHistorySuccess,
  fetchAllSalaryHistoryFailure,
} from './staffSalaryHistorySlice';
import { message } from 'antd';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function* handleFetchAllSalaryHistory(action: ReturnType<typeof fetchAllSalaryHistoryRequest>): Generator<any, void, any> {
  try {
    const organizationKey = action.payload;
    const { data, error } = yield call(() =>
      supabase
        .from('staff_salary_details')
        .select('*')
        .eq('organization_key', organizationKey)
        .order('payment_date', { ascending: false })
    );

    if (error) {
      throw error;
    }

    yield put(fetchAllSalaryHistorySuccess(data || []));
  } catch (err: any) {
    message.error(`Failed to fetch salary history: ${err.message}`);
    yield put(fetchAllSalaryHistoryFailure(err.message));
  }
}

function* staffSalaryHistorySaga() {
  yield all([
    takeLatest(fetchAllSalaryHistoryRequest.type, handleFetchAllSalaryHistory),
  ]);
}

export default staffSalaryHistorySaga;
