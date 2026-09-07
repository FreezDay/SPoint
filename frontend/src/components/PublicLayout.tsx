import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Navbar, Nav, Container, NavDropdown } from 'react-bootstrap';
import { Globe, LogIn } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';

const PublicLayout: React.FC = () => {
    const { t, i18n } = useTranslation();
    const [settings, setSettings] = React.useState<any>(null);
    const [expanded, setExpanded] = React.useState(false);

    React.useEffect(() => {
        const fetchSettings = async () => {
            try {
                // Actually PublicLayout doesn't have 'api' imported yet, but App.tsx does.
                // However, I see api imported in Layout.tsx. I should import it here too.
                const res = await api.get('/settings');
                setSettings(res.data);
            } catch (error) {
                console.error('Error fetching settings:', error);
            }
        };
        fetchSettings();
    }, []);

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
    };

    const closeMenu = () => setExpanded(false);

    return (
        <div className="d-flex flex-column min-vh-100 bg-light">
            {/* Simple Top Navbar */}
            <Navbar bg="white" expand="lg" expanded={expanded} onToggle={(nextExpanded) => setExpanded(nextExpanded)} className="border-bottom shadow-sm py-3 px-4">
                <Container>
                    <Navbar.Brand as={Link} to="/" onClick={closeMenu} className="fw-bold text-primary fs-4">
                        {settings?.business_name || t('business_name')}
                    </Navbar.Brand>
                    <Navbar.Toggle aria-controls="public-navbar-nav" />
                    <Navbar.Collapse id="public-navbar-nav" className="justify-content-end">
                        <Nav className="align-items-center">
                            <Nav.Link as={Link} to="/book-online" onClick={closeMenu} className="me-3 fw-semibold text-dark">
                                {t('book_online')}
                            </Nav.Link>
                            <Nav.Link as={Link} to="/shop" onClick={closeMenu} className="me-3 fw-semibold text-dark">
                                {t('shop')}
                            </Nav.Link>
                            <NavDropdown
                                title={(
                                    <div className="d-inline-flex align-items-center gap-2">
                                        <Globe size={18} />
                                        <span>{i18n.language.toUpperCase()}</span>
                                    </div>
                                )}
                                id="language-dropdown-public"
                                className="me-3"
                            >
                                <NavDropdown.Item onClick={() => changeLanguage('en')}>English</NavDropdown.Item>
                                <NavDropdown.Item onClick={() => changeLanguage('pt')}>Português</NavDropdown.Item>
                                <NavDropdown.Item onClick={() => changeLanguage('uk')}>Українська</NavDropdown.Item>
                            </NavDropdown>
                            <Link to="/login" onClick={closeMenu} className="btn btn-primary btn-sm d-flex align-items-center gap-2 px-4 py-2 rounded-pill fw-bold">
                                <LogIn size={16} /> {t('login_btn')}
                            </Link>
                        </Nav>
                    </Navbar.Collapse>
                </Container>
            </Navbar>

            {/* Main Content Area */}
            <main className="flex-grow-1 py-5">
                <Container>
                    <Outlet />
                </Container>
            </main>

            {/* Simple Footer */}
            <footer className="bg-white border-top py-4 mt-auto">
                <Container className="text-center text-muted small">
                    <p className="mb-0">{t('designed_by')} <span className="fw-bold text-primary">ServApp</span></p>
                </Container>
            </footer>
        </div>
    );
};

export default PublicLayout;
