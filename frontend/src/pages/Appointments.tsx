import React, { useEffect, useState, useCallback } from 'react';
import { Calendar as BigCalendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, setHours, setMinutes, isSameDay } from 'date-fns';
import { enUS, ptBR, uk } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import api from '../lib/api';
import { Plus, User, Phone, Mail, MessageSquare, Clock, Info, X, Send, UserCheck, CalendarOff, Trash2 } from 'lucide-react';
import { Button, Card, Tabs, Tab, Badge, Spinner, Modal, Form } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

const locales = {
    'en': enUS,
    'pt': ptBR,
    'uk': uk,
};

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
});

interface Appointment {
    id: string;
    title: string;
    start: Date;
    end: Date;
    startTime: string; // From backend
    endTime: string;   // From backend
    client?: { id: string; name: string; email?: string; clientProfile?: { phone?: string; notes?: string } };
    service?: { name: string; duration: number; price: number };
    staff?: { user: { name: string } };
    notes?: string;
    status: string;
}

const Appointments: React.FC = () => {
    const { t, i18n } = useTranslation();
    const [events, setEvents] = useState<any[]>([]);
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
    const [settings, setSettings] = useState<any>(null);
    const [staffList, setStaffList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [view, setView] = useState<any>(Views.WEEK);
    const [date, setDate] = useState(new Date());

    const minTime = React.useMemo(() => {
        if (!settings?.working_hours?.start) return setHours(setMinutes(new Date(), 0), 8);
        const [hours] = settings.working_hours.start.split(':').map(Number);
        return setHours(setMinutes(new Date(), 0), Math.max(0, hours - 1));
    }, [settings]);

    const maxTime = React.useMemo(() => {
        if (!settings?.working_hours?.end) return setHours(setMinutes(new Date(), 0), 20);
        const [hours] = settings.working_hours.end.split(':').map(Number);
        return setHours(setMinutes(new Date(), 0), Math.min(23, hours + 1));
    }, [settings]);

    const fetchData = useCallback(async () => {
            setLoading(true);
            try {
                const [apptsRes, settingsRes, staffRes] = await Promise.all([
                    api.get('/appointments'),
                    api.get('/settings'),
                    api.get('/staff')
                ]);

                const formattedEvents = apptsRes.data.map((apt: any) => ({
                    id: apt.id,
                    title: `${apt.service?.name} - ${apt.client?.name}`,
                    start: new Date(apt.startTime),
                    end: new Date(apt.endTime),
                    resource: apt,
                }));
                setEvents(formattedEvents);
                setSettings(settingsRes.data);
                setStaffList(staffRes.data);
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const eventPropGetter = useCallback((_event: any) => {
        return {
            style: {
                backgroundColor: '#3b82f6', // Premium Blue
                border: 'none',
                borderRadius: '6px',
                color: 'white',
                fontSize: '0.85rem',
                fontWeight: '500',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }
        };
    }, []);

    const slotPropGetter = useCallback((date: Date) => {
        if (!settings) return {};

        const day = getDay(date);
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

        // 1. Check if it's a working day
        const isWorkingDay = settings.working_hours?.days?.includes(day);
        if (!isWorkingDay) {
            return {
                style: { backgroundColor: '#f3f4f6' }, // Light Grey
            };
        }

        // 2. Check if it's within working hours
        const { start: workStart, end: workEnd } = settings.working_hours || { start: '09:00', end: '19:00' };
        if (timeStr < workStart || timeStr >= workEnd) {
            return {
                style: { backgroundColor: '#f3f4f6' },
            };
        }

        // 3. Check if it's non-working/break hours
        const { start: breakStart, end: breakEnd } = settings.non_working_hours || {};
        if (breakStart && breakEnd && timeStr >= breakStart && timeStr < breakEnd) {
            return {
                style: { backgroundColor: '#e5e7eb' }, // Slightly darker grey for breaks
            };
        }

        return {
            style: { backgroundColor: 'white' },
        };
    }, [settings]);

    const handleSelectEvent = (event: any) => {
        setSelectedAppointment(event.resource);
    };

    const [showMsgModal, setShowMsgModal] = useState(false);
    const [msgContent, setMsgContent] = useState('');
    const [sendingMsg, setSendingMsg] = useState(false);

    const handleSendMessage = async () => {
        if (!msgContent.trim() || !selectedAppointment?.client?.id) return;

        setSendingMsg(true);
        try {
            await api.post('/messages', {
                content: msgContent,
                receiverId: selectedAppointment.client.id
            });
            setShowMsgModal(false);
            setMsgContent('');
            // Optionally show success toast/alert
        } catch (error) {
            console.error('Failed to send message:', error);

        } finally {
            setSendingMsg(false);
        }
    };

    const handleStatusChange = async (status: string) => {
        if (!selectedAppointment) return;
        try {
            await api.patch('/appointments/' + selectedAppointment.id, { status });
            setSelectedAppointment({ ...selectedAppointment, status });
            fetchData();
        } catch (error: any) {
            alert(error?.response?.data?.message || 'Failed to update appointment status');
        }
    };

    const handleDeleteAppointment = async () => {
        if (!selectedAppointment) return;
        if (!window.confirm('Delete this appointment? This action cannot be undone.')) return;
        try {
            await api.delete('/appointments/' + selectedAppointment.id);
            setSelectedAppointment(null);
            fetchData();
        } catch (error: any) {
            alert(error?.response?.data?.message || 'Failed to delete appointment');
        }
    };

    const [isListView, setIsListView] = useState(false);


    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStaffId, setSelectedStaffId] = useState<string>('all');

    const filteredEvents = React.useMemo(() => {
        let filtered = events;

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter((evt: any) => {
                const clientName = evt.resource?.client?.name?.toLowerCase() || '';
                const serviceName = evt.resource?.service?.name?.toLowerCase() || '';
                return clientName.includes(q) || serviceName.includes(q);
            });
        }

        if (selectedStaffId !== 'all') {
            filtered = filtered.filter((evt: any) =>
                evt.resource?.staff?.userId === selectedStaffId ||
                evt.resource?.staff?.user?.id === selectedStaffId
            );
        }

        return filtered;
    }, [events, searchQuery, selectedStaffId]);

    const todaysEvents = React.useMemo(() => {
        const today = new Date();
        return filteredEvents
            .filter((evt: any) => isSameDay(new Date(evt.start), today))
            .sort((a: any, b: any) => b.start.getTime() - a.start.getTime()); // Newest (latest time) on top
    }, [filteredEvents]);

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center h-100">
                <Spinner animation="border" variant="primary" />
            </div>
        );
    }

    return (
        <div className="py-4 h-100 d-flex flex-column position-relative overflow-hidden">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h1 className="h3 mb-1 fw-bold text-dark">{t('appointments')}</h1>
                    <p className="text-secondary mb-0">{t('manage_business_schedule') || 'Manage your business schedule'}</p>
                </div>
                <div className="d-flex gap-3">
                    <div className="bg-light p-1 rounded-3 d-flex shadow-sm">
                        <Button
                            variant={!isListView ? 'white' : 'light'}
                            className={`px-3 py-1 border-0 rounded-2 ${!isListView ? 'bg-white shadow-sm fw-bold text-primary' : 'text-secondary bg-transparent'}`}
                            onClick={() => setIsListView(false)}
                        >
                            {t('calendar') || 'Calendar'}
                        </Button>
                        <Button
                            variant={isListView ? 'white' : 'light'}
                            className={`px-3 py-1 border-0 rounded-2 ${isListView ? 'bg-white shadow-sm fw-bold text-primary' : 'text-secondary bg-transparent'}`}
                            onClick={() => setIsListView(true)}
                        >
                            {t('list') || 'List'}
                        </Button>
                    </div>
                    <Button
                        variant="primary"
                        className="d-flex align-items-center gap-2 px-4 py-2 rounded-3 shadow-sm border-0"
                        style={{ backgroundColor: '#3b82f6' }}
                    >
                        <Plus size={20} />
                        {t('new_appointment')}
                    </Button>
                </div>
            </div>

            <Card className="mb-4 border-0 shadow-sm rounded-4 overflow-hidden">
                <Card.Body className="p-3">
                    <div className="d-flex align-items-center gap-4">
                        <div className="d-flex align-items-center gap-2 bg-light px-3 py-2 rounded-3 flex-grow-1" style={{ maxWidth: '400px' }}>
                            <Info size={18} className="text-muted" />
                            <Form.Control
                                type="text"
                                placeholder={t('search_placeholder') || 'Search by client or service...'}
                                className="border-0 bg-transparent shadow-none p-0"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="d-flex align-items-center gap-2">
                            <span className="small fw-bold text-muted text-uppercase">{t('professional')}:</span>
                            <Form.Select
                                className="border-0 bg-light rounded-3 shadow-none py-2 px-3"
                                value={selectedStaffId}
                                onChange={(e) => setSelectedStaffId(e.target.value)}
                                style={{ width: '200px' }}
                            >
                                <option value="all">{t('all_professionals') || 'All Professionals'}</option>
                                {staffList.map((s: any) => (
                                    <option key={s.id} value={s.id}>{s.user?.name || s.name}</option>
                                ))}
                            </Form.Select>
                        </div>
                    </div>
                </Card.Body>
            </Card>

            <div className="d-flex flex-grow-1 gap-4 overflow-hidden h-100">
                {/* Main Calendar Area */}
                <Card className={`flex-grow-1 shadow-sm border-0 rounded-4 overflow-hidden p-3 bg-white transition-all duration-300 ${selectedAppointment ? 'w-50' : 'w-70'}`}>
                    {!isListView ? (
                        <div style={{ minWidth: '600px', overflowX: 'auto', height: '100%' }}>
                            <BigCalendar
                                localizer={localizer}
                                events={filteredEvents}
                                culture={i18n.language}
                                startAccessor="start"
                                endAccessor="end"
                                style={{ height: 'calc(100vh - 280px)', minHeight: '500px' }}
                                view={view}
                                onView={(v) => setView(v)}
                                date={date}
                                onNavigate={setDate}
                                views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
                                eventPropGetter={eventPropGetter}
                                slotPropGetter={slotPropGetter}
                                onSelectEvent={handleSelectEvent}
                                min={minTime}
                                max={maxTime}
                            />
                        </div>
                    ) : (
                        <div className="overflow-auto" style={{ height: 'calc(100vh - 280px)' }}>
                            <table className="table table-hover align-middle mb-0">
                                <thead className="bg-light position-sticky top-0" style={{ zIndex: 1 }}>
                                    <tr>
                                        <th className="border-0 py-3 ps-4 text-secondary small fw-bold text-uppercase">{t('time') || 'Time'}</th>
                                        <th className="border-0 py-3 text-secondary small fw-bold text-uppercase">{t('client') || 'Client'}</th>
                                        <th className="border-0 py-3 text-secondary small fw-bold text-uppercase">{t('service') || 'Service'}</th>
                                        <th className="border-0 py-3 text-secondary small fw-bold text-uppercase">{t('professional') || 'Professional'}</th>
                                        <th className="border-0 py-3 text-secondary small fw-bold text-uppercase">{t('notes_progress') || 'Notes / Progress'}</th>
                                        <th className="border-0 py-3 text-secondary small fw-bold text-uppercase">{t('status') || 'Status'}</th>
                                        <th className="border-0 py-3 pe-4 text-secondary small fw-bold text-uppercase">{t('actions') || 'Actions'}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredEvents.map((evt: any) => (
                                        <tr key={evt.id} className="cursor-pointer" onClick={() => setSelectedAppointment(evt.resource)}>
                                            <td className="py-3 ps-4">
                                                <div className="fw-bold">{format(evt.start, 'MMM d, yyyy')}</div>
                                                <div className="small text-muted">{format(evt.start, 'p')}</div>
                                            </td>
                                            <td className="py-3">
                                                <div className="d-flex align-items-center gap-2">
                                                    <div className="bg-primary bg-opacity-10 text-primary rounded-circle p-2 d-flex">
                                                        <User size={16} />
                                                    </div>
                                                    <div>
                                                        <div className="fw-bold">{evt.resource?.client?.name}</div>
                                                        <div className="small text-muted">{evt.resource?.client?.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3">
                                                <Badge bg="light" className="text-dark border px-3 py-2 rounded-pill fw-normal">
                                                    {evt.resource?.service?.name}
                                                </Badge>
                                            </td>
                                            <td className="py-3">
                                                <div className="d-flex align-items-center gap-2">
                                                    <UserCheck size={16} className={evt.resource?.staff?.user?.name ? 'text-primary' : 'text-muted'} />
                                                    <span className={evt.resource?.staff?.user?.name ? 'fw-medium' : 'text-muted fst-italic'}>
                                                        {evt.resource?.staff?.user?.name || 'Unassigned'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-3">
                                                <p className="mb-0 small text-truncate" style={{ maxWidth: '200px' }}>
                                                    {evt.resource?.notes || t('no_notes_available') || 'No notes available'}
                                                </p>
                                            </td>
                                            <td className="py-3">
                                                <Badge bg={evt.resource?.status === 'CONFIRMED' ? 'success' : 'warning'} className="rounded-pill opacity-75">
                                                    {evt.resource?.status}
                                                </Badge>
                                            </td>
                                            <td className="py-3 pe-4">
                                                <Button variant="link" className="p-0 text-primary fw-bold text-decoration-none">
                                                    {t('view_details') || 'View Details'}
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredEvents.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="text-center py-5 text-muted">
                                                {t('no_appointments_found') || 'No appointments found matching your criteria.'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>

                {/* Today's Agenda Side Panel (Only if no specific appointment is selected, or maybe always? Let's hide it if details are open to avoid clutter, OR keep it. Plan said "beside agenda". If details open, maybe we replace agenda? No, let's keep it simple: Calendar + Agenda. If detail opens, maybe it covers Agenda or it's a modal. The current detail view is a side panel too. Let's make them mutually exclusive or stack them? 
                
                Current layout: 
                Container -> Calendar (flex-grow) + Details (fixed width)
                
                New layout plan:
                Container -> Calendar (flex-grow) + Agenda (fixed width)
                
                If Details is selected, it should probably replace Agenda or take precedence.
                Let's make Agenda visible ONLY when selectedAppointment is NULL.
                */}
                {!selectedAppointment && (
                    <Card className="shadow-sm border-0 rounded-4 overflow-hidden bg-white d-flex flex-column" style={{ width: '350px', minWidth: '350px' }}>
                        <Card.Header className="bg-white border-0 pt-4 px-4 pb-2">
                            <h5 className="fw-bold mb-1">{t('todays_agenda') || "Today's Agenda"}</h5>
                            <p className="text-secondary small mb-0">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
                        </Card.Header>
                        <Card.Body className="p-0 overflow-auto custom-scrollbar">
                            {todaysEvents.length > 0 ? (
                                <div className="p-3 d-flex flex-column gap-3">
                                    {todaysEvents.map((evt: any) => (
                                        <div
                                            key={evt.id}
                                            className="p-3 bg-light rounded-4 cursor-pointer hover-shadow transition-all border border-light"
                                            onClick={() => setSelectedAppointment(evt.resource)}
                                        >
                                            <div className="d-flex justify-content-between align-items-start mb-2">
                                                <Badge bg="white" className="text-primary border shadow-sm rounded-pill px-2 py-1 fw-medium">
                                                    {format(evt.start, 'p')} - {format(evt.end, 'p')}
                                                </Badge>
                                                <Badge bg={evt.resource?.status === 'CONFIRMED' ? 'success' : 'warning'} className="rounded-pill opacity-75" style={{ fontSize: '0.65rem' }}>
                                                    {evt.resource?.status}
                                                </Badge>
                                            </div>
                                            <div className="d-flex align-items-center gap-2 mb-1">
                                                <User size={16} className="text-muted" />
                                                <span className="fw-bold text-dark">{evt.resource?.client?.name}</span>
                                            </div>
                                            <div className="d-flex align-items-center gap-2 text-secondary small mb-2">
                                                <span className="text-muted">{evt.resource?.service?.name}</span>
                                            </div>
                                            {selectedStaffId === 'all' && (
                                                <div className="d-flex align-items-center gap-2 pt-2 border-top border-light mt-2">
                                                    <div className="d-flex align-items-center gap-1 small text-muted">
                                                        <UserCheck size={14} />
                                                        <span>{evt.resource?.staff?.user?.name || 'Unassigned'}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center p-5 text-muted">
                                    <div className="bg-light rounded-circle p-3 d-inline-flex mb-3">
                                        <CalendarOff size={24} className="text-secondary opacity-50" />
                                    </div>
                                    <p className="small mb-0">{t('no_appointments_today') || 'No appointments for today.'}</p>
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                )}

                {selectedAppointment && (
                    <Card className="shadow-lg border-0 rounded-4 overflow-hidden bg-white d-flex flex-column" style={{ width: '400px', zIndex: 10 }}>
                        <Card.Header className="bg-white border-0 p-4 d-flex justify-content-between align-items-start">
                            <div>
                                <Badge bg="primary" className="mb-2 px-3 py-2 rounded-pill" style={{ backgroundColor: '#ebf5ff', color: '#3b82f6' }}>
                                    {selectedAppointment.status}
                                </Badge>
                                <h4 className="fw-bold mb-1">{selectedAppointment.service?.name}</h4>
                                <div className="text-muted small d-flex align-items-center gap-2">
                                    <Clock size={14} />
                                    {format(new Date(selectedAppointment.startTime), 'p')} - {format(new Date(selectedAppointment.endTime), 'p')}
                                </div>
                            </div>
                            <Button variant="link" className="text-secondary p-0" onClick={() => setSelectedAppointment(null)}>
                                <X size={24} />
                            </Button>
                        </Card.Header>

                        <div className="px-4 pb-4 flex-grow-1 overflow-auto">
                            <Tabs defaultActiveKey="client" id="appointment-details-tabs" className="mb-4 custom-tabs">
                                <Tab eventKey="client" title={
                                    <div className="d-flex align-items-center gap-2">
                                        <User size={16} />
                                        <span>Client</span>
                                    </div>
                                }>
                                    <div className="mt-3">
                                        <div className="d-flex align-items-center gap-3 mb-4 p-3 bg-light rounded-4">
                                            <div className="bg-white p-2 rounded-3 shadow-sm">
                                                <User size={32} className="text-primary" />
                                            </div>
                                            <div>
                                                <div className="fw-bold fs-5">{selectedAppointment.client?.name}</div>
                                                <div className="text-muted small">Client since {format(new Date(), 'MMM yyyy')}</div>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="d-flex align-items-center gap-3 text-secondary">
                                                <Mail size={18} />
                                                <span>{selectedAppointment.client?.email || 'No email provided'}</span>
                                            </div>
                                            <div className="d-flex align-items-center gap-3 text-secondary mt-3">
                                                <Phone size={18} />
                                                <span>{selectedAppointment.client?.clientProfile?.phone || 'No phone provided'}</span>
                                            </div>
                                            <div className="mt-4 p-3 border border-light rounded-4 bg-light bg-opacity-50">
                                                <div className="fw-bold small text-uppercase text-muted mb-2">Internal Notes</div>
                                                <p className="small mb-0 text-secondary">
                                                    {selectedAppointment.client?.clientProfile?.notes || 'No notes for this client.'}
                                                </p>
                                            </div>
                                        </div>

                                        <Button
                                            variant="primary"
                                            className="w-100 mt-4 py-3 rounded-4 d-flex align-items-center justify-content-center gap-2 fw-bold shadow-sm border-0"
                                            style={{ backgroundColor: '#3b82f6' }}
                                            onClick={() => setShowMsgModal(true)}
                                        >
                                            <MessageSquare size={18} />
                                            Send Message
                                        </Button>
                                    </div>
                                </Tab>
                                <Tab eventKey="details" title={
                                    <div className="d-flex align-items-center gap-2">
                                        <Info size={16} />
                                        <span>Info</span>
                                    </div>
                                }>
                                    <div className="mt-3">
                                        <div className="p-3 border border-light rounded-4 mb-3">
                                            <div className="d-flex justify-content-between mb-2">
                                                <span className="text-muted">Service</span>
                                                <span className="fw-bold">{selectedAppointment.service?.name}</span>
                                            </div>
                                            <div className="d-flex justify-content-between mb-2">
                                                <span className="text-muted">Duration</span>
                                                <span className="fw-bold">{selectedAppointment.service?.duration} mins</span>
                                            </div>
                                            <div className="d-flex justify-content-between">
                                                <span className="text-muted">Price</span>
                                                <span className="fw-bold text-success">${selectedAppointment.service?.price}</span>
                                            </div>
                                        </div>

                                        <div className="p-3 border border-light rounded-4 mb-3">
                                            <div className="d-flex justify-content-between mb-2">
                                                <span className="text-muted">Staff Member</span>
                                                <span className="fw-bold">{selectedAppointment.staff?.user?.name || 'Unassigned'}</span>
                                            </div>
                                        </div>

                                        {selectedAppointment.notes && (
                                            <div className="p-3 bg-light rounded-4">
                                                <div className="fw-bold small text-uppercase text-muted mb-2">Appointment Notes</div>
                                                <p className="small mb-0 text-secondary">{selectedAppointment.notes}</p>
                                            </div>
                                        )}

                                        <div className="p-3 border border-light rounded-4 mb-3">
                                            <Form.Label className="fw-bold small text-uppercase text-muted d-block mb-2">Status</Form.Label>
                                            <Form.Select value={selectedAppointment.status} onChange={(e) => handleStatusChange(e.target.value)}>
                                                <option>PENDING</option>
                                                <option>CONFIRMED</option>
                                                <option>COMPLETED</option>
                                                <option>CANCELLED</option>
                                                <option>NO_SHOW</option>
                                            </Form.Select>
                                        </div>

                                        <Button variant="danger" className="w-100 rounded-4 d-flex align-items-center justify-content-center gap-2 fw-bold border-0" onClick={handleDeleteAppointment}>
                                            <Trash2 size={18} />
                                            Delete Appointment
                                        </Button>
                                    </div>
                                </Tab>
                            </Tabs>
                        </div>
                    </Card>
                )}
            </div>

            {/* Messaging Modal */}
            <Modal show={showMsgModal} onHide={() => setShowMsgModal(false)} centered rounded-4>
                <Modal.Header closeButton className="border-0 p-4">
                    <Modal.Title className="fw-bold d-flex align-items-center gap-2">
                        <MessageSquare className="text-primary" />
                        Send Message to {selectedAppointment?.client?.name}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="px-4 pb-4">
                    <Form.Group className="mb-4">
                        <Form.Label className="small fw-bold text-muted text-uppercase mb-2">Your Message</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={4}
                            placeholder="Type your message here..."
                            className="rounded-4 border-0 bg-light p-3"
                            value={msgContent}
                            onChange={(e) => setMsgContent(e.target.value)}
                            disabled={sendingMsg}
                        />
                    </Form.Group>
                    <div className="d-flex gap-3">
                        <Button
                            variant="light"
                            className="flex-grow-1 py-3 rounded-4 fw-bold text-secondary border-0"
                            onClick={() => setShowMsgModal(false)}
                            disabled={sendingMsg}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            className="flex-grow-1 py-3 rounded-4 fw-bold shadow-sm border-0 d-flex align-items-center justify-content-center gap-2"
                            style={{ backgroundColor: '#3b82f6' }}
                            onClick={handleSendMessage}
                            disabled={sendingMsg || !msgContent.trim()}
                        >
                            {sendingMsg ? <Spinner animation="border" size="sm" /> : <>
                                <Send size={18} />
                                Send Message
                            </>}
                        </Button>
                    </div>
                </Modal.Body>
            </Modal>

            <style>{`
                .rbc-calendar { font-family: 'Inter', sans-serif; }
                .rbc-today { background-color: rgba(59, 130, 246, 0.03) !important; }
                .rbc-header { padding: 12px 0; font-weight: 600; color: #6b7280; border-bottom: 1px solid #f3f4f6; }
                .rbc-time-header-content { border-left: none; }
                .rbc-timeslot-group { border-bottom: 1px solid #f9fafb; min-height: 50px; }
                .rbc-slot-selection { background-color: rgba(59, 130, 246, 0.1); }
                .rbc-event-label { font-size: 0.75rem; opacity: 0.8; }
                .rbc-timeslot-group { border-bottom: 1px solid #f3f4f6; }
                .rbc-time-content { border-top: 1px solid #f3f4f6; }
                .rbc-show-more { color: #3b82f6; font-weight: 600; }
                
                .custom-tabs .nav-link { 
                    border: none; 
                    color: #6b7280; 
                    font-weight: 500; 
                    padding: 10px 0; 
                    margin-right: 24px;
                    border-bottom: 2px solid transparent;
                }
                .custom-tabs .nav-link.active { 
                    color: #3b82f6; 
                    background: transparent; 
                    border-bottom: 2px solid #3b82f6; 
                }
                
                .transition-all { transition: all 0.3s ease-in-out; }
                .w-60 { width: 65%; }

                .table thead th {
                    letter-spacing: 0.05em;
                }
                .cursor-pointer { cursor: pointer; }
            `}</style>
        </div>
    );
};

export default Appointments;
