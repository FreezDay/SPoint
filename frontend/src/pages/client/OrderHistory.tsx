import React, { useEffect, useState } from 'react';
import { Container, Card, Table, Badge, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import api from '../../lib/api';
import { format } from 'date-fns';
import { Package, CheckCircle, Clock } from 'lucide-react';

const OrderHistory: React.FC = () => {
    const { t } = useTranslation();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const response = await api.get('/sales/me');
                setOrders(response.data);
            } catch (error) {
                console.error('Error fetching orders:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchOrders();
    }, []);

    if (loading) return <div className="text-center py-5"><Spinner animation="border" /></div>;

    return (
        <Container className="py-4">
            <h1 className="h3 mb-4 fw-bold">{t('my_orders')}</h1>

            <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
                <Card.Body className="p-0">
                    <div className="table-responsive">
                        {orders.length === 0 ? (
                            <div className="text-center py-5">
                                <Package size={48} className="text-muted mb-3 opacity-25" />
                                <p className="text-muted">{t('no_orders_yet')}</p>
                            </div>
                        ) : (
                            <Table hover className="align-middle mb-0">
                                <thead className="table-light">
                                    <tr className="text-uppercase small fw-bold text-muted">
                                        <th className="px-4 py-3">{t('date')}</th>
                                        <th className="px-4 py-3">{t('order_id')}</th>
                                        <th className="px-4 py-3">{t('items')}</th>
                                        <th className="px-4 py-3">{t('total')}</th>
                                        <th className="px-4 py-3">{t('status')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orders.map((order) => (
                                        <tr key={order.id}>
                                            <td className="px-4 py-3">
                                                <div className="d-flex align-items-center gap-2">
                                                    <Clock size={16} className="text-muted" />
                                                    {format(new Date(order.createdAt), 'MMM d, yyyy')}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 small text-muted font-monospace">{order.id.split('-')[0]}...</td>
                                            <td className="px-4 py-3">
                                                {order.items.map((item: any, idx: number) => (
                                                    <div key={idx} className="small">
                                                        {item.quantity}x {item.product?.name || item.service?.name}
                                                    </div>
                                                ))}
                                            </td>
                                            <td className="px-4 py-3 fw-bold text-primary">€{Number(order.total).toFixed(2)}</td>
                                            <td className="px-4 py-3">
                                                <Badge bg="success" className="rounded-pill px-3 py-2 d-inline-flex align-items-center gap-1">
                                                    <CheckCircle size={12} /> {t('completed')}
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        )}
                    </div>
                </Card.Body>
            </Card>
        </Container>
    );
};

export default OrderHistory;
