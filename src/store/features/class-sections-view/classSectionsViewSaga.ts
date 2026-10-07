

import { call, put, takeLatest, all } from 'redux-saga/effects';
import { supabase } from '../../../service/supabaseClient';
import {
  fetchAllClassSectionsRequest,
  fetchAllClassSectionsSuccess,
  fetchAllClassSectionsFailure,
} from './classSectionsViewSlice';

// This saga fetches ALL allocations for a given organization, used for the overview/report page.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function* handleFetchAllClassSections(action: ReturnType<typeof fetchAllClassSectionsRequest>) {
  try {
    const organizationKey = action.payload;

    // Step 1: Fetch all class section allocations
    const { data: allocations, error: allocationError } = yield call(() =>
      supabase
        .from('class_section_allocations')
        .select('id, created_at, organization_key, academic_year, class_name, section_name, register_no, full_name, roll_no, status')
        .eq('organization_key', organizationKey)
    );
    if (allocationError) throw allocationError;

    if (!allocations || allocations.length === 0) {
      yield put(fetchAllClassSectionsSuccess([]));
      return;
    }
    
    // Step 2: Get all unique register numbers to fetch their corresponding student IDs
    const registerNos = [...new Set(allocations.map((a: any) => a.register_no).filter(Boolean))];
    
    let studentIdMap = new Map<string, string>();

    if (registerNos.length > 0) {
        const { data: students, error: studentsError } = yield call(() =>
            supabase
                .from('students')
                .select('id, register_no')
                .in('register_no', registerNos)
                .eq('organization_key', organizationKey)
        );

        if (studentsError) throw studentsError;
        studentIdMap = new Map(students.map((s: any) => [s.register_no, s.id]));
    }
    
    // Step 3: Combine the data
    const finalData = allocations.map((alloc: any) => ({
      ...alloc,
      student_id: studentIdMap.get(alloc.register_no) || null,
    })).sort((a: any, b: any) => {
        // Sort by class name, then section name, then full name
        const classCompare = a.class_name.localeCompare(b.class_name);
        if (classCompare !== 0) return classCompare;
        const sectionCompare = a.section_name.localeCompare(b.section_name);
        if (sectionCompare !== 0) return sectionCompare;
        return a.full_name.localeCompare(b.full_name);
    });

    yield put(fetchAllClassSectionsSuccess(finalData));

  } catch (err: any) {
    yield put(fetchAllClassSectionsFailure(err.message));
  }
}

function* classSectionsViewSaga() {
  yield all([
    takeLatest(fetchAllClassSectionsRequest.type, handleFetchAllClassSections),
  ]);
}

export default classSectionsViewSaga;
