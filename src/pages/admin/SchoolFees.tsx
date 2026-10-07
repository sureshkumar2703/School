
import React, { useState, useEffect, useMemo } from 'react';
import { Card, Typography, Button, Modal, Row, Col, Form, Select, InputNumber, message, Table, Tag, Space, Popconfirm, Switch } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../../store/store';
import { fetchAcademicCalendarsRequest } from '../../store/features/academic-calendar/academicCalendarSlice';
import { fetchClassesRequest } from '../../store/features/classes/classesSlice';
import { addFeeRequest, fetchFeesRequest, updateFeeRequest, deleteFeeRequest, type FeeStructure } from '../../store/features/setfees/setfeesSlice';

const { Title } = Typography;
const { Option } = Select;

const SchoolFees: React.FC = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingFee, setEditingFee] = useState<FeeStructure | null>(null);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [form] = Form.useForm();
  const dispatch: AppDispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const { calendars, loading: calendarsLoading } = useSelector((state: RootState) => state.academicCalendar);
  const { classes, loading: classesLoading } = useSelector((state: RootState) => state.classes);
  const { fees, loading: feesLoading } = useSelector((state: RootState) => state.setfees);
  
  const selectedClass = Form.useWatch('class_name', form);
  const selectedAcademicYear = Form.useWatch('academic_year', form);

  useEffect(() => {
    if (user?.organization_key) {
        dispatch(fetchAcademicCalendarsRequest(user.organization_key));
        dispatch(fetchClassesRequest());
        dispatch(fetchFeesRequest(user.organization_key));
    }
  }, [dispatch, user?.organization_key]);

  useEffect(() => {
    if (calendars.length > 0 && !selectedYear) {
      const currentYear = calendars.find(c => c.is_current)?.academic_year;
      if (currentYear) {
        setSelectedYear(currentYear);
      } else if (calendars.length > 0) {
        const firstActive = calendars.find(c => c.status === 'Active');
        if (firstActive) {
            setSelectedYear(firstActive.academic_year);
        }
      }
    }
  }, [calendars, selectedYear]);

  const filteredFees = useMemo(() => {
      if (!selectedYear) {
          return [];
      }
      return fees.filter(fee => fee.academic_year === selectedYear);
  }, [fees, selectedYear]);

  const showModal = (fee: FeeStructure | null = null) => {
    setEditingFee(fee);
    if (fee) {
      form.setFieldsValue(fee);
    } else {
      const currentYear = calendars.find(cal => cal.is_current);
      form.resetFields();
      if (currentYear) {
          form.setFieldsValue({ academic_year: currentYear.academic_year, status: 'Active' });
      } else {
          form.setFieldsValue({ status: 'Active' });
      }
    }
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    setEditingFee(null);
    form.resetFields();
  };
  
  const onFinish = (values: Omit<FeeStructure, 'id' | 'created_at' | 'organization_key'>) => {
    if (!user?.organization_key) {
        message.error("Organization information is missing. Cannot save fee.");
        return;
    }
    
    if (editingFee) {
        dispatch(updateFeeRequest({ id: editingFee.id, organization_key: user.organization_key, ...values }));
    } else {
        dispatch(addFeeRequest({
            ...values,
            organization_key: user.organization_key,
        }));
    }
    handleCancel();
  };

  const handleStatusChange = (checked: boolean, record: FeeStructure) => {
    const newStatus = checked ? 'Active' : 'Inactive';
    dispatch(updateFeeRequest({ ...record, status: newStatus }));
  };

  const handleDelete = (id: string) => {
    dispatch(deleteFeeRequest(id));
  };


  const handleAcademicYearClear = () => {
    const currentYear = calendars.find(cal => cal.is_current);
    if (currentYear) {
        form.setFieldsValue({ academic_year: currentYear.academic_year });
    }
  };
  
  const activeClasses = classes.filter(c => c.organization_key === user?.organization_key && c.status === 'Active');
  const uniqueClassNames = [...new Set(activeClasses.map(c => c.class_name))];

  const columns = [
    {
      title: 'Academic Year',
      dataIndex: 'academic_year',
      key: 'academic_year',
    },
    {
      title: 'Class',
      dataIndex: 'class_name',
      key: 'class_name',
    },
    {
      title: 'Fees',
      dataIndex: 'class_fees',
      key: 'class_fees',
      render: (fees: number) => `₹ ${fees.toLocaleString()}`
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string, record: FeeStructure) => (
          <Switch
            checkedChildren="Active"
            unCheckedChildren="Inactive"
            checked={status === 'Active'}
            onChange={(checked) => handleStatusChange(checked, record)}
            loading={feesLoading}
          />
      )
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: FeeStructure) => (
        <Space size="middle">
          <Button icon={<EditOutlined />} onClick={() => showModal(record)} />
          <Popconfirm title="Are you sure to delete this fee structure?" onConfirm={() => handleDelete(record.id)}>
            <Button icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Card>
        <Row justify="space-between" align="middle" style={{ marginBottom: 24 }} gutter={[16, 16]}>
          <Col xs={24} sm={12}>
            <Title level={4} style={{ margin: 0 }}>School Fees Management</Title>
          </Col>
          <Col xs={24} sm={12} style={{ textAlign: 'right' }}>
            <Space wrap align="center" style={{ justifyContent: 'flex-end', width: '100%' }}>
                <Select
                  placeholder="Filter by Academic Year"
                  value={selectedYear}
                  onChange={setSelectedYear}
                  style={{ width: '250px' }}
                  loading={calendarsLoading}
                  allowClear
                >
                  {calendars.filter(c => c.status === 'Active').map(c => <Option key={c.id} value={c.academic_year}>{c.academic_year}{c.is_current && " (Current)"}</Option>)}
                </Select>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => showModal()}>
                  Create Fee Structure
                </Button>
            </Space>
          </Col>
        </Row>
        <div style={{overflowX: 'auto'}}>
            <Table
            columns={columns}
            dataSource={filteredFees}
            loading={feesLoading}
            rowKey="id"
            bordered
            scroll={{ x: 'max-content' }}
            />
        </div>
      </Card>

      <Modal
        title={editingFee ? 'Edit Fee Structure' : 'Create New Fee Structure'}
        open={isModalVisible}
        onCancel={handleCancel}
        footer={[
          <Button key="back" onClick={handleCancel}>
            Cancel
          </Button>,
          <Button key="submit" type="primary" loading={feesLoading} onClick={() => form.submit()}>
            {editingFee ? 'Update' : 'Create'}
          </Button>,
        ]}
        width={800}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={onFinish} style={{ marginTop: 24 }}>
            <Row gutter={16}>
                <Col span={8}>
                    <Form.Item name="academic_year" label="Academic Year" rules={[{ required: true }]}>
                        <Select 
                            placeholder="Select academic year" 
                            loading={calendarsLoading}
                            allowClear
                            onClear={handleAcademicYearClear}
                        >
                            {calendars.filter(cal => cal.status === 'Active').map(cal => (
                                <Option key={cal.id} value={cal.academic_year}>
                                    {cal.academic_year} {cal.is_current && "(Current)"}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>
                </Col>
                <Col span={8}>
                    <Form.Item name="class_name" label="Class" rules={[{ required: true }]}>
                        <Select 
                            showSearch 
                            placeholder="Select a class" 
                            loading={classesLoading}
                            disabled={!selectedAcademicYear}
                            allowClear
                        >
                             {uniqueClassNames.map(className => (
                                <Option key={className} value={className}>{className}</Option>
                            ))}
                        </Select>
                    </Form.Item>
                </Col>
                <Col span={8}>
                    <Form.Item name="class_fees" label="Set Fees" rules={[{ required: true }]}>
                        <InputNumber placeholder="Enter amount" style={{ width: '100%' }} disabled={!selectedClass} />
                    </Form.Item>
                </Col>
                {editingFee && (
                     <Col span={8}>
                        <Form.Item name="status" label="Status" rules={[{ required: true }]}>
                            <Select>
                                <Option value="Active">Active</Option>
                                <Option value="Inactive">Inactive</Option>
                            </Select>
                        </Form.Item>
                    </Col>
                )}
            </Row>
        </Form>
      </Modal>
    </>
  );
};

export default SchoolFees;
