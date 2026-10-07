

import { useEffect, useState } from 'react';
import { Modal, Form, Input, Button, Row, Col, Select, DatePicker, message, Typography, Card, Tabs, Checkbox } from 'antd';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store/store';
import { addStudentRequest, updateStudentRequest, type Student, type AddStudentPayload } from '../../store/features/students/studentsSlice';
import { fetchClassesRequest, type Class } from '../../store/features/classes/classesSlice';
import { fetchAcademicCalendarsRequest } from '../../store/features/academic-calendar/academicCalendarSlice';
import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';

const { Option } = Select;
const { Title } = Typography;
const { TabPane } = Tabs;

interface StudentFormProps {
  visible: boolean;
  onClose: () => void;
  student: Student | null;
}

const StudentForm: React.FC<StudentFormProps> = ({ visible, onClose, student }) => {
  const [form] = Form.useForm();
  const dispatch: AppDispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const { classes, loading: classesLoading } = useSelector((state: RootState) => state.classes);
  const { calendars: academicYears, loading: calendarsLoading } = useSelector((state: RootState) => state.academicCalendar);

  const uniqueClassNames = [...new Set(classes.filter(c => c.status === 'Active').map(c => c.class_name))];
  
  const admittedClassValue = Form.useWatch('admitted_class', form);

  useEffect(() => {
    if (visible && user?.organization_key) {
      dispatch(fetchClassesRequest());
      dispatch(fetchAcademicCalendarsRequest(user.organization_key));
    }
  }, [dispatch, visible, user?.organization_key]);


  useEffect(() => {
    if (visible) {
        if (student) {
            form.setFieldsValue({
                ...student,
                dob: student.dob ? dayjs(student.dob) : null,
                admission_date: student.admission_date ? dayjs(student.admission_date) : null,
                siblings: student.siblings || [],
                password: '', // Clear password field for editing
            });
        } else {
            form.resetFields();
            const currentAcademicYear = academicYears.find(cal => cal.is_current)?.academic_year;
            form.setFieldsValue({
                register_no: `REG-${uuidv4().slice(0, 8).toUpperCase()}`,
                admission_no: `ADM-${Math.floor(100000 + Math.random() * 900000)}`,
                status: 'Active',
                siblings: [],
                password: '', // Clear password for new student
                academic_year: currentAcademicYear,
            });
        }
    }
  }, [student, form, visible, academicYears]);

  useEffect(() => {
    if (!student) { // Only auto-set for new students
        form.setFieldsValue({ admission_class: admittedClassValue });
    }
  }, [admittedClassValue, form, student]);

  const onFinish = (values: Omit<Student, 'id' | 'created_at'> & { sameAsPermanent?: boolean }) => {
    const { admission_class, ...restOfValues } = values;
    delete restOfValues.sameAsPermanent;

    const formattedValues: AddStudentPayload = {
      ...restOfValues,
      dob: values.dob ? dayjs(values.dob).format('YYYY-MM-DD') : undefined,
      admission_date: values.admission_date ? dayjs(values.admission_date).format('YYYY-MM-DD') : undefined,
      organization_key: user?.organization_key,
      siblings: values.siblings || [],
    };

    if (student) {
      dispatch(updateStudentRequest({ id: student.id, ...formattedValues }));
      message.success('Student updated successfully');
    } else {
      dispatch(addStudentRequest(formattedValues));
      form.resetFields();
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
  
  return (
    <Modal
      title={student ? 'Edit Student' : 'Add New Student'}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={1000}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" onFinish={onFinish} style={{ marginTop: 24 }}>
        <Tabs defaultActiveKey="1" style={{ maxHeight: '65vh', overflowY: 'auto', padding: '0 8px' }}>
          <TabPane tab="Personal Details" key="1">
              <Row gutter={16}>
                <Col span={8}><Form.Item name="full_name" label="Full Name" rules={[{ required: true }]}><Input /></Form.Item></Col>
                <Col span={8}><Form.Item name="gender" label="Gender"><Select><Option value="Male">Male</Option><Option value="Female">Female</Option><Option value="Other">Other</Option></Select></Form.Item></Col>
                <Col span={8}><Form.Item name="dob" label="Date of Birth"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
                <Col span={8}><Form.Item name="mother_tongue" label="Mother Tongue"><Input /></Form.Item></Col>
                <Col span={8}><Form.Item name="birth_place" label="Birth Place"><Input /></Form.Item></Col>
                <Col span={8}><Form.Item name="nationality" label="Nationality"><Input /></Form.Item></Col>
                <Col span={8}><Form.Item name="religion" label="Religion"><Input /></Form.Item></Col>
                <Col span={8}><Form.Item name="caste" label="Caste"><Input /></Form.Item></Col>
              </Row>
          </TabPane>
          <TabPane tab="Contact & Parent Info" key="2">
              <Title level={5}>Contact Information</Title>
              <Row gutter={16}>
                <Col span={12}><Form.Item name="permanent_address" label="Permanent Address"><Input.TextArea /></Form.Item></Col>
                 <Col span={12}>
                    <Form.Item name="temporary_address" label="Temporary Address"><Input.TextArea /></Form.Item>
                    <Form.Item name="sameAsPermanent" valuePropName="checked">
                      <Checkbox onChange={handleAddressCheckbox}>Same as permanent address</Checkbox>
                    </Form.Item>
                </Col>
                <Col span={8}><Form.Item name="city" label="City"><Input /></Form.Item></Col>
                <Col span={8}><Form.Item name="district" label="District"><Input /></Form.Item></Col>
                <Col span={8}><Form.Item name="state" label="State"><Input /></Form.Item></Col>
                <Col span={8}><Form.Item name="pin_code" label="Pin Code"><Input /></Form.Item></Col>
              </Row>
              <Title level={5}>Parent / Guardian Information</Title>
              <Row gutter={16}>
                <Col span={8}><Form.Item name="parent_email" label="Parent Email"><Input type="email" /></Form.Item></Col>
                <Col span={8}><Form.Item name="parent_contact" label="Parent Contact"><Input /></Form.Item></Col>
                <Col span={8}><Form.Item name="alternate_contact" label="Alternate Contact"><Input /></Form.Item></Col>
                <Col span={8}><Form.Item name="father_name" label="Father Name"><Input /></Form.Item></Col>
                <Col span={8}><Form.Item name="father_occupation" label="Father Occupation"><Input /></Form.Item></Col>
                <Col span={8}><Form.Item name="father_contact" label="Father Contact"><Input /></Form.Item></Col>
                <Col span={8}><Form.Item name="mother_name" label="Mother Name"><Input /></Form.Item></Col>
                <Col span={8}><Form.Item name="mother_occupation" label="Mother Occupation"><Input /></Form.Item></Col>
                <Col span={8}><Form.Item name="mother_contact" label="Mother Contact"><Input /></Form.Item></Col>
                <Col span={8}><Form.Item name="guardian_name" label="Guardian Name (if applicable)"><Input /></Form.Item></Col>
                <Col span={8}><Form.Item name="guardian_contact" label="Guardian Contact"><Input /></Form.Item></Col>
                <Col span={8}><Form.Item name="family_income" label="Annual Family Income"><Input /></Form.Item></Col>
              </Row>
          </TabPane>
          <TabPane tab="Sibling Details" key="3">
              <Form.List name="siblings">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name, ...restField }) => (
                      <Card key={key} style={{ marginBottom: 16, background: '#fafafa' }} bodyStyle={{padding: '16px'}}>
                         <Row gutter={16}>
                            <Col span={22}>
                                <Row gutter={16}>
                                    <Col span={8}>
                                        <Form.Item {...restField} name={[name, 'name']} label="Sibling Name" rules={[{ required: true }]}>
                                            <Input placeholder="Sibling's Full Name" />
                                        </Form.Item>
                                    </Col>
                                    <Col span={8}>
                                        <Form.Item {...restField} name={[name, 'relation']} label="Relation" rules={[{ required: true }]}>
                                            <Input placeholder="e.g., Brother, Sister" />
                                        </Form.Item>
                                    </Col>
                                    <Col span={8}>
                                        <Form.Item {...restField} name={[name, 'age']} label="Age" rules={[{ required: true }]}>
                                            <Input type="number" placeholder="Age" />
                                        </Form.Item>
                                    </Col>
                                    <Col span={8}>
                                         <Form.Item {...restField} name={[name, 'status']} label="Status" rules={[{ required: true }]}>
                                            <Select placeholder="Select Status">
                                                <Option value="Studying">Studying</Option>
                                                <Option value="Working">Working</Option>
                                                <Option value="Not Applicable">Not Applicable</Option>
                                            </Select>
                                        </Form.Item>
                                    </Col>
                                    <Form.Item
                                        noStyle
                                        shouldUpdate={(prevValues, currentValues) => prevValues.siblings?.[name]?.status !== currentValues.siblings?.[name]?.status}
                                    >
                                        {({ getFieldValue }) => {
                                            const status = getFieldValue(['siblings', name, 'status']);
                                            if (status === 'Studying') {
                                                return (
                                                    <>
                                                        <Col span={8}>
                                                            <Form.Item {...restField} name={[name, 'class']} label="Class/Course">
                                                                <Input placeholder="e.g., 10th, B.Sc" />
                                                            </Form.Item>
                                                        </Col>
                                                         <Col span={8}>
                                                            <Form.Item {...restField} name={[name, 'school_college']} label="School/College Name">
                                                                <Input placeholder="Name of institution" />
                                                            </Form.Item>
                                                        </Col>
                                                    </>
                                                );
                                            }
                                            if (status === 'Working') {
                                                return (
                                                    <>
                                                         <Col span={8}>
                                                            <Form.Item {...restField} name={[name, 'job_title']} label="Job Title">
                                                                <Input placeholder="e.g., Software Engineer" />
                                                            </Form.Item>
                                                        </Col>
                                                         <Col span={8}>
                                                            <Form.Item {...restField} name={[name, 'income']} label="Income (Monthly)">
                                                                <Input placeholder="Monthly income" />
                                                            </Form.Item>
                                                        </Col>
                                                    </>
                                                );
                                            }
                                            return null;
                                        }}
                                    </Form.Item>
                                </Row>
                            </Col>
                            <Col span={2} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <MinusCircleOutlined onClick={() => remove(name)} style={{color: 'red', fontSize: '24px'}} />
                            </Col>
                         </Row>
                      </Card>
                    ))}
                    <Form.Item>
                      <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                        Add Sibling
                      </Button>
                    </Form.Item>
                  </>
                )}
              </Form.List>
          </TabPane>
          <TabPane tab="Academic & Health Info" key="4">
              <Title level={5}>Previous Academic Details</Title>
              <Row gutter={16}>
                <Col span={8}><Form.Item name="previous_school_name" label="Previous School"><Input /></Form.Item></Col>
                <Col span={8}><Form.Item name="last_class_studied" label="Last Class Studied"><Input /></Form.Item></Col>
                <Col span={8}><Form.Item name="board" label="Board (CBSE, State, etc.)"><Input /></Form.Item></Col>
                <Col span={8}><Form.Item name="medium" label="Medium of Instruction"><Input /></Form.Item></Col>
                <Col span={8}><Form.Item name="result" label="Result (Pass/Fail)"><Input /></Form.Item></Col>
                <Col span={8}><Form.Item name="reason_for_leaving" label="Reason for Leaving"><Input.TextArea /></Form.Item></Col>
              </Row>
              <Title level={5}>Health Information</Title>
              <Row gutter={16}>
                <Col span={8}><Form.Item name="blood_group" label="Blood Group"><Input /></Form.Item></Col>
                <Col span={8}><Form.Item name="height" label="Height (cm)"><Input /></Form.Item></Col>
                <Col span={8}><Form.Item name="weight" label="Weight (kg)"><Input /></Form.Item></Col>
                <Col span={8}><Form.Item name="vision_test" label="Vision Test Details"><Input /></Form.Item></Col>
                <Col span={8}><Form.Item name="disability" label="Disability (if any)"><Input /></Form.Item></Col>
                <Col span={8}><Form.Item name="known_allergies" label="Known Allergies"><Input.TextArea /></Form.Item></Col>
                <Col span={16}><Form.Item name="medical_history" label="Relevant Medical History"><Input.TextArea /></Form.Item></Col>
              </Row>
          </TabPane>
          <TabPane tab="Admission Details" key="5">
              <Title level={5}>Admission & Login</Title>
              <Row gutter={16}>
                <Col span={8}><Form.Item name="register_no" label="Register No" rules={[{ required: true }]}><Input /></Form.Item></Col>
                <Col span={8}><Form.Item name="email" label="Email for Login" rules={[{ required: true, type: 'email' }]}><Input /></Form.Item></Col>
                <Col span={8}><Form.Item name="password" label="Password" rules={[{ required: !student, min: 6 }]} help={student ? "Leave blank to keep current password." : "Auto-generated if left blank."}><Input.Password /></Form.Item></Col>
                <Col span={8}><Form.Item name="admission_no" label="Admission No"><Input disabled /></Form.Item></Col>
                <Col span={8}><Form.Item name="admission_date" label="Admission Date"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
                 <Col span={8}>
                    <Form.Item name="admitted_class" label="Admitted Class" rules={[{ required: true }]}>
                        <Select showSearch placeholder="Select a class" loading={classesLoading} filterOption={(input, option) =>
                            (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())
                        }>
                            {uniqueClassNames.map(className => (
                                <Option key={className} value={className}>{className}</Option>
                            ))}
                        </Select>
                    </Form.Item>
                </Col>
                <Col span={8}>
                    <Form.Item
                        noStyle
                        shouldUpdate={(prevValues, currentValues) =>
                            prevValues.admitted_class !== currentValues.admitted_class ||
                            prevValues.admission_class !== currentValues.admission_class
                        }
                    >
                        {({ getFieldValue }) => {
                            const showAdmissionClass = student && getFieldValue('admission_class');
                            return showAdmissionClass || !student ? (
                                <Form.Item name="admission_class" label="Admission Class">
                                    <Input disabled />
                                </Form.Item>
                            ) : null;
                        }}
                    </Form.Item>
                </Col>
                <Col span={8}>
                    <Form.Item name="academic_year" label="Academic Year" rules={[{ required: true }]}>
                        <Select showSearch placeholder="Select academic year" loading={calendarsLoading}>
                            {academicYears.map(year => <Option key={year.id} value={year.academic_year}>{year.academic_year}</Option>)}
                        </Select>
                    </Form.Item>
                </Col>
                <Col span={8}>
                    <Form.Item name="admission_type" label="Admission Type">
                        <Select placeholder="Select admission type">
                            <Option value="New">New</Option>
                            <Option value="Transfer">Transfer</Option>
                        </Select>
                    </Form.Item>
                </Col>
                <Col span={8}><Form.Item name="fee_concession" label="Fee Concession (%)"><Input /></Form.Item></Col>
                <Col span={8}><Form.Item name="status" label="Status"><Select defaultValue="Active"><Option value="Active">Active</Option><Option value="Inactive">Inactive</Option><Option value="Graduated">Graduated</Option></Select></Form.Item></Col>
              </Row>
              <Title level={5}>Other</Title>
              <Row gutter={16}>
                <Col span={12}><Form.Item name="extracurricular_skills" label="Extracurricular / Special Skills"><Input.TextArea /></Form.Item></Col>
                <Col span={12}><Form.Item name="special_remarks" label="Special Remarks"><Input.TextArea /></Form.Item></Col>
              </Row>
          </TabPane>
        </Tabs>
        <Form.Item style={{ marginTop: '24px', textAlign: 'right', paddingRight: '8px' }}>
          <Button onClick={onClose} style={{ marginRight: 8 }}>
            Cancel
          </Button>
          <Button type="primary" htmlType="submit">
            {student ? 'Update Student' : 'Add Student'}
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default StudentForm;

    