
import { call, put, takeLatest, all } from 'redux-saga/effects';
import { supabase } from '../../../service/supabaseClient';
import {
  fetchAllMappingsRequest,
  fetchAllMappingsSuccess,
  fetchAllMappingsFailure,
} from './classMappingsViewSlice';

function* handleFetchAllMappings(action: ReturnType<typeof fetchAllMappingsRequest>) {
  try {
    const organizationKey = action.payload;
    const { data, error } = yield call(() =>
      supabase
        .from('class_subject_teacher_mapping')
        .select('*')
        .eq('organization_key', organizationKey)
        .order('class_name')
        .order('section_name')
    );
    if (error) throw error;
    yield put(fetchAllMappingsSuccess(data));
  } catch (err: any) {
    yield put(fetchAllMappingsFailure(err.message));
  }
}

function* classMappingsViewSaga() {
  yield all([
    takeLatest(fetchAllMappingsRequest.type, handleFetchAllMappings),
  ]);
}

export default classMappingsViewSaga;
