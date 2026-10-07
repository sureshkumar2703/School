
import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Button, Row, Col, Card, Typography, Space, Modal, Form, Input, Table, message, Alert, Spin, Popconfirm, Switch, Select } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { RootState, AppDispatch } from '../../store/store';
import { addSubjectRequest, fetchSubjectsRequest, updateSubjectRequest, deleteSubjectRequest, type Subject } from '../../store/features/subjects/subjectsSlice';
import { addClassRequest, fetchClassesRequest, updateClassRequest, deleteClassRequest, type Class } from '../../store/features/classes/classesSlice';

const { Title } = Typography;
const { Search } = Input;
const { Option } = Select;

const generateCode = (prefix: 'S' | 'C') => {
    const randomNumber = Math.floor(10000 + Math.random() * 90000);
    return `${prefix}${randomNumber}`;
};

const SubjectCreate: React.FC = () => {
    const [isSubjectModalVisible, setIsSubjectModalVisible] = useState(false);
    const [isClassModalVisible, setIsClassModalVisible] = useState(false);
    const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
    const [editingClass, setEditingClass] = useState<Class | null>(null);
    const [subjectSearchTerm, setSubjectSearchTerm] = useState('');
    const [classSearchTerm, setClassSearchTerm] = useState('');

    const [subjectForm] = Form.useForm();
    const [classForm] = Form.useForm();
    const dispatch: AppDispatch = useDispatch();

    const { subjects, loading: subjectsLoading, error: subjectsError } = useSelector((state: RootState) => state.subjects);
    const { classes, loading: classesLoading, error: classesError } = useSelector((state: RootState) => state.classes);
    const { user } = useSelector((state: RootState) => state.auth);
    
    useEffect(() => {
        if(user?.organization_key) {
            dispatch(fetchSubjectsRequest());
            dispatch(fetchClassesRequest());
        }
    }, [dispatch, user?.organization_key]);

    // Subject Modal Logic
    const showSubjectModal = (subject: Subject | null = null) => {
        setEditingSubject(subject);
        if (subject) {
            subjectForm.setFieldsValue(subject);
        } else {
            subjectForm.setFieldsValue({ subject_code: generateCode('S'), subject_name: '', status: 'Active' });
        }
        setIsSubjectModalVisible(true);
    };

    const handleSubjectOk = () => {
        subjectForm.validateFields()
            .then(values => {
                if (editingSubject) {
                    dispatch(updateSubjectRequest({ ...editingSubject, ...values }));
                    message.success('Subject updated successfully!');
                } else {
                    const payload = { ...values, organization_key: user?.organization_key };
                    dispatch(addSubjectRequest(payload));
                    message.success('Subject created successfully!');
                }
                subjectForm.resetFields();
                setIsSubjectModalVisible(false);
                setEditingSubject(null);
            })
            .catch(info => {
                console.log('Validate Failed:', info);
            });
    };

    const handleSubjectCancel = () => {
        setIsSubjectModalVisible(false);
        setEditingSubject(null);
        subjectForm.resetFields();
    };

    const handleDeleteSubject = (id: string) => {
        dispatch(deleteSubjectRequest(id));
        message.success('Subject deleted successfully!');
    };
    
    const handleSubjectStatusChange = (checked: boolean, record: Subject) => {
        const newStatus = checked ? 'Active' : 'Inactive';
        dispatch(updateSubjectRequest({ ...record, status: newStatus }));
    };

    // Class Modal Logic
    const showClassModal = (cls: Class | null = null) => {
        setEditingClass(cls);
        if (cls) {
            classForm.setFieldsValue(cls);
        } else {
            classForm.setFieldsValue({ class_code: generateCode('C'), class_name: '', section: '', status: 'Active' });
        }
        setIsClassModalVisible(true);
    };

    const handleClassOk = () => {
        classForm.validateFields()
            .then(values => {
                const sectionValue = values.section ? String(values.section).toUpperCase() : '';
                const finalValues = { ...values, section: sectionValue };
                
                const isDuplicate = classes.some(
                    c => c.class_name === finalValues.class_name && 
                         c.section === finalValues.section &&
                         c.id !== editingClass?.id // Exclude the current item when editing
                );

                if (isDuplicate) {
                    message.error(`The class "${finalValues.class_name} - Section ${finalValues.section}" already exists.`);
                    return;
                }

                if (editingClass) {
                    dispatch(updateClassRequest({ ...editingClass, ...finalValues }));
                    message.success('Class updated successfully!');
                } else {
                    const payload = { ...finalValues, organization_key: user?.organization_key };
                    dispatch(addClassRequest(payload));
                    message.success('Class created successfully!');
                }
                classForm.resetFields();
                setIsClassModalVisible(false);
                setEditingClass(null);
            })
            .catch(info => {
                console.log('Validate Failed:', info);
            });
    };


    const handleClassCancel = () => {
        setIsClassModalVisible(false);
        setEditingClass(null);
        classForm.resetFields();
    };

    const handleDeleteClass = (id: string) => {
        dispatch(deleteClassRequest(id));
        message.success('Class deleted successfully!');
    };

    const handleClassStatusChange = (checked: boolean, record: Class) => {
        const newStatus = checked ? 'Active' : 'Inactive';
        dispatch(updateClassRequest({ ...record, status: newStatus }));
    };
    
    const subjectColumns = [
        { title: 'Subject Code', dataIndex: 'subject_code', key: 'subject_code' },
        { title: 'Subject Name', dataIndex: 'subject_name', key: 'subject_name' },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status: string, record: Subject) => (
                <Switch
                    checkedChildren="Active"
                    unCheckedChildren="Inactive"
                    checked={status === 'Active'}
                    onChange={(checked) => handleSubjectStatusChange(checked, record)}
                />
            )
        },
        {
            title: 'Action',
            key: 'action',
            render: (_: any, record: Subject) => (
                <Space size="middle">
                    <Button icon={<EditOutlined />} onClick={() => showSubjectModal(record)} />
                    <Popconfirm title="Sure to delete?" onConfirm={() => handleDeleteSubject(record.id)}>
                        <Button icon={<DeleteOutlined />} danger />
                    </Popconfirm>
                </Space>
            ),
        },
    ];
    
    const classColumns = [
        { title: 'Class Code', dataIndex: 'class_code', key: 'class_code' },
        { title: 'Class', dataIndex: 'class_name', key: 'class_name' },
        { title: 'Section', dataIndex: 'section', key: 'section' },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status: string, record: Class) => (
                <Switch
                    checkedChildren="Active"
                    unCheckedChildren="Inactive"
                    checked={status === 'Active'}
                    onChange={(checked) => handleClassStatusChange(checked, record)}
                />
            )
        },
        {
            title: 'Action',
            key: 'action',
            render: (_: any, record: Class) => (
                <Space size="middle">
                    <Button icon={<EditOutlined />} onClick={() => showClassModal(record)} />
                    <Popconfirm title="Sure to delete?" onConfirm={() => handleDeleteClass(record.id)}>
                        <Button icon={<DeleteOutlined />} danger />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    const isLoading = subjectsLoading || classesLoading;

    const filteredSubjects = subjects.filter(subject => 
        (subject.subject_name?.toLowerCase().includes(subjectSearchTerm.toLowerCase()) ||
        subject.subject_code?.toLowerCase().includes(subjectSearchTerm.toLowerCase())) &&
        subject.organization_key === user?.organization_key
    );

    const filteredClasses = classes.filter(cls =>
        (cls.class_name?.toLowerCase().includes(classSearchTerm.toLowerCase()) ||
        cls.class_code?.toLowerCase().includes(classSearchTerm.toLowerCase())) &&
        cls.organization_key === user?.organization_key
    );

    return (
        <>
            <Card>
                <Row justify="space-between" align="middle" gutter={[16, 16]}>
                    <Col>
                        <Title level={4} style={{ margin: 0 }}>Class & Subject Management</Title>
                    </Col>
                    <Col>
                        <Space wrap>
                            <Button type="primary" icon={<PlusOutlined />} onClick={() => showSubjectModal()}>
                                Create Subject
                            </Button>
                            <Button type="primary" icon={<PlusOutlined />} onClick={() => showClassModal()}>
                                Create Class
                            </Button>
                        </Space>
                    </Col>
                </Row>
            </Card>

            <Spin spinning={isLoading}>
                <Row gutter={16} style={{ marginTop: 24 }}>
                    <Col xs={24} lg={12}>
                        <Card title="Subjects List">
                            <Search
                                placeholder="Search by Subject Code or Name"
                                onChange={e => setSubjectSearchTerm(e.target.value)}
                                style={{ marginBottom: 16 }}
                            />
                            {subjectsError && <Alert message="Error" description={subjectsError} type="error" showIcon closable style={{ marginBottom: 16 }} />}
                            <Table columns={subjectColumns} dataSource={filteredSubjects} rowKey="id" bordered scroll={{ x: 'max-content' }} />
                        </Card>
                    </Col>
                    <Col xs={24} lg={12} className="class-list-col">
                        <Card title="Classes List">
                            <Search
                                placeholder="Search by Class Code or Name"
                                onChange={e => setClassSearchTerm(e.target.value)}
                                style={{ marginBottom: 16 }}
                            />
                             {classesError && <Alert message="Error" description={classesError} type="error" showIcon closable style={{ marginBottom: 16 }} />}
                            <Table columns={classColumns} dataSource={filteredClasses} rowKey="id" bordered scroll={{ x: 'max-content' }} />
                        </Card>
                    </Col>
                </Row>
                 <style>{`
                    @media (max-width: 991px) {
                        .class-list-col {
                            margin-top: 16px;
                        }
                    }
                `}</style>
            </Spin>

            {/* Subject Modal */}
            <Modal title={editingSubject ? "Edit Subject" : "Create Subject"} open={isSubjectModalVisible} onOk={handleSubjectOk} onCancel={handleSubjectCancel} confirmLoading={subjectsLoading} destroyOnHidden>
                <Form form={subjectForm} layout="vertical" name="subject_form">
                    <Form.Item name="subject_code" label="Subject Code" rules={[{ required: true }]}>
                        <Input disabled />
                    </Form.Item>
                    <Form.Item name="subject_name" label="Subject Name" rules={[{ required: true, message: 'Please input the subject name!' }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="status" label="Status" rules={[{ required: true }]}>
                        <Select>
                            <Option value="Active">Active</Option>
                            <Option value="Inactive">Inactive</Option>
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>

            {/* Class Modal */}
            <Modal title={editingClass ? "Edit Class" : "Create Class"} open={isClassModalVisible} onOk={handleClassOk} onCancel={handleClassCancel} confirmLoading={classesLoading} destroyOnHidden>
                <Form form={classForm} layout="vertical" name="class_form">
                    <Form.Item name="class_code" label="Class Code" rules={[{ required: true }]}>
                        <Input disabled />
                    </Form.Item>
                    <Form.Item name="class_name" label="Class" rules={[{ required: true, message: 'Please input the class!' }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="section" label="Section" normalize={value => value ? value.toUpperCase() : ''}>
                        <Input placeholder="e.g., A, B, C" />
                    </Form.Item>
                    <Form.Item name="status" label="Status" rules={[{ required: true }]}>
                        <Select>
                            <Option value="Active">Active</Option>
                            <Option value="Inactive">Inactive</Option>
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>
        </>
    );
};

export default SubjectCreate;
