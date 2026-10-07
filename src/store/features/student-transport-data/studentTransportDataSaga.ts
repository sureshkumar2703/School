
/* eslint-disable @typescript-eslint/no-explicit-any */
import { call, put, takeLatest, all } from 'redux-saga/effects';
import { supabase } from '../../../service/supabaseClient';
import {
    createStudentTransportDataRequest,
    createStudentTransportDataSuccess,
    createStudentTransportDataFailure,
    fetchAllStudentTransportDataRequest,
    fetchAllStudentTransportDataSuccess,
    fetchAllStudentTransportDataFailure,
    updateStudentBusFeesRequest,
    updateStudentBusFeesSuccess,
    updateStudentBusFeesFailure,
    type UpdateBusFeesPayload,
} from './studentTransportDataSlice';
import { message } from 'antd';

function* handleCreateStudentTransportData(action: ReturnType<typeof createStudentTransportDataRequest>) {
    try {
        const dataToSave = action.payload;
        if (dataToSave.length === 0) {
            yield put(createStudentTransportDataSuccess());
            return;
        }
        
        const { error } = yield call(() => supabase.from('student_transport_data').insert(dataToSave));
        if (error) {
            throw error;
        }

        yield put(createStudentTransportDataSuccess());
        // Message is now handled in the component for more context
        yield put(fetchAllStudentTransportDataRequest(dataToSave[0].organization_key));
        
    } catch (err: any) {
        message.error(`Failed to save student transport data: ${err.message}`);
        yield put(createStudentTransportDataFailure(err.message));
    }
}

function* handleFetchAllStudentTransportData(action: ReturnType<typeof fetchAllStudentTransportDataRequest>) {
    try {
        const organizationKey = action.payload;
        const { data, error } = yield call(() =>
            supabase
                .from('student_transport_data')
                .select('*')
                .eq('organization_key', organizationKey)
        );
        if (error) throw error;
        yield put(fetchAllStudentTransportDataSuccess(data));
    } catch(err: any) {
        message.error(`Failed to fetch student transport records: ${err.message}`);
        yield put(fetchAllStudentTransportDataFailure(err.message));
    }
}

function* handleUpdateStudentBusFees(action: ReturnType<typeof updateStudentBusFeesRequest>) {
    try {
        const { studentIds, busFees, academicYear } = action.payload as UpdateBusFeesPayload;
        const { error } = yield call(() => 
            supabase
                .from('student_transport_data')
                .update({ bus_fees: busFees })
                .in('student_id', studentIds)
                .eq('academic_year', academicYear)
        );

        if (error) throw error;

        yield put(updateStudentBusFeesSuccess());
        message.success("Bus fees updated successfully for selected students.");

    } catch (err: any) {
        message.error(`Failed to update bus fees: ${err.message}`);
        yield put(updateStudentBusFeesFailure(err.message));
    }
}


function* studentTransportDataSaga() {
    yield all([
        takeLatest(createStudentTransportDataRequest.type, handleCreateStudentTransportData),
        takeLatest(fetchAllStudentTransportDataRequest.type, handleFetchAllStudentTransportData),
        takeLatest(updateStudentBusFeesRequest.type, handleUpdateStudentBusFees),
    ]);
}

export default studentTransportDataSaga;
