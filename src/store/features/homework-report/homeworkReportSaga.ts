

import { call, put, takeLatest, all } from 'redux-saga/effects';
import { supabase } from '../../../service/supabaseClient';
import {
  fetchHomeworkReportsRequest,
  fetchHomeworkReportsSuccess,
  fetchHomeworkReportsFailure,
  saveHomeworkReportRequest,
  saveHomeworkReportSuccess,
  saveHomeworkReportFailure,
  updateHomeworkReportStatusRequest,
  updateHomeworkReportStatusSuccess,
  updateHomeworkReportStatusFailure,
  type UpdateStatusPayload,
  type FetchHomeworkReportsPayload,
} from './homeworkReportSlice';
import { message } from 'antd';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function* handleFetchHomeworkReports(action: ReturnType<typeof fetchHomeworkReportsRequest>): Generator<any, void, any> {
  try {
    const { studentId, organizationKey } = action.payload as FetchHomeworkReportsPayload;
    let query = supabase.from('homework_report').select('*');

    if (studentId) {
        query = query.eq('student_id', studentId);
    }
    if (organizationKey) {
        query = query.eq('organization_key', organizationKey);
    }
    
    const { data, error } = yield call(() => query);

    if (error) throw error;
    yield put(fetchHomeworkReportsSuccess(data || []));
  } catch (err: any) {
    yield put(fetchHomeworkReportsFailure(err.message));
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function* handleSaveHomeworkReport(action: ReturnType<typeof saveHomeworkReportRequest>): Generator<any, void, any> {
  try {
    const reportData = action.payload;
    const { data, error } = yield call(() =>
      supabase.from('homework_report').insert([reportData]).select().single()
    );
    if (error) {
        // If it's a unique constraint violation, it just means the student already viewed it.
        // This is not a "failure" in the user-facing sense.
        if (error.code === '23505') {
            console.log("Homework report already exists for this student and homework.");
            yield put(saveHomeworkReportSuccess(null)); // Pass null to indicate no new record was created
        } else {
            throw error;
        }
    } else {
        yield put(saveHomeworkReportSuccess(data));
    }
  } catch (err: any) {
    message.error(`Failed to save homework report: ${err.message}`);
    yield put(saveHomeworkReportFailure(err.message));
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function* handleUpdateHomeworkReportStatus(action: ReturnType<typeof updateHomeworkReportStatusRequest>): Generator<any, void, any> {
  try {
    const { reportId, status } = action.payload as UpdateStatusPayload;
    const { data, error } = yield call(() =>
      supabase.from('homework_report').update({ status }).eq('id', reportId).select().single()
    );
    if (error) throw error;
    yield put(updateHomeworkReportStatusSuccess(data));
    message.success(`Submission status updated to '${status}'.`);
  } catch (err: any) {
    message.error(`Failed to update status: ${err.message}`);
    yield put(updateHomeworkReportStatusFailure(err.message));
  }
}

function* homeworkReportSaga() {
  yield all([
    takeLatest(fetchHomeworkReportsRequest.type, handleFetchHomeworkReports),
    takeLatest(saveHomeworkReportRequest.type, handleSaveHomeworkReport),
    takeLatest(updateHomeworkReportStatusRequest.type, handleUpdateHomeworkReportStatus),
  ]);
}

export default homeworkReportSaga;
