import React from 'react';
import { Alert, Button, Col, Form, Modal, Row } from 'react-bootstrap';
import { TATTOO_SERVICE_OPTIONS } from '../../lib/tattoo';
import { PLACEMENT_OPTIONS } from './crmShared';
import api from '../../lib/api';
import type { TattooProject } from './crmShared';

type Props = {
    show: boolean;
    onHide: () => void;
    project: TattooProject | null;
    onSaved: (project: TattooProject) => void;
};

const OTHER = 'Outro';

const EditProjectModal: React.FC<Props> = ({ show, onHide, project, onSaved }) => {
    const [form, setForm] = React.useState({
        serviceName: '',
        customService: '',
        description: '',
        placement: '',
        customPlacement: '',
        size: '',
        cost: '',
        plannedSessions: '1',
    });
    const [saving, setSaving] = React.useState(false);
    const [error, setError] = React.useState('');

    React.useEffect(() => {
        if (show && project) {
            setError('');
            const serviceName = TATTOO_SERVICE_OPTIONS.includes(project.serviceName || '') ? project.serviceName || '' : '';
            const placement = PLACEMENT_OPTIONS.includes(project.placement || '') ? project.placement || '' : '';
            setForm({
                serviceName,
                customService: serviceName ? '' : project.serviceName || '',
                description: project.description || '',
                placement,
                customPlacement: placement ? '' : project.placement || '',
                size: project.size || '',
                cost: project.cost !== null && project.cost !== undefined ? String(project.cost) : '',
                plannedSessions: String(project.plannedSessions),
            });
        }
    }, [show, project]);

    const set = (field: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
        setForm({ ...form, [field]: event.target.value });

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!project) return;
        setSaving(true);
        setError('');
        try {
            const service = form.serviceName === OTHER ? form.customService.trim() : form.serviceName;
            const placement = form.placement === OTHER ? form.customPlacement.trim() : form.placement;
            const response = await api.patch(`/crm/projects/${project.id}`, {
                serviceName: service || null,
                description: form.description.trim() || null,
                placement: placement || null,
                size: form.size.trim() || null,
                cost: form.cost !== '' ? Number(form.cost) : null,
                plannedSessions: Number(form.plannedSessions),
            });
            onSaved(response.data);
            onHide();
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Não foi possível guardar o projeto.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal show={show} onHide={onHide} size="lg" centered>
            <Form onSubmit={handleSubmit}>
                <Modal.Header closeButton>
                    <Modal.Title>Editar tatuagem</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {error && <Alert variant="danger" className="py-2">{error}</Alert>}
                    <Row className="g-3">
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Serviço / tipo de tatuagem <span className="text-muted">(opcional)</span></Form.Label>
                                <Form.Select value={form.serviceName} onChange={set('serviceName')}>
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
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>Tamanho</Form.Label>
                                <Form.Control value={form.size} onChange={set('size')} placeholder="ex.: 15 × 8 cm" />
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>Custo total (€)</Form.Label>
                                <Form.Control type="number" min="0" step="0.01" value={form.cost} onChange={set('cost')} />
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
                        <Col md={12}>
                            <Form.Group>
                                <Form.Label>Texto sobre a tatuagem</Form.Label>
                                <Form.Control as="textarea" rows={4} value={form.description} onChange={set('description')} placeholder="Descrição do desenho, ideias, estilo, cores..." />
                            </Form.Group>
                        </Col>
                    </Row>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="light" onClick={onHide}>Cancelar</Button>
                    <Button type="submit" disabled={saving}>{saving ? 'A guardar...' : 'Guardar'}</Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
};

export default EditProjectModal;
