

import { call, put, takeLatest, all } from 'redux-saga/effects';
import { supabase } from '../../../service/supabaseClient';
import {
  addFeeRequest,
  addFeeSuccess,
  addFeeFailure,
  fetchFeesRequest,
  fetchFeesSuccess,
  fetchFeesFailure,
  updateFeeRequest,
  updateFeeSuccess,
  updateFeeFailure,
  deleteFeeRequest,
  deleteFeeSuccess,
  deleteFeeFailure,
} from './setfeesSlice';
import { message } from 'antd';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function* handleAddFee(action: ReturnType<typeof addFeeRequest>): Generator<any, void, any> {
  try {
    const feeData = action.payload;

    const { error } = yield call(() =>
      supabase
        .from('setfees')
        .insert([feeData])
    );

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        throw new Error(`A fee structure for ${feeData.class_name} in ${feeData.academic_year} already exists.`);
      }
      throw error;
    }

    yield put(addFeeSuccess());
    message.success('Fee structure created successfully!');
    if (feeData.organization_key) {
        yield put(fetchFeesRequest(feeData.organization_key));
    }

  } catch (err: any) {
    message.error(`Failed to create fee structure: ${err.message}`);
    yield put(addFeeFailure(err.message));
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function* handleFetchFees(action: ReturnType<typeof fetchFeesRequest>): Generator<any, void, any> {
    try {
        const organizationKey = action.payload;
        const { data, error } = yield call(() =>
            supabase
                .from('setfees')
                .select('*')
                .eq('organization_key', organizationKey)
                .order('created_at', { ascending: false })
        );
        if (error) throw error;
        yield put(fetchFeesSuccess(data));
    } catch (err: any) {
        message.error(`Failed to fetch fees: ${err.message}`);
        yield put(fetchFeesFailure(err.message));
    }
}

function* handleUpdateFee(action: ReturnType<typeof updateFeeRequest>) {
  try {
    const { id, organization_key, ...updateData } = action.payload;
    const { error } = yield call(() =>
      supabase
        .from('setfees')
        .update(updateData)
        .eq('id', id)
    );
    if (error) throw error;
    yield put(updateFeeSuccess());
    message.success('Fee structure updated successfully!');
    if (organization_key) {
        yield put(fetchFeesRequest(organization_key));
    }
  } catch (err: any) {
    message.error(`Failed to update fee: ${err.message}`);
    yield put(updateFeeFailure(err.message));
  }
}

function* handleDeleteFee(action: ReturnType<typeof deleteFeeRequest>) {
  try {
    const feeId = action.payload;
    const { error } = yield call(() =>
      supabase
        .from('setfees')
        .delete()
        .eq('id', feeId)
    );
    if (error) throw error;
    yield put(deleteFeeSuccess(feeId));
    message.success('Fee structure deleted successfully!');
  } catch (err: any) {
    message.error(`Failed to delete fee: ${err.message}`);
    yield put(deleteFeeFailure(err.message));
  }
}


function* setfeesSaga() {
  yield all([
    takeLatest(addFeeRequest.type, handleAddFee),
    takeLatest(fetchFeesRequest.type, handleFetchFees),
    takeLatest(updateFeeRequest.type, handleUpdateFee),
    takeLatest(deleteFeeRequest.type, handleDeleteFee),
  ]);
}

export default setfeesSaga;
