import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Badge, Button, Card, Form, Modal, Spinner, Table } from 'react-bootstrap';
import { BookUser, Mail, MapPin, Pencil, Phone, Plus, Search, Trash2, UserRound } from 'lucide-react';
import api from '../../lib/api';
import { useAuthStore } from '../../store/useAuthStore';
import ClientFormModal from './ClientFormModal';
import { fmtDate, initials } from './crmShared';
import type { CrmClientLite } from './crmShared';

const CrmClients: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const isAdmin = user?.role === 'ADMIN';
    const [clients, setClients] = useState<CrmClientLite[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<CrmClientLite | null>(null);
    const [deleting, setDeleting] = useState<CrmClientLite | null>(null);
    const [notice, setNotice] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);

    const load = () => {
        api.get('/crm/clients')
            .then((response) => setClients(response.data || []))
            .catch(() => setNotice({ type: 'danger', text: 'Não foi possível carregar os clientes.' }))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    const filtered = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return clients;
        return clients.filter((client) =>
            [client.name, client.surname, client.phone, client.email, client.country, client.notes]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(query)),
        );
    }, [clients, search]);

    const openNew = () => { setEditing(null); setShowForm(true); };
    const openEdit = (client: CrmClientLite) => {
        setEditing(client);
        setShowForm(true);
    };
    const handleSaved = (saved: CrmClientLite) => {
        setClients((current) => {
            const exists = current.some((client) => client.id === saved.id);
            const next = exists ? current.map((client) => (client.id === saved.id ? saved : client)) : [saved, ...current];
            return next;
        });
        setNotice({ type: 'success', text: editing ? 'Cliente atualizado.' : 'Cliente criado.' });
    };
    const confirmDelete = async () => {
        if (!deleting) return;
        try {
            await api.delete(`/crm/clients/${deleting.id}`);
            setClients((current) => current.filter((client) => client.id !== deleting.id));
            setNotice({ type: 'success', text: 'Cliente eliminado.' });
        } catch (err: any) {
            setNotice({ type: 'danger', text: err?.response?.data?.message || 'Não foi possível eliminar o cliente.' });
        } finally {
            setDeleting(null);
        }
    };

    return (
        <div className="py-4">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                <div>
                    <div className="text-uppercase small fw-bold text-primary mb-2">CRM</div>
                    <h1 className="h3 fw-bold mb-1">Clientes</h1>
                    <p className="text-muted mb-0">Histórico de tatuagens e projetos por cliente.</p>
                </div>
                <Button onClick={openNew} className="d-flex align-items-center gap-2 rounded-pill px-4">
                    <Plus size={18} /> Novo cliente
                </Button>
            </div>

            {notice && <Alert variant={notice.type} dismissible onClose={() => setNotice(null)}>{notice.text}</Alert>}

            <Card className="border-0 shadow-sm rounded-4">
                <Card.Body className="p-4">
                    <div className="mb-3" style={{ maxWidth: '380px' }}>
                        <Form.Control
                            type="search"
                            placeholder="Pesquisar por nome, telefone, email ou país..."
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            className="rounded-pill ps-4"
                        />
                    </div>

                    {loading ? (
                        <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-5 text-muted">
                            <Search size={32} className="mb-2" />
                            <p className="mb-0">{clients.length === 0 ? 'Ainda não há clientes registados.' : 'Nenhum cliente corresponde à pesquisa.'}</p>
                            {clients.length === 0 && <Button variant="outline-primary" className="mt-3 rounded-pill" onClick={openNew}><Plus size={16} className="me-1" />Criar o primeiro cliente</Button>}
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <Table hover className="align-middle mb-0">
                                <thead>
                                    <tr className="text-muted small text-uppercase">
                                        <th>Cliente</th>
                                        <th>Contacto</th>
                                        <th>País</th>
                                        <th className="text-center">Projetos</th>
                                        <th className="text-center">Desde</th>
                                        <th className="text-end">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((client) => (
                                        <tr key={client.id} onClick={() => navigate(`/crm/clients/${client.id}`)} style={{ cursor: 'pointer' }}>
                                            <td>
                                                <div className="d-flex align-items-center gap-3">
                                                    <div className="d-flex align-items-center justify-content-center bg-primary text-white fw-bold rounded-circle" style={{ width: 40, height: 40 }}>
                                                        {initials(client.name, client.surname)}
                                                    </div>
                                                    <div>
                                                        <div className="fw-semibold">{client.name} {client.surname}</div>
                                                        <div className="small text-muted d-flex align-items-center gap-1"><BookUser size={13} /> Ver histórico</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                {client.phone && <div className="d-flex align-items-center gap-2 small"><Phone size={14} className="text-muted" />{client.phone}</div>}
                                                {client.email && <div className="d-flex align-items-center gap-2 small text-muted"><Mail size={14} />{client.email}</div>}
                                                {!client.phone && !client.email && <span className="text-muted small">—</span>}
                                            </td>
                                            <td>{client.country ? <span className="d-inline-flex align-items-center gap-1 small"><MapPin size={14} className="text-muted" />{client.country}</span> : <span className="text-muted small">—</span>}</td>
                                            <td className="text-center"><Badge bg={client._count?.projects ? 'primary' : 'light'} text={client._count?.projects ? 'white' : 'secondary'}>{client._count?.projects ?? 0}</Badge></td>
                                            <td className="text-center small text-muted">{fmtDate(client.createdAt)}</td>
                                            <td className="text-end" onClick={(event) => event.stopPropagation()}>
                                                <div className="d-flex justify-content-end gap-1">
                                                    <Button variant="light" size="sm" title="Editar cliente" onClick={() => openEdit(client)}><Pencil size={15} /></Button>
                                                    {isAdmin && (
                                                        <Button variant="outline-danger" size="sm" title="Eliminar cliente" onClick={() => setDeleting(client)}><Trash2 size={15} /></Button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </div>
                    )}
                </Card.Body>
            </Card>

            <ClientFormModal
                show={showForm}
                onHide={() => setShowForm(false)}
                client={editing}
                onSaved={handleSaved}
            />

            <Modal show={!!deleting} onHide={() => setDeleting(null)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Eliminar cliente</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div className="d-flex align-items-center gap-3">
                        <div className="bg-danger bg-opacity-10 text-danger p-3 rounded-3"><UserRound size={22} /></div>
                        <div>
                            <p className="mb-1">Tem a certeza que pretende eliminar <strong>{deleting?.name} {deleting?.surname}</strong>?</p>
                            <p className="text-muted small mb-0">Todo o histórico de tatuagens, sessões e fotos deste cliente será eliminado permanentemente.</p>
                        </div>
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="light" onClick={() => setDeleting(null)}>Cancelar</Button>
                    <Button variant="danger" onClick={confirmDelete}>Eliminar</Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default CrmClients;
