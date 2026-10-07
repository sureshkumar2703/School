
import React, { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Card, Typography, Spin, Alert, Empty, Tag, Select, Row, Col, Button, Space, Modal, message } from 'antd';
import { EyeOutlined, FilePdfOutlined, FileImageOutlined, FileOutlined } from '@ant-design/icons';
import type { RootState, AppDispatch } from '../../store/store';
import { fetchStudentNotesRequest, type StudentNote } from '../../store/features/student-notes/studentNotesSlice';
import { supabase } from '../../service/supabaseClient';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

const NoteCard = ({ note, onPreview }: { note: StudentNote; onPreview: (note: StudentNote) => void; }) => {
    const isPdf = note.file_name.toLowerCase().endsWith('.pdf');
    const isImage = /\.(jpg|jpeg|png|gif)$/i.test(note.file_name);

    const getIcon = () => {
        if (isPdf) return <FilePdfOutlined style={{ fontSize: '36px', color: '#D32F2F' }} />;
        if (isImage) return <FileImageOutlined style={{ fontSize: '36px', color: '#1E88E5' }} />;
        return <FileOutlined style={{ fontSize: '36px' }} />;
    };

    return (
        <Card hoverable style={{ borderRadius: '8px', overflow: 'hidden' }} onClick={() => onPreview(note)}>
            <Row align="middle" gutter={16}>
                <Col>
                    {getIcon()}
                </Col>
                <Col style={{ flex: 1, minWidth: 0 }}>
                    <Text strong ellipsis={{ tooltip: note.file_name }}>
                        {note.file_name}
                    </Text>
                    <Text type="secondary" style={{ display: 'block', fontSize: '12px' }}>
                        by {note.teacher_name}
                    </Text>
                     <Text type="secondary" style={{ display: 'block', fontSize: '12px' }}>
                        {dayjs(note.created_at).format('MMM D, YYYY')}
                    </Text>
                </Col>
                 <Col>
                    <Button type="primary" shape="circle" icon={<EyeOutlined />} />
                </Col>
            </Row>
        </Card>
    );
};

const StudentMyNotes: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const { notes, loading, error } = useSelector((state: RootState) => state.studentNotes);
    const [section, setSection] = useState<string | null>(null);
    const [loadingSection, setLoadingSection] = useState(false);
    const [previewingNote, setPreviewingNote] = useState<StudentNote | null>(null);

    // Effect to fetch the student's current section
    useEffect(() => {
        if (user?.organization_key && user?.register_no && user?.academic_year) {
            const fetchSection = async () => {
                setLoadingSection(true);
                try {
                    const { data, error: sectionError } = await supabase
                        .from('class_section_allocations')
                        .select('section_name')
                        .eq('organization_key', user.organization_key)
                        .eq('register_no', user.register_no)
                        .eq('academic_year', user.academic_year)
                        .single();
                    
                    if (sectionError && sectionError.code !== 'PGRST116') {
                        throw sectionError;
                    }
                    if (data) {
                        setSection(data.section_name);
                    }
                } catch(err: any) {
                    console.error("Error fetching student section:", err.message);
                    message.error("Could not determine your class section.");
                } finally {
                    setLoadingSection(false);
                }
            };
            fetchSection();
        }
    }, [user]);

    // Effect to fetch notes once all details are available
    useEffect(() => {
        if (user?.organization_key && user?.admitted_class && section && user?.academic_year) {
            dispatch(fetchStudentNotesRequest({
                organizationKey: user.organization_key,
                className: user.admitted_class,
                sectionName: section,
                academicYear: user.academic_year,
            }));
        }
    }, [dispatch, user, section]);

    const uniqueSubjects = useMemo(() => {
        return [...new Set(notes.map(note => note.subject))];
    }, [notes]);
    
    const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

    const filteredNotes = useMemo(() => {
        if (!selectedSubject) {
            return notes;
        }
        return notes.filter(note => note.subject === selectedSubject);
    }, [notes, selectedSubject]);

    const isLoading = loading || loadingSection;
    
    const handlePreview = (note: StudentNote) => {
        setPreviewingNote(note);
    };

    const handleClosePreview = () => {
        setPreviewingNote(null);
    };

    return (
        <>
            <Card>
                <Title level={4}>My Class Notes</Title>
                <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
                    Here you can find all the notes and materials uploaded by your teachers.
                </Text>

                <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
                    <Col>
                        {user && section && (
                            <Space wrap>
                                <Tag color="geekblue">Class: {user.admitted_class} - {section}</Tag>
                                <Tag color="geekblue">Year: {user.academic_year}</Tag>
                            </Space>
                        )}
                    </Col>
                    <Col>
                        <Select
                            showSearch
                            allowClear
                            placeholder="Filter by Subject"
                            style={{ width: 250 }}
                            value={selectedSubject}
                            onChange={setSelectedSubject}
                        >
                            {uniqueSubjects.map(subject => (
                                <Option key={subject} value={subject}>{subject}</Option>
                            ))}
                        </Select>
                    </Col>
                </Row>

                <Spin spinning={isLoading}>
                    {error && <Alert message="Error" description={error} type="error" showIcon />}
                    {!isLoading && !error && filteredNotes.length > 0 ? (
                        <Row gutter={[16, 16]}>
                            {filteredNotes.map(note => (
                                <Col xs={24} sm={12} md={8} key={note.id}>
                                    <NoteCard note={note} onPreview={handlePreview} />
                                </Col>
                            ))}
                        </Row>
                    ) : (
                       !isLoading && !error && (
                            <Empty
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                description={
                                    <Text>
                                        {notes.length === 0 
                                            ? "No notes have been uploaded for your class yet."
                                            : "No notes match the selected subject."
                                        }
                                    </Text>
                                }
                            />
                       )
                    )}
                </Spin>
            </Card>
            
            <Modal
                title={previewingNote?.file_name}
                open={!!previewingNote}
                onCancel={handleClosePreview}
                footer={[<Button key="close" onClick={handleClosePreview}>Close</Button>]}
                width="90vw"
                style={{ top: 20 }}
                bodyStyle={{ height: '80vh', overflow: 'hidden', padding: 0 }}
            >
                {previewingNote && (
                    <object
                        data={previewingNote.file_url}
                        type={previewingNote.file_type || 'application/pdf'}
                        width="100%"
                        height="100%"
                        aria-label={previewingNote.file_name}
                    >
                        <div style={{ padding: '24px' }}>
                            <Text>It appears your browser does not support embedding this file type.</Text>
                             <br />
                             <a href={previewingNote.file_url} download={previewingNote.file_name} target="_blank" rel="noopener noreferrer">
                                <Button type="link">Click here to download the file instead.</Button>
                            </a>
                        </div>
                    </object>
                )}
            </Modal>
        </>
    );
};

export default StudentMyNotes;
