
import { call, put, takeLatest, all } from 'redux-saga/effects';
import { supabase } from '../../../service/supabaseClient';
import {
    fetchAllQuestionPapersRequest,
    fetchAllQuestionPapersSuccess,
    fetchAllQuestionPapersFailure,
    updateQuestionPaperStatusRequest,
    updateQuestionPaperStatusSuccess,
    updateQuestionPaperStatusFailure,
} from './questionPaperListSlice';
import { message } from 'antd';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function* handleFetchAllQuestionPapers(action: ReturnType<typeof fetchAllQuestionPapersRequest>): Generator<any, void, any> {
    try {
        const organizationKey = action.payload;
        const { data, error } = yield call(() =>
            supabase
                .from('question_paper')
                .select('*')
                .eq('organization_key', organizationKey)
                .order('created_at', { ascending: false })
        );

        if (error) {
            throw error;
        }

        yield put(fetchAllQuestionPapersSuccess(data || []));
    } catch (err: any) {
        message.error(`Failed to fetch question papers: ${err.message}`);
        yield put(fetchAllQuestionPapersFailure(err.message));
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function* handleUpdateQuestionPaperStatus(action: ReturnType<typeof updateQuestionPaperStatusRequest>): Generator<any, void, any> {
    try {
        const { paperId, status, adminName } = action.payload;
        const { data, error } = yield call(() =>
            supabase
                .from('question_paper')
                .update({ status, admin_name: adminName })
                .eq('id', paperId)
                .select()
                .single()
        );
        if (error) throw error;

        yield put(updateQuestionPaperStatusSuccess(data));
        message.success(`Paper status updated to '${status}'.`);
        
    } catch (err: any) {
        message.error(`Failed to update paper status: ${err.message}`);
        yield put(updateQuestionPaperStatusFailure(err.message));
    }
}


function* questionPaperListSaga() {
    yield all([
        takeLatest(fetchAllQuestionPapersRequest.type, handleFetchAllQuestionPapers),
        takeLatest(updateQuestionPaperStatusRequest.type, handleUpdateQuestionPaperStatus),
    ]);
}

export default questionPaperListSaga;
