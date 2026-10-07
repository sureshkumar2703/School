
import { Layout, Typography } from 'antd';

const { Content } = Layout;
const { Title } = Typography;

const LibraryDashboard: React.FC = () => {
  return (
    <Content>
      <Title level={2}>Library Dashboard</Title>
      <p>Welcome to the Library Staff Dashboard.</p>
    </Content>
  );
};

export default LibraryDashboard;
