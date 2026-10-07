
/* eslint-disable @typescript-eslint/no-explicit-any */
import { call, put, takeLatest, all } from 'redux-saga/effects';
import { supabase } from '../../../service/supabaseClient';
import {
  saveSalaryDetailRequest,
  saveSalaryDetailSuccess,
  saveSalaryDetailFailure,
  fetchSalaryHistoryRequest,
  fetchSalaryHistorySuccess,
  fetchSalaryHistoryFailure,
  fetchMonthSalaryDetailsRequest,
  fetchMonthSalaryDetailsSuccess,
  fetchMonthSalaryDetailsFailure,
} from './staffSalarySlice';
import { message } from 'antd';
import dayjs from 'dayjs';

function* handleSaveSalaryDetail(action: ReturnType<typeof saveSalaryDetailRequest>) {
  try {
    const salaryData = action.payload;
    const { error } = yield call(() =>
      supabase.from('staff_salary_details').insert([salaryData])
    );

    if (error) {
      throw error;
    }

    yield put(saveSalaryDetailSuccess());
    message.success('Payment details saved successfully!');
    if(salaryData.organization_key){
        yield put(fetchMonthSalaryDetailsRequest(salaryData.organization_key));
    }
    
  } catch (err: any) {
    message.error(`Failed to save payment details: ${err.message}`);
    yield put(saveSalaryDetailFailure(err.message));
  }
}

function* handleFetchSalaryHistory(action: ReturnType<typeof fetchSalaryHistoryRequest>) {
    try {
        const { organizationKey, staffCode } = action.payload;
        const startOfMonth = dayjs().startOf('month').format('YYYY-MM-DD');
        const endOfMonth = dayjs().endOf('month').format('YYYY-MM-DD');

        const { data, error } = yield call(() =>
            supabase
                .from('staff_salary_details')
                .select('payment')
                .eq('organization_key', organizationKey)
                .eq('staff_code', staffCode)
                .gte('payment_date', startOfMonth)
                .lte('payment_date', endOfMonth)
        );

        if (error) throw error;

        yield put(fetchSalaryHistorySuccess(data || []));
    } catch (err: any) {
        message.error(`Failed to fetch salary history: ${err.message}`);
        yield put(fetchSalaryHistoryFailure(err.message));
    }
}

function* handleFetchMonthSalaryDetails(action: ReturnType<typeof fetchMonthSalaryDetailsRequest>) {
    try {
        const organizationKey = action.payload;
        const startOfMonth = dayjs().startOf('month').format('YYYY-MM-DD');
        const endOfMonth = dayjs().endOf('month').format('YYYY-MM-DD');
        
        const { data, error } = yield call(() =>
            supabase
                .from('staff_salary_details')
                .select('staff_code, payment')
                .eq('organization_key', organizationKey)
                .gte('payment_date', startOfMonth)
                .lte('payment_date', endOfMonth)
        );

        if (error) throw error;

        yield put(fetchMonthSalaryDetailsSuccess(data || []));

    } catch (err: any) {
        yield put(fetchMonthSalaryDetailsFailure(err.message));
    }
}


function* staffSalarySaga() {
  yield all([
    takeLatest(saveSalaryDetailRequest.type, handleSaveSalaryDetail),
    takeLatest(fetchSalaryHistoryRequest.type, handleFetchSalaryHistory),
    takeLatest(fetchMonthSalaryDetailsRequest.type, handleFetchMonthSalaryDetails),
  ]);
}

export default staffSalarySaga;
