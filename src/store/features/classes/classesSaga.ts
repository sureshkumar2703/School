
import { call, put, takeLatest, all } from 'redux-saga/effects';
import { supabase } from '../../../service/supabaseClient';
import {
  fetchClassesRequest,
  fetchClassesSuccess,
  fetchClassesFailure,
  addClassRequest,
  addClassSuccess,
  addClassFailure,
  updateClassRequest,
  updateClassSuccess,
  updateClassFailure,
  deleteClassRequest,
  deleteClassSuccess,
  deleteClassFailure,
} from './classesSlice';

function* handleFetchClasses() {
  try {
    const { data, error } = yield call(() => supabase.from('classes').select('*').order('created_at'));
    if (error) throw error;
    yield put(fetchClassesSuccess(data));
  } catch (err: any) {
    yield put(fetchClassesFailure(err.message));
  }
}

function* handleAddClass(action: ReturnType<typeof addClassRequest>) {
  try {
    const { data, error } = yield call(() => supabase.from('classes').insert([action.payload]).select().single());
    if (error) throw error;
    yield put(addClassSuccess(data));
  } catch (err: any) {
    yield put(addClassFailure(err.message));
  }
}

function* handleUpdateClass(action: ReturnType<typeof updateClassRequest>) {
    try {
        const { data, error } = yield call(() => supabase.from('classes').update(action.payload).eq('id', action.payload.id).select().single());
        if (error) throw error;
        yield put(updateClassSuccess(data));
    } catch (err: any) {
        yield put(updateClassFailure(err.message));
    }
}

function* handleDeleteClass(action: ReturnType<typeof deleteClassRequest>) {
    try {
        const classId = action.payload;
        const { error } = yield call(() => supabase.from('classes').delete().eq('id', classId));
        if (error) throw error;
        yield put(deleteClassSuccess(classId));
    } catch (err: any) {
        yield put(deleteClassFailure(err.message));
    }
}

function* classesSaga() {
  yield all([
    takeLatest(fetchClassesRequest.type, handleFetchClasses),
    takeLatest(addClassRequest.type, handleAddClass),
    takeLatest(updateClassRequest.type, handleUpdateClass),
    takeLatest(deleteClassRequest.type, handleDeleteClass),
  ]);
}

export default classesSaga;
