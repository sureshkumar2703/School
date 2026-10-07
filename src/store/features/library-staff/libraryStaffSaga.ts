
import { call, put, takeLatest, all } from 'redux-saga/effects';
import { supabase } from '../../../service/supabaseClient';
import {
    fetchStaffRequest,
    fetchStaffSuccess,
    fetchStaffFailure,
    addStaffRequest,
    addStaffSuccess,
    addStaffFailure,
    updateStaffRequest,
    updateStaffSuccess,
    updateStaffFailure,
    deleteStaffRequest,
    deleteStaffSuccess,
    deleteStaffFailure,
    type AddStaffPayload,
    type UpdateStaffPayload,
    type DeleteStaffPayload,
} from './libraryStaffSlice';
import { message } from 'antd';

const BUCKET_NAME = 'library_staff_img';

function* handleFetchStaff(action: ReturnType<typeof fetchStaffRequest>) {
    try {
        const organizationKey = action.payload;
        const { data, error } = yield call(() =>
            supabase
                .from('library_staff')
                .select('*')
                .eq('organization_key', organizationKey)
                .order('created_at', { ascending: false })
        );
        if (error) throw error;
        yield put(fetchStaffSuccess(data));
    } catch (err: any) {
        yield put(fetchStaffFailure(err.message));
        message.error(`Failed to fetch library staff: ${err.message}`);
    }
}

function* handleAddStaff(action: ReturnType<typeof addStaffRequest>) {
    try {
        const { photoFile, ...staffDetails } = action.payload as AddStaffPayload;
        
        if (!staffDetails.email || !staffDetails.password) {
            throw new Error("Email and password are required to create a staff user.");
        }
        
        // Step 1: Create user in Supabase Auth
        const { data: authData, error: authError } = yield call(
            () => supabase.auth.signUp({ email: staffDetails.email!, password: staffDetails.password! })
        );
        if (authError) throw authError;
        if (!authData.user) throw new Error("Could not create authentication user.");
        
        const staffId = authData.user.id;
        const finalStaffDetails: any = { ...staffDetails, id: staffId, status: 'Active' };

        // Step 2: Upload photo if it exists
        if (photoFile) {
            const fileExt = photoFile.name.split('.').pop();
            const fileName = `photo-${staffId}.${fileExt}`;
            const filePath = `${staffDetails.organization_key}/${fileName}`;

            const { error: uploadError } = yield call(
                () => supabase.storage.from(BUCKET_NAME).upload(filePath, photoFile)
            );
            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
            finalStaffDetails.photo_url = urlData.publicUrl;
            finalStaffDetails.photo_path = filePath;
        }
        
        delete finalStaffDetails.photoFile; // Remove the file object before db insert

        // Step 3: Insert into the library_staff table
        const { error: dbError } = yield call(() =>
            supabase.from('library_staff').insert([finalStaffDetails])
        );
        if (dbError) {
             // Attempt to clean up the auth user if the DB insert fails
            console.error("DB insert failed, manual cleanup of auth user may be required:", staffId);
            throw dbError;
        }

        yield put(addStaffSuccess());
        message.success('Library staff member created successfully!');
        yield put(fetchStaffRequest(staffDetails.organization_key));

    } catch (err: any) {
        yield put(addStaffFailure(err.message));
        message.error(`Failed to create library staff: ${err.message}`);
    }
}

function* handleUpdateStaff(action: ReturnType<typeof updateStaffRequest>) {
    try {
        const { details, photoFile, oldPhotoPath } = action.payload as UpdateStaffPayload;
        const { id, organization_key, ...updateData } = details;

        const dbUpdatePayload: any = { ...updateData };
        
        if (photoFile) {
             if (oldPhotoPath) {
                yield call(() => supabase.storage.from(BUCKET_NAME).remove([oldPhotoPath]));
            }
            
            const fileExt = photoFile.name.split('.').pop();
            const fileName = `photo-${id}.${fileExt}`;
            const filePath = `${organization_key}/${fileName}`;

            const { error: uploadError } = yield call(
                () => supabase.storage.from(BUCKET_NAME).upload(filePath, photoFile, { upsert: true })
            );
            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
            dbUpdatePayload.photo_url = urlData.publicUrl;
            dbUpdatePayload.photo_path = filePath;
        }
        
        delete dbUpdatePayload.photoFile;
        
        const { error: dbError } = yield call(() =>
            supabase.from('library_staff').update(dbUpdatePayload).eq('id', id)
        );
        if (dbError) throw dbError;

        yield put(updateStaffSuccess());
        message.success('Staff details updated successfully!');
        if (organization_key) {
            yield put(fetchStaffRequest(organization_key));
        }

    } catch (err: any) {
        message.error(`Failed to update staff: ${err.message}`);
        yield put(updateStaffFailure(err.message));
    }
}


function* handleDeleteStaff(action: ReturnType<typeof deleteStaffRequest>) {
    try {
        const { staffId, photoPath, organizationKey } = action.payload as DeleteStaffPayload;

        // Note: Deleting from auth.users requires admin privileges and is typically done server-side.
        // This saga will only delete from the table and storage.
        
        // 1. Delete photo from storage
        if (photoPath) {
            yield call(() => supabase.storage.from(BUCKET_NAME).remove([photoPath]));
        }

        // 2. Delete from the database table
        const { error: dbError } = yield call(() =>
            supabase.from('library_staff').delete().eq('id', staffId)
        );
        if (dbError) throw dbError;

        yield put(deleteStaffSuccess(staffId));
        message.success('Library staff member deleted. Note: The associated login user may need to be deleted manually from the Supabase dashboard.');

    } catch (err: any) {
        yield put(deleteStaffFailure(err.message));
        message.error(`Failed to delete library staff: ${err.message}`);
    }
}


function* libraryStaffSaga() {
    yield all([
        takeLatest(fetchStaffRequest.type, handleFetchStaff),
        takeLatest(addStaffRequest.type, handleAddStaff),
        takeLatest(updateStaffRequest.type, handleUpdateStaff),
        takeLatest(deleteStaffRequest.type, handleDeleteStaff),
    ]);
}

export default libraryStaffSaga;
