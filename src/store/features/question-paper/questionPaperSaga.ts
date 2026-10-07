

import { call, put, takeLatest, all } from 'redux-saga/effects';
import { supabase } from '../../../service/supabaseClient';
import {
    saveQuestionPaperRequest,
    saveQuestionPaperSuccess,
    saveQuestionPaperFailure,
    fetchQuestionPapersRequest,
    fetchQuestionPapersSuccess,
    fetchQuestionPapersFailure,
} from './questionPaperSlice';
import { message } from 'antd';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function* handleSaveQuestionPaper(action: ReturnType<typeof saveQuestionPaperRequest>): Generator<any, void, any> {
    try {
        const payload = {
            ...action.payload,
            status: 'Pending',
            admin_name: null,
        };
        const { error } = yield call(() => supabase.from('question_paper').insert([payload]));
        
        if (error) {
            throw error;
        }

        yield put(saveQuestionPaperSuccess());
        message.success('Question paper saved to the database successfully!');
        
        if (action.payload.organization_key) {
            yield put(fetchQuestionPapersRequest(action.payload.organization_key));
        }


    } catch (err: any) {
        message.error(`Failed to save question paper: ${err.message}`);
        yield put(saveQuestionPaperFailure(err.message));
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function* handleFetchQuestionPapers(action: ReturnType<typeof fetchQuestionPapersRequest>): Generator<any, void, any> {
    try {
        const organizationKey = action.payload;
        const { data, error } = yield call(() =>
            supabase
                .from('question_paper')
                .select('academic_year, class_name, section_name, subject')
                .eq('organization_key', organizationKey)
        );

        if (error) throw error;
        yield put(fetchQuestionPapersSuccess(data || []));

    } catch (err: any) {
        message.error(`Failed to fetch existing question papers: ${err.message}`);
        yield put(fetchQuestionPapersFailure(err.message));
    }
}

function* questionPaperSaga() {
    yield all([
        takeLatest(saveQuestionPaperRequest.type, handleSaveQuestionPaper),
        takeLatest(fetchQuestionPapersRequest.type, handleFetchQuestionPapers),
    ]);
}

export default questionPaperSaga;


