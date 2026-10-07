import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Row, Col, Select, DatePicker, Typography, Tabs, Checkbox, message, Spin, Divider, Space, InputNumber } from 'antd';
import { DownloadOutlined, PlusOutlined, MinusCircleOutlined, GlobalOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../../store/store';
import { fetchClassesRequest } from '../../store/features/classes/classesSlice';
import { fetchAcademicCalendarsRequest } from '../../store/features/academic-calendar/academicCalendarSlice';
import { fetchSchoolDetailsRequest } from '../../store/features/school-details/schoolDetailsSlice';
import dayjs from 'dayjs';
import jsPDF from 'jspdf';

const { Title, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

const translations: Record<string, Record<string, string>> = {
    Tamil: {
        'ADMISSION APPLICATION FORM': 'சேர்க்கை விண்ணப்பப் படிவம்',
        'Application No': 'விண்ணப்ப எண்',
        'Date': 'தேதி',
        'Academic Details': 'கல்வி விவரங்கள்',
        'Class Seeking Admission': 'சேர்க்கை கோரும் வகுப்பு',
        'Academic Year': 'கல்வியாண்டு',
        'Admission Type': 'சேர்க்கை வகை',
        'Medium': 'பயிற்று மொழி',
        'Student Personal Details': 'மாணவர் தனிப்பட்ட விவரங்கள்',
        'Full Name of Student': 'மாணவரின் முழு பெயர்',
        'Gender': 'பாலினம்',
        'Date of Birth': 'பிறந்த தேதி',
        'Blood Group': 'இரத்த வகை',
        'Nationality': 'தேசிய இனம்',
        'Mother Tongue': 'தாய்மொழி',
        'Religion': 'மதம்',
        'Social Category': 'சமூக வகை',
        'Aadhar Number': 'ஆதார் எண்',
        'Birth Place': 'பிறந்த இடம்',
        'Identification Marks': 'அடையாளக் குறிகள்',
        'Parent / Guardian Details': 'பெற்றோர் / பாதுகாவலர் விவரங்கள்',
        'Father Name': 'தந்தையின் பெயர்',
        'Occupation': 'தொழில்',
        'Mother Name': 'தாயின் பெயர்',
        'Guardian Name': 'பாதுகாவலர் பெயர்',
        'Contact No': 'தொடர்பு எண்',
        'Mobile Number': 'கைபேசி எண்',
        'Annual Income': 'ஆண்டு வருமானம்',
        'Communication Address': 'தொடர்பு முகவரி',
        'Permanent Address': 'நிரந்தர முகவரி',
        'City': 'நகரம்',
        'District': 'மாவட்டம்',
        'State': 'மாநிலம்',
        'Pin Code': 'அஞ்சல் குறியீடு',
        'Previous Schooling History': 'முந்தைய பள்ளி வரலாறு',
        'School Name': 'பள்ளியின் பெயர்',
        'Last Class Studied': 'கடைசியாகப் படித்த வகுப்பு',
        'Board': 'கல்வி வாரியம்',
        'TC Number': 'மாற்றுச் சான்றிதழ் எண்',
        'Result': 'முடிவு',
        'Health & Extra Skills': 'சுகாதாரம் மற்றும் கூடுதல் திறன்கள்',
        'Height (cm)': 'உயரம் (செ.மீ)',
        'Weight (kg)': 'எடை (கி.கி)',
        'Vision': 'பார்வை திறன்',
        'Medical History': 'மருத்துவ வரலாறு',
        'DECLARATION': 'உறுதிமொழி',
        'Signature of Parent/Guardian': 'பெற்றோர்/பாதுகாவலர் கையொப்பம்',
    },
    Malayalam: {
        'ADMISSION APPLICATION FORM': 'പ്രവേശന അപേക്ഷാ ഫോം',
        'Application No': 'അപേക്ഷാ നമ്പർ',
        'Date': 'തീയതി',
    },
    Hindi: {
        'ADMISSION APPLICATION FORM': 'प्रवेश आवेदन पत्र',
        'Application No': 'आवेदन संख्या',
        'Date': 'तारीख',
    }
};

const ApplicationForm: React.FC = () => {
    const [form] = Form.useForm();
    const dispatch: AppDispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const { classes, loading: classesLoading } = useSelector((state: RootState) => state.classes);
    const { calendars: academicYears, loading: calendarsLoading } = useSelector((state: RootState) => state.academicCalendar);
    const { details: schoolDetails, loading: schoolLoading } = useSelector((state: RootState) => state.schoolDetails);

    const [generating, setGenerating] = useState(false);
    const [language, setLanguage] = useState('English');

    useEffect(() => {
        if (user?.organization_key) {
            dispatch(fetchClassesRequest());
            dispatch(fetchAcademicCalendarsRequest(user.organization_key));
            dispatch(fetchSchoolDetailsRequest(user.organization_key));
        }
    }, [dispatch, user?.organization_key]);

    const uniqueClassNames = [...new Set(classes.filter(c => c.status === 'Active').map(c => c.class_name))];

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
                const schoolName = (schoolDetails.school_name || 'SCHOOL APPLICATION FORM').toUpperCase();
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
            doc.text('Affix Passport', photoBoxX + (photoBoxWidth / 2), photoBoxY + 18, { align: 'center' });
            doc.text('Size Photo', photoBoxX + (photoBoxWidth / 2), photoBoxY + 22, { align: 'center' });

            currentY = photoBoxY + photoBoxHeight + 5;
            doc.setDrawColor(0);
            doc.setLineWidth(0.5);
            doc.line(margin, currentY, rightMargin, currentY);
            
            currentY += 10;
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text(getLabel('ADMISSION APPLICATION FORM'), pageWidth / 2, currentY, { align: 'center' });

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

            addSectionHeader('Academic Details');
            drawField('Class Seeking Admission', values.admitted_class, margin, currentY, margin + 85);
            drawField('Academic Year', values.academic_year, margin + 95, currentY, rightMargin);
            currentY += 10;
            drawField('Admission Type', values.admission_type, margin, currentY, margin + 85);
            drawField('Medium', values.medium, margin + 95, currentY, rightMargin);
            currentY += 10;

            addSectionHeader('Student Personal Details');
            drawField('Full Name of Student', values.full_name, margin, currentY, rightMargin);
            currentY += 10;
            
            const col3Width = (rightMargin - margin - 10) / 3;
            drawField('Gender', values.gender, margin, currentY, margin + col3Width);
            drawField('Date of Birth', values.dob ? dayjs(values.dob).format('DD/MM/YYYY') : '', margin + col3Width + 5, currentY, margin + (col3Width * 2) + 5);
            drawField('Blood Group', values.blood_group, margin + (col3Width * 2) + 10, currentY, rightMargin);
            currentY += 10;
            
            drawField('Nationality', values.nationality, margin, currentY, margin + 85);
            drawField('Mother Tongue', values.mother_tongue, margin + 95, currentY, rightMargin);
            currentY += 10;
            drawField('Religion', values.religion, margin, currentY, margin + 85);
            drawField('Social Category', values.social_category, margin + 95, currentY, rightMargin);
            currentY += 10;
            drawField('Aadhar Number', values.aadhar_number, margin, currentY, margin + 85);
            drawField('Birth Place', values.birth_place, margin + 95, currentY, rightMargin);
            currentY += 10;
            drawField('Identification Marks', values.identification_marks, margin, currentY, rightMargin);
            currentY += 10;

            if (values.custom_personal) {
                values.custom_personal.forEach((field: any) => {
                    if (field?.label) {
                        drawField(field.label, field.value, margin, currentY, rightMargin);
                        currentY += 10;
                    }
                });
            }

            addSectionHeader('Parent / Guardian Details');
            drawField('Father Name', values.father_name, margin, currentY, margin + 85);
            drawField('Occupation', values.father_occupation, margin + 95, currentY, rightMargin);
            currentY += 10;
            drawField('Mother Name', values.mother_name, margin, currentY, margin + 85);
            drawField('Occupation', values.mother_occupation, margin + 95, currentY, rightMargin);
            currentY += 10;
            drawField('Guardian Name', values.guardian_name, margin, currentY, margin + 85);
            drawField('Contact No', values.guardian_contact, margin + 95, currentY, rightMargin);
            currentY += 10;
            drawField('Mobile Number', values.parent_contact, margin, currentY, margin + 85);
            drawField('Annual Income', values.annual_income, margin + 95, currentY, rightMargin);
            currentY += 10;

            if (values.custom_parent) {
                values.custom_parent.forEach((field: any) => {
                    if (field?.label) {
                        drawField(field.label, field.value, margin, currentY, rightMargin);
                        currentY += 10;
                    }
                });
            }

            addSectionHeader('Communication Address');
            drawField('Permanent Address', values.permanent_address, margin, currentY, rightMargin);
            currentY += 10;
            drawField('City', values.city, margin, currentY, margin + 55);
            drawField('District', values.district, margin + 60, currentY, margin + 125);
            drawField('State', values.state, margin + 130, currentY, rightMargin);
            currentY += 10;
            drawField('Pin Code', values.pin_code, margin, currentY, margin + 55);
            currentY += 10;

            addSectionHeader('Health & Extra Skills');
            drawField('Height (cm)', values.height, margin, currentY, margin + 55);
            drawField('Weight (kg)', values.weight, margin + 60, currentY, margin + 125);
            drawField('Vision', values.vision_test, margin + 130, currentY, rightMargin);
            currentY += 10;
            drawField('Medical History', values.medical_history, margin, currentY, rightMargin);
            currentY += 10;

            if (values.custom_health) {
                values.custom_health.forEach((field: any) => {
                    if (field?.label) {
                        drawField(field.label, field.value, margin, currentY, rightMargin);
                        currentY += 10;
                    }
                });
            }

            checkPageBreak(40);
            currentY += 15;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text(getLabel('DECLARATION'), margin, currentY);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            currentY += 6;
            const declaration = "I hereby declare that the information provided above is true and correct to the best of my knowledge. I understand that any false statement may result in the cancellation of the admission.";
            doc.text(declaration, margin, currentY, { maxWidth: 180 });

            currentY += 25;
            doc.line(margin, currentY, margin + 50, currentY);
            doc.text(getLabel('Date'), margin + 20, currentY + 5);

            doc.line(rightMargin - 60, currentY, rightMargin, currentY);
            doc.text(getLabel('Signature of Parent/Guardian'), rightMargin - 55, currentY + 5);

            doc.save(`Application_Form_${values.full_name || 'Blank'}.pdf`);
            message.success("Application Form PDF downloaded!");
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

    const isLoading = classesLoading || calendarsLoading || schoolLoading;

    return (
        <Card>
            <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
                <Col>
                    <Title level={4} style={{ margin: 0 }}>Student Application Form Generator</Title>
                    <Text type="secondary">Generate a professional, bilingual printable application form.</Text>
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
                            <Option value="Malayalam">Malayalam</Option>
                            <Option value="Hindi">Hindi</Option>
                        </Select>
                        <Button type="primary" icon={<DownloadOutlined />} onClick={handleDownloadPdf} loading={generating}>
                            Download Printable PDF
                        </Button>
                    </Space>
                </Col>
            </Row>

            <Spin spinning={isLoading}>
                <Form form={form} layout="vertical">
                    <Tabs defaultActiveKey="1" type="card">
                        <TabPane tab="1. Personal Details" key="1">
                            <Row gutter={16}>
                                <Col xs={24} md={12}><Form.Item name="full_name" label="Full Name"><Input placeholder="As per documents" /></Form.Item></Col>
                                <Col xs={12} md={6}><Form.Item name="gender" label="Gender"><Select allowClear><Option value="Male">Male</Option><Option value="Female">Female</Option><Option value="Other">Other</Option></Select></Form.Item></Col>
                                <Col xs={12} md={6}><Form.Item name="dob" label="Date of Birth"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
                                <Col xs={12} md={8}><Form.Item name="mother_tongue" label="Mother Tongue"><Input /></Form.Item></Col>
                                <Col xs={12} md={8}><Form.Item name="nationality" label="Nationality"><Input /></Form.Item></Col>
                                <Col xs={12} md={8}><Form.Item name="blood_group" label="Blood Group"><Input /></Form.Item></Col>
                                <Col xs={12} md={8}><Form.Item name="religion" label="Religion"><Input /></Form.Item></Col>
                                <Col xs={12} md={8}><Form.Item name="social_category" label="Social Category"><Select allowClear><Option value="General">General</Option><Option value="OBC">OBC</Option><Option value="SC">SC</Option><Option value="ST">ST</Option><Option value="Other">Other</Option></Select></Form.Item></Col>
                                <Col xs={12} md={8}><Form.Item name="area_type" label="Area Type"><Select allowClear><Option value="Rural">Rural</Option><Option value="Urban">Urban</Option></Select></Form.Item></Col>
                                <Col xs={24} md={8}><Form.Item name="aadhar_number" label="Aadhar Number"><Input /></Form.Item></Col>
                                <Col xs={24} md={8}><Form.Item name="birth_place" label="Birth Place"><Input /></Form.Item></Col>
                                <Col xs={24} md={8}><Form.Item name="identification_marks" label="Identification Marks"><Input /></Form.Item></Col>
                            </Row>
                            <DynamicFieldList name="custom_personal" label="Personal Details" />
                        </TabPane>

                        <TabPane tab="2. Parent & Address" key="2">
                            <Row gutter={16}>
                                <Col xs={24} md={12}><Form.Item name="father_name" label="Father Name"><Input /></Form.Item></Col>
                                <Col xs={24} md={12}><Form.Item name="father_occupation" label="Father Occupation"><Input /></Form.Item></Col>
                                <Col xs={24} md={12}><Form.Item name="mother_name" label="Mother Name"><Input /></Form.Item></Col>
                                <Col xs={24} md={12}><Form.Item name="mother_occupation" label="Mother Occupation"><Input /></Form.Item></Col>
                                <Col xs={24} md={8}><Form.Item name="guardian_name" label="Guardian Name"><Input /></Form.Item></Col>
                                <Col xs={24} md={8}><Form.Item name="guardian_contact" label="Guardian Contact"><Input /></Form.Item></Col>
                                <Col xs={24} md={8}><Form.Item name="annual_income" label="Annual Family Income"><Input /></Form.Item></Col>
                                <Col xs={24} md={12}><Form.Item name="parent_contact" label="Primary Mobile Number"><Input /></Form.Item></Col>
                                <Col xs={24} md={12}><Form.Item name="parent_email" label="Parent Email ID"><Input /></Form.Item></Col>
                                <Col span={24}><Divider orientation="left">Residential Address</Divider></Col>
                                <Col xs={24} md={12}><Form.Item name="permanent_address" label="Permanent Address"><Input.TextArea rows={2} /></Form.Item></Col>
                                <Col xs={24} md={12}>
                                    <Form.Item name="temporary_address" label="Communication Address"><Input.TextArea rows={2} /></Form.Item>
                                    <Checkbox onChange={handleAddressCheckbox}>Same as permanent address</Checkbox>
                                </Col>
                                <Col xs={12} md={6}><Form.Item name="city" label="City"><Input /></Form.Item></Col>
                                <Col xs={12} md={6}><Form.Item name="district" label="District"><Input /></Form.Item></Col>
                                <Col xs={12} md={6}><Form.Item name="state" label="State"><Input /></Form.Item></Col>
                                <Col xs={12} md={6}><Form.Item name="pin_code" label="Pin Code"><Input /></Form.Item></Col>
                            </Row>
                            <DynamicFieldList name="custom_parent" label="Parent & Address" />
                        </TabPane>

                        <TabPane tab="3. Admission Details" key="3">
                            <Row gutter={16}>
                                <Col xs={24} md={8}>
                                    <Form.Item name="admitted_class" label="Class for Admission">
                                        <Select showSearch placeholder="Select class" loading={classesLoading} allowClear>
                                            {uniqueClassNames.map(className => (
                                                <Option key={className} value={className}>{className}</Option>
                                            ))}
                                        </Select>
                                    </Form.Item>
                                </Col>
                                <Col xs={24} md={8}>
                                    <Form.Item name="academic_year" label="Academic Year">
                                        <Select placeholder="Select year" loading={calendarsLoading} allowClear>
                                            {academicYears.map(year => <Option key={year.id} value={year.academic_year}>{year.academic_year}</Option>)}
                                        </Select>
                                    </Form.Item>
                                </Col>
                                <Col xs={24} md={8}>
                                    <Form.Item name="admission_type" label="Admission Type">
                                        <Select allowClear><Option value="New">New</Option><Option value="Transfer">Transfer</Option></Select>
                                    </Form.Item>
                                </Col>
                                <Col span={24}><Divider orientation="left">Last School Information</Divider></Col>
                                <Col xs={24} md={12}><Form.Item name="previous_school_name" label="Previous School Name"><Input /></Form.Item></Col>
                                <Col xs={12} md={6}><Form.Item name="last_class_studied" label="Last Class Studied"><Input /></Form.Item></Col>
                                <Col xs={12} md={6}><Form.Item name="previous_school_board" label="Previous School Board"><Input /></Form.Item></Col>
                                <Col xs={12} md={6}><Form.Item name="tc_number" label="TC Number"><Input /></Form.Item></Col>
                                <Col xs={12} md={6}><Form.Item name="medium" label="Medium of Instruction"><Input /></Form.Item></Col>
                                <Col xs={12} md={12}><Form.Item name="result" label="Previous Exam Result"><Input /></Form.Item></Col>
                            </Row>
                            <DynamicFieldList name="custom_academic" label="Admission Details" />
                        </TabPane>

                        <TabPane tab="4. Health & Skills" key="4">
                            <Row gutter={16}>
                                <Col xs={12} md={6}><Form.Item name="height" label="Height (cm)"><InputNumber style={{ width: '100%' }} /></Form.Item></Col>
                                <Col xs={12} md={6}><Form.Item name="weight" label="Weight (kg)"><InputNumber style={{ width: '100%' }} /></Form.Item></Col>
                                <Col xs={24} md={12}><Form.Item name="blood_group" label="Blood Group"><Input /></Form.Item></Col>
                                <Col xs={24} md={12}><Form.Item name="vision_test" label="Vision Test"><Input /></Form.Item></Col>
                                <Col xs={24} md={12}><Form.Item name="disability" label="Disability (if any)"><Input /></Form.Item></Col>
                                <Col span={24}><Form.Item name="medical_history" label="Significant Medical History (if any)"><Input.TextArea rows={3} /></Form.Item></Col>
                                <Col span={24}><Form.Item name="known_allergies" label="Known Allergies"><Input.TextArea rows={2} /></Form.Item></Col>
                                <Col span={24}><Form.Item name="extracurricular_skills" label="Interests & Hobbies"><Input.TextArea rows={2} /></Form.Item></Col>
                            </Row>
                            <DynamicFieldList name="custom_health" label="Health & Skills" />
                        </TabPane>
                    </Tabs>
                </Form>
            </Spin>
        </Card>
    );
};

export default ApplicationForm;
