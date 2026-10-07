
import { call, put, takeLatest, all } from 'redux-saga/effects';
import { supabase } from '../../../service/supabaseClient';
import {
  fetchStudentsForClassRequest,
  fetchStudentsForClassSuccess,
  fetchStudentsForClassFailure,
} from './chatSlice';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function* handleFetchStudentsForClass(action: ReturnType<typeof fetchStudentsForClassRequest>): Generator<any, void, any> {
  try {
    const { organizationKey, className, sectionName, academicYear } = action.payload;
    
    // First, get the register numbers of students in the specified class section
    const { data: allocations, error: allocationError } = yield call(() =>
      supabase
        .from('class_section_allocations')
        .select('register_no')
        .eq('organization_key', organizationKey)
        .eq('class_name', className)
        .eq('section_name', sectionName)
        .eq('academic_year', academicYear)
    );

    if (allocationError) throw allocationError;

    const registerNos = allocations.map((a: { register_no: string }) => a.register_no);

    if (registerNos.length === 0) {
      yield put(fetchStudentsForClassSuccess([]));
      return;
    }

    // Now, fetch the full details for those students, including the correct phone field
    const { data: students, error: studentsError } = yield call(() =>
      supabase
        .from('students')
        .select('id, full_name, parent_contact')
        .in('register_no', registerNos)
        .eq('organization_key', organizationKey)
    );

    if (studentsError) throw studentsError;

    // Map the parent_contact to a generic 'phone' field for the component to use
    const studentsWithPhone = students.map((s: any) => ({
      ...s,
      phone: s.parent_contact, 
    }));


    yield put(fetchStudentsForClassSuccess(studentsWithPhone));

  } catch (err: any) {
    yield put(fetchStudentsForClassFailure(err.message));
  }
}


function* chatSaga() {
  yield all([
    takeLatest(fetchStudentsForClassRequest.type, handleFetchStudentsForClass),
  ]);
}

export default chatSaga;
