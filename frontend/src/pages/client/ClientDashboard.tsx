import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Badge, Spinner, Table, Button } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import api from '../../lib/api';
import { Star, Clock, MessageSquare, Newspaper, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

const ClientDashboard: React.FC = () => {
    const { t, i18n } = useTranslation();
    const [appointments, setAppointments] = useState<any[]>([]);
    const [orders, setOrders] = useState<any[]>([]);
    const [news, setNews] = useState<any[]>([]);
    const [loyalty, setLoyalty] = useState<{ count: number, goal: number, progress: number, rewardCode: string | null } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [apptsRes, ordersRes, newsRes, loyaltyRes] = await Promise.all([
                    api.get('/appointments/me'),
                    api.get('/sales/me'),
                    api.get('/news'),
                    api.get('/appointments/loyalty-stats')
                ]);
                setAppointments(apptsRes.data);
                setOrders(ordersRes.data);
                setNews(newsRes.data);
                setLoyalty(loyaltyRes.data);
            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const getLocalizedName = (service: any) => {
        const lang = i18n.language;
        if (lang === 'en' && service.name_en) return service.name_en;
        if (lang === 'pt' && service.name_pt) return service.name_pt;
        if (lang === 'uk' && service.name_uk) return service.name_uk;
        return service.name;
    };

    if (loading) return <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>;

    return (
        <div className="py-4 client-theme">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h1 className="h3 fw-bold text-dark">{t('my_dashboard')}</h1>
                <Link to="/my-inbox" className="btn btn-outline-primary rounded-pill px-4 btn-sm d-flex align-items-center gap-2">
                    <MessageSquare size={16} /> {t('contact_us')}
                </Link>
            </div>

            <Row className="g-4 mb-4">
                <Col md={4}>
                    <Card className="border-0 shadow-sm rounded-4 bg-gradient-brand text-white h-100 position-relative overflow-hidden">
                        <Card.Body className="p-4 position-relative" style={{ zIndex: 1 }}>
                            <p className="mb-1 opacity-75 small text-uppercase fw-bold">{t('barber_loyalty')}</p>
                            <h2 className="display-6 fw-bold mb-3">{loyalty?.count || 0} / {loyalty?.goal || 10} {t('visits')}</h2>
                            <div className="progress bg-white bg-opacity-25 mb-3" style={{ height: '8px' }}>
                                <div
                                    className="progress-bar bg-white"
                                    style={{ width: `${(loyalty?.progress || 0) * 10}%` }}
                                ></div>
                            </div>
                            {loyalty?.rewardCode ? (
                                <div className="bg-white bg-opacity-20 p-2 rounded-3 text-center border border-white border-opacity-25">
                                    <p className="small mb-1 opacity-75">{t('your_reward_code')}:</p>
                                    <span className="fw-bold fs-5">{loyalty.rewardCode}</span>
                                </div>
                            ) : (
                                <p className="small mb-0 opacity-75">
                                    {t('more_visits_reward', { count: (loyalty?.goal || 10) - (loyalty?.count || 0) })}
                                </p>
                            )}
                        </Card.Body>
                        <Star size={100} className="position-absolute opacity-10" style={{ right: '-20px', bottom: '-20px' }} />
                    </Card>
                </Col>
                <Col md={8}>
                    <Card className="border-0 shadow-sm rounded-4 bg-white overflow-hidden h-100">
                        <Card.Body className="p-0 d-flex flex-column flex-md-row">
                            <div className="p-4 flex-grow-1">
                                <h5 className="fw-bold mb-1">{t('get_directions')}</h5>
                                <p className="small text-muted mb-3">{t('visit_us_at', { address: 'Rua de Exemplo 123, Lisboa' })}</p>
                                <Button
                                    variant="primary"
                                    className="rounded-pill px-4"
                                    href="https://www.google.com/maps/dir/?api=1&destination=Rua%20de%20Exemplo%20123,%20Lisboa"
                                    target="_blank"
                                >
                                    {t('open_in_maps')}
                                </Button>
                            </div>
                            <div style={{ height: '180px', minWidth: '300px' }} className="flex-shrink-0">
                                <iframe
                                    title="Barbershop Location"
                                    width="100%"
                                    height="100%"
                                    frameBorder="0"
                                    style={{ border: 0 }}
                                    src="https://maps.google.com/maps?q=Rua%20de%20Exemplo%20123,%20Lisboa&t=&z=14&ie=UTF8&iwloc=&output=embed"
                                    allowFullScreen
                                ></iframe>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <Row className="g-4">
                <Col lg={8}>
                    {/* Appointments Card */}
                    <Card className="border-0 shadow-sm rounded-4 mb-4">
                        <Card.Header className="bg-transparent border-0 p-4 pb-0 d-flex justify-content-between">
                            <h5 className="fw-bold mb-0">{t('my_haircuts_appointments')}</h5>
                            <Link to="/my-booking" className="small text-decoration-none">{t('book_new')} <ArrowRight size={14} /></Link>
                        </Card.Header>
                        <Card.Body className="p-4">
                            {appointments.length === 0 ? (
                                <p className="text-muted text-center py-4">{t('no_appointments_found')}</p>
                            ) : (
                                <div className="table-responsive">
                                    <Table hover className="align-middle mb-0">
                                        <thead>
                                            <tr className="text-uppercase small fw-bold text-muted border-0">
                                                <th className="border-0 ps-0">{t('service')}</th>
                                                <th className="border-0">{t('date')} & {t('time')}</th>
                                                <th className="border-0">{t('professional')}</th>
                                                <th className="border-0 text-end">{t('status')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="border-top-0">
                                            {appointments.slice(0, 5).map((appt) => (
                                                <tr key={appt.id}>
                                                    <td className="fw-semibold ps-0">{getLocalizedName(appt.service)}</td>
                                                    <td>
                                                        <div className="d-flex align-items-center gap-2">
                                                            <Clock size={14} className="text-muted" />
                                                            {format(new Date(appt.startTime), 'MMM d, HH:mm')}
                                                        </div>
                                                    </td>
                                                    <td>{appt.staff?.user?.name || t('any')}</td>
                                                    <td className="text-end">
                                                        <Badge bg={new Date(appt.startTime) > new Date() ? 'success' : 'light'} text={new Date(appt.startTime) > new Date() ? 'white' : 'dark'} className="rounded-pill px-3 fw-medium">
                                                            {appt.status}
                                                        </Badge>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                </div>
                            )}
                        </Card.Body>
                    </Card>

                    {/* Purchase History Card */}
                    <Card className="border-0 shadow-sm rounded-4 bg-white">
                        <Card.Header className="bg-transparent border-0 p-4 pb-0">
                            <h5 className="fw-bold mb-0">{t('purchase_history')}</h5>
                        </Card.Header>
                        <Card.Body className="p-4">
                            {orders.length === 0 ? (
                                <p className="text-muted text-center py-4 small">{t('no_purchases_yet')}</p>
                            ) : (
                                <div className="d-flex flex-column gap-3">
                                    {orders.slice(0, 3).map((order) => (
                                        <div key={order.id} className="d-flex justify-content-between align-items-center p-3 bg-light rounded-3 transition-all hover-shadow-sm">
                                            <div>
                                                <p className="fw-bold mb-0 small">{format(new Date(order.createdAt), 'MMM d, yyyy')}</p>
                                                <small className="text-muted">{order.items.length} {t('items')}</small>
                                            </div>
                                            <span className="fw-bold text-primary">€{Number(order.total).toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="mt-4 text-center">
                                <Link to="/online-store" className="btn btn-light btn-sm rounded-pill px-4">{t('visit_store')}</Link>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>

                <Col lg={4}>
                    <Card className="border-0 shadow-sm rounded-4 bg-white mb-4">
                        <Card.Body className="p-4">
                            <h5 className="fw-bold mb-3 d-flex align-items-center gap-2">
                                <Newspaper size={20} className="text-primary" />
                                {t('latest_news_offers')}
                            </h5>
                            {news.length === 0 ? (
                                <p className="text-muted small">{t('no_updates_today')}</p>
                            ) : (
                                <div className="d-flex flex-column gap-3">
                                    {news.slice(0, 3).map(item => (
                                        <div key={item.id} className="p-3 rounded-3 bg-light border-start border-4 border-primary">
                                            <h6 className="fw-bold mb-1 small">{item.title}</h6>
                                            <p className="small text-secondary mb-0 line-clamp-2">{item.content}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <style>{`
                .client-theme { --brand-color: #6366f1; }
                .bg-gradient-brand { background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%); }
                .hover-shadow-sm:hover { transform: translateY(-2px); box-shadow: 0 .125rem .25rem rgba(0,0,0,.075); transition: all 0.2s; }
            `}</style>
        </div>
    );
};

export default ClientDashboard;
