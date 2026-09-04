import React, { useEffect, useState } from 'react';
import { Row, Col, Card } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { Calendar, ShoppingBag, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';

const Home: React.FC = () => {
    const { t } = useTranslation();
    const [settings, setSettings] = useState<any>(null);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await api.get('/settings');
                setSettings(res.data);
            } catch (error) {
                console.error('Error fetching settings:', error);
            }
        };
        fetchSettings();
    }, []);

    return (
        <div className="py-5">
            <div className="text-center mb-5 animate__animated animate__fadeInDown">
                <h1 className="display-4 fw-bold text-dark mb-3">
                    {t('home_welcome_text') || 'Welcome to'} {settings?.business_name || 'Munitum'}
                </h1>
                <p className="lead text-secondary mx-auto" style={{ maxWidth: '600px' }}>
                    {t('home_desc_text') || 'Everything you need, all in one place. Schedule your next appointment or browse our curated store.'}
                </p>
            </div>

            <Row className="g-4 justify-content-center">
                <Col md={5} lg={4}>
                    <Card className="border-0 shadow-lg rounded-4 overflow-hidden h-100 hover-lift transition-all">
                        <div className="bg-primary bg-opacity-10 p-5 text-center text-primary">
                            <Calendar size={80} strokeWidth={1.5} />
                        </div>
                        <Card.Body className="p-4 text-center">
                            <h3 className="fw-bold mb-3">{t('book_online')}</h3>
                            <p className="text-muted mb-4">
                                {t('book_online_desc')}
                            </p>
                            <Link to="/book-online" className="btn btn-primary btn-lg rounded-pill px-4 fw-bold w-100 py-3 d-flex align-items-center justify-content-center gap-2">
                                {t('book_online')} <ArrowRight size={20} />
                            </Link>
                        </Card.Body>
                    </Card>
                </Col>

                <Col md={5} lg={4}>
                    <Card className="border-0 shadow-lg rounded-4 overflow-hidden h-100 hover-lift transition-all">
                        <div className="bg-success bg-opacity-10 p-5 text-center text-success">
                            <ShoppingBag size={80} strokeWidth={1.5} />
                        </div>
                        <Card.Body className="p-4 text-center">
                            <h3 className="fw-bold mb-3">{t('shop')}</h3>
                            <p className="text-muted mb-4">
                                {t('shop_desc')}
                            </p>
                            <Link to="/shop" className="btn btn-success btn-lg rounded-pill px-4 fw-bold w-100 py-3 d-flex align-items-center justify-content-center gap-2 text-white">
                                {t('shop')} <ArrowRight size={20} />
                            </Link>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <style>{`
                .hover-lift:hover {
                    transform: translateY(-10px);
                    box-shadow: 0 1rem 3rem rgba(0,0,0,.175) !important;
                }
                .transition-all {
                    transition: all 0.3s ease-in-out;
                }
            `}</style>
        </div>
    );
};

export default Home;
