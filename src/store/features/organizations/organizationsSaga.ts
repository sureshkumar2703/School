
/* eslint-disable @typescript-eslint/no-explicit-any */
import { call, put, takeLatest, all } from 'redux-saga/effects';
import { supabase } from '../../../service/supabaseClient';
import {
  fetchOrganizationsRequest,
  fetchOrganizationsSuccess,
  fetchOrganizationsFailure,
  addOrganizationRequest,
  addOrganizationSuccess,
  addOrganizationFailure,
  updateOrganizationRequest,
  updateOrganizationSuccess,
  updateOrganizationFailure,
  deleteOrganizationRequest,
  deleteOrganizationSuccess,
  deleteOrganizationFailure,
} from './organizationsSlice';

// Worker Sagas
function* handleFetchOrganizations() {
  try {
    const { data, error } = yield call(() => supabase.from('organizations').select('*').order('created_at'));
    if (error) throw error;
    yield put(fetchOrganizationsSuccess(data));
  } catch (err: any) {
    yield put(fetchOrganizationsFailure(err.message));
  }
}

function* handleAddOrganization(action: ReturnType<typeof addOrganizationRequest>) {
  try {
    const { error } = yield call(() => supabase.from('organizations').insert([action.payload]));
    if (error) throw error;
    yield put(addOrganizationSuccess());
    yield put(fetchOrganizationsRequest()); // Refetch after adding
  } catch (err: any) {
    yield put(addOrganizationFailure(err.message));
  }
}

function* handleUpdateOrganization(action: ReturnType<typeof updateOrganizationRequest>) {
  try {
    const { error } = yield call(() =>
      supabase.from('organizations').update(action.payload).eq('id', action.payload.id)
    );
    if (error) throw error;
    yield put(updateOrganizationSuccess());
    yield put(fetchOrganizationsRequest()); // Refetch after updating
  } catch (err: any) {
    yield put(updateOrganizationFailure(err.message));
  }
}

function* handleDeleteOrganization(action: ReturnType<typeof deleteOrganizationRequest>) {
  try {
    const orgId = action.payload;
    const { error } = yield call(() => supabase.from('organizations').delete().eq('id', orgId));
    if (error) throw error;
    yield put(deleteOrganizationSuccess(orgId));
  } catch (err: any) {
    yield put(deleteOrganizationFailure(err.message));
  }
}

// Watcher Saga
function* organizationsSaga() {
  yield all([
    takeLatest(fetchOrganizationsRequest.type, handleFetchOrganizations),
    takeLatest(addOrganizationRequest.type, handleAddOrganization),
    takeLatest(updateOrganizationRequest.type, handleUpdateOrganization),
    takeLatest(deleteOrganizationRequest.type, handleDeleteOrganization),
  ]);
}

export default organizationsSaga;
