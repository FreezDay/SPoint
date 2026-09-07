import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { Euro, TrendingUp, ClipboardList } from 'lucide-react';
import { Row, Col, Card, Container, Spinner, Badge } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/useAuthStore';

const Dashboard: React.FC = () => {
    const { t } = useTranslation();
    const { user } = useAuthStore();
    const [breakdownPeriod, setBreakdownPeriod] = useState<'day' | 'week' | 'month'>('week');
    const [stats, setStats] = useState({
        totalClients: 0,
        totalStaff: 0,
        totalServices: 0,
        servicesToday: 0,
        revenueToday: 0,
        revenueThisWeek: 0,
        revenueThisMonth: 0,
        totalRevenue: 0,
        grossToday: 0,
        grossThisWeek: 0,
        grossThisMonth: 0,
        recentServices: [],
        chart: [],
        serviceBreakdown: { day: [], week: [], month: [] },
        staffBreakdown: { day: [], week: [], month: [] },
        staffServiceCounts: { day: [], week: [], month: [] },
        serviceCounts: { day: [], week: [], month: [] },
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const response = await api.get('/reports/dashboard');
            setStats(response.data);
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
        } finally {
            setLoading(false);
        }
    };


    const selectedBreakdown = (user?.role === 'ADMIN' ? stats.staffBreakdown[breakdownPeriod] : stats.serviceBreakdown[breakdownPeriod]) as { serviceName?: string; staffName?: string; total: number }[];
    const selectedServiceCounts = (user?.role === 'ADMIN' ? stats.serviceCounts[breakdownPeriod] : []) as { serviceName: string; count: number }[];
    const breakdownTotal = selectedBreakdown.reduce((sum, item) => sum + Number(item.total), 0);
    const breakdownGradient = selectedBreakdown.length
        ? `conic-gradient(${selectedBreakdown.map((_, index) => `${['#0d6efd', '#20c997', '#fd7e14', '#dc3545', '#6f42c1', '#198754'][index % 6]} ${(selectedBreakdown.slice(0, index).reduce((sum, value) => sum + Number(value.total), 0) / breakdownTotal) * 100}% ${(selectedBreakdown.slice(0, index + 1).reduce((sum, value) => sum + Number(value.total), 0) / breakdownTotal) * 100}%`).join(', ')})`
        : '#e9ecef';
    const earningValue = (gross: number, net: number) => user?.role === 'ADMIN'
        ? <><div>€{Number(gross).toFixed(2)}</div><div className="small text-success mt-1">Após comissão: €{Number(net).toFixed(2)}</div></>
        : `€${Number(net).toFixed(2)}`;

    if (loading) {
        return (
            <Container className="d-flex justify-content-center align-items-center" style={{ height: '300px' }}>
                <Spinner animation="border" variant="primary" />
            </Container>
        );
    }

    const StatCard = ({ title, value, icon, color, trend }: any) => (
        <Card className="h-100 shadow-sm border-0 rounded-4">
            <Card.Body>
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <div className={`p-3 rounded-4 bg-${color}-light`} style={{ backgroundColor: `var(--bs-${color}-bg-subtle)` }}>
                        {React.cloneElement(icon, { size: 24, className: `text-${color}` })}
                    </div>
                    {trend && (
                        <Badge bg="success-subtle" text="success" className="px-2 py-1">
                            <TrendingUp size={14} className="me-1" /> {trend}
                        </Badge>
                    )}
                </div>
                <Card.Subtitle className="text-secondary mb-1 fw-medium">{title}</Card.Subtitle>
                <Card.Title className="fs-3 fw-bold mb-0">{value}</Card.Title>
            </Card.Body>
        </Card>
    );

    return (
        <div className="py-4">
            <h1 className="h3 mb-1 fw-bold text-dark">Dashboard{user?.role === 'STAFF' && user.name ? ` de ${user.name}` : ''}</h1>
            <p className="text-muted mb-4">Acompanhe os seus valores líquidos e os serviços prestados.</p>

            <Row className="g-4 mb-4">
                <Col xs={12} md={6} lg={3}>
                    <StatCard
                        title="Total hoje"
                        value={earningValue(stats.grossToday, stats.revenueToday)}
                        icon={<Euro />}
                        color="primary"
                        trend="+12%"
                    />
                </Col>
                <Col xs={12} md={6} lg={3}>
                    <StatCard
                        title="Total esta semana"
                        value={earningValue(stats.grossThisWeek, stats.revenueThisWeek)}
                        icon={<Euro />}
                        color="info"
                    />
                </Col>
                <Col xs={12} md={6} lg={3}>
                    <StatCard
                        title="Total este mês"
                        value={earningValue(stats.grossThisMonth, stats.revenueThisMonth)}
                        icon={<Euro />}
                        color="success"
                    />
                </Col>
                <Col xs={12} md={6} lg={3}>
                    <StatCard
                        title="Serviços registados hoje"
                        value={stats.servicesToday}
                        icon={<ClipboardList />}
                        color="warning"
                    />
                </Col>
            </Row>

            <Row className="g-4">
                <Col lg={7}>
                    <Card className="shadow-sm border-0 rounded-4 h-100">
                        <Card.Body>
                            <Card.Title className="h5 fw-bold mb-4">Últimos serviços prestados</Card.Title>
                            <div className="table-responsive">
                                <table className="table table-hover align-middle mb-0">
                                    <thead className="table-light">
                                        <tr>
                                            <th>Serviço / cliente</th>
                                            <th>Prestado por</th>
                                            <th>{t('date')}</th>
                                            <th className="text-end">{t('total')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stats.recentServices.map((service: any) => (
                                            <tr key={service.id}>
                                                <td>
                                                    <span className="fw-medium">{service.serviceName}</span>
                                                    <div className="small text-muted">{service.clientName}</div>
                                                </td>
                                                <td className="text-muted">{service.staff?.name || 'Admin'}</td>
                                                <td className="text-muted">
                                                    {new Date(service.serviceDate).toLocaleDateString('pt-PT')}
                                                </td>
                                                <td className="text-end fw-bold">
                                                    €{Number(service.amount).toFixed(2)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {stats.recentServices.length === 0 && (
                                    <div className="text-center py-5 text-muted">
                                        {t('no_transactions_found') || 'No recent transactions found'}
                                    </div>
                                )}
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col lg={5}>
                    <Card className="shadow-sm border-0 rounded-4 h-100">
                        <Card.Body>
                            <div className="d-flex justify-content-between align-items-center mb-3"><Card.Title className="h5 fw-bold mb-0">Serviços realizados</Card.Title><div className="btn-group btn-group-sm"><button className={`btn ${breakdownPeriod === 'day' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setBreakdownPeriod('day')}>Dia</button><button className={`btn ${breakdownPeriod === 'week' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setBreakdownPeriod('week')}>Semana</button><button className={`btn ${breakdownPeriod === 'month' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setBreakdownPeriod('month')}>Mês</button></div></div>
                            {user?.role === 'ADMIN' ? <div className="admin-bars mb-3">{selectedServiceCounts.length === 0 && <div className="text-center text-muted py-5">Sem serviços neste período.</div>}{selectedServiceCounts.length > 0 && <><div className="bar-axis-y"><span>{Math.max(...selectedServiceCounts.map((value) => value.count), 1)}</span><span>0</span></div><div className="vertical-bars">{selectedServiceCounts.map((item, index) => { const maxCount = Math.max(...selectedServiceCounts.map((value) => value.count), 1); return <div key={item.serviceName} className="vertical-bar-item"><div className="vertical-bar-value">{item.count}</div><div className="vertical-bar-track"><div className="vertical-bar-fill" style={{ height: `${(item.count / maxCount) * 100}%`, backgroundColor: ['#0d6efd', '#20c997', '#fd7e14', '#dc3545', '#6f42c1', '#198754'][index % 6] }} /></div><div className="vertical-bar-label">{item.serviceName}</div></div>; })}</div></>}</div> : <><div className="text-center mb-3"><div className="service-donut mx-auto" style={{ background: breakdownGradient }}><div className="service-donut-center"><strong>€{breakdownTotal.toFixed(2)}</strong><span>ganho</span></div></div></div><div className="small">{selectedBreakdown.map((item, index) => <div key={item.staffName || item.serviceName} className="d-flex justify-content-between align-items-center py-1"><span><i className="legend-dot d-inline-block me-2" style={{ backgroundColor: ['#0d6efd', '#20c997', '#fd7e14', '#dc3545', '#6f42c1', '#198754'][index % 6] }} />{item.staffName || item.serviceName}</span><strong>€{Number(item.total).toFixed(2)}</strong></div>)}</div></>}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
            <style>{`.service-donut { width: 174px; height: 174px; border-radius: 50%; display: grid; place-items: center; } .service-donut-center { width: 112px; height: 112px; border-radius: 50%; background: #fff; display: flex; flex-direction: column; justify-content: center; align-items: center; } .service-donut-center strong { font-size: 1.05rem; } .service-donut-center span { color: #6c757d; font-size: .75rem; } .legend-dot { width: 9px; height: 9px; border-radius: 50%; } .admin-bars { position: relative; min-height: 270px; padding: 10px 0 36px 28px; } .bar-axis-y { position: absolute; inset: 10px auto 48px 0; display: flex; flex-direction: column; justify-content: space-between; color: #6c757d; font-size: .72rem; } .vertical-bars { height: 210px; display: flex; align-items: end; gap: 14px; border-bottom: 1px solid #ced4da; padding: 0 8px; overflow-x: auto; } .vertical-bar-item { min-width: 58px; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: end; } .vertical-bar-value { font-size: .75rem; font-weight: 700; color: #495057; min-height: 18px; } .vertical-bar-track { height: 175px; width: 30px; display: flex; align-items: end; background: #f1f3f5; border-radius: 6px 6px 0 0; overflow: hidden; } .vertical-bar-fill { width: 100%; border-radius: 6px 6px 0 0; transition: height .25s ease; } .vertical-bar-label { margin-top: 8px; font-size: .72rem; color: #495057; text-align: center; max-width: 76px; white-space: normal; }`}</style>
        </div>
    );
};

export default Dashboard;
