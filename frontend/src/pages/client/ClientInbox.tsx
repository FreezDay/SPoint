import React, { useEffect, useState, useRef } from 'react';
import { Container, Card, Form, Button, Spinner, InputGroup } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { Send, MessageSquare } from 'lucide-react';
import api from '../../lib/api';
import { useAuthStore } from '../../store/useAuthStore';
import { format } from 'date-fns';

const ClientInbox: React.FC = () => {
    const { t } = useTranslation();
    const { user } = useAuthStore();
    const [messages, setMessages] = useState<any[]>([]);
    const [newMsg, setNewMsg] = useState('');
    const [loading, setLoading] = useState(true);
    const [contactLoading, setContactLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [adminContact, setAdminContact] = useState<{ id: string; name: string } | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        const init = async () => {
            await fetchContact();
            await fetchMessages();
        };
        init();
        const interval = setInterval(fetchMessages, 10000); // Poll every 10s
        return () => clearInterval(interval);
    }, []);

    const fetchContact = async () => {
        try {
            setContactLoading(true);
            const res = await api.get('/messages/contact');
            if (res.data) {
                setAdminContact(res.data);
            }
        } catch (error) {
            console.error('Error fetching contact:', error);
        } finally {
            setContactLoading(false);
        }
    };

    const fetchMessages = async () => {
        try {
            const res = await api.get('/messages');
            setMessages(res.data);

            // Mark as read if we have unread messages from admin
            if (res.data.some((m: any) => !m.read && m.senderId !== user?.id)) {
                const contact = res.data.find((m: any) => m.senderId !== user?.id)?.senderId;
                if (contact) {
                    await api.patch(`/messages/read-all/${contact}`);
                }
            }
        } catch (error) {
            console.error('Error fetching messages:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMsg.trim() || !adminContact?.id) return;

        try {
            setSending(true);
            const contactId = adminContact?.id;

            if (!contactId) {
                // Fallback: try to fetch contact again if missing
                const res = await api.get('/messages/contact');
                if (!res.data?.id) {
                    alert(t('no_support_available'));
                    return;
                }
                setAdminContact(res.data);
                await api.post('/messages', {
                    content: newMsg,
                    receiverId: res.data.id
                });
            } else {
                await api.post('/messages', {
                    content: newMsg,
                    receiverId: contactId
                });
            }

            setNewMsg('');
            fetchMessages();
            setTimeout(() => inputRef.current?.focus(), 100);
        } catch (error) {
            console.error('Send failed:', error);
        } finally {
            setSending(false);
        }
    };

    if (loading) return <div className="text-center py-5"><Spinner animation="border" /></div>;

    return (
        <Container className="py-4">
            <h1 className="h3 mb-4 fw-bold d-flex align-items-center gap-2">
                <MessageSquare className="text-primary" />
                {t('messages')}
            </h1>

            <Card className="border-0 shadow-sm rounded-4 overflow-hidden" style={{ height: '600px' }}>
                <Card.Body className="p-0 d-flex flex-column">
                    <div className="flex-grow-1 p-4 overflow-auto bg-light" ref={scrollRef}>
                        {messages.length === 0 ? (
                            <div className="text-center text-muted mt-5">
                                <MessageSquare size={48} className="mb-3 opacity-25" />
                                <p>{t('no_messages_desc')}</p>
                            </div>
                        ) : (
                            <div className="d-flex flex-column gap-3">
                                {messages.map((m) => (
                                    <div
                                        key={m.id}
                                        className={`d-flex flex-column ${m.senderId === user?.id ? 'align-items-end' : 'align-items-start'}`}
                                    >
                                        <div
                                            className={`p-3 rounded-4 shadow-sm ${m.senderId === user?.id ? 'bg-primary text-white rounded-bottom-end-0' : 'bg-white text-dark rounded-bottom-start-0'}`}
                                            style={{ maxWidth: '75%' }}
                                        >
                                            <p className="mb-1">{m.content}</p>
                                            <small className={`opacity-75 ${m.senderId === user?.id ? 'text-white' : 'text-muted'}`} style={{ fontSize: '0.7rem' }}>
                                                {m.createdAt ? format(new Date(m.createdAt), 'HH:mm') : '--:--'}
                                            </small>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="p-4 bg-white border-top">
                        <Form onSubmit={handleSend}>
                            <InputGroup>
                                <Form.Control
                                    ref={inputRef}
                                    placeholder={contactLoading ? t('connecting_support') : t('type_message')}
                                    className="py-2 border-0 bg-light rounded-start-pill px-4"
                                    value={newMsg}
                                    onChange={(e) => setNewMsg(e.target.value)}
                                    disabled={sending}
                                    autoComplete="off"
                                />
                                <Button
                                    variant="primary"
                                    type="submit"
                                    className="rounded-end-pill px-4"
                                    disabled={sending || !newMsg.trim()}
                                >
                                    {sending ? <Spinner animation="border" size="sm" /> : <Send size={20} />}
                                </Button>
                            </InputGroup>
                        </Form>
                    </div>
                </Card.Body>
            </Card>
        </Container>
    );
};

export default ClientInbox;
