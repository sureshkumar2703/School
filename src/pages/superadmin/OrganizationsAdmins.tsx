
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Select, Table, Switch, message, Spin, Alert, Card, Typography, Input, Row, Col } from 'antd';
import type { RootState, AppDispatch } from '../../store/store';
import { fetchOrganizationsRequest, type Organization } from '../../store/features/organizations/organizationsSlice';
import { fetchAdminsRequest, updateAdminStatusRequest, type AdminData } from '../../store/features/organizations-admins/organizationsAdminsSlice';

const { Title, Text } = Typography;
const { Option } = Select;
const { Search } = Input;

const OrganizationsAdmins: React.FC = () => {
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const dispatch: AppDispatch = useDispatch();

  const { organizations, loading: orgsLoading } = useSelector((state: RootState) => state.organizations);
  const { admins, loading: adminsLoading, error } = useSelector((state: RootState) => state.organizationsAdmins);

  useEffect(() => {
    dispatch(fetchOrganizationsRequest());
  }, [dispatch]);

  const handleOrgChange = (orgId: string) => {
    const organization = organizations.find(o => o.id === orgId) || null;
    setSelectedOrg(organization);
    setSearchTerm('');
    if (organization) {
      dispatch(fetchAdminsRequest(organization.organization_key));
    }
  };
  
  const handleStatusChange = (checked: boolean, record: AdminData) => {
    const newStatus = checked ? 'Active' : 'Inactive';
    dispatch(updateAdminStatusRequest({ ...record, status: newStatus }));
    message.success(`Admin ${record.name}'s status updated to ${newStatus}`);
  };

  const filteredAdmins = admins.filter(admin =>
    admin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.phone.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = [
    { 
        title: 'S.No', 
        key: 'sno',
        render: (_text: any, _record: any, index: number) => index + 1 
    },
    { title: 'ID', dataIndex: 'id', key: 'id' },
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Phone', dataIndex: 'phone', key: 'phone' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Password', dataIndex: 'password', key: 'password' },
    { title: 'Org Key', dataIndex: 'organization_key', key: 'organization_key' },
    { 
        title: 'Created At', 
        dataIndex: 'created_at', 
        key: 'created_at',
        render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string, record: AdminData) => (
        <Switch
          checkedChildren="Active"
          unCheckedChildren="Inactive"
          checked={status === 'Active'}
          onChange={(checked) => handleStatusChange(checked, record)}
          loading={adminsLoading}
        />
      ),
    },
  ];

  return (
    <Card>
        <Title level={4} style={{ marginBottom: 24 }}>Organization Admins</Title>
        <Row justify="space-between" align="middle" style={{ marginBottom: 24 }} gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8}>
                <Select
                    showSearch
                    placeholder="Select an organization"
                    style={{ width: '100%' }}
                    loading={orgsLoading}
                    onChange={handleOrgChange}
                    filterOption={(input, option) =>
                      (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())
                    }
                >
                    {organizations.map(org => <Option key={org.id} value={org.id}>{org.name}</Option>)}
                </Select>
            </Col>
            <Col xs={24} sm={12} md={8}>
                <Search
                    placeholder="Search by Name or Phone"
                    onSearch={setSearchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ width: '100%' }}
                    disabled={!selectedOrg}
                    allowClear
                />
            </Col>
        </Row>

        {error && <Alert message="Error fetching admins" description={error} type="error" showIcon closable />}

        <Spin spinning={adminsLoading}>
            <Table
                columns={columns}
                dataSource={selectedOrg ? filteredAdmins : []}
                rowKey="id"
                bordered
                scroll={{ x: 'max-content' }}
                footer={() => (
                    <Text strong>Total Admins: {filteredAdmins.length}</Text>
                )}
            />
        </Spin>
    </Card>
  );
};

export default OrganizationsAdmins;
