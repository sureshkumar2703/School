
import { call, put, takeLatest, all } from 'redux-saga/effects';
import { supabase } from '../../../service/supabaseClient';
import {
  fetchSubjectsRequest,
  fetchSubjectsSuccess,
  fetchSubjectsFailure,
  addSubjectRequest,
  addSubjectSuccess,
  addSubjectFailure,
  updateSubjectRequest,
  updateSubjectSuccess,
  updateSubjectFailure,
  deleteSubjectRequest,
  deleteSubjectSuccess,
  deleteSubjectFailure,
} from './subjectsSlice';

function* handleFetchSubjects() {
  try {
    const { data, error } = yield call(() => supabase.from('subjects').select('*').order('created_at'));
    if (error) throw error;
    yield put(fetchSubjectsSuccess(data));
  } catch (err: any) {
    yield put(fetchSubjectsFailure(err.message));
  }
}

function* handleAddSubject(action: ReturnType<typeof addSubjectRequest>) {
  try {
    const { data, error } = yield call(() => supabase.from('subjects').insert([action.payload]).select().single());
    if (error) throw error;
    yield put(addSubjectSuccess(data));
  } catch (err: any) {
    yield put(addSubjectFailure(err.message));
  }
}

function* handleUpdateSubject(action: ReturnType<typeof updateSubjectRequest>) {
    try {
        const { data, error } = yield call(() => supabase.from('subjects').update(action.payload).eq('id', action.payload.id).select().single());
        if (error) throw error;
        yield put(updateSubjectSuccess(data));
    } catch (err: any) {
        yield put(updateSubjectFailure(err.message));
    }
}

function* handleDeleteSubject(action: ReturnType<typeof deleteSubjectRequest>) {
    try {
        const subjectId = action.payload;
        const { error } = yield call(() => supabase.from('subjects').delete().eq('id', subjectId));
        if (error) throw error;
        yield put(deleteSubjectSuccess(subjectId));
    } catch (err: any) {
        yield put(deleteSubjectFailure(err.message));
    }
}

function* subjectsSaga() {
  yield all([
    takeLatest(fetchSubjectsRequest.type, handleFetchSubjects),
    takeLatest(addSubjectRequest.type, handleAddSubject),
    takeLatest(updateSubjectRequest.type, handleUpdateSubject),
    takeLatest(deleteSubjectRequest.type, handleDeleteSubject),
  ]);
}

export default subjectsSaga;
