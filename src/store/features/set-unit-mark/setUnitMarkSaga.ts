

import { call, put, takeLatest, all } from 'redux-saga/effects';
import { supabase } from '../../../service/supabaseClient';
import {
    addUnitMarkRequest,
    addUnitMarkSuccess,
    addUnitMarkFailure,
    fetchUnitMarksRequest,
    fetchUnitMarksSuccess,
    fetchUnitMarksFailure,
    deleteUnitMarkRequest,
    deleteUnitMarkSuccess,
    deleteUnitMarkFailure,
    bulkAddUnitMarksRequest,
    bulkAddUnitMarksSuccess,
    bulkAddUnitMarksFailure,
    updateUnitMarkRequest,
    updateUnitMarkSuccess,
    updateUnitMarkFailure,
} from './setUnitMarkSlice';
import { message } from 'antd';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function* handleAddUnitMark(action: ReturnType<typeof addUnitMarkRequest>): Generator<any, void, any> {
    try {
        const { error } = yield call(() => supabase.from('set_unit').insert([action.payload]));
        if (error) {
             if (error.code === '23505') { // Unique constraint violation
                throw new Error(`The mark type '${action.payload.mark_type}' already exists for Unit ${action.payload.unit} in this subject/class.`);
            }
            throw error;
        }
        yield put(addUnitMarkSuccess());
        message.success('Unit mark details saved successfully!');
        yield put(fetchUnitMarksRequest({
            organizationKey: action.payload.organization_key,
            staffCode: action.payload.staff_code,
        }));
    } catch (err: any) {
        message.error(`Failed to save unit mark: ${err.message}`);
        yield put(addUnitMarkFailure(err.message));
    }
}

function* handleFetchUnitMarks(action: ReturnType<typeof fetchUnitMarksRequest>): Generator<any, void, any> {
    try {
        const { organizationKey, staffCode } = action.payload;
        let query = supabase
            .from('set_unit')
            .select('*')
            .eq('organization_key', organizationKey);

        // If a staffCode is provided, filter by it. Otherwise, fetch all for the org.
        if (staffCode) {
            query = query.eq('staff_code', staffCode);
        }
            
        const { data, error } = yield call(() => query.order('created_at', { ascending: false }));

        if (error) throw error;
        yield put(fetchUnitMarksSuccess(data));
    } catch (err: any) {
        message.error(`Failed to fetch unit marks: ${err.message}`);
        yield put(fetchUnitMarksFailure(err.message));
    }
}

function* handleDeleteUnitMark(action: ReturnType<typeof deleteUnitMarkRequest>): Generator<any, void, any> {
    try {
        const id = action.payload;
        const { error } = yield call(() => supabase.from('set_unit').delete().eq('id', id));
        if (error) throw error;
        yield put(deleteUnitMarkSuccess(id));
        message.success('Unit mark entry deleted successfully!');
    } catch (err: any) {
        message.error(`Failed to delete unit mark: ${err.message}`);
        yield put(deleteUnitMarkFailure(err.message));
    }
}

function* handleBulkAddUnitMarks(action: ReturnType<typeof bulkAddUnitMarksRequest>): Generator<any, void, any> {
    try {
        const data = action.payload;
        const { error } = yield call(() => supabase.from('set_unit').insert(data));
        if (error) throw error;
        yield put(bulkAddUnitMarksSuccess());
        message.success('Bulk upload successful!');
        if (data.length > 0) {
            yield put(fetchUnitMarksRequest({
                organizationKey: data[0].organization_key,
                staffCode: data[0].staff_code,
            }));
        }
    } catch (err: any) {
        message.error(`Bulk upload failed: ${err.message}`);
        yield put(bulkAddUnitMarksFailure(err.message));
    }
}

function* handleUpdateUnitMark(action: ReturnType<typeof updateUnitMarkRequest>): Generator<any, void, any> {
    try {
        const { id, ...updateData } = action.payload;
        const { error } = yield call(() => supabase.from('set_unit').update(updateData).eq('id', id));
        if (error) throw error;
        yield put(updateUnitMarkSuccess());
        message.success('Unit mark entry updated.');
        if (action.payload.organization_key && action.payload.staff_code) {
             yield put(fetchUnitMarksRequest({ 
                organizationKey: action.payload.organization_key,
                staffCode: action.payload.staff_code
            }));
        }
    } catch(err: any) {
        message.error(`Update failed: ${err.message}`);
        yield put(updateUnitMarkFailure(err.message));
    }
}


function* setUnitMarkSaga() {
  yield all([
    takeLatest(addUnitMarkRequest.type, handleAddUnitMark),
    takeLatest(fetchUnitMarksRequest.type, handleFetchUnitMarks),
    takeLatest(deleteUnitMarkRequest.type, handleDeleteUnitMark),
    takeLatest(bulkAddUnitMarksRequest.type, handleBulkAddUnitMarks),
    takeLatest(updateUnitMarkRequest.type, handleUpdateUnitMark),
  ]);
}

export default setUnitMarkSaga;
