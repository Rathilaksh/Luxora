import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isWithinInterval, startOfDay } from 'date-fns';
import { Calendar, ChevronLeft, ChevronRight, User, Home, DollarSign, Clock } from 'lucide-react';

const HostCalendar = ({ token, onClose }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [bookings, setBookings] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBookings();
  }, [currentMonth]);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);
      
      const response = await fetch(
        `/api/host/calendar?startDate=${monthStart.toISOString()}&endDate=${monthEnd.toISOString()}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setBookings(data);
      }
    } catch (error) {
      console.error('Failed to load calendar:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDayBookings = (date) => {
    return bookings.filter(booking => {
      const checkIn = startOfDay(new Date(booking.checkIn));
      const checkOut = startOfDay(new Date(booking.checkOut));
      const targetDay = startOfDay(date);
      
      return isWithinInterval(targetDay, { start: checkIn, end: checkOut }) ||
             isSameDay(targetDay, checkIn) ||
             isSameDay(targetDay, checkOut);
    });
  };

  const getDayStyle = (date, dayBookings) => {
    if (dayBookings.length === 0) return '';
    
    const statuses = dayBookings.map(b => b.status);
    if (statuses.includes('CONFIRMED')) return 'day-confirmed';
    if (statuses.includes('PENDING')) return 'day-pending';
    if (statuses.includes('COMPLETED')) return 'day-completed';
    return '';
  };

  const renderCalendar = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    // Add empty cells for days before month starts
    const startDay = monthStart.getDay();
    const emptyCells = Array(startDay).fill(null);
    
    return (
      <div className="calendar-grid">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="calendar-header-day">{day}</div>
        ))}
        
        {emptyCells.map((_, idx) => (
          <div key={`empty-${idx}`} className="calendar-day empty" />
        ))}
        
        {days.map(day => {
          const dayBookings = getDayBookings(day);
          const dayStyle = getDayStyle(day, dayBookings);
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          
          return (
            <div
              key={day.toString()}
              className={`calendar-day ${dayStyle} ${isSelected ? 'selected' : ''}`}
              onClick={() => setSelectedDate(day)}
            >
              <div className="day-number">{format(day, 'd')}</div>
              {dayBookings.length > 0 && (
                <div className="day-indicator">
                  {dayBookings.length} booking{dayBookings.length > 1 ? 's' : ''}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const selectedDateBookings = selectedDate ? getDayBookings(selectedDate) : [];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content host-calendar-modal" onClick={(e) => e.stopPropagation()}>
        <div className="calendar-header">
          <div className="calendar-title-row">
            <div className="calendar-title">
              <Calendar size={28} />
              <h2>Booking Calendar</h2>
            </div>
            <button className="close-btn" onClick={onClose}>&times;</button>
          </div>
          
          <div className="calendar-controls">
            <button 
              className="month-nav-btn"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <ChevronLeft size={20} />
            </button>
            <h3>{format(currentMonth, 'MMMM yyyy')}</h3>
            <button 
              className="month-nav-btn"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="calendar-legend">
            <div className="legend-item">
              <span className="legend-color confirmed"></span>
              <span>Confirmed</span>
            </div>
            <div className="legend-item">
              <span className="legend-color pending"></span>
              <span>Pending</span>
            </div>
            <div className="legend-item">
              <span className="legend-color completed"></span>
              <span>Completed</span>
            </div>
          </div>
        </div>

        <div className="calendar-body">
          <div className="calendar-section">
            {loading ? (
              <div className="loading-state">Loading calendar...</div>
            ) : (
              renderCalendar()
            )}
          </div>

          <div className="calendar-sidebar">
            <h3>
              {selectedDate 
                ? format(selectedDate, 'EEEE, MMMM d, yyyy')
                : 'Select a date'}
            </h3>
            
            {selectedDateBookings.length > 0 ? (
              <div className="date-bookings">
                {selectedDateBookings.map(booking => (
                  <div key={booking.id} className="calendar-booking-card">
                    <div className="booking-card-header">
                      <div className="booking-property">
                        <Home size={16} />
                        <span>{booking.listing.title}</span>
                      </div>
                      <span className={`booking-status ${booking.status.toLowerCase()}`}>
                        {booking.status}
                      </span>
                    </div>
                    
                    <div className="booking-card-body">
                      <div className="booking-card-row">
                        <User size={14} />
                        <span>{booking.user.name}</span>
                      </div>
                      
                      <div className="booking-card-row">
                        <Clock size={14} />
                        <span>
                          {format(new Date(booking.checkIn), 'MMM d')} - {format(new Date(booking.checkOut), 'MMM d')}
                        </span>
                      </div>
                      
                      <div className="booking-card-row">
                        <DollarSign size={14} />
                        <span>${booking.totalPrice.toFixed(2)}</span>
                      </div>
                      
                      <div className="booking-card-row guests-row">
                        <span>{booking.guests} guest{booking.guests > 1 ? 's' : ''}</span>
                      </div>
                    </div>
                    
                    {booking.user.phone && (
                      <div className="booking-contact">
                        <small>Contact: {booking.user.phone}</small>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : selectedDate ? (
              <div className="no-bookings">
                <Calendar size={48} style={{ opacity: 0.3 }} />
                <p>No bookings on this date</p>
              </div>
            ) : (
              <div className="no-selection">
                <p>Click on a date to view bookings</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HostCalendar;
