
import { call, put, takeLatest, all } from 'redux-saga/effects';
import { supabase } from '../../../service/supabaseClient';
import {
    createAllocationRequest,
    createAllocationSuccess,
    createAllocationFailure,
    fetchAllocationsRequest,
    fetchAllocationsSuccess,
    fetchAllocationsFailure,
    deleteAllocationRequest,
    deleteAllocationSuccess,
    deleteAllocationFailure,
} from './busDriverAllocationSlice';
import { message } from 'antd';

function* handleCreateAllocation(action: ReturnType<typeof createAllocationRequest>) {
    try {
        const { error } = yield call(() =>
            supabase.from('bus_driver_allocations').insert([action.payload])
        );
        if (error) throw error;
        yield put(createAllocationSuccess());
        message.success('Bus and Driver assigned successfully!');
        yield put(fetchAllocationsRequest(action.payload.organization_key));
    } catch (err: any) {
        message.error(`Failed to assign: ${err.message}`);
        yield put(createAllocationFailure(err.message));
    }
}

function* handleFetchAllocations(action: ReturnType<typeof fetchAllocationsRequest>) {
    try {
        const organizationKey = action.payload;
        const { data, error } = yield call(() =>
            supabase
                .from('bus_driver_allocations')
                .select('*')
                .eq('organization_key', organizationKey)
        );
        if (error) throw error;
        yield put(fetchAllocationsSuccess(data));
    } catch (err: any) {
        message.error(`Failed to fetch assignments: ${err.message}`);
        yield put(fetchAllocationsFailure(err.message));
    }
}

function* handleDeleteAllocation(action: ReturnType<typeof deleteAllocationRequest>) {
    try {
        const allocationId = action.payload;
        const { error } = yield call(() =>
            supabase.from('bus_driver_allocations').delete().eq('id', allocationId)
        );
        if (error) throw error;
        yield put(deleteAllocationSuccess(allocationId));
        message.success('Assignment deleted successfully!');
    } catch (err: any) {
        message.error(`Failed to delete assignment: ${err.message}`);
        yield put(deleteAllocationFailure(err.message));
    }
}

function* busDriverAllocationSaga() {
    yield all([
        takeLatest(createAllocationRequest.type, handleCreateAllocation),
        takeLatest(fetchAllocationsRequest.type, handleFetchAllocations),
        takeLatest(deleteAllocationRequest.type, handleDeleteAllocation),
    ]);
}

export default busDriverAllocationSaga;
