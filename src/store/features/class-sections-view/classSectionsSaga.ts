
import { call, put, takeLatest, all } from 'redux-saga/effects';
import { supabase } from '../../../service/supabaseClient';
import {
  fetchAllClassSectionsRequest,
  fetchAllClassSectionsSuccess,
  fetchAllClassSectionsFailure,
} from './classSectionsViewSlice';

// This saga fetches ALL allocations for a given organization, used for the overview/report page.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function* handleFetchAllClassSections(action: ReturnType<typeof fetchAllClassSectionsRequest>) {
  try {
    const organizationKey = action.payload;
    const { data, error } = yield call(() =>
      supabase
        .from('class_section_allocations')
        .select('*')
        .eq('organization_key', organizationKey)
        .order('class_name')
        .order('section_name')
        .order('full_name', { ascending: true })
    );
    if (error) throw error;
    yield put(fetchAllClassSectionsSuccess(data));
  } catch (err: any) {
    yield put(fetchAllClassSectionsFailure(err.message));
  }
}

function* classSectionsViewSaga() {
  yield all([
    takeLatest(fetchAllClassSectionsRequest.type, handleFetchAllClassSections),
  ]);
}

export default classSectionsViewSaga;
