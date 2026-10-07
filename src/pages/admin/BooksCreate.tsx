

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Button, Card, Typography, Modal, Form, Input, Row, Col, Select, Table, Space, Popconfirm, message, Spin, Image, InputNumber } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, PrinterOutlined, UploadOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store/store';
import { addBookRequest, fetchBooksRequest, updateBookRequest, deleteBookRequest, bulkAddBooksRequest, type Book } from '../../store/features/books/booksSlice';
import BookBulkUploadModal from './BookBulkUploadModal';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;
const { Search } = Input;

export const generateBookCode = () => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    let letterPart = '';
    let numberPart = '';
    for (let i = 0; i < 3; i++) {
        letterPart += letters.charAt(Math.floor(Math.random() * letters.length));
    }
    for (let i = 0; i < 4; i++) {
        numberPart += numbers.charAt(Math.floor(Math.random() * numbers.length));
    }
    return `${letterPart}${numberPart}`;
};

const BooksCreate: React.FC = () => {
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isPrintModalVisible, setIsPrintModalVisible] = useState(false);
    const [isUploadModalVisible, setIsUploadModalVisible] = useState(false);
    const [editingBook, setEditingBook] = useState<Book | null>(null);
    const [printingBook, setPrintingBook] = useState<Book | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [form] = Form.useForm();
    const dispatch: AppDispatch = useDispatch();
    const { books, loading } = useSelector((state: RootState) => state.books);
    const { user } = useSelector((state: RootState) => state.auth);
    const printableRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (user?.organization_key) {
            dispatch(fetchBooksRequest(user.organization_key));
        }
    }, [dispatch, user?.organization_key]);
    
    const filteredBooks = useMemo(() => {
        if (!searchTerm) {
            return books;
        }
        return books.filter(book =>
            book.book_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            book.book_code.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [books, searchTerm]);


    const showModal = (book: Book | null = null) => {
        setEditingBook(book);
        if (book) {
            form.setFieldsValue(book);
        } else {
            form.setFieldsValue({
                book_code: generateBookCode(),
                status: 'Active',
                book_name: '',
                author_name: '',
                description: '',
                no_of_books: 1,
            });
        }
        setIsModalVisible(true);
    };
    
    const showPrintModal = (book: Book) => {
        setPrintingBook(book);
        setIsPrintModalVisible(true);
    };

    const handleCancel = () => {
        setIsModalVisible(false);
        setEditingBook(null);
        form.resetFields();
    };

    const handlePrintCancel = () => {
        setIsPrintModalVisible(false);
        setPrintingBook(null);
    };

    const onFinish = (values: any) => {
        if (!user?.organization_key) {
            message.error("Cannot save book without an organization key.");
            return;
        }
        
        const payload = { ...values, organization_key: user.organization_key };

        if (editingBook) {
            dispatch(updateBookRequest({ ...payload, id: editingBook.id }));
        } else {
            dispatch(addBookRequest(payload));
        }
        handleCancel();
    };

    const handleDelete = (id: string) => {
        dispatch(deleteBookRequest(id));
    };

    const handlePrint = () => {
        const printContent = printableRef.current;
        if (printContent) {
            const printWindow = window.open('', '', 'height=600,width=800');
            printWindow?.document.write('<html><head><title>Print Barcode</title>');
            printWindow?.document.write('<style>body { text-align: center; font-family: sans-serif; } img { max-width: 100%; }</style>');
            printWindow?.document.write('</head><body>');
            printWindow?.document.write(printContent.innerHTML);
            printWindow?.document.write('</body></html>');
            printWindow?.document.close();
            printWindow?.focus();
            printWindow?.print();
            printWindow?.close();
        }
    };
    
    const handleBulkUpload = (data: any[]) => {
        if (!user?.organization_key) {
            message.error("Cannot upload books without an organization context.");
            return;
        }
        dispatch(bulkAddBooksRequest({ books: data, organizationKey: user.organization_key }));
        setIsUploadModalVisible(false);
    };
    
    const toDataURL = async (url: string): Promise<string> => {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    };

    const handlePdfDownload = async () => {
        message.loading({ content: 'Generating PDF...', key: 'pdf' });
        const doc = new jsPDF();
        doc.text('Book List', 14, 16);

        const tableColumn = ["Book Code", "Book Name", "Author Name", "No of Books", "Status", "Barcode"];
        const tableRows = filteredBooks.map(book => [
            book.book_code,
            book.book_name,
            book.author_name,
            book.no_of_books || 'N/A',
            book.status,
            book.book_code
        ]);
        
        const barcodeCache = new Map<string, string>();
        for (const book of filteredBooks) {
            if (book.book_code && !barcodeCache.has(book.book_code)) {
                try {
                    const barcodeUrl = `https://barcode.tec-it.com/barcode.ashx?data=${book.book_code}&code=Code128&dpi=96`;
                    const barcodeDataUri = await toDataURL(barcodeUrl);
                    barcodeCache.set(book.book_code, barcodeDataUri);
                } catch (e) {
                    console.error("Failed to generate barcode image for", book.book_code, e);
                }
            }
        }
        
        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 20,
            didDrawCell: (data) => {
                if (data.column.index === 5 && data.cell.text.length > 0) {
                    const bookCode = data.cell.text[0];
                    const barcodeDataUri = barcodeCache.get(bookCode);

                    if (barcodeDataUri) {
                        data.cell.text = [];
                        doc.addImage(barcodeDataUri, 'PNG', data.cell.x + 2, data.cell.y + 2, 40, 10);
                    }
                }
            }
        });
        
        doc.save('book_list.pdf');
        message.success({ content: 'PDF downloaded!', key: 'pdf', duration: 2 });
    };

    const handleHtmlDownload = () => {
        let htmlString = `
            <html><head><title>Book List</title>
            <style>
                table { width: 100%; border-collapse: collapse; } 
                th, td { border: 1px solid #ddd; padding: 8px; } 
                th { background-color: #f2f2f2; }
                img { max-height: 25px; }
            </style>
            </head><body><h1>Book List</h1>
            <table><thead><tr><th>Book Code</th><th>Book Name</th><th>Author Name</th><th>No of Books</th><th>Status</th><th>Barcode</th></tr></thead><tbody>
        `;
        filteredBooks.forEach(book => {
            htmlString += `<tr>
                <td>${book.book_code}</td>
                <td>${book.book_name}</td>
                <td>${book.author_name}</td>
                <td>${book.no_of_books || 'N/A'}</td>
                <td>${book.status}</td>
                <td><img src="https://barcode.tec-it.com/barcode.ashx?data=${book.book_code}&code=Code128" alt="barcode" /></td>
            </tr>`;
        });
        htmlString += `</tbody></table></body></html>`;
        const blob = new Blob([htmlString], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'book_list.html';
        a.click(); URL.revokeObjectURL(url);
    };

    const columns = [
        { title: 'Book Code', dataIndex: 'book_code', key: 'book_code' },
        { 
            title: 'Barcode', 
            dataIndex: 'book_code', 
            key: 'barcode',
            render: (bookCode: string) => bookCode ? <Image src={`https://barcode.tec-it.com/barcode.ashx?data=${bookCode}&code=Code128`} preview={false} style={{ minHeight: 40 }} /> : null
        },
        { title: 'Book Name', dataIndex: 'book_name', key: 'book_name' },
        { title: 'Author Name', dataIndex: 'author_name', key: 'author_name' },
        { title: 'No of Books', dataIndex: 'no_of_books', key: 'no_of_books', render: (text: number) => text || 'N/A' },
        { title: 'Status', dataIndex: 'status', key: 'status' },
        {
            title: 'Action',
            key: 'action',
            render: (_: any, record: Book) => (
                <Space size="middle">
                    <Button icon={<EditOutlined />} onClick={() => showModal(record)} />
                    <Button icon={<PrinterOutlined />} onClick={() => showPrintModal(record)} />
                    <Popconfirm title="Are you sure to delete this book?" onConfirm={() => handleDelete(record.id)}>
                        <Button icon={<DeleteOutlined />} danger />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <>
            <Card>
                <Row justify="space-between" align="middle" style={{ marginBottom: 24 }} gutter={[16, 16]}>
                    <Col xs={24} md={12}>
                        <Title level={4} style={{ margin: 0 }}>Create Book</Title>
                    </Col>
                    <Col xs={24} md={12} style={{ textAlign: 'right' }}>
                        <Space wrap>
                            <Button type="default" icon={<UploadOutlined />} onClick={() => setIsUploadModalVisible(true)}>
                                Bulk Upload
                            </Button>
                            <Button type="primary" icon={<PlusOutlined />} onClick={() => showModal()}>
                                Create Book
                            </Button>
                        </Space>
                    </Col>
                </Row>
                 <Row justify="end" style={{ marginBottom: 24 }}>
                    <Col xs={24} md={8}>
                        <Search
                            placeholder="Search by Book Name or Code"
                            onChange={e => setSearchTerm(e.target.value)}
                            style={{ width: '100%' }}
                        />
                    </Col>
                </Row>
                
                <Spin spinning={loading}>
                    <div style={{overflowX: 'auto'}}>
                        <Table 
                            columns={columns} 
                            dataSource={filteredBooks} 
                            rowKey="id" 
                            bordered
                            scroll={{ x: 'max-content' }}
                            footer={() => (
                                <Row justify="start">
                                    <Col>
                                        <Space wrap>
                                            <Text strong>Download Report:</Text>
                                            <Button onClick={handlePdfDownload} disabled={filteredBooks.length === 0}>PDF</Button>
                                            <Button onClick={handleHtmlDownload} disabled={filteredBooks.length === 0}>HTML</Button>
                                        </Space>
                                    </Col>
                                </Row>
                            )}
                        />
                    </div>
                </Spin>
            </Card>

            <Modal
                title={editingBook ? "Edit Book" : "Create a New Book"}
                open={isModalVisible}
                onCancel={handleCancel}
                footer={null}
                width={800}
                destroyOnClose
            >
                <Form form={form} layout="vertical" onFinish={onFinish} style={{ marginTop: 24 }}>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="book_code" label="Book Code">
                                <Input disabled />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="book_name" label="Book Name" rules={[{ required: true }]}>
                                <Input placeholder="Enter the book name" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="author_name" label="Author Name" rules={[{ required: true }]}>
                                <Input placeholder="Enter the author's name" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="no_of_books" label="No of Books" rules={[{ type: 'number', min: 0, message: 'Please enter a valid number.' }]}>
                                <InputNumber style={{ width: '100%' }} placeholder="Enter quantity" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                             <Form.Item name="status" label="Status" rules={[{ required: true }]}>
                                <Select>
                                    <Option value="Active">Active</Option>
                                    <Option value="Inactive">Inactive</Option>
                                    <Option value="Progress">Progress</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                         <Col span={24}>
                            <Form.Item name="description" label="Description">
                                <TextArea rows={4} placeholder="Enter a brief description of the book" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item style={{ marginTop: '24px', textAlign: 'right' }}>
                        <Button onClick={handleCancel} style={{ marginRight: 8 }}>
                            Cancel
                        </Button>
                        <Button type="primary" htmlType="submit" loading={loading}>
                            {editingBook ? 'Update' : 'Create'}
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title="Print Barcode"
                open={isPrintModalVisible}
                onCancel={handlePrintCancel}
                footer={[
                    <Button key="back" onClick={handlePrintCancel}>
                        Cancel
                    </Button>,
                    <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={handlePrint}>
                        Print Barcode
                    </Button>,
                ]}
            >
                {printingBook && (
                    <div ref={printableRef} style={{ textAlign: 'center', padding: '24px' }}>
                        <Title level={5}>{printingBook.book_name}</Title>
                        <Text>{printingBook.author_name}</Text>
                        <div style={{ margin: '16px 0' }}>
                            <Image
                                src={`https://barcode.tec-it.com/barcode.ashx?data=${printingBook.book_code}&code=Code128&dpi=96`}
                                preview={false}
                                style={{ maxWidth: '100%', height: 'auto' }}
                            />
                        </div>
                        <Text strong>{printingBook.book_code}</Text>
                    </div>
                )}
            </Modal>
            
            <BookBulkUploadModal
                visible={isUploadModalVisible}
                onClose={() => setIsUploadModalVisible(false)}
                onUpload={handleBulkUpload}
            />
        </>
    );
};

export default BooksCreate;
