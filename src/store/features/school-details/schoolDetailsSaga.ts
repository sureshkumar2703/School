
/* eslint-disable @typescript-eslint/no-explicit-any */
import { call, put, takeLatest, all, select } from 'redux-saga/effects';
import { supabase } from '../../../service/supabaseClient';
import {
    fetchSchoolDetailsRequest,
    fetchSchoolDetailsSuccess,
    fetchSchoolDetailsFailure,
    saveSchoolDetailsRequest,
    saveSchoolDetailsSuccess,
    saveSchoolDetailsFailure,
    type SaveDetailsPayload,
} from './schoolDetailsSlice';
import { message } from 'antd';
import type { RootState } from '../../store';

const BUCKET_NAME = 'schooldetails_documents';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function* handleFetchSchoolDetails(action: ReturnType<typeof fetchSchoolDetailsRequest>): Generator<any, void, any> {
    try {
        const organizationKey = action.payload;
        const { data, error } = yield call(() =>
            supabase
                .from('school_details')
                .select('*')
                .eq('organization_key', organizationKey)
                .single()
        );
        
        // It's okay if no row is found, it just means details haven't been created yet.
        if (error && error.code !== 'PGRST116') { 
            throw error;
        }

        yield put(fetchSchoolDetailsSuccess(data));
    } catch (err: any) {
        yield put(fetchSchoolDetailsFailure(err.message));
        message.error(`Failed to fetch school details: ${err.message}`);
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function* handleSaveSchoolDetails(action: ReturnType<typeof saveSchoolDetailsRequest>): Generator<any, void, any> {
    try {
        const { details, logoFile } = action.payload as SaveDetailsPayload;
        const existingDetails = yield select((state: RootState) => state.schoolDetails.details);

        const detailsToSave: any = { ...details };

        if (logoFile) {
            // A new logo is being uploaded
            const fileExt = logoFile.name.split('.').pop();
            const fileName = `logo-${Date.now()}.${fileExt}`;
            const filePath = `${details.organization_key}/${fileName}`;

            // If an old logo exists, remove it first
            if (existingDetails?.logo_path) {
                yield call(() => supabase.storage.from(BUCKET_NAME).remove([existingDetails.logo_path]));
            }
            
            // Upload the new logo
            const { error: uploadError } = yield call(() =>
                supabase.storage.from(BUCKET_NAME).upload(filePath, logoFile)
            );
            if (uploadError) throw uploadError;

            // Get the new public URL
            const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
            detailsToSave.logo_url = urlData.publicUrl;
            detailsToSave.logo_path = filePath;
        } else if (!logoFile && !details.logo_url && existingDetails?.logo_path) {
             // File was removed from UI, but not replaced
            yield call(() => supabase.storage.from(BUCKET_NAME).remove([existingDetails.logo_path]));
            detailsToSave.logo_url = undefined;
            detailsToSave.logo_path = undefined;
        }


        const { data, error } = yield call(() =>
            supabase
                .from('school_details')
                .upsert(detailsToSave, { onConflict: 'organization_key' })
                .select()
                .single()
        );

        if (error) {
            throw error;
        }

        yield put(saveSchoolDetailsSuccess(data));
        message.success('School details saved successfully!');
    } catch (err: any) {
        yield put(saveSchoolDetailsFailure(err.message));
        message.error(`Failed to save school details: ${err.message}`);
    }
}

function* schoolDetailsSaga() {
    yield all([
        takeLatest(fetchSchoolDetailsRequest.type, handleFetchSchoolDetails),
        takeLatest(saveSchoolDetailsRequest.type, handleSaveSchoolDetails),
    ]);
}

export default schoolDetailsSaga;
