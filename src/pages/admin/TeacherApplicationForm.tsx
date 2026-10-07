import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Row, Col, Select, DatePicker, Typography, Tabs, Checkbox, message, Spin, Divider, Space, InputNumber } from 'antd';
import { DownloadOutlined, GlobalOutlined, PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../../store/store';
import { fetchSchoolDetailsRequest } from '../../store/features/school-details/schoolDetailsSlice';
import dayjs from 'dayjs';
import jsPDF from 'jspdf';

const { Title, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

const translations: Record<string, Record<string, string>> = {
    Tamil: {
        'TEACHER RECRUITMENT APPLICATION FORM': 'ஆசிரியர் நியமன விண்ணப்பப் படிவம்',
        'Application No': 'விண்ணப்ப எண்',
        'Date': 'தேதி',
        'Personal Information': 'தனிப்பட்ட விவரங்கள்',
        'Full Name': 'முழு பெயர்',
        'Gender': 'பாலினம்',
        'Date of Birth': 'பிறந்த தேதி',
        'Blood Group': 'இரத்த வகை',
        'Nationality': 'தேசிய இனம்',
        'Religion': 'மதம்',
        'Marital Status': 'திருமண நிலை',
        'Aadhar Number': 'ஆதார் எண்',
        'Professional & Academic Background': 'தொழில்முறை மற்றும் கல்வி பின்னணி',
        'Highest Qualification': 'உயர்ந்தபட்ச கல்வித்தகுதி',
        'Specialization': 'சிறப்புத் துறை',
        'Exp (Years)': 'அனுபவம் (ஆண்டுகள்)',
        'Applied For Dept': 'விண்ணப்பித்த துறை',
        'Applied Post': 'விண்ணப்பித்த பதவி',
        'Subjects Can Handle': 'கையாளக்கூடிய பாடங்கள்',
        'Statutory & Bank Information': 'வங்கி மற்றும் இதர விவரங்கள்',
        'PAN Number': 'பான் எண்',
        'UAN Number': 'யுஏஎன் எண்',
        'Bank Name': 'வங்கியின் பெயர்',
        'Account No': 'கணக்கு எண்',
        'PF Number': 'பிஎப் எண்',
        'Contact & Communication': 'தொடர்பு விவரங்கள்',
        'Primary Mobile': 'முதன்மை கைபேசி எண்',
        'Alternate No': 'மாற்று எண்',
        'Email Address': 'மின்னஞ்சல் முகவரி',
        'Permanent Address': 'நிரந்தர முகவரி',
        'Emergency Contact Name': 'அவசரகால தொடர்பு நபர்',
        'DECLARATION': 'உறுதிமொழி',
        'Signature of Applicant': 'விண்ணப்பதாரர் கையொப்பம்',
    }
};

const TeacherApplicationForm: React.FC = () => {
    const [form] = Form.useForm();
    const dispatch: AppDispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const { details: schoolDetails, loading: schoolLoading } = useSelector((state: RootState) => state.schoolDetails);

    const [generating, setGenerating] = useState(false);
    const [language, setLanguage] = useState('English');

    useEffect(() => {
        if (user?.organization_key) {
            dispatch(fetchSchoolDetailsRequest(user.organization_key));
        }
    }, [dispatch, user?.organization_key]);

    const getLabel = (text: string) => {
        if (language === 'English') return text;
        const translated = translations[language]?.[text];
        return translated ? `${text} (${translated})` : text;
    };

    const handleDownloadPdf = async () => {
        try {
            const values = form.getFieldsValue();
            setGenerating(true);

            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 15;
            const rightMargin = pageWidth - margin;
            let currentY = 20;

            const checkPageBreak = (neededSpace: number) => {
                if (currentY + neededSpace > pageHeight - margin) {
                    doc.addPage();
                    currentY = 20;
                }
            };

            const logoWidth = 25;
            const photoBoxWidth = 35;
            const photoBoxX = pageWidth - margin - photoBoxWidth;
            const photoBoxY = 15;
            const photoBoxHeight = 40;
            const logoEndX = margin + logoWidth;
            const headerCenterX = (logoEndX + photoBoxX) / 2;

            if (schoolDetails) {
                if (schoolDetails.logo_url) {
                    try {
                        const logoBase64 = await getBase64Image(schoolDetails.logo_url);
                        doc.addImage(logoBase64, 'PNG', margin, photoBoxY, logoWidth, 25);
                    } catch (e) {
                        console.warn("Logo could not be loaded for PDF.", e);
                    }
                }
                
                doc.setFontSize(16);
                doc.setFont('helvetica', 'bold');
                const schoolName = (schoolDetails.school_name || 'SCHOOL RECRUITMENT').toUpperCase();
                const nameLines = doc.splitTextToSize(schoolName, (photoBoxX - logoEndX - 10));
                doc.text(nameLines, headerCenterX, photoBoxY + 5, { align: 'center' });
                
                doc.setFontSize(9);
                doc.setFont('helvetica', 'normal');
                const textYOffset = photoBoxY + 10 + (nameLines.length * 6);
                doc.text(schoolDetails.address || '', headerCenterX, textYOffset, { align: 'center', maxWidth: (photoBoxX - logoEndX - 10) });
                doc.text(`Phone: ${schoolDetails.phone_number || ''} | Email: ${schoolDetails.email || ''}`, headerCenterX, textYOffset + 6, { align: 'center' });
            }

            doc.setDrawColor(150);
            doc.rect(photoBoxX, photoBoxY, photoBoxWidth, photoBoxHeight);
            doc.setFontSize(8);
            doc.text('Affix Recent', photoBoxX + (photoBoxWidth / 2), photoBoxY + 18, { align: 'center' });
            doc.text('Passport Photo', photoBoxX + (photoBoxWidth / 2), photoBoxY + 22, { align: 'center' });

            currentY = photoBoxY + photoBoxHeight + 5;
            doc.setDrawColor(0);
            doc.setLineWidth(0.5);
            doc.line(margin, currentY, rightMargin, currentY);
            
            currentY += 10;
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text(getLabel('TEACHER RECRUITMENT APPLICATION FORM'), pageWidth / 2, currentY, { align: 'center' });

            currentY += 10;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`${getLabel('Application No')}: ____________________`, margin, currentY);
            doc.text(`${getLabel('Date')}: ____________________`, rightMargin - 65, currentY);

            const drawField = (label: string, value: any, x: number, y: number, endX: number) => {
                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                const labelText = getLabel(label) + ':';
                doc.text(labelText, x, y);
                doc.setFont('helvetica', 'normal');
                const labelWidth = doc.getTextWidth(labelText);
                const valStr = value ? String(value) : '';
                doc.text(valStr, x + labelWidth + 2, y);
                doc.setDrawColor(180);
                doc.setLineWidth(0.1);
                doc.line(x + labelWidth, y + 1, endX, y + 1);
            };

            const addSectionHeader = (title: string) => {
                currentY += 10;
                checkPageBreak(25);
                doc.setFillColor(240, 240, 240);
                doc.rect(margin, currentY - 5, pageWidth - (margin * 2), 7, 'F');
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(0);
                doc.text(getLabel(title).toUpperCase(), margin + 2, currentY);
                currentY += 10;
            };

            addSectionHeader('Personal Information');
            drawField('Full Name', values.full_name, margin, currentY, rightMargin);
            currentY += 10;
            
            const col3Width = (rightMargin - margin - 10) / 3;
            drawField('Gender', values.gender, margin, currentY, margin + col3Width);
            drawField('Date of Birth', values.dob ? dayjs(values.dob).format('DD/MM/YYYY') : '', margin + col3Width + 5, currentY, margin + (col3Width * 2) + 5);
            drawField('Blood Group', values.blood_group, margin + (col3Width * 2) + 10, currentY, rightMargin);
            currentY += 10;
            
            drawField('Nationality', values.nationality, margin, currentY, margin + 85);
            drawField('Religion', values.religion, margin + 95, currentY, rightMargin);
            currentY += 10;
            drawField('Marital Status', values.marital_status, margin, currentY, margin + 85);
            drawField('Aadhar Number', values.aadhar_number, margin + 95, currentY, rightMargin);
            currentY += 10;

            addSectionHeader('Professional & Academic Background');
            drawField('Highest Qualification', values.highest_qualification, margin, currentY, rightMargin);
            currentY += 10;
            drawField('Specialization', values.specialization, margin, currentY, margin + 85);
            drawField('Exp (Years)', values.experience_years, margin + 95, currentY, rightMargin);
            currentY += 10;
            drawField('Applied For Dept', values.department, margin, currentY, margin + 85);
            drawField('Applied Post', values.designation, margin + 95, currentY, rightMargin);
            currentY += 10;
            drawField('Subjects Can Handle', values.subjects_handled, margin, currentY, rightMargin);
            currentY += 10;

            addSectionHeader('Statutory & Bank Information');
            drawField('PAN Number', values.pan_number, margin, currentY, margin + 85);
            drawField('UAN Number', values.uan_no, margin + 95, currentY, rightMargin);
            currentY += 10;
            drawField('Bank Name', values.bank_name, margin, currentY, margin + 85);
            drawField('Account No', values.bank_account_no, margin + 95, currentY, rightMargin);
            currentY += 10;
            drawField('PF Number', values.pf_number, margin, currentY, rightMargin);
            currentY += 10;

            addSectionHeader('Contact & Communication');
            drawField('Primary Mobile', values.mobile_number, margin, currentY, margin + 85);
            drawField('Alternate No', values.alternate_number, margin + 95, currentY, rightMargin);
            currentY += 10;
            drawField('Email Address', values.email, margin, currentY, rightMargin);
            currentY += 10;
            drawField('Permanent Address', values.permanent_address, margin, currentY, rightMargin);
            currentY += 10;
            drawField('Emergency Contact Name', values.emergency_contact_name, margin, currentY, margin + 85);
            drawField('Contact No', values.emergency_contact_phone, margin + 95, currentY, rightMargin);
            currentY += 10;

            checkPageBreak(40);
            currentY += 15;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text(getLabel('DECLARATION'), margin, currentY);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            currentY += 6;
            const declaration = "I hereby declare that all the information furnished above is true and correct to the best of my knowledge and belief. I understand that any false information may lead to the rejection of my application or termination of service.";
            doc.text(declaration, margin, currentY, { maxWidth: 180 });

            currentY += 25;
            doc.line(margin, currentY, margin + 50, currentY);
            doc.text(getLabel('Date'), margin + 20, currentY + 5);

            doc.line(rightMargin - 50, currentY, rightMargin, currentY);
            doc.text(getLabel('Signature of Applicant'), rightMargin - 45, currentY + 5);

            doc.save(`Teacher_Application_${values.full_name || 'Blank'}.pdf`);
            message.success("Teacher Application Form downloaded!");
        } catch (error) {
            console.error(error);
            message.error("Failed to generate PDF.");
        } finally {
            setGenerating(false);
        }
    };

    const getBase64Image = (url: string): Promise<string> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.setAttribute('crossOrigin', 'anonymous');
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0);
                const dataURL = canvas.toDataURL('image/png');
                resolve(dataURL);
            };
            img.onerror = (error) => reject(error);
            img.src = url;
        });
    };

    const handleAddressCheckbox = (e: any) => {
        if (e.target.checked) {
            const permanentAddress = form.getFieldValue('permanent_address');
            form.setFieldsValue({ temporary_address: permanentAddress });
        }
    };

    const DynamicFieldList = ({ name, label }: { name: string, label: string }) => (
        <Form.List name={name}>
            {(fields, { add, remove }) => (
                <div style={{ marginTop: 16 }}>
                    <Divider orientation="left" plain>
                        <Text type="secondary">Extra {label}</Text>
                    </Divider>
                    {fields.map(({ key, name: fieldName, ...restField }) => (
                        <Row key={key} gutter={16} align="bottom" style={{ marginBottom: 16 }}>
                            <Col xs={10} md={10}>
                                <Form.Item
                                    {...restField}
                                    name={[fieldName, 'label']}
                                    label="Field Label"
                                    rules={[{ required: true, message: 'Missing label' }]}
                                >
                                    <Input placeholder="e.g., References" />
                                </Form.Item>
                            </Col>
                            <Col xs={10} md={10}>
                                <Form.Item
                                    {...restField}
                                    name={[fieldName, 'value']}
                                    label="Value"
                                >
                                    <Input placeholder="Enter value (optional)" />
                                </Form.Item>
                            </Col>
                            <Col xs={4} md={4}>
                                <Form.Item>
                                    <Button type="text" danger icon={<MinusCircleOutlined />} onClick={() => remove(fieldName)} />
                                </Form.Item>
                            </Col>
                        </Row>
                    ))}
                    <Form.Item>
                        <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                            Add Extra Field to {label}
                        </Button>
                    </Form.Item>
                </div>
            )}
        </Form.List>
    );

    return (
        <Card>
            <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
                <Col>
                    <Title level={4} style={{ margin: 0 }}>Teacher Recruitment Form Generator</Title>
                    <Text type="secondary">Generate professional printable forms for recruitment.</Text>
                </Col>
                <Col>
                    <Space wrap>
                        <Select 
                            value={language} 
                            onChange={setLanguage} 
                            prefix={<GlobalOutlined />} 
                            style={{ width: 150 }}
                        >
                            <Option value="English">English</Option>
                            <Option value="Tamil">Tamil</Option>
                        </Select>
                        <Button type="primary" icon={<DownloadOutlined />} onClick={handleDownloadPdf} loading={generating}>
                            Download Printable PDF
                        </Button>
                    </Space>
                </Col>
            </Row>

            <Spin spinning={schoolLoading}>
                <Form form={form} layout="vertical">
                    <Tabs defaultActiveKey="1" type="card">
                        <TabPane tab="1. Personal" key="1">
                            <Row gutter={16}>
                                <Col xs={24} md={12}><Form.Item name="full_name" label="Full Name"><Input placeholder="As per ID Proof" /></Form.Item></Col>
                                <Col xs={12} md={6}><Form.Item name="gender" label="Gender"><Select allowClear><Option value="Male">Male</Option><Option value="Female">Female</Option><Option value="Other">Other</Option></Select></Form.Item></Col>
                                <Col xs={12} md={6}><Form.Item name="dob" label="Date of Birth"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
                                <Col xs={12} md={8}><Form.Item name="blood_group" label="Blood Group"><Input /></Form.Item></Col>
                                <Col xs={12} md={8}><Form.Item name="nationality" label="Nationality"><Input /></Form.Item></Col>
                                <Col xs={12} md={8}><Form.Item name="religion" label="Religion"><Input /></Form.Item></Col>
                                <Col xs={12} md={8}><Form.Item name="marital_status" label="Marital Status"><Select allowClear><Option value="Single">Single</Option><Option value="Married">Married</Option><Option value="Widowed">Widowed</Option><Option value="Divorced">Divorced</Option></Select></Form.Item></Col>
                                <Col xs={24} md={16}><Form.Item name="aadhar_number" label="Aadhar Card Number"><Input /></Form.Item></Col>
                            </Row>
                            <DynamicFieldList name="custom_personal" label="Personal Details" />
                        </TabPane>

                        <TabPane tab="2. Professional" key="2">
                            <Row gutter={16}>
                                <Col xs={24} md={12}><Form.Item name="highest_qualification" label="Highest Qualification"><Input /></Form.Item></Col>
                                <Col xs={24} md={12}><Form.Item name="specialization" label="Area of Specialization"><Input /></Form.Item></Col>
                                <Col xs={12} md={8}><Form.Item name="experience_years" label="Total Experience (Years)"><InputNumber style={{ width: '100%' }} /></Form.Item></Col>
                                <Col xs={12} md={8}><Form.Item name="department" label="Preferred Department"><Input /></Form.Item></Col>
                                <Col xs={12} md={8}><Form.Item name="designation" label="Applied Designation"><Input /></Form.Item></Col>
                                <Col span={24}><Form.Item name="subjects_handled" label="Subjects Proficient In"><Input placeholder="e.g. Mathematics, Physics" /></Form.Item></Col>
                                <Col span={24}><Form.Item name="graduation_details" label="Graduation Details (Degree, Univ, Year)"><Input.TextArea rows={2} /></Form.Item></Col>
                            </Row>
                            <DynamicFieldList name="custom_professional" label="Professional Background" />
                        </TabPane>

                        <TabPane tab="3. Bank & Statutory" key="3">
                            <Row gutter={16}>
                                <Col xs={24} md={12}><Form.Item name="pan_number" label="PAN Number"><Input /></Form.Item></Col>
                                <Col xs={24} md={12}><Form.Item name="uan_no" label="UAN Number (if any)"><Input /></Form.Item></Col>
                                <Col xs={24} md={12}><Form.Item name="bank_name" label="Bank Name"><Input /></Form.Item></Col>
                                <Col xs={24} md={12}><Form.Item name="bank_account_no" label="Bank Account Number"><Input /></Form.Item></Col>
                                <Col xs={24} md={12}><Form.Item name="pf_number" label="PF Account Number"><Input /></Form.Item></Col>
                                <Col xs={24} md={12}><Form.Item name="pan_card" label="Income Tax Status"><Input /></Form.Item></Col>
                            </Row>
                            <DynamicFieldList name="custom_bank" label="Statutory Info" />
                        </TabPane>

                        <TabPane tab="4. Contact & Address" key="4">
                            <Row gutter={16}>
                                <Col xs={24} md={12}><Form.Item name="mobile_number" label="Primary Mobile No"><Input /></Form.Item></Col>
                                <Col xs={24} md={12}><Form.Item name="alternate_number" label="Alternate No"><Input /></Form.Item></Col>
                                <Col span={24}><Form.Item name="email" label="Email Address"><Input /></Form.Item></Col>
                                <Col span={24}><Divider orientation="left">Communication Details</Divider></Col>
                                <Col xs={24} md={12}><Form.Item name="permanent_address" label="Permanent Address"><Input.TextArea rows={2} /></Form.Item></Col>
                                <Col xs={24} md={12}>
                                    <Form.Item name="temporary_address" label="Correspondence Address"><Input.TextArea rows={2} /></Form.Item>
                                    <Checkbox onChange={handleAddressCheckbox}>Same as permanent address</Checkbox>
                                </Col>
                                <Col xs={24} md={12}><Form.Item name="emergency_contact_name" label="Emergency Contact Person"><Input /></Form.Item></Col>
                                <Col xs={24} md={12}><Form.Item name="emergency_contact_phone" label="Emergency Contact No"><Input /></Form.Item></Col>
                            </Row>
                        </TabPane>
                    </Tabs>
                </Form>
            </Spin>
        </Card>
    );
};

export default TeacherApplicationForm;
