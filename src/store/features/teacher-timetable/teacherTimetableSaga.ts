
import { call, put, takeLatest, all } from 'redux-saga/effects';
import { supabase } from '../../../service/supabaseClient';
import {
  fetchTeacherTimetableDataRequest,
  fetchTeacherTimetableDataSuccess,
  fetchTeacherTimetableDataFailure,
} from './teacherTimetableSlice';
import type { PostgrestResponse } from '@supabase/supabase-js';
import type { ClassTimetable, TeacherClassMapping } from './teacherTimetableSlice';


// eslint-disable-next-line @typescript-eslint/no-explicit-any
function* handleFetchTeacherTimetableData(action: ReturnType<typeof fetchTeacherTimetableDataRequest>): Generator<any, void, [PostgrestResponse<TeacherClassMapping>, PostgrestResponse<ClassTimetable>]> {
  try {
    const { organizationKey } = action.payload;

    // Fetch all mappings and all timetables for the entire organization in parallel
    const [mappingsResponse, timetablesResponse] = yield all([
        call(() =>
            supabase
                .from('class_subject_teacher_mapping')
                .select('class_name, section_name, academic_year, teacher_name')
                .eq('organization_key', organizationKey)
        ),
        call(() =>
            supabase
                .from('class_timetables')
                .select('*')
                .eq('organization_key', organizationKey)
        )
    ]);
    
    const { data: mappings, error: mappingsError } = mappingsResponse;
    const { data: timetables, error: timetablesError } = timetablesResponse;

    if (mappingsError) throw mappingsError;
    if (timetablesError) throw timetablesError;
    
    yield put(fetchTeacherTimetableDataSuccess({ mappings: mappings || [], timetables: timetables || [] }));

  } catch (err: any) {
    yield put(fetchTeacherTimetableDataFailure(err.message));
  }
}

function* teacherTimetableSaga() {
  yield all([
    takeLatest(fetchTeacherTimetableDataRequest.type, handleFetchTeacherTimetableData),
  ]);
}

export default teacherTimetableSaga;
