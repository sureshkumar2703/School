

import { useEffect } from 'react';
import { Modal, Form, Input, Button, Row, Col, Select, message } from 'antd';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store/store';
import { addAdminRequest, updateAdminRequest, type Admin } from '../../store/features/admins/adminsSlice';

const { Option } = Select;

interface AdminFormProps {
  visible: boolean;
  onClose: () => void;
  admin: Admin | null;
}

const AdminForm: React.FC<AdminFormProps> = ({ visible, onClose, admin }) => {
  const [form] = Form.useForm();
  const dispatch: AppDispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (admin) {
      form.setFieldsValue(admin);
    } else {
      // For new admins, set the organization key from the logged-in user and default status
      form.resetFields();
      form.setFieldsValue({
        organization_key: user?.organization_key,
        status: 'Inactive',
      });
    }
  }, [admin, form, visible, user?.organization_key]);

  const onFinish = (values: Omit<Admin, 'id' | 'created_at'> & { password?: string }) => {
    if (admin) {
      // Update existing admin
      dispatch(updateAdminRequest({ id: admin.id, ...values }));
    } else {
      // Add new admin
      if (!values.password) {
        message.error("Password is required for new admins.");
        return;
      }
      dispatch(addAdminRequest({ ...values, status: 'Inactive' }));
    }
    onClose();
  };

  return (
    <Modal
      title={admin ? 'Edit Admin' : 'Add Admin'}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={800}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" onFinish={onFinish} style={{ marginTop: 24 }}>
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item name="name" label="Full Name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
              <Input disabled={!!admin} />
            </Form.Item>
          </Col>
           {!admin && (
             <Col xs={24} sm={12}>
                <Form.Item name="password" label="Password" rules={[{ required: true, min: 6 }]}>
                    <Input.Password />
                </Form.Item>
            </Col>
           )}
          <Col xs={24} sm={12}>
            <Form.Item name="phone" label="Phone Number" rules={[{ len: 10, message: "Phone number must be 10 digits." }]}>
              <Input maxLength={10} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="organization_key" label="Organization Key" rules={[{ required: true }]}>
              <Input disabled />
            </Form.Item>
          </Col>
           {admin && (
              <Col xs={24} sm={12}>
                <Form.Item name="status" label="Status" rules={[{ required: true }]}>
                  <Select disabled>
                    <Option value="Active">Active</Option>
                    <Option value="Inactive">Inactive</Option>
                  </Select>
                </Form.Item>
              </Col>
           )}
        </Row>
        <Form.Item style={{ marginTop: '24px', textAlign: 'right' }}>
          <Button onClick={onClose} style={{ marginRight: 8 }}>
            Cancel
          </Button>
          <Button type="primary" htmlType="submit">
            {admin ? 'Update Admin' : 'Add Admin'}
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AdminForm;
