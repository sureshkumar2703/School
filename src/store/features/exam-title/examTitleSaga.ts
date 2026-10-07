
/* eslint-disable @typescript-eslint/no-explicit-any */
import { call, put, takeLatest, all, select } from 'redux-saga/effects';
import { supabase } from '../../../service/supabaseClient';
import {
    addExamTitleRequest,
    addExamTitleSuccess,
    addExamTitleFailure,
    fetchExamTitlesRequest,
    fetchExamTitlesSuccess,
    fetchExamTitlesFailure,
    updateExamTitleRequest,
    updateExamTitleSuccess,
    updateExamTitleFailure,
    deleteExamTitleRequest,
    deleteExamTitleSuccess,
    deleteExamTitleFailure,
} from './examTitleSlice';
import { message } from 'antd';
import type { RootState } from '../../store';


function* handleFetchExamTitles(action: ReturnType<typeof fetchExamTitlesRequest>): Generator<any, void, any> {
    try {
        const organizationKey = action.payload;
        const { data, error } = yield call(() =>
            supabase
                .from('exam_titles')
                .select('*')
                .eq('organization_key', organizationKey)
                .order('created_at', { ascending: false })
        );
        if (error) throw error;
        yield put(fetchExamTitlesSuccess(data));
    } catch (err: any) {
        message.error(`Failed to fetch exam titles: ${err.message}`);
        yield put(fetchExamTitlesFailure(err.message));
    }
}

function* handleAddExamTitle(action: ReturnType<typeof addExamTitleRequest>): Generator<any, void, any> {
    try {
        const { error } = yield call(() => supabase.from('exam_titles').insert([action.payload]));
        if (error) throw error;
        yield put(addExamTitleSuccess());
        message.success('Exam title created successfully!');
        if (action.payload.organization_key) {
            yield put(fetchExamTitlesRequest(action.payload.organization_key));
        }
    } catch (err: any) {
        message.error(`Failed to create exam title: ${err.message}`);
        yield put(addExamTitleFailure(err.message));
    }
}

function* handleUpdateExamTitle(action: ReturnType<typeof updateExamTitleRequest>): Generator<any, void, any> {
    try {
        const { id, ...updateData } = action.payload;
        const { error } = yield call(() => supabase.from('exam_titles').update(updateData).eq('id', id));
        if (error) throw error;
        yield put(updateExamTitleSuccess());
        message.success('Exam title updated successfully!');
        const user = yield select((state: RootState) => state.auth.user);
        if (user?.organization_key) {
            yield put(fetchExamTitlesRequest(user.organization_key));
        }
    } catch (err: any) {
        message.error(`Failed to update exam title: ${err.message}`);
        yield put(updateExamTitleFailure(err.message));
    }
}

function* handleDeleteExamTitle(action: ReturnType<typeof deleteExamTitleRequest>): Generator<any, void, any> {
    try {
        const id = action.payload;
        const { error } = yield call(() => supabase.from('exam_titles').delete().eq('id', id));
        if (error) throw error;
        yield put(deleteExamTitleSuccess(id));
        message.success('Exam title deleted successfully!');
    } catch (err: any) {
        message.error(`Failed to delete exam title: ${err.message}`);
        yield put(deleteExamTitleFailure(err.message));
    }
}

function* examTitleSaga() {
    yield all([
        takeLatest(fetchExamTitlesRequest.type, handleFetchExamTitles),
        takeLatest(addExamTitleRequest.type, handleAddExamTitle),
        takeLatest(updateExamTitleRequest.type, handleUpdateExamTitle),
        takeLatest(deleteExamTitleRequest.type, handleDeleteExamTitle),
    ]);
}

export default examTitleSaga;
