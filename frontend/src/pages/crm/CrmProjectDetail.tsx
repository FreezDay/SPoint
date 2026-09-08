import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Alert, Badge, Button, Card, Col, Form, Modal, Row, Spinner } from 'react-bootstrap';
import { ArrowLeft, CalendarDays, Camera, CheckCircle2, Clock3, CreditCard, Euro, MapPin, Pencil, Plus, Ruler, StickyNote, Trash2, Upload, ZoomIn } from 'lucide-react';
import api from '../../lib/api';
import { useAuthStore } from '../../store/useAuthStore';
import EditProjectModal from './EditProjectModal';
import UploadPhotosModal from './UploadPhotosModal';
import { computeProjectStats, currency, fmtDate, PAYMENT_METHODS, PHOTO_KIND_LABEL } from './crmShared';
import type { PhotoKind, ProjectPhoto, SessionStatus, TattooProject, TattooSession } from './crmShared';

const dateValue = (value: string | null) => (value ? String(value).slice(0, 10) : '');

const toApiDate = (value: string) => (value ? `${value}T12:00:00.000Z` : null);

const KIND_BADGE: Record<PhotoKind, string> = { DRAFT: 'bg-info text-dark', PROGRESS: 'bg-warning text-dark', FINAL: 'bg-success text-white' };

const parseAmount = (value: string): number | null => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : null;
};

type SessionCardProps = {
    session: TattooSession;
    sessionCount: number;
    saving: boolean;
    highlighted: boolean;
    onSave: (sessionId: string, patch: { date?: string | null; status?: SessionStatus; notes?: string | null; amount?: number | null; paymentMethod?: string | null }) => Promise<void>;
    onDelete: (session: TattooSession) => void;
    onAttachPhoto: (session: TattooSession) => void;
};

const SessionCard: React.FC<SessionCardProps> = ({ session, sessionCount, saving, highlighted, onSave, onDelete, onAttachPhoto }) => {
    const [date, setDate] = useState(dateValue(session.date));
    const [status, setStatus] = useState<SessionStatus>(session.status);
    const [notes, setNotes] = useState(session.notes || '');
    const [amount, setAmount] = useState(session.amount !== null && session.amount !== undefined ? String(session.amount) : '');
    const [paymentMethod, setPaymentMethod] = useState(session.paymentMethod || '');
    const [error, setError] = useState('');
    const first = session.sessionNumber === 1;
    const amountNum = parseAmount(amount);
    const paid = amountNum !== null && amountNum > 0 && !!paymentMethod;
    const dirty = date !== dateValue(session.date) || status !== session.status || notes !== (session.notes || '')
        || amountNum !== (session.amount ?? null) || paymentMethod !== (session.paymentMethod || '');

    const save = async () => {
        setError('');
        if (amountNum !== null && amountNum > 0 && !paymentMethod) {
            setError('Indique o método de pagamento (Dinheiro, MB WAY, Multibanco ou Cartão).');
            return;
        }
        try {
            // A first session can change its date but never lose it.
            const patchDate = date === '' ? (first ? session.date : null) : toApiDate(date);
            await onSave(session.id, { date: patchDate, status, notes: notes.trim() || null, amount: amountNum, paymentMethod: paymentMethod || null });
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Não foi possível guardar a sessão.');
        }
    };

    return (
        <div id={`crm-session-${session.id}`} className="rounded-4" style={highlighted ? { boxShadow: '0 0 0 3px #0d6efd' } : undefined}>
        <Card className="border-0 shadow-sm rounded-4">
            <Card.Body className="p-4">
                <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
                    <div className="d-flex align-items-center gap-2">
                        <span className="badge bg-primary text-white fs-6">Sessão {session.sessionNumber}</span>
                        {first && <Badge bg="light" text="secondary">Data obrigatória (1ª sessão)</Badge>}
                        {paid && <Badge bg="success" className="text-white"><CheckCircle2 size={12} className="me-1" />Paga · {currency(amountNum)}</Badge>}
                    </div>
                    <div className="d-flex align-items-center gap-2">
                        <Button variant="light" size="sm" title="Adicionar foto a esta sessão" onClick={() => onAttachPhoto(session)}><Camera size={15} /></Button>
                        <Button variant="outline-danger" size="sm" title="Eliminar sessão" onClick={() => onDelete(session)}><Trash2 size={15} /></Button>
                    </div>
                </div>
                <Row className="g-3 align-items-end">
                    <Col sm={6} md={4}>
                        <Form.Group>
                            <Form.Label className="small text-muted">Data da sessão {first && <span className="text-danger">*</span>}</Form.Label>
                            <Form.Control type="date" value={date} onChange={(event) => setDate(event.target.value)} disabled={saving} />
                        </Form.Group>
                    </Col>
                    <Col sm={6} md={4}>
                        <Form.Group>
                            <Form.Label className="small text-muted">Estado</Form.Label>
                            <Form.Select value={status} onChange={(event) => setStatus(event.target.value as SessionStatus)} disabled={saving}>
                                <option value="IN_PROGRESS">Em progresso</option>
                                <option value="COMPLETED">Concluída</option>
                            </Form.Select>
                        </Form.Group>
                    </Col>
                    <Col md={4}>
                        <Form.Group>
                            <Form.Label className="small text-muted">Notas da sessão</Form.Label>
                            <Form.Control as="textarea" rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="O que foi feito, reação da pele, próximos passos..." disabled={saving} />
                        </Form.Group>
                    </Col>
                </Row>
                <Row className="g-3 align-items-end mt-1">
                    <Col sm={6} lg={4}>
                        <Form.Group>
                            <Form.Label className="small text-muted"><Euro size={12} className="me-1" />Valor pago (€)</Form.Label>
                            <Form.Control
                                type="number"
                                min={0}
                                step="0.01"
                                inputMode="decimal"
                                value={amount}
                                onChange={(event) => setAmount(event.target.value)}
                                placeholder="0.00"
                                disabled={saving}
                            />
                        </Form.Group>
                    </Col>
                    <Col sm={6} lg={4}>
                        <Form.Group>
                            <Form.Label className="small text-muted"><CreditCard size={12} className="me-1" />Método de pagamento</Form.Label>
                            <Form.Select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} disabled={saving}>
                                <option value="">— Método —</option>
                                {PAYMENT_METHODS.map((method) => <option key={method}>{method}</option>)}
                            </Form.Select>
                        </Form.Group>
                    </Col>
                    <Col lg={4}>
                        <div className="small text-muted pb-1">
                            {status === 'COMPLETED' && paid
                                ? <span className="text-success fw-semibold">Lançado nos Ganhos — clique em Ganhos para ver.</span>
                                : <>Valor de sessão concluída e paga entra nos <strong>Ganhos</strong>.</>}
                        </div>
                    </Col>
                </Row>
                {error && <Alert variant="danger" className="py-2 mt-3 mb-0">{error}</Alert>}
                <div className="d-flex justify-content-end mt-3">
                    <Button size="sm" onClick={save} disabled={!dirty || saving || sessionCount === 0} className="rounded-pill px-4">
                        {saving ? <><span className="spinner-border spinner-border-sm me-2" />A guardar...</> : 'Guardar sessão'}
                    </Button>
                </div>
            </Card.Body>
        </Card>
        </div>
    );
};

const CrmProjectDetail: React.FC = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user } = useAuthStore();
    const isAdmin = user?.role === 'ADMIN';
    const [project, setProject] = useState<TattooProject | null>(null);
    const [loading, setLoading] = useState(true);
    const [notice, setNotice] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);
    const [showEdit, setShowEdit] = useState(false);
    const [savingSessionId, setSavingSessionId] = useState<string | null>(null);
    const [addingSession, setAddingSession] = useState(false);
    const [confirmDeleteProject, setConfirmDeleteProject] = useState(false);
    const [deletingSession, setDeletingSession] = useState<TattooSession | null>(null);
    const [deletingPhoto, setDeletingPhoto] = useState<ProjectPhoto | null>(null);
    const [lightbox, setLightbox] = useState<ProjectPhoto | null>(null);
    const [showUpload, setShowUpload] = useState(false);
    const [uploadSession, setUploadSession] = useState<TattooSession | null>(null);
    const [filter, setFilter] = useState<'ALL' | PhotoKind>('ALL');
    // When arriving from Ganhos (?session=<id>) the target session is
    // scrolled into view and highlighted briefly.
    const [highlightedId, setHighlightedId] = useState<string | null>(searchParams.get('session'));

    const openUpload = (session: TattooSession | null) => {
        setUploadSession(session);
        setShowUpload(true);
    };

    const load = () => {
        api.get(`/crm/projects/${projectId}`)
            .then((response) => setProject(response.data))
            .catch((err: any) => setNotice({ type: 'danger', text: err?.response?.data?.message || 'Não foi possível carregar o projeto.' }))
            .finally(() => setLoading(false));
    };

    useEffect(() => { setLoading(true); setNotice(null); load(); }, [projectId]);

    // Scroll to the session when the user arrives from Ganhos (?session=<id>).
    useEffect(() => {
        if (!highlightedId || !project || project.sessions.length === 0) return;
        const timer = window.setTimeout(() => {
            const element = document.getElementById(`crm-session-${highlightedId}`);
            if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            window.setTimeout(() => setHighlightedId((current) => (current === highlightedId ? null : current)), 3500);
        }, 250);
        return () => window.clearTimeout(timer);
    }, [highlightedId, project]);

    const stats = useMemo(() => (project ? computeProjectStats(project.sessions) : null), [project]);
    const done = project ? project.sessions.some((session) => session.status === 'COMPLETED') : false;

    const photos = useMemo(() => {
        if (!project) return [];
        const sorted = [...project.photos || []].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        return filter === 'ALL' ? sorted : sorted.filter((photo) => photo.kind === filter);
    }, [project, filter]);

    const sessionOf = (photo: ProjectPhoto) => project?.sessions.find((session) => session.id === photo.sessionId);

    const sessionNumbersById = useMemo(() => {
        const map = new Map<string, number>();
        project?.sessions.forEach((session) => map.set(session.id, session.sessionNumber));
        return map;
    }, [project]);

    const saveSession = async (sessionId: string, patch: { date?: string | null; status?: SessionStatus; notes?: string | null; amount?: number | null; paymentMethod?: string | null }) => {
        setSavingSessionId(sessionId);
        try {
            const response = await api.patch(`/crm/sessions/${sessionId}`, patch);
            setProject((current) => current ? {
                ...current,
                sessions: current.sessions.map((session) => (session.id === sessionId ? response.data : session)),
            } : current);
            if (highlightedId === sessionId) {
                setNotice({ type: 'success', text: 'Sessão guardada — valor atualizado nos Ganhos.' });
            }
        } finally {
            setSavingSessionId(null);
        }
    };

    const addSession = async () => {
        setAddingSession(true);
        setNotice(null);
        try {
            await api.post(`/crm/projects/${projectId}/sessions`, {});
            await load();
            setNotice({ type: 'success', text: 'Sessão adicionada. Preencha a data quando estiver agendada.' });
        } catch (err: any) {
            setNotice({ type: 'danger', text: err?.response?.data?.message || 'Não foi possível adicionar a sessão.' });
        } finally {
            setAddingSession(false);
        }
    };

    const removeSession = async () => {
        if (!deletingSession) return;
        try {
            await api.delete(`/crm/sessions/${deletingSession.id}`);
            await load();
            setNotice({ type: 'success', text: 'Sessão eliminada.' });
        } catch (err: any) {
            setNotice({ type: 'danger', text: err?.response?.data?.message || 'Não foi possível eliminar a sessão.' });
        } finally {
            setDeletingSession(null);
        }
    };

    const removePhoto = async () => {
        if (!deletingPhoto) return;
        try {
            await api.delete(`/crm/photos/${deletingPhoto.id}`);
            setProject((current) => current ? { ...current, photos: current.photos?.filter((photo) => photo.id !== deletingPhoto.id) } : current);
            setNotice({ type: 'success', text: 'Foto eliminada.' });
        } catch (err: any) {
            setNotice({ type: 'danger', text: err?.response?.data?.message || 'Não foi possível eliminar a foto.' });
        } finally {
            setDeletingPhoto(null);
        }
    };

    const removeProject = async () => {
        try {
            await api.delete(`/crm/projects/${projectId}`);
            navigate(`/crm/clients/${project?.clientId}`);
        } catch (err: any) {
            setNotice({ type: 'danger', text: err?.response?.data?.message || 'Não foi possível eliminar o projeto.' });
            setConfirmDeleteProject(false);
        }
    };

    if (loading) {
        return <div className="d-flex justify-content-center py-5"><Spinner animation="border" variant="primary" /></div>;
    }
    if (!project) {
        return (
            <div className="py-4 text-center text-muted">
                <p>Projeto não encontrado.</p>
                <Button onClick={() => navigate('/crm')} variant="outline-primary" className="rounded-pill">Voltar ao CRM</Button>
            </div>
        );
    }

    const clientName = project.client ? `${project.client.name} ${project.client.surname}` : '';

    return (
        <div className="py-4">
            <div className="d-flex align-items-center gap-2 mb-4">
                <Button onClick={() => navigate(`/crm/clients/${project.clientId}`)} variant="light" size="sm" className="rounded-pill d-inline-flex align-items-center gap-1"><ArrowLeft size={16} />{clientName}</Button>
                <div className="text-uppercase small fw-bold text-primary">Projeto de tatuagem</div>
            </div>

            {notice && <Alert variant={notice.type} dismissible onClose={() => setNotice(null)}>{notice.text}</Alert>}

            <Card className="border-0 shadow-sm rounded-4 mb-4">
                <Card.Body className="p-4">
                    <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
                        <div>
                            <div className="d-flex align-items-center gap-2 flex-wrap mb-2">
                                <Badge bg={done ? 'success' : 'warning'} className="fs-6">{done ? 'Concluído' : 'Em progresso'}</Badge>
                                {project.serviceName && <Badge bg="light" text="primary">{project.serviceName}</Badge>}
                                {project.placement && <Badge bg="light" text="secondary"><MapPin size={12} className="me-1" />{project.placement}</Badge>}
                                {project.size && <Badge bg="light" text="secondary"><Ruler size={12} className="me-1" />{project.size}</Badge>}
                            </div>
                            <h1 className="h4 fw-bold mb-0">{project.description?.split('\n')[0] || 'Tatuagem'}</h1>
                            <p className="text-muted small mb-0 mt-1">
                                Cliente:{' '}
                                <span
                                    className="text-decoration-none fw-semibold text-primary"
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => navigate(`/crm/clients/${project.clientId}`)}
                                >
                                    {clientName}
                                </span>
                            </p>
                        </div>
                        <div className="d-flex gap-2">
                            <Button variant="outline-primary" size="sm" className="rounded-pill d-inline-flex align-items-center gap-1" onClick={() => setShowEdit(true)}><Pencil size={14} />Editar</Button>
                            {isAdmin && <Button variant="outline-danger" size="sm" className="rounded-pill d-inline-flex align-items-center gap-1" onClick={() => setConfirmDeleteProject(true)}><Trash2 size={14} />Eliminar</Button>}
                        </div>
                    </div>
                </Card.Body>
            </Card>

            <Row className="g-3 mb-4">
                {[
                    { icon: <CalendarDays size={18} />, label: '1ª sessão', value: fmtDate(project.sessions[0]?.date || null), hint: 'Data de início do projeto' },
                    { icon: <Euro size={18} />, label: 'Custo total', value: currency(project.cost), hint: 'Preço combinado da tatuagem' },
                    {
                        icon: <Clock3 size={18} />,
                        label: 'Sessões',
                        value: `${project.sessions.length}/${project.plannedSessions}`,
                        hint: `${stats?.completedCount || 0} concluída${stats?.completedCount === 1 ? '' : 's'}`,
                    },
                    {
                        icon: <CheckCircle2 size={18} />,
                        label: 'Dias de projeto',
                        value: stats?.projectDays !== null && stats?.projectDays !== undefined ? String(stats.projectDays) : '—',
                        hint: stats?.completedTs ? `até ${fmtDate(new Date(stats.completedTs).toISOString())}` : 'aguarda sessão "Concluída"',
                    },
                ].map((stat, index) => (
                    <Col md={6} xl={3} key={index}>
                        <Card className="border-0 shadow-sm rounded-4 h-100">
                            <Card.Body className="p-4 d-flex gap-3 align-items-center">
                                <div className={`p-3 rounded-3 ${index === 3 && stats?.projectDays !== null ? 'bg-success text-white bg-opacity-75' : 'bg-primary text-white bg-opacity-75'}`}>{stat.icon}</div>
                                <div>
                                    <div className="text-uppercase small text-muted fw-bold">{stat.label}</div>
                                    <div className="fs-5 fw-bold">{stat.value}</div>
                                    <div className="small text-muted">{stat.hint}</div>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                ))}
            </Row>

            <Row className="g-4">
                <Col xl={5}>
                    <Card className="border-0 shadow-sm rounded-4 mb-4">
                        <Card.Body className="p-4">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <h2 className="h6 fw-bold text-uppercase text-muted mb-0"><StickyNote size={15} className="me-1" />Sobre a tatuagem</h2>
                                <Button variant="light" size="sm" onClick={() => setShowEdit(true)}><Pencil size={14} /></Button>
                            </div>
                            {project.description ? (
                                <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>{project.description}</p>
                            ) : (
                                <p className="text-muted small mb-0">Sem texto sobre a tatuagem. Clique no lápis para descrever o desenho, estilo e ideias.</p>
                            )}
                            <div className="border-top mt-3 pt-3 small text-muted d-flex flex-column gap-1">
                                <span>Criado em {fmtDate(project.createdAt)}</span>
                                <span>Última alteração em {fmtDate(project.updatedAt)}</span>
                            </div>
                        </Card.Body>
                    </Card>

                    <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                        <h2 className="h5 fw-bold mb-0">Sessões ({project.sessions.length})</h2>
                        <Button variant="primary" className="rounded-pill d-inline-flex align-items-center gap-1 px-3" onClick={addSession} disabled={addingSession}>
                            {addingSession ? <span className="spinner-border spinner-border-sm" /> : <Plus size={16} />}Adicionar sessão
                        </Button>
                    </div>
                    <div className="d-flex flex-column gap-3">
                        {project.sessions.length === 0 && (
                            <Card className="border-0 shadow-sm rounded-4"><Card.Body className="p-4 text-center text-muted small">Sem sessões registadas.</Card.Body></Card>
                        )}
                        {project.sessions.map((session) => (
                            <SessionCard
                                key={session.id}
                                session={session}
                                sessionCount={project.sessions.length}
                                saving={savingSessionId === session.id}
                                highlighted={highlightedId === session.id}
                                onSave={saveSession}
                                onDelete={(target) => setDeletingSession(target)}
                                onAttachPhoto={(target) => openUpload(target)}
                            />
                        ))}
                    </div>
                </Col>

                <Col xl={7}>
                    <Card className="border-0 shadow-sm rounded-4">
                        <Card.Body className="p-4">
                            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                                <h2 className="h5 fw-bold mb-0">Galeria de fotos ({project.photos?.length || 0})</h2>
                                <Button variant="outline-primary" className="rounded-pill d-inline-flex align-items-center gap-1 px-3" onClick={() => openUpload(null)}>
                                    <Upload size={16} />Adicionar fotos
                                </Button>
                            </div>
                            <div className="d-flex gap-2 mb-3 flex-wrap">
                                {(['ALL', 'DRAFT', 'PROGRESS', 'FINAL'] as const).map((option) => (
                                    <Button
                                        key={option}
                                        size="sm"
                                        variant={filter === option ? 'dark' : 'light'}
                                        className="rounded-pill px-3"
                                        onClick={() => setFilter(option)}
                                    >
                                        {option === 'ALL' ? 'Todas' : PHOTO_KIND_LABEL[option]}
                                    </Button>
                                ))}
                            </div>
                            {photos.length === 0 ? (
                                <div className="text-center py-5 text-muted">
                                    <ZoomIn size={30} className="opacity-50 mx-auto d-block mb-2" />
                                    <p className="small mb-0">Sem fotos neste filtro. Adicione o primeiro esboço, fotos de progresso e as fotos finais.</p>
                                </div>
                            ) : (
                                <div className="row g-3">
                                    {photos.map((photo) => {
                                        const session = sessionOf(photo);
                                        return (
                                            <div className="col-6 col-md-4 col-xxl-3" key={photo.id}>
                                                <div className="position-relative rounded-4 overflow-hidden border" style={{ aspectRatio: '1 / 1' }} role="button" onClick={() => setLightbox(photo)}>
                                                    <img src={photo.dataUrl} alt={PHOTO_KIND_LABEL[photo.kind]} className="w-100 h-100" style={{ objectFit: 'cover' }} loading="lazy" />
                                                    <div className="position-absolute top-0 start-0 m-2">
                                                        <Badge bg="light" className={`${KIND_BADGE[photo.kind]} shadow-sm`}>{PHOTO_KIND_LABEL[photo.kind]}</Badge>
                                                    </div>
                                                    {session && (
                                                        <div className="position-absolute bottom-0 start-0 m-2">
                                                            <Badge bg="dark" className="shadow-sm">Sessão {session.sessionNumber}</Badge>
                                                        </div>
                                                    )}
                                                    {isAdmin && (
                                                        <button
                                                            type="button"
                                                            className="btn btn-danger btn-sm position-absolute top-0 end-0 m-2 rounded-circle p-1 d-flex align-items-center justify-content-center"
                                                            style={{ width: 28, height: 28, opacity: 0.9 }}
                                                            title="Eliminar foto"
                                                            onClick={(event) => { event.stopPropagation(); setDeletingPhoto(photo); }}
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            {photos.length > 0 && sessionNumbersById && (
                                <p className="small text-muted mt-3 mb-0 d-flex align-items-center gap-1">
                                    <ZoomIn size={13} />Clique numa foto para a ampliar. As fotos são comprimidas automaticamente ao carregar.
                                </p>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <EditProjectModal
                show={showEdit}
                onHide={() => setShowEdit(false)}
                project={project}
                onSaved={(updated) => { setProject(updated); setNotice({ type: 'success', text: 'Projeto atualizado.' }); }}
            />

            <UploadPhotosModal
                show={showUpload}
                onHide={() => setShowUpload(false)}
                projectId={project.id}
                sessions={project.sessions}
                onUploaded={() => { load(); setNotice({ type: 'success', text: 'Fotos adicionadas à galeria.' }); }}
                presetSessionId={uploadSession?.id || ''}
            />

            <Modal show={!!lightbox} onHide={() => setLightbox(null)} size="lg" centered>
                <Modal.Header closeButton>
                    <Modal.Title>
                        {lightbox && PHOTO_KIND_LABEL[lightbox.kind]}
                        {lightbox && sessionNumbersById.has(lightbox.sessionId || '') && ` · Sessão ${sessionNumbersById.get(lightbox.sessionId || '')}`}
                        {lightbox && ` · ${fmtDate(lightbox.createdAt)}`}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="text-center p-0">
                    {lightbox && <img src={lightbox.dataUrl} alt="Foto" className="w-100 rounded-bottom-4" style={{ maxHeight: '75vh', objectFit: 'contain' }} />}
                </Modal.Body>
            </Modal>

            <Modal show={!!deletingSession} onHide={() => setDeletingSession(null)} centered>
                <Modal.Header closeButton><Modal.Title>Eliminar sessão</Modal.Title></Modal.Header>
                <Modal.Body>
                    <p className="mb-0">Tem a certeza que pretende eliminar a <strong>Sessão {deletingSession?.sessionNumber}</strong>? As fotos ligadas a esta sessão ficam guardadas na galeria.</p>
                    {deletingSession?.amount !== null && deletingSession?.amount !== undefined && deletingSession.amount > 0 && (
                        <p className="text-muted small mt-2 mb-0">O valor de {currency(deletingSession.amount)} lançado nos Ganhos por esta sessão também será eliminado.</p>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="light" onClick={() => setDeletingSession(null)}>Cancelar</Button>
                    <Button variant="danger" onClick={removeSession}>Eliminar</Button>
                </Modal.Footer>
            </Modal>

            <Modal show={!!deletingPhoto} onHide={() => setDeletingPhoto(null)} centered>
                <Modal.Header closeButton><Modal.Title>Eliminar foto</Modal.Title></Modal.Header>
                <Modal.Body><p className="mb-0">Tem a certeza que pretende eliminar esta foto da galeria?</p></Modal.Body>
                <Modal.Footer>
                    <Button variant="light" onClick={() => setDeletingPhoto(null)}>Cancelar</Button>
                    <Button variant="danger" onClick={removePhoto}>Eliminar</Button>
                </Modal.Footer>
            </Modal>

            <Modal show={confirmDeleteProject} onHide={() => setConfirmDeleteProject(false)} centered>
                <Modal.Header closeButton><Modal.Title>Eliminar projeto</Modal.Title></Modal.Header>
                <Modal.Body>
                    <p className="mb-1">Tem a certeza que pretende eliminar esta tatuagem?</p>
                    <p className="text-muted small mb-0">Todas as sessões e fotos do projeto serão eliminadas permanentemente.</p>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="light" onClick={() => setConfirmDeleteProject(false)}>Cancelar</Button>
                    <Button variant="danger" onClick={removeProject}>Eliminar</Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default CrmProjectDetail;
