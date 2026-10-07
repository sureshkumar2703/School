
/* eslint-disable @typescript-eslint/no-explicit-any */
import { call, put, takeLatest, all, select } from 'redux-saga/effects';
import { supabase } from '../../../service/supabaseClient';
import {
  fetchCircularsRequest,
  fetchCircularsSuccess,
  fetchCircularsFailure,
  addCircularRequest,
  addCircularSuccess,
  addCircularFailure,
  updateCircularRequest,
  updateCircularSuccess,
  updateCircularFailure,
  deleteCircularRequest,
  deleteCircularSuccess,
  deleteCircularFailure,
  type AddCircularPayload,
  type UpdateCircularPayload,
} from './circularsSlice';
import { message } from 'antd';
import type { RootState } from '../../store';
import type { User } from '../auth/authSlice';

const BUCKET_NAME = 'circulars';

// This is the mapping from the internal role name to the audience name stored in the database.
const roleToAudienceMap: { [key: string]: string } = {
    staff: 'Teachers',
    student: 'Students',
    parent: 'Parents',
};

function* handleFetchCirculars(action: ReturnType<typeof fetchCircularsRequest>): Generator<any, void, any> {
  try {
    const organizationKey = action.payload;
    const user: User | null = yield select((state: RootState) => state.auth.user);
    const userRole = user?.role;

    if (!userRole || !organizationKey) {
        yield put(fetchCircularsSuccess([]));
        return;
    }

    let query = supabase
        .from('circulars')
        .select('*')
        .eq('organization_key', organizationKey);

    // Admins and superadmins see all circulars for their org.
    // For other roles, we filter based on the 'audience' array column.
    if (userRole !== 'admin' && userRole !== 'superadmin') {
        const audienceRole = roleToAudienceMap[userRole];
        if (audienceRole) {
            // This now correctly queries for audiences containing "All" OR the mapped role (e.g., "Teachers").
            query = query.or(`audience.cs.{"All"},audience.cs.{"${audienceRole}"}`);
        } else {
            // If the role isn't in our map, only show "All" circulars.
            query = query.contains('audience', ['All']);
        }
    }
    
    query = query.order('issue_date', { ascending: false });

    const { data, error } = yield call(() => query);

    if (error) throw error;
    
    yield put(fetchCircularsSuccess(data || []));

  } catch (err: any) {
    yield put(fetchCircularsFailure(err.message));
  }
}


function* handleAddCircular(action: ReturnType<typeof addCircularRequest>): Generator<any, void, any> {
  try {
    const { file, organization_key, ...circularData } = action.payload as AddCircularPayload;
    const user: User | null = yield select((state: RootState) => state.auth.user);


    if (!organization_key || !user?.id) {
        throw new Error("Organization key or User ID is missing for file upload.");
    }

    const dataToInsert: any = { ...circularData, organization_key };

    if (file) {
      const fileExt = file.name.split('.').pop();
      const fileName = `circular-${Date.now()}.${fileExt}`;
      const filePath = `${organization_key}/${user.id}/${fileName}`;

      const { error: uploadError } = yield call(() =>
        supabase.storage.from(BUCKET_NAME).upload(filePath, file)
      );
      if (uploadError) throw new Error(`Storage Error: ${uploadError.message}`);
      
      const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
      dataToInsert.file_url = urlData.publicUrl;
      dataToInsert.file_path = filePath;
    }

    const { data, error } = yield call(() =>
      supabase.from('circulars').insert(dataToInsert).select().single()
    );

    if (error) throw error;
    yield put(addCircularSuccess(data));
    message.success('Circular published successfully!');
  } catch (err: any) {
    message.error(`Failed to publish circular: ${err.message}`);
    yield put(addCircularFailure(err.message));
  }
}

function* handleUpdateCircular(action: ReturnType<typeof updateCircularRequest>): Generator<any, void, any> {
    try {
        const { id, file, old_file_path, organization_key, ...updateData } = action.payload;
        const finalUpdateData: any = { ...updateData };
        const user: User | null = yield select((state: RootState) => state.auth.user);


        if (!organization_key || !user?.id) {
            throw new Error("Organization key or User ID is missing for file update.");
        }

        if (file) {
            if (old_file_path) {
                yield call(() => supabase.storage.from(BUCKET_NAME).remove([old_file_path]));
            }
            const fileExt = file.name.split('.').pop();
            const fileName = `circular-${Date.now()}.${fileExt}`;
            const filePath = `${organization_key}/${user.id}/${fileName}`;

            yield call(() => supabase.storage.from(BUCKET_NAME).upload(filePath, file));
            
            const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
            finalUpdateData.file_url = urlData.publicUrl;
            finalUpdateData.file_path = filePath;
        }

        const { data, error } = yield call(() =>
            supabase.from('circulars').update(finalUpdateData).eq('id', id).select().single()
        );
        if (error) throw error;

        yield put(updateCircularSuccess(data));
        message.success('Circular updated successfully!');

    } catch (err: any) {
        message.error(`Failed to update circular: ${err.message}`);
        yield put(updateCircularFailure(err.message));
    }
}

function* handleDeleteCircular(action: ReturnType<typeof deleteCircularRequest>) {
    try {
        const { circularId, filePath } = action.payload;
        if (filePath) {
            yield call(() => supabase.storage.from(BUCKET_NAME).remove([filePath]));
        }
        const { error } = yield call(() => supabase.from('circulars').delete().eq('id', circularId));
        if (error) throw error;
        yield put(deleteCircularSuccess(circularId));
        message.success('Circular deleted successfully!');
    } catch (err: any) {
        message.error(`Failed to delete circular: ${err.message}`);
        yield put(deleteCircularFailure(err.message));
    }
}

function* circularsSaga() {
  yield all([
    takeLatest(fetchCircularsRequest.type, handleFetchCirculars),
    takeLatest(addCircularRequest.type, handleAddCircular),
    takeLatest(updateCircularRequest.type, handleUpdateCircular),
    takeLatest(deleteCircularRequest.type, handleDeleteCircular),
  ]);
}

export default circularsSaga;
