import { Layout, Typography } from 'antd';

const { Content } = Layout;
const { Title } = Typography;

const ParentDashboard: React.FC = () => {
  return (
    <Content>
      <Title level={2}>Parent Dashboard</Title>
      <p>Welcome to the Parent Dashboard.</p>
    </Content>
  );
};

export default ParentDashboard;
