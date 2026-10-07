import { call, put, takeLatest, all } from 'redux-saga/effects';
import { supabase } from '../../../service/supabaseClient';
import {
    createExamTimetableRequest,
    createExamTimetableSuccess,
    createExamTimetableFailure,
    fetchExamTimetablesRequest,
    fetchExamTimetablesSuccess,
    fetchExamTimetablesFailure,
    updateExamTimetableRequest,
    updateExamTimetableSuccess,
    updateExamTimetableFailure,
    type ExamTimetable,
} from './examTimetableAdminSlice';
import { message } from 'antd';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function* handleCreateExamTimetable(action: ReturnType<typeof createExamTimetableRequest>): Generator<any, void, any> {
    try {
        const timetableData = action.payload;
        const { error } = yield call(() => supabase.from('examtimetable').insert([timetableData]));

        if (error) {
            throw error;
        }

        yield put(createExamTimetableSuccess());
        message.success('Exam timetable created successfully!');
        if (timetableData.organization_key) {
            yield put(fetchExamTimetablesRequest(timetableData.organization_key));
        }

    } catch (err: any) {
        const errorMessage = err.message || 'An unknown database error occurred.';
        message.error(`Failed to create exam timetable: ${errorMessage}`);
        yield put(createExamTimetableFailure(errorMessage));
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function* handleUpdateExamTimetable(action: ReturnType<typeof updateExamTimetableRequest>): Generator<any, void, any> {
    try {
        const { id, ...updateData } = action.payload;
        const { error } = yield call(() =>
            supabase
                .from('examtimetable')
                .update(updateData)
                .eq('id', id)
        );

        if (error) throw error;

        yield put(updateExamTimetableSuccess());
        message.success('Exam timetable updated successfully!');
        if (action.payload.organization_key) {
            yield put(fetchExamTimetablesRequest(action.payload.organization_key));
        }
    } catch (err: any) {
        const errorMessage = err.message || 'An unknown database error occurred.';
        message.error(`Failed to update exam timetable: ${errorMessage}`);
        yield put(updateExamTimetableFailure(errorMessage));
    }
}


// eslint-disable-next-line @typescript-eslint/no-explicit-any
function* handleFetchExamTimetables(action: ReturnType<typeof fetchExamTimetablesRequest>): Generator<any, void, any> {
    try {
        const organizationKey = action.payload;
        const { data, error } = yield call(() =>
            supabase
                .from('examtimetable')
                .select('*')
                .eq('organization_key', organizationKey)
                .order('created_at', { ascending: false })
        );

        if (error) {
            throw error;
        }

        yield put(fetchExamTimetablesSuccess(data || []));

    } catch (err: any) {
        const errorMessage = err.message || 'An unknown database error occurred.';
        message.error(`Failed to fetch exam timetables: ${errorMessage}`);
        yield put(fetchExamTimetablesFailure(errorMessage));
    }
}


function* examTimetableAdminSaga() {
    yield all([
        takeLatest(createExamTimetableRequest.type, handleCreateExamTimetable),
        takeLatest(fetchExamTimetablesRequest.type, handleFetchExamTimetables),
        takeLatest(updateExamTimetableRequest.type, handleUpdateExamTimetable),
    ]);
}

export default examTimetableAdminSaga;
