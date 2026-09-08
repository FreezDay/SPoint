import React from 'react';
import { Alert, Button, Col, Form, Modal, Row } from 'react-bootstrap';
import { Images, ImagePlus, Upload } from 'lucide-react';
import api from '../../lib/api';
import { compressImageFiles } from '../../lib/image';
import { PHOTO_KIND_LABEL } from './crmShared';
import type { PhotoKind, ProjectPhoto, TattooSession } from './crmShared';

type Props = {
    show: boolean;
    onHide: () => void;
    projectId: string;
    sessions: TattooSession[];
    onUploaded: (photos: ProjectPhoto[]) => void;
    presetSessionId?: string;
};

const KINDS: PhotoKind[] = ['DRAFT', 'PROGRESS', 'FINAL'];

const UploadPhotosModal: React.FC<Props> = ({ show, onHide, projectId, sessions, onUploaded, presetSessionId = '' }) => {
    const [kind, setKind] = React.useState<PhotoKind>('PROGRESS');
    const [sessionId, setSessionId] = React.useState('');
    const [previews, setPreviews] = React.useState<string[]>([]);
    const [processing, setProcessing] = React.useState(false);
    const [error, setError] = React.useState('');

    React.useEffect(() => {
        if (show) {
            setError('');
            setPreviews([]);
            setKind('PROGRESS');
            setSessionId(presetSessionId);
        }
    }, [show, presetSessionId]);

    const pickFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files || []);
        event.target.value = '';
        if (!files.length) return;
        setProcessing(true);
        setError('');
        try {
            const compressed = await compressImageFiles(files);
            setPreviews((current) => [...current, ...compressed]);
        } catch (err: any) {
            setError(err?.message || 'Não foi possível processar as imagens.');
        } finally {
            setProcessing(false);
        }
    };

    const removePreview = (index: number) => setPreviews((current) => current.filter((_, i) => i !== index));

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!previews.length) return;
        setProcessing(true);
        setError('');
        const uploaded: ProjectPhoto[] = [];
        try {
            for (const dataUrl of previews) {
                const response = await api.post(`/crm/projects/${projectId}/photos`, {
                    dataUrl,
                    kind,
                    sessionId: sessionId || undefined,
                });
                uploaded.push(response.data);
            }
            onUploaded(uploaded);
            onHide();
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Não foi possível carregar as fotos.');
            if (uploaded.length) onUploaded(uploaded);
        } finally {
            setProcessing(false);
        }
    };

    return (
        <Modal show={show} onHide={onHide} size="lg" centered>
            <Form onSubmit={handleSubmit}>
                <Modal.Header closeButton>
                    <Modal.Title><Images size={20} className="me-2" />Adicionar fotos ao projeto</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {error && <Alert variant="danger" className="py-2">{error}</Alert>}
                    <Row className="g-3">
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>Tipo de foto</Form.Label>
                                <Form.Select value={kind} onChange={(event) => setKind(event.target.value as PhotoKind)}>
                                    {KINDS.map((option) => <option key={option} value={option}>{PHOTO_KIND_LABEL[option]}</option>)}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={8}>
                            <Form.Group>
                                <Form.Label>Sessão relacionada <span className="text-muted">(opcional)</span></Form.Label>
                                <Form.Select value={sessionId} onChange={(event) => setSessionId(event.target.value)}>
                                    <option value="">— Nenhuma (foto geral do projeto) —</option>
                                    {sessions.map((session) => (
                                        <option key={session.id} value={session.id}>
                                            Sessão {session.sessionNumber}{session.date ? ` — ${new Date(session.date).toLocaleDateString('pt-PT')}` : ''}
                                        </option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={12}>
                            <label className="btn btn-outline-primary w-100 d-flex align-items-center justify-content-center gap-2 py-3 border-dashed">
                                {processing ? <span className="spinner-border spinner-border-sm" role="status" /> : <ImagePlus size={18} />}
                                {processing ? 'A comprimir imagens...' : 'Escolher imagens (várias permitidas)'}
                                <input type="file" accept="image/*" multiple hidden onChange={pickFiles} disabled={processing} />
                            </label>
                            <Form.Text className="text-muted">As imagens são comprimidas automaticamente antes de serem guardadas.</Form.Text>
                        </Col>
                        {previews.length > 0 && (
                            <Col md={12}>
                                <div className="d-flex flex-wrap gap-2">
                                    {previews.map((preview, index) => (
                                        <div key={index} className="position-relative">
                                            <img src={preview} alt={`Foto ${index + 1}`} style={{ width: 96, height: 96, objectFit: 'cover' }} className="rounded-3 border" />
                                            <button type="button" className="btn btn-danger btn-sm position-absolute top-0 end-0 rounded-circle p-0 d-flex align-items-center justify-content-center" style={{ width: 22, height: 22, transform: 'translate(30%, -30%)' }} onClick={() => removePreview(index)} title="Remover">×</button>
                                        </div>
                                    ))}
                                </div>
                            </Col>
                        )}
                    </Row>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="light" onClick={onHide}>Cancelar</Button>
                    <Button type="submit" disabled={!previews.length || processing} className="d-inline-flex align-items-center gap-2">
                        <Upload size={16} />{processing ? 'A carregar...' : `Carregar ${previews.length} ${previews.length === 1 ? 'foto' : 'fotos'}`}
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
};

export default UploadPhotosModal;
