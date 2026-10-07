
/* eslint-disable @typescript-eslint/no-explicit-any */
import { call, put, takeLatest, all } from 'redux-saga/effects';
import { supabase } from '../../../service/supabaseClient';
import {
  assignTransportRequest,
  assignTransportSuccess,
  assignTransportFailure,
  fetchAllocationsRequest,
  fetchAllocationsSuccess,
  fetchAllocationsFailure,
  updateAllocationStatusRequest,
  updateAllocationStatusSuccess,
  updateAllocationStatusFailure,
  deleteAllocationRequest,
  deleteAllocationSuccess,
  deleteAllocationFailure,
  type UpdateStatusPayload,
} from './studentTransportSlice';
import { message } from 'antd';

function* handleAssignTransport(action: ReturnType<typeof assignTransportRequest>) {
  try {
    const allocations = action.payload;

    if (allocations.length === 0) {
        message.info("No students were selected for transport assignment.");
        yield put(assignTransportSuccess());
        return;
    }

    const { error } = yield call(() =>
      supabase
        .from('student_transport_allocations')
        .upsert(allocations, { onConflict: 'organization_key,student_id,academic_year' })
    );

    if (error) {
      throw error;
    }

    yield put(assignTransportSuccess());
    message.success(`${allocations.length} student(s) have been successfully assigned for transport.`);
    
    if (allocations.length > 0 && allocations[0].organization_key) {
        yield put(fetchAllocationsRequest(allocations[0].organization_key));
    }


  } catch (err: any) {
    message.error(`Failed to assign students for transport: ${err.message}`);
    yield put(assignTransportFailure(err.message));
  }
}

function* handleFetchAllocations(action: ReturnType<typeof fetchAllocationsRequest>) {
    try {
        const organizationKey = action.payload;
        const { data, error } = yield call(() =>
            supabase
                .from('student_transport_allocations')
                .select('*')
                .eq('organization_key', organizationKey)
        );
        if (error) throw error;
        yield put(fetchAllocationsSuccess(data || []));
    } catch (err: any) {
        message.error(`Failed to fetch transport allocations: ${err.message}`);
        yield put(fetchAllocationsFailure(err.message));
    }
}

function* handleUpdateAllocationStatus(action: ReturnType<typeof updateAllocationStatusRequest>) {
    try {
        const { id, status } = action.payload as UpdateStatusPayload;
        const { data, error } = yield call(() =>
            supabase
                .from('student_transport_allocations')
                .update({ status })
                .eq('id', id)
                .select()
                .single()
        );
        if (error) throw error;
        yield put(updateAllocationStatusSuccess(data));
        message.success("Student's transport status updated.");
    } catch(err: any) {
        message.error(`Failed to update status: ${err.message}`);
        yield put(updateAllocationStatusFailure(err.message));
    }
}

function* handleDeleteAllocation(action: ReturnType<typeof deleteAllocationRequest>) {
    try {
        const id = action.payload;
        const { error } = yield call(() =>
            supabase
                .from('student_transport_allocations')
                .delete()
                .eq('id', id)
        );
        if (error) throw error;
        yield put(deleteAllocationSuccess(id));
        message.success("Transport assignment removed successfully.");
    } catch(err: any) {
        message.error(`Failed to remove assignment: ${err.message}`);
        yield put(deleteAllocationFailure(err.message));
    }
}


function* studentTransportSaga() {
  yield all([
    takeLatest(assignTransportRequest.type, handleAssignTransport),
    takeLatest(fetchAllocationsRequest.type, handleFetchAllocations),
    takeLatest(updateAllocationStatusRequest.type, handleUpdateAllocationStatus),
    takeLatest(deleteAllocationRequest.type, handleDeleteAllocation),
  ]);
}

export default studentTransportSaga;
