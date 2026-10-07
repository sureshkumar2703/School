
/* eslint-disable @typescript-eslint/no-explicit-any */
import { call, put, takeLatest, all } from 'redux-saga/effects';
import { supabase } from '../../../service/supabaseClient';
import {
    fetchBusesRequest,
    fetchBusesSuccess,
    fetchBusesFailure,
    addBusRequest,
    addBusSuccess,
    addBusFailure,
    updateBusRequest,
    updateBusSuccess,
    updateBusFailure,
    deleteBusRequest,
    deleteBusSuccess,
    deleteBusFailure,
} from './busSlice';
import { message } from 'antd';

function* handleFetchBuses(action: ReturnType<typeof fetchBusesRequest>) {
    try {
        const organizationKey = action.payload;
        const { data, error } = yield call(() =>
            supabase
                .from('buses')
                .select('*')
                .eq('organization_key', organizationKey)
                .order('created_at', { ascending: false })
        );
        if (error) throw error;
        yield put(fetchBusesSuccess(data));
    } catch (err: any) {
        message.error(`Failed to fetch buses: ${err.message}`);
        yield put(fetchBusesFailure(err.message));
    }
}

function* handleAddBus(action: ReturnType<typeof addBusRequest>) {
    try {
        const { error } = yield call(() => supabase.from('buses').insert([action.payload]));
        if (error) throw error;
        yield put(addBusSuccess());
        message.success('Bus added successfully!');
        yield put(fetchBusesRequest(action.payload.organization_key));
    } catch (err: any) {
        message.error(`Failed to add bus: ${err.message}`);
        yield put(addBusFailure(err.message));
    }
}

function* handleUpdateBus(action: ReturnType<typeof updateBusRequest>) {
    try {
        const { id, ...updateData } = action.payload;
        const { error } = yield call(() => supabase.from('buses').update(updateData).eq('id', id));
        if (error) throw error;
        yield put(updateBusSuccess());
        message.success('Bus updated successfully!');
        if (action.payload.organization_key) {
            yield put(fetchBusesRequest(action.payload.organization_key));
        }
    } catch (err: any) {
        message.error(`Failed to update bus: ${err.message}`);
        yield put(updateBusFailure(err.message));
    }
}

function* handleDeleteBus(action: ReturnType<typeof deleteBusRequest>) {
    try {
        const busId = action.payload;
        const { error } = yield call(() => supabase.from('buses').delete().eq('id', busId));
        if (error) throw error;
        yield put(deleteBusSuccess(busId));
        message.success('Bus deleted successfully!');
    } catch (err: any) {
        message.error(`Failed to delete bus: ${err.message}`);
        yield put(deleteBusFailure(err.message));
    }
}

function* busSaga() {
    yield all([
        takeLatest(fetchBusesRequest.type, handleFetchBuses),
        takeLatest(addBusRequest.type, handleAddBus),
        takeLatest(updateBusRequest.type, handleUpdateBus),
        takeLatest(deleteBusRequest.type, handleDeleteBus),
    ]);
}

export default busSaga;
