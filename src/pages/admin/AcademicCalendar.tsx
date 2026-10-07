
import React, { useState, useEffect } from 'react';
import { Button, Card, Typography, Modal, Form, DatePicker, Row, Col, Input, message, Table, Space, Switch, Popconfirm, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../../store/store';
import {
    addAcademicCalendarRequest,
    fetchAcademicCalendarsRequest,
    updateAcademicCalendarRequest,
    deleteAcademicCalendarRequest,
    setCurrentAcademicCalendarRequest,
    type AcademicCalendar as AcademicCalendarType,
    type AddCalendarPayload,
} from '../../store/features/academic-calendar/academicCalendarSlice';
import dayjs from 'dayjs';


const { Title } = Typography;

const AcademicCalendar: React.FC = () => {
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingCalendar, setEditingCalendar] = useState<AcademicCalendarType | null>(null);
    const [form] = Form.useForm();
    const dispatch: AppDispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const { calendars, loading } = useSelector((state: RootState) => state.academicCalendar);

    useEffect(() => {
        if (user?.organization_key) {
            dispatch(fetchAcademicCalendarsRequest(user.organization_key));
        }
    }, [dispatch, user?.organization_key]);

    const showModal = (calendar: AcademicCalendarType | null = null) => {
        setEditingCalendar(calendar);
        if (calendar && calendar.academic_year) {
            const [start, end] = calendar.academic_year.split('-');
            const [startM, startY] = start.split('/');
            const [endM, endY] = end.split('/');
            
            form.setFieldsValue({
                start_month: dayjs().month(parseInt(startM, 10) - 1).year(parseInt(startY, 10)),
                start_year: dayjs().year(parseInt(startY, 10)),
                end_month: dayjs().month(parseInt(endM, 10) - 1).year(parseInt(endY, 10)),
                end_year: dayjs().year(parseInt(endY, 10)),
                academic_year_display: calendar.academic_year,
            });
        } else {
             form.resetFields();
        }
        setIsModalVisible(true);
    };

    const handleCancel = () => {
        setIsModalVisible(false);
        setEditingCalendar(null);
        form.resetFields();
    };
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onFormValuesChange = (_changedValues: any, allValues: any) => {
        const { start_month, start_year, end_month, end_year } = allValues;
        if (start_month && start_year && end_month && end_year) {
            const displayValue = `${start_month.format('MM')}/${start_year.format('YYYY')}-${end_month.format('MM')}/${end_year.format('YYYY')}`;
            form.setFieldsValue({ academic_year_display: displayValue });
        } else {
            form.setFieldsValue({ academic_year_display: null });
        }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onFinish = (values: any) => {
        if (!user?.organization_key) {
            message.error("Organization key not found. Cannot save academic year.");
            return;
        }

        const { academic_year_display } = values;

        if (!academic_year_display) {
            message.error("Please select all date fields.");
            return;
        }

        if (editingCalendar) {
             dispatch(updateAcademicCalendarRequest({
                id: editingCalendar.id,
                academic_year: academic_year_display,
                status: editingCalendar.status,
                is_current: editingCalendar.is_current,
             }));
        } else {
            const payload: AddCalendarPayload = {
                organization_key: user.organization_key,
                academic_year: academic_year_display,
                status: 'Active',
            };
            dispatch(addAcademicCalendarRequest(payload));
        }
        
        handleCancel();
    };

    const handleDelete = (id: string) => {
        dispatch(deleteAcademicCalendarRequest(id));
    };

    const handleStatusChange = (checked: boolean, record: AcademicCalendarType) => {
        const newStatus = checked ? 'Active' : 'Inactive';
        dispatch(updateAcademicCalendarRequest({ ...record, status: newStatus }));
    };

    const handleSetCurrent = (record: AcademicCalendarType) => {
        if (record.is_current) {
            message.info("This is already the current academic year.");
            return;
        }
        if (user?.organization_key) {
            dispatch(setCurrentAcademicCalendarRequest({
                organizationKey: user.organization_key,
                calendarId: record.id
            }));
        }
    };
    
    const columns = [
        {
            title: 'S.No',
            key: 'sno',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            render: (_text: any, _record: any, index: number) => index + 1,
        },
        {
            title: 'Academic Year',
            dataIndex: 'academic_year',
            key: 'academic_year',
        },
        {
            title: 'Current Year',
            dataIndex: 'is_current',
            key: 'is_current',
            align: 'center' as const,
            render: (is_current: boolean) => (
                is_current ? <Tag icon={<CheckCircleOutlined />} color="success">Current</Tag> : null
            )
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status: string, record: AcademicCalendarType) => (
                <Switch
                    checkedChildren="Active"
                    unCheckedChildren="Inactive"
                    checked={status === 'Active'}
                    onChange={(checked) => handleStatusChange(checked, record)}
                    loading={loading}
                />
            )
        },
        {
            title: 'Action',
            key: 'action',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            render: (_: any, record: AcademicCalendarType) => (
                 <Space size="middle">
                    <Button onClick={() => handleSetCurrent(record)} disabled={record.is_current || loading} type="default">
                        Set as Current
                    </Button>
                    <Button icon={<EditOutlined />} onClick={() => showModal(record)} />
                    <Popconfirm
                        title="Are you sure to delete this academic year?"
                        onConfirm={() => handleDelete(record.id)}
                        okText="Yes"
                        cancelText="No"
                    >
                        <Button icon={<DeleteOutlined />} danger />
                    </Popconfirm>
                </Space>
            )
        }
    ];

    return (
        <>
            <Card>
                <Row justify="space-between" align="middle" style={{ marginBottom: 24 }} gutter={[16, 16]}>
                    <Col xs={24} sm={12}>
                        <Title level={4} style={{ margin: 0 }}>Academic Year Management</Title>
                    </Col>
                    <Col xs={24} sm={12} style={{ textAlign: 'right' }}>
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => showModal()}>
                            Add Academic Year
                        </Button>
                    </Col>
                </Row>
                
                <div style={{ overflowX: 'auto' }}>
                    <Table
                        columns={columns}
                        dataSource={calendars}
                        loading={loading}
                        rowKey="id"
                        bordered
                        scroll={{ x: 'max-content' }}
                    />
                </div>

            </Card>

            <Modal 
                title={editingCalendar ? "Edit Academic Year" : "Add Academic Year"}
                open={isModalVisible} 
                onCancel={handleCancel}
                footer={null}
                destroyOnClose
            >
                <Form form={form} layout="vertical" onFinish={onFinish} onValuesChange={onFormValuesChange} style={{ marginTop: 24 }}>
                    <Form.Item label="Select Academic Year Range" required>
                        <Row gutter={16} align="middle">
                            <Col span={6}>
                                <Form.Item name="start_month" noStyle rules={[{ required: true, message: 'Required' }]}><DatePicker picker="month" format="MM" style={{ width: '100%' }} placeholder="MM" /></Form.Item>
                            </Col>
                            <Col span={6}>
                                <Form.Item name="start_year" noStyle rules={[{ required: true, message: 'Required' }]}><DatePicker picker="year" format="YYYY" style={{ width: '100%' }} placeholder="YYYY" /></Form.Item>
                            </Col>
                            <Col span={6}>
                                <Form.Item name="end_month" noStyle rules={[{ required: true, message: 'Required' }]}><DatePicker picker="month" format="MM" style={{ width: '100%' }} placeholder="MM" /></Form.Item>
                            </Col>
                            <Col span={6}>
                                <Form.Item name="end_year" noStyle rules={[{ required: true, message: 'Required' }]}><DatePicker picker="year" format="YYYY" style={{ width: '100%' }} placeholder="YYYY" /></Form.Item>
                            </Col>
                        </Row>
                    </Form.Item>
                    
                    <Form.Item
                        shouldUpdate={(prevValues, curValues) =>
                            prevValues.academic_year_display !== curValues.academic_year_display
                        }
                    >
                        {({ getFieldValue }) =>
                            getFieldValue('academic_year_display') ? (
                                <Form.Item label="Selected Academic Year" name="academic_year_display">
                                    <Input
                                        disabled
                                        style={{ background: '#f5f5f5', color: 'rgba(0, 0, 0, 0.85)', cursor: 'default' }}
                                    />
                                </Form.Item>
                            ) : null
                        }
                    </Form.Item>


                    <Row justify="end" style={{ marginTop: 24 }}>
                        <Form.Item shouldUpdate>
                            {() => (
                                <>
                                    <Button onClick={handleCancel} style={{ marginRight: 8 }}>
                                        Cancel
                                    </Button>
                                    <Button type="primary" htmlType="submit" loading={loading} disabled={!form.getFieldValue('academic_year_display')}>
                                        {editingCalendar ? 'Update' : 'Submit'}
                                    </Button>
                                </>
                            )}
                        </Form.Item>
                    </Row>
                </Form>
            </Modal>
        </>
    );
};

export default AcademicCalendar;
