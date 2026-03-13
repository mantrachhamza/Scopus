/* ═══════════════════════════════════════════════════════════════
   SCOPUS EXPLORER  ·  Application Logic
   University Mohamed V, Morocco
═══════════════════════════════════════════════════════════════ */

'use strict';

// ── CONFIG ──────────────────────────────────────────────────────
const API_KEY = 'd451936c59628276f68eb43266872213';
const BASE_URL = 'https://api.elsevier.com';

// These are variations of the university name as it appears in Scopus
const AFFIL_VARIANTS = [
  '"Mohamed V"',
  '"Mohammed V"',
  '"Mohamed 5"',
];

const AFFIL_QUERY = `AFFIL(${AFFIL_VARIANTS.join(' OR ')}) AND AFFILCOUNTRY(morocco)`;
const AUTHORS_PER_PAGE = 12;
const PUBS_PER_PAGE = 15;

// ── STATE ────────────────────────────────────────────────────────
let state = {
  authors: [],
  authorTotal: 0,
  authorPage: 1,
  currentAuthor: null,
  allPubs: [],          // full unfiltered list fetched
  filteredPubs: [],          // after client-side filters
  pubPage: 1,
  pubTotal: 0,
  pubTotalFetched: false,
};

// ── DOM REFS ─────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const searchForm = $('searchForm');
const firstNameIn = $('firstName');
const lastNameIn = $('lastName');
const searchBtn = $('searchBtn');
const notif = $('notification');
const authorSection = $('authorSection');
const authorsGrid = $('authorsGrid');
const authorCount = $('authorCount');
const authorPagination = $('authorPagination');
const publicationsSection = $('publicationsSection');
const authorProfile = $('authorProfile');
const pubCount = $('pubCount');
const pubFilters = $('pubFilters');
const yearFilter = $('yearFilter');
const typeFilter = $('typeFilter');
const pubSearchIn = $('pubSearch');
const publicationsList = $('publicationsList');
const pubPagination = $('pubPagination');
const backBtn = $('backBtn');
const loadingOverlay = $('loadingOverlay');
const loadingText = $('loadingText');

// ── HELPERS  ─────────────────────────────────────────────────────
function showLoading(msg = 'Searching Scopus database…') {
  loadingText.textContent = msg;
  loadingOverlay.style.display = 'flex';
}
function hideLoading() { loadingOverlay.style.display = 'none'; }

function showNotif(msg, type = 'info') {
  notif.textContent = msg;
  notif.className = `notification show ${type}`;
}
function hideNotif() {
  notif.className = 'notification';
  notif.textContent = '';
}

function scrollToSection(el) {
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function getInitials(name) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2)
    .map(w => w[0].toUpperCase()).join('');
}

function escHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── SCOPUS API FETCH ─────────────────────────────────────────────
async function scopusFetch(endpoint, params = {}) {
  const url = new URL(BASE_URL + endpoint);
  url.searchParams.set('apiKey', API_KEY);
  url.searchParams.set('httpAccept', 'application/json');
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString(), {
    headers: {
      'X-ELS-APIKey': API_KEY,
    }
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const errMsg = err?.['service-error']?.status?.statusText
      || err?.['error-response']?.['error-message']
      || `HTTP ${res.status}`;
    throw new Error(errMsg);
  }
  return res.json();
}

// ── AUTHOR SEARCH ────────────────────────────────────────────────
async function searchAuthors(firstName, lastName, page = 1) {
  const start = (page - 1) * AUTHORS_PER_PAGE;

  // Build query: name + affiliation filter
  const nameParts = [];
  if (lastName.trim()) nameParts.push(`AUTHLASTNAME(${lastName.trim()})`);
  if (firstName.trim()) nameParts.push(`AUTHFIRST(${firstName.trim()})`);

  if (!nameParts.length) {
    showNotif('Please enter at least a first or last name.', 'warn');
    return;
  }

  const nameQuery = nameParts.join(' AND ');
  const fullQuery = `${nameQuery} AND (${AFFIL_QUERY})`;

  showLoading('Searching Scopus for authors…');
  try {
    const data = await scopusFetch('/content/search/author', {
      query: fullQuery,
      count: AUTHORS_PER_PAGE,
      start,
      view: 'STANDARD',
    });

    const results = data['search-results'];
    const total = parseInt(results?.['opensearch:totalResults'] || '0', 10);
    const entries = results?.entry || [];

    // Handle "no results" entry from Scopus
    if (entries.length === 1 && entries[0]['@_fa'] === 'true' && !entries[0]['dc:identifier']) {
      return { total: 0, authors: [] };
    }

    const authors = entries.map(parseAuthorEntry);
    return { total, authors };
  } finally {
    hideLoading();
  }
}

function parseAuthorEntry(e) {
  const nameVariants = e['preferred-name'] || {};
  const surname = nameVariants['surname'] || e['dc:creator'] || '';
  const givenName = nameVariants['given-name'] || '';
  const fullName = [givenName, surname].filter(Boolean).join(' ') || e['dc:creator'] || 'Unknown';
  const authorId = (e['dc:identifier'] || '').replace('AUTHOR_ID:', '');
  const docCount = e['document-count'] || '—';
  const citedByCount = e['cited-by-count'] || '—';
  const coauthorCount = e['coauthor-count'] || '—';
  const hIndex = e['h-index'] || '—';

  const affils = e['affiliation-current'];
  let affiliation = '';
  if (Array.isArray(affils)) {
    affiliation = affils.map(a => [a['affiliation-name'], a['affiliation-city'], a['affiliation-country']]
      .filter(Boolean).join(', ')).join('; ');
  } else if (affils) {
    affiliation = [affils['affiliation-name'], affils['affiliation-city'], affils['affiliation-country']]
      .filter(Boolean).join(', ');
  }

  // Subject areas
  const areas = e['subject-area'];
  const subjects = Array.isArray(areas)
    ? areas.slice(0, 3).map(a => a['$']).join(', ')
    : (areas?.['$'] || '');

  return { authorId, fullName, surname, givenName, affiliation, docCount, citedByCount, coauthorCount, hIndex, subjects };
}

// ── PUBLICATIONS FETCH ───────────────────────────────────────────
async function fetchPublications(authorId) {
  showLoading('Loading publications…');
  const allPubs = [];
  let start = 0;
  const perPage = 25;
  let total = 0;

  try {
    do {
      const data = await scopusFetch('/content/search/scopus', {
        query: `AU-ID(${authorId})`,
        count: perPage,
        start,
        view: 'COMPLETE',
        sort: 'coverDate,desc',
        field: 'dc:title,prism:publicationName,prism:coverDate,prism:doi,citedby-count,subtypeDescription,eid,prism:volume,prism:issueIdentifier,prism:pageRange,author',
      });

      const results = data['search-results'];
      total = parseInt(results?.['opensearch:totalResults'] || '0', 10);
      const entries = results?.entry || [];

      if (entries.length === 0) break;

      entries.forEach(e => {
        if (e['dc:title']) {
          const pub = parsePubEntry(e, authorId);
          if (pub.authorRank === 1 || pub.authorRank === 2) {
            allPubs.push(pub);
          }
        }
      });

      start += perPage;
    } while (start < total && start < 2000); // Only fetch reasonable max since allPubs.length doesn't equal total

    return { total: allPubs.length, pubs: allPubs };
  } finally {
    hideLoading();
  }
}

function parsePubEntry(e, authorId) {
  const title = e['dc:title'] || 'Untitled';
  const journal = e['prism:publicationName'] || '';
  const date = e['prism:coverDate'] || '';
  const year = date ? date.split('-')[0] : '';
  const doi = e['prism:doi'] || '';
  const cited = e['citedby-count'] || '0';
  const type = e['subtypeDescription'] || 'Article';
  const eid = e['eid'] || '';
  const volume = e['prism:volume'] || '';
  const issue = e['prism:issueIdentifier'] || '';
  const pages = e['prism:pageRange'] || '';

  const authorArr = e['author'] || [];
  const authorsArray = Array.isArray(authorArr) ? authorArr : (authorArr ? [authorArr] : []);

  let authorRank = null;
  if (authorId) {
    const targetId = String(authorId);
    const matchedAuthor = authorsArray.find(a => String(a['authid']) === targetId);
    if (matchedAuthor && matchedAuthor['@seq']) {
      authorRank = parseInt(matchedAuthor['@seq'], 10);
    } else {
      const idx = authorsArray.findIndex(a => String(a['authid']) === targetId);
      if (idx !== -1) authorRank = idx + 1;
    }
  }

  // Coauthors — limit display to 5
  const authors = authorsArray.slice(0, 5).map(a => a['authname'] || '').filter(Boolean).join(', ');
  const moreAuthors = authorsArray.length > 5 ? ` +${authorsArray.length - 5} more` : '';

  return { title, journal, date, year, doi, cited: parseInt(cited, 10), type, eid, volume, issue, pages, authors, moreAuthors, authorRank };
}

// ── RENDER: AUTHOR CARDS ─────────────────────────────────────────
function renderAuthors(authors, total, page) {
  authorsGrid.innerHTML = '';

  if (!authors.length) {
    authorsGrid.innerHTML = `
      <div class="no-results" style="grid-column:1/-1">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <h3>No authors found</h3>
        <p>Try adjusting the name or searching with just a last name.</p>
      </div>`;
    return;
  }

  authors.forEach(a => {
    const card = document.createElement('div');
    card.className = 'author-card';
    card.innerHTML = `
      <div class="ac-top">
        <div class="ac-avatar">${escHtml(getInitials(a.fullName))}</div>
        <div class="ac-info">
          <div class="ac-name">${escHtml(a.fullName)}</div>
          <div class="ac-affil">${escHtml(a.affiliation || 'Affiliation not listed')}</div>
        </div>
      </div>
      <div class="ac-stats">
        <div class="stat-box">
          <span class="stat-val">${escHtml(String(a.docCount))}</span>
          <span class="stat-lbl">Documents</span>
        </div>
        <div class="stat-box">
          <span class="stat-val">${escHtml(String(a.citedByCount))}</span>
          <span class="stat-lbl">Citations</span>
        </div>
        <div class="stat-box">
          <span class="stat-val">${escHtml(String(a.hIndex))}</span>
          <span class="stat-lbl">h-index</span>
        </div>
      </div>
      ${a.subjects ? `<div style="font-size:.72rem;color:var(--c-text-dim);margin-bottom:14px;line-height:1.5">${escHtml(a.subjects)}</div>` : ''}
      <button class="ac-btn">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        View Publications
      </button>`;
    card.addEventListener('click', () => openAuthorPublications(a));
    authorsGrid.appendChild(card);
  });

  authorCount.textContent = `${total.toLocaleString()} author${total !== 1 ? 's' : ''} found`;
  renderPagination(authorPagination, page, Math.ceil(total / AUTHORS_PER_PAGE), p => {
    state.authorPage = p;
    doAuthorSearch(p);
  });
}

// ── RENDER: PUBLICATIONS ─────────────────────────────────────────
function getPubTypeClass(type) {
  const t = (type || '').toLowerCase();
  if (t.includes('article')) return 'type-ar';
  if (t.includes('conference') || t.includes('proceeding')) return 'type-cp';
  if (t.includes('review')) return 'type-rv';
  if (t.includes('book')) return 'type-bk';
  return 'type-ot';
}

function renderPublications(pubs, total, page) {
  publicationsList.innerHTML = '';

  if (!pubs.length) {
    publicationsList.innerHTML = `
      <div class="no-results">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        <h3>No publications found</h3>
        <p>Try adjusting the filters.</p>
      </div>`;
    return;
  }

  const start = (page - 1) * PUBS_PER_PAGE;
  const slice = pubs.slice(start, start + PUBS_PER_PAGE);

  slice.forEach(pub => {
    const card = document.createElement('div');
    card.className = 'pub-card';

    const doiLink = pub.doi
      ? `<a class="pub-doi-btn" href="https://doi.org/${encodeURIComponent(pub.doi)}" target="_blank" rel="noopener">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          DOI</a>`
      : '';

    const scopusLink = pub.eid
      ? `<a class="pub-doi-btn" style="border-color:rgba(6,182,212,.2);color:var(--c-accent2);background:rgba(6,182,212,.07)"
           href="https://www.scopus.com/record/display.uri?eid=${encodeURIComponent(pub.eid)}&origin=resultslist"
           target="_blank" rel="noopener">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          Scopus</a>`
      : '';

    const volIssue = [pub.volume && `Vol. ${pub.volume}`, pub.issue && `No. ${pub.issue}`, pub.pages && `pp. ${pub.pages}`]
      .filter(Boolean).join(' · ');

    card.innerHTML = `
      <div class="pub-card-top">
        <span class="pub-type-badge ${getPubTypeClass(pub.type)}">${escHtml(pub.type)}</span>
        <span class="pub-year">${escHtml(pub.year) || '—'}</span>
        ${pub.authorRank === 1 ? '<span class="pub-type-badge" style="background:rgba(16,185,129,0.1);color:#10b981;border-color:rgba(16,185,129,0.2);margin-left:8px;">1st Author</span>' : ''}
        ${pub.authorRank === 2 ? '<span class="pub-type-badge" style="background:rgba(245,158,11,0.1);color:#b45309;border-color:rgba(245,158,11,0.2);margin-left:8px;">2nd Author</span>' : ''}
      </div>
      <div class="pub-title">
        ${pub.doi
        ? `<a href="https://doi.org/${encodeURIComponent(pub.doi)}" target="_blank" rel="noopener">${escHtml(pub.title)}</a>`
        : escHtml(pub.title)}
      </div>
      ${pub.journal ? `
      <div class="pub-journal">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
        ${escHtml(pub.journal)}${volIssue ? ' · ' + escHtml(volIssue) : ''}
      </div>` : ''}
      <div class="pub-meta">
        ${pub.cited !== undefined ? `
        <span class="pub-meta-item">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
          <span class="cite-count">${pub.cited.toLocaleString()}</span> citations
        </span>` : ''}
        ${pub.authors ? `
        <span class="pub-meta-item" style="max-width:420px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          ${escHtml(pub.authors)}${escHtml(pub.moreAuthors)}
        </span>` : ''}
        <div style="margin-left:auto;display:flex;gap:8px">
          ${doiLink}
          ${scopusLink}
        </div>
      </div>`;
    publicationsList.appendChild(card);
  });

  pubCount.textContent = `${total.toLocaleString()} publication${total !== 1 ? 's' : ''}`;
  renderPagination(pubPagination, page, Math.ceil(total / PUBS_PER_PAGE), p => {
    state.pubPage = p;
    renderPublications(state.filteredPubs, state.filteredPubs.length, p);
    scrollToSection(publicationsSection);
  });
}

// ── RENDER: PAGINATION ───────────────────────────────────────────
function renderPagination(container, current, totalPages, onChangePage) {
  container.innerHTML = '';
  if (totalPages <= 1) return;

  function btn(label, page, disable = false, isActive = false) {
    const b = document.createElement('button');
    b.className = 'pg-btn' + (isActive ? ' active' : '');
    b.innerHTML = label;
    b.disabled = disable;
    if (!disable) b.addEventListener('click', () => onChangePage(page));
    return b;
  }

  container.appendChild(btn('&#8249;', current - 1, current === 1));

  const range = buildPageRange(current, totalPages);
  let prev = null;
  range.forEach(p => {
    if (prev !== null && p - prev > 1) {
      const sp = document.createElement('span');
      sp.className = 'pg-ellipsis';
      sp.textContent = '…';
      container.appendChild(sp);
    }
    container.appendChild(btn(p, p, false, p === current));
    prev = p;
  });

  container.appendChild(btn('&#8250;', current + 1, current === totalPages));
}

function buildPageRange(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, current]);
  if (current > 1) pages.add(current - 1);
  if (current < total) pages.add(current + 1);
  return [...pages].sort((a, b) => a - b);
}

// ── AUTHOR PROFILE BANNER ────────────────────────────────────────
function renderAuthorProfile(author) {
  const profileUrl = `https://www.scopus.com/authid/detail.uri?authorId=${author.authorId}`;
  authorProfile.innerHTML = `
    <div class="ap-avatar">${escHtml(getInitials(author.fullName))}</div>
    <div class="ap-details">
      <div class="ap-name">${escHtml(author.fullName)}</div>
      <div class="ap-affil">${escHtml(author.affiliation || 'Affiliation not available')}</div>
      <div class="ap-id">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
        Scopus ID: <a href="${escHtml(profileUrl)}" target="_blank" rel="noopener">${escHtml(author.authorId)}</a>
      </div>
      ${author.subjects ? `<div style="margin-top:6px;font-size:.72rem;color:var(--c-text-dim)">${escHtml(author.subjects)}</div>` : ''}
    </div>
    <div class="ap-stats">
      <div class="ap-stat">
        <span class="ap-stat-val" id="profileDocCount">${escHtml(String(author.docCount))}</span>
        <span class="ap-stat-lbl">Documents</span>
      </div>
      <div class="ap-stat">
        <span class="ap-stat-val">${escHtml(String(author.citedByCount))}</span>
        <span class="ap-stat-lbl">Citations</span>
      </div>
      <div class="ap-stat">
        <span class="ap-stat-val">${escHtml(String(author.hIndex))}</span>
        <span class="ap-stat-lbl">h-index</span>
      </div>
      <div class="ap-stat">
        <span class="ap-stat-val">${escHtml(String(author.coauthorCount))}</span>
        <span class="ap-stat-lbl">Co-authors</span>
      </div>
    </div>`;
}

// ── FILTERS ──────────────────────────────────────────────────────
function populateFilters(pubs) {
  // Years
  const years = [...new Set(pubs.map(p => p.year).filter(Boolean))].sort((a, b) => b - a);
  yearFilter.innerHTML = '<option value="">All Years</option>'
    + years.map(y => `<option value="${y}">${y}</option>`).join('');

  // Types
  const types = [...new Set(pubs.map(p => p.type).filter(Boolean))].sort();
  typeFilter.innerHTML = '<option value="">All Types</option>'
    + types.map(t => `<option value="${escHtml(t)}">${escHtml(t)}</option>`).join('');
}

function applyFilters() {
  const year = yearFilter.value;
  const type = typeFilter.value;
  const keyword = pubSearchIn.value.trim().toLowerCase();

  state.filteredPubs = state.allPubs.filter(p => {
    if (year && p.year !== year) return false;
    if (type && p.type !== type) return false;
    if (keyword && !p.title.toLowerCase().includes(keyword)
      && !p.journal.toLowerCase().includes(keyword)) return false;
    return true;
  });

  state.pubPage = 1;
  renderPublications(state.filteredPubs, state.filteredPubs.length, 1);
}

// ── FLOW: OPEN AUTHOR PUBLICATIONS ───────────────────────────────
async function openAuthorPublications(author) {
  state.currentAuthor = author;
  state.pubPage = 1;
  state.allPubs = [];
  state.filteredPubs = [];

  // Switch views
  authorSection.style.display = 'none';
  publicationsSection.style.display = 'block';
  hideNotif();
  renderAuthorProfile(author);

  // Reset filters
  yearFilter.innerHTML = '<option value="">All Years</option>';
  typeFilter.innerHTML = '<option value="">All Types</option>';
  pubSearchIn.value = '';
  publicationsList.innerHTML = '';
  pubCount.textContent = '';
  pubPagination.innerHTML = '';

  scrollToSection(publicationsSection);

  try {
    const { total, pubs } = await fetchPublications(author.authorId);
    state.allPubs = pubs;
    state.filteredPubs = pubs;

    const profileDocCountEl = document.getElementById('profileDocCount');
    if (profileDocCountEl) {
      profileDocCountEl.textContent = total.toLocaleString();
    }

    if (!pubs.length) {
      showNotif('No publications found for this author in Scopus.', 'info');
    } else {
      populateFilters(pubs);
      renderPublications(pubs, pubs.length, 1);
    }
  } catch (err) {
    console.error(err);
    showNotif(`Failed to load publications: ${err.message}`, 'error');
  }
}

// ── FLOW: AUTHOR SEARCH ──────────────────────────────────────────
async function doAuthorSearch(page = 1) {
  const firstName = firstNameIn.value.trim();
  const lastName = lastNameIn.value.trim();

  if (!firstName && !lastName) {
    showNotif('Please enter at least a first or last name to search.', 'warn');
    return;
  }

  hideNotif();
  state.authorPage = page;

  try {
    const { total, authors } = await searchAuthors(firstName, lastName, page);
    state.authors = authors;
    state.authorTotal = total;

    publicationsSection.style.display = 'none';
    authorSection.style.display = 'block';
    renderAuthors(authors, total, page);
    scrollToSection(authorSection);

    if (page === 1 && total === 0) {
      showNotif(`No authors found for "${[firstName, lastName].filter(Boolean).join(' ')}" at University Mohamed V. Try a different spelling or partial name.`, 'info');
    }
  } catch (err) {
    console.error(err);
    showNotif(`Search failed: ${err.message}`, 'error');
  }
}

// ── EVENT LISTENERS ──────────────────────────────────────────────
searchForm.addEventListener('submit', e => {
  e.preventDefault();
  doAuthorSearch(1);
});

backBtn.addEventListener('click', () => {
  publicationsSection.style.display = 'none';
  authorSection.style.display = 'block';
  hideNotif();
  scrollToSection(authorSection);
});

// Filter events
yearFilter.addEventListener('change', applyFilters);
typeFilter.addEventListener('change', applyFilters);

let debounceTimer;
pubSearchIn.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(applyFilters, 280);
});

// Allow Enter in name fields
[firstNameIn, lastNameIn].forEach(inp => {
  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); searchForm.requestSubmit(); }
  });
});
