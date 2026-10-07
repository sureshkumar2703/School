
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Row, Col, Card, Statistic, Spin, Alert, Typography } from 'antd';
import { ApartmentOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import type { RootState, AppDispatch } from '../../store/store';
import { fetchOrganizationsRequest } from '../../store/features/organizations/organizationsSlice';

const { Title } = Typography;

const SuperadminDashboard: React.FC = () => {
  const dispatch: AppDispatch = useDispatch();
  const { organizations, loading, error } = useSelector((state: RootState) => state.organizations);

  useEffect(() => {
    dispatch(fetchOrganizationsRequest());
  }, [dispatch]);

  const activeOrgs = organizations.filter(org => org.status === 'Active').length;
  const inactiveOrgs = organizations.filter(org => org.status === 'Inactive').length;
  const totalOrgs = organizations.length;

  if (loading) {
    return <Spin tip="Loading Dashboard..." fullscreen />;
  }

  if (error) {
    return <Alert message="Error" description={error} type="error" showIcon />;
  }

  return (
    <div>
      <Title level={2} style={{ marginBottom: 24 }}>Superadmin Dashboard</Title>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="Total Organizations"
              value={totalOrgs}
              prefix={<ApartmentOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="Active Organizations"
              value={activeOrgs}
              valueStyle={{ color: '#3f8600' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="Inactive Organizations"
              value={inactiveOrgs}
              valueStyle={{ color: '#cf1322' }}
              prefix={<CloseCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default SuperadminDashboard;
