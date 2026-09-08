import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Card, Col, Form, Row } from 'react-bootstrap';
import { CalendarPlus, ClipboardPlus, ImagePlus, PlusCircle, Search, UserRound, X } from 'lucide-react';
import api from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';
import { compressImageFile } from '../lib/image';
import { PLACEMENT_OPTIONS } from './crm/crmShared';
import type { CrmClientLite } from './crm/crmShared';
import { TATTOO_SERVICE_OPTIONS, TATTOO_SERVICE_PRICES } from '../lib/tattoo';

const OTHER = 'Outro';
const today = () => new Date().toISOString().slice(0, 10);
const MAX_EXTRA_DATES = 10;

const ServiceRegister: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const isAdmin = user?.role === 'ADMIN';

    const [staff, setStaff] = useState<{ id: string; name: string }[]>([]);
    const [client, setClient] = useState<CrmClientLite | null>(null);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<CrmClientLite[]>([]);
    const [openResults, setOpenResults] = useState(false);
    const [searching, setSearching] = useState(false);

    const [form, setForm] = useState({
        serviceName: '',
        customService: '',
        amount: '',
        paymentMethod: 'Dinheiro',
        placement: '',
        customPlacement: '',
        size: '',
        plannedSessions: '1',
        firstSessionDate: today(),
        firstSessionStatus: 'IN_PROGRESS',
        sessionNotes: '',
        staffId: '',
    });
    const [extraDates, setExtraDates] = useState<string[]>([]);
    const [draftPhoto, setDraftPhoto] = useState<string | null>(null);
    const [compressing, setCompressing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'danger'; text: string; clientId?: string } | null>(null);

    useEffect(() => {
        if (isAdmin) {
            api.get('/staff').then((response) => {
                const members = response.data || [];
                setStaff(members);
                // The artist that registers services is the studio owner
                // (Maksym, the ADMIN account) by default.
                const owner = members.find((member: any) => member.role === 'ADMIN');
                if (owner) {
                    setForm((current) => (current.staffId ? current : { ...current, staffId: owner.id }));
                }
            }).catch(() => setStaff([]));
        }
    }, [isAdmin]);

    // Debounced CRM client search (clients are only created inside the CRM).
    useEffect(() => {
        const timer = window.setTimeout(() => {
            setSearching(true);
            api.get('/crm/client-search', { params: query.trim() ? { q: query.trim() } : {} })
                .then((response) => setResults(response.data || []))
                .catch(() => setResults([]))
                .finally(() => setSearching(false));
        }, 250);
        return () => window.clearTimeout(timer);
    }, [query, client]);

    const pickClient = (candidate: CrmClientLite) => {
        setClient(candidate);
        setQuery('');
        setOpenResults(false);
    };

    const showResults = openResults && !client && query.length >= 0;
    const visibleResults = useMemo(() => {
        if (!query.trim()) return results.slice(0, 8);
        return results;
    }, [results, query]);

    const set = (field: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
        setForm({ ...form, [field]: event.target.value });

    const pickService = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const service = event.target.value;
        setForm({ ...form, serviceName: service, amount: service && service !== OTHER ? String(TATTOO_SERVICE_PRICES[service]) : '' });
    };

    const pickDraft = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        setCompressing(true);
        setMessage(null);
        try {
            setDraftPhoto(await compressImageFile(file));
        } catch (err: any) {
            setMessage({ type: 'danger', text: err?.message || 'Não foi possível processar a imagem.' });
        } finally {
            setCompressing(false);
        }
    };

    const resetTattooFields = () => {
        setForm((current) => ({
            ...current,
            serviceName: '',
            customService: '',
            amount: '',
            placement: '',
            customPlacement: '',
            size: '',
            plannedSessions: '1',
            firstSessionDate: today(),
            firstSessionStatus: 'IN_PROGRESS',
            sessionNotes: '',
        }));
        setExtraDates([]);
        setDraftPhoto(null);
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!client) return;
        setSaving(true);
        setMessage(null);
        try {
            const service = form.serviceName === OTHER ? form.customService.trim() : form.serviceName;
            const placement = form.placement === OTHER ? form.customPlacement.trim() : form.placement;
            const amount = form.amount !== '' && Number(form.amount) > 0 ? Number(form.amount) : null;
            const sessionDates = extraDates.filter((date) => date.trim() !== '');
            const response = await api.post('/crm/register', {
                clientId: client.id,
                serviceName: service || null,
                description: null,
                placement: placement || null,
                size: form.size.trim() || null,
                amount,
                paymentMethod: amount !== null ? form.paymentMethod : null,
                plannedSessions: Number(form.plannedSessions),
                firstSessionDate: `${form.firstSessionDate}T12:00:00.000Z`,
                firstSessionStatus: form.firstSessionStatus,
                sessionNotes: form.sessionNotes.trim() || null,
                ...(sessionDates.length ? { sessionDates: sessionDates.map((date) => `${date}T12:00:00.000Z`) } : {}),
                ...(draftPhoto ? { photos: [{ dataUrl: draftPhoto, kind: 'DRAFT' }] } : {}),
                ...(isAdmin && form.staffId ? { staffId: form.staffId } : {}),
            });
            const result = response.data;
            const bits = [`Tatuagem registada para ${result.clientName}.`];
            if (result.sessions > 1) bits.push(`${result.sessions} sessões agendadas.`);
            if (result.photos > 0) bits.push('Esboço guardado.');
            bits.push(result.serviceRecordId ? 'Valor lançado nos Ganhos.' : 'Sem valor lançado — preencha o valor € para lançar nos Ganhos.');
            resetTattooFields();
            setMessage({ type: 'success', text: bits.join(' '), clientId: result.clientId });
        } catch (error: any) {
            setMessage({ type: 'danger', text: error.response?.data?.message || 'Não foi possível registar a tatuagem.' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="py-4">
            <div className="mb-4">
                <div className="text-uppercase small fw-bold text-primary mb-2">Registo diário</div>
                <h1 className="h3 fw-bold mb-1">Registar tatuagem</h1>
                <p className="text-muted mb-0">Escolha um cliente do CRM e registe a tatuagem — o histórico e as fotos ficam na ficha do cliente e o valor é lançado nos Ganhos.</p>
            </div>

            {message && (
                <Alert variant={message.type} dismissible onClose={() => setMessage(null)}>
                    {message.text}
                    {message.type === 'success' && message.clientId && (
                        <div className="mt-2">
                            <Button size="sm" variant="outline-primary" className="rounded-pill" onClick={() => navigate(`/crm/clients/${message.clientId}`)}>
                                Ver ficha do cliente no CRM
                            </Button>
                        </div>
                    )}
                </Alert>
            )}

            <Row className="g-4">
                <Col xl={9}>
                    <Card className="border-0 shadow-sm rounded-4 mb-4">
                        <Card.Body className="p-4">
                            <div className="d-flex gap-3 align-items-center mb-4">
                                <div className="bg-primary bg-opacity-10 text-primary p-3 rounded-3"><ClipboardPlus size={24} /></div>
                                <div>
                                    <h2 className="h5 fw-bold mb-1">1. Cliente (do CRM)</h2>
                                    <p className="small text-muted mb-0">Os clientes são registados apenas na página Clientes do CRM — aqui só pode escolher um já existente.</p>
                                </div>
                            </div>

                            {client ? (
                                <div className="d-flex align-items-center justify-content-between bg-light rounded-3 p-3">
                                    <div className="d-flex align-items-center gap-3">
                                        <div className="d-flex align-items-center justify-content-center bg-primary text-white fw-bold rounded-circle" style={{ width: 42, height: 42 }}>
                                            {`${client.name.charAt(0)}${client.surname.charAt(0)}`.toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="fw-semibold">{client.name} {client.surname}</div>
                                            <div className="small text-muted">{[client.country, client.phone].filter(Boolean).join(' · ') || '—'}</div>
                                        </div>
                                    </div>
                                    <Button variant="outline-secondary" size="sm" onClick={() => setClient(null)}><X size={14} className="me-1" />Trocar cliente</Button>
                                </div>
                            ) : (
                                <div className="position-relative">
                                    <Form.Control
                                        type="search"
                                        placeholder="Pesquisar cliente por nome ou telefone..."
                                        value={query}
                                        onChange={(event) => { setQuery(event.target.value); setOpenResults(true); }}
                                        onFocus={() => setOpenResults(true)}
                                        onBlur={() => window.setTimeout(() => setOpenResults(false), 150)}
                                        autoComplete="off"
                                    />
                                    {showResults && (
                                        <div className="position-absolute w-100 bg-white border rounded-3 shadow-sm mt-1 overflow-auto" style={{ zIndex: 1050, maxHeight: 280 }}>
                                            {searching && <div className="px-3 py-2 small text-muted"><span className="spinner-border spinner-border-sm me-2" />A pesquisar...</div>}
                                            {!searching && visibleResults.length === 0 && (
                                                <div className="px-3 py-3">
                                                    <p className="small text-muted mb-2">Sem clientes no CRM com esse nome.</p>
                                                    <Button size="sm" variant="outline-primary" className="rounded-pill" onMouseDown={() => navigate('/crm')}>
                                                        <UserRound size={14} className="me-1" />Registar novo cliente no CRM
                                                    </Button>
                                                </div>
                                            )}
                                            {visibleResults.map((candidate) => (
                                                <button
                                                    key={candidate.id}
                                                    type="button"
                                                    className="w-100 text-start px-3 py-2 border-0 bg-transparent"
                                                    onMouseDown={() => pickClient(candidate)}
                                                    style={{ cursor: 'pointer' }}
                                                    onMouseEnter={(event) => event.currentTarget.classList.add('bg-light')}
                                                    onMouseLeave={(event) => event.currentTarget.classList.remove('bg-light')}
                                                >
                                                    <div className="fw-semibold">{candidate.name} {candidate.surname}</div>
                                                    <div className="small text-muted">{[candidate.country, candidate.phone, candidate.email].filter(Boolean).join(' · ') || '—'}</div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </Card.Body>
                    </Card>

                    <Card className="border-0 shadow-sm rounded-4">
                        <Card.Body className="p-4">
                            <div className="d-flex gap-3 align-items-center mb-4">
                                <div className="bg-primary bg-opacity-10 text-primary p-3 rounded-3"><ClipboardPlus size={24} /></div>
                                <div>
                                    <h2 className="h5 fw-bold mb-1">2. Tatuagem</h2>
                                    <p className="small text-muted mb-0">Serviço, medidas, local, sessões, esboço e pagamento.</p>
                                </div>
                            </div>
                            <Form onSubmit={handleSubmit}>
                                <Row className="g-3">
                                    <Col md={6}>
                                        <Form.Group>
                                            <Form.Label>Serviço / tipo de tatuagem</Form.Label>
                                            <Form.Select value={form.serviceName} onChange={pickService} required>
                                                <option value="">— Selecionar —</option>
                                                {TATTOO_SERVICE_OPTIONS.map((service) => <option key={service} value={service}>{service}</option>)}
                                                <option value={OTHER}>{OTHER} (escrever)</option>
                                            </Form.Select>
                                        </Form.Group>
                                        {form.serviceName === OTHER && (
                                            <Form.Group className="mt-2">
                                                <Form.Control value={form.customService} onChange={set('customService')} placeholder="Nome do serviço" required />
                                            </Form.Group>
                                        )}
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group>
                                            <Form.Label>Local do corpo</Form.Label>
                                            <Form.Select value={form.placement} onChange={set('placement')}>
                                                <option value="">— Selecionar —</option>
                                                {PLACEMENT_OPTIONS.map((placement) => <option key={placement} value={placement}>{placement}</option>)}
                                            </Form.Select>
                                        </Form.Group>
                                        {form.placement === OTHER && (
                                            <Form.Group className="mt-2">
                                                <Form.Control value={form.customPlacement} onChange={set('customPlacement')} placeholder="Indique o local" />
                                            </Form.Group>
                                        )}
                                    </Col>
                                    <Col md={4}>
                                        <Form.Group>
                                            <Form.Label>Tamanho</Form.Label>
                                            <Form.Control value={form.size} onChange={set('size')} placeholder="ex.: 15 × 8 cm" />
                                        </Form.Group>
                                    </Col>
                                    <Col md={4}>
                                        <Form.Group>
                                            <Form.Label>Nº de sessões previstas</Form.Label>
                                            <Form.Select value={form.plannedSessions} onChange={set('plannedSessions')}>
                                                {Array.from({ length: 24 }, (_, index) => index + 1).map((number) => <option key={number} value={number}>{number}</option>)}
                                            </Form.Select>
                                        </Form.Group>
                                    </Col>
                                    <Col md={4}>
                                        <Form.Group>
                                            <Form.Label>Data da 1ª sessão <span className="text-danger">*</span></Form.Label>
                                            <Form.Control type="date" value={form.firstSessionDate} onChange={set('firstSessionDate')} required />
                                        </Form.Group>
                                    </Col>
                                    <Col md={12}>
                                        <Form.Group>
                                            <Form.Label>Datas das próximas sessões <span className="text-muted">(opcionais — pode marcar depois)</span></Form.Label>
                                            {extraDates.map((date, index) => (
                                                <div className="d-flex gap-2 mb-2" key={index}>
                                                    <Form.Control type="date" value={date} onChange={(event) => setExtraDates(extraDates.map((value, i) => (i === index ? event.target.value : value)))} />
                                                    <Button variant="outline-danger" onClick={() => setExtraDates(extraDates.filter((_, i) => i !== index))}><X size={16} /></Button>
                                                </div>
                                            ))}
                                            {extraDates.length < MAX_EXTRA_DATES && (
                                                <Button size="sm" variant="outline-secondary" className="d-inline-flex align-items-center gap-1" onClick={() => setExtraDates([...extraDates, ''])}>
                                                    <PlusCircle size={15} />Adicionar data de sessão
                                                </Button>
                                            )}
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group>
                                            <Form.Label>Valor total (€)</Form.Label>
                                            <Form.Control type="number" min="0" step="0.01" value={form.amount} onChange={set('amount')} placeholder="0.00" />
                                            <Form.Text className="text-muted">Preenchido → lançado nos Ganhos na data da 1ª sessão.</Form.Text>
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group>
                                            <Form.Label>Método de pagamento</Form.Label>
                                            <Form.Select value={form.paymentMethod} onChange={set('paymentMethod')}>
                                                {['Dinheiro', 'MB WAY', 'Multibanco', 'Cartão'].map((method) => <option key={method}>{method}</option>)}
                                            </Form.Select>
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group>
                                            <Form.Label>Estado da 1ª sessão</Form.Label>
                                            <Form.Select value={form.firstSessionStatus} onChange={set('firstSessionStatus')}>
                                                <option value="IN_PROGRESS">Em progresso</option>
                                                <option value="COMPLETED">Concluída</option>
                                            </Form.Select>
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group>
                                            <Form.Label>Foto do primeiro esboço <span className="text-muted">(opcional)</span></Form.Label>
                                            <div>
                                                <label className="btn btn-outline-primary d-inline-flex align-items-center gap-2">
                                                    {compressing ? <span className="spinner-border spinner-border-sm" role="status" /> : <ImagePlus size={16} />}
                                                    {compressing ? 'A processar...' : draftPhoto ? 'Substituir esboço' : 'Escolher imagem'}
                                                    <input type="file" accept="image/*" hidden onChange={pickDraft} />
                                                </label>
                                                <Form.Text className="d-block text-muted">Comprimida automaticamente.</Form.Text>
                                            </div>
                                            {draftPhoto && <img src={draftPhoto} alt="Esboço" className="img-fluid rounded-3 border mt-2" style={{ maxHeight: 110 }} />}
                                        </Form.Group>
                                    </Col>
                                    <Col md={12}>
                                        <Form.Group>
                                            <Form.Label>Notas da 1ª sessão</Form.Label>
                                            <Form.Control as="textarea" rows={2} value={form.sessionNotes} onChange={set('sessionNotes')} placeholder="O que foi feito, reação da pele, próximos passos..." />
                                        </Form.Group>
                                    </Col>
                                    {isAdmin && staff.length > 0 && (
                                        <Col md={6}>
                                            <Form.Group>
                                                <Form.Label>Profissional que realizou <span className="text-muted">(para os Ganhos)</span></Form.Label>
                                                <Form.Select value={form.staffId} onChange={set('staffId')}>
                                                    <option value="">— Artista por defeito —</option>
                                                    {staff.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
                                                </Form.Select>
                                            </Form.Group>
                                        </Col>
                                    )}
                                </Row>
                                <div className="d-flex justify-content-end gap-2 mt-4">
                                    <Button type="submit" className="rounded-pill px-4 d-inline-flex align-items-center gap-2" disabled={saving || compressing || !client}>
                                        {saving ? <><span className="spinner-border spinner-border-sm" />A registar...</> : <><CalendarPlus size={17} />Registar tatuagem</>}
                                    </Button>
                                </div>
                            </Form>
                        </Card.Body>
                    </Card>
                </Col>
                <Col xl={3}>
                    <Card className="border-0 shadow-sm rounded-4 mb-4">
                        <Card.Body className="p-4">
                            <h3 className="h6 fw-bold mb-2"><Search size={15} className="me-1" />Como funciona</h3>
                            <ul className="small text-muted mb-0 d-flex flex-column gap-2 list-unstyled">
                                <li><strong className="text-dark">1.</strong> Cliente escolhido do CRM — novos clientes criam-se só em Clientes → CRM.</li>
                                <li><strong className="text-dark">2.</strong> O registo cria o projeto na ficha do cliente: sessões, datas e esboço.</li>
                                <li><strong className="text-dark">3.</strong> Com valor € preenchido, o total é lançado automaticamente nos Ganhos (na data da 1ª sessão), com o método de pagamento e o profissional.</li>
                                <li><strong className="text-dark">4.</strong> Fotos de progresso e final podem ser adicionadas depois no projeto.</li>
                            </ul>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default ServiceRegister;
