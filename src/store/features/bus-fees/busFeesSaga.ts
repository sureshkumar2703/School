import { call, put, takeLatest, all } from 'redux-saga/effects';
import { supabase } from '../../../service/supabaseClient';
import {
    fetchBusFeesRequest,
    fetchBusFeesSuccess,
    fetchBusFeesFailure,
    saveBusFeeRequest,
    saveBusFeeSuccess,
    saveBusFeeFailure,
    updateBusFeeStatusRequest,
    updateBusFeeStatusSuccess,
    updateBusFeeStatusFailure,
    deleteBusFeeRequest,
    deleteBusFeeSuccess,
    deleteBusFeeFailure,
} from './busFeesSlice';
import { message } from 'antd';

function* handleFetchBusFees(action: ReturnType<typeof fetchBusFeesRequest>) {
    try {
        const organizationKey = action.payload;
        const { data, error } = yield call(() =>
            supabase
                .from('bus_fees_setup')
                .select('*')
                .eq('organization_key', organizationKey)
                .order('created_at', { ascending: false })
        );
        if (error) throw error;
        yield put(fetchBusFeesSuccess(data));
    } catch (err: any) {
        yield put(fetchBusFeesFailure(err.message));
    }
}

function* handleSaveBusFee(action: ReturnType<typeof saveBusFeeRequest>) {
    try {
        const { organization_key, academic_year, bus_id, ...rest } = action.payload;
        
        // Use upsert to handle both insert and update based on unique constraint
        const { error } = yield call(() =>
            supabase
                .from('bus_fees_setup')
                .upsert([{ organization_key, academic_year, bus_id, ...rest }], { 
                    onConflict: 'organization_key,academic_year,bus_id' 
                })
        );

        if (error) throw error;

        yield put(saveBusFeeSuccess());
        message.success('Bus fees saved successfully!');
        yield put(fetchBusFeesRequest(organization_key));
    } catch (err: any) {
        message.error(`Failed to save bus fees: ${err.message}`);
        yield put(saveBusFeeFailure(err.message));
    }
}

function* handleUpdateBusFeeStatus(action: ReturnType<typeof updateBusFeeStatusRequest>) {
    try {
        const { id, status } = action.payload;
        const { error } = yield call(() =>
            supabase.from('bus_fees_setup').update({ status }).eq('id', id)
        );
        if (error) throw error;
        
        yield put(updateBusFeeStatusSuccess());
        message.success('Status updated successfully!');
        
        // We need the organization key to refetch. Get it from the current user.
        // For simplicity, refetching can be triggered by the component if needed, 
        // but here we assume the status switch handled it locally or we refetch for the org.
    } catch (err: any) {
        message.error(`Failed to update status: ${err.message}`);
        yield put(updateBusFeeStatusFailure(err.message));
    }
}

function* handleDeleteBusFee(action: ReturnType<typeof deleteBusFeeRequest>) {
    try {
        const id = action.payload;
        const { error } = yield call(() =>
            supabase.from('bus_fees_setup').delete().eq('id', id)
        );
        if (error) throw error;
        yield put(deleteBusFeeSuccess(id));
        message.success('Bus fee record deleted!');
    } catch (err: any) {
        message.error(`Failed to delete: ${err.message}`);
        yield put(deleteBusFeeFailure(err.message));
    }
}

function* busFeesSaga() {
    yield all([
        takeLatest(fetchBusFeesRequest.type, handleFetchBusFees),
        takeLatest(saveBusFeeRequest.type, handleSaveBusFee),
        takeLatest(updateBusFeeStatusRequest.type, handleUpdateBusFeeStatus),
        takeLatest(deleteBusFeeRequest.type, handleDeleteBusFee),
    ]);
}

export default busFeesSaga;