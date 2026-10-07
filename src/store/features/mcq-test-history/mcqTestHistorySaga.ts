
import { call, put, takeLatest, all } from 'redux-saga/effects';
import { supabase } from '../../../service/supabaseClient';
import {
  fetchMcqTestHistoryRequest,
  fetchMcqTestHistoryForStudentRequest,
  fetchMcqTestHistorySuccess,
  fetchMcqTestHistoryFailure,
} from './mcqTestHistorySlice';
import { message } from 'antd';
import type { McqTestSession, TestSession } from './mcqTestHistorySlice';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function* handleFetchMcqTestHistory(action: ReturnType<typeof fetchMcqTestHistoryRequest | typeof fetchMcqTestHistoryForStudentRequest>): Generator<any, void, any> {
  try {
    const studentId = action.payload;
    if (!studentId) {
      yield put(fetchMcqTestHistorySuccess([]));
      return;
    }

    const { data, error } = yield call(() =>
      supabase
        .from('mcqtestdata')
        .select('*')
        // We can't filter by student_id directly at the top level anymore.
        // We fetch all records and filter in the client. This is less efficient
        // but necessary with the new data structure unless a DB function is used.
        // For a school-sized app, this is generally acceptable.
        .order('test_date', { ascending: false })
    );

    if (error) {
      throw error;
    }

    const studentHistory: TestSession[] = [];

    (data as McqTestSession[]).forEach(session => {
        const studentResult = session.student_results?.find(res => res.student_id === studentId);
        
        if (studentResult) {
            studentHistory.push({
                test_date: session.test_date,
                subject: session.subject,
                time_taken: studentResult.time_taken,
                score: studentResult.score,
                totalQuestions: studentResult.total_questions,
                questions: studentResult.results, // Use the nested results array
            });
        }
    });

    yield put(fetchMcqTestHistorySuccess(studentHistory));

  } catch (err: any) {
    message.error(`Failed to fetch test history: ${err.message}`);
    yield put(fetchMcqTestHistoryFailure(err.message));
  }
}


function* mcqTestHistorySaga() {
  yield all([
    takeLatest(fetchMcqTestHistoryRequest.type, handleFetchMcqTestHistory),
    takeLatest(fetchMcqTestHistoryForStudentRequest.type, handleFetchMcqTestHistory),
  ]);
}

export default mcqTestHistorySaga;
