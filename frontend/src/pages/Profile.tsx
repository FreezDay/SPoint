import React, { useState } from 'react';
import { Alert, Button, Card, Col, Form, Row } from 'react-bootstrap';
import { Camera, LockKeyhole, Save, UserRound } from 'lucide-react';
import api from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';

const avatars = [
    'https://api.dicebear.com/7.x/bottts/svg?seed=Roman&backgroundColor=0d6efd',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Constantino&backgroundColor=198754',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Staff&backgroundColor=6f42c1',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Barber&backgroundColor=fd7e14',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Classic&backgroundColor=dc3545',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Modern&backgroundColor=20c997',
];

const Profile: React.FC = () => {
    const { user, login, token } = useAuthStore();
    const [name, setName] = useState(user?.name || '');
    const [avatar, setAvatar] = useState(user?.avatar || avatars[0]);
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setSaving(true);
        setMessage(null);
        try {
            const response = await api.patch('/auth/profile', { name, avatar, ...(password ? { password } : {}) });
            login(response.data, token || '');
            setPassword('');
            setMessage({ type: 'success', text: 'Perfil atualizado com sucesso.' });
        } catch (error: any) {
            setMessage({ type: 'danger', text: error.response?.data?.message || 'Não foi possível atualizar o perfil.' });
        } finally {
            setSaving(false);
        }
    };

    return <div className="py-4">
        <div className="mb-4"><div className="text-uppercase small fw-bold text-primary mb-2">Conta pessoal</div><h1 className="h3 fw-bold mb-1">Perfil</h1><p className="text-muted mb-0">Atualize os dados usados na sua conta de cabeleireiro.</p></div>
        {message && <Alert variant={message.type} dismissible onClose={() => setMessage(null)}>{message.text}</Alert>}
        <Row className="g-4">
            <Col lg={7}><Card className="border-0 shadow-sm rounded-4"><Card.Body className="p-4"><div className="d-flex align-items-center gap-2 mb-4"><UserRound size={21} className="text-primary" /><h2 className="h5 fw-bold mb-0">Dados pessoais</h2></div><Form onSubmit={handleSubmit}><Form.Group className="mb-3"><Form.Label>Nome</Form.Label><Form.Control value={name} onChange={(event) => setName(event.target.value)} required /></Form.Group><Form.Group className="mb-3"><Form.Label>Email</Form.Label><Form.Control value={user?.email || ''} disabled /></Form.Group><Form.Group className="mb-4"><Form.Label>Nova password</Form.Label><Form.Control type="password" minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Deixe vazio para manter a atual" /></Form.Group><Button type="submit" disabled={saving} className="d-flex align-items-center gap-2"><Save size={17} />{saving ? 'A guardar...' : 'Guardar alterações'}</Button></Form></Card.Body></Card></Col>
            <Col lg={5}><Card className="border-0 shadow-sm rounded-4"><Card.Body className="p-4"><div className="d-flex align-items-center gap-2 mb-2"><Camera size={21} className="text-primary" /><h2 className="h5 fw-bold mb-0">Ícone do perfil</h2></div><p className="small text-muted mb-4">Escolha o ícone que aparece na sua conta.</p><div className="d-flex flex-wrap gap-3">{avatars.map((option) => <button type="button" key={option} onClick={() => setAvatar(option)} className={`p-1 rounded-circle bg-white ${avatar === option ? 'border border-primary border-3' : 'border border-light border-2'}`} aria-label="Selecionar ícone"><img src={option} alt="" width="68" height="68" className="rounded-circle" /></button>)}</div><div className="d-flex align-items-center gap-2 text-muted small mt-4"><LockKeyhole size={15} /> A password é protegida e nunca é mostrada.</div></Card.Body></Card></Col>
        </Row>
    </div>;
};

export default Profile;
