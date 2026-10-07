
import { call, put, takeLatest, all } from 'redux-saga/effects';
import { supabase } from '../../../service/supabaseClient';
import {
  fetchStudentNotesRequest,
  fetchStudentNotesSuccess,
  fetchStudentNotesFailure,
  type FetchStudentNotesPayload,
} from './studentNotesSlice';
import { message } from 'antd';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function* handleFetchStudentNotes(action: ReturnType<typeof fetchStudentNotesRequest>) {
  try {
    const { organizationKey, className, sectionName, academicYear } = action.payload as FetchStudentNotesPayload;
    
    const { data, error } = yield call(() =>
      supabase
        .from('class_notes')
        .select('*')
        .eq('organization_key', organizationKey)
        .eq('class_name', className)
        .eq('section_name', sectionName)
        .eq('academic_year', academicYear)
        .order('created_at', { ascending: false })
    );

    if (error) throw error;
    
    yield put(fetchStudentNotesSuccess(data || []));

  } catch (err: any) {
    message.error(`Failed to fetch class notes: ${err.message}`);
    yield put(fetchStudentNotesFailure(err.message));
  }
}

function* studentNotesSaga() {
  yield all([
    takeLatest(fetchStudentNotesRequest.type, handleFetchStudentNotes),
  ]);
}

export default studentNotesSaga;
