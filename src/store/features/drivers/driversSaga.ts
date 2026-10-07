
/* eslint-disable @typescript-eslint/no-explicit-any */
import { call, put, takeLatest, all } from 'redux-saga/effects';
import { supabase } from '../../../service/supabaseClient';
import {
    addDriverRequest,
    addDriverSuccess,
    addDriverFailure,
    fetchDriversRequest,
    fetchDriversSuccess,
    fetchDriversFailure,
    updateDriverRequest,
    updateDriverSuccess,
    updateDriverFailure,
    deleteDriverRequest,
    deleteDriverSuccess,
    deleteDriverFailure,
    type AddDriverPayload,
    type Driver,
    type DeleteDriverPayload,
} from './driversSlice';
import { message } from 'antd';

const BUCKET_NAME = 'driver_documents';

// Helper to upload a file and return its path and URL
function* uploadFile(file: File, organizationKey: string, driverId: string, fileType: string) {
    if (!file) return { filePath: null, publicUrl: null };

    const fileExt = file.name.split('.').pop();
    const fileName = `${fileType}-${Date.now()}.${fileExt}`;
    const filePath = `${organizationKey}/${driverId}/${fileName}`;

    const { error: uploadError } = yield call(() =>
        supabase.storage.from(BUCKET_NAME).upload(filePath, file)
    );
    if (uploadError) throw new Error(`Failed to upload ${fileType}: ${uploadError.message}`);

    const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
    return { filePath, publicUrl: urlData.publicUrl };
}

function* handleDeleteFile(filePath?: string) {
    if (filePath) {
        yield call(() => supabase.storage.from(BUCKET_NAME).remove([filePath]));
    }
}

function* handleFetchDrivers(action: ReturnType<typeof fetchDriversRequest>) {
    try {
        const organizationKey = action.payload;
        const { data, error } = yield call(() =>
            supabase
                .from('drivers')
                .select('*')
                .eq('organization_key', organizationKey)
                .order('created_at', { ascending: false })
        );
        if (error) throw error;
        yield put(fetchDriversSuccess(data));
    } catch (err: any) {
        message.error(`Failed to fetch drivers: ${err.message}`);
        yield put(fetchDriversFailure(err.message));
    }
}

function* handleAddDriver(action: ReturnType<typeof addDriverRequest>) {
    try {
        const { profile_photo_file, id_proof_file, ...driverDetails } = action.payload as AddDriverPayload;
        
        // Step 1: Insert driver text data to get the new record's ID
        const initialPayload = { ...driverDetails, status: 'Active' };
        const { data: newDriverData, error: insertError } = yield call(() => 
            supabase.from('drivers').insert([initialPayload]).select().single()
        );

        if (insertError) throw insertError;
        
        const driverId = newDriverData.id;
        const organizationKey = newDriverData.organization_key;
        let updatePayload: { [key: string]: any } = {};
        
        // Step 2: Upload files using the new driver ID for the path
        if (profile_photo_file) {
            const { publicUrl, filePath } = yield call(uploadFile, profile_photo_file, organizationKey, driverId, 'profile');
            updatePayload.profile_photo_url = publicUrl;
            updatePayload.profile_photo_path = filePath;
        }

        if (id_proof_file) {
            const { publicUrl, filePath } = yield call(uploadFile, id_proof_file, organizationKey, driverId, 'id-proof');
            updatePayload.id_proof_url = publicUrl;
            updatePayload.id_proof_path = filePath;
        }

        // Step 3: Update the driver record with the file URLs and paths
        if (Object.keys(updatePayload).length > 0) {
            const { error: updateError } = yield call(() => 
                supabase.from('drivers').update(updatePayload).eq('id', driverId)
            );
            if (updateError) throw updateError;
        }
        
        yield put(addDriverSuccess());
        message.success('Driver created successfully!');
        yield put(fetchDriversRequest(organizationKey));

    } catch (err: any) {
        message.error(`Failed to create driver: ${err.message}`);
        yield put(addDriverFailure(err.message));
    }
}


function* handleUpdateDriver(action: ReturnType<typeof updateDriverRequest>) {
    try {
        const { id, profile_photo_file, id_proof_file, profile_photo_path, id_proof_path, ...updateData } = action.payload as Driver & { profile_photo_file?: File, id_proof_file?: File };

        const dbUpdatePayload: any = { ...updateData };

        if (profile_photo_file) {
            yield call(handleDeleteFile, profile_photo_path);
            const { publicUrl, filePath } = yield call(uploadFile, profile_photo_file, updateData.organization_key!, id, 'profile');
            dbUpdatePayload.profile_photo_url = publicUrl;
            dbUpdatePayload.profile_photo_path = filePath;
        }

        if (id_proof_file) {
            yield call(handleDeleteFile, id_proof_path);
            const { publicUrl, filePath } = yield call(uploadFile, id_proof_file, updateData.organization_key!, id, 'id-proof');
            dbUpdatePayload.id_proof_url = publicUrl;
            dbUpdatePayload.id_proof_path = filePath;
        }

        const { error } = yield call(() => supabase.from('drivers').update(dbUpdatePayload).eq('id', id));
        if (error) throw error;
        
        yield put(updateDriverSuccess());
        message.success('Driver updated successfully!');
        yield put(fetchDriversRequest(updateData.organization_key!));

    } catch (err: any) {
        message.error(`Failed to update driver: ${err.message}`);
        yield put(updateDriverFailure(err.message));
    }
}

function* handleDeleteDriver(action: ReturnType<typeof deleteDriverRequest>) {
    try {
        const { driverId, photoPath, idProofPath } = action.payload as DeleteDriverPayload;
        
        // Delete files from storage first
        yield call(handleDeleteFile, photoPath);
        yield call(handleDeleteFile, idProofPath);

        // Delete the database record
        const { error } = yield call(() => supabase.from('drivers').delete().eq('id', driverId));
        if (error) throw error;

        yield put(deleteDriverSuccess(driverId));
        message.success('Driver deleted successfully!');
    } catch (err: any) {
        message.error(`Failed to delete driver: ${err.message}`);
        yield put(deleteDriverFailure(err.message));
    }
}


function* driversSaga() {
    yield all([
        takeLatest(addDriverRequest.type, handleAddDriver),
        takeLatest(fetchDriversRequest.type, handleFetchDrivers),
        takeLatest(updateDriverRequest.type, handleUpdateDriver),
        takeLatest(deleteDriverRequest.type, handleDeleteDriver),
    ]);
}

export default driversSaga;
