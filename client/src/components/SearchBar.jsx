import React, { useState, useEffect, useRef } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Search, MapPin, Calendar, Users, X } from 'lucide-react';

export default function SearchBar({ onSearch, initialFilters = {} }) {
  const [location, setLocation] = useState(initialFilters.location || '');
  const [checkIn, setCheckIn] = useState(initialFilters.checkIn ? new Date(initialFilters.checkIn) : null);
  const [checkOut, setCheckOut] = useState(initialFilters.checkOut ? new Date(initialFilters.checkOut) : null);
  const [guests, setGuests] = useState(initialFilters.guests || 1);
  const [showGuestPicker, setShowGuestPicker] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef(null);
  const suggestionsRef = useRef(null);

  // Popular destinations for suggestions
  const popularDestinations = [
    { name: 'New York', country: 'USA', emoji: '🗽' },
    { name: 'Paris', country: 'France', emoji: '🗼' },
    { name: 'Tokyo', country: 'Japan', emoji: '🗾' },
    { name: 'London', country: 'UK', emoji: '🏰' },
    { name: 'Dubai', country: 'UAE', emoji: '🏜️' },
    { name: 'Sydney', country: 'Australia', emoji: '🦘' },
    { name: 'Rome', country: 'Italy', emoji: '🏛️' },
    { name: 'Barcelona', country: 'Spain', emoji: '🏖️' },
  ];

  // Fetch location suggestions with debouncing
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (location.trim().length > 1) {
      searchTimeoutRef.current = setTimeout(() => {
        fetchSuggestions(location);
      }, 300);
    } else {
      setSuggestions([]);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [location]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchSuggestions = async (query) => {
    try {
      setIsSearching(true);
      // Filter popular destinations or fetch from API
      const filtered = popularDestinations.filter(dest =>
        dest.name.toLowerCase().includes(query.toLowerCase()) ||
        dest.country.toLowerCase().includes(query.toLowerCase())
      );
      
      // Also fetch from actual listings
      const res = await fetch(`/api/listings?city=${encodeURIComponent(query)}`);
      if (res.ok) {
        const listings = await res.json();
        const uniqueCities = [...new Set(listings.map(l => l.city))].slice(0, 5);
        const citySuggestions = uniqueCities.map(city => ({
          name: city,
          country: 'USA',
          emoji: '📍'
        }));
        
        setSuggestions([...filtered, ...citySuggestions].slice(0, 6));
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const selectSuggestion = (suggestion) => {
    setLocation(suggestion.name);
    setShowSuggestions(false);
    // Auto-trigger search
    setTimeout(() => handleSearch(suggestion.name), 100);
  };

  const handleSearch = (customLocation) => {
    const searchLocation = customLocation || location.trim();
    const filters = {
      location: searchLocation,
      checkIn: checkIn ? checkIn.toISOString().split('T')[0] : null,
      checkOut: checkOut ? checkOut.toISOString().split('T')[0] : null,
      guests: guests > 0 ? guests : null,
    };
    onSearch(filters);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      setShowSuggestions(false);
      handleSearch();
    }
  };

  const clearLocation = () => {
    setLocation('');
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const clearDates = () => {
    setCheckIn(null);
    setCheckOut(null);
  };

  return (
    <div className="search-bar">
      <div className="search-field" ref={suggestionsRef} style={{ position: 'relative' }}>
        <MapPin size={18} />
        <input
          type="text"
          placeholder="Where are you going?"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          onKeyPress={handleKeyPress}
          onFocus={() => location && setShowSuggestions(true)}
        />
        {location && (
          <button className="clear-btn" onClick={clearLocation}>
            <X size={16} />
          </button>
        )}
        
        {showSuggestions && suggestions.length > 0 && (
          <div className="location-suggestions">
            {suggestions.map((suggestion, idx) => (
              <div
                key={idx}
                className="suggestion-item"
                onClick={() => selectSuggestion(suggestion)}
              >
                <span className="suggestion-emoji">{suggestion.emoji}</span>
                <div className="suggestion-info">
                  <span className="suggestion-name">{suggestion.name}</span>
                  <span className="suggestion-country">{suggestion.country}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="search-field date-field">
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
        {checkIn && (
          <button className="clear-btn-small" onClick={clearDates} title="Clear dates">
            <X size={14} />
          </button>
        )}
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
