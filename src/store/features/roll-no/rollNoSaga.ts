

import { call, put, takeLatest, all, select } from 'redux-saga/effects';
import { supabase } from '../../../service/supabaseClient';
import {
  generateRollNosRequest,
  generateRollNosSuccess,
  generateRollNosFailure,
  type RollNoUpdatePayload,
} from './rollNoSlice';
import { message } from 'antd';
import { fetchAllClassSectionsRequest } from '../class-sections-view/classSectionsViewSlice';
import type { RootState } from '../../store';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function* handleGenerateRollNos(action: ReturnType<typeof generateRollNosRequest>): Generator<any, void, any> {
  try {
    const updates = action.payload;
    const user = yield select((state: RootState) => state.auth.user);

    if (updates.length === 0) {
      yield put(generateRollNosSuccess());
      return;
    }

    if (!user || !user.organization_key) {
        throw new Error("User organization key is missing. Cannot save roll numbers.");
    }

    const updatesToSave = updates.map(u => ({
        id: u.id,
        roll_no: u.roll_no,
        status: u.status,
        organization_key: user.organization_key,
        academic_year: u.academic_year,
        class_name: u.class_name,
        section_name: u.section_name,
        register_no: u.register_no,
        full_name: u.full_name,
    }));
    
    const { error } = yield call(() => 
        supabase.from('class_section_allocations').upsert(updatesToSave, { onConflict: 'organization_key,academic_year,register_no' })
    );
    
    if (error) {
        throw error;
    }

    yield put(generateRollNosSuccess());
    message.success(`${updates.length} roll numbers have been generated and saved successfully.`);
    
    const organizationKey = updates[0].organization_key;
    if(organizationKey) {
        yield put(fetchAllClassSectionsRequest(organizationKey));
    }


  } catch (err: any) {
    message.error(`Failed to save roll numbers: ${err.message}`);
    yield put(generateRollNosFailure(err.message));
  }
}

function* rollNoSaga() {
  yield all([
    takeLatest(generateRollNosRequest.type, handleGenerateRollNos),
  ]);
}

export default rollNoSaga;
