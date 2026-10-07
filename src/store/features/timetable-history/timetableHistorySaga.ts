
import { call, put, takeLatest, all } from 'redux-saga/effects';
import { supabase } from '../../../service/supabaseClient';
import {
  fetchTimetablesHistoryRequest,
  fetchTimetablesHistorySuccess,
  fetchTimetablesHistoryFailure,
} from './timetableHistorySlice';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function* handleFetchTimetablesHistory(action: ReturnType<typeof fetchTimetablesHistoryRequest>) {
  try {
    const organizationKey = action.payload;
    const { data, error } = yield call(() =>
      supabase
        .from('class_timetables')
        .select('*')
        .eq('organization_key', organizationKey)
        .order('created_at', { ascending: false })
    );
    if (error) throw error;
    yield put(fetchTimetablesHistorySuccess(data));
  } catch (err: any) {
    yield put(fetchTimetablesHistoryFailure(err.message));
  }
}

function* timetableHistorySaga() {
  yield all([
    takeLatest(fetchTimetablesHistoryRequest.type, handleFetchTimetablesHistory),
  ]);
}

export default timetableHistorySaga;
