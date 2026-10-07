/* eslint-disable @typescript-eslint/no-explicit-any */
import { call, put, takeLatest, all } from 'redux-saga/effects';
import { supabase } from '../../../service/supabaseClient';
import {
  uploadExamMarksRequest,
  uploadExamMarksSuccess,
  uploadExamMarksFailure,
  fetchStudentsByClassRequest,
  fetchStudentsByClassSuccess,
  fetchStudentsByClassFailure,
  fetchAllExamMarksRequest,
  fetchAllExamMarksSuccess,
  fetchAllExamMarksFailure,
} from './examMarksSlice';
import { message } from 'antd';

function* handleUploadExamMarks(action: ReturnType<typeof uploadExamMarksRequest>): Generator<any, void, any> {
    try {
        const payload = action.payload;
        if (!payload.student_marks || payload.student_marks.length === 0) {
            message.info("No marks to upload.");
            yield put(uploadExamMarksSuccess());
            return;
        }
        
        // Using upsert with the unique constraint to either insert a new exam record or update an existing one.
        const { error } = yield call(() => 
          supabase.from('exam_marks').upsert(payload, { 
            onConflict: 'organization_key, exam_id, subject' 
          })
        );

        if (error) throw error;
        
        yield put(uploadExamMarksSuccess());
        message.success('Marks uploaded successfully!');
        // Refetch all marks to update the check
        yield put(fetchAllExamMarksRequest(payload.organization_key));
    } catch (err: any) {
        yield put(uploadExamMarksFailure(err.message));
        message.error(`Failed to upload marks: ${err.message}`);
    }
}

function* handleFetchStudentsForClass(action: ReturnType<typeof fetchStudentsByClassRequest>): Generator<any, void, any> {
    try {
        const { organizationKey, academicYear, className, sectionName } = action.payload;
        
        // Fetch register numbers from allocations
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

        const registerNos = allocations.map((a: any) => a.register_no);

        if (registerNos.length === 0) {
            yield put(fetchStudentsByClassSuccess([]));
            return;
        }

        // Fetch student IDs based on register numbers
        const { data, error } = yield call(() =>
            supabase
                .from('students')
                .select('id, register_no')
                .in('register_no', registerNos)
        );
        if (error) throw error;

        const studentIdMap = new Map(data.map((s: any) => [s.register_no, s.id]));

        const studentsWithIds = allocations.map((alloc: any) => ({
            ...alloc,
            id: studentIdMap.get(alloc.register_no)
        })).filter((s: any) => s.id); // Filter out students for whom no ID was found


        yield put(fetchStudentsByClassSuccess(studentsWithIds || []));
    } catch (err: any) {
        yield put(fetchStudentsByClassFailure(err.message));
        message.error(`Failed to fetch students: ${err.message}`);
    }
}

function* handleFetchAllExamMarks(action: ReturnType<typeof fetchAllExamMarksRequest>): Generator<any, void, any> {
    try {
        const organizationKey = action.payload;
        const { data, error } = yield call(() => 
            supabase
                .from('exam_marks')
                .select('*') // Fetch all columns to check existing data thoroughly
                .eq('organization_key', organizationKey)
        );
        if (error) throw error;
        yield put(fetchAllExamMarksSuccess(data || []));
    } catch (err: any) {
        yield put(fetchAllExamMarksFailure(err.message));
        message.error(`Failed to fetch existing exam marks: ${err.message}`);
    }
}


function* examMarksSaga() {
    yield all([
        takeLatest(uploadExamMarksRequest.type, handleUploadExamMarks),
        takeLatest(fetchStudentsByClassRequest.type, handleFetchStudentsForClass),
        takeLatest(fetchAllExamMarksRequest.type, handleFetchAllExamMarks),
    ]);
}

export default examMarksSaga;

    