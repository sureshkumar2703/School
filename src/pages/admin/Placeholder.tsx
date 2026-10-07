import { Layout, Typography } from 'antd';

const { Content } = Layout;
const { Title } = Typography;

interface PlaceholderProps {
    title: string;
}

const Placeholder: React.FC<PlaceholderProps> = ({ title }) => {
  return (
    <Content>
      <Title level={2}>{title}</Title>
      <p>This is a placeholder page for the {title} section. Content coming soon!</p>
    </Content>
  );
};

export default Placeholder;
