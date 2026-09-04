import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { Search, CreditCard, Calendar, User, Trash2 } from 'lucide-react';
import { Table, Button, Form, Card, InputGroup, Spinner, Badge } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

interface SaleItem {
    id: string;
    quantity: number;
    price: number;
    product?: { name: string };
    service?: { name: string };
}

interface Sale {
    id: string;
    total: number;
    createdAt: string;
    client?: { name: string };
    items: SaleItem[];
}

const Sales: React.FC = () => {
    const { t } = useTranslation();
    const [sales, setSales] = useState<Sale[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSales();
    }, []);

    const fetchSales = async () => {
        try {
            const response = await api.get('/sales');
            setSales(response.data);
        } catch (error) {
            console.error('Error fetching sales:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Delete this sale? This action cannot be undone.')) return;
        try {
            await api.delete(`/sales/${id}`);
            fetchSales();
        } catch (error: any) {
            console.error('Error deleting sale:', error);
            alert(error?.response?.data?.message || 'Failed to delete sale');
        }
    };

    return (
        <div className="py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h1 className="h3 mb-1 fw-bold text-dark">{t('sales_history')}</h1>
                    <p className="text-secondary mb-0">{t('sales_history_desc')}</p>
                </div>
            </div>

            <Card className="shadow-sm border-0 rounded-4 overflow-hidden">
                <Card.Body className="p-0">
                    <div className="p-4 border-bottom bg-light bg-opacity-10">
                        <InputGroup style={{ maxWidth: '400px' }}>
                            <InputGroup.Text className="bg-white border-end-0">
                                <Search size={18} className="text-muted" />
                            </InputGroup.Text>
                            <Form.Control
                                placeholder={t('search')}
                                className="border-start-0"
                            />
                        </InputGroup>
                    </div>

                    <div className="table-responsive">
                        {loading ? (
                            <div className="text-center py-5">
                                <Spinner animation="border" variant="primary" />
                                <p className="mt-2 text-muted">{t('loading_transactions')}</p>
                            </div>
                        ) : (
                            <Table hover className="align-middle mb-0">
                                <thead className="table-light">
                                    <tr className="text-uppercase small fw-bold text-muted">
                                        <th className="px-4 py-3">{t('transaction')}</th>
                                        <th className="px-4 py-3">{t('clients')}</th>
                                        <th className="px-4 py-3">{t('items')}</th>
                                        <th className="px-4 py-3">{t('mode')}</th>
                                        <th className="px-4 py-3">{t('total')}</th>
                                        <th className="px-4 py-3 text-end">{t('actions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sales.map((sale) => (
                                        <tr key={sale.id}>
                                            <td className="px-4 py-3">
                                                <div className="fw-semibold text-dark">#{sale.id.slice(0, 8)}</div>
                                                <small className="text-muted d-flex align-items-center gap-1">
                                                    <Calendar size={12} /> {new Date(sale.createdAt).toLocaleDateString()}
                                                </small>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="d-flex align-items-center gap-2">
                                                    <User size={16} className="text-muted" />
                                                    <span className="text-dark">{sale.client?.name || t('guest_customer')}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge bg="info-subtle" text="info" className="px-2 py-1 rounded-2 border border-info-subtle small fw-medium">
                                                    {sale.items.length} {sale.items.length === 1 ? t('item') : t('items')}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="d-flex align-items-center gap-1 text-secondary small">
                                                    <CreditCard size={14} /> {t('card_payment')}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 fw-bold text-dark fs-6">
                                                €{Number(sale.total).toFixed(2)}
                                            </td>
                                            <td className="px-4 py-3 text-end">
                                                <Button
                                                    variant="link"
                                                    className="text-danger p-0 d-flex align-items-center gap-1 ms-auto text-decoration-none"
                                                    onClick={() => handleDelete(sale.id)}
                                                >
                                                    <Trash2 size={18} /> <span className="small fw-bold">{t('delete')}</span>
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        )}
                        {!loading && sales.length === 0 && (
                            <div className="text-center py-5 text-muted">
                                {t('no_sales_recorded')}
                            </div>
                        )}
                    </div>
                </Card.Body>
            </Card>
        </div>
    );
};

export default Sales;
