import { Layout, Typography } from 'antd';

const { Content } = Layout;
const { Title } = Typography;

const SuperadminDashboard: React.FC = () => {
  return (
    <Content>
      <Title level={2}>Superadmin Dashboard</Title>
      <p>Welcome to the Superadmin Dashboard.</p>
    </Content>
  );
};

export default SuperadminDashboard;
