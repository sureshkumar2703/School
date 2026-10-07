
import { call, put, takeLatest, all } from 'redux-saga/effects';
import { supabase } from '../../../service/supabaseClient';
import {
  fetchMcqResultsRequest,
  fetchMcqResultsSuccess,
  fetchMcqResultsFailure,
  fetchStudentsByClassRequest,
  fetchStudentsByClassSuccess,
  fetchStudentsByClassFailure,
  type McqTestResult,
} from './mcqResultsSlice';
import { message } from 'antd';
import type { McqTestSession } from '../mcq-test-history/mcqTestHistorySlice';
import type { StudentForReport } from './mcqResultsSlice';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function* handleFetchMcqResults(action: ReturnType<typeof fetchMcqResultsRequest>): Generator<any, void, any> {
  try {
    const organizationKey = action.payload;
    if (!organizationKey) {
      yield put(fetchMcqResultsSuccess([]));
      return;
    }

    const { data, error } = yield call(() =>
      supabase
        .from('mcqtestdata')
        .select('*')
        .eq('organization_key', organizationKey)
        .order('test_date', { ascending: false })
    );

    if (error) {
      throw error;
    }

    const flattenedResults: McqTestResult[] = [];
    (data as McqTestSession[]).forEach(session => {
        session.student_results?.forEach(studentRes => {
            flattenedResults.push({
                id: `${session.id}-${studentRes.student_id}`,
                organization_key: session.organization_key,
                academic_year: session.academic_year,
                class_name: session.class_name,
                section_name: session.section_name,
                subject: session.subject,
                test_date: session.test_date,
                score: studentRes.score,
                total_questions: studentRes.total_questions,
                time_taken: studentRes.time_taken,
                questions: studentRes.results, // Pass the questions through
                student: {
                    student_id: studentRes.student_id,
                    student_name: studentRes.student_name,
                    roll_no: studentRes.roll_no,
                    register_no: studentRes.register_no,
                },
            });
        });
    });

    yield put(fetchMcqResultsSuccess(flattenedResults));

  } catch (err: any) {
    message.error(`Failed to fetch MCQ results: ${err.message}`);
    yield put(fetchMcqResultsFailure(err.message));
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function* handleFetchStudentsByClass(action: ReturnType<typeof fetchStudentsByClassRequest>): Generator<any, void, any> {
    try {
        const { organizationKey, academicYear, className, sectionName } = action.payload;
        
        // Step 1: Fetch allocations for the class to get student names, roll numbers, and register numbers.
        const { data: allocations, error: allocationError } = yield call(() =>
            supabase
                .from('class_section_allocations')
                .select('register_no, full_name, roll_no')
                .eq('organization_key', organizationKey)
                .eq('academic_year', academicYear)
                .eq('class_name', className)
                .eq('section_name', sectionName)
        );

        if (allocationError) throw allocationError;

        if (!allocations || allocations.length === 0) {
            yield put(fetchStudentsByClassSuccess([]));
            return;
        }
        
        const registerNos = allocations.map((a: any) => a.register_no).filter(Boolean);

        if (registerNos.length === 0) {
            yield put(fetchStudentsByClassSuccess([]));
            return;
        }

        // Step 2: Fetch student IDs from the main students table using the register numbers.
        const { data: studentIds, error: studentIdError } = yield call(() =>
            supabase
                .from('students')
                .select('id, register_no')
                .in('register_no', registerNos)
        );

        if (studentIdError) throw studentIdError;

        const studentIdMap = new Map(studentIds.map((s: any) => [s.register_no, s.id]));

        // Step 3: Combine the data into the final StudentForReport structure.
        const finalStudents: StudentForReport[] = allocations.map((alloc: any) => ({
            id: studentIdMap.get(alloc.register_no) || alloc.register_no, // Use register_no as fallback key
            full_name: alloc.full_name,
            register_no: alloc.register_no,
            roll_no: alloc.roll_no,
        }));
        
        yield put(fetchStudentsByClassSuccess(finalStudents));

    } catch (err: any) {
        message.error(`Failed to fetch students for report: ${err.message}`);
        yield put(fetchStudentsByClassFailure(err.message));
    }
}


function* mcqResultsSaga() {
  yield all([
    takeLatest(fetchMcqResultsRequest.type, handleFetchMcqResults),
    takeLatest(fetchStudentsByClassRequest.type, handleFetchStudentsByClass),
  ]);
}

export default mcqResultsSaga;
