
import { call, put, takeLatest, all } from 'redux-saga/effects';
import { supabase } from '../../../service/supabaseClient';
import {
  fetchClassTimetableRequest,
  fetchClassTimetableSuccess,
  fetchClassTimetableFailure,
  saveClassTimetableRequest,
  saveClassTimetableSuccess,
  saveClassTimetableFailure,
} from './classTimetablesSlice';
import { message } from 'antd';

function* handleFetchClassTimetable(action: ReturnType<typeof fetchClassTimetableRequest>) {
  try {
    const { organizationKey, className, sectionName, academicYear } = action.payload;
    const { data, error } = yield call(() =>
      supabase
        .from('class_timetables')
        .select('*')
        .eq('organization_key', organizationKey)
        .eq('class_name', className)
        .eq('section_name', sectionName)
        .eq('academic_year', academicYear)
        .single()
    );

    if (error && error.code !== 'PGRST116') { // Ignore 'single row not found' error
      throw error;
    }
    yield put(fetchClassTimetableSuccess(data));
  } catch (err: any) {
    yield put(fetchClassTimetableFailure(err.message));
  }
}

function* handleSaveClassTimetable(action: ReturnType<typeof saveClassTimetableRequest>) {
  try {
    const { id, ...saveData } = action.payload;

    // Step 1: Delete any existing timetable for this exact combination to avoid conflicts.
    const { error: deleteError } = yield call(() =>
      supabase
        .from('class_timetables')
        .delete()
        .eq('organization_key', saveData.organization_key)
        .eq('class_name', saveData.class_name)
        .eq('section_name', saveData.section_name)
        .eq('academic_year', saveData.academic_year)
    );

    if (deleteError) {
        throw new Error(`Failed to clear old timetable: ${deleteError.message}`);
    }

    // Step 2: Insert the new timetable data.
    const { error: insertError } = yield call(() =>
      supabase
        .from('class_timetables')
        .insert(saveData)
    );

    if (insertError) throw insertError;
    
    yield put(saveClassTimetableSuccess());
    message.success('Timetable saved successfully!');
    
    // Refetch the data to ensure UI is in sync with the database state.
    yield put(fetchClassTimetableRequest({ 
        organizationKey: saveData.organization_key, 
        className: saveData.class_name, 
        sectionName: saveData.section_name,
        academicYear: saveData.academic_year,
    }));

  } catch (err: any) {
    message.error(`Failed to save timetable: ${err.message}`);
    yield put(saveClassTimetableFailure(err.message));
  }
}

function* classTimetablesSaga() {
  yield all([
    takeLatest(fetchClassTimetableRequest.type, handleFetchClassTimetable),
    takeLatest(saveClassTimetableRequest.type, handleSaveClassTimetable),
  ]);
}

export default classTimetablesSaga;

    