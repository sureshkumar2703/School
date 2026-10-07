
import { call, put, takeLatest, all } from 'redux-saga/effects';
import { supabase } from '../../../service/supabaseClient';
import {
  addHomeworkRequest,
  addHomeworkSuccess,
  addHomeworkFailure,
  fetchHomeworkRequest,
  fetchHomeworkSuccess,
  fetchHomeworkFailure,
} from './homeworkSlice';
import { message } from 'antd';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function* handleAddHomework(action: ReturnType<typeof addHomeworkRequest>): Generator<any, void, any> {
  try {
    const homeworkData = action.payload;
    const { data, error } = yield call(() => supabase.from('homework').insert([homeworkData]).select().single());

    if (error) {
        throw error;
    }

    yield put(addHomeworkSuccess(data)); // Pass the new record to the reducer

  } catch (err: any) {
    message.error(`Failed to save homework: ${err.message}`);
    yield put(addHomeworkFailure(err.message));
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function* handleFetchHomework(action: ReturnType<typeof fetchHomeworkRequest>): Generator<any, void, any> {
  try {
    const organizationKey = action.payload;
    const { data, error } = yield call(() =>
      supabase
        .from('homework')
        .select('*')
        .eq('organization_key', organizationKey)
    );
    if (error) throw error;
    yield put(fetchHomeworkSuccess(data || []));
  } catch (err: any) {
    message.error(`Failed to fetch homework history: ${err.message}`);
    yield put(fetchHomeworkFailure(err.message));
  }
}

function* homeworkSaga() {
  yield all([
    takeLatest(addHomeworkRequest.type, handleAddHomework),
    takeLatest(fetchHomeworkRequest.type, handleFetchHomework),
  ]);
}

export default homeworkSaga;
