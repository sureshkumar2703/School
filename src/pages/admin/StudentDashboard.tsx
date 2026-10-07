import { Layout, Typography } from 'antd';

const { Content } = Layout;
const { Title } = Typography;

const StudentDashboard: React.FC = () => {
  return (
    <Content>
      <Title level={2}>Student Dashboard</Title>
      <p>Welcome to the Student Dashboard.</p>
    </Content>
  );
};

export default StudentDashboard;
