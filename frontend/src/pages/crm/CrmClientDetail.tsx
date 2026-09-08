import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Badge, Button, Card, Col, Modal, Row, Spinner } from 'react-bootstrap';
import { ArrowLeft, CalendarDays, Clock, Mail, MapPin, Palette, Pencil, Phone, Plus, Ruler, StickyNote, Trash2, UserRound } from 'lucide-react';
import api from '../../lib/api';
import { useAuthStore } from '../../store/useAuthStore';
import ClientFormModal from './ClientFormModal';
import CreateProjectModal from './CreateProjectModal';
import { computeProjectStats, currency, fmtDate, initials, isProjectCompleted } from './crmShared';
import type { CrmClientFull, CrmClientLite, RegisterResult, TattooProject } from './crmShared';

const CrmClientDetail: React.FC = () => {
    const { clientId } = useParams<{ clientId: string }>();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const isAdmin = user?.role === 'ADMIN';
    const [client, setClient] = useState<CrmClientFull | null>(null);
    const [loading, setLoading] = useState(true);
    const [showEdit, setShowEdit] = useState(false);
    const [showCreateProject, setShowCreateProject] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [notice, setNotice] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);

    const load = () => {
        api.get(`/crm/clients/${clientId}`)
            .then((response) => setClient(response.data))
            .catch((err: any) => setNotice({ type: 'danger', text: err?.response?.data?.message || 'Não foi possível carregar o cliente.' }))
            .finally(() => setLoading(false));
    };

    useEffect(() => { setLoading(true); load(); }, [clientId]);

    const projects = useMemo(() => {
        if (!client) return [];
        const latest = (project: TattooProject) => {
            const dates = project.sessions.map((session) => (session.date ? new Date(session.date).getTime() : 0));
            return dates.length ? Math.max(...dates) : new Date(project.createdAt).getTime();
        };
        return [...client.projects].sort((a, b) => latest(b) - latest(a));
    }, [client]);

    const projectCount = client?._count?.projects ?? projects.length;
    const sessionCount = useMemo(() => client?.projects.reduce((sum, project) => sum + project.sessions.length, 0) ?? 0, [client]);

    const handleSavedClient = () => { load(); setNotice({ type: 'success', text: 'Cliente atualizado.' }); };

    const handleCreatedProject = (result: RegisterResult) => {
        load();
        const note = result.serviceRecordId
            ? ' Tatuagem registada e valor lançado nos Ganhos.'
            : ' Tatuagem registada no histórico (sem valor lançado nos Ganhos — preencha o valor € para lançar).';
        setNotice({ type: 'success', text: note });
    };

    const removeClient = async () => {
        try {
            await api.delete(`/crm/clients/${clientId}`);
            navigate('/crm');
        } catch (err: any) {
            setNotice({ type: 'danger', text: err?.response?.data?.message || 'Não foi possível eliminar o cliente.' });
            setConfirmDelete(false);
        }
    };

    if (loading) {
        return <div className="d-flex justify-content-center py-5"><Spinner animation="border" variant="primary" /></div>;
    }
    if (!client) {
        return (
            <div className="py-4 text-center text-muted">
                <p>Cliente não encontrado.</p>
                <Button onClick={() => navigate('/crm')} variant="outline-primary" className="rounded-pill"><ArrowLeft size={16} className="me-1" />Voltar ao CRM</Button>
            </div>
        );
    }

    return (
        <div className="py-4">
            <div className="d-flex align-items-center gap-2 mb-4">
                <Button onClick={() => navigate('/crm')} variant="light" size="sm" className="rounded-pill d-inline-flex align-items-center gap-1"><ArrowLeft size={16} />CRM</Button>
                <div className="text-uppercase small fw-bold text-primary">Ficha de cliente</div>
            </div>

            {notice && <Alert variant={notice.type} dismissible onClose={() => setNotice(null)}>{notice.text}</Alert>}

            <Row className="g-4">
                <Col lg={4}>
                    <Card className="border-0 shadow-sm rounded-4 mb-4">
                        <Card.Body className="p-4 text-center">
                            <div className="mx-auto d-flex align-items-center justify-content-center bg-primary text-white fw-bold rounded-circle mb-3" style={{ width: 84, height: 84, fontSize: '1.8rem' }}>
                                {initials(client.name, client.surname)}
                            </div>
                            <h1 className="h4 fw-bold mb-1">{client.name} {client.surname}</h1>
                            <div className="d-flex justify-content-center gap-2 mb-3">
                                <Badge bg="light" text="secondary">{projectCount} {projectCount === 1 ? 'projeto' : 'projetos'}</Badge>
                                <Badge bg="light" text="secondary">{sessionCount} {sessionCount === 1 ? 'sessão' : 'sessões'}</Badge>
                            </div>
                            <div className="d-flex justify-content-center gap-2">
                                <Button variant="outline-primary" size="sm" className="rounded-pill d-inline-flex align-items-center gap-1" onClick={() => setShowEdit(true)}><Pencil size={14} />Editar</Button>
                                {isAdmin && <Button variant="outline-danger" size="sm" className="rounded-pill d-inline-flex align-items-center gap-1" onClick={() => setConfirmDelete(true)}><Trash2 size={14} />Eliminar</Button>}
                            </div>
                        </Card.Body>
                    </Card>

                    <Card className="border-0 shadow-sm rounded-4">
                        <Card.Body className="p-4">
                            <h2 className="h6 fw-bold text-uppercase text-muted mb-3">Contactos</h2>
                            <ul className="list-unstyled mb-0 d-flex flex-column gap-3">
                                {client.phone && <li className="d-flex align-items-center gap-2"><span className="bg-light rounded-3 p-2 text-primary"><Phone size={16} /></span><a href={`tel:${client.phone}`} className="text-decoration-none text-dark">{client.phone}</a></li>}
                                {client.email && <li className="d-flex align-items-center gap-2"><span className="bg-light rounded-3 p-2 text-primary"><Mail size={16} /></span><a href={`mailto:${client.email}`} className="text-decoration-none text-dark">{client.email}</a></li>}
                                {client.country && <li className="d-flex align-items-center gap-2"><span className="bg-light rounded-3 p-2 text-primary"><MapPin size={16} /></span>{client.country}</li>}
                                <li className="d-flex align-items-center gap-2"><span className="bg-light rounded-3 p-2 text-primary"><CalendarDays size={16} /></span><span className="small">Cliente desde {fmtDate(client.createdAt)}</span></li>
                            </ul>
                            {client.notes && (
                                <div className="border-top pt-3 mt-3">
                                    <h3 className="h6 fw-bold text-uppercase text-muted mb-2"><StickyNote size={14} className="me-1" />Notas</h3>
                                    <p className="small text-muted mb-0" style={{ whiteSpace: 'pre-wrap' }}>{client.notes}</p>
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </Col>

                <Col lg={8}>
                    <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
                        <h2 className="h5 fw-bold mb-0"><Palette size={20} className="text-primary me-2" />Histórico de tatuagens</h2>
                        <Button onClick={() => setShowCreateProject(true)} className="d-inline-flex align-items-center gap-2 rounded-pill px-4"><Plus size={18} />Registar tatuagem</Button>
                    </div>

                    {projects.length === 0 ? (
                        <Card className="border-0 shadow-sm rounded-4">
                            <Card.Body className="p-5 text-center text-muted">
                                <UserRound size={40} className="mx-auto d-block mb-3 opacity-50" />
                                <p className="mb-1 fw-semibold text-dark">Ainda não há tatuagens registadas para este cliente.</p>
                                <p className="small">Registe a primeira tatuagem para começar o histórico de sessões e fotos.</p>
                                <Button onClick={() => setShowCreateProject(true)} className="mt-2 rounded-pill"><Plus size={16} className="me-1" />Registar tatuagem</Button>
                            </Card.Body>
                        </Card>
                    ) : (
                        <div className="d-flex flex-column gap-3">
                            {projects.map((project) => {
                                const stats = computeProjectStats(project.sessions);
                                const done = isProjectCompleted(project.sessions);
                                return (
                                    <Card key={project.id} className="border-0 shadow-sm rounded-4 project-card" onClick={() => navigate(`/crm/projects/${project.id}`)} role="button">
                                        <Card.Body className="p-4">
                                            <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2">
                                                <div className="d-flex align-items-center gap-2 flex-wrap">
                                                    <Badge bg={done ? 'success' : 'warning'}>{done ? 'Concluído' : 'Em progresso'}</Badge>
                                                    {project.serviceName && <Badge bg="light" text="primary">{project.serviceName}</Badge>}
                                                    {project.placement && <Badge bg="light" text="secondary"><MapPin size={12} className="me-1" />{project.placement}</Badge>}
                                                    {project.size && <Badge bg="light" text="secondary"><Ruler size={12} className="me-1" />{project.size}</Badge>}
                                                </div>
                                                <div className="text-end small text-muted">
                                                    <div className="fw-bold text-dark fs-6">{currency(project.cost)}</div>
                                                    <div><Clock size={12} className="me-1" />{done ? `Concluída a ${fmtDate(stats.completedTs ? new Date(stats.completedTs).toISOString() : null)}` : 'Em curso'}</div>
                                                </div>
                                            </div>

                                            {project.description && (
                                                <p className="text-muted mb-3" style={{ whiteSpace: 'pre-wrap' }}>{project.description.length > 220 ? `${project.description.slice(0, 220)}...` : project.description}</p>
                                            )}

                                            <div className="d-flex flex-wrap gap-4 small">
                                                <span className="text-muted">1ª sessão: <strong className="text-dark">{fmtDate(project.sessions[0]?.date)}</strong></span>
                                                <span className="text-muted">Sessões: <strong className="text-dark">{project.sessions.length}/{project.plannedSessions}</strong> <Badge bg="success" className="ms-1">{stats.completedCount} concluída{stats.completedCount === 1 ? '' : 's'}</Badge></span>
                                                <span className="text-muted" title="Dias desde a 1ª sessão até à sessão marcada como Concluída">
                                                    Dias de projeto: <strong className="text-dark">{stats.projectDays !== null ? stats.projectDays : '—'}</strong>
                                                </span>
                                            </div>

                                            {project.sessions.length > 0 && (
                                                <div className="small text-muted border-top pt-2 mt-3">
                                                    {project.sessions.map((session) => (
                                                        <span key={session.id} className="me-3 d-inline-flex align-items-center gap-1">
                                                            <span className={`badge ${session.status === 'COMPLETED' ? 'bg-success' : 'bg-warning'}`}>S{session.sessionNumber}</span>
                                                            {fmtDate(session.date)}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </Card.Body>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </Col>
            </Row>

            <ClientFormModal
                show={showEdit}
                onHide={() => setShowEdit(false)}
                client={client as CrmClientLite}
                onSaved={handleSavedClient}
            />

            <CreateProjectModal
                show={showCreateProject}
                onHide={() => setShowCreateProject(false)}
                clientId={client.id}
                onSaved={handleCreatedProject}
            />

            <Modal show={confirmDelete} onHide={() => setConfirmDelete(false)} centered>
                <Modal.Header closeButton><Modal.Title>Eliminar cliente</Modal.Title></Modal.Header>
                <Modal.Body>
                    <p className="mb-1">Tem a certeza que pretende eliminar <strong>{client.name} {client.surname}</strong>?</p>
                    <p className="text-muted small mb-0">Todo o histórico de tatuagens, sessões e fotos será eliminado permanentemente.</p>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="light" onClick={() => setConfirmDelete(false)}>Cancelar</Button>
                    <Button variant="danger" onClick={removeClient}>Eliminar</Button>
                </Modal.Footer>
            </Modal>

            <style>{`
                .project-card { transition: transform 0.15s ease, box-shadow 0.15s ease; cursor: pointer; }
                .project-card:hover { transform: translateY(-2px); box-shadow: 0 .5rem 1rem rgba(0,0,0,.08) !important; }
            `}</style>
        </div>
    );
};

export default CrmClientDetail;
