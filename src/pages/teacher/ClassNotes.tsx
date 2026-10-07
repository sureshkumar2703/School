

import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Card, Table, Typography, Spin, Alert, Empty, Tag, Select, Row, Col, Button, Upload, message, Popconfirm, Space } from 'antd';
import { UploadOutlined, FilePdfOutlined, FileImageOutlined, DeleteOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { RootState, AppDispatch } from '../../store/store';
import { fetchTeacherDashboardDataRequest } from '../../store/features/teacher-dashboard/teacherDashboardSlice';
import { fetchNotesRequest, addNoteRequest, deleteNoteRequest, type ClassNote } from '../../store/features/notes/notesSlice';

const { Title, Text } = Typography;
const { Option } = Select;

const ClassNotes: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const { mappings, loading: mappingsLoading, error: mappingsError } = useSelector((state: RootState) => state.teacherDashboard);
    const { notes, loading: notesLoading, error: notesError } = useSelector((state: RootState) => state.notes);
    
    const [selectedClassKey, setSelectedClassKey] = useState<string | null>(null);
    const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

    useEffect(() => {
        if (user?.organization_key) {
            dispatch(fetchTeacherDashboardDataRequest(user.organization_key));
        }
    }, [dispatch, user?.organization_key]);

    const myAssignments = useMemo(() => {
        if (!mappings || !user?.full_name) return [];
        return mappings.filter(m => m.teacher_name === user.full_name);
    }, [mappings, user?.full_name]);

    const classOptions = useMemo(() => {
        const uniqueClasses = myAssignments.reduce((acc, m) => {
            const key = `${m.class_name}||${m.section_name}||${m.academic_year}`;
            if (!acc.has(key)) {
                acc.set(key, { 
                    key, 
                    label: `${m.class_name} - ${m.section_name} (${m.academic_year})` 
                });
            }
            return acc;
        }, new Map<string, { key: string, label: string }>());

        return Array.from(uniqueClasses.values()).sort((a, b) => b.label.localeCompare(a.label));
    }, [myAssignments]);
    
    const subjectOptions = useMemo(() => {
        if (!selectedClassKey) return [];
        const [className, sectionName, academicYear] = selectedClassKey.split('||');
        return myAssignments
            .filter(m => m.class_name === className && m.section_name === sectionName && m.academic_year === academicYear)
            .map(m => m.subject_name)
            .filter((value, index, self) => self.indexOf(value) === index && value); // Ensure unique and non-empty subjects
    }, [myAssignments, selectedClassKey]);

    useEffect(() => {
        if (selectedClassKey) {
            const defaultSubject = subjectOptions.length > 0 ? subjectOptions[0] : null;
            setSelectedSubject(defaultSubject);
        } else {
            setSelectedSubject(null);
        }
    }, [selectedClassKey, subjectOptions]);


    useEffect(() => {
        if (selectedClassKey && selectedSubject && user?.id) {
            const [className, sectionName, academicYear] = selectedClassKey.split('||');
            dispatch(fetchNotesRequest({
                teacherId: user.id,
                className,
                sectionName,
                academicYear,
                subject: selectedSubject,
            }));
        } else if (!selectedClassKey || !selectedSubject) {
            // Clear notes if selection is removed
            dispatch({ type: 'notes/fetchNotesSuccess', payload: [] });
        }
    }, [dispatch, selectedClassKey, selectedSubject, user?.id]);

    const handleUpload = (file: File) => {
        if (!selectedClassKey || !selectedSubject || !user?.id || !user?.organization_key || !user?.full_name) {
            message.error("Please select a class and subject first, and ensure you are properly logged in.");
            return;
        }
        const [className, sectionName, academicYear] = selectedClassKey.split('||');
        
        dispatch(addNoteRequest({
            teacher_id: user.id,
            teacher_name: user.full_name,
            staff_code: user.staff_code || '',
            organization_key: user.organization_key,
            class_name: className,
            section_name: sectionName,
            academic_year: academicYear,
            subject: selectedSubject,
            file: file
        }));
    };

    const handleDelete = (noteId: string, filePath: string) => {
        dispatch(deleteNoteRequest({ noteId, filePath }));
    };

    const uploadProps: UploadProps = {
        showUploadList: false,
        beforeUpload: (file) => {
            const isPdf = file.type === 'application/pdf';
            const isDoc = file.type === 'application/msword';
            const isDocx = file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            
            if (!isPdf && !isDoc && !isDocx) {
                message.error('You can only upload PDF or Word documents!');
                return Upload.LIST_IGNORE;
            }

            handleUpload(file);
            return false; // Prevent automatic upload
        },
    };
    
    const columns: ColumnsType<ClassNote> = [
        {
            title: 'File Name',
            dataIndex: 'file_name',
            key: 'file_name',
            render: (text, record) => (
                 <a href={record.file_url} target="_blank" rel="noopener noreferrer">
                    <Space>
                        {record.file_url && record.file_url.toLowerCase().endsWith('.pdf') ? <FilePdfOutlined /> : <FileImageOutlined />}
                        {text}
                    </Space>
                </a>
            )
        },
        {
            title: 'File Type',
            dataIndex: 'file_type',
            key: 'file_type',
            render: (type) => <Tag>{type}</Tag>
        },
        {
            title: 'Uploaded At',
            dataIndex: 'created_at',
            key: 'created_at',
            render: (date) => new Date(date).toLocaleString()
        },
        {
            title: 'Action',
            key: 'action',
            render: (_, record) => (
                <Popconfirm title="Are you sure you want to delete this note?" onConfirm={() => handleDelete(record.id, record.file_path)}>
                    <Button danger icon={<DeleteOutlined />} />
                </Popconfirm>
            )
        }
    ];

    const isLoading = mappingsLoading || notesLoading;
    const error = mappingsError || notesError;

    return (
        <Card>
            <Title level={4}>Class Notes Management</Title>
             <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
                Select one of your classes and subjects to upload and manage your course materials.
            </Text>
            
            <Spin spinning={isLoading}>
                 <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    <Col xs={24} md={10}>
                         <Select
                            showSearch
                            placeholder="Select a class and section"
                            style={{ width: '100%' }}
                            value={selectedClassKey}
                            onChange={(value) => { setSelectedClassKey(value); }}
                            allowClear
                        >
                            {classOptions.map(option => (
                                <Option key={option.key} value={option.key}>{option.label}</Option>
                            ))}
                        </Select>
                    </Col>
                    <Col xs={24} md={10}>
                         <Select
                            placeholder="Select a subject"
                            style={{ width: '100%' }}
                            value={selectedSubject}
                            onChange={setSelectedSubject}
                            disabled={!selectedClassKey || subjectOptions.length === 0}
                            allowClear
                        >
                            {subjectOptions.map(subject => (
                                <Option key={subject} value={subject}>{subject}</Option>
                            ))}
                        </Select>
                    </Col>
                     <Col xs={24} md={4}>
                        <Upload {...uploadProps} disabled={!selectedSubject}>
                            <Button icon={<UploadOutlined />} style={{width: '100%'}} disabled={!selectedSubject}>Upload Note</Button>
                        </Upload>
                    </Col>
                 </Row>
                 
                 {error && <Alert message="Error" description={error} type="error" showIcon closable style={{ marginBottom: 16 }} />}

                 {selectedClassKey && selectedSubject ? (
                     <Table
                        columns={columns}
                        dataSource={notes}
                        rowKey="id"
                        bordered
                        loading={notesLoading}
                        scroll={{ x: 'max-content' }}
                     />
                 ) : (
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={<Text>Please select a class and subject to view or upload notes.</Text>}
                    />
                 )}
            </Spin>
        </Card>
    );
};

export default ClassNotes;
