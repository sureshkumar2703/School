
import { call, put, takeLatest, all } from 'redux-saga/effects';
import { supabase } from '../../../service/supabaseClient';
import {
    fetchMainImagesRequest,
    fetchMainImagesSuccess,
    fetchMainImagesFailure,
    uploadMainImagesRequest,
    uploadMainImagesSuccess,
    uploadMainImagesFailure,
    deleteMainImageRequest,
    deleteMainImageSuccess,
    deleteMainImageFailure,
    type MainImage,
    type UploadMainImagesPayload,
    type DeleteMainImagePayload,
} from './mainImagesSlice';
import { message } from 'antd';

const BUCKET_NAME = 'mainimg';

function* handleFetchMainImages(action: ReturnType<typeof fetchMainImagesRequest>) {
    try {
        const organizationKey = action.payload;
        const { data, error } = yield call(() =>
            supabase
                .from('main_img')
                .select('*')
                .eq('organization_key', organizationKey)
                .order('created_at', { ascending: false })
        );
        if (error) throw error;
        yield put(fetchMainImagesSuccess(data));
    } catch (err: any) {
        yield put(fetchMainImagesFailure(err.message));
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function* handleUploadMainImages(action: ReturnType<typeof uploadMainImagesRequest>): Generator<any, void, any> {
    try {
        const { organizationKey, files } = action.payload as UploadMainImagesPayload;

        const uploadPromises = files.map(file => {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
            const filePath = `${organizationKey}/${fileName}`;
            return call(() => supabase.storage.from(BUCKET_NAME).upload(filePath, file));
        });

        const uploadResults = yield all(uploadPromises);

        const dbRecords: Omit<MainImage, 'id' | 'created_at'>[] = [];
        for (const result of uploadResults) {
            if (result.error) {
                throw new Error(`Failed to upload file: ${result.error.message}`);
            }
            const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(result.data.path);
            dbRecords.push({
                organization_key: organizationKey,
                image_url: urlData.publicUrl,
                image_path: result.data.path,
            });
        }
        
        if (dbRecords.length > 0) {
            const { error: dbError } = yield call(() => supabase.from('main_img').insert(dbRecords));
            if (dbError) throw dbError;
        }

        yield put(uploadMainImagesSuccess());
        message.success(`${files.length} image(s) uploaded successfully!`);
        yield put(fetchMainImagesRequest(organizationKey));

    } catch (err: any) {
        yield put(uploadMainImagesFailure(err.message));
        message.error(`Upload failed: ${err.message}`);
    }
}

function* handleDeleteMainImage(action: ReturnType<typeof deleteMainImageRequest>) {
    try {
        const { organizationKey, imageId, imagePath } = action.payload as DeleteMainImagePayload;

        // 1. Delete file from storage
        if (imagePath) {
             const { error: storageError } = yield call(() => supabase.storage.from(BUCKET_NAME).remove([imagePath]));
             if (storageError) console.error(`Failed to delete storage file ${imagePath}:`, storageError.message);
        }
       
        // 2. Delete the record from the database
        const { error: dbError } = yield call(() => supabase.from('main_img').delete().eq('id', imageId));
        if (dbError) throw dbError;

        yield put(deleteMainImageSuccess(imageId));
        message.success('Image deleted successfully!');
    } catch (err: any) {
        yield put(deleteMainImageFailure(err.message));
        message.error(`Failed to delete image: ${err.message}`);
    }
}

function* mainImagesSaga() {
    yield all([
        takeLatest(fetchMainImagesRequest.type, handleFetchMainImages),
        takeLatest(uploadMainImagesRequest.type, handleUploadMainImages),
        takeLatest(deleteMainImageRequest.type, handleDeleteMainImage),
    ]);
}

export default mainImagesSaga;
