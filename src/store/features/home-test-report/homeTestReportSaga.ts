
import { call, put, takeLatest, all } from 'redux-saga/effects';
import { supabase } from '../../../service/supabaseClient';
import {
    fetchHomeTestReportsRequest,
    fetchHomeTestReportsSuccess,
    fetchHomeTestReportsFailure,
    saveHomeTestReportRequest,
    saveHomeTestReportSuccess,
    saveHomeTestReportFailure,
    type FetchHomeworkReportsPayload,
} from './homeTestReportSlice';
import { message } from 'antd';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function* handleFetchHomeTestReports(action: ReturnType<typeof fetchHomeTestReportsRequest>): Generator<any, void, any> {
    try {
        // Correctly destructure the payload object
        const { studentId, organizationKey } = action.payload as FetchHomeworkReportsPayload;
        
        let query = supabase.from('home_test_report').select('*');

        if (studentId) {
            query = query.eq('student_id', studentId);
        }
        
        if (organizationKey) {
            query = query.eq('organization_key', organizationKey);
        }

        const { data, error } = yield call(() => query);
        
        if (error) throw error;
        yield put(fetchHomeTestReportsSuccess(data || []));
    } catch (err: any) {
        message.error(`Failed to fetch test reports: ${err.message}`);
        yield put(fetchHomeTestReportsFailure(err.message));
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function* handleSaveHomeTestReport(action: ReturnType<typeof saveHomeTestReportRequest>): Generator<any, void, any> {
    try {
        const reportPayload = action.payload;
        const { data, error } = yield call(() =>
            supabase.from('home_test_report').insert([reportPayload]).select().single()
        );
        if (error) throw error;

        yield put(saveHomeTestReportSuccess(data));
    } catch (err: any) {
        message.error(`Failed to save test report: ${err.message}`);
        yield put(saveHomeTestReportFailure(err.message));
    }
}

function* homeTestReportSaga() {
    yield all([
        takeLatest(fetchHomeTestReportsRequest.type, handleFetchHomeTestReports),
        takeLatest(saveHomeTestReportRequest.type, handleSaveHomeTestReport),
    ]);
}

export default homeTestReportSaga;
