import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import api from '../lib/api';
import { useNavigate, Link } from 'react-router-dom';
import { Container, Card, Form, Button, Alert } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

const Login: React.FC = () => {
    const { t } = useTranslation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuthStore();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            const response = await api.post('/auth/login', { email, password });
            login(response.data.user, response.data.access_token);
            navigate('/dashboard');
        } catch (error: any) {
            console.error('Registration failed', error);
            if (!error.response) {
                setError('Connection error. Is the backend server running?');
            } else {
                setError(t('registration_failed_msg'));
            }
        }
    };

    return (
        <Container className="d-flex align-items-center justify-content-center min-vh-100 bg-light">
            <Card className="shadow-lg p-4 rounded-4" style={{ maxWidth: '400px', width: '100%' }}>
                <Card.Body>
                    <h3 className="text-center mb-4 fw-bold text-primary">{t('sign_in')}</h3>
                    {error && <Alert variant="danger">{error}</Alert>}
                    <Form onSubmit={handleSubmit}>
                        <Form.Group className="mb-3" controlId="formBasicEmail">
                            <Form.Label>{t('email_address')}</Form.Label>
                            <Form.Control
                                type="email"
                                placeholder={t('enter_email')}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="py-2"
                            />
                        </Form.Group>

                        <Form.Group className="mb-4" controlId="formBasicPassword">
                            <Form.Label>{t('password')}</Form.Label>
                            <Form.Control
                                type="password"
                                placeholder={t('password')}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="py-2"
                            />
                        </Form.Group>

                        <Button variant="primary" type="submit" className="w-100 py-2 fw-semibold mb-3">
                            {t('login_btn')}
                        </Button>

                        <div className="text-center mb-3">
                            <span className="text-muted small">{t('or_continue_with')}</span>
                        </div>

                        <div className="d-grid gap-2 mb-4">
                            <Button variant="outline-dark" className="d-flex align-items-center justify-content-center gap-2 py-2 rounded-3 border-secondary border-opacity-25" onClick={() => navigate('/register-service')}>
                                <img src="https://www.google.com/favicon.ico" width="16" height="16" alt="Google" />
                                {t('google')}
                            </Button>
                            <Button variant="outline-dark" className="d-flex align-items-center justify-content-center gap-2 py-2 rounded-3 border-secondary border-opacity-25" onClick={() => navigate('/register-service')}>
                                <img src="https://www.apple.com/favicon.ico" width="16" height="16" alt="Apple" />
                                {t('apple')}
                            </Button>
                        </div>

                        <div className="text-center small">
                            {t('dont_have_account')}{' '}
                            <Link to="/register" className="text-primary fw-bold text-decoration-none">
                                {t('register')}
                            </Link>
                        </div>
                    </Form>
                </Card.Body>
            </Card>
        </Container>
    );
};

export default Login;
