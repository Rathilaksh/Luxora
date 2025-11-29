import React, { useState, useRef, useEffect } from 'react';
import Map, { Marker, Popup, NavigationControl, GeolocateControl } from 'react-map-gl';
import { MapPin } from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';

// You'll need to set your Mapbox token
const MAPBOX_TOKEN = process.env.VITE_MAPBOX_TOKEN || 'pk.eyJ1IjoibHV4b3JhIiwiYSI6ImNtNGFyZWQ5dzB4NGsyanB5bGhjOTd3bXkifQ.demo'; // Replace with your token

export default function MapView({ listings, onListingClick, selectedListing }) {
  const [viewState, setViewState] = useState({
    longitude: -98.5795,
    latitude: 39.8283,
    zoom: 4
  });
  const [popupInfo, setPopupInfo] = useState(null);
  const mapRef = useRef();

  // Fit bounds to show all listings when they change
  useEffect(() => {
    if (listings.length > 0 && mapRef.current) {
      const validListings = listings.filter(l => l.latitude && l.longitude);
      
      if (validListings.length === 0) return;

      if (validListings.length === 1) {
        setViewState({
          longitude: validListings[0].longitude,
          latitude: validListings[0].latitude,
          zoom: 12
        });
      } else {
        const lngs = validListings.map(l => l.longitude);
        const lats = validListings.map(l => l.latitude);
        
        const bounds = [
          [Math.min(...lngs), Math.min(...lats)],
          [Math.max(...lngs), Math.max(...lats)]
        ];

        mapRef.current.fitBounds(bounds, {
          padding: 50,
          duration: 1000
        });
      }
    }
  }, [listings]);

  const validListings = listings.filter(l => l.latitude && l.longitude);

  return (
    <div className="map-container">
      <Map
        ref={mapRef}
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        mapboxAccessToken={MAPBOX_TOKEN}
        style={{ width: '100%', height: '100%' }}
      >
        <NavigationControl position="top-right" />
        <GeolocateControl
          position="top-right"
          trackUserLocation
          onGeolocate={(e) => {
            setViewState({
              longitude: e.coords.longitude,
              latitude: e.coords.latitude,
              zoom: 12
            });
          }}
        />

        {validListings.map(listing => (
          <Marker
            key={listing.id}
            longitude={listing.longitude}
            latitude={listing.latitude}
            anchor="bottom"
            onClick={e => {
              e.originalEvent.stopPropagation();
              setPopupInfo(listing);
            }}
          >
            <div 
              className={`map-marker ${selectedListing?.id === listing.id ? 'selected' : ''}`}
              style={{
                backgroundColor: selectedListing?.id === listing.id ? '#FF385C' : '#fff',
                color: selectedListing?.id === listing.id ? '#fff' : '#222',
                border: `2px solid ${selectedListing?.id === listing.id ? '#FF385C' : '#ddd'}`,
                padding: '6px 12px',
                borderRadius: '20px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                transition: 'all 0.2s',
              }}
            >
              ${listing.price}
            </div>
          </Marker>
        ))}

        {popupInfo && (
          <Popup
            longitude={popupInfo.longitude}
            latitude={popupInfo.latitude}
            anchor="top"
            onClose={() => setPopupInfo(null)}
            closeButton={true}
            closeOnClick={false}
          >
            <div className="map-popup" onClick={() => onListingClick(popupInfo)}>
              {popupInfo.images?.[0]?.url || popupInfo.image ? (
                <img 
                  src={popupInfo.images?.[0]?.url || popupInfo.image} 
                  alt={popupInfo.title}
                  style={{ width: '200px', height: '120px', objectFit: 'cover', borderRadius: '8px' }}
                />
              ) : null}
              <h3 style={{ fontSize: '14px', margin: '8px 0 4px', fontWeight: '600' }}>
                {popupInfo.title}
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#717171' }}>
                {popupInfo.city}, {popupInfo.country}
              </p>
              <p style={{ margin: '4px 0 0', fontSize: '14px', fontWeight: '600' }}>
                ${popupInfo.price}/night
              </p>
            </div>
          </Popup>
        )}
      </Map>

      {validListings.length === 0 && (
        <div className="map-empty-state">
          <MapPin size={48} />
          <p>No listings with location data</p>
          <small>Listings need latitude and longitude to appear on the map</small>
        </div>
      )}
    </div>
  );
}
