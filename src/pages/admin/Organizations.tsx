
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Button, Table, Space, Popconfirm, message, Spin, Alert, Tooltip, Typography, Modal, Form, Input, DatePicker, Row, Col, Select, Switch, Card } from 'antd';
import { PlusOutlined, DeleteOutlined, CopyOutlined, EditOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { RootState, AppDispatch } from '../../store/store';
import { fetchOrganizationsRequest, deleteOrganizationRequest, addOrganizationRequest, updateOrganizationRequest, type Organization } from '../../store/features/organizations/organizationsSlice';

const { Text, Title } = Typography;
const { Option } = Select;

const generateOrgKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};


const OrganizationForm: React.FC<{ visible: boolean; onClose: () => void; editingOrganization: Organization | null; }> = ({ visible, onClose, editingOrganization }) => {
  const [form] = Form.useForm();
  const dispatch: AppDispatch = useDispatch();

  useEffect(() => {
    if (editingOrganization) {
      form.setFieldsValue({
        ...editingOrganization,
        start_date: dayjs(editingOrganization.start_date),
        expire_date: dayjs(editingOrganization.expire_date),
      });
    } else {
      form.setFieldsValue({
        id: null,
        organization_key: generateOrgKey(),
        name: '',
        start_date: null,
        expire_date: null,
        status: 'Active',
      });
    }
  }, [form, editingOrganization, visible]);

  const onFinish = (values: Partial<Organization>) => {
     const formattedValues = {
      name: values.name,
      start_date: dayjs(values.start_date).format('YYYY-MM-DD'),
      expire_date: dayjs(values.expire_date).format('YYYY-MM-DD'),
      status: values.status,
    };

    if (editingOrganization) {
      dispatch(updateOrganizationRequest({ ...editingOrganization, name: values.name || '', start_date: dayjs(values.start_date).format('YYYY-MM-DD'), expire_date: dayjs(values.expire_date).format('YYYY-MM-DD'), status: values.status || 'Inactive' }));
      message.success('Organization updated successfully');
    } else {
      const newOrganization = {
        name: values.name!,
        organization_key: form.getFieldValue('organization_key'),
        start_date: dayjs(values.start_date).format('YYYY-MM-DD'),
        expire_date: dayjs(values.expire_date).format('YYYY-MM-DD'),
        status: values.status || 'Active',
      };
      dispatch(addOrganizationRequest(newOrganization as Omit<Organization, 'id'|'created_at'>));
      message.success('Organization added successfully');
    }
    onClose();
  };

  return (
    <Modal
      title={editingOrganization ? 'Edit Organization' : 'Add Organization'}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={600}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Row gutter={16}>
            {editingOrganization && (
                 <Col span={24}>
                    <Form.Item label="Organization ID">
                        <Input value={editingOrganization.id} disabled />
                    </Form.Item>
                 </Col>
            )}
             <Col span={24}>
                <Form.Item name="organization_key" label="Organization Key">
                    <Input disabled />
                </Form.Item>
            </Col>
            <Col span={24}>
                <Form.Item name="name" label="Organization Name" rules={[{ required: true, message: 'Please enter the organization name' }]}>
                    <Input />
                </Form.Item>
            </Col>
            <Col span={12}>
                <Form.Item name="start_date" label="Start Date" rules={[{ required: true, message: 'Please select the start date' }]}>
                    <DatePicker style={{ width: '100%' }} />
                </Form.Item>
            </Col>
            <Col span={12}>
                <Form.Item name="expire_date" label="Expire Date" rules={[{ required: true, message: 'Please select the expire date' }]}>
                    <DatePicker style={{ width: '100%' }} />
                </Form.Item>
            </Col>
             <Col span={24}>
              <Form.Item name="status" label="Status" rules={[{ required: true }]}>
                <Select>
                  <Option value="Active">Active</Option>
                  <Option value="Inactive">Inactive</Option>
                </Select>
              </Form.Item>
            </Col>
        </Row>
        <Form.Item style={{ marginTop: '24px', textAlign: 'right' }}>
            <Button onClick={onClose} style={{ marginRight: 8 }}>Cancel</Button>
            <Button type="primary" htmlType="submit">
                {editingOrganization ? 'Update Organization' : 'Add Organization'}
            </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
};


const Organizations: React.FC = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingOrganization, setEditingOrganization] = useState<Organization | null>(null);
  
  const dispatch: AppDispatch = useDispatch();
  const { organizations, loading, error } = useSelector((state: RootState) => state.organizations);

  useEffect(() => {
    dispatch(fetchOrganizationsRequest());
  }, [dispatch]);

  const handleDelete = (id: string) => {
    dispatch(deleteOrganizationRequest(id));
  };
  
  const handleStatusChange = (checked: boolean, record: Organization) => {
    const newStatus = checked ? 'Active' : 'Inactive';
    dispatch(updateOrganizationRequest({ ...record, status: newStatus }));
  };

  const showAddModal = () => {
    setEditingOrganization(null);
    setIsModalVisible(true);
  };
  
  const showEditModal = (organization: Organization) => {
    setEditingOrganization(organization);
    setIsModalVisible(true);
  };

  const handleModalClose = () => {
    setIsModalVisible(false);
    setEditingOrganization(null);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    message.success('Copied to clipboard!');
  };

  const columns = [
    { 
      title: 'Org ID', 
      dataIndex: 'id', 
      key: 'id',
      width: 150,
      render: (id: string) => (
        <Space>
          <Tooltip title={id}>
            <Text style={{ maxWidth: 100 }} ellipsis={{ tooltip: false }}>{id}</Text>
          </Tooltip>
          <Button icon={<CopyOutlined />} size="small" onClick={() => handleCopy(id)} />
        </Space>
      )
    },
    { 
        title: 'Org Key', 
        dataIndex: 'organization_key', 
        key: 'organization_key',
        width: 120,
        render: (key: string) => (
            <Space>
              <Text>{key}</Text>
              <Button icon={<CopyOutlined />} size="small" onClick={() => handleCopy(key)} />
            </Space>
        )
    },
    { title: 'Name', dataIndex: 'name', key: 'name', width: 200 },
    { 
      title: 'Start Date', 
      dataIndex: 'start_date', 
      key: 'start_date',
      width: 120,
      render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
    },
    { 
      title: 'Expire Date', 
      dataIndex: 'expire_date', 
      key: 'expire_date',
      width: 120,
      render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string, record: Organization) => (
        <Switch
            checkedChildren="Active"
            unCheckedChildren="Inactive"
            checked={status === 'Active'}
            onChange={(checked) => handleStatusChange(checked, record)}
        />
      )
    },
    {
      title: 'Action',
      key: 'action',
      fixed: 'right' as const,
      width: 120,
      render: (_: unknown, record: Organization) => (
        <Space size="middle">
          <Button icon={<EditOutlined />} onClick={() => showEditModal(record)} />
          <Popconfirm
            title="Are you sure to delete this organization?"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card>
       <Space direction="vertical" style={{ width: '100%', marginBottom: 24 }}>
        <Title level={4}>Organization Management</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={showAddModal}
        >
          Add Organization
        </Button>
      </Space>

      {error && <Alert message="Error" description={error} type="error" showIcon closable style={{ marginBottom: 16 }} />}
      <Spin spinning={loading}>
        <Table columns={columns} dataSource={organizations} rowKey="id" scroll={{ x: 'max-content' }} />
      </Spin>
      <OrganizationForm
        visible={isModalVisible}
        onClose={handleModalClose}
        editingOrganization={editingOrganization}
      />
    </Card>
  );
};

export default Organizations;
