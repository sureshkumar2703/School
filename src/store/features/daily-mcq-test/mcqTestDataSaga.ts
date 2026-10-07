
import { call, put, takeLatest, all } from 'redux-saga/effects';
import { supabase } from '../../../service/supabaseClient';
import {
  saveMcqTestDataRequest,
  saveMcqTestDataSuccess,
  saveMcqTestDataFailure,
  type SaveMcqTestPayload,
} from './mcqTestDataSlice';
import { message } from 'antd';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function* handleSaveMcqTestData(action: ReturnType<typeof saveMcqTestDataRequest>): Generator<any, void, any> {
  try {
    const { sessionData, studentResult } = action.payload as SaveMcqTestPayload;

    // Check if a record for this test session already exists
    const { data: existingSession, error: fetchError } = yield call(() =>
      supabase
        .from('mcqtestdata')
        .select('id, student_results')
        .eq('organization_key', sessionData.organization_key)
        .eq('academic_year', sessionData.academic_year)
        .eq('class_name', sessionData.class_name)
        .eq('section_name', sessionData.section_name)
        .eq('subject', sessionData.subject)
        .eq('test_date', sessionData.test_date)
        .single()
    );

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116: "single row not found"
      throw fetchError;
    }

    if (existingSession) {
      // Append the new student result to the existing array
      const updatedStudentResults = [...(existingSession.student_results || []), studentResult];
      const { error: updateError } = yield call(() =>
        supabase
          .from('mcqtestdata')
          .update({ student_results: updatedStudentResults })
          .eq('id', existingSession.id)
      );
      if (updateError) throw updateError;
    } else {
      // Create a new record with the student result in an array
      const insertPayload = {
        ...sessionData,
        student_results: [studentResult],
      };
      const { error: insertError } = yield call(() =>
        supabase.from('mcqtestdata').insert(insertPayload)
      );
      if (insertError) throw insertError;
    }

    yield put(saveMcqTestDataSuccess());
    message.success('Your test results have been saved successfully!');

  } catch (err: any) {
    message.error(`Failed to save test results: ${err.message}`);
    yield put(saveMcqTestDataFailure(err.message));
  }
}

function* mcqTestDataSaga() {
  yield all([
    takeLatest(saveMcqTestDataRequest.type, handleSaveMcqTestData),
  ]);
}

export default mcqTestDataSaga;
