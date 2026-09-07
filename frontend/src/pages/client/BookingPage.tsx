import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Button, Form, Spinner, ListGroup } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import api from '../../lib/api';
import { User, CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { addMinutes } from 'date-fns';
import { useAuthStore } from '../../store/useAuthStore';
import AppointmentCalendar from '../../components/AppointmentCalendar';

const BookingPage: React.FC = () => {
    const { t, i18n } = useTranslation();
    const { user } = useAuthStore();
    const [step, setStep] = useState(1);
    const [services, setServices] = useState<any[]>([]);
    const [staff, setStaff] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Guest Info State
    const [guestInfo, setGuestInfo] = useState({ name: '', email: '', phone: '' });

    const [selectedService, setSelectedService] = useState<any>(null);
    const [selectedStaff, setSelectedStaff] = useState<any>(null);
    const [customDuration, setCustomDuration] = useState<number>(0);
    const [settings, setSettings] = useState<any>(null);

    // Get today's date in Lisbon timezone (YYYY-MM-DD)
    const getLisbonToday = () => {
        const parts = new Intl.DateTimeFormat('en-GB', {
            timeZone: 'Europe/Lisbon',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).formatToParts(new Date());
        const y = parts.find(p => p.type === 'year')?.value;
        const m = parts.find(p => p.type === 'month')?.value;
        const d = parts.find(p => p.type === 'day')?.value;
        return `${y}-${m}-${d}`;
    };

    const [selectedDate, setSelectedDate] = useState<string>(getLisbonToday());
    const [selectedTime, setSelectedTime] = useState<string>('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [servicesRes, staffRes, settingsRes] = await Promise.all([
                    api.get('/services'),
                    api.get('/staff'),
                    api.get('/settings')
                ]);
                setServices(servicesRes.data);
                setStaff(staffRes.data);
                setSettings(settingsRes.data);
            } catch (error) {
                console.error('Error fetching booking data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleBooking = async () => {
        try {
            const start = new Date(`${selectedDate}T${selectedTime}`);
            const end = addMinutes(start, customDuration || selectedService.duration);

            await api.post('/appointments', {
                clientId: user?.id,
                guestName: !user ? guestInfo.name : undefined,
                guestEmail: !user ? guestInfo.email : undefined,
                guestPhone: !user ? guestInfo.phone : undefined,
                serviceId: selectedService.id,
                staffId: selectedStaff?.id,
                startTime: start.toISOString(),
                endTime: end.toISOString(),
                notes: 'Online booking'
            });
            setStep(6); // Success step
        } catch (error) {
            console.error('Booking failed:', error);
            alert('Failed to book appointment. Please try again.');
        }
    };

    const getLocalizedName = (service: any) => {
        const lang = i18n.language;
        if (lang === 'en' && service.name_en) return service.name_en;
        if (lang === 'pt' && service.name_pt) return service.name_pt;
        if (lang === 'uk' && service.name_uk) return service.name_uk;
        return service.name;
    };

    if (loading) return <div className="text-center py-5"><Spinner animation="border" /></div>;

    const steps = user ? [1, 2, 3, 5] : [1, 2, 3, 4, 5];
    const stepLabels: { [key: number]: string } = {
        1: t('service'),
        2: t('staff'),
        3: t('date'),
        4: t('info'),
        5: t('confirm')
    };

    return (
        <Container className="py-2" style={{ maxWidth: '800px' }}>
            <h1 className="h3 mb-4 fw-bold text-center">{t('book_online')}</h1>

            <div className="mb-5 d-flex justify-content-center gap-4">
                {steps.map((s) => (
                    <div key={s} className="text-center" style={{ width: '80px' }}>
                        <div className={`rounded-circle d-inline-flex align-items-center justify-content-center mb-2 transition-all ${step >= s ? 'bg-primary text-white shadow' : 'bg-white text-muted border'}`} style={{ width: '40px', height: '40px' }}>
                            {s}
                        </div>
                        <p className={`small mb-0 ${step === s ? 'fw-bold text-primary' : 'text-muted'}`}>
                            {stepLabels[s]}
                        </p>
                    </div>
                ))}
            </div>

            {step === 1 && (
                <Card className="border-0 shadow-sm rounded-4">
                    <Card.Body className="p-4">
                        <h5 className="fw-bold mb-4">{t('select_service')}</h5>
                        <ListGroup variant="flush">
                            {services.map((s) => (
                                <ListGroup.Item
                                    key={s.id}
                                    action
                                    onClick={() => { setSelectedService(s); setCustomDuration(s.duration); setStep(2); }}
                                    className="border-0 px-3 py-3 rounded-3 mb-2 d-flex justify-content-between align-items-center transition-all hover-bg-light"
                                >
                                    <div>
                                        <h6 className="mb-1 fw-bold">{getLocalizedName(s)}</h6>
                                        <small className="text-muted">{s.duration} min</small>
                                    </div>
                                    <div className="text-end">
                                        <p className="fw-bold text-primary mb-0">€{Number(s.price).toFixed(2)}</p>
                                        <ArrowRight size={16} className="text-muted" />
                                    </div>
                                </ListGroup.Item>
                            ))}
                        </ListGroup>
                    </Card.Body>
                </Card>
            )}

            {step === 2 && (
                <Card className="border-0 shadow-sm rounded-4">
                    <Card.Body className="p-4">
                        <div className="d-flex align-items-center gap-2 mb-4">
                            <Button variant="link" className="p-0 text-dark" onClick={() => setStep(1)}><ArrowLeft size={20} /></Button>
                            <h5 className="fw-bold mb-0">{t('choose_professional')}</h5>
                        </div>
                        <Row className="g-3">
                            <Col md={12}>
                                <Card action as={Button} variant="light" className="text-start border-0 shadow-sm p-3 w-100 mb-2 rounded-3" onClick={() => { setSelectedStaff(null); setStep(3); }}>
                                    <div className="d-flex align-items-center gap-3">
                                        <div className="bg-primary bg-opacity-10 text-primary p-2 rounded-circle"><User size={24} /></div>
                                        <span className="fw-bold">{t('any_available_professional')}</span>
                                    </div>
                                </Card>
                            </Col>
                            {staff.map((s) => (
                                <Col md={6} key={s.id}>
                                    <Card action as={Button} variant="light" className="text-start border-0 shadow-sm p-3 w-100 h-100 rounded-3" onClick={() => { setSelectedStaff(s); setStep(3); }}>
                                        <div className="d-flex align-items-center gap-3">
                                            <div className="bg-white p-2 rounded-circle shadow-sm text-primary"><User size={24} /></div>
                                            <div>
                                                <span className="d-block fw-bold">{s.name}</span>
                                                <small className="text-muted">{t('specialist')}</small>
                                            </div>
                                        </div>
                                    </Card>
                                </Col>
                            ))}
                        </Row>
                    </Card.Body>
                </Card>
            )}

            {step === 3 && (
                <Card className="border-0 shadow-sm rounded-4">
                    <Card.Body className="p-4">
                        <div className="d-flex align-items-center gap-2 mb-4">
                            <Button variant="link" className="p-0 text-dark" onClick={() => setStep(2)}><ArrowLeft size={20} /></Button>
                            <h5 className="fw-bold mb-0">{t('select_date_time')}</h5>
                        </div>

                        <AppointmentCalendar
                            serviceId={selectedService.id}
                            staffId={selectedStaff?.id}
                            serviceDuration={customDuration || selectedService.duration}
                            onDurationChange={setCustomDuration}
                            onSelectDateTime={(date, time) => {
                                setSelectedDate(date);
                                setSelectedTime(time);
                            }}
                            selectedDate={selectedDate}
                            selectedTime={selectedTime}
                        />

                        <Button
                            variant="primary"
                            size="lg"
                            className="w-100 py-3 fw-bold rounded-3 shadow-sm mt-4"
                            disabled={!selectedTime}
                            onClick={() => user ? setStep(5) : setStep(4)}
                        >
                            {t('next_step')}: {user ? t('review_confirm') : t('your_information')}
                        </Button>
                    </Card.Body>
                </Card>
            )}

            {step === 4 && !user && (
                <Card className="border-0 shadow-sm rounded-4">
                    <Card.Body className="p-4">
                        <div className="d-flex align-items-center gap-2 mb-4">
                            <Button variant="link" className="p-0 text-dark" onClick={() => setStep(3)}><ArrowLeft size={20} /></Button>
                            <h5 className="fw-bold mb-0">{t('your_information')}</h5>
                        </div>
                        <Form>
                            <Form.Group className="mb-3">
                                <Form.Label className="small fw-bold text-muted text-uppercase">{t('full_name')}</Form.Label>
                                <Form.Control
                                    placeholder={t('enter_name')}
                                    className="py-2 rounded-3"
                                    value={guestInfo.name}
                                    onChange={(e) => setGuestInfo({ ...guestInfo, name: e.target.value })}
                                    required
                                />
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label className="small fw-bold text-muted text-uppercase">{t('email_address')}</Form.Label>
                                <Form.Control
                                    type="email"
                                    placeholder={t('enter_email')}
                                    className="py-2 rounded-3"
                                    value={guestInfo.email}
                                    onChange={(e) => setGuestInfo({ ...guestInfo, email: e.target.value })}
                                    required
                                />
                            </Form.Group>
                            <Form.Group className="mb-4">
                                <Form.Label className="small fw-bold text-muted text-uppercase">{t('phone_number')}</Form.Label>
                                <Form.Control
                                    placeholder={t('enter_phone')}
                                    className="py-2 rounded-3"
                                    value={guestInfo.phone}
                                    onChange={(e) => setGuestInfo({ ...guestInfo, phone: e.target.value })}
                                    required
                                />
                            </Form.Group>
                        </Form>
                        <Button
                            variant="primary"
                            size="lg"
                            className="w-100 py-3 fw-bold rounded-3 shadow-sm"
                            disabled={!guestInfo.name || !guestInfo.email || !guestInfo.phone}
                            onClick={() => setStep(5)}
                        >
                            {t('review_booking')}
                        </Button>
                    </Card.Body>
                </Card>
            )}

            {step === 5 && (
                <Card className="border-0 shadow-sm rounded-4">
                    <Card.Body className="p-4">
                        <div className="d-flex align-items-center gap-2 mb-4">
                            <Button variant="link" className="p-0 text-dark" onClick={() => user ? setStep(3) : setStep(4)}><ArrowLeft size={20} /></Button>
                            <h5 className="fw-bold mb-0">{t('booking_summary')}</h5>
                        </div>

                        <div className="bg-light p-4 rounded-4 mb-4">
                            <div className="d-flex justify-content-between mb-2">
                                <span className="text-secondary">{t('service')}</span>
                                <span className="fw-bold text-dark">{getLocalizedName(selectedService)}</span>
                            </div>
                            <div className="d-flex justify-content-between mb-2">
                                <span className="text-secondary">{t('staff')}</span>
                                <span className="fw-bold text-dark">{selectedStaff?.name || t('any_staff')}</span>
                            </div>
                            <div className="d-flex justify-content-between mb-2">
                                <span className="text-secondary">{t('date')}</span>
                                <span className="fw-bold text-dark">{selectedDate} {t('at')} {selectedTime}</span>
                            </div>
                            {settings?.business_address && (
                                <div className="d-flex justify-content-between mb-2">
                                    <span className="text-secondary">{t('location')}</span>
                                    <span className="fw-bold text-dark text-end" style={{ maxWidth: '60%' }}>{settings.business_address}</span>
                                </div>
                            )}
                            {!user && (
                                <>
                                    <hr />
                                    <div className="d-flex justify-content-between mb-2">
                                        <span className="text-secondary">{t('name')}</span>
                                        <span className="fw-bold text-dark">{guestInfo.name}</span>
                                    </div>
                                    <div className="d-flex justify-content-between mb-2">
                                        <span className="text-secondary">{t('email')}</span>
                                        <span className="fw-bold text-dark">{guestInfo.email}</span>
                                    </div>
                                </>
                            )}
                            <hr />
                            <div className="d-flex justify-content-between align-items-center">
                                <span className="fw-bold text-dark">{t('total')}</span>
                                <span className="fw-bold text-primary fs-3">€{Number(selectedService.price).toFixed(2)}</span>
                            </div>
                        </div>

                        <Button
                            variant="primary"
                            size="lg"
                            className="w-100 py-3 fw-bold rounded-3 shadow-sm"
                            onClick={handleBooking}
                        >
                            {t('confirm_appointment')}
                        </Button>
                    </Card.Body>
                </Card>
            )}

            {step === 6 && (
                <Card className="border-0 shadow-lg rounded-4 text-center p-5">
                    <div className="text-success mb-4 text-center justify-content-center d-flex">
                        <CheckCircle size={80} />
                    </div>
                    <h2 className="fw-bold mb-3 text-dark">{t('appointment_booked')}</h2>
                    <p className="text-secondary mb-4 fs-5">
                        {t('appointment_booked_desc', { service: getLocalizedName(selectedService), date: selectedDate, time: selectedTime })}
                    </p>

                    {settings?.service_address || settings?.business_address ? (
                        <div className="mb-5">
                            <h5 className="fw-bold mb-3 text-dark">{t('how_to_get_there')}</h5>
                            <div className="bg-light p-3 rounded-4 mb-3 text-start border d-flex align-items-center justify-content-between gap-3 shadow-sm transition-all hover-shadow">
                                <span className="text-dark small">{settings.service_address || settings.business_address}</span>
                                {settings.business_google_maps && (
                                    <Button
                                        variant="outline-primary"
                                        size="sm"
                                        className="text-nowrap rounded-pill px-3"
                                        href={settings.business_google_maps}
                                        target="_blank"
                                    >
                                        {t('get_directions')}
                                    </Button>
                                )}
                            </div>
                            <div className="rounded-4 overflow-hidden border shadow-sm" style={{ height: '250px' }}>
                                <iframe
                                    title="Location Map"
                                    width="100%"
                                    height="100%"
                                    frameBorder="0"
                                    style={{ border: 0 }}
                                    src={`https://maps.google.com/maps?q=${encodeURIComponent(settings.service_address || settings.business_address)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                                    allowFullScreen
                                ></iframe>
                            </div>
                        </div>
                    ) : null}
                    <div className="d-grid gap-3">
                        <Button variant="primary" size="lg" className="rounded-pill py-3 fw-bold" onClick={() => { setStep(1); setSelectedService(null); }}>
                            {t('book_another_service')}
                        </Button>
                        {!user && (
                            <Button variant="outline-primary" className="rounded-pill py-3 fw-bold" onClick={() => window.location.href = '/register'}>
                                {t('create_account_btn')}
                            </Button>
                        )}
                        {user && (
                            <Button variant="outline-primary" className="rounded-pill py-3 fw-bold" onClick={() => window.location.href = '/my-dashboard'}>
                                {t('view_my_dashboard')}
                            </Button>
                        )}
                    </div>
                </Card>
            )}

            <style>{`
                .transition-all { transition: all 0.2s ease-in-out; }
                .hover-bg-light:hover { background-color: #f8f9fa !important; }
            `}</style>
        </Container>
    );
};

export default BookingPage;
