import React, { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Form, Row } from 'react-bootstrap';
import { ClipboardPlus } from 'lucide-react';
import api from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';
import { useTranslation } from 'react-i18next';

type StaffMember = { id: string; name: string };
const serviceOptions = ['Barba', 'Cabelo', 'Cabelo e barba', 'Lavagem', 'Coloração barba', 'Coloração cabelo'];
const paymentOptions = ['Dinheiro', 'Multibanco', 'MB WAY', 'Cartão'];

const ServiceRegister: React.FC = () => {
    const { user } = useAuthStore();
    const { t } = useTranslation();
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);
    const [form, setForm] = useState({
        serviceName: '',
        customService: '',
        amount: '',
        serviceDate: new Date().toISOString().slice(0, 10),
        clientName: '',
        paymentMethod: 'Dinheiro',
        staffId: user?.role === 'STAFF' ? user.id : '',
    });

    useEffect(() => {
        if (user?.role !== 'ADMIN') return;
        api.get('/staff').then((response) => setStaff(response.data)).catch(() => setMessage({ type: 'danger', text: t('load_staff_failed') }));
    }, [user?.role]);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setSaving(true);
        setMessage(null);
        try {
            await api.post('/service-records', {
                serviceName: form.serviceName === 'Outro' ? form.customService : form.serviceName,
                amount: Number(form.amount),
                serviceDate: `${form.serviceDate}T12:00:00.000Z`,
                clientName: form.clientName,
                paymentMethod: form.paymentMethod,
                ...(form.staffId ? { staffId: form.staffId } : {}),
            });
            setForm((current) => ({ ...current, serviceName: '', customService: '', amount: '', clientName: '' }));
            setMessage({ type: 'success', text: t('service_saved') });
        } catch (error: any) {
            setMessage({ type: 'danger', text: error.response?.data?.message || 'Não foi possível guardar o serviço.' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="py-4">
            <div className="mb-4">
                <div className="text-uppercase small fw-bold text-primary mb-2">{t('daily_operations')}</div>
                <h1 className="h3 fw-bold mb-1">{t('register_service')}</h1>
                <p className="text-muted mb-0">{t('update_earnings_desc')}</p>
            </div>

            {message && <Alert variant={message.type} dismissible onClose={() => setMessage(null)}>{message.text}</Alert>}

            <Row className="g-4">
                <Col xl={7}>
                    <Card className="border-0 shadow-sm rounded-4">
                        <Card.Body className="p-4">
                            <div className="d-flex gap-3 align-items-center mb-4">
                                <div className="bg-primary bg-opacity-10 text-primary p-3 rounded-3"><ClipboardPlus size={24} /></div>
                                <div><h2 className="h5 fw-bold mb-1">{t('new_appointment_entry')}</h2><p className="small text-muted mb-0">{t('fill_service_details')}</p></div>
                            </div>
                            <Form onSubmit={handleSubmit}>
                                <Form.Group className="mb-3">
                                    <Form.Label>{t('service')}</Form.Label>
                                    <Form.Select value={form.serviceName} onChange={(event) => setForm({ ...form, serviceName: event.target.value })} required>
                                        <option value="">{t('select_service_placeholder')}</option>
                                        {serviceOptions.map((service) => <option key={service}>{service}</option>)}
                                        <option value="Outro">{t('other_service')}</option>
                                    </Form.Select>
                                </Form.Group>
                                {form.serviceName === 'Outro' && <Form.Group className="mb-3"><Form.Label>{t('service_name')}</Form.Label><Form.Control value={form.customService} onChange={(event) => setForm({ ...form, customService: event.target.value })} required /></Form.Group>}
                                <Row className="g-3">
                                    <Col sm={6}><Form.Group className="mb-3"><Form.Label>{t('amount_eur')}</Form.Label><Form.Control type="number" min="0" step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} required /></Form.Group></Col>
                                    <Col sm={6}><Form.Group className="mb-3"><Form.Label>{t('service_date')}</Form.Label><Form.Control type="date" value={form.serviceDate} onChange={(event) => setForm({ ...form, serviceDate: event.target.value })} required /></Form.Group></Col>
                                </Row>
                                <Form.Group className="mb-3"><Form.Label>{t('client_name')}</Form.Label><Form.Control value={form.clientName} onChange={(event) => setForm({ ...form, clientName: event.target.value })} placeholder={t('full_name')} required /></Form.Group>
                                <Form.Group className="mb-3"><Form.Label>{t('payment_method')}</Form.Label><Form.Select value={form.paymentMethod} onChange={(event) => setForm({ ...form, paymentMethod: event.target.value })}>{paymentOptions.map((method) => <option key={method}>{method}</option>)}</Form.Select></Form.Group>
                                {user?.role === 'ADMIN' && <Form.Group className="mb-4"><Form.Label>{t('provided_by')}</Form.Label><Form.Select value={form.staffId} onChange={(event) => setForm({ ...form, staffId: event.target.value })} required><option value="">{t('select_professional')}</option>{staff.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</Form.Select></Form.Group>}
                                <Button type="submit" className="w-100 py-2" disabled={saving}>{saving ? t('saving_service') : t('save_service')}</Button>
                            </Form>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default ServiceRegister;
