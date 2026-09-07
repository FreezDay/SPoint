import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Form, Button, Spinner, InputGroup, Badge } from 'react-bootstrap';
import { Send, MessageSquare, Search, User, CheckCheck } from 'lucide-react';
import api from '../../lib/api';
import { useAuthStore } from '../../store/useAuthStore';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';

const MessageCenter: React.FC = () => {
    const { t } = useTranslation();
    const { user } = useAuthStore();
    const [conversations, setConversations] = useState<any[]>([]);
    const [selectedConversation, setSelectedConversation] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [newMsg, setNewMsg] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchConversations();
        const interval = setInterval(() => {
            fetchConversations();
            if (selectedConversation) {
                fetchMessages(selectedConversation.client.id);
            }
        }, 10000);
        return () => clearInterval(interval);
    }, [selectedConversation]);

    const fetchConversations = async () => {
        try {
            const res = await api.get('/messages/conversations');
            setConversations(res.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching conversations:', error);
        }
    };

    const fetchMessages = async (clientId: string) => {
        try {
            const res = await api.get('/messages');
            // Backend currently returns all user messages, so we filter by conversation
            const filtered = res.data.filter((m: any) =>
                m.senderId === clientId || m.receiverId === clientId
            );
            setMessages(filtered);

            // Mark unread as read using the new efficient endpoint
            const hasUnread = filtered.some((m: any) => !m.read && m.receiverId === user?.id);
            if (hasUnread) {
                await api.patch(`/messages/read-all/${clientId}`);
                fetchConversations(); // Update counts in sidebar
            }
        } catch (error) {
            console.error('Error fetching messages:', error);
        }
    };

    const handleSelectConversation = (conv: any) => {
        setSelectedConversation(conv);
        setMessages([]);
        fetchMessages(conv.client.id);
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMsg.trim() || !selectedConversation) return;

        try {
            setSending(true);
            await api.post('/messages', {
                content: newMsg,
                receiverId: selectedConversation.client.id
            });
            setNewMsg('');
            fetchMessages(selectedConversation.client.id);
            fetchConversations();
        } catch (error) {
            console.error('Send failed:', error);
        } finally {
            setSending(false);
        }
    };

    const filteredConversations = conversations.filter(c =>
        c.client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.client.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) return <div className="text-center py-5 mt-5"><Spinner animation="border" variant="primary" /></div>;

    return (
        <Container fluid className="py-4 h-100 message-center-container">
            <Row className="h-100 g-0 shadow-sm rounded-4 overflow-hidden border bg-white" style={{ minHeight: 'calc(100vh - 150px)' }}>
                {/* Conversation List Sidebar */}
                <Col md={4} lg={3} className="border-end d-flex flex-column bg-light bg-opacity-50">
                    <div className="p-4 bg-white border-bottom">
                        <h4 className="fw-bold mb-3 d-flex align-items-center gap-2">
                            <MessageSquare className="text-primary" />
                            {t('message_center')}
                        </h4>
                        <InputGroup className="bg-light rounded-pill px-3 py-1 border-0 shadow-none">
                            <Search size={18} className="text-muted mt-2" />
                            <Form.Control
                                placeholder={t('search_client')}
                                className="border-0 bg-transparent shadow-none"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </InputGroup>
                    </div>
                    <div className="flex-grow-1 overflow-auto bg-white">
                        {filteredConversations.length === 0 ? (
                            <div className="text-center p-5 text-muted">
                                <Search size={32} className="mb-2 opacity-25" />
                                <p className="small mb-0">{t('no_conversations_found') || 'No conversations found'}</p>
                            </div>
                        ) : (
                            filteredConversations.map((conv) => (
                                <div
                                    key={conv.client.id}
                                    onClick={() => handleSelectConversation(conv)}
                                    className={`p-3 border-bottom cursor-pointer transition-all conversation-item ${selectedConversation?.client.id === conv.client.id ? 'bg-primary bg-opacity-10 border-start border-4 border-primary' : 'hover-bg-light'}`}
                                >
                                    <div className="d-flex gap-3 align-items-center">
                                        <div className="position-relative">
                                            <div className="bg-primary bg-opacity-10 text-primary rounded-circle p-2 d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px' }}>
                                                <User size={24} />
                                            </div>
                                            {conv.unreadCount > 0 && (
                                                <Badge pill bg="danger" className="position-absolute top-0 end-0 border border-2 border-white translate-middle-y">
                                                    {conv.unreadCount}
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="flex-grow-1 min-w-0">
                                            <div className="d-flex justify-content-between align-items-center mb-1">
                                                <h6 className="mb-0 fw-bold text-truncate">{conv.client.name}</h6>
                                                <small className="text-muted" style={{ fontSize: '0.7rem' }}>
                                                    {format(new Date(conv.lastMessage.createdAt), 'HH:mm')}
                                                </small>
                                            </div>
                                            <p className="small mb-0 text-muted text-truncate">
                                                {conv.lastMessage.content}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </Col>

                {/* Chat Area */}
                <Col md={8} lg={9} className="d-flex flex-column bg-white">
                    {selectedConversation ? (
                        <>
                            <div className="p-3 border-bottom bg-white d-flex align-items-center justify-content-between sticky-top">
                                <div className="d-flex align-items-center gap-3">
                                    <div className="bg-primary bg-opacity-10 text-primary rounded-circle p-2 d-flex">
                                        <User size={20} />
                                    </div>
                                    <div>
                                        <h6 className="mb-0 fw-bold">{selectedConversation.client.name}</h6>
                                        <small className="text-muted">{selectedConversation.client.email}</small>
                                    </div>
                                </div>
                                <div className="d-flex align-items-center gap-2">
                                    <Badge bg="light" className="text-primary border border-primary border-opacity-25 px-3 py-2 rounded-pill fw-normal">
                                        {t('active_customer') || 'Active Customer'}
                                    </Badge>
                                </div>
                            </div>

                            <div className="flex-grow-1 p-4 overflow-auto bg-light bg-opacity-25 d-flex flex-column gap-3">
                                {messages.map((m) => (
                                    <div
                                        key={m.id}
                                        className={`d-flex flex-column ${m.senderId === user?.id ? 'align-items-end' : 'align-items-start'}`}
                                    >
                                        <div
                                            className={`p-3 rounded-4 shadow-sm ${m.senderId === user?.id ? 'bg-primary text-white rounded-bottom-end-0' : 'bg-white text-dark border-0 rounded-bottom-start-0'}`}
                                            style={{ maxWidth: '70%', transition: 'all 0.2s' }}
                                        >
                                            <p className="mb-1">{m.content}</p>
                                            <div className="d-flex justify-content-between align-items-center gap-2 opacity-75">
                                                <small style={{ fontSize: '0.65rem' }}>
                                                    {format(new Date(m.createdAt), 'MMM d, HH:mm')}
                                                </small>
                                                {m.senderId === user?.id && <CheckCheck size={14} className={m.read ? 'text-white' : 'text-white-50'} />}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {messages.length === 0 && (
                                    <div className="text-center py-5 text-muted opacity-50 my-auto">
                                        <MessageSquare size={48} className="mb-3" />
                                        <h5>{t('start_conversation') || 'Start the conversation'}</h5>
                                        <p>{t('start_conversation_sub') || 'Send a message to sync with your client.'}</p>
                                    </div>
                                )}
                            </div>

                            <div className="p-4 bg-white border-top">
                                <Form onSubmit={handleSend}>
                                    <InputGroup>
                                        <Form.Control
                                            placeholder={t('type_reply_placeholder') || 'Type your reply...'}
                                            className="py-3 border-0 bg-light rounded-start-4 px-4 shadow-none"
                                            value={newMsg}
                                            onChange={(e) => setNewMsg(e.target.value)}
                                            disabled={sending}
                                        />
                                        <Button
                                            variant="primary"
                                            type="submit"
                                            className="rounded-end-4 px-4 shadow-sm border-0"
                                            disabled={sending || !newMsg.trim()}
                                            style={{ backgroundColor: '#3b82f6' }}
                                        >
                                            {sending ? <Spinner animation="border" size="sm" /> : <Send size={20} />}
                                        </Button>
                                    </InputGroup>
                                </Form>
                            </div>
                        </>
                    ) : (
                        <div className="h-100 d-flex flex-column align-items-center justify-content-center text-muted bg-light bg-opacity-10 p-5 text-center">
                            <div className="bg-white p-4 rounded-circle shadow-sm mb-4">
                                <MessageSquare size={64} className="text-primary opacity-25" />
                            </div>
                            <h4 className="fw-bold text-dark">{t('all_conversations')}</h4>
                            <p className="max-w-md mx-auto">{t('select_client_msg') || 'Select a client from the left to view their message history and reply.'}</p>
                        </div>
                    )}
                </Col>
            </Row>

            <style>{`
                .conversation-item:hover { background-color: #f8f9fa; }
                .hover-bg-light:hover { background-color: #f8f9fa; }
                .cursor-pointer { cursor: pointer; }
                .transition-all { transition: all 0.2s ease-in-out; }
                .message-center-container { height: calc(100vh - 100px); max-height: calc(100vh - 100px); }
                .min-w-0 { min-width: 0; }
            `}</style>
        </Container>
    );
};

export default MessageCenter;
