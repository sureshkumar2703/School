import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    Row,
    Col,
    Card,
    Typography,
    Button,
    Input,
    Select,
    Table,
    Tag,
    Modal,
    Form,
    InputNumber,
    Space,
    Popconfirm,
    Badge,
    Spin,
    Divider,
    Segmented,
    Tooltip,
    Grid,
    Progress,
    Empty,
    Alert,
    message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
    BookOutlined,
    PlusOutlined,
    SearchOutlined,
    PrinterOutlined,
    EditOutlined,
    DeleteOutlined,
    EyeOutlined,
    UploadOutlined,
    DownloadOutlined,
    ReloadOutlined,
    CheckCircleFilled,
    ClockCircleOutlined,
    ReadOutlined,
    BarChartOutlined,
    PieChartOutlined,
    TeamOutlined,
    FilePdfOutlined,
    FileExcelOutlined,
    AppstoreOutlined,
    UnorderedListOutlined,
    InfoCircleOutlined,
    RocketOutlined,
    SafetyCertificateOutlined,
    TagOutlined,
    ApartmentOutlined,
    RightOutlined,
    ArrowUpOutlined,
} from '@ant-design/icons';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title as ChartTitle,
    Tooltip as ChartTooltip,
    Legend,
    ArcElement,
} from 'chart.js';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { RootState, AppDispatch } from '../../store/store';
import {
    fetchBooksRequest,
    addBookRequest,
    updateBookRequest,
    deleteBookRequest,
    bulkAddBooksRequest,
    type Book,
} from '../../store/features/books/booksSlice';
import { fetchSchoolDetailsRequest } from '../../store/features/school-details/schoolDetailsSlice';
import { setCurrentPage } from '../../store/features/navigation/navigationSlice';
import BookBulkUploadModal from '../admin/BookBulkUploadModal';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    ChartTitle,
    ChartTooltip,
    Legend,
    ArcElement
);

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

// Helper: Generate unique book accession code
export const generateBookCode = (): string => {
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

const LibraryDashboard: React.FC = () => {
    const screens = Grid.useBreakpoint();
    const isMobile = !screens.md;

    const dispatch: AppDispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const { books, loading: booksLoading } = useSelector((state: RootState) => state.books);
    const { details: schoolDetails } = useSelector((state: RootState) => state.schoolDetails);

    // Filter & search states
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'Active' | 'Inactive' | 'Progress'>('all');
    const [sortBy, setSortBy] = useState<'newest' | 'title' | 'volume'>('newest');
    const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

    // Modals
    const [isBookModalVisible, setIsBookModalVisible] = useState(false);
    const [isViewModalVisible, setIsViewModalVisible] = useState(false);
    const [isPrintModalVisible, setIsPrintModalVisible] = useState(false);
    const [isUploadModalVisible, setIsUploadModalVisible] = useState(false);

    // Active selection for modals
    const [editingBook, setEditingBook] = useState<Book | null>(null);
    const [viewingBook, setViewingBook] = useState<Book | null>(null);
    const [printingBook, setPrintingBook] = useState<Book | null>(null);

    const [form] = Form.useForm();
    const printableRef = useRef<HTMLDivElement>(null);

    // Initial data fetch
    useEffect(() => {
        if (user?.organization_key) {
            dispatch(fetchBooksRequest(user.organization_key));
            dispatch(fetchSchoolDetailsRequest(user.organization_key));
        }
    }, [dispatch, user?.organization_key]);

    // Greeting time calculation
    const greetingText = useMemo(() => {
        const hour = dayjs().hour();
        if (hour < 12) return 'Good Morning';
        if (hour < 17) return 'Good Afternoon';
        return 'Good Evening';
    }, []);

    // 1. KPI Statistics
    const stats = useMemo(() => {
        const totalTitles = books.length;
        const totalCopies = books.reduce((acc, b) => acc + (Number(b.no_of_books) || 1), 0);
        const activeBooks = books.filter((b) => b.status === 'Active');
        const activeCopies = activeBooks.reduce((acc, b) => acc + (Number(b.no_of_books) || 1), 0);
        const inactiveBooks = books.filter((b) => b.status === 'Inactive' || b.status === 'Progress');

        const uniqueAuthors = new Set(books.map((b) => (b.author_name ? b.author_name.trim().toLowerCase() : ''))).size;
        const activeRate = totalTitles > 0 ? Math.round((activeBooks.length / totalTitles) * 100) : 0;
        const avgCopies = totalTitles > 0 ? (totalCopies / totalTitles).toFixed(1) : '0';

        return {
            totalTitles,
            totalCopies,
            activeCount: activeBooks.length,
            activeCopies,
            inactiveCount: inactiveBooks.length,
            uniqueAuthors,
            activeRate,
            avgCopies,
        };
    }, [books]);

    // 2. Filtered & Sorted Catalog
    const filteredBooks = useMemo(() => {
        let result = [...books];

        // Search filter
        if (searchTerm.trim()) {
            const q = searchTerm.toLowerCase();
            result = result.filter(
                (b) =>
                    b.book_name.toLowerCase().includes(q) ||
                    b.book_code.toLowerCase().includes(q) ||
                    b.author_name.toLowerCase().includes(q) ||
                    (b.description && b.description.toLowerCase().includes(q))
            );
        }

        // Status filter
        if (statusFilter !== 'all') {
            result = result.filter((b) => b.status === statusFilter);
        }

        // Sorting
        if (sortBy === 'newest') {
            result.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
        } else if (sortBy === 'title') {
            result.sort((a, b) => a.book_name.localeCompare(b.book_name));
        } else if (sortBy === 'volume') {
            result.sort((a, b) => (Number(b.no_of_books) || 0) - (Number(a.no_of_books) || 0));
        }

        return result;
    }, [books, searchTerm, statusFilter, sortBy]);

    // 3. Chart Data: Status Distribution
    const statusChartData = useMemo(() => {
        let active = 0;
        let progress = 0;
        let inactive = 0;

        books.forEach((b) => {
            if (b.status === 'Active') active++;
            else if (b.status === 'Progress') progress++;
            else if (b.status === 'Inactive') inactive++;
            else active++;
        });

        return {
            labels: ['Active Available', 'In Circulation / Progress', 'Under Maintenance / Inactive'],
            datasets: [
                {
                    data: [active, progress, inactive],
                    backgroundColor: ['#2563eb', '#f59e0b', '#ef4444'],
                    hoverBackgroundColor: ['#1d4ed8', '#d97706', '#dc2626'],
                    borderWidth: 2,
                    borderColor: '#ffffff',
                },
            ],
        };
    }, [books]);

    // 4. Chart Data: Top Authors Collection Volume
    const authorChartData = useMemo(() => {
        const authorMap: Record<string, number> = {};

        books.forEach((b) => {
            const author = b.author_name ? b.author_name.trim() : 'Unknown';
            authorMap[author] = (authorMap[author] || 0) + (Number(b.no_of_books) || 1);
        });

        const sorted = Object.entries(authorMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6);

        return {
            labels: sorted.map(([author]) => (author.length > 14 ? `${author.slice(0, 14)}...` : author)),
            datasets: [
                {
                    label: 'Total Copies in Stock',
                    data: sorted.map(([, count]) => count),
                    backgroundColor: 'rgba(37, 99, 235, 0.85)',
                    borderRadius: 8,
                    hoverBackgroundColor: '#1d4ed8',
                },
            ],
        };
    }, [books]);

    // Handlers for Add/Edit Book
    const handleOpenBookModal = (book: Book | null = null) => {
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
        setIsBookModalVisible(true);
    };

    const handleSaveBook = (values: any) => {
        if (!user?.organization_key) {
            message.error('Organization context is missing. Cannot save book.');
            return;
        }

        const payload = {
            ...values,
            organization_key: user.organization_key,
        };

        if (editingBook) {
            dispatch(updateBookRequest({ ...payload, id: editingBook.id }));
            message.success(`Book "${values.book_name}" updated successfully!`);
        } else {
            dispatch(addBookRequest(payload));
            message.success(`Book "${values.book_name}" added to catalog!`);
        }

        setIsBookModalVisible(false);
        setEditingBook(null);
        form.resetFields();
    };

    const handleDeleteBook = (id: string) => {
        dispatch(deleteBookRequest(id));
        message.success('Book removed from library catalog.');
    };

    // Print Barcode Handler
    const handleOpenPrintModal = (book: Book) => {
        setPrintingBook(book);
        setIsPrintModalVisible(true);
    };

    const handleTriggerPrint = () => {
        const printContent = printableRef.current;
        if (printContent) {
            const printWindow = window.open('', '', 'height=600,width=800');
            printWindow?.document.write('<html><head><title>Print Book Barcode</title>');
            printWindow?.document.write(`
                <style>
                    body { 
                        text-align: center; 
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
                        padding: 30px; 
                        background: #ffffff;
                    } 
                    .barcode-card {
                        border: 2px dashed #94a3b8;
                        border-radius: 12px;
                        padding: 20px;
                        max-width: 360px;
                        margin: 0 auto;
                    }
                    img { max-width: 100%; height: auto; }
                    .school-header { font-weight: 800; font-size: 16px; margin-bottom: 4px; color: #0f172a; }
                    .book-title { font-weight: 700; font-size: 14px; margin: 10px 0 2px 0; color: #1e293b; }
                    .book-meta { font-size: 12px; color: #64748b; margin-bottom: 12px; }
                    .book-code { font-family: monospace; font-size: 13px; font-weight: 700; letter-spacing: 1px; }
                </style>
            `);
            printWindow?.document.write('</head><body>');
            printWindow?.document.write(printContent.innerHTML);
            printWindow?.document.write('</body></html>');
            printWindow?.document.close();
            printWindow?.focus();
            setTimeout(() => {
                printWindow?.print();
                printWindow?.close();
            }, 300);
        }
    };

    // Bulk Upload Handler
    const handleBulkUploadSuccess = (data: any[]) => {
        if (!user?.organization_key) {
            message.error('Organization context is missing.');
            return;
        }
        dispatch(bulkAddBooksRequest({ books: data, organizationKey: user.organization_key }));
        setIsUploadModalVisible(false);
    };

    // Export Catalog to Excel
    const handleExportExcel = () => {
        if (filteredBooks.length === 0) {
            message.warning('No books to export.');
            return;
        }

        const exportData = filteredBooks.map((b, idx) => ({
            'S.No': idx + 1,
            'Book Code': b.book_code,
            'Book Title': b.book_name,
            'Author Name': b.author_name,
            'Available Copies': b.no_of_books || 1,
            'Status': b.status,
            'Description': b.description || '',
            'Date Registered': b.created_at ? dayjs(b.created_at).format('YYYY-MM-DD') : '',
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Library Catalog');
        XLSX.writeFile(wb, `Library_Catalog_${dayjs().format('YYYYMMDD')}.xlsx`);
        message.success('Catalog exported as Excel sheet successfully!');
    };

    // Export Catalog to PDF
    const handleExportPDF = () => {
        if (filteredBooks.length === 0) {
            message.warning('No books to export.');
            return;
        }

        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.text(schoolDetails?.school_name || 'School Library Management', 14, 18);
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Official Catalog Inventory Report — Generated on ${dayjs().format('DD MMMM YYYY')}`, 14, 25);

        const tableColumn = ['Code', 'Book Title', 'Author', 'Copies', 'Status'];
        const tableRows = filteredBooks.map((b) => [
            b.book_code,
            b.book_name,
            b.author_name,
            String(b.no_of_books || 1),
            b.status,
        ]);

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 32,
            headStyles: { fillColor: [37, 99, 235] },
            alternateRowStyles: { fillColor: [248, 250, 252] },
        });

        doc.save(`Library_Catalog_${dayjs().format('YYYYMMDD')}.pdf`);
        message.success('Catalog report downloaded as PDF!');
    };

    // Table view columns definition
    const tableColumns: ColumnsType<Book> = [
        {
            title: 'Book Code',
            dataIndex: 'book_code',
            key: 'book_code',
            width: 130,
            render: (code: string) => (
                <Tag color="blue" style={{ fontWeight: 700, borderRadius: '6px', fontSize: '12px' }}>
                    {code}
                </Tag>
            ),
        },
        {
            title: 'Barcode',
            dataIndex: 'book_code',
            key: 'barcode',
            width: 140,
            render: (code: string) => (
                <img
                    src={`https://barcode.tec-it.com/barcode.ashx?data=${code}&code=Code128`}
                    alt={code}
                    style={{ height: '30px', maxWidth: '120px' }}
                />
            ),
        },
        {
            title: 'Title & Author',
            key: 'title_author',
            render: (_, record) => (
                <div>
                    <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#0f172a' }}>{record.book_name}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>By {record.author_name}</div>
                </div>
            ),
        },
        {
            title: 'Copies',
            dataIndex: 'no_of_books',
            key: 'no_of_books',
            width: 90,
            align: 'center',
            render: (copies: number) => (
                <Badge
                    count={copies || 1}
                    showZero
                    overflowCount={999}
                    style={{
                        backgroundColor: '#eff6ff',
                        color: '#2563eb',
                        border: '1px solid #bfdbfe',
                        fontWeight: 700,
                    }}
                />
            ),
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            width: 110,
            render: (status: string) => {
                const color = status === 'Active' ? 'success' : status === 'Progress' ? 'warning' : 'error';
                return (
                    <Tag color={color} style={{ fontWeight: 700, borderRadius: '6px' }}>
                        {status || 'Active'}
                    </Tag>
                );
            },
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 150,
            align: 'center',
            render: (_, record) => (
                <Space size="small">
                    <Tooltip title="View Details">
                        <Button
                            size="small"
                            type="text"
                            icon={<EyeOutlined style={{ color: '#2563eb' }} />}
                            onClick={() => {
                                setViewingBook(record);
                                setIsViewModalVisible(true);
                            }}
                        />
                    </Tooltip>
                    <Tooltip title="Print Barcode">
                        <Button
                            size="small"
                            type="text"
                            icon={<PrinterOutlined style={{ color: '#059669' }} />}
                            onClick={() => handleOpenPrintModal(record)}
                        />
                    </Tooltip>
                    <Tooltip title="Edit Book">
                        <Button
                            size="small"
                            type="text"
                            icon={<EditOutlined style={{ color: '#d97706' }} />}
                            onClick={() => handleOpenBookModal(record)}
                        />
                    </Tooltip>
                    <Popconfirm
                        title="Remove Book"
                        description="Are you sure you want to delete this book record?"
                        onConfirm={() => handleDeleteBook(record.id)}
                        okText="Yes, Delete"
                        cancelText="Cancel"
                        okButtonProps={{ danger: true }}
                    >
                        <Tooltip title="Delete">
                            <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                        </Tooltip>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div
            style={{
                
                maxWidth: '1440px',
                margin: '0 auto',
                boxSizing: 'border-box',
                width: '100%',
            }}
        >
            {/* 1. HERO BANNER */}
            <div
                style={{
                    background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #4f46e5 100%)',
                    borderRadius: isMobile ? '16px' : '22px',
                    padding: isMobile ? '18px 16px' : '28px 32px',
                    color: '#ffffff',
                    marginBottom: '20px',
                    boxShadow: '0 10px 25px -5px rgba(37, 99, 235, 0.25)',
                    position: 'relative',
                    overflow: 'hidden',
                    width: '100%',
                    boxSizing: 'border-box',
                }}
            >
                {/* Decorative glow shapes */}
                <div
                    style={{
                        position: 'absolute',
                        right: '-40px',
                        top: '-40px',
                        width: '220px',
                        height: '220px',
                        borderRadius: '50%',
                        background: 'rgba(255, 255, 255, 0.08)',
                        pointerEvents: 'none',
                    }}
                />
                <div
                    style={{
                        position: 'absolute',
                        right: '120px',
                        bottom: '-50px',
                        width: '150px',
                        height: '150px',
                        borderRadius: '50%',
                        background: 'rgba(255, 255, 255, 0.05)',
                        pointerEvents: 'none',
                    }}
                />

                <Row gutter={[20, 16]} align="middle" justify="space-between">
                    <Col xs={24} md={15}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                            <span
                                style={{
                                    background: 'rgba(255, 255, 255, 0.18)',
                                    backdropFilter: 'blur(8px)',
                                    padding: '4px 12px',
                                    borderRadius: '20px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    letterSpacing: '0.4px',
                                    color: '#e0f2fe',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                }}
                            >
                                <BookOutlined /> Library Management System
                            </span>
                            <span
                                style={{
                                    background: '#10b981',
                                    color: '#ffffff',
                                    padding: '3px 10px',
                                    borderRadius: '12px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                }}
                            >
                                <span
                                    style={{
                                        width: '6px',
                                        height: '6px',
                                        borderRadius: '50%',
                                        background: '#ffffff',
                                        display: 'inline-block',
                                    }}
                                />
                                Live Catalog Active
                            </span>
                        </div>

                        <h1
                            style={{
                                fontSize: isMobile ? '20px' : '26px',
                                fontWeight: 800,
                                margin: '0 0 6px 0',
                                color: '#ffffff',
                                letterSpacing: '-0.5px',
                                lineHeight: 1.25,
                            }}
                        >
                            {greetingText}, {user?.full_name || 'Librarian'} 📚
                        </h1>

                        <p
                            style={{
                                color: 'rgba(255, 255, 255, 0.92)',
                                fontSize: isMobile ? '12px' : '13.5px',
                                margin: 0,
                                lineHeight: 1.45,
                                maxWidth: '720px',
                            }}
                        >
                            Welcome to the central library control center. Access catalog analytics, register new titles,
                            print barcode accession stickers, and track stock circulation.
                        </p>
                    </Col>

                    {/* Quick Action Pill in Hero */}
                    <Col xs={24} md={9}>
                        <div
                            style={{
                                background: 'rgba(255, 255, 255, 0.14)',
                                backdropFilter: 'blur(12px)',
                                borderRadius: '16px',
                                padding: '14px 18px',
                                border: '1px solid rgba(255, 255, 255, 0.22)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '10px',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <span style={{ fontSize: '11px', color: '#cbd5e1', display: 'block' }}>Library Institution:</span>
                                    <span style={{ fontWeight: 800, fontSize: '13px', color: '#ffffff' }}>
                                        {schoolDetails?.school_name || 'Central School Library'}
                                    </span>
                                </div>
                                <Tag color="blue" style={{ margin: 0, fontWeight: 700, borderRadius: '6px' }}>
                                    {dayjs().format('DD MMM YYYY')}
                                </Tag>
                            </div>

                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', flexDirection: isMobile ? 'column' : 'row' }}>
                                <Button
                                    block={isMobile}
                                    type="primary"
                                    icon={<PlusOutlined />}
                                    onClick={() => handleOpenBookModal()}
                                    style={{
                                        flex: isMobile ? 'none' : 1,
                                        borderRadius: '10px',
                                        fontWeight: 700,
                                        background: '#ffffff',
                                        color: '#1e3a8a',
                                        border: 'none',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                    }}
                                >
                                    Add New Book
                                </Button>
                                <Button
                                    block={isMobile}
                                    icon={<UploadOutlined />}
                                    onClick={() => setIsUploadModalVisible(true)}
                                    style={{
                                        flex: isMobile ? 'none' : 'auto',
                                        borderRadius: '10px',
                                        fontWeight: 700,
                                        background: 'rgba(255, 255, 255, 0.2)',
                                        color: '#ffffff',
                                        borderColor: 'rgba(255, 255, 255, 0.35)',
                                    }}
                                >
                                    Bulk Upload
                                </Button>
                            </div>
                        </div>
                    </Col>
                </Row>
            </div>

            {/* 2. KPI STATISTICS ROW */}
            <Row gutter={[16, 16]} style={{ marginBottom: '20px' }}>
                {/* 1. Total Titles */}
                <Col xs={12} sm={12} lg={6}>
                    <Card
                        style={{
                            borderRadius: '16px',
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
                            background: '#ffffff',
                            height: '100%',
                        }}
                        bodyStyle={{ padding: isMobile ? '12px 14px' : '18px 20px' }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                            <div style={{ minWidth: 0, flex: 1 }}>
                                <Text type="secondary" ellipsis style={{ fontSize: isMobile ? '11px' : '12px', fontWeight: 600, display: 'block' }}>
                                    Book Titles
                                </Text>
                                <div
                                    style={{
                                        fontSize: isMobile ? '18px' : '24px',
                                        fontWeight: 800,
                                        color: '#0f172a',
                                        marginTop: '2px',
                                    }}
                                >
                                    {stats.totalTitles}
                                </div>
                                <span style={{ fontSize: '11px', color: '#64748b' }}>Unique registered titles</span>
                            </div>
                            <div
                                style={{
                                    width: isMobile ? '36px' : '44px',
                                    height: isMobile ? '36px' : '44px',
                                    borderRadius: '12px',
                                    background: '#eff6ff',
                                    color: '#2563eb',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: isMobile ? '18px' : '22px',
                                    flexShrink: 0,
                                }}
                            >
                                <BookOutlined />
                            </div>
                        </div>
                    </Card>
                </Col>

                {/* 2. Total Copies Volume */}
                <Col xs={12} sm={12} lg={6}>
                    <Card
                        style={{
                            borderRadius: '16px',
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
                            background: '#ffffff',
                            height: '100%',
                        }}
                        bodyStyle={{ padding: isMobile ? '12px 14px' : '18px 20px' }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                            <div style={{ minWidth: 0, flex: 1 }}>
                                <Text type="secondary" ellipsis style={{ fontSize: isMobile ? '11px' : '12px', fontWeight: 600, display: 'block' }}>
                                    Total Stock Copies
                                </Text>
                                <div
                                    style={{
                                        fontSize: isMobile ? '18px' : '24px',
                                        fontWeight: 800,
                                        color: '#059669',
                                        marginTop: '2px',
                                    }}
                                >
                                    {stats.totalCopies}
                                </div>
                                <span style={{ fontSize: '11px', color: '#059669', fontWeight: 600 }}>
                                    ~{stats.avgCopies} avg copies / title
                                </span>
                            </div>
                            <div
                                style={{
                                    width: isMobile ? '36px' : '44px',
                                    height: isMobile ? '36px' : '44px',
                                    borderRadius: '12px',
                                    background: '#ecfdf5',
                                    color: '#059669',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: isMobile ? '18px' : '22px',
                                    flexShrink: 0,
                                }}
                            >
                                <CheckCircleFilled />
                            </div>
                        </div>
                    </Card>
                </Col>

                {/* 3. Active in Circulation */}
                <Col xs={12} sm={12} lg={6}>
                    <Card
                        style={{
                            borderRadius: '16px',
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
                            background: '#ffffff',
                            height: '100%',
                        }}
                        bodyStyle={{ padding: isMobile ? '12px 14px' : '18px 20px' }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                            <div style={{ minWidth: 0, flex: 1 }}>
                                <Text type="secondary" ellipsis style={{ fontSize: isMobile ? '11px' : '12px', fontWeight: 600, display: 'block' }}>
                                    Active Catalog
                                </Text>
                                <div
                                    style={{
                                        fontSize: isMobile ? '18px' : '24px',
                                        fontWeight: 800,
                                        color: '#2563eb',
                                        marginTop: '2px',
                                    }}
                                >
                                    {stats.activeCount}
                                </div>
                                <span style={{ fontSize: '11px', color: '#2563eb', fontWeight: 600 }}>
                                    {stats.activeRate}% active rate
                                </span>
                            </div>
                            <div
                                style={{
                                    width: isMobile ? '36px' : '44px',
                                    height: isMobile ? '36px' : '44px',
                                    borderRadius: '12px',
                                    background: '#eff6ff',
                                    color: '#2563eb',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: isMobile ? '18px' : '22px',
                                    flexShrink: 0,
                                }}
                            >
                                <ReadOutlined />
                            </div>
                        </div>
                    </Card>
                </Col>

                {/* 4. Authors Represented */}
                <Col xs={12} sm={12} lg={6}>
                    <Card
                        style={{
                            borderRadius: '16px',
                            border: '1px solid #fed7aa',
                            boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
                            background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                            height: '100%',
                        }}
                        bodyStyle={{ padding: isMobile ? '12px 14px' : '18px 20px' }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                            <div style={{ minWidth: 0, flex: 1 }}>
                                <Text ellipsis style={{ fontSize: isMobile ? '11px' : '12px', fontWeight: 700, color: '#92400e', display: 'block' }}>
                                    Unique Authors
                                </Text>
                                <div
                                    style={{
                                        fontSize: isMobile ? '18px' : '24px',
                                        fontWeight: 800,
                                        color: '#b45309',
                                        marginTop: '2px',
                                    }}
                                >
                                    {stats.uniqueAuthors}
                                </div>
                                <span style={{ fontSize: '11px', color: '#b45309', fontWeight: 600 }}>Authors in collection</span>
                            </div>
                            <div
                                style={{
                                    width: isMobile ? '36px' : '44px',
                                    height: isMobile ? '36px' : '44px',
                                    borderRadius: '12px',
                                    background: 'rgba(217, 119, 6, 0.15)',
                                    color: '#d97706',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: isMobile ? '18px' : '22px',
                                    flexShrink: 0,
                                }}
                            >
                                <TeamOutlined />
                            </div>
                        </div>
                    </Card>
                </Col>
            </Row>

            {/* 3. CHARTS & ANALYTICS SECTION */}
            <Row gutter={[16, 16]} style={{ marginBottom: '22px' }}>
                {/* A. Top Authors Collection Bar Chart */}
                <Col xs={24} lg={15}>
                    <Card
                        title={
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <BarChartOutlined style={{ color: '#2563eb' }} />
                                <span style={{ fontWeight: 800, fontSize: '14.5px', color: '#0f172a' }}>
                                    Top Authors & Stock Volume Distribution
                                </span>
                            </div>
                        }
                        style={{
                            borderRadius: '18px',
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 4px 18px rgba(0,0,0,0.03)',
                            background: '#ffffff',
                            height: '100%',
                        }}
                        bodyStyle={{ padding: '16px 20px' }}
                    >
                        {books.length > 0 ? (
                            <div style={{ height: '240px', position: 'relative' }}>
                                <Bar
                                    data={authorChartData}
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        plugins: {
                                            legend: { display: false },
                                            tooltip: {
                                                callbacks: {
                                                    label: (context) => `Copies: ${context.parsed.y}`,
                                                },
                                            },
                                        },
                                        scales: {
                                            x: {
                                                grid: { display: false },
                                                ticks: { font: { size: 11, weight: 'bold' } },
                                            },
                                            y: {
                                                beginAtZero: true,
                                                grid: { color: '#f1f5f9' },
                                                ticks: { stepSize: 1, font: { size: 11 } },
                                            },
                                        },
                                    }}
                                />
                            </div>
                        ) : (
                            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No book records to display analytics" />
                        )}
                    </Card>
                </Col>

                {/* B. Stock Status Doughnut Chart */}
                <Col xs={24} lg={9}>
                    <Card
                        title={
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <PieChartOutlined style={{ color: '#2563eb' }} />
                                <span style={{ fontWeight: 800, fontSize: '14.5px', color: '#0f172a' }}>
                                    Catalog Health Breakdown
                                </span>
                            </div>
                        }
                        style={{
                            borderRadius: '18px',
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 4px 18px rgba(0,0,0,0.03)',
                            background: '#ffffff',
                            height: '100%',
                        }}
                        bodyStyle={{ padding: '16px 20px' }}
                    >
                        {books.length > 0 ? (
                            <div style={{ height: '240px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Doughnut
                                    data={statusChartData}
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        plugins: {
                                            legend: {
                                                position: 'bottom',
                                                labels: { boxWidth: 12, font: { size: 11, weight: 'bold' } },
                                            },
                                        },
                                        cutout: '68%',
                                    }}
                                />
                            </div>
                        ) : (
                            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No catalog status data" />
                        )}
                    </Card>
                </Col>
            </Row>

            {/* 4. QUICK ACTIONS & UTILITY HUB */}
            <div style={{ marginBottom: '22px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <RocketOutlined style={{ fontSize: '18px', color: '#2563eb' }} />
                        <Title level={4} style={{ margin: 0, fontWeight: 800, color: '#0f172a' }}>
                            Library Management Hub
                        </Title>
                    </div>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                        Essential tools for cataloging, bulk entry, and exports
                    </Text>
                </div>

                <Row gutter={[16, 16]}>
                    {/* Add Book */}
                    <Col xs={12} sm={8} lg={6}>
                        <Card
                            hoverable
                            onClick={() => handleOpenBookModal()}
                            style={{
                                borderRadius: '16px',
                                border: '1px solid #e2e8f0',
                                textAlign: 'center',
                                transition: 'all 0.25s ease',
                                height: '100%',
                            }}
                        >
                            <div
                                style={{
                                    width: '46px',
                                    height: '46px',
                                    borderRadius: '14px',
                                    background: '#eff6ff',
                                    color: '#2563eb',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '22px',
                                    margin: '0 auto 10px auto',
                                }}
                            >
                                <PlusOutlined />
                            </div>
                            <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>Add New Book</div>
                            <Text type="secondary" style={{ fontSize: '11px' }}>Register individual title</Text>
                        </Card>
                    </Col>

                    {/* Bulk Excel Upload */}
                    <Col xs={12} sm={8} lg={6}>
                        <Card
                            hoverable
                            onClick={() => setIsUploadModalVisible(true)}
                            style={{
                                borderRadius: '16px',
                                border: '1px solid #e2e8f0',
                                textAlign: 'center',
                                transition: 'all 0.25s ease',
                                height: '100%',
                            }}
                        >
                            <div
                                style={{
                                    width: '46px',
                                    height: '46px',
                                    borderRadius: '14px',
                                    background: '#ecfdf5',
                                    color: '#059669',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '22px',
                                    margin: '0 auto 10px auto',
                                }}
                            >
                                <UploadOutlined />
                            </div>
                            <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>Bulk Import</div>
                            <Text type="secondary" style={{ fontSize: '11px' }}>Excel / CSV template</Text>
                        </Card>
                    </Col>

                    {/* Full Books Manager Page */}
                    <Col xs={12} sm={8} lg={6}>
                        <Card
                            hoverable
                            onClick={() => dispatch(setCurrentPage('bookscreate'))}
                            style={{
                                borderRadius: '16px',
                                border: '1px solid #e2e8f0',
                                textAlign: 'center',
                                transition: 'all 0.25s ease',
                                height: '100%',
                            }}
                        >
                            <div
                                style={{
                                    width: '46px',
                                    height: '46px',
                                    borderRadius: '14px',
                                    background: '#fdf2f8',
                                    color: '#db2777',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '22px',
                                    margin: '0 auto 10px auto',
                                }}
                            >
                                <ReadOutlined />
                            </div>
                            <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>Full Inventory</div>
                            <Text type="secondary" style={{ fontSize: '11px' }}>Manage all records</Text>
                        </Card>
                    </Col>

                    {/* Export PDF/Excel */}
                    <Col xs={12} sm={8} lg={6}>
                        <Card
                            hoverable
                            onClick={handleExportExcel}
                            style={{
                                borderRadius: '16px',
                                border: '1px solid #e2e8f0',
                                textAlign: 'center',
                                transition: 'all 0.25s ease',
                                height: '100%',
                            }}
                        >
                            <div
                                style={{
                                    width: '46px',
                                    height: '46px',
                                    borderRadius: '14px',
                                    background: '#fffbeb',
                                    color: '#d97706',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '22px',
                                    margin: '0 auto 10px auto',
                                }}
                            >
                                <DownloadOutlined />
                            </div>
                            <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>Export Catalog</div>
                            <Text type="secondary" style={{ fontSize: '11px' }}>Download Excel summary</Text>
                        </Card>
                    </Col>
                </Row>
            </div>

            {/* 5. LIVE BOOK CATALOG EXPLORER */}
            <Card
                style={{
                    borderRadius: '20px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 8px 30px rgba(15, 23, 42, 0.04)',
                    background: '#ffffff',
                    marginBottom: '22px',
                }}
                bodyStyle={{ padding: isMobile ? '14px' : '22px' }}
            >
                {/* Search & Filter Header Bar */}
                <div
                    style={{
                        display: 'flex',
                        flexDirection: isMobile ? 'column' : 'row',
                        justifyContent: 'space-between',
                        alignItems: isMobile ? 'stretch' : 'center',
                        gap: '12px',
                        marginBottom: '18px',
                        borderBottom: '1px solid #f1f5f9',
                        paddingBottom: '16px',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                            style={{
                                width: '38px',
                                height: '38px',
                                borderRadius: '10px',
                                background: 'linear-gradient(135deg, #1e3a8a, #2563eb)',
                                color: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '18px',
                                flexShrink: 0,
                            }}
                        >
                            <BookOutlined />
                        </div>
                        <div>
                            <div style={{ fontWeight: 800, fontSize: '16px', color: '#0f172a' }}>
                                Book Catalog Explorer
                            </div>
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                                Showing {filteredBooks.length} of {books.length} registered titles
                            </Text>
                        </div>
                    </div>

                    {/* View Switcher & Action buttons */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            flexWrap: 'wrap',
                            width: isMobile ? '100%' : 'auto',
                            justifyContent: isMobile ? 'flex-start' : 'flex-end',
                        }}
                    >
                        <Segmented
                            value={viewMode}
                            onChange={(val) => setViewMode(val as 'cards' | 'table')}
                            options={[
                                { label: 'Cards View', value: 'cards', icon: <AppstoreOutlined /> },
                                { label: 'Table View', value: 'table', icon: <UnorderedListOutlined /> },
                            ]}
                            style={{ background: '#f1f5f9', borderRadius: '10px', padding: '3px' }}
                        />

                        <Button
                            icon={<FileExcelOutlined style={{ color: '#059669' }} />}
                            onClick={handleExportExcel}
                            disabled={filteredBooks.length === 0}
                            style={{ borderRadius: '8px', fontWeight: 600 }}
                        >
                            Excel
                        </Button>

                        <Button
                            icon={<FilePdfOutlined style={{ color: '#ef4444' }} />}
                            onClick={handleExportPDF}
                            disabled={filteredBooks.length === 0}
                            style={{ borderRadius: '8px', fontWeight: 600 }}
                        >
                            PDF
                        </Button>

                        <Tooltip title="Refresh Catalog">
                            <Button
                                icon={<ReloadOutlined />}
                                onClick={() => user?.organization_key && dispatch(fetchBooksRequest(user.organization_key))}
                                style={{ borderRadius: '8px' }}
                            />
                        </Tooltip>
                    </div>
                </div>

                {/* Filter Controls Row */}
                <Row gutter={[12, 12]} style={{ marginBottom: '18px' }}>
                    <Col xs={24} sm={12} md={10}>
                        <Input
                            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                            placeholder="Search by book name, code, or author..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            allowClear
                            style={{ borderRadius: '10px', padding: '7px 12px' }}
                        />
                    </Col>
                    <Col xs={12} sm={6} md={7}>
                        <Select
                            value={statusFilter}
                            onChange={(val) => setStatusFilter(val)}
                            style={{ width: '100%', height: '38px' }}
                            options={[
                                { label: `All Status (${books.length})`, value: 'all' },
                                { label: `Active (${stats.activeCount})`, value: 'Active' },
                                { label: 'In Progress', value: 'Progress' },
                                { label: 'Inactive', value: 'Inactive' },
                            ]}
                        />
                    </Col>
                    <Col xs={12} sm={6} md={7}>
                        <Select
                            value={sortBy}
                            onChange={(val) => setSortBy(val)}
                            style={{ width: '100%', height: '38px' }}
                            options={[
                                { label: 'Sort: Newest First', value: 'newest' },
                                { label: 'Sort: Title (A-Z)', value: 'title' },
                                { label: 'Sort: Most Copies', value: 'volume' },
                            ]}
                        />
                    </Col>
                </Row>

                {/* Catalog View Content */}
                <Spin spinning={booksLoading}>
                    {filteredBooks.length > 0 ? (
                        viewMode === 'cards' ? (
                            /* CARDS GRID VIEW */
                            <Row gutter={[16, 16]}>
                                {filteredBooks.map((book) => {
                                    const copies = Number(book.no_of_books) || 1;
                                    const isActive = book.status === 'Active';

                                    return (
                                        <Col xs={24} sm={12} lg={8} key={book.id}>
                                            <Card
                                                hoverable
                                                style={{
                                                    borderRadius: '16px',
                                                    border: '1px solid #e2e8f0',
                                                    boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
                                                    transition: 'all 0.25s ease',
                                                    height: '100%',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    background: '#ffffff',
                                                }}
                                                bodyStyle={{
                                                    padding: isMobile ? '16px' : '20px',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    height: '100%',
                                                }}
                                            >
                                                {/* Top Tag & Accession Code */}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                                    <Tag color="blue" style={{ fontWeight: 800, borderRadius: '6px', fontSize: '11px', margin: 0 }}>
                                                        {book.book_code}
                                                    </Tag>
                                                    <Tag
                                                        color={isActive ? 'success' : book.status === 'Progress' ? 'warning' : 'default'}
                                                        style={{ fontWeight: 700, borderRadius: '6px', margin: 0 }}
                                                    >
                                                        {book.status || 'Active'}
                                                    </Tag>
                                                </div>

                                                {/* Title & Author */}
                                                <div style={{ marginBottom: '12px', minWidth: 0 }}>
                                                    <Title
                                                        level={5}
                                                        ellipsis={{ tooltip: book.book_name }}
                                                        style={{
                                                            margin: '0 0 4px 0',
                                                            fontWeight: 800,
                                                            color: '#0f172a',
                                                            fontSize: '15px',
                                                        }}
                                                    >
                                                        {book.book_name}
                                                    </Title>
                                                    <span style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 600 }}>
                                                        By {book.author_name}
                                                    </span>
                                                </div>

                                                {/* Description */}
                                                {book.description ? (
                                                    <Paragraph
                                                        ellipsis={{ rows: 2, tooltip: book.description }}
                                                        style={{ fontSize: '12px', color: '#475569', marginBottom: '14px', lineHeight: 1.45 }}
                                                    >
                                                        {book.description}
                                                    </Paragraph>
                                                ) : (
                                                    <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic', marginBottom: '14px' }}>
                                                        No description provided
                                                    </div>
                                                )}

                                                {/* Barcode & Copies Badge Strip */}
                                                <div
                                                    style={{
                                                        background: '#f8fafc',
                                                        border: '1px solid #f1f5f9',
                                                        borderRadius: '12px',
                                                        padding: '10px 12px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        marginBottom: '16px',
                                                        marginTop: 'auto',
                                                    }}
                                                >
                                                    <div>
                                                        <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Inventory Stock</span>
                                                        <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                                                            {copies} {copies === 1 ? 'Copy' : 'Copies'}
                                                        </span>
                                                    </div>
                                                    <img
                                                        src={`https://barcode.tec-it.com/barcode.ashx?data=${book.book_code}&code=Code128`}
                                                        alt={book.book_code}
                                                        style={{ height: '28px', maxWidth: '100px' }}
                                                    />
                                                </div>

                                                {/* Action Buttons */}
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <Button
                                                        size="small"
                                                        icon={<EyeOutlined />}
                                                        onClick={() => {
                                                            setViewingBook(book);
                                                            setIsViewModalVisible(true);
                                                        }}
                                                        style={{ flex: 1, borderRadius: '8px', fontWeight: 600 }}
                                                    >
                                                        Details
                                                    </Button>
                                                    <Button
                                                        size="small"
                                                        icon={<PrinterOutlined />}
                                                        onClick={() => handleOpenPrintModal(book)}
                                                        style={{ borderRadius: '8px', fontWeight: 600 }}
                                                    >
                                                        Print
                                                    </Button>
                                                    <Button
                                                        size="small"
                                                        icon={<EditOutlined />}
                                                        onClick={() => handleOpenBookModal(book)}
                                                        style={{ borderRadius: '8px', fontWeight: 600 }}
                                                    />
                                                    <Popconfirm
                                                        title="Delete Book"
                                                        description="Are you sure you want to delete this book?"
                                                        onConfirm={() => handleDeleteBook(book.id)}
                                                        okText="Yes"
                                                        cancelText="No"
                                                        okButtonProps={{ danger: true }}
                                                    >
                                                        <Button size="small" danger icon={<DeleteOutlined />} style={{ borderRadius: '8px' }} />
                                                    </Popconfirm>
                                                </div>
                                            </Card>
                                        </Col>
                                    );
                                })}
                            </Row>
                        ) : (
                            /* TABLE VIEW */
                            <div style={{ overflowX: 'auto' }}>
                                <Table
                                    columns={tableColumns}
                                    dataSource={filteredBooks}
                                    rowKey="id"
                                    pagination={{ pageSize: 8, showSizeChanger: true }}
                                    scroll={{ x: 'max-content' }}
                                />
                            </div>
                        )
                    ) : (
                        <div style={{ padding: '40px 16px', textAlign: 'center' }}>
                            <Empty
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                description={
                                    <div>
                                        <span style={{ fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                                            No books match your criteria
                                        </span>
                                        <Text type="secondary" style={{ fontSize: '12px' }}>
                                            Try adjusting your search terms or add a new book to the library catalog.
                                        </Text>
                                    </div>
                                }
                            >
                                <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenBookModal()} style={{ borderRadius: '8px', marginTop: '12px' }}>
                                    Add New Book
                                </Button>
                            </Empty>
                        </div>
                    )}
                </Spin>
            </Card>

            {/* 6. LIBRARY OPERATING GUIDELINES & HELPER FOOTER */}
            <div
                style={{
                    background: '#f8fafc',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    padding: isMobile ? '16px' : '20px 24px',
                    display: 'flex',
                    alignItems: isMobile ? 'stretch' : 'center',
                    justifyContent: 'space-between',
                    flexDirection: isMobile ? 'column' : 'row',
                    flexWrap: 'wrap',
                    gap: '16px',
                    width: '100%',
                    boxSizing: 'border-box',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flex: isMobile ? '1 1 100%' : '1 1 280px', minWidth: '220px' }}>
                    <InfoCircleOutlined style={{ color: '#2563eb', fontSize: '18px', marginTop: '2px', flexShrink: 0 }} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#0f172a' }}>
                            Standard Library Circulation Guidelines
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.5, marginTop: '2px' }}>
                            All accession numbers must match barcode labels. Standard borrowing limit is 3 books per student (14 days)
                            and 5 books per faculty member (30 days). Damaged or lost items must be marked as 'Inactive'.
                        </div>
                    </div>
                </div>

                <div
                    style={{
                        display: 'flex',
                        gap: '8px',
                        alignItems: 'center',
                        width: isMobile ? '100%' : 'auto',
                        maxWidth: '100%',
                        flexWrap: 'wrap',
                    }}
                >
                    <Button
                        block={isMobile}
                        icon={<BookOutlined />}
                        onClick={() => dispatch(setCurrentPage('bookscreate'))}
                        style={{
                            borderRadius: '8px',
                            fontWeight: 600,
                            flex: isMobile ? '1 1 100%' : '1 1 auto',
                            maxWidth: '100%',
                        }}
                    >
                        Accession Register
                    </Button>
                    <Button
                        block={isMobile}
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => handleOpenBookModal()}
                        style={{
                            borderRadius: '8px',
                            fontWeight: 600,
                            background: '#2563eb',
                            flex: isMobile ? '1 1 100%' : '1 1 auto',
                            maxWidth: '100%',
                        }}
                    >
                        Create Book
                    </Button>
                </div>
            </div>

            {/* ===================== MODALS ===================== */}

            {/* A. ADD / EDIT BOOK MODAL */}
            <Modal
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                            style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '8px',
                                background: '#eff6ff',
                                color: '#2563eb',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '14px',
                            }}
                        >
                            <BookOutlined />
                        </div>
                        <span style={{ fontWeight: 800, fontSize: '16px' }}>
                            {editingBook ? 'Edit Book Details' : 'Register New Book to Catalog'}
                        </span>
                    </div>
                }
                open={isBookModalVisible}
                onCancel={() => {
                    setIsBookModalVisible(false);
                    setEditingBook(null);
                    form.resetFields();
                }}
                footer={null}
                centered
                width={560}
            >
                <Form form={form} layout="vertical" onFinish={handleSaveBook} style={{ marginTop: '16px' }}>
                    <Row gutter={16}>
                        <Col span={14}>
                            <Form.Item
                                name="book_code"
                                label="Book Code / Accession No."
                                rules={[{ required: true, message: 'Please enter or generate a book code' }]}
                            >
                                <Input placeholder="e.g. ABC1234" />
                            </Form.Item>
                        </Col>
                        <Col span={10}>
                            <div style={{ marginTop: '30px' }}>
                                <Button
                                    block
                                    icon={<ReloadOutlined />}
                                    onClick={() => form.setFieldsValue({ book_code: generateBookCode() })}
                                    style={{ borderRadius: '8px', fontWeight: 600 }}
                                >
                                    Auto Generate
                                </Button>
                            </div>
                        </Col>
                    </Row>

                    <Form.Item
                        name="book_name"
                        label="Book Title"
                        rules={[{ required: true, message: 'Please enter the book title' }]}
                    >
                        <Input placeholder="Enter official book title" />
                    </Form.Item>

                    <Form.Item
                        name="author_name"
                        label="Author Name"
                        rules={[{ required: true, message: 'Please enter author name' }]}
                    >
                        <Input placeholder="Author or publication name" />
                    </Form.Item>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                name="no_of_books"
                                label="Number of Copies"
                                rules={[{ required: true, message: 'Please enter copies' }]}
                            >
                                <InputNumber min={1} max={9999} style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name="status"
                                label="Circulation Status"
                                rules={[{ required: true, message: 'Please select status' }]}
                            >
                                <Select
                                    options={[
                                        { label: 'Active (Available)', value: 'Active' },
                                        { label: 'In Progress / Processing', value: 'Progress' },
                                        { label: 'Inactive / Maintenance', value: 'Inactive' },
                                    ]}
                                />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item name="description" label="Description / Subject Notes">
                        <Input.TextArea rows={3} placeholder="Brief subject, category, rack location, or edition notes..." />
                    </Form.Item>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                        <Button
                            onClick={() => {
                                setIsBookModalVisible(false);
                                setEditingBook(null);
                                form.resetFields();
                            }}
                            style={{ borderRadius: '8px' }}
                        >
                            Cancel
                        </Button>
                        <Button type="primary" htmlType="submit" style={{ borderRadius: '8px', background: '#2563eb', fontWeight: 700 }}>
                            {editingBook ? 'Save Changes' : 'Add to Catalog'}
                        </Button>
                    </div>
                </Form>
            </Modal>

            {/* B. VIEW DETAILS MODAL */}
            <Modal
                title={
                    viewingBook && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div
                                style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '8px',
                                    background: '#eff6ff',
                                    color: '#2563eb',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '16px',
                                }}
                            >
                                <BookOutlined />
                            </div>
                            <div>
                                <div style={{ fontWeight: 800, fontSize: '16px' }}>{viewingBook.book_name}</div>
                                <div style={{ fontSize: '11px', color: '#64748b' }}>Book Accession Record Details</div>
                            </div>
                        </div>
                    )
                }
                open={isViewModalVisible}
                onCancel={() => {
                    setIsViewModalVisible(false);
                    setViewingBook(null);
                }}
                footer={[
                    <Button
                        key="print"
                        icon={<PrinterOutlined />}
                        onClick={() => {
                            if (viewingBook) {
                                setIsViewModalVisible(false);
                                handleOpenPrintModal(viewingBook);
                            }
                        }}
                        style={{ borderRadius: '8px' }}
                    >
                        Print Label
                    </Button>,
                    <Button
                        key="close"
                        type="primary"
                        onClick={() => setIsViewModalVisible(false)}
                        style={{ borderRadius: '8px', background: '#2563eb' }}
                    >
                        Close
                    </Button>,
                ]}
                centered
                width={500}
            >
                {viewingBook && (
                    <div style={{ padding: '10px 0' }}>
                        <div style={{ textAlign: 'center', marginBottom: '20px', padding: '16px', background: '#f8fafc', borderRadius: '14px' }}>
                            <img
                                src={`https://barcode.tec-it.com/barcode.ashx?data=${viewingBook.book_code}&code=Code128`}
                                alt={viewingBook.book_code}
                                style={{ height: '54px', maxWidth: '240px' }}
                            />
                            <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '14px', marginTop: '6px', color: '#1e293b' }}>
                                {viewingBook.book_code}
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', borderRadius: '8px' }}>
                                <span style={{ color: '#64748b', fontSize: '13px' }}>Author / Creator:</span>
                                <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '13px' }}>{viewingBook.author_name}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', borderRadius: '8px' }}>
                                <span style={{ color: '#64748b', fontSize: '13px' }}>Available Copies in Stock:</span>
                                <span style={{ fontWeight: 700, color: '#059669', fontSize: '13px' }}>{viewingBook.no_of_books || 1} Copies</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', borderRadius: '8px' }}>
                                <span style={{ color: '#64748b', fontSize: '13px' }}>Circulation Status:</span>
                                <Tag color={viewingBook.status === 'Active' ? 'success' : 'default'} style={{ margin: 0, fontWeight: 700 }}>
                                    {viewingBook.status || 'Active'}
                                </Tag>
                            </div>
                            {viewingBook.description && (
                                <div style={{ padding: '10px 12px', background: '#f8fafc', borderRadius: '8px' }}>
                                    <span style={{ color: '#64748b', fontSize: '12px', display: 'block', marginBottom: '4px' }}>Description:</span>
                                    <span style={{ fontSize: '13px', color: '#334155' }}>{viewingBook.description}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </Modal>

            {/* C. PRINT BARCODE LABEL MODAL */}
            <Modal
                title="Print Book Barcode Sticker"
                open={isPrintModalVisible}
                onCancel={() => {
                    setIsPrintModalVisible(false);
                    setPrintingBook(null);
                }}
                footer={[
                    <Button key="cancel" onClick={() => setIsPrintModalVisible(false)} style={{ borderRadius: '8px' }}>
                        Cancel
                    </Button>,
                    <Button
                        key="print"
                        type="primary"
                        icon={<PrinterOutlined />}
                        onClick={handleTriggerPrint}
                        style={{ borderRadius: '8px', background: '#2563eb', fontWeight: 700 }}
                    >
                        Print Sticker
                    </Button>,
                ]}
                centered
                width={420}
            >
                {printingBook && (
                    <div style={{ padding: '16px 0' }}>
                        <div
                            ref={printableRef}
                            className="barcode-card"
                            style={{
                                border: '2px dashed #94a3b8',
                                borderRadius: '14px',
                                padding: '24px 18px',
                                textAlign: 'center',
                                background: '#ffffff',
                            }}
                        >
                            <div className="school-header" style={{ fontWeight: 800, fontSize: '15px', color: '#1e3a8a', marginBottom: '4px' }}>
                                {schoolDetails?.school_name || 'Central School Library'}
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '14px' }}>
                                Library Accession Identification Label
                            </div>

                            <img
                                src={`https://barcode.tec-it.com/barcode.ashx?data=${printingBook.book_code}&code=Code128`}
                                alt={printingBook.book_code}
                                style={{ maxHeight: '60px', width: 'auto', margin: '0 auto 8px auto', display: 'block' }}
                            />

                            <div className="book-code" style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '15px', letterSpacing: '2px', color: '#0f172a' }}>
                                {printingBook.book_code}
                            </div>

                            <div className="book-title" style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a', marginTop: '12px', marginBottom: '2px' }}>
                                {printingBook.book_name}
                            </div>

                            <div className="book-meta" style={{ fontSize: '12px', color: '#64748b' }}>
                                By {printingBook.author_name}
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            {/* D. BULK UPLOAD MODAL */}
            <BookBulkUploadModal
                visible={isUploadModalVisible}
                onClose={() => setIsUploadModalVisible(false)}
                onUpload={handleBulkUploadSuccess}
            />
        </div>
    );
};

export default LibraryDashboard;
