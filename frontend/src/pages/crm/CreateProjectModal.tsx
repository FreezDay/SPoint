import React from 'react';
import { Alert, Button, Col, Form, Modal, Row } from 'react-bootstrap';
import { ImagePlus } from 'lucide-react';
import api from '../../lib/api';
import { compressImageFile } from '../../lib/image';
import { useAuthStore } from '../../store/useAuthStore';
import { PLACEMENT_OPTIONS } from './crmShared';
import { TATTOO_SERVICE_OPTIONS, TATTOO_SERVICE_PRICES } from '../../lib/tattoo';
import type { RegisterResult } from './crmShared';

type Props = {
    show: boolean;
    onHide: () => void;
    clientId: string;
    // Called with the registration summary. serviceRecordId is set when the
    // amount was posted to the earnings ledger (Ganhos).
    onSaved: (result: RegisterResult) => void;
};

const OTHER = 'Outro';
const today = () => new Date().toISOString().slice(0, 10);

const CreateProjectModal: React.FC<Props> = ({ show, onHide, clientId, onSaved }) => {
    const { user } = useAuthStore();
    const isAdmin = user?.role === 'ADMIN';
    const [staff, setStaff] = React.useState<{ id: string; name: string }[]>([]);
    const [form, setForm] = React.useState({
        serviceName: '',
        customService: '',
        description: '',
        placement: '',
        customPlacement: '',
        size: '',
        amount: '',
        paymentMethod: 'Dinheiro',
        plannedSessions: '1',
        firstSessionDate: today(),
        firstSessionStatus: 'IN_PROGRESS',
        sessionNotes: '',
        staffId: '',
    });
    const [draftPhoto, setDraftPhoto] = React.useState<string | null>(null);
    const [compressing, setCompressing] = React.useState(false);
    const [saving, setSaving] = React.useState(false);
    const [error, setError] = React.useState('');

    React.useEffect(() => {
        if (show && isAdmin) {
            api.get('/staff').then((response) => setStaff(response.data || [])).catch(() => setStaff([]));
        }
    }, [show, isAdmin]);

    React.useEffect(() => {
        if (show) {
            setError('');
            setDraftPhoto(null);
            setForm((current) => ({
                ...current,
                serviceName: '',
                customService: '',
                customPlacement: '',
                amount: '',
                paymentMethod: 'Dinheiro',
                plannedSessions: '1',
                firstSessionDate: today(),
                firstSessionStatus: 'IN_PROGRESS',
                sessionNotes: '',
                staffId: '',
            }));
        }
    }, [show]);

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
        setError('');
        try {
            setDraftPhoto(await compressImageFile(file));
        } catch (err: any) {
            setError(err?.message || 'Não foi possível processar a imagem.');
        } finally {
            setCompressing(false);
        }
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setSaving(true);
        setError('');
        try {
            const service = form.serviceName === OTHER ? form.customService.trim() : form.serviceName;
            const placement = form.placement === OTHER ? form.customPlacement.trim() : form.placement;
            const amount = form.amount !== '' && Number(form.amount) > 0 ? Number(form.amount) : null;
            const response = await api.post('/crm/register', {
                clientId,
                serviceName: service || null,
                description: form.description.trim() || null,
                placement: placement || null,
                size: form.size.trim() || null,
                amount,
                paymentMethod: amount !== null ? form.paymentMethod : null,
                plannedSessions: Number(form.plannedSessions),
                firstSessionDate: `${form.firstSessionDate}T12:00:00.000Z`,
                firstSessionStatus: form.firstSessionStatus,
                sessionNotes: form.sessionNotes.trim() || null,
                ...(draftPhoto ? { photos: [{ dataUrl: draftPhoto, kind: 'DRAFT' }] } : {}),
                ...(isAdmin && form.staffId ? { staffId: form.staffId } : {}),
            });
            onSaved(response.data as RegisterResult);
            onHide();
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Não foi possível registar a tatuagem.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal show={show} onHide={onHide} size="lg" centered>
            <Form onSubmit={handleSubmit}>
                <Modal.Header closeButton>
                    <Modal.Title>Registar nova tatuagem</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {error && <Alert variant="danger" className="py-2">{error}</Alert>}
                    <Row className="g-3">
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Serviço / tipo de tatuagem <span className="text-muted">(opcional)</span></Form.Label>
                                <Form.Select value={form.serviceName} onChange={pickService}>
                                    <option value="">— Selecionar —</option>
                                    {TATTOO_SERVICE_OPTIONS.map((service) => <option key={service} value={service}>{service}</option>)}
                                    <option value={OTHER}>{OTHER} (escrever)</option>
                                </Form.Select>
                            </Form.Group>
                            {form.serviceName === OTHER && (
                                <Form.Group className="mt-2">
                                    <Form.Control value={form.customService} onChange={set('customService')} placeholder="Nome do serviço" />
                                </Form.Group>
                            )}
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Local do corpo <span className="text-muted">(opcional)</span></Form.Label>
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
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label>Tamanho</Form.Label>
                                <Form.Control value={form.size} onChange={set('size')} placeholder="ex.: 15 × 8 cm" />
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label>Valor (€)</Form.Label>
                                <Form.Control type="number" min="0" step="0.01" value={form.amount} onChange={set('amount')} placeholder="0.00" />
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label>Método de pagamento</Form.Label>
                                <Form.Select value={form.paymentMethod} onChange={set('paymentMethod')}>
                                    {['Dinheiro', 'MB WAY', 'Multibanco', 'Cartão'].map((method) => <option key={method}>{method}</option>)}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label>Nº de sessões previstas</Form.Label>
                                <Form.Select value={form.plannedSessions} onChange={set('plannedSessions')}>
                                    {Array.from({ length: 24 }, (_, index) => index + 1).map((number) => <option key={number} value={number}>{number}</option>)}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        {isAdmin && staff.length > 0 && (
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label>Profissional que realizou <span className="text-muted">(para os Ganhos)</span></Form.Label>
                                    <Form.Select value={form.staffId} onChange={set('staffId')}>
                                        <option value="">— Eu (admin) —</option>
                                        {staff.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                        )}
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Data da 1ª sessão <span className="text-danger">*</span></Form.Label>
                                <Form.Control type="date" value={form.firstSessionDate} onChange={set('firstSessionDate')} required />
                                <Form.Text className="text-muted">O valor é lançado nos Ganhos nesta data.</Form.Text>
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
                                <Form.Label>Texto sobre a tatuagem <span className="text-muted">(opcional)</span></Form.Label>
                                <Form.Control as="textarea" rows={3} value={form.description} onChange={set('description')} placeholder="Descrição do desenho, ideias, estilo, cores..." />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Notas da 1ª sessão</Form.Label>
                                <Form.Control as="textarea" rows={3} value={form.sessionNotes} onChange={set('sessionNotes')} placeholder="O que foi feito, reação da pele, observações..." />
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
                                    <Form.Text className="d-block text-muted">A imagem é comprimida automaticamente.</Form.Text>
                                </div>
                                {draftPhoto && <img src={draftPhoto} alt="Esboço" className="img-fluid rounded-3 border mt-2" style={{ maxHeight: 120 }} />}
                            </Form.Group>
                        </Col>
                    </Row>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="light" onClick={onHide}>Cancelar</Button>
                    <Button type="submit" disabled={saving || compressing}>{saving ? 'A registar...' : 'Registar tatuagem'}</Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
};

export default CreateProjectModal;
