async function fetchListings() {
  const res = await fetch('/api/listings');
  if (!res.ok) throw new Error('Failed to fetch listings');
  return res.json();
}

function makeCard(listing) {
  const tpl = document.getElementById('card-template');
  const node = tpl.content.cloneNode(true);
  const img = node.querySelector('.card-img');
  img.src = listing.image;
  img.alt = listing.title;
  node.querySelector('.card-title').textContent = listing.title;
  node.querySelector('.card-meta').textContent = `${listing.city} • $${listing.price}/night`;
  node.querySelector('.card').addEventListener('click', () => {
    showListingDetail(listing);
  });
  return node;
}

function showListingDetail(listing) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <button class="close">✕</button>
      <img src="${listing.image}" alt="${listing.title}" />
      <h2>${listing.title}</h2>
      <p><strong>${listing.city}</strong></p>
      <p>${listing.description}</p>
      <p><strong>$${listing.price}/night</strong></p>
    </div>
  `;
  modal.querySelector('.close').addEventListener('click', () => modal.remove());
  document.body.appendChild(modal);
}

function applySearch(listings, term) {
  const t = term.trim().toLowerCase();
  if (!t) return listings;
  return listings.filter(l => l.city.toLowerCase().includes(t) || l.title.toLowerCase().includes(t));
}

(async function init(){
  try {
    const listings = await fetchListings();
    const listEl = document.getElementById('listings');
    const search = document.getElementById('search');

    function render(items){
      listEl.innerHTML = '';
      if (!items.length) { listEl.textContent = 'No listings match.'; return; }
      items.forEach(item => listEl.appendChild(makeCard(item)));
    }

    render(listings);

    search.addEventListener('input', (e) => {
      const filtered = applySearch(listings, e.target.value);
      render(filtered);
    });
  } catch (e) {
    document.getElementById('listings').textContent = 'Failed to load listings.';
    console.error(e);
  }
})();
