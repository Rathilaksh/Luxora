import { useState, useEffect } from 'react';
import { DayPicker } from 'react-day-picker';
import { format, addDays, isWithinInterval, parseISO } from 'date-fns';
import 'react-day-picker/dist/style.css';

export default function AvailabilityCalendar({ listingId, onSelect, selectedRange }) {
  const [blockedDates, setBlockedDates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAvailability();
  }, [listingId]);

  const loadAvailability = async () => {
    try {
      const response = await fetch(`/api/listings/${listingId}/availability`);
      const data = await response.json();
      
      // Convert date strings to Date objects and generate all dates in range
      const blocked = [];
      data.blockedDates.forEach(range => {
        const start = parseISO(range.from);
        const end = parseISO(range.to);
        
        // Add all dates between start and end
        let current = start;
        while (current <= end) {
          blocked.push(new Date(current));
          current = addDays(current, 1);
        }
      });
      
      setBlockedDates(blocked);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load availability:', err);
      setLoading(false);
    }
  };

  // Disable past dates and blocked dates
  const disabledDays = [
    { before: new Date() }, // Past dates
    ...blockedDates
  ];

  const handleSelect = (range) => {
    if (!range) {
      onSelect(null);
      return;
    }

    // Check if selected range overlaps with blocked dates
    if (range.from && range.to) {
      const hasBlockedDate = blockedDates.some(blockedDate => {
        return isWithinInterval(blockedDate, { start: range.from, end: range.to });
      });

      if (hasBlockedDate) {
        alert('Selected dates include unavailable dates. Please choose different dates.');
        onSelect(null);
        return;
      }
    }

    onSelect(range);
  };

  if (loading) {
    return (
      <div className="calendar-loading">
        <div className="spinner"></div>
        <p>Loading availability...</p>
      </div>
    );
  }

  return (
    <div className="availability-calendar">
      <DayPicker
        mode="range"
        selected={selectedRange}
        onSelect={handleSelect}
        disabled={disabledDays}
        numberOfMonths={2}
        fromDate={new Date()}
        modifiersClassNames={{
          selected: 'selected-day',
          today: 'today',
          disabled: 'disabled-day'
        }}
      />
      <div className="calendar-legend">
        <div className="legend-item">
          <span className="legend-box available"></span>
          <span>Available</span>
        </div>
        <div className="legend-item">
          <span className="legend-box blocked"></span>
          <span>Booked</span>
        </div>
        <div className="legend-item">
          <span className="legend-box selected"></span>
          <span>Your selection</span>
        </div>
      </div>
    </div>
  );
}
