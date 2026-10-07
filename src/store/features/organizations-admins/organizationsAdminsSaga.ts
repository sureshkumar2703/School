
/* eslint-disable @typescript-eslint/no-explicit-any */
import { call, put, takeLatest, all } from 'redux-saga/effects';
import { supabase } from '../../../service/supabaseClient';
import {
  fetchAdminsRequest,
  fetchAdminsSuccess,
  fetchAdminsFailure,
  updateAdminStatusRequest,
  updateAdminStatusSuccess,
  updateAdminStatusFailure,
} from './organizationsAdminsSlice';

function* handleFetchAdmins(action: ReturnType<typeof fetchAdminsRequest>) {
  try {
    const organizationKey = action.payload;
    const { data, error } = yield call(() =>
      supabase.from('admin_data').select('*').eq('organization_key', organizationKey)
    );
    if (error) throw error;
    yield put(fetchAdminsSuccess(data));
  } catch (err: any) {
    yield put(fetchAdminsFailure(err.message));
  }
}

function* handleUpdateAdminStatus(action: ReturnType<typeof updateAdminStatusRequest>) {
    try {
        const admin = action.payload;
        const { data, error } = yield call(() =>
            supabase
                .from('admin_data')
                .update({ status: admin.status })
                .eq('id', admin.id)
                .select()
        );
        if (error) throw error;
        yield put(updateAdminStatusSuccess(data[0]));
    } catch (err: any) {
        yield put(updateAdminStatusFailure(err.message));
    }
}


function* organizationsAdminsSaga() {
  yield all([
    takeLatest(fetchAdminsRequest.type, handleFetchAdmins),
    takeLatest(updateAdminStatusRequest.type, handleUpdateAdminStatus),
  ]);
}

export default organizationsAdminsSaga;
