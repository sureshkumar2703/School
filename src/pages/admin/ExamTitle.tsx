
import React, { useState, useEffect, useMemo } from 'react';
import { Button, Card, Col, Form, Input, Modal, Row, Space, Typography, Table, Popconfirm, message, Switch, Select } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store/store';
import {
    addExamTitleRequest,
    fetchExamTitlesRequest,
    updateExamTitleRequest,
    deleteExamTitleRequest,
    type ExamTitle
} from '../../store/features/exam-title/examTitleSlice';

const { Title } = Typography;
const { Search } = Input;
const { Option } = Select;

const ExamTitlePage: React.FC = () => {
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingTitle, setEditingTitle] = useState<ExamTitle | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [form] = Form.useForm();
    const dispatch: AppDispatch = useDispatch();

    const { user } = useSelector((state: RootState) => state.auth);
    const { titles, loading } = useSelector((state: RootState) => state.examTitle);

    useEffect(() => {
        if (user?.organization_key) {
            dispatch(fetchExamTitlesRequest(user.organization_key));
        }
    }, [dispatch, user?.organization_key]);

    const filteredTitles = useMemo(() => {
        if (!searchTerm) {
            return titles;
        }
        return titles.filter(title =>
            title.exam_title.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [titles, searchTerm]);

    const showModal = (title: ExamTitle | null = null) => {
        setEditingTitle(title);
        if (title) {
            form.setFieldsValue({
                created_by: title.created_by,
                organization_key: title.organization_key,
                exam_title: title.exam_title,
                status: title.status,
            });
        } else {
            form.setFieldsValue({
                created_by: user?.name,
                organization_key: user?.organization_key,
                exam_title: '',
                status: 'Active',
            });
        }
        setIsModalVisible(true);
    };

    const handleCancel = () => {
        setIsModalVisible(false);
        setEditingTitle(null);
        form.resetFields();
    };

    const onFinish = (values: { exam_title: string, status: 'Active' | 'Inactive' }) => {
        if (!user) {
            message.error("You must be logged in to perform this action.");
            return;
        }
        
        if (editingTitle) {
             dispatch(updateExamTitleRequest({ id: editingTitle.id, exam_title: values.exam_title, status: values.status }));
        } else {
            dispatch(addExamTitleRequest({
                created_by: user.name!,
                organization_key: user.organization_key!,
                exam_title: values.exam_title,
                status: 'Active',
            }));
        }

        handleCancel();
    };
    
    const handleDelete = (id: string) => {
        dispatch(deleteExamTitleRequest(id));
    };
    
    const handleStatusChange = (checked: boolean, record: ExamTitle) => {
        const newStatus = checked ? 'Active' : 'Inactive';
        dispatch(updateExamTitleRequest({ id: record.id, status: newStatus }));
    };

    const columns = [
        {
            title: 'S.No',
            key: 'sno',
            render: (_: any, __: any, index: number) => index + 1,
        },
        {
            title: 'Exam Title',
            dataIndex: 'exam_title',
            key: 'exam_title',
        },
        {
            title: 'Created By',
            dataIndex: 'created_by',
            key: 'created_by',
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status: string, record: ExamTitle) => (
                <Switch
                    checked={status === 'Active'}
                    onChange={(checked) => handleStatusChange(checked, record)}
                    loading={loading}
                />
            )
        },
        {
            title: 'Action',
            key: 'action',
            render: (_: any, record: ExamTitle) => (
                <Space>
                    <Button icon={<EditOutlined />} onClick={() => showModal(record)} />
                    <Popconfirm title="Are you sure to delete this title?" onConfirm={() => handleDelete(record.id)}>
                        <Button icon={<DeleteOutlined />} danger />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <Card>
            <Row justify="space-between" align="middle" style={{ marginBottom: 24 }} gutter={[16, 16]}>
                <Col xs={24} sm={12}>
                    <Title level={4} style={{ margin: 0 }}>Exam Title Management</Title>
                </Col>
                 <Col xs={24} sm={12} style={{ textAlign: 'right' }}>
                    <Space direction="vertical" style={{ width: '100%' }}>
                         <Search
                            placeholder="Search by Exam Title"
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ width: '100%', maxWidth: '300px' }}
                            allowClear
                        />
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => showModal()} style={{ width: '100%', maxWidth: '300px' }}>
                            Create Title
                        </Button>
                    </Space>
                </Col>
            </Row>

            <Table
                columns={columns}
                dataSource={filteredTitles}
                loading={loading}
                rowKey="id"
                bordered
                scroll={{ x: 'max-content' }}
            />

            <Modal
                title={editingTitle ? "Edit Exam Title" : "Create Exam Title"}
                open={isModalVisible}
                onCancel={handleCancel}
                footer={null}
                destroyOnHidden
            >
                <Form form={form} layout="vertical" onFinish={onFinish} style={{ marginTop: 24 }}>
                    <Form.Item name="created_by" label="Created By">
                        <Input disabled />
                    </Form.Item>
                    <Form.Item name="organization_key" label="Organization">
                        <Input disabled />
                    </Form.Item>
                    <Form.Item name="exam_title" label="Exam Title" rules={[{ required: true, message: 'Please enter a title for the exam.' }]}>
                        <Input placeholder="e.g., Mid-Term Examination, Final Examination" />
                    </Form.Item>
                    {editingTitle && (
                        <Form.Item name="status" label="Status">
                            <Select>
                                <Option value="Active">Active</Option>
                                <Option value="Inactive">Inactive</Option>
                            </Select>
                        </Form.Item>
                    )}
                    <Form.Item style={{ textAlign: 'right', marginTop: 24 }}>
                        <Button onClick={handleCancel} style={{ marginRight: 8 }}>
                            Cancel
                        </Button>
                        <Button type="primary" htmlType="submit" loading={loading}>
                            {editingTitle ? 'Update' : 'Save'}
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>
        </Card>
    );
};

export default ExamTitlePage;
