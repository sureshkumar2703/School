
/* eslint-disable @typescript-eslint/no-explicit-any */
import { call, put, takeLatest, all } from 'redux-saga/effects';
import { supabase } from '../../../service/supabaseClient';
import {
    uploadMarksRequest,
    uploadMarksSuccess,
    uploadMarksFailure,
    fetchStudentsForClassRequest,
    fetchStudentsForClassSuccess,
    fetchStudentsForClassFailure,
} from './analysisSlice';
import { message } from 'antd';

function* handleUploadMarks(action: ReturnType<typeof uploadMarksRequest>) {
    try {
        const { marksData } = action.payload;
        const { error } = yield call(() => supabase.from('student_marks').insert(marksData));
        if (error) throw error;
        yield put(uploadMarksSuccess());
    } catch (err: any) {
        yield put(uploadMarksFailure(err.message));
        message.error(`Failed to upload marks: ${err.message}`);
    }
}

function* handleFetchStudentsForClass(action: ReturnType<typeof fetchStudentsForClassRequest>) {
    try {
        const { organizationKey, className, sectionName, academicYear } = action.payload;
        
        // Fetch register numbers from allocations
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

        const registerNos = allocations.map((a: any) => a.register_no);

        if (registerNos.length === 0) {
            yield put(fetchStudentsForClassSuccess([]));
            return;
        }

        // Fetch student details based on register numbers
        const { data, error } = yield call(() =>
            supabase
                .from('students')
                .select('id, register_no')
                .in('register_no', registerNos)
        );
        if (error) throw error;

        yield put(fetchStudentsForClassSuccess(data || []));
    } catch (err: any) {
        yield put(fetchStudentsForClassFailure(err.message));
    }
}


function* analysisSaga() {
    yield all([
        takeLatest(uploadMarksRequest.type, handleUploadMarks),
        takeLatest(fetchStudentsForClassRequest.type, handleFetchStudentsForClass),
    ]);
}

export default analysisSaga;
