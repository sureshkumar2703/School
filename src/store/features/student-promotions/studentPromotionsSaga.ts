

/* eslint-disable @typescript-eslint/no-explicit-any */
import { call, put, takeLatest, all, select } from 'redux-saga/effects';
import { supabase } from '../../../service/supabaseClient';
import {
  promoteStudentsRequest,
  promoteStudentsSuccess,
  promoteStudentsFailure,
} from './studentPromotionsSlice';
import { fetchStudentsRequest } from '../students/studentsSlice';
import type { RootState } from '../../store';

function* handlePromoteStudents(action: ReturnType<typeof promoteStudentsRequest>): Generator<any, void, any> {
  try {
    const { studentIds, newClass, newAcademicYear } = action.payload;
    const { error } = yield call(() =>
      supabase
        .from('students')
        .update({ admitted_class: newClass, academic_year: newAcademicYear })
        .in('id', studentIds)
    );
    if (error) throw error;
    yield put(promoteStudentsSuccess());
    const user = yield select((state: RootState) => state.auth.user);
    if (user?.organization_key) {
        yield put(fetchStudentsRequest(user.organization_key)); // Refetch students to update the list
    }
  } catch (err: any) {
    yield put(promoteStudentsFailure(err.message));
  }
}

function* studentPromotionsSaga() {
  yield all([
    takeLatest(promoteStudentsRequest.type, handlePromoteStudents),
  ]);
}

export default studentPromotionsSaga;

