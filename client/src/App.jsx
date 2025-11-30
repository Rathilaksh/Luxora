import React, { useEffect, useMemo, useState } from 'react';
import './styles.css';
import ImageGallery from './components/ImageGallery';
import UserProfile from './components/UserProfile';
import SearchBar from './components/SearchBar';
import FilterPanel from './components/FilterPanel';
// MapView disabled temporarily
import BookingForm from './components/BookingForm';
import PaymentSuccess from './components/PaymentSuccess';
import BookingDashboard from './components/BookingDashboard';
import HostDashboard from './components/HostDashboard';
import Login from './components/Login';
import Register from './components/Register';
import { useAuth } from './context/AuthContext';
import { Grid, Map as MapIcon } from 'lucide-react';

const API = '';// same origin

function useListings(filters, reloadKey) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [amenities, setAmenities] = useState([]);
  
  useEffect(() => {
    // Fetch amenities once
    fetch('/api/amenities')
      .then(r => r.ok ? r.json() : [])
      .then(list => setAmenities(Array.isArray(list) ? list : []))
      .catch(() => setAmenities([]));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    
    // Use search endpoint if we have advanced filters, otherwise legacy endpoint
    const useSearchEndpoint = filters.location || filters.checkIn || filters.checkOut || 
                              filters.guests || filters.bedrooms || filters.bathrooms || 
                              filters.amenities?.length > 0 || filters.sortBy;
    
    if (filters.location) params.set('location', filters.location);
    if (filters.checkIn) params.set('checkIn', filters.checkIn);
    if (filters.checkOut) params.set('checkOut', filters.checkOut);
    if (filters.guests) params.set('guests', filters.guests);
    if (filters.city) params.set('city', filters.city);
    if (filters.roomType) params.set('roomType', filters.roomType);
    if (filters.priceMin) params.set('priceMin', filters.priceMin);
    if (filters.priceMax) params.set('priceMax', filters.priceMax);
    if (filters.bedrooms) params.set('bedrooms', filters.bedrooms);
    if (filters.bathrooms) params.set('bathrooms', filters.bathrooms);
    if (filters.sortBy) params.set('sortBy', filters.sortBy);
    if (filters.amenities && filters.amenities.length > 0) {
      params.set('amenities', filters.amenities.join(','));
    }
    if (filters.instantBook) params.set('instantBook', 'true');
    if (filters.petFriendly) params.set('petFriendly', 'true');
    
    setLoading(true);
    const endpoint = useSearchEndpoint ? '/api/listings/search' : '/api/listings';
    fetch(endpoint + (params.toString() ? ('?' + params.toString()) : ''))
      .then(r => r.ok ? r.json() : Promise.reject(new Error('Failed')))
      .then(list => { Array.isArray(list) ? setData(list) : setData([]); setError(null); })
      .catch(e => { setError(e); setData([]); })
      .finally(() => setLoading(false));
  }, [filters, reloadKey]);
  
  return { listings: data, loading, error, amenities };
}

function Stars({ value, reviewCount }) {
  if (!value) return <span style={{ color: 'var(--muted)', fontSize: '.8rem' }}>New</span>;
  const v = Math.round(value * 10) / 10;
  const full = Math.round(v);
  return (
    <span title={`${v} (${reviewCount||0})`} style={{ fontSize: '.85rem', color: '#111' }}>
      {'★'.repeat(Math.min(full,5))}
      <span style={{ color: 'var(--muted)' }}>{'★'.repeat(Math.max(0, 5-full))}</span>
      <span style={{ marginLeft: 6, color: 'var(--muted)', fontSize: '.8rem' }}>{v} ({reviewCount||0})</span>
    </span>
  );
}

function ListingCard({ listing, onClick, inWishlist, toggleWishlist, canDelete, onDelete }) {
  // Use first image from images array, fallback to single image field
  const displayImage = listing.images && listing.images.length > 0
    ? listing.images[0].url
    : listing.image;

  return (
    <article className="card" onClick={() => onClick(listing)}>
      {displayImage ? (
        <img
          className="card-img"
          src={displayImage}
          alt={listing.title}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={(e)=>{ e.currentTarget.onerror=null; e.currentTarget.src='https://placehold.co/800x500?text=Luxora'; }}
        />
      ) : (
        <img
          className="card-img"
          src={'https://placehold.co/800x500?text=Luxora'}
          alt={listing.title}
          loading="lazy"
        />
      )}
      {typeof inWishlist === 'boolean' && (
        <button
          aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
          className="heart-btn"
          onClick={(e) => { e.stopPropagation(); toggleWishlist(listing.id, inWishlist); }}
        >
          {inWishlist ? '❤️' : '🤍'}
        </button>
      )}
      {canDelete && (
        <button
          aria-label="Delete listing"
          className="delete-btn"
          onClick={(e) => { e.stopPropagation(); if (confirm('Delete this listing?')) onDelete(listing.id); }}
        >🗑️</button>
      )}
      <div className="card-body">
        <h3 className="card-title">{listing.title}</h3>
        <div className="card-meta" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8 }}>
          <span>{listing.city} • ${listing.price}/night</span>
          <Stars value={listing.averageRating} reviewCount={listing.reviewCount} />
        </div>
        <div style={{ fontSize:'.75rem', color:'var(--muted)', marginTop:4 }}>
          Up to {listing.maxGuests} guest{listing.maxGuests !== 1 ? 's' : ''}
        </div>
      </div>
    </article>
  );
}

function Pagination({ page, total, onChange }) {
  if (total <= 1) return null;
  const pages = Array.from({ length: total }, (_, i) => i + 1);
  return (
    <div className="pagination">
      {pages.map(p => (
        <button key={p} className={p === page ? 'active' : ''} onClick={() => onChange(p)}>{p}</button>
      ))}
    </div>
  );
}

function BookingBox({ listing, token, onClose }) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [guests, setGuests] = useState(1);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const unavailable = useMemo(() => {
    const bs = (listing?.bookings || []).filter(b => b.status !== 'CANCELLED');
    return bs.map(b => ({
      start: new Date(b.startDate || b.checkIn),
      end: new Date(b.endDate || b.checkOut)
    })).filter(r => r.start instanceof Date && !isNaN(r.start) && r.end instanceof Date && !isNaN(r.end));
  }, [listing]);

  function overlapsBlocked(s, e) {
    if (!s || !e) return false;
    for (const r of unavailable) {
      // overlap if s <= r.end && e >= r.start
      if (s <= r.end && e >= r.start) return true;
    }
    return false;
  }

  const nights = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const s = new Date(startDate); const e = new Date(endDate);
    if (e <= s) return 0;
    return Math.ceil((e - s) / (24 * 60 * 60 * 1000));
  }, [startDate, endDate]);

  const pricing = useMemo(() => {
    if (!nights || !listing) return { base: 0, extraGuest: 0, total: 0 };
    const basePrice = nights * listing.price;
    const baseGuests = listing.baseGuests || 2;
    const extraGuestFee = listing.extraGuestFee || 0;
    const extraGuests = Math.max(0, guests - baseGuests);
    const extraGuestTotal = extraGuests * extraGuestFee * nights;
    return {
      base: basePrice,
      extraGuest: extraGuestTotal,
      total: basePrice + extraGuestTotal,
      extraGuests,
      extraGuestFee
    };
  }, [nights, guests, listing]);

  function book() {
    if (!token) { setStatus({ type: 'error', msg: 'Login required' }); return; }
    if (!nights) { setStatus({ type: 'error', msg: 'Select valid dates' }); return; }
    const s = new Date(startDate); const e = new Date(endDate);
    if (overlapsBlocked(s, e)) { setStatus({ type: 'error', msg: 'Selected dates overlap with an existing booking' }); return; }
    setLoading(true);
    fetch('/api/bookings', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ listingId: listing.id, startDate, endDate, guests })
    }).then(r => r.json()).then(data => {
      if (data.error) setStatus({ type: 'error', msg: data.error }); else setStatus({ type: 'success', msg: 'Booked!' });
    }).catch(() => setStatus({ type: 'error', msg: 'Failed' })).finally(() => setLoading(false));
  }

  return (
    <div className="booking-box">
      <strong>Book this listing</strong>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} min={new Date().toISOString().slice(0,10)} />
        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={new Date().toISOString().slice(0,10)} />
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
        <label style={{ fontSize:'.85rem' }}>Guests:</label>
        <select value={guests} onChange={e => setGuests(Number(e.target.value))} style={{ padding:'.4rem', borderRadius:'var(--radius-sm)', border:'1px solid var(--border)' }}>
          {Array.from({ length: listing?.maxGuests || 2 }, (_, i) => i + 1).map(n => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        <span style={{ fontSize:'.75rem', color:'var(--muted)' }}>
          (max {listing?.maxGuests || 2})
        </span>
      </div>
      <MiniCalendar unavailable={unavailable} onPick={(d)=> {
        const iso = d.toISOString().slice(0,10);
        // Simple behavior: first click sets start, second sets end (if valid)
        if (!startDate) setStartDate(iso);
        else if (!endDate) {
          const s = new Date(startDate);
          if (d <= s) setStartDate(iso); // reset start if clicked before
          else setEndDate(iso);
        } else { setStartDate(iso); setEndDate(''); }
      }} />
      {unavailable.length > 0 && (
        <div style={{ fontSize: '.75rem', color: 'var(--muted)' }}>
          Unavailable ranges:
          <ul style={{ margin: '6px 0 0', paddingLeft: '18px' }}>
            {unavailable.slice(0,5).map((r, i) => (
              <li key={i}>{r.start.toLocaleDateString()} → {r.end.toLocaleDateString()}</li>
            ))}
            {unavailable.length > 5 && <li>+{unavailable.length - 5} more</li>}
          </ul>
        </div>
      )}
      {nights > 0 && (
        <div style={{ fontSize:'.85rem', borderTop:'1px solid var(--border)', paddingTop:'.5rem', marginTop:'.5rem' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
            <span>${listing?.price} × {nights} night{nights !== 1 ? 's' : ''}</span>
            <span>${pricing.base}</span>
          </div>
          {pricing.extraGuests > 0 && (
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4, color:'var(--muted)', fontSize:'.8rem' }}>
              <span>Extra guest fee ({pricing.extraGuests} × ${pricing.extraGuestFee} × {nights})</span>
              <span>+${pricing.extraGuest}</span>
            </div>
          )}
          <div style={{ display:'flex', justifyContent:'space-between', fontWeight:'600', borderTop:'1px solid var(--border)', paddingTop:4, marginTop:4 }}>
            <span>Total</span>
            <span>${pricing.total}</span>
          </div>
        </div>
      )}
      {!nights && <div style={{ fontSize:'.85rem', color:'var(--muted)' }}>Select dates to see pricing</div>}
      <button onClick={book} disabled={loading}>{loading ? 'Booking...' : 'Book'}</button>
      {status && <div className={status.type === 'success' ? 'alert success' : 'alert'}>{status.msg}</div>}
      <button style={{ background:'#fff', color:'#333', border:'1px solid #ccc' }} onClick={onClose}>Close</button>
    </div>
  );
}

function MiniCalendar({ unavailable, onPick }){
  const [monthShift, setMonthShift] = useState(0);
  const base = new Date();
  const year = base.getFullYear();
  const month = base.getMonth() + monthShift;
  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month+1, 0);
  const startWeekday = firstOfMonth.getDay(); // 0-6
  const days = lastOfMonth.getDate();

  function isBlocked(d){
    // Block past dates
    const today = new Date(); today.setHours(0,0,0,0);
    const dd = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (dd < today) return true;
    for (const r of unavailable){
      // Compare by day resolution
      const rdStart = new Date(r.start.getFullYear(), r.start.getMonth(), r.start.getDate());
      const rdEnd = new Date(r.end.getFullYear(), r.end.getMonth(), r.end.getDate());
      if (dd >= rdStart && dd <= rdEnd) return true;
    }
    return false;
  }

  const grid = [];
  for (let i=0;i<startWeekday;i++) grid.push(null);
  for (let day=1; day<=days; day++) grid.push(day);

  const displayLabel = firstOfMonth.toLocaleString(undefined, { month:'long', year:'numeric' });

  return (
    <div className="mini-cal">
      <div className="mini-cal-header">
        <button className="mini-cal-nav" onClick={()=> setMonthShift(s=> s-1)}>&lt;</button>
        <span className="mini-cal-title">{displayLabel}</span>
        <button className="mini-cal-nav" onClick={()=> setMonthShift(s=> s+1)}>&gt;</button>
      </div>
      <div className="mini-cal-grid">
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(w=> <div key={w} className="mini-cal-dow">{w}</div>)}
        {grid.map((d, idx) => {
          if (d === null) return <div key={idx} className="mini-cal-cell empty" />;
          const dateObj = new Date(year, month, d);
          const blocked = isBlocked(dateObj);
          return (
            <button
              key={idx}
              className={"mini-cal-cell" + (blocked?" blocked":"")}
              onClick={()=> !blocked && onPick(dateObj)}
              disabled={blocked}
            >{d}</button>
          );
        })}
      </div>
    </div>
  );
}

function ListingModal({ listing, token, handleBookNow, onClose }) {
  const [details, setDetails] = useState(listing);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [revLoading, setRevLoading] = useState(false);
  const [myReview, setMyReview] = useState({ rating: 5, comment: '' });
  const [rvError, setRvError] = useState(null);
  const [msgMode, setMsgMode] = useState(false);
  const [message, setMessage] = useState('');
  const [msgStatus, setMsgStatus] = useState(null);
  const [showHostProfile, setShowHostProfile] = useState(false);

  useEffect(() => {
    if (!listing) return;
    setLoading(true);
    setErr(null);
    fetch(`/api/listings/${listing.id}`)
      .then(r => r.ok ? r.json() : Promise.reject(new Error('Failed to load')))
      .then(d => setDetails(d))
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, [listing?.id]);

  if (!listing) return null;

  const d = details || listing;

  function submitReview(e) {
    e.preventDefault();
    if (!token) { setRvError('Login required to review'); return; }
    if (!myReview.rating || myReview.rating < 1 || myReview.rating > 5) { setRvError('Rating 1-5'); return; }
    setRevLoading(true); setRvError(null);
    fetch(`/api/listings/${listing.id}/reviews`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ rating: Number(myReview.rating), comment: myReview.comment })
    })
      .then(r => r.json())
      .then(async (data) => {
        if (data.error) { setRvError(data.error); return; }
        // Refresh details
        const fresh = await fetch(`/api/listings/${listing.id}`).then(r => r.json());
        setDetails(fresh);
        setMyReview({ rating: 5, comment: '' });
      })
      .catch(() => setRvError('Failed to submit'))
      .finally(() => setRevLoading(false));
  }

  function sendMessage(e) {
    e.preventDefault();
    if (!token) { setMsgStatus({ type:'error', msg:'Login required' }); return; }
    if (!message.trim()) { setMsgStatus({ type:'error', msg:'Enter a message' }); return; }
    setMsgStatus(null);
    fetch('/api/messages', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ receiverId: d?.hostId, content: message.trim(), listingId: d?.id })
    }).then(r => r.json()).then(data => {
      if (data.error) setMsgStatus({ type:'error', msg: data.error });
      else { setMsgStatus({ type:'success', msg:'Message sent' }); setMessage(''); }
    }).catch(()=> setMsgStatus({ type:'error', msg:'Failed to send' }));
  }

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="close" onClick={onClose}>✕</button>
        
        <ImageGallery images={d.images} fallbackImage={d.image} />
        
        <div style={{ padding:'1.2rem 1.3rem 1.4rem' }}>
          <h2 style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8 }}>
            <span>{d.title}</span>
            <Stars value={d.averageRating} reviewCount={d.reviewCount} />
          </h2>
          <p><strong>{d.city}</strong></p>
          {d.host && (
            <div style={{ display:'flex', alignItems:'center', gap:12, margin:'12px 0', padding:'12px', background:'#f6f7fb', borderRadius:'var(--radius-sm)', cursor:'pointer' }} onClick={() => setShowHostProfile(true)}>
              {d.host.avatar ? (
                <img src={d.host.avatar} alt={d.host.name} style={{ width:48, height:48, borderRadius:'999px', objectFit:'cover' }} />
              ) : (
                <div style={{ width:48, height:48, borderRadius:'999px', background:'var(--border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.2rem' }}>👤</div>
              )}
              <div>
                <strong>{d.host.name}</strong>
                {d.host.isVerified && <span style={{ marginLeft:6, color:'#4caf50', fontSize:'.85rem' }}>✓ Verified</span>}
                {d.host.isSuperhost && <span style={{ marginLeft:6, color:'var(--accent)', fontSize:'.85rem' }}>★ Superhost</span>}
                <div style={{ fontSize:'.75rem', color:'var(--muted)' }}>Host</div>
              </div>
            </div>
          )}
          <p>{d.description}</p>
          <div style={{ display:'flex', gap:'1rem', fontSize:'.9rem', color:'#555', marginBottom:'.5rem' }}>
            <span>🛏️ {d.bedrooms} bed{d.bedrooms !== 1 ? 's' : ''}</span>
            <span>🛁 {d.bathrooms} bath{d.bathrooms !== 1 ? 's' : ''}</span>
            <span>👥 Up to {d.maxGuests} guest{d.maxGuests !== 1 ? 's' : ''}</span>
          </div>
          <p><strong>${d.price}/night</strong> {d.baseGuests > 0 && d.extraGuestFee > 0 && <span style={{ fontSize:'.8rem', color:'var(--muted)' }}>({d.baseGuests} guest{d.baseGuests !== 1 ? 's' : ''} included, +${d.extraGuestFee}/extra guest)</span>}</p>
          {d.amenities && d.amenities.length > 0 && (
            <div style={{ display:'flex', flexWrap:'wrap', gap:8, margin:'8px 0' }}>
              {d.amenities.slice(0,12).map((a) => (
                <span key={a.amenity.id} className="tag" title={a.amenity.name}>
                  {amenityToIcon(a.amenity.name)} {a.amenity.name}
                </span>
              ))}
            </div>
          )}
          {loading && <div className="alert" style={{ marginBottom: '0.5rem' }}>Loading details…</div>}
          {err && <div className="alert" style={{ marginBottom: '0.5rem' }}>{String(err)}</div>}

          <div style={{ margin:'1rem 0' }}>
            <button 
              className="btn-primary"
              style={{ width:'100%', padding:'0.75rem', fontSize:'1rem', background:'var(--accent)', color:'white', border:'none', borderRadius:'var(--radius-sm)', cursor:'pointer' }}
              onClick={() => {
                handleBookNow(d);
                onClose();
              }}
            >
              Book Now - ${d.price}/night
            </button>
          </div>

          <hr style={{ border:'none', borderTop:'1px solid var(--border)', margin:'1rem 0' }} />
          <div>
            <h3 style={{ margin: '0 0 .5rem' }}>Reviews</h3>
            {d.reviews && d.reviews.length > 0 ? (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display:'flex', flexDirection:'column', gap:8 }}>
                {d.reviews.map(r => (
                  <li key={r.id} style={{ background:'#fafafa', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', padding:'.5rem .6rem' }}>
                    <div style={{ display:'flex', justifyContent:'space-between' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        {r.user?.avatar ? (
                          <img src={r.user.avatar} alt={r.user.name} style={{ width:32, height:32, borderRadius:'999px', objectFit:'cover' }} />
                        ) : null}
                        <strong>{r.user?.name || 'Guest'}</strong>
                      </div>
                      <span>{'★'.repeat(r.rating ?? r.overallRating)}<span style={{ color:'var(--muted)' }}>{'★'.repeat(5 - (r.rating ?? r.overallRating))}</span></span>
                    </div>
                    {r.comment && <div style={{ marginTop: 4 }}>{r.comment}</div>}
                    <div style={{ color:'var(--muted)', fontSize:'.75rem', marginTop:4 }}>{new Date(r.createdAt).toLocaleDateString()}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="alert">No reviews yet.</div>
            )}
            <form onSubmit={submitReview} style={{ marginTop: '.75rem', display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
              <label>Rate:
                <select value={myReview.rating} onChange={e=> setMyReview(m=> ({...m, rating: Number(e.target.value)}))} style={{ marginLeft: 6 }}>
                  {[1,2,3,4,5].map(n=> <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
              <input placeholder="Write a short review" value={myReview.comment} onChange={e=> setMyReview(m=> ({...m, comment:e.target.value}))} style={{ flex:1, minWidth:200 }} />
              <button disabled={revLoading}>{revLoading ? 'Submitting…' : 'Post Review'}</button>
              {rvError && <span className="alert" style={{ marginLeft:8 }}>{rvError}</span>}
            </form>
          </div>

          <hr style={{ border:'none', borderTop:'1px solid var(--border)', margin:'1rem 0' }} />
          <div>
            <h3 style={{ margin: '0 0 .5rem' }}>Contact host</h3>
            <button className="theme-toggle" onClick={()=> setMsgMode(m=> !m)}>{msgMode ? 'Hide' : 'Message host'}</button>
            {msgMode && (
              <form onSubmit={sendMessage} style={{ marginTop: 8, display:'flex', gap:8 }}>
                <input placeholder="Say hello…" value={message} onChange={e=> setMessage(e.target.value)} style={{ flex:1 }} />
                <button type="submit">Send</button>
                {msgStatus && <span className={msgStatus.type==='success'?'alert success':'alert'} style={{ marginLeft:8 }}>{msgStatus.msg}</span>}
              </form>
            )}
          </div>
        </div>
      </div>

      {showHostProfile && d.host && (
        <UserProfile 
          user={d.host} 
          token={token} 
          onClose={() => setShowHostProfile(false)}
          onUpdate={(updatedHost) => {
            setDetails({ ...d, host: updatedHost });
          }}
        />
      )}
    </div>
  );
}

export default function App() {
  const { user, token, logout } = useAuth();
  
  // Initialize filters from URL params
  const getFiltersFromURL = () => {
    const params = new URLSearchParams(window.location.search);
    return {
      location: params.get('location') || '',
      checkIn: params.get('checkIn') || null,
      checkOut: params.get('checkOut') || null,
      guests: params.get('guests') ? Number(params.get('guests')) : null,
      city: params.get('city') || '',
      roomType: params.get('roomType') || '',
      priceMin: params.get('priceMin') || '',
      priceMax: params.get('priceMax') || '',
      bedrooms: params.get('bedrooms') || '',
      bathrooms: params.get('bathrooms') || '',
      amenities: params.get('amenities') ? params.get('amenities').split(',').map(Number) : [],
      sortBy: params.get('sortBy') || '',
      instantBook: params.get('instantBook') === 'true',
      petFriendly: params.get('petFriendly') === 'true',
    };
  };
  
  // Search and filter state
  const [filters, setFilters] = useState(getFiltersFromURL);
  const [term, setTerm] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 12;
  const [selected, setSelected] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const { listings, loading, error, amenities } = useListings(filters, reloadKey);
  const [view, setView] = useState('browse'); // browse | wishlist | messages | conversation | profile | bookings
  const [conversationWith, setConversationWith] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  // Map view disabled; always use grid
  
  // Booking and payment state
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [bookingListing, setBookingListing] = useState(null);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [paymentSessionId, setPaymentSessionId] = useState(null);
  const [showBookingDashboard, setShowBookingDashboard] = useState(false);
  const [showHostDashboard, setShowHostDashboard] = useState(false);
  
  // Auth modal state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'

  // Check for payment success on load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    const sessionId = urlParams.get('session_id');
    
    if (paymentStatus === 'success' && sessionId) {
      setPaymentSessionId(sessionId);
      setShowPaymentSuccess(true);
      // Clean URL
      window.history.replaceState({}, '', '/');
    }
  }, []);

  const handleBookNow = (listing) => {
    if (!token) {
      setAuthMode('login');
      setShowAuthModal(true);
      return;
    }
    setBookingListing(listing);
    setShowBookingForm(true);
  };

  // Search handlers
  const handleSearch = (searchFilters) => {
    setFilters(prev => ({
      ...prev,
      location: searchFilters.location || '',
      checkIn: searchFilters.checkIn || null,
      checkOut: searchFilters.checkOut || null,
      guests: searchFilters.guests || null,
    }));
    setPage(1);
  };

  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPage(1);
  };

  // Sync filters to URL for shareable search links
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.location) params.set('location', filters.location);
    if (filters.checkIn) params.set('checkIn', filters.checkIn);
    if (filters.checkOut) params.set('checkOut', filters.checkOut);
    if (filters.guests) params.set('guests', filters.guests.toString());
    if (filters.city) params.set('city', filters.city);
    if (filters.roomType) params.set('roomType', filters.roomType);
    if (filters.priceMin) params.set('priceMin', filters.priceMin);
    if (filters.priceMax) params.set('priceMax', filters.priceMax);
    if (filters.bedrooms) params.set('bedrooms', filters.bedrooms);
    if (filters.bathrooms) params.set('bathrooms', filters.bathrooms);
    if (filters.amenities?.length > 0) params.set('amenities', filters.amenities.join(','));
    if (filters.sortBy) params.set('sortBy', filters.sortBy);
    if (filters.instantBook) params.set('instantBook', 'true');
    if (filters.petFriendly) params.set('petFriendly', 'true');
    
    const newURL = params.toString() ? `?${params.toString()}` : window.location.pathname;
    window.history.replaceState({}, '', newURL);
  }, [filters]);

  // Wishlist state
  const [wishlistIds, setWishlistIds] = useState(new Set());
  const [wishlistItems, setWishlistItems] = useState([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!token) { setWishlistIds(new Set()); setWishlistItems([]); return; }
      try {
        const res = await fetch('/api/wishlists', { headers: { Authorization: 'Bearer ' + token } });
        if (!res.ok) throw new Error('fail');
        const ws = await res.json();
        if (cancelled) return;
        setWishlistIds(new Set(ws.map(w => w.listingId)));
        setWishlistItems(ws);
      } catch {}
    }
    load();
    return () => { cancelled = true; };
  }, [token, reloadKey]);

  function toggleWishlist(listingId, currentlyIn) {
    if (!token) return; // silent; could show toast
    if (currentlyIn) {
      fetch(`/api/wishlists/${listingId}`, { method: 'DELETE', headers: { Authorization: 'Bearer ' + token } })
        .then(() => {
          setWishlistIds(prev => { const n = new Set(prev); n.delete(listingId); return n; });
          setWishlistItems(items => items.filter(i => i.listingId !== listingId));
        });
    } else {
      fetch(`/api/wishlists`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ listingId }) })
        .then(() => {
          setWishlistIds(prev => { const n = new Set(prev); n.add(listingId); return n; });
          // Refresh wishlist items quickly (could optimize later)
          fetch('/api/wishlists', { headers: { Authorization: 'Bearer ' + token } })
            .then(r => r.json())
            .then(ws => setWishlistItems(ws))
            .catch(()=>{});
        });
    }
  }

  // Messages
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState(null);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    if (view !== 'messages' || !token) return;
    setMessagesLoading(true); setMessagesError(null);
    fetch('/api/messages', { headers: { Authorization: 'Bearer ' + token } })
      .then(r => r.ok ? r.json() : Promise.reject(new Error('Failed messages')))
      .then(ms => setMessages(ms))
      .catch(e => setMessagesError(e.message))
      .finally(() => setMessagesLoading(false));
  }, [view, token, reloadKey]);

  function openConversation(otherUserId) {
    setConversationWith(otherUserId);
    setView('conversation');
    // Load conversation
    fetch(`/api/messages/conversation/${otherUserId}`, { headers: { Authorization: 'Bearer ' + token } })
      .then(r => r.ok ? r.json() : Promise.reject(new Error('Failed conversation')))
      .then(ms => setMessages(ms))
      .catch(e => setMessagesError(e.message));
  }

  function sendConversationMessage(e) {
    e.preventDefault();
    if (!token || !conversationWith) return;
    if (!newMessage.trim()) return;
    const content = newMessage.trim();
    setNewMessage('');
    fetch('/api/messages', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ receiverId: conversationWith, content })
    }).then(r => r.json()).then(data => {
      if (!data.error) setMessages(m => [...m, data]);
    });
  }

  // Create listing form state
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: '', city: '', price: '', image: '', roomType: 'ENTIRE_PLACE', description: '' });
  const [createMsg, setCreateMsg] = useState(null);

  const filtered = useMemo(() => {
    const t = term.trim().toLowerCase();
    const list = listings || [];
    if (!t) return list;
    return list.filter(l => (l.city||'').toLowerCase().includes(t) || (l.title||'').toLowerCase().includes(t));
  }, [term, listings]);

  useEffect(() => setPage(1), [term, filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageItems = filtered.slice((page - 1) * perPage, page * perPage);

  function handleCreateListing(e) {
    e.preventDefault();
    if (!token) { setCreateMsg({ type: 'error', msg: 'Please login first' }); return; }
    const numPrice = Number(form.price);
    if (!form.title.trim() || !form.city.trim() || isNaN(numPrice) || numPrice <= 0) {
      setCreateMsg({ type: 'error', msg: 'Title, city, and valid price required' });
      return;
    }
    setCreating(true);
    setCreateMsg(null);
    fetch('/api/listings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({
        ...form,
        price: numPrice
      })
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          setCreateMsg({ type: 'error', msg: data.error });
        } else {
          setCreateMsg({ type: 'success', msg: 'Listing created!' });
          setForm({ title: '', city: '', price: '', image: '', roomType: 'ENTIRE_PLACE', description: '' });
          setReloadKey(k => k + 1);
        }
      })
      .catch(() => setCreateMsg({ type: 'error', msg: 'Failed to create listing' }))
      .finally(() => setCreating(false));
  }

  function deleteListing(id) {
    if (!token) return;
    fetch(`/api/listings/${id}`, { method: 'DELETE', headers: { Authorization: 'Bearer ' + token } })
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          alert(data.error);
        } else {
          setReloadKey(k => k + 1);
          if (selected && selected.id === id) setSelected(null);
        }
      })
      .catch(() => alert('Delete failed'));
  }

  return (
    <>
      <header className="site-header">
        <div className="container inner">
          <h1 className="logo">Luxora</h1>
          {view === 'browse' && <SearchBar onSearch={handleSearch} initialFilters={filters} />}
          {user && (
            <nav style={{ display:'flex', gap:'.5rem' }}>
              <button className="theme-toggle" onClick={()=> { setView('browse'); setSelected(null); }}>Browse</button>
              <button className="theme-toggle" onClick={()=> setView('wishlist')}>Wishlist ({wishlistIds.size})</button>
              <button className="theme-toggle" onClick={()=> setShowBookingDashboard(true)}>My Bookings</button>
              <button className="theme-toggle" onClick={()=> setShowHostDashboard(true)}>Host Dashboard</button>
              <button className="theme-toggle" onClick={()=> { setView('messages'); setConversationWith(null); }}>Messages</button>
              {conversationWith && view==='conversation' && (
                <button className="theme-toggle" onClick={()=> setView('messages')}>Back</button>
              )}
            </nav>
          )}
          <div className="auth-bar">
            {user ? (
              <>
                <button className="theme-toggle" onClick={() => setShowProfile(true)} style={{ display:'flex', alignItems:'center', gap:6 }}>
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} style={{ width:24, height:24, borderRadius:'999px', objectFit:'cover' }} />
                  ) : null}
                  <span className="badge">{user.name}</span>
                </button>
                 <a href="/host" className="host-link">Become a Host</a>
                <button onClick={logout}>Logout</button>
              </>
            ) : (
              <>
                 <a href="/host" className="host-link">Become a Host</a>
                <button onClick={() => { setAuthMode('login'); setShowAuthModal(true); }}>Login</button>
                <button className="theme-toggle" onClick={() => { setAuthMode('register'); setShowAuthModal(true); }}>Sign Up</button>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="container">
        {view === 'browse' && (
        <div className="layout">
          <aside className="panel">
            <div className="search-controls">
              <FilterPanel filters={filters} onFilterChange={handleFilterChange} amenities={amenities} />
              {/* Map toggle removed */}
            </div>

            <hr style={{border:'none',borderTop:'1px solid var(--border)',margin:'1rem 0'}} />
            <div className="active-filters">
              <h3 style={{marginTop:0, fontSize:'.9rem'}}>Active Filters</h3>
              {filters.location && (
                <div className="filter-tag">
                  <span>📍 {filters.location}</span>
                  <button onClick={() => handleFilterChange({ location: '' })}>×</button>
                </div>
              )}
              {filters.checkIn && filters.checkOut && (
                <div className="filter-tag">
                  <span>📅 {new Date(filters.checkIn).toLocaleDateString()} - {new Date(filters.checkOut).toLocaleDateString()}</span>
                  <button onClick={() => handleFilterChange({ checkIn: null, checkOut: null })}>×</button>
                </div>
              )}
              {filters.guests && (
                <div className="filter-tag">
                  <span>👥 {filters.guests} guest{filters.guests > 1 ? 's' : ''}</span>
                  <button onClick={() => handleFilterChange({ guests: null })}>×</button>
                </div>
              )}
              {filters.priceMin && (
                <div className="filter-tag">
                  <span>💰 From ${filters.priceMin}</span>
                  <button onClick={() => handleFilterChange({ priceMin: '' })}>×</button>
                </div>
              )}
              {filters.priceMax && (
                <div className="filter-tag">
                  <span>💰 Up to ${filters.priceMax}</span>
                  <button onClick={() => handleFilterChange({ priceMax: '' })}>×</button>
                </div>
              )}
              {filters.roomType && (
                <div className="filter-tag">
                  <span>🏠 {filters.roomType.replace('_', ' ')}</span>
                  <button onClick={() => handleFilterChange({ roomType: '' })}>×</button>
                </div>
              )}
              {(filters.amenities?.length > 0) && (
                <div className="filter-tag">
                  <span>✨ {filters.amenities.length} amenity filter{filters.amenities.length > 1 ? 's' : ''}</span>
                  <button onClick={() => handleFilterChange({ amenities: [] })}>×</button>
                </div>
              )}
              {filters.instantBook && (
                <div className="filter-tag">
                  <span>⚡ Instant Book</span>
                  <button onClick={() => handleFilterChange({ instantBook: false })}>×</button>
                </div>
              )}
              {filters.petFriendly && (
                <div className="filter-tag">
                  <span>🐶 Pet Friendly</span>
                  <button onClick={() => handleFilterChange({ petFriendly: false })}>×</button>
                </div>
              )}
              {filters.sortBy && (
                <div className="filter-tag">
                  <span>⬆️ {filters.sortBy.replace('_', ' ')}</span>
                  <button onClick={() => handleFilterChange({ sortBy: '' })}>×</button>
                </div>
              )}
            </div>
            
            {/* Show create listing only for hosts and not in guest portal */}
            {/* Host tools notice removed per request */}
          </aside>
          <section style={{ display:'flex', flexDirection:'column', gap:'1.2rem' }}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <h2 style={{margin:0,fontSize:'1.15rem'}}>Explore listings</h2>
              <div style={{fontSize:'.8rem',color:'var(--muted)'}}>{filtered.length} result{filtered.length===1?'':'s'}</div>
            </div>
            {loading ? (
              <div className="grid">
                {Array.from({length:8}).map((_,i)=> (
                  <div key={i} className="card skeleton">
                    <div className="card-img" />
                    <div className="card-body">
                      <div className="line" style={{width:'70%'}} />
                      <div className="line" style={{width:'40%'}} />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div style={{padding:'1rem'}}>
                <div className="alert" style={{marginBottom:'1rem'}}>Failed to load listings. Ensure the API server is running (PORT=3002 node server.js).</div>
                <button className="theme-toggle" onClick={()=> setReloadKey(k=>k+1)}>Retry</button>
              </div>
            ) : (
              <div className="grid">
                {pageItems.map(item => (
                  <ListingCard 
                    key={item.id} 
                    listing={item} 
                    onClick={setSelected} 
                    inWishlist={user ? wishlistIds.has(item.id) : undefined}
                    toggleWishlist={toggleWishlist}
                    canDelete={user && item.hostId === user.id}
                    onDelete={deleteListing}
                  />
                ))}
                {pageItems.length === 0 && <div style={{padding:'1rem',fontSize:'.85rem'}}>No listings found</div>}
              </div>
            )}
            {!error && <Pagination page={page} total={totalPages} onChange={setPage} />}
          </section>
        </div>
        )}
        {view === 'wishlist' && user && (
          <div style={{display:'flex', flexDirection:'column', gap:'1rem'}}>
            <h2 style={{margin:0}}>Your wishlist</h2>
            {wishlistItems.length === 0 && <div className="alert">No favorites yet. Click hearts on listings to add.</div>}
            <div className="grid">
              {wishlistItems.map(w => (
                <ListingCard
                  key={w.listingId}
                  listing={w.listing}
                  onClick={setSelected}
                  inWishlist={true}
                  toggleWishlist={toggleWishlist}
                  canDelete={user && w.listing.hostId === user.id}
                  onDelete={deleteListing}
                />
              ))}
            </div>
          </div>
        )}
        {view === 'messages' && user && (
          <div style={{display:'flex', flexDirection:'column', gap:'1rem'}}>
            <h2 style={{margin:0}}>Messages</h2>
            {messagesLoading && <div className="alert">Loading messages…</div>}
            {messagesError && <div className="alert">{messagesError}</div>}
            {!messagesLoading && !messagesError && (
              <ul style={{listStyle:'none', padding:0, margin:0, display:'flex', flexDirection:'column', gap:8}}>
                {Object.entries(groupConversations(messages, user?.id)).map(([otherId, meta]) => (
                  <li key={otherId} style={{border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', padding:'.6rem .7rem', background:'#fff', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                    <div style={{display:'flex', flexDirection:'column'}}>
                      <strong>{meta.otherName || 'User '+otherId}</strong>
                      <span style={{fontSize:'.7rem', color:'var(--muted)'}}>{meta.count} message{meta.count===1?'':''}</span>
                      <span style={{fontSize:'.75rem'}}>{truncate(meta.lastContent, 60)}</span>
                    </div>
                    <button className="theme-toggle" onClick={()=> openConversation(Number(otherId))}>Open</button>
                  </li>
                ))}
                {messages.length===0 && <li className="alert">No messages yet.</li>}
              </ul>
            )}
          </div>
        )}
        {view === 'conversation' && user && conversationWith && (
          <div style={{display:'flex', flexDirection:'column', gap:'1rem'}}>
            <h2 style={{margin:0}}>Conversation</h2>
            <div style={{display:'flex', flexDirection:'column', gap:6, maxHeight:'50vh', overflowY:'auto', padding:'0 .25rem'}}>
              {messages.map(m => (
                <div key={m.id} style={{alignSelf: m.senderId===user.id?'flex-end':'flex-start', maxWidth:'70%', background:m.senderId===user.id?'#e8f9ef':'#fff', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', padding:'.45rem .6rem', fontSize:'.8rem'}}>
                  {m.content}
                  <div style={{fontSize:'.65rem', color:'var(--muted)', marginTop:4}}>{new Date(m.createdAt).toLocaleTimeString()}</div>
                </div>
              ))}
              {messages.length===0 && <div className="alert">No messages yet.</div>}
            </div>
            <form onSubmit={sendConversationMessage} style={{display:'flex', gap:8}}>
              <input value={newMessage} onChange={e=> setNewMessage(e.target.value)} placeholder="Write a message" style={{flex:1}} />
              <button type="submit" className="theme-toggle">Send</button>
            </form>
          </div>
        )}
      </main>
      <ListingModal listing={selected} token={token} handleBookNow={handleBookNow} onClose={()=> setSelected(null)} />
      {showProfile && user && (
        <UserProfile 
          user={user} 
          token={token} 
          onClose={() => setShowProfile(false)}
          onUpdate={(updatedUser) => {
            // Trigger auth refresh - simple approach: re-fetch /api/me
            fetch('/api/me', { headers: { Authorization: 'Bearer ' + token } })
              .then(r => r.ok ? r.json() : Promise.reject())
              .then(u => {
                // Update user state in auth context would require refactoring useAuth
                // For now, we can just close and user will see updates on next load
                setShowProfile(false);
                window.location.reload(); // Simple refresh to update user state
              })
              .catch(() => {});
          }}
        />
      )}
      
      {/* Booking Form Modal */}
      {showBookingForm && bookingListing && (
        <BookingForm
          listing={bookingListing}
          onClose={() => {
            setShowBookingForm(false);
            setBookingListing(null);
          }}
        />
      )}

      {/* Payment Success Modal */}
      {showPaymentSuccess && paymentSessionId && (
        <PaymentSuccess
          sessionId={paymentSessionId}
          onClose={() => {
            setShowPaymentSuccess(false);
            setPaymentSessionId(null);
            setReloadKey(k => k + 1); // Refresh data
          }}
        />
      )}

      {/* Booking Dashboard */}
      {showBookingDashboard && (
        <BookingDashboard
          token={token}
          onClose={() => setShowBookingDashboard(false)}
        />
      )}

      {/* Host Dashboard */}
      {showHostDashboard && (
        <HostDashboard
          token={token}
          onClose={() => setShowHostDashboard(false)}
        />
      )}
      
      {/* Auth Modal */}
      {showAuthModal && (
        <div className="modal" onClick={() => setShowAuthModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px', padding: 0 }}>
            <button className="close" onClick={() => setShowAuthModal(false)}>✕</button>
            {authMode === 'login' ? (
              <Login 
                onSwitch={() => setAuthMode('register')}
                onSuccess={() => setShowAuthModal(false)}
              />
            ) : (
              <Register 
                onSwitch={() => setAuthMode('login')}
                onSuccess={() => setShowAuthModal(false)}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}

// Simple amenity icon map
const ICONS = {
  'Wifi': '📶',
  'Air conditioning': '❄️',
  'Heating': '🔥',
  'Kitchen': '🍳',
  'Washer': '🧺',
  'Dryer': '🧺',
  'Free parking': '🅿️',
  'TV': '📺',
  'Pool': '🏊',
  'Hot tub': '🛁',
  'Smoke alarm': '🚭',
  'First aid kit': '🧰',
  'Fire extinguisher': '🧯',
  'Carbon monoxide alarm': '🧪',
  'Pet friendly': '🐶',
};

function amenityToIcon(name){
  return ICONS[name] || '•';
}

function groupConversations(messages, myId) {
  const map = {};
  for (const m of messages) {
    const other = m.senderId === myId ? m.receiverId : m.senderId;
    if (!map[other]) map[other] = { count:0, lastContent:'', otherName: m.senderId===myId ? m.receiver?.name : m.sender?.name };
    map[other].count++;
    map[other].lastContent = m.content;
  }
  return map;
}

function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max-1)+'…' : str;
}
