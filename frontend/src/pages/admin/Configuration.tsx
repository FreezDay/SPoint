import React, { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Container, Form, Row, Spinner } from 'react-bootstrap';
import { Percent, Settings, Users } from 'lucide-react';
import api from '../../lib/api';
import { useAuthStore } from '../../store/useAuthStore';
import StaffPage from '../Staff';

type StaffMember = { id: string; name: string };

const Configuration: React.FC = () => {
    const { user } = useAuthStore();
    const isAdmin = user?.role === 'ADMIN';
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [rates, setRates] = useState<Record<string, number>>({});
    const [businessName, setBusinessName] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);

    useEffect(() => {
        if (!isAdmin) {
            api.get('/settings').then((settingsResponse) => {
                setBusinessName(settingsResponse.data.business_name || '');
            }).catch(() => setMessage({ type: 'danger', text: 'Não foi possível carregar as definições.' })).finally(() => setLoading(false));
            return;
        }
        Promise.all([api.get('/staff'), api.get('/settings')]).then(([staffResponse, settingsResponse]) => {
            setStaff(staffResponse.data);
            setRates(settingsResponse.data.staff_commission_rates || {});
            setBusinessName(settingsResponse.data.business_name || '');
        }).catch(() => setMessage({ type: 'danger', text: 'Não foi possível carregar as definições.' })).finally(() => setLoading(false));
    }, [isAdmin]);

    const save = async () => {
        setSaving(true);
        try {
            await Promise.all([
                api.patch('/settings/staff_commission_rates', { value: rates }),
                api.patch('/settings/business_name', { value: businessName }),
            ]);
            setMessage({ type: 'success', text: 'Definições guardadas.' });
        } catch {
            setMessage({ type: 'danger', text: 'Não foi possível guardar as definições.' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="text-center py-5"><Spinner animation="border" /></div>;

    if (!isAdmin) {
        return <Container className="py-4">
            <div className="mb-4"><div className="text-uppercase small fw-bold text-primary mb-2">Conta</div><h1 className="h3 fw-bold mb-1">Definições</h1><p className="text-muted mb-0">Bem-vindo, {user?.name}. As definições do espaço e da equipa são geridas pelo administrador.</p></div>
            <Card className="border-0 shadow-sm rounded-4"><Card.Body className="p-4"><div className="d-flex gap-2 align-items-center mb-3 text-primary"><Settings size={20} /><h2 className="h5 fw-bold mb-0">Negócio</h2></div><p className="text-muted small mb-2">Nome do espaço (apenas leitura)</p><Form.Control value={businessName} readOnly /></Card.Body></Card>
        </Container>;
    }

    return <Container className="py-4">
        <div className="mb-4"><div className="text-uppercase small fw-bold text-primary mb-2">Administração</div><h1 className="h3 fw-bold mb-1">Definições</h1><p className="text-muted mb-0">Configure o nome do espaço, as percentagens da equipa e os profissionais.</p></div>
        {message && <Alert variant={message.type} dismissible onClose={() => setMessage(null)}>{message.text}</Alert>}
        <Row className="g-4">
            <Col lg={5}><Card className="border-0 shadow-sm rounded-4 h-100"><Card.Body className="p-4"><div className="d-flex gap-2 align-items-center mb-4 text-primary"><Settings size={20} /><h2 className="h5 fw-bold mb-0">Negócio</h2></div><Form.Label>Nome do espaço</Form.Label><Form.Control value={businessName} onChange={(event) => setBusinessName(event.target.value)} placeholder="Nome do negócio" /></Card.Body></Card></Col>
            <Col lg={7}><Card className="border-0 shadow-sm rounded-4 h-100"><Card.Body className="p-4"><div className="d-flex gap-2 align-items-center mb-2 text-primary"><Percent size={20} /><h2 className="h5 fw-bold mb-0">Percentagem por profissional</h2></div><p className="small text-muted mb-4">Percentagem retirada ao valor bruto de cada profissional.</p>{staff.length === 0 && <p className="text-muted">Adicione profissionais na secção Equipa abaixo para configurar percentagens.</p>}{staff.map((member) => <Row key={member.id} className="align-items-center mb-3"><Col><span className="fw-semibold">{member.name}</span></Col><Col xs="auto"><div className="input-group" style={{ width: 132 }}><Form.Control type="number" min="0" max="100" step="0.1" value={rates[member.id] ?? 0} onChange={(event) => setRates({ ...rates, [member.id]: Number(event.target.value) })} aria-label={`Percentagem de ${member.name}`} /><span className="input-group-text">%</span></div></Col></Row>)}<Button className="mt-2" onClick={save} disabled={saving}>{saving ? 'A guardar...' : 'Guardar definições'}</Button></Card.Body></Card></Col>
        </Row>
        <Card className="border-0 shadow-sm rounded-4 mt-4">
            <Card.Body className="p-4">
                <div className="d-flex gap-2 align-items-center mb-1 text-primary"><Users size={20} /><h2 className="h5 fw-bold mb-0">Equipa</h2></div>
                <p className="small text-muted mb-4">Profissionais da casa e contas de acesso. O artista que regista os serviços é o Maksym por defeito.</p>
                <StaffPage embedded />
            </Card.Body>
        </Card>
    </Container>;
};

export default Configuration;
