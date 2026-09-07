import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Spinner } from 'react-bootstrap';
import { Calendar, Clock } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, isBefore, startOfDay } from 'date-fns';
import api from '../lib/api';

interface TimeSlot {
    time: string;
    available: boolean;
    booked: boolean;
    past: boolean;
}

interface AvailabilityData {
    date: string;
    slots: TimeSlot[];
    message?: string;
}

interface AppointmentCalendarProps {
    serviceId: string;
    staffId?: string;
    serviceDuration: number;
    onSelectDateTime: (date: string, time: string) => void;
    onDurationChange: (duration: number) => void;
    selectedDate?: string;
    selectedTime?: string;
}

const AppointmentCalendar: React.FC<AppointmentCalendarProps> = ({
    serviceId,
    staffId,
    serviceDuration,
    onSelectDateTime,
    onDurationChange,
    selectedDate,
    selectedTime
}) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDateState, setSelectedDateState] = useState<Date | null>(
        selectedDate ? new Date(selectedDate) : null
    );
    const [availability, setAvailability] = useState<AvailabilityData | null>(null);
    const [loading, setLoading] = useState(false);

    // Fetch availability when date is selected
    useEffect(() => {
        if (selectedDateState) {
            fetchAvailability(selectedDateState);
        }
    }, [selectedDateState, serviceId, staffId, serviceDuration]);

    const fetchAvailability = async (date: Date) => {
        setLoading(true);
        try {
            const dateStr = format(date, 'yyyy-MM-dd');
            const params: any = {
                date: dateStr,
                serviceId
            };
            if (staffId) {
                params.staffId = staffId;
            }
            if (serviceDuration) {
                params.duration = serviceDuration;
            }
            const response = await api.get('/appointments/availability', { params });
            setAvailability(response.data);
        } catch (error) {
            console.error('Failed to fetch availability:', error);
            setAvailability(null);
        } finally {
            setLoading(false);
        }
    };

    const handleDateClick = (date: Date) => {
        setSelectedDateState(date);
    };

    const handleTimeClick = (time: string) => {
        if (selectedDateState) {
            const dateStr = format(selectedDateState, 'yyyy-MM-dd');
            onSelectDateTime(dateStr, time);
        }
    };

    const handleMonthChange = (direction: 'prev' | 'next') => {
        setCurrentMonth(prev => {
            const newMonth = direction === 'prev'
                ? new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
                : new Date(prev.getFullYear(), prev.getMonth() + 1, 1);
            return newMonth;
        });
    };

    // Generate calendar days
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Add padding days for the calendar grid
    const startDayOfWeek = monthStart.getDay();
    const paddingDays = Array(startDayOfWeek).fill(null);

    const today = startOfDay(new Date());
    const canSelectDate = (date: Date) => !isBefore(date, today);

    return (
        <div>
            {/* Duration Selector */}
            <Card className="border-0 shadow-sm rounded-4 mb-3">
                <Card.Body className="p-4">
                    <h5 className="fw-bold mb-3 d-flex align-items-center gap-2">
                        <Clock size={20} />
                        Service Duration
                    </h5>
                    <div className="d-flex gap-2 flex-wrap">
                        {[30, 60, 90].map(mins => (
                            <button
                                key={mins}
                                className={`btn ${serviceDuration === mins ? 'btn-primary text-white shadow-sm' : 'btn-outline-secondary'} rounded-pill px-3`}
                                onClick={() => onDurationChange(mins)}
                            >
                                {mins} min
                            </button>
                        ))}
                        <div className="d-flex align-items-center gap-2 bg-light px-3 py-1 rounded-pill border">
                            <input
                                type="number"
                                className="form-control border-0 bg-transparent p-0 text-center"
                                style={{ width: '50px', boxShadow: 'none' }}
                                value={serviceDuration}
                                onChange={(e) => onDurationChange(parseInt(e.target.value) || 0)}
                            />
                            <span className="text-muted small">min</span>
                        </div>
                    </div>
                </Card.Body>
            </Card>

            {/* Calendar Header */}
            <Card className="border-0 shadow-sm rounded-4 mb-3">
                <Card.Body className="p-4">
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <button
                            className="btn btn-sm btn-outline-primary rounded-circle"
                            style={{ width: '36px', height: '36px' }}
                            onClick={() => handleMonthChange('prev')}
                        >
                            ‹
                        </button>
                        <h5 className="fw-bold mb-0 d-flex align-items-center gap-2">
                            <Calendar size={20} />
                            {format(currentMonth, 'MMMM yyyy')}
                        </h5>
                        <button
                            className="btn btn-sm btn-outline-primary rounded-circle"
                            style={{ width: '36px', height: '36px' }}
                            onClick={() => handleMonthChange('next')}
                        >
                            ›
                        </button>
                    </div>

                    {/* Day labels */}
                    <div className="row g-2 mb-2 text-center">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                            <div key={day} className="col">
                                <small className="text-muted fw-bold">{day}</small>
                            </div>
                        ))}
                    </div>

                    {/* Calendar grid */}
                    <div className="row g-2">
                        {paddingDays.map((_, idx) => (
                            <div key={`pad-${idx}`} className="col"></div>
                        ))}
                        {daysInMonth.map(day => {
                            const isSelected = selectedDateState && isSameDay(day, selectedDateState);
                            const isTodayDate = isToday(day);
                            const isPast = !canSelectDate(day);
                            const isCurrentMonth = isSameMonth(day, currentMonth);

                            return (
                                <div key={day.toString()} className="col">
                                    <button
                                        className={`btn w-100 rounded-3 ${isSelected
                                            ? 'btn-primary text-white shadow-sm'
                                            : isTodayDate
                                                ? 'btn-outline-primary'
                                                : isPast
                                                    ? 'btn-light text-muted'
                                                    : 'btn-outline-secondary'
                                            }`}
                                        style={{
                                            aspectRatio: '1',
                                            fontSize: '0.9rem',
                                            opacity: !isCurrentMonth || isPast ? 0.5 : 1,
                                            cursor: isPast ? 'not-allowed' : 'pointer'
                                        }}
                                        onClick={() => !isPast && handleDateClick(day)}
                                        disabled={isPast}
                                    >
                                        {format(day, 'd')}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </Card.Body>
            </Card>

            {/* Time Slots */}
            {selectedDateState && (
                <Card className="border-0 shadow-sm rounded-4">
                    <Card.Body className="p-4">
                        <h5 className="fw-bold mb-3 d-flex align-items-center gap-2">
                            <Clock size={20} />
                            Available Times - {format(selectedDateState, 'EEEE, MMMM d')}
                        </h5>

                        {loading ? (
                            <div className="text-center py-4">
                                <Spinner animation="border" size="sm" />
                                <p className="text-muted mt-2 mb-0 small">Loading availability...</p>
                            </div>
                        ) : availability?.message ? (
                            <div className="alert alert-info mb-0">
                                {availability.message}
                            </div>
                        ) : availability && availability.slots.length > 0 ? (
                            <>
                                <div className="d-flex gap-3 mb-3 flex-wrap">
                                    <div className="d-flex align-items-center gap-2">
                                        <div className="bg-success rounded-circle" style={{ width: '12px', height: '12px' }}></div>
                                        <small className="text-muted">Available</small>
                                    </div>
                                    <div className="d-flex align-items-center gap-2">
                                        <div className="bg-danger rounded-circle" style={{ width: '12px', height: '12px' }}></div>
                                        <small className="text-muted">Booked</small>
                                    </div>
                                    <div className="d-flex align-items-center gap-2">
                                        <div className="bg-secondary rounded-circle" style={{ width: '12px', height: '12px' }}></div>
                                        <small className="text-muted">Past</small>
                                    </div>
                                </div>

                                <Row className="g-2">
                                    {availability.slots.map((slot) => {
                                        const isSelectedSlot = selectedTime === slot.time;
                                        const buttonClass = slot.available
                                            ? isSelectedSlot
                                                ? 'btn-success text-white shadow-sm'
                                                : 'btn-outline-success'
                                            : slot.booked
                                                ? 'btn-danger text-white opacity-50'
                                                : 'btn-secondary text-white opacity-50';

                                        return (
                                            <Col xs={6} sm={4} md={3} key={slot.time}>
                                                <button
                                                    className={`btn w-100 ${buttonClass} rounded-3`}
                                                    onClick={() => slot.available && handleTimeClick(slot.time)}
                                                    disabled={!slot.available}
                                                    style={{
                                                        cursor: slot.available ? 'pointer' : 'not-allowed'
                                                    }}
                                                >
                                                    <div className="d-flex flex-column align-items-center py-1">
                                                        <span className="fw-bold">{slot.time}</span>
                                                        {slot.booked && (
                                                            <small style={{ fontSize: '0.7rem' }}>Booked</small>
                                                        )}
                                                        {slot.past && !slot.booked && (
                                                            <small style={{ fontSize: '0.7rem' }}>Past</small>
                                                        )}
                                                    </div>
                                                </button>
                                            </Col>
                                        );
                                    })}
                                </Row>
                            </>
                        ) : (
                            <p className="text-muted mb-0">No time slots available for this date.</p>
                        )}
                    </Card.Body>
                </Card>
            )}
        </div>
    );
};

export default AppointmentCalendar;
