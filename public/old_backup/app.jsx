const { useState, useEffect, useMemo } = React;

function useListings() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    fetch('/api/listings')
      .then(r => {
        if (!r.ok) throw new Error('Failed to fetch');
        return r.json();
      })
      .then(data => {
        if (mounted) setListings(data || []);
      })
      .catch(err => mounted && setError(err))
      .finally(() => mounted && setLoading(false));
    return () => (mounted = false);
  }, []);

  return { listings, loading, error };
}

function SearchBar({ value, onChange }) {
  return (
    <div style={{ margin: '0.5rem 0 1rem 0' }}>
      <input
        aria-label="Search listings"
        placeholder="Search city or listing"
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ width: '100%', padding: '0.6rem', borderRadius: 8, border: '1px solid #ddd' }}
      />
    </div>
  );
}

function ListingCard({ listing, onClick }) {
  return (
    <article className="card" onClick={() => onClick(listing)}>
      <img className="card-img" src={listing.image} alt={listing.title} loading="lazy" />
      <div className="card-body">
        <h3 className="card-title">{listing.title}</h3>
        <div className="card-meta">{listing.city} • ${listing.price}/night</div>
      </div>
    </article>
  );
}

function Pagination({ page, total, onChange }) {
  if (total <= 1) return null;
  const pages = [];
  for (let i = 1; i <= total; i++) pages.push(i);
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
      {pages.map(p => (
        <button
          key={p}
          onClick={() => onChange(p)}
          style={{
            padding: '6px 10px',
            borderRadius: 8,
            border: p === page ? '2px solid #ff385c' : '1px solid #ddd',
            background: p === page ? '#fff0f2' : '#fff',
            cursor: 'pointer'
          }}
        >
          {p}
        </button>
      ))}
    </div>
  );
}

function ListingModal({ listing, onClose }) {
  if (!listing) return null;
  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="close" onClick={onClose}>✕</button>
        <img src={listing.image} alt={listing.title} />
        <h2>{listing.title}</h2>
        <p><strong>{listing.city}</strong></p>
        <p>{listing.description}</p>
        <p><strong>${listing.price}/night</strong></p>
      </div>
    </div>
  );
}

function App() {
  const { listings, loading, error } = useListings();
  const [term, setTerm] = useState('');
  const [page, setPage] = useState(1);
  const [perPage] = useState(6);
  const [selected, setSelected] = useState(null);

  useEffect(() => setPage(1), [term]);

  const filtered = useMemo(() => {
    const t = term.trim().toLowerCase();
    if (!t) return listings;
    return listings.filter(l => (l.city || '').toLowerCase().includes(t) || (l.title || '').toLowerCase().includes(t));
  }, [listings, term]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageItems = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <div>
      <SearchBar value={term} onChange={setTerm} />

      {loading && <div>Loading listings…</div>}
      {error && <div style={{ color: 'crimson' }}>Failed to load listings.</div>}

      {!loading && !error && (
        <>
          <div className="grid" style={{ marginTop: 0 }}>
            {pageItems.length === 0 ? (
              <div>No listings match your search.</div>
            ) : (
              pageItems.map(item => (
                <ListingCard key={item.id} listing={item} onClick={setSelected} />
              ))
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ marginTop: 12, color: '#666' }}>
              Showing {filtered.length ? (pageItems.length) : 0} of {filtered.length} listings
            </div>
            <Pagination page={page} total={totalPages} onChange={p => setPage(p)} />
          </div>
        </>
      )}

      <ListingModal listing={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

const rootEl = document.getElementById('root');
if (rootEl) {
  const root = ReactDOM.createRoot(rootEl);
  root.render(<App />);
}
