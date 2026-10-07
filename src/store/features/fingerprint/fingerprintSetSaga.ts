
/* eslint-disable @typescript-eslint/no-explicit-any */
import { call, put, takeLatest, all } from 'redux-saga/effects';
import { supabase } from '../../../service/supabaseClient';
import {
    saveFingerprintsRequest,
    saveFingerprintsSuccess,
    saveFingerprintsFailure,
} from './fingerprintSetSlice';
import { message } from 'antd';

function* handleSaveFingerprints(action: ReturnType<typeof saveFingerprintsRequest>) {
    try {
        const payload = action.payload;
        // In a real application, you would send this payload to a secure backend
        // which then communicates with the fingerprint hardware driver/agent.
        // For this simulation, we'll just log it and show a success message.
        console.log("Simulating save of fingerprint data:", payload);
        
        // Simulate an API call
        yield call(() => new Promise(resolve => setTimeout(resolve, 500)));

        yield put(saveFingerprintsSuccess());
        message.success('Fingerprint data saved successfully (simulation).');

    } catch (err: any) {
        message.error(`Failed to save fingerprint data: ${err.message}`);
        yield put(saveFingerprintsFailure(err.message));
    }
}


function* fingerprintSetSaga() {
  yield all([
    takeLatest(saveFingerprintsRequest.type, handleSaveFingerprints),
  ]);
}

export default fingerprintSetSaga;
