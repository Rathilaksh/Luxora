import React, { useState, useEffect } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';

export default function FilterPanel({ filters, onFilterChange, amenities = [] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState(filters);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleApply = () => {
    onFilterChange(localFilters);
    setIsOpen(false);
  };

  const handleReset = () => {
    const resetFilters = {
      priceMin: '',
      priceMax: '',
      roomType: '',
      bedrooms: '',
      bathrooms: '',
      amenities: [],
      sortBy: '',
    };
    setLocalFilters(resetFilters);
    onFilterChange(resetFilters);
  };

  const toggleAmenity = (amenityId) => {
    const current = localFilters.amenities || [];
    const updated = current.includes(amenityId)
      ? current.filter(id => id !== amenityId)
      : [...current, amenityId];
    setLocalFilters({ ...localFilters, amenities: updated });
  };

  const activeFilterCount = Object.values(filters).filter(v => 
    v && (Array.isArray(v) ? v.length > 0 : v !== '')
  ).length;

  return (
    <>
      <button className="filter-toggle-btn" onClick={() => setIsOpen(!isOpen)}>
        <SlidersHorizontal size={18} />
        Filters
        {activeFilterCount > 0 && <span className="filter-badge">{activeFilterCount}</span>}
      </button>

      {isOpen && (
        <div className="filter-overlay" onClick={() => setIsOpen(false)}>
          <div className="filter-panel" onClick={(e) => e.stopPropagation()}>
            <div className="filter-header">
              <h2>Filters</h2>
              <button onClick={() => setIsOpen(false)} className="close-btn">
                <X size={24} />
              </button>
            </div>

            <div className="filter-body">
              {/* Price Range */}
              <div className="filter-section">
                <h3>Price Range</h3>
                <div className="price-inputs">
                  <input
                    type="number"
                    placeholder="Min"
                    value={localFilters.priceMin || ''}
                    onChange={(e) => setLocalFilters({ ...localFilters, priceMin: e.target.value })}
                  />
                  <span>—</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={localFilters.priceMax || ''}
                    onChange={(e) => setLocalFilters({ ...localFilters, priceMax: e.target.value })}
                  />
                </div>
              </div>

              {/* Room Type */}
              <div className="filter-section">
                <h3>Room Type</h3>
                <div className="radio-group">
                  {['ENTIRE_PLACE', 'PRIVATE_ROOM', 'SHARED_ROOM'].map(type => (
                    <label key={type} className="radio-label">
                      <input
                        type="radio"
                        name="roomType"
                        value={type}
                        checked={localFilters.roomType === type}
                        onChange={(e) => setLocalFilters({ ...localFilters, roomType: e.target.value })}
                      />
                      {type.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                    </label>
                  ))}
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="roomType"
                      value=""
                      checked={!localFilters.roomType}
                      onChange={() => setLocalFilters({ ...localFilters, roomType: '' })}
                    />
                    Any
                  </label>
                </div>
              </div>

              {/* Bedrooms & Bathrooms */}
              <div className="filter-section">
                <h3>Bedrooms</h3>
                <div className="number-selector">
                  {[1, 2, 3, 4, 5].map(num => (
                    <button
                      key={num}
                      className={`num-btn ${localFilters.bedrooms == num ? 'active' : ''}`}
                      onClick={() => setLocalFilters({ ...localFilters, bedrooms: num })}
                    >
                      {num}+
                    </button>
                  ))}
                  <button
                    className={`num-btn ${!localFilters.bedrooms ? 'active' : ''}`}
                    onClick={() => setLocalFilters({ ...localFilters, bedrooms: '' })}
                  >
                    Any
                  </button>
                </div>
              </div>

              <div className="filter-section">
                <h3>Bathrooms</h3>
                <div className="number-selector">
                  {[1, 2, 3, 4].map(num => (
                    <button
                      key={num}
                      className={`num-btn ${localFilters.bathrooms == num ? 'active' : ''}`}
                      onClick={() => setLocalFilters({ ...localFilters, bathrooms: num })}
                    >
                      {num}+
                    </button>
                  ))}
                  <button
                    className={`num-btn ${!localFilters.bathrooms ? 'active' : ''}`}
                    onClick={() => setLocalFilters({ ...localFilters, bathrooms: '' })}
                  >
                    Any
                  </button>
                </div>
              </div>

              {/* Amenities */}
              {amenities.length > 0 && (
                <div className="filter-section">
                  <h3>Amenities</h3>
                  <div className="amenity-grid">
                    {amenities.map(amenity => (
                      <label key={amenity.id} className="amenity-checkbox">
                        <input
                          type="checkbox"
                          checked={(localFilters.amenities || []).includes(amenity.id)}
                          onChange={() => toggleAmenity(amenity.id)}
                        />
                        <span>{amenity.icon} {amenity.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Sort By */}
              <div className="filter-section">
                <h3>Sort By</h3>
                <select
                  value={localFilters.sortBy || ''}
                  onChange={(e) => setLocalFilters({ ...localFilters, sortBy: e.target.value })}
                  className="sort-select"
                >
                  <option value="">Recommended</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="rating">Highest Rated</option>
                </select>
              </div>
            </div>

            <div className="filter-footer">
              <button onClick={handleReset} className="reset-btn">Clear all</button>
              <button onClick={handleApply} className="apply-btn">Show results</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
