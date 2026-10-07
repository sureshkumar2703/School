

import { call, put, takeLatest, all } from 'redux-saga/effects';
import { supabase } from '../../../service/supabaseClient';
import {
    addTemplateRequest,
    addTemplateSuccess,
    addTemplateFailure,
    fetchTemplatesRequest,
    fetchTemplatesSuccess,
    fetchTemplatesFailure,
    deleteTemplateRequest,
    deleteTemplateSuccess,
    deleteTemplateFailure,
    generatePaperRequest,
    generatePaperSuccess,
    generatePaperFailure,
    bulkAddTemplatesRequest,
    bulkAddTemplatesSuccess,
    bulkAddTemplatesFailure,
    type Template,
} from './questionPaperTemplatesSlice';
import { message, Modal } from 'antd';
import type { Question } from '../question-bank/questionBankSlice';
import React from 'react';

function* handleFetchTemplates(action: ReturnType<typeof fetchTemplatesRequest>) {
    try {
        const { organizationKey, staffCode } = action.payload;
        const { data, error } = yield call(() =>
            supabase
                .from('question_paper_templates')
                .select('*')
                .eq('organization_key', organizationKey)
                .eq('staff_code', staffCode)
                .order('created_at', { ascending: false })
        );
        if (error) throw error;
        yield put(fetchTemplatesSuccess(data));
    } catch (err: any) {
        message.error(`Failed to fetch templates: ${err.message}`);
        yield put(fetchTemplatesFailure(err.message));
    }
}

function* handleAddTemplate(action: ReturnType<typeof addTemplateRequest>) {
    try {
        const { total_marks, template_parts } = action.payload;
        
        // Server-side validation
        const calculatedMarks = (template_parts || []).reduce((acc, part) => {
             return acc + (part?.num_questions || 0) * (part?.marks_per_question || 0);
        }, 0);

        if (calculatedMarks !== total_marks) {
            throw new Error(`Calculated marks (${calculatedMarks}) do not match the total marks (${total_marks}).`);
        }

        const { error } = yield call(() => supabase.from('question_paper_templates').insert([action.payload]));
        if (error) throw error;

        yield put(addTemplateSuccess());
        message.success('Template added successfully!');
        yield put(fetchTemplatesRequest({
            organizationKey: action.payload.organization_key,
            staffCode: action.payload.staff_code,
        }));
    } catch (err: any) {
        message.error(`Failed to add template: ${err.message}`);
        yield put(addTemplateFailure(err.message));
    }
}

function* handleDeleteTemplate(action: ReturnType<typeof deleteTemplateRequest>) {
    try {
        const templateId = action.payload;
        const { error } = yield call(() => supabase.from('question_paper_templates').delete().eq('id', templateId));
        if (error) throw error;
        yield put(deleteTemplateSuccess(templateId));
        message.success('Template deleted successfully!');
    } catch (err: any) {
        message.error(`Failed to delete template: ${err.message}`);
        yield put(deleteTemplateFailure(err.message));
    }
}


function* handleGeneratePaper(action: ReturnType<typeof generatePaperRequest>) {
    try {
        const { template } = action.payload;
        const generatedPaper: Record<string, Question[]> = {};
        const usedQuestionIds = new Set<string>();

        // Fetch all available questions for the subject from the question bank
        const { data: allQuestions, error: fetchError } = yield call(() =>
            supabase
                .from('question_bank')
                .select('*')
                .eq('organization_key', template.organization_key)
                .eq('staff_code', template.staff_code)
                .eq('subject_code', template.subject_code)
                .eq('class', template.class_name)
                .eq('section', template.section_name)
                .eq('academic_year', template.academic_year)
        );

        if (fetchError) throw fetchError;
        
        for (const part of template.template_parts) {
            const requiredMarks = part.marks_per_question;
            const requiredCount = part.num_questions;
            const requiredUnitName = part.unit_name; // This can be a string or undefined

            // Find the unit number from the defined units in the template
            const unit = template.units?.find(u => u.unit_name === requiredUnitName);
            const requiredUnitNumber = unit ? Number(unit.unit_name) : undefined;


            // Filter questions that match the criteria for the current part and haven't been used yet
            const availableQuestions = allQuestions.filter((q: Question) => {
                const marksMatch = q.question_type === requiredMarks;
                // If a unit is specified, it must match. If not specified, the question is eligible regardless of its unit.
                const unitMatch = requiredUnitNumber !== undefined ? q.unit === requiredUnitNumber : true;
                const notUsed = !usedQuestionIds.has(q.id);
                
                return marksMatch && unitMatch && notUsed;
            });

            if (availableQuestions.length < requiredCount) {
                const unitText = requiredUnitName ? `in Unit ${requiredUnitName}` : `across all units`;
                throw new Error(`Not enough questions ${unitText} for Part ${part.part_name}. Found ${availableQuestions.length}, but need ${requiredCount} questions of ${requiredMarks} marks.`);
            }

            // Shuffle and pick the required number of questions
            const shuffled = availableQuestions.sort(() => 0.5 - Math.random());
            const selectedQuestions = shuffled.slice(0, requiredCount);

            // Add to the paper and mark as used
            generatedPaper[part.part_name] = selectedQuestions;
            selectedQuestions.forEach((q: Question) => usedQuestionIds.add(q.id));
        }

        yield put(generatePaperSuccess({ template, paper: generatedPaper }));
        message.success("Question paper generated successfully! Your PDF will download shortly.");

    } catch (err: any) {
        message.error(`Paper Generation Failed: ${err.message}`);
        yield put(generatePaperFailure(err.message));
    }
}

function* handleBulkAddTemplates(action: ReturnType<typeof bulkAddTemplatesRequest>) {
    const templates = action.payload;
    let successCount = 0;
    const failures: { name: string; error: string }[] = [];

    for (const template of templates) {
        try {
            const { error } = yield call(() => supabase.from('question_paper_templates').insert([template]));
            if (error) throw error;
            successCount++;
        } catch (err: any) {
            failures.push({ name: template.template_name, error: err.message });
        }
    }
    
    if (successCount > 0) {
        yield put(fetchTemplatesRequest({
            organizationKey: templates[0].organization_key,
            staffCode: templates[0].staff_code,
        }));
    }

    yield put(bulkAddTemplatesSuccess());

     let modalMessage = ``;
    if (successCount > 0) {
        modalMessage += `Successfully uploaded ${successCount} new templates.\n\n`;
    }
    if (failures.length > 0) {
        const failureContent = failures.map((f, i) => `${i + 1}. ${f.name}: ${f.error}`).join('\n');
        modalMessage += `Failed to upload ${failures.length} templates:\n${failureContent}`;
    }

    if(modalMessage) {
        Modal.info({
            title: 'Bulk Upload Complete',
            content: React.createElement('pre', { style: { whiteSpace: 'pre-wrap' } }, modalMessage),
            width: 600,
        });
    }
}


function* questionPaperTemplatesSaga() {
    yield all([
        takeLatest(fetchTemplatesRequest.type, handleFetchTemplates),
        takeLatest(addTemplateRequest.type, handleAddTemplate),
        takeLatest(deleteTemplateRequest.type, handleDeleteTemplate),
        takeLatest(generatePaperRequest.type, handleGeneratePaper),
        takeLatest(bulkAddTemplatesRequest.type, handleBulkAddTemplates),
    ]);
}

export default questionPaperTemplatesSaga;
