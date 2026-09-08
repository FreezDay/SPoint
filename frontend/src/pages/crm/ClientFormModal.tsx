import React from 'react';
import { Button, Form, Modal } from 'react-bootstrap';
import api from '../../lib/api';
import { COUNTRIES } from './crmShared';
import type { CrmClientLite } from './crmShared';

type Props = {
    show: boolean;
    onHide: () => void;
    onSaved: (client: CrmClientLite) => void;
    client?: CrmClientLite | null;
};

const emptyForm = { name: '', surname: '', phone: '', email: '', country: '', notes: '' };

const ClientFormModal: React.FC<Props> = ({ show, onHide, onSaved, client }) => {
    const [form, setForm] = React.useState(emptyForm);
    const [saving, setSaving] = React.useState(false);
    const [error, setError] = React.useState('');

    React.useEffect(() => {
        if (show) {
            setError('');
            setForm(client
                ? {
                    name: client.name,
                    surname: client.surname,
                    phone: client.phone || '',
                    email: client.email || '',
                    country: client.country || '',
                    notes: client.notes || '',
                }
                : emptyForm);
        }
    }, [show, client]);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setSaving(true);
        setError('');
        try {
            const payload = {
                ...form,
                name: form.name.trim(),
                surname: form.surname.trim(),
                phone: form.phone.trim() || null,
                email: form.email.trim() || null,
                country: form.country.trim() || null,
                notes: form.notes.trim() || null,
            };
            const response = client
                ? await api.patch(`/crm/clients/${client.id}`, payload)
                : await api.post('/crm/clients', payload);
            onSaved(response.data);
            onHide();
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Não foi possível guardar o cliente.');
        } finally {
            setSaving(false);
        }
    };

    const set = (field: keyof typeof emptyForm) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm({ ...form, [field]: event.target.value });

    return (
        <Modal show={show} onHide={onHide} centered>
            <Form onSubmit={handleSubmit}>
                <Modal.Header closeButton>
                    <Modal.Title>{client ? 'Editar cliente' : 'Novo cliente'}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {error && <div className="alert alert-danger py-2">{error}</div>}
                    <div className="row g-3">
                        <div className="col-sm-6">
                            <Form.Group>
                                <Form.Label>Nome</Form.Label>
                                <Form.Control value={form.name} onChange={set('name')} required placeholder="Nome" />
                            </Form.Group>
                        </div>
                        <div className="col-sm-6">
                            <Form.Group>
                                <Form.Label>Apelido</Form.Label>
                                <Form.Control value={form.surname} onChange={set('surname')} required placeholder="Apelido" />
                            </Form.Group>
                        </div>
                        <div className="col-sm-6">
                            <Form.Group>
                                <Form.Label>Telefone</Form.Label>
                                <Form.Control value={form.phone} onChange={set('phone')} placeholder="+351 ..." />
                            </Form.Group>
                        </div>
                        <div className="col-sm-6">
                            <Form.Group>
                                <Form.Label>Email</Form.Label>
                                <Form.Control type="email" value={form.email} onChange={set('email')} placeholder="email@exemplo.com" />
                            </Form.Group>
                        </div>
                        <div className="col-12">
                            <Form.Group>
                                <Form.Label>País de origem</Form.Label>
                                <Form.Control list="countries-list" value={form.country} onChange={set('country')} placeholder="Escolha ou escreva o país" />
                            </Form.Group>
                        </div>
                        <div className="col-12">
                            <Form.Group>
                                <Form.Label>Notas</Form.Label>
                                <Form.Control as="textarea" rows={3} value={form.notes} onChange={set('notes')} placeholder="Preferências, alergias, observações..." />
                            </Form.Group>
                        </div>
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="light" onClick={onHide}>Cancelar</Button>
                    <Button type="submit" disabled={saving}>{saving ? 'A guardar...' : 'Guardar'}</Button>
                </Modal.Footer>
            </Form>
            <datalist id="countries-list">
                {COUNTRIES.map((country) => <option key={country} value={country} />)}
            </datalist>
        </Modal>
    );
};

export default ClientFormModal;
