
import { call, put, takeLatest, all } from 'redux-saga/effects';
import { supabase } from '../../../service/supabaseClient';
import {
    fetchRegulationsRequest,
    fetchRegulationsSuccess,
    fetchRegulationsFailure,
    addRegulationRequest,
    addRegulationSuccess,
    addRegulationFailure,
    bulkAddRegulationsRequest,
    bulkAddRegulationsSuccess,
    bulkAddRegulationsFailure,
    updateRegulationRequest,
    updateRegulationSuccess,
    updateRegulationFailure,
    deleteRegulationRequest,
    deleteRegulationSuccess,
    deleteRegulationFailure,
} from './setRegulationSlice';
import { message } from 'antd';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function* handleFetchRegulations(action: ReturnType<typeof fetchRegulationsRequest>): Generator<any, void, any> {
    try {
        const organizationKey = action.payload;
        const { data, error } = yield call(() =>
            supabase
                .from('set_regulations')
                .select('*')
                .eq('organization_key', organizationKey)
                .order('created_at', { ascending: false })
        );
        if (error) throw error;
        yield put(fetchRegulationsSuccess(data));
    } catch (err: any) {
        message.error(`Failed to fetch regulations: ${err.message}`);
        yield put(fetchRegulationsFailure(err.message));
    }
}

function* handleAddRegulation(action: ReturnType<typeof addRegulationRequest>): Generator<any, void, any> {
    try {
        const { error } = yield call(() => supabase.from('set_regulations').insert([action.payload]));
        if (error) {
            if (error.code === '23505') { // Unique constraint violation code
                throw new Error(`A regulation for ${action.payload.class} in ${action.payload.academic_year} already exists.`);
            }
            throw error;
        }
        yield put(addRegulationSuccess());
        message.success('Regulation saved successfully!');
        yield put(fetchRegulationsRequest(action.payload.organization_key));
    } catch (err: any) {
        message.error(err.message || 'Failed to save regulation.');
        yield put(addRegulationFailure(err.message));
    }
}

function* handleBulkAddRegulations(action: ReturnType<typeof bulkAddRegulationsRequest>): Generator<any, void, any> {
    try {
        const regulations = action.payload;
        if (regulations.length === 0) {
            message.info("No regulations to upload.");
            yield put(bulkAddRegulationsSuccess());
            return;
        }

        const { error } = yield call(() => supabase.from('set_regulations').insert(regulations));
        if (error) {
            if (error.code === '23505') {
                 throw new Error(`One or more regulations in the file already exist for the same class and academic year.`);
            }
            throw error;
        }

        yield put(bulkAddRegulationsSuccess());
        message.success(`${regulations.length} regulations uploaded successfully!`);
        yield put(fetchRegulationsRequest(regulations[0].organization_key));
    } catch (err: any) {
        message.error(`Bulk upload failed: ${err.message}`);
        yield put(bulkAddRegulationsFailure(err.message));
    }
}

function* handleUpdateRegulation(action: ReturnType<typeof updateRegulationRequest>): Generator<any, void, any> {
    try {
        const { id, ...updateData } = action.payload;
        const { error } = yield call(() => supabase.from('set_regulations').update(updateData).eq('id', id));
        if (error) throw error;

        yield put(updateRegulationSuccess());
        message.success('Regulation updated successfully!');
        if (action.payload.organization_key) {
            yield put(fetchRegulationsRequest(action.payload.organization_key));
        }
    } catch (err: any) {
        message.error(`Failed to update regulation: ${err.message}`);
        yield put(updateRegulationFailure(err.message));
    }
}

function* handleDeleteRegulation(action: ReturnType<typeof deleteRegulationRequest>): Generator<any, void, any> {
    try {
        const id = action.payload;
        const { data: regulation, error: fetchError } = yield call(() => supabase.from('set_regulations').select('organization_key').eq('id', id).single());
        if (fetchError) throw fetchError;

        const { error: deleteError } = yield call(() => supabase.from('set_regulations').delete().eq('id', id));
        if (deleteError) throw deleteError;

        yield put(deleteRegulationSuccess(id));
        message.success('Regulation deleted successfully!');
        if (regulation?.organization_key) {
             yield put(fetchRegulationsRequest(regulation.organization_key));
        }
    } catch(err: any) {
        message.error(`Failed to delete regulation: ${err.message}`);
        yield put(deleteRegulationFailure(err.message));
    }
}


function* setRegulationSaga() {
  yield all([
    takeLatest(fetchRegulationsRequest.type, handleFetchRegulations),
    takeLatest(addRegulationRequest.type, handleAddRegulation),
    takeLatest(bulkAddRegulationsRequest.type, handleBulkAddRegulations),
    takeLatest(updateRegulationRequest.type, handleUpdateRegulation),
    takeLatest(deleteRegulationRequest.type, handleDeleteRegulation),
  ]);
}

export default setRegulationSaga;
