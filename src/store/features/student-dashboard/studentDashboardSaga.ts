
/* eslint-disable @typescript-eslint/no-explicit-any */
import { call, put, takeLatest, all } from 'redux-saga/effects';
import { supabase } from '../../../service/supabaseClient';
import {
  fetchStudentDashboardDataRequest,
  fetchStudentDashboardDataSuccess,
  fetchStudentDashboardDataFailure,
} from './studentDashboardSlice';

// This generator now correctly expects an array of PostgrestResponses.
function* handleFetchStudentDashboardData(
  action: ReturnType<typeof fetchStudentDashboardDataRequest>
): Generator<any, void, any> {
  try {
    const { organizationKey, className, sectionName, academicYear } = action.payload;
    
    // Fetch mappings and timetable for the specific class in parallel
    const [mappingsResponse, timetableResponse] = yield all([
      call(() => supabase
        .from('class_subject_teacher_mapping')
        .select('*')
        .eq('organization_key', organizationKey)
        .eq('class_name', className)
        .eq('section_name', sectionName)
        .eq('academic_year', academicYear)
      ),
      call(() => supabase
        .from('class_timetables')
        .select('*')
        .eq('organization_key', organizationKey)
        .eq('class_name', className)
        .eq('section_name', sectionName)
        .eq('academic_year', academicYear)
        .single() // Expect only one timetable per class/year
      )
    ]);

    const { data: mappings, error: mappingsError } = mappingsResponse;
    const { data: timetable, error: timetableError } = timetableResponse;

    if (mappingsError) throw mappingsError;
    // We ignore "single row not found" error for timetable as it might not exist yet
    if (timetableError && timetableError.code !== 'PGRST116') throw timetableError;

    yield put(fetchStudentDashboardDataSuccess({ mappings: mappings || [], timetable: timetable || null }));
  } catch (err: any) {
    yield put(fetchStudentDashboardDataFailure(err.message));
  }
}

function* studentDashboardSaga() {
  yield all([
    takeLatest(fetchStudentDashboardDataRequest.type, handleFetchStudentDashboardData),
  ]);
}

export default studentDashboardSaga;
