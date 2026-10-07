

import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Button, Table, Space, Popconfirm, message, Spin, Alert, Tag, Card, Typography, Row, Col } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { RootState, AppDispatch } from '../../store/store';
import { fetchAdminsRequest, deleteAdminRequest, type Admin } from '../../store/features/admins/adminsSlice';
import AdminForm from './AdminForm';

const { Title } = Typography;

const Admins: React.FC = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);

  const dispatch: AppDispatch = useDispatch();
  const { admins, loading, error } = useSelector((state: RootState) => state.admins);

  useEffect(() => {
    dispatch(fetchAdminsRequest());
  }, [dispatch]);

  const handleDelete = (id: string) => {
    dispatch(deleteAdminRequest(id));
    message.success('Admin deleted successfully');
  };

  const showAddModal = () => {
    setEditingAdmin(null);
    setIsModalVisible(true);
  };

  const showEditModal = (admin: Admin) => {
    setEditingAdmin(admin);
    setIsModalVisible(true);
  };

  const handleModalClose = () => {
    setIsModalVisible(false);
    setEditingAdmin(null);
  };

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name', width: 150 },
    { title: 'Email', dataIndex: 'email', key: 'email', width: 200 },
    { title: 'Phone', dataIndex: 'phone', key: 'phone', width: 150 },
    { title: 'Organization Key', dataIndex: 'organization_key', key: 'organization_key', width: 150 },
    { 
      title: 'Status', 
      dataIndex: 'status', 
      key: 'status',
      width: 100,
      render: (status: string) => <Tag color={status === 'Active' ? 'green' : 'red'}>{status}</Tag>
    },
    {
      title: 'Action',
      key: 'action',
      width: 120,
      render: (_: unknown, record: Admin) => (
        <Space size="middle">
          <Button icon={<EditOutlined />} onClick={() => showEditModal(record)} />
          <Popconfirm
            title="Are you sure to delete this admin?"
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
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }} gutter={[16, 16]}>
        <Col xs={24} sm={12}>
          <Title level={4} style={{ margin: 0 }}>Admin Management</Title>
        </Col>
        <Col xs={24} sm={12} style={{ textAlign: 'right' }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={showAddModal}
          >
            Add Admin
          </Button>
        </Col>
      </Row>
      {error && <Alert message="Error" description={error} type="error" showIcon closable style={{ marginBottom: 16 }} />}
      <Spin spinning={loading}>
        <div style={{ overflowX: 'auto' }}>
            <Table columns={columns} dataSource={admins} rowKey="id" scroll={{ x: 'max-content' }} />
        </div>
      </Spin>
      {isModalVisible && (
        <AdminForm
          visible={isModalVisible}
          onClose={handleModalClose}
          admin={editingAdmin}
        />
      )}
    </Card>
  );
};

export default Admins;
