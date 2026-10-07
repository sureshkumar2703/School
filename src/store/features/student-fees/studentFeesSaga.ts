
import { call, put, takeLatest, all } from 'redux-saga/effects';
import { supabase } from '../../../service/supabaseClient';
import {
  saveStudentFeesRequest,
  saveStudentFeesSuccess,
  saveStudentFeesFailure,
} from './studentFeesSlice';
import { message } from 'antd';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function* handleSaveStudentFees(action: ReturnType<typeof saveStudentFeesRequest>): Generator<any, void, any> {
  try {
    const studentFeesData = action.payload;

    if (studentFeesData.length === 0) {
      yield put(saveStudentFeesSuccess());
      return;
    }
    
    // Upsert on a unique combination of student and academic year
    const { error } = yield call(() =>
      supabase
        .from('student_fees')
        .upsert(studentFeesData, { onConflict: 'organization_key,student_id,academic_year' })
    );

    if (error) {
      throw error;
    }

    yield put(saveStudentFeesSuccess());
    message.success(`${studentFeesData.length} student fee records have been saved.`);
    
  } catch (err: any) {
    message.error(`Failed to save student fees: ${err.message}`);
    yield put(saveStudentFeesFailure(err.message));
  }
}

function* studentFeesSaga() {
  yield all([
    takeLatest(saveStudentFeesRequest.type, handleSaveStudentFees),
  ]);
}

export default studentFeesSaga;
