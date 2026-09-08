import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { Plus, Mail, User, MoreVertical, Check } from 'lucide-react';
import { Card, Button, Modal, Form, Row, Col, Spinner, Dropdown, Badge } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

interface Staff {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    staffProfile?: {
        bio: string;
    };
}

const AVATARS = [
    'https://api.dicebear.com/7.x/bottts/svg?seed=Staff1&backgroundColor=ffffff',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Staff2&backgroundColor=ffffff',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Staff3&backgroundColor=ffffff',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Staff4&backgroundColor=ffffff',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Staff5&backgroundColor=ffffff',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Staff6&backgroundColor=ffffff',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Staff7&backgroundColor=ffffff',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Staff8&backgroundColor=ffffff',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Staff9&backgroundColor=ffffff',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Staff10&backgroundColor=ffffff',
];

const StaffPage: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
    const { t } = useTranslation();
    const [staffList, setStaffList] = useState<Staff[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
    const [formData, setFormData] = useState({ name: '', email: '', bio: '', avatar: AVATARS[0], password: '' });

    useEffect(() => {
        fetchStaff();
    }, []);

    const fetchStaff = async () => {
        try {
            const response = await api.get('/staff');
            setStaffList(response.data);
        } catch (error) {
            console.error('Error fetching staff:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenCreate = () => {
        setEditingStaff(null);
        setFormData({ name: '', email: '', bio: '', avatar: AVATARS[0], password: '' });
        setShowModal(true);
    };

    const handleOpenEdit = (staff: Staff) => {
        setEditingStaff(staff);
        setFormData({
            name: staff.name,
            email: staff.email,
            bio: staff.staffProfile?.bio || '',
            avatar: staff.avatar || AVATARS[0],
            password: ''
        });
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload: any = { name: formData.name, email: formData.email, bio: formData.bio, avatar: formData.avatar };
            if (formData.password) {
                payload.password = formData.password;
            }
            if (editingStaff) {
                await api.patch(`/staff/${editingStaff.id}`, payload);
            } else {
                await api.post('/staff', payload);
            }
            setShowModal(false);
            fetchStaff();
        } catch (error: any) {
            console.error('Error saving staff:', error);
            alert(error?.response?.data?.message || 'Failed to save staff');
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Delete this staff member? Their appointments and service records will also be removed.')) return;
        try {
            await api.delete(`/staff/${id}`);
            fetchStaff();
        } catch (error) {
            console.error('Error deleting staff:', error);
            alert('Failed to delete staff');
        }
    };

    return (
        <div className={embedded ? '' : 'py-4'}>
            {!embedded && <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h1 className="h3 mb-1 fw-bold text-dark">{t('team_members')}</h1>
                    <p className="text-secondary mb-0">{t('manage_staff_desc')}</p>
                </div>
                <Button
                    variant="primary"
                    onClick={handleOpenCreate}
                    className="d-flex align-items-center gap-2 px-4 py-2 rounded-3 shadow-sm"
                >
                    <Plus size={20} />
                    {t('add')} {t('staff')}
                </Button>
            </div>}
            {embedded && <div className="d-flex justify-content-end mb-3">
                <Button variant="primary" size="sm" className="rounded-pill px-3 d-inline-flex align-items-center gap-1" onClick={handleOpenCreate}>
                    <Plus size={16} />{t('add')} {t('staff')}
                </Button>
            </div>}

            <Row className="g-4">
                {loading ? (
                    <div className="col-12 text-center py-5">
                        <Spinner animation="border" variant="primary" />
                        <p className="mt-2 text-muted">{t('loading_team')}</p>
                    </div>
                ) : (
                    staffList.map((staff) => (
                        <Col key={staff.id} xs={12} md={6} lg={4}>
                            <Card className="h-100 border-0 shadow-sm rounded-4 overflow-hidden staff-card">
                                <Card.Body className="p-4">
                                    <div className="d-flex justify-content-between align-items-start mb-3">
                                        <div className="rounded-circle overflow-hidden border border-2 border-primary border-opacity-25" style={{ width: '64px', height: '64px' }}>
                                            {staff.avatar ? (
                                                <img src={staff.avatar} alt={staff.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <div className="bg-primary bg-opacity-10 w-100 h-100 d-flex align-items-center justify-content-center text-primary fw-bold" style={{ fontSize: '1.5rem' }}>
                                                    {staff.name.charAt(0)}
                                                </div>
                                            )}
                                        </div>
                                        <Dropdown align="end">
                                            <Dropdown.Toggle as="button" className="btn btn-link text-muted p-0 border-0 shadow-none">
                                                <MoreVertical size={20} />
                                            </Dropdown.Toggle>
                                            <Dropdown.Menu className="shadow-sm border-0">
                                                <Dropdown.Item onClick={() => handleOpenEdit(staff)}>{t('edit')}</Dropdown.Item>
                                                <Dropdown.Divider />
                                                <Dropdown.Item onClick={() => handleDelete(staff.id)} className="text-danger">{t('delete')}</Dropdown.Item>
                                            </Dropdown.Menu>
                                        </Dropdown>
                                    </div>
                                    <h5 className="fw-bold text-dark mb-1">{staff.name}</h5>
                                    <div className="text-muted small d-flex align-items-center gap-2 mb-3">
                                        <Mail size={14} /> {staff.email}
                                    </div>
                                    <p className="text-secondary small mb-4 line-clamp-3" style={{ minHeight: '3.6em' }}>
                                        {staff.staffProfile?.bio || t('no_bio')}
                                    </p>
                                    <div className="pt-3 border-top d-flex justify-content-between align-items-center">
                                        <Badge bg="success-subtle" text="success" className="px-2 py-1 rounded-pill fw-normal border border-success-subtle">
                                            {t('active')}
                                        </Badge>
                                        <Button variant="link" className="text-primary text-decoration-none p-0 small fw-bold" onClick={() => handleOpenEdit(staff)}>
                                            {t('edit')}
                                        </Button>
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>
                    ))
                )}
                {!loading && staffList.length === 0 && (
                    <Col xs={12}>
                        <div className="text-center py-5 bg-white rounded-4 shadow-sm border">
                            <User size={48} className="text-muted mb-3 opacity-25" />
                            <h5>{t('no_conversations_found')}</h5>
                            <p className="text-muted">{t('build_team_msg')}</p>
                        </div>
                    </Col>
                )}
            </Row>

            <Modal show={showModal} onHide={() => setShowModal(false)} centered size="lg" className="rounded-4">
                <Modal.Header closeButton className="border-bottom-0 pb-0 px-4 pt-4">
                    <Modal.Title className="fw-bold">{editingStaff ? t('edit') : t('add')} {t('staff')}</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleSubmit}>
                    <Modal.Body className="p-4">
                        <Row>
                            <Col md={12} className="mb-4">
                                <Form.Label className="small fw-bold text-secondary text-uppercase mb-3">{t('choose_avatar')}</Form.Label>
                                <div className="d-flex flex-wrap gap-3 justify-content-start">
                                    {AVATARS.map((url, idx) => (
                                        <div
                                            key={idx}
                                            onClick={() => setFormData({ ...formData, avatar: url })}
                                            className={`rounded-circle p-1 cursor-pointer transition-all border-2 border ${formData.avatar === url ? 'border-primary shadow' : 'border-transparent'}`}
                                            style={{ cursor: 'pointer', width: '60px', height: '60px' }}
                                        >
                                            <div className="position-relative w-100 h-100 rounded-circle overflow-hidden">
                                                <img src={url} alt={`Avatar ${idx + 1}`} className="w-100 h-100" />
                                                {formData.avatar === url && (
                                                    <div className="position-absolute top-0 start-0 w-100 h-100 bg-primary bg-opacity-25 d-flex align-items-center justify-content-center">
                                                        <Check size={20} className="text-white fw-bold" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="small fw-bold text-secondary">{t('name')}</Form.Label>
                                    <Form.Control
                                        type="text"
                                        placeholder={t('full_name')}
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="py-2 rounded-3"
                                    />
                                </Form.Group>
                                <Form.Group className="mb-3">
                                    <Form.Label className="small fw-bold text-secondary">{t('email')}</Form.Label>
                                    <Form.Control
                                        type="email"
                                        placeholder={t('email_address')}
                                        required
                                        disabled={!!editingStaff}
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="py-2 rounded-3"
                                    />
                                </Form.Group>
                                <Form.Group className="mb-3">
                                    <Form.Label className="small fw-bold text-secondary">{t('password')}</Form.Label>
                                    <Form.Control
                                        type="password"
                                        placeholder={editingStaff ? '•••••••• (deixar vazio para manter)' : t('password')}
                                        required={!editingStaff}
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="py-2 rounded-3"
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="small fw-bold text-secondary">{t('bio')}</Form.Label>
                                    <Form.Control
                                        as="textarea"
                                        rows={5}
                                        placeholder={t('professional_bio')}
                                        value={formData.bio}
                                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                        className="py-2 rounded-3"
                                    />
                                </Form.Group>
                            </Col>
                        </Row>
                    </Modal.Body>
                    <Modal.Footer className="border-top-0 p-4">
                        <Button variant="light" onClick={() => setShowModal(false)} className="px-4 rounded-3">
                            {t('cancel')}
                        </Button>
                        <Button variant="primary" type="submit" className="px-4 fw-semibold rounded-3">
                            {t('save')} {t('staff')}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            <style>{`
                .staff-card { transition: transform 0.2s; }
                .staff-card:hover { transform: translateY(-4px); }
                .line-clamp-3 {
                    display: -webkit-box;
                    -webkit-line-clamp: 3;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }
                .cursor-pointer { cursor: pointer; }
                .transition-all { transition: all 0.2s ease-in-out; }
            `}</style>
        </div>
    );
};

export default StaffPage;
