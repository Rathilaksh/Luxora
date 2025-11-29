import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Search, MapPin, Calendar, Users } from 'lucide-react';

export default function SearchBar({ onSearch, initialFilters = {} }) {
  const [location, setLocation] = useState(initialFilters.location || '');
  const [checkIn, setCheckIn] = useState(initialFilters.checkIn ? new Date(initialFilters.checkIn) : null);
  const [checkOut, setCheckOut] = useState(initialFilters.checkOut ? new Date(initialFilters.checkOut) : null);
  const [guests, setGuests] = useState(initialFilters.guests || 1);
  const [showGuestPicker, setShowGuestPicker] = useState(false);

  const handleSearch = () => {
    const filters = {
      location: location.trim(),
      checkIn: checkIn ? checkIn.toISOString().split('T')[0] : null,
      checkOut: checkOut ? checkOut.toISOString().split('T')[0] : null,
      guests: guests > 0 ? guests : null,
    };
    onSearch(filters);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="search-bar">
      <div className="search-field">
        <MapPin size={18} />
        <input
          type="text"
          placeholder="Where are you going?"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          onKeyPress={handleKeyPress}
        />
      </div>

      <div className="search-field">
        <Calendar size={18} />
        <DatePicker
          selected={checkIn}
          onChange={setCheckIn}
          selectsStart
          startDate={checkIn}
          endDate={checkOut}
          minDate={new Date()}
          placeholderText="Check in"
          dateFormat="MMM d"
        />
      </div>

      <div className="search-field">
        <Calendar size={18} />
        <DatePicker
          selected={checkOut}
          onChange={setCheckOut}
          selectsEnd
          startDate={checkIn}
          endDate={checkOut}
          minDate={checkIn || new Date()}
          placeholderText="Check out"
          dateFormat="MMM d"
        />
      </div>

      <div className="search-field" style={{ position: 'relative' }}>
        <Users size={18} />
        <input
          type="text"
          placeholder="Guests"
          value={guests > 0 ? `${guests} guest${guests > 1 ? 's' : ''}` : ''}
          readOnly
          onClick={() => setShowGuestPicker(!showGuestPicker)}
          style={{ cursor: 'pointer' }}
        />
        
        {showGuestPicker && (
          <div className="guest-picker">
            <div className="guest-picker-row">
              <span>Guests</span>
              <div className="guest-counter">
                <button onClick={() => setGuests(Math.max(1, guests - 1))}>−</button>
                <span>{guests}</span>
                <button onClick={() => setGuests(guests + 1)}>+</button>
              </div>
            </div>
          </div>
        )}
      </div>

      <button className="search-btn" onClick={handleSearch}>
        <Search size={18} />
        Search
      </button>
    </div>
  );
}
