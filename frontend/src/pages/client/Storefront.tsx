import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Button, Form, Spinner, Badge, InputGroup, Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import api from '../../lib/api';
import { ShoppingCart, Search, Plus, Minus, Check } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

const Storefront: React.FC = () => {
    const { t, i18n } = useTranslation();
    const { user } = useAuthStore();
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [cart, setCart] = useState<any[]>([]);
    const [showCart, setShowCart] = useState(false);
    const [showCheckout, setShowCheckout] = useState(false);
    const [orderSuccess, setOrderSuccess] = useState(false);
    const [settings, setSettings] = useState<any>(null);

    // Guest Info State
    const [guestInfo, setGuestInfo] = useState({ name: '', email: '', phone: '' });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [productsRes, settingsRes] = await Promise.all([
                    api.get('/products'),
                    api.get('/settings')
                ]);
                setProducts(productsRes.data);
                setSettings(settingsRes.data);
            } catch (error) {
                console.error('Error fetching storefront data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const addToCart = (product: any) => {
        const existing = cart.find(item => item.id === product.id);
        if (existing) {
            setCart(cart.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
        } else {
            setCart([...cart, { ...product, quantity: 1 }]);
        }
    };

    const removeFromCart = (productId: string) => {
        setCart(cart.filter(item => item.id !== productId));
    };

    const updateQuantity = (productId: string, delta: number) => {
        setCart(cart.map(item => {
            if (item.id === productId) {
                const newQty = Math.max(1, item.quantity + delta);
                return { ...item, quantity: newQty };
            }
            return item;
        }));
    };

    const cartTotal = cart.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0);

    const handleCheckout = async () => {
        try {
            let clientId = user?.id;

            if (!clientId) {
                // Create or find guest client
                const res = await api.post('/clients', {
                    name: guestInfo.name,
                    email: guestInfo.email,
                    phone: guestInfo.phone,
                    notes: 'Guest Online Order'
                });
                clientId = res.data.id;
            }

            await api.post('/sales', {
                clientId: clientId,
                total: cartTotal,
                items: cart.map(item => ({
                    productId: item.id,
                    quantity: item.quantity,
                    price: Number(item.price)
                }))
            });
            setCart([]);
            setShowCart(false);
            setShowCheckout(false);
            setOrderSuccess(true);
            setTimeout(() => setOrderSuccess(false), 5000);
        } catch (error) {
            console.error('Checkout failed:', error);
            alert('Checkout failed. Please try again.');
        }
    };

    const getLocalizedName = (product: any) => {
        const lang = i18n.language;
        if (lang === 'en' && product.name_en) return product.name_en;
        if (lang === 'pt' && product.name_pt) return product.name_pt;
        if (lang === 'uk' && product.name_uk) return product.name_uk;
        return product.name;
    };

    const getLocalizedDescription = (product: any) => {
        const lang = i18n.language;
        if (lang === 'en' && product.description_en) return product.description_en;
        if (lang === 'pt' && product.description_pt) return product.description_pt;
        if (lang === 'uk' && product.description_uk) return product.description_uk;
        return product.description || '';
    };

    const filteredProducts = products.filter(p => {
        const localizedName = getLocalizedName(p);
        const localizedDesc = getLocalizedDescription(p);
        return localizedName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            localizedDesc.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.category && p.category.toLowerCase().includes(searchTerm.toLowerCase()));
    });

    if (loading) return <div className="text-center py-5"><Spinner animation="border" /></div>;

    return (
        <Container className="py-2">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h1 className="h3 fw-bold mb-0">{t('shop')}</h1>
                <Button variant="outline-primary" className="position-relative d-flex align-items-center gap-2 rounded-pill px-4" onClick={() => setShowCart(true)}>
                    <ShoppingCart size={20} />
                    <span>{t('cart')}</span>
                    {cart.length > 0 && (
                        <Badge bg="danger" pill className="position-absolute top-0 start-100 translate-middle">
                            {cart.length}
                        </Badge>
                    )}
                </Button>
            </div>

            {settings && settings.business_address && (
                <Card className="border-0 shadow-sm rounded-4 mb-4 bg-primary bg-opacity-10">
                    <Card.Body className="p-3 d-flex justify-content-between align-items-center">
                        <div>
                            <span className="fw-bold text-primary d-block small text-uppercase">{t('our_location')}</span>
                            <p className="mb-0 text-dark fw-medium">{settings.business_address}</p>
                        </div>
                        {settings.business_google_maps && (
                            <Button
                                variant="primary"
                                size="sm"
                                className="rounded-pill px-4 fw-bold"
                                onClick={() => window.open(settings.business_google_maps, '_blank')}
                            >
                                {t('get_directions')}
                            </Button>
                        )}
                    </Card.Body>
                </Card>
            )}

            {orderSuccess && (
                <Card className="bg-success text-white border-0 rounded-4 mb-4 shadow-sm animate__animated animate__fadeIn">
                    <Card.Body className="d-flex align-items-center gap-3">
                        <Check size={24} />
                        <h6 className="mb-0">{t('order_placed_success')} {user ? t('check_my_orders') : t('we_will_contact_shortly')}</h6>
                    </Card.Body>
                </Card>
            )}

            <Card className="border-0 shadow-sm rounded-4 mb-4">
                <Card.Body className="p-3">
                    <Row className="g-3">
                        <Col md={12}>
                            <InputGroup>
                                <InputGroup.Text className="bg-transparent border-end-0">
                                    <Search size={18} className="text-muted" />
                                </InputGroup.Text>
                                <Form.Control
                                    placeholder={t('search_products')}
                                    className="border-start-0 py-2"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </InputGroup>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            <Row className="g-4">
                {filteredProducts.map((product) => (
                    <Col key={product.id} xs={6} md={4} lg={3}>
                        <Card className="h-100 border-0 shadow-sm rounded-4 transition-all">
                            <div className="bg-light p-4 rounded-top-4 text-center">
                                <img src={`https://placehold.co/200x200?text=${encodeURIComponent(product.name)}`} alt={product.name} className="img-fluid rounded-3" style={{ maxHeight: '120px' }} />
                                {product.category && <Badge bg="secondary" className="position-absolute top-0 end-0 m-2 opacity-75">{product.category}</Badge>}
                            </div>
                            <Card.Body className="p-3 d-flex flex-column">
                                <h6 className="fw-bold mb-1 text-truncate">{getLocalizedName(product)}</h6>
                                <p className="small text-muted mb-3 flex-grow-1 text-truncate" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', whiteSpace: 'normal' }}>{getLocalizedDescription(product) || t('no_description')}</p>
                                <div className="d-flex justify-content-between align-items-center mt-auto">
                                    <span className="fw-bold text-primary">€{Number(product.price).toFixed(2)}</span>
                                    <Button variant="primary" size="sm" className="rounded-circle p-2" onClick={() => addToCart(product)}>
                                        <Plus size={18} />
                                    </Button>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                ))}
            </Row>

            {/* Shopping Cart Modal */}
            <Modal show={showCart} onHide={() => setShowCart(false)} centered size="lg">
                <Modal.Header closeButton className="border-0 p-4 pb-0">
                    <Modal.Title className="fw-bold">{t('your_cart')}</Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4">
                    {cart.length === 0 ? (
                        <div className="text-center py-5">
                            <ShoppingCart size={48} className="text-muted mb-3 opacity-25" />
                            <p className="text-muted">{t('cart_empty')}</p>
                        </div>
                    ) : (
                        <>
                            <div className="d-flex flex-column gap-3 mb-4 max-vh-50 overflow-auto px-1">
                                {cart.map((item) => (
                                    <div key={item.id} className="d-flex align-items-center gap-3 p-2 bg-light rounded-3">
                                        <div className="flex-grow-1">
                                            <h6 className="fw-bold mb-0 small">{getLocalizedName(item)}</h6>
                                            <small className="text-muted">€{Number(item.price).toFixed(2)}</small>
                                        </div>
                                        <div className="d-flex align-items-center gap-2 bg-white rounded-pill px-2 py-1 border shadow-sm">
                                            <Button variant="link" size="sm" className="p-0 text-dark" onClick={() => updateQuantity(item.id, -1)}><Minus size={12} /></Button>
                                            <span className="small fw-bold px-1">{item.quantity}</span>
                                            <Button variant="link" size="sm" className="p-0 text-dark" onClick={() => updateQuantity(item.id, 1)}><Plus size={12} /></Button>
                                        </div>
                                        <div className="text-end" style={{ minWidth: '60px' }}>
                                            <span className="fw-bold small">€{(item.price * item.quantity).toFixed(2)}</span>
                                        </div>
                                        <Button variant="link" size="sm" className="text-danger p-0 ms-1" onClick={() => removeFromCart(item.id)}>×</Button>
                                    </div>
                                ))}
                            </div>
                            <div className="bg-light p-4 rounded-4">
                                <div className="d-flex justify-content-between mb-4">
                                    <h5 className="mb-0 fw-bold">{t('total')}</h5>
                                    <h5 className="mb-0 fw-bold text-primary">€{cartTotal.toFixed(2)}</h5>
                                </div>
                                <Button variant="primary" size="lg" className="w-100 py-3 fw-bold rounded-pill shadow-sm" onClick={() => { setShowCart(false); setShowCheckout(true); }}>
                                    {t('proceed_to_checkout')}
                                </Button>
                            </div>
                        </>
                    )}
                </Modal.Body>
            </Modal>

            {/* Checkout Modal */}
            <Modal show={showCheckout} onHide={() => setShowCheckout(false)} centered>
                <Modal.Header closeButton className="border-0 p-4 pb-0">
                    <Modal.Title className="fw-bold">{t('checkout')}</Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4">
                    {user ? (
                        <div className="text-center py-4">
                            <p className="mb-4 fs-5">{t('confirm_order_of', { total: '€' + cartTotal.toFixed(2) })}</p>
                            <Button variant="primary" size="lg" className="w-100 py-3 rounded-pill fw-bold" onClick={handleCheckout}>
                                {t('confirm_order')}
                            </Button>
                        </div>
                    ) : (
                        <Form>
                            <p className="text-muted mb-4 small">{t('provide_details_order')}</p>
                            <Form.Group className="mb-3">
                                <Form.Label className="small fw-bold text-muted text-uppercase">{t('name')}</Form.Label>
                                <Form.Control value={guestInfo.name} onChange={e => setGuestInfo({ ...guestInfo, name: e.target.value })} placeholder={t('full_name')} className="rounded-3 py-2" />
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label className="small fw-bold text-muted text-uppercase">{t('email')}</Form.Label>
                                <Form.Control value={guestInfo.email} onChange={e => setGuestInfo({ ...guestInfo, email: e.target.value })} type="email" placeholder={t('email_address')} className="rounded-3 py-2" />
                            </Form.Group>
                            <Form.Group className="mb-4">
                                <Form.Label className="small fw-bold text-muted text-uppercase">{t('phone')}</Form.Label>
                                <Form.Control value={guestInfo.phone} onChange={e => setGuestInfo({ ...guestInfo, phone: e.target.value })} placeholder={t('phone_number')} className="rounded-3 py-2" />
                            </Form.Group>
                            <Button variant="primary" size="lg" className="w-100 py-3 rounded-pill fw-bold" disabled={!guestInfo.name || !guestInfo.email || !guestInfo.phone} onClick={handleCheckout}>
                                {t('confirm_order')} (€{cartTotal.toFixed(2)})
                            </Button>
                        </Form>
                    )}
                </Modal.Body>
            </Modal>

            <style>{`
                .shadow-hover:hover {
                    box-shadow: 0 10px 25px rgba(0,0,0,0.1) !important;
                    transform: translateY(-5px);
                }
                .transition-all { transition: all 0.3s ease-in-out; }
            `}</style>
        </Container>
    );
};

export default Storefront;
