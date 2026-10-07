

import { useEffect } from 'react';
import { Modal, Form, Input, Button, Row, Col, Select, DatePicker, message, Tabs, Checkbox, InputNumber } from 'antd';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store/store';
import { addTeacherRequest, updateTeacherRequest, type Teacher } from '../../store/features/teachers/teachersSlice';
import { fetchSubjectsRequest } from '../../store/features/subjects/subjectsSlice';
import dayjs from 'dayjs';

const { Option } = Select;
const { TabPane } = Tabs;

interface TeacherFormProps {
  visible: boolean;
  onClose: () => void;
  teacher: Teacher | null;
}

const generateStaffCode = () => {
    const prefix = 'ST';
    const randomNumber = Math.floor(100000 + Math.random() * 900000); // 6-digit random number
    return `${prefix}${randomNumber}`;
};

const TeacherForm: React.FC<TeacherFormProps> = ({ visible, onClose, teacher }) => {
  const [form] = Form.useForm();
  const dispatch: AppDispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const { subjects, loading: subjectsLoading } = useSelector((state: RootState) => state.subjects);


  useEffect(() => {
    if (visible) {
       dispatch(fetchSubjectsRequest());
    }
  }, [dispatch, visible]);


  useEffect(() => {
    if (teacher) {
      form.setFieldsValue({
        ...teacher,
        dob: teacher.dob ? dayjs(teacher.dob) : null,
        joining_date: teacher.joining_date ? dayjs(teacher.joining_date) : null,
        password: '', // Do not show existing password
      });
    } else {
      // It's a new teacher, generate a staff code
      form.resetFields();
      form.setFieldsValue({
        staff_code: generateStaffCode(),
        status: 'Active'
      });
    }
  }, [teacher, form, visible]);

  const onFinish = (values: Omit<Teacher, 'id' | 'created_at' | 'updated_at'> & { sameAsPermanent?: boolean }) => {
    
    // This is a UI-only field and should not be saved to the database.
    delete values.sameAsPermanent;

    const formattedValues = {
      ...values,
      dob: values.dob ? dayjs(values.dob).format('YYYY-MM-DD') : undefined,
      joining_date: values.joining_date ? dayjs(values.joining_date).format('YYYY-MM-DD') : undefined,
      organization_key: user?.organization_key,
    };

    if (teacher) {
      dispatch(updateTeacherRequest({ id: teacher.id, ...formattedValues }));
    } else {
      dispatch(addTeacherRequest(formattedValues as any));
    }
    onClose();
  };

  const handleAddressCheckbox = (e: { target: { checked: any; }; }) => {
    if (e.target.checked) {
      const permanentAddress = form.getFieldValue('permanent_address');
      form.setFieldsValue({ temporary_address: permanentAddress });
    } else {
      form.setFieldsValue({ temporary_address: '' });
    }
  };
  
  const handleSalaryChange = () => {
    const salary = form.getFieldValue('salary') || 0;
    const pf_salary = form.getFieldValue('pf_salary') || 0;
    form.setFieldsValue({ total_salary: salary - pf_salary });
  };

  return (
    <Modal
      title={teacher ? 'Edit Teacher' : 'Add Teacher'}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={1000}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" onFinish={onFinish} onValuesChange={handleSalaryChange} style={{ marginTop: 24 }}>
        <Tabs defaultActiveKey="1">
          <TabPane tab="Personal Details" key="1">
            <Row gutter={16}>
              <Col span={8}><Form.Item name="staff_code" label="Staff Code"><Input disabled /></Form.Item></Col>
              <Col span={8}><Form.Item name="full_name" label="Name" rules={[{ required: true }]}><Input /></Form.Item></Col>
              <Col span={8}><Form.Item name="dob" label="Date of Birth"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={8}><Form.Item name="gender" label="Gender"><Select><Option value="Male">Male</Option><Option value="Female">Female</Option><Option value="Other">Other</Option></Select></Form.Item></Col>
              <Col span={8}><Form.Item name="blood_group" label="Blood Group"><Input /></Form.Item></Col>
              <Col span={8}><Form.Item name="nationality" label="Nationality"><Input /></Form.Item></Col>
              <Col span={8}><Form.Item name="religion" label="Religion"><Input /></Form.Item></Col>
              <Col span={8}><Form.Item name="marital_status" label="Marital Status"><Select><Option value="Single">Single</Option><Option value="Married">Married</Option><Option value="Divorced">Divorced</Option><Option value="Widowed">Widowed</Option></Select></Form.Item></Col>
              <Col span={8}><Form.Item name="aadhar_number" label="Aadhar Number"><Input /></Form.Item></Col>
            </Row>
          </TabPane>
          <TabPane tab="Contact Details" key="2">
            <Row gutter={16}>
                <Col span={8}><Form.Item name="mobile_number" label="Mobile Number"><Input /></Form.Item></Col>
                <Col span={8}><Form.Item name="alternate_number" label="Alternate Number"><Input /></Form.Item></Col>
            </Row>
             <Row gutter={16}>
                <Col span={12}><Form.Item name="permanent_address" label="Permanent Address"><Input.TextArea /></Form.Item></Col>
                <Col span={12}>
                    <Form.Item name="temporary_address" label="Temporary Address"><Input.TextArea /></Form.Item>
                    <Form.Item name="sameAsPermanent" valuePropName="checked">
                      <Checkbox onChange={handleAddressCheckbox}>Same as permanent address</Checkbox>
                    </Form.Item>
                </Col>
             </Row>
          </TabPane>
          <TabPane tab="Professional Details" key="3">
            <Row gutter={16}>
                <Col span={8}><Form.Item name="designation" label="Designation"><Input /></Form.Item></Col>
                <Col span={8}><Form.Item name="department" label="Department"><Input /></Form.Item></Col>
                <Col span={8}><Form.Item name="experience_years" label="Years of Experience"><Input type="number" /></Form.Item></Col>
                <Col span={8}><Form.Item name="joining_date" label="Joining Date"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
                <Col span={8}><Form.Item name="highest_qualification" label="Highest Qualification"><Input /></Form.Item></Col>
                <Col span={16}><Form.Item name="graduation_details" label="Graduation Details (Degree, University, Year)"><Input.TextArea /></Form.Item></Col>
                <Col span={24}>
                    <Form.Item name="subjects_handled" label="Subjects Handled">
                        <Select
                            mode="multiple"
                            allowClear
                            style={{ width: '100%' }}
                            placeholder="Please select subjects"
                            loading={subjectsLoading}
                        >
                            {subjects.filter(s => s.status === 'Active').map(subject => (
                                <Option key={subject.id} value={subject.subject_name}>
                                    {subject.subject_name}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>
                </Col>
             </Row>
          </TabPane>
          <TabPane tab="Bank Details" key="4">
            <Row gutter={16}>
                <Col span={8}><Form.Item name="bank_name" label="Bank Name"><Input /></Form.Item></Col>
                <Col span={8}><Form.Item name="branch" label="Branch"><Input /></Form.Item></Col>
                <Col span={8}><Form.Item name="bank_account_no" label="Bank Account Number"><Input /></Form.Item></Col>
                <Col span={6}><Form.Item name="salary" label="Salary"><InputNumber style={{width: '100%'}} /></Form.Item></Col>
                <Col span={6}><Form.Item name="pf_salary" label="PF Salary Amount"><InputNumber style={{width: '100%'}} /></Form.Item></Col>
                <Col span={6}><Form.Item name="total_salary" label="Total Salary"><InputNumber style={{width: '100%'}} disabled /></Form.Item></Col>
                <Col span={6}><Form.Item name="pf_number" label="PF Number"><Input /></Form.Item></Col>
                <Col span={8}><Form.Item name="uan_no" label="UAN Number"><Input /></Form.Item></Col>
                <Col span={8}><Form.Item name="pan_number" label="PAN Number"><Input /></Form.Item></Col>
            </Row>
          </TabPane>
          <TabPane tab="Access &amp; Status" key="5">
            <Row gutter={16}>
                <Col span={8}><Form.Item name="email" label="Email for Login" rules={[{ required: true, type: 'email' }]}><Input type="email" /></Form.Item></Col>
                <Col span={8}><Form.Item name="password" label="Password" rules={[{ required: !teacher, min: 6 }]} help={teacher ? "Leave blank to keep current password." : ""}><Input.Password placeholder={teacher ? "Previous password is set" : "Enter new password"} /></Form.Item></Col>
                <Col span={8}>
                    <Form.Item name="status" label="Status" rules={[{ required: true }]}>
                        <Select>
                            <Option value="Active">Active</Option>
                            <Option value="Inactive">Inactive</Option>
                        </Select>
                    </Form.Item>
                </Col>
                <Col span={24}><Form.Item name="remarks" label="Remarks"><Input.TextArea /></Form.Item></Col>
            </Row>
          </TabPane>
        </Tabs>

        <Form.Item style={{ marginTop: '24px', textAlign: 'right' }}>
            <Button onClick={onClose} style={{ marginRight: 8 }}>Cancel</Button>
            <Button type="primary" htmlType="submit">
              {teacher ? 'Update Teacher' : 'Add Teacher'}
            </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default TeacherForm;
