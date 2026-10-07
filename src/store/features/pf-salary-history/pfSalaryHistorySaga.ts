
import { call, put, takeLatest, all } from 'redux-saga/effects';
import { supabase } from '../../../service/supabaseClient';
import {
  fetchUniqueStaffRequest,
  fetchUniqueStaffSuccess,
  fetchUniqueStaffFailure,
  fetchPfHistoryForStaffRequest,
  fetchPfHistoryForStaffSuccess,
  fetchPfHistoryForStaffFailure,
  type UniqueStaff,
  type FetchPfHistoryPayload,
} from './pfSalaryHistorySlice';
import { message } from 'antd';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function* handleFetchUniqueStaff(action: ReturnType<typeof fetchUniqueStaffRequest>): Generator<any, void, any> {
  try {
    const organizationKey = action.payload;
    
    const { data, error } = yield call(() =>
      supabase
        .from('staff_salary_details')
        .select('staff_name, staff_code')
        .eq('organization_key', organizationKey)
    );

    if (error) {
      throw error;
    }

    const uniqueStaffMap = new Map<string, UniqueStaff>();
    (data || []).forEach((record: { staff_code: string; staff_name: string }) => {
        if (!uniqueStaffMap.has(record.staff_code)) {
            uniqueStaffMap.set(record.staff_code, {
                staff_code: record.staff_code,
                staff_name: record.staff_name,
            });
        }
    });

    const uniqueStaffList = Array.from(uniqueStaffMap.values());

    yield put(fetchUniqueStaffSuccess(uniqueStaffList));
  } catch (err: any) {
    message.error(`Failed to fetch staff list: ${err.message}`);
    yield put(fetchUniqueStaffFailure(err.message));
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function* handleFetchPfHistoryForStaff(action: ReturnType<typeof fetchPfHistoryForStaffRequest>): Generator<any, void, any> {
    try {
        const { organizationKey, staffCode } = action.payload as FetchPfHistoryPayload;
        const { data, error } = yield call(() =>
            supabase
                .from('staff_salary_details')
                .select('id, payment_date, pf_salary')
                .eq('organization_key', organizationKey)
                .eq('staff_code', staffCode)
                .gt('pf_salary', 0) // Only fetch rows where pf_salary is greater than 0
                .order('payment_date', { ascending: false })
        );
        if (error) throw error;
        yield put(fetchPfHistoryForStaffSuccess(data));
    } catch (err: any) {
        message.error(`Failed to fetch PF history: ${err.message}`);
        yield put(fetchPfHistoryForStaffFailure(err.message));
    }
}


function* pfSalaryHistorySaga() {
  yield all([
    takeLatest(fetchUniqueStaffRequest.type, handleFetchUniqueStaff),
    takeLatest(fetchPfHistoryForStaffRequest.type, handleFetchPfHistoryForStaff),
  ]);
}

export default pfSalaryHistorySaga;
