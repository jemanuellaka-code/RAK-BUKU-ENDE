const STORAGE_KEY = 'ruangbaca.books.v1';
const palettes = ['cover-terracotta', 'cover-sage', 'cover-navy', 'cover-ochre', 'cover-rose', 'cover-ink', 'cover-plum', 'cover-teal', 'cover-paper', 'cover-lilac'];
const initialBooks = [
  { id: 'b-lb', title: 'Laut Bercerita', author: 'Leila S. Chudori', genre: 'Fiksi sejarah', pages: 394, currentPage: 148, status: 'reading', cover: 'cover-navy', kicker: 'Sebuah novel', tag: 'INDONESIA', blurb: 'Kisah tentang para aktivis yang hilang, keluarga yang menanti, dan ingatan yang tak mudah dipadamkan.' },
  { id: 'b-ft', title: 'Filosofi Teras', author: 'Henry Manampiring', genre: 'Filsafat', pages: 320, currentPage: 0, status: 'unread', cover: 'cover-ochre', kicker: 'Filsafat Yunani-Romawi', tag: 'STOISISME', blurb: 'Pengantar filsafat Stoa yang mengajak pembaca memilah hal yang dapat dan tidak dapat dikendalikan.' },
  { id: 'b-sap', title: 'Sapiens', author: 'Yuval Noah Harari', genre: 'Sejarah', pages: 528, currentPage: 528, status: 'read', cover: 'cover-terracotta', kicker: 'A Brief History', tag: 'HUMANITY', blurb: 'Tinjauan populer tentang perjalanan panjang Homo sapiens dan perubahan besar dalam sejarah manusia.' },
  { id: 'b-hujan', title: 'Hujan', author: 'Tere Liye', genre: 'Fiksi', pages: 320, currentPage: 0, status: 'unread', cover: 'cover-sage', kicker: 'Tentang persahabatan', tag: 'HUJAN', blurb: 'Kisah fiksi tentang persahabatan, kehilangan, dan masa depan.' },
  { id: 'b-ah', title: 'Atomic Habits', author: 'James Clear', genre: 'Pengembangan diri', pages: 340, currentPage: 92, status: 'reading', cover: 'cover-rose', kicker: 'Tiny Changes, Remarkable Results', tag: 'HABITS', blurb: 'Gagasan tentang perubahan kecil dan kebiasaan yang perlahan membentuk hasil besar.' },
  { id: 'b-ml', title: 'The Midnight Library', author: 'Matt Haig', genre: 'Fiksi fantasi', pages: 304, currentPage: 304, status: 'read', cover: 'cover-plum', kicker: 'Between life and death', tag: 'MIDNIGHT', blurb: 'Nora Seed menemukan perpustakaan di antara hidup dan mati, dengan banyak kemungkinan kehidupan.' },
  { id: 'b-bm', title: 'Bumi Manusia', author: 'Pramoedya Ananta Toer', genre: 'Sastra', pages: 535, currentPage: 0, status: 'unread', cover: 'cover-paper', kicker: 'Tetralogi Buru · Buku pertama', tag: 'BUMI', blurb: 'Roman awal Tetralogi Buru, mengikuti Minke di tengah perubahan sosial pada awal abad ke-20.' },
  { id: 'b-pulang', title: 'Pulang', author: 'Leila S. Chudori', genre: 'Fiksi sejarah', pages: 464, currentPage: 464, status: 'read', cover: 'cover-teal', kicker: 'Sebuah novel', tag: 'PARIS · JAKARTA', blurb: 'Cerita tentang keluarga, sejarah Indonesia, dan kerinduan akan rumah.' }
];

const statusLabels = { unread: 'Belum dibaca', reading: 'Sedang dibaca', read: 'Sudah selesai' };
const statusOptions = ['unread', 'reading', 'read'];
let books = loadBooks();
let activeFilter = 'all';
let toastTimer;
let activeDetailId = null;

const grid = document.querySelector('#bookGrid');
const emptyState = document.querySelector('#emptyState');
const searchInput = document.querySelector('#searchInput');
const dialog = document.querySelector('#bookDialog');
const form = document.querySelector('#bookForm');
const detailDialog = document.querySelector('#detailDialog');
const detailContent = document.querySelector('#detailContent');

function loadBooks() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [...initialBooks];
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [...initialBooks];
  } catch (error) {
    return [...initialBooks];
  }
}

function saveBooks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
  } catch (error) {
    showToast('Penyimpanan perangkat tidak tersedia. Perubahan berlaku sampai halaman ditutup.');
  }
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function normalizedStatus(book) {
  return statusOptions.includes(book.status) ? book.status : 'unread';
}

function countByStatus(status) {
  return books.filter((book) => normalizedStatus(book) === status).length;
}

function updateStats() {
  const counts = { all: books.length, reading: countByStatus('reading'), read: countByStatus('read'), unread: countByStatus('unread') };
  document.querySelector('#totalStat').textContent = counts.all;
  document.querySelector('#readingStat').textContent = counts.reading;
  document.querySelector('#readStat').textContent = counts.read;
  document.querySelector('#unreadStat').textContent = counts.unread;
  document.querySelector('#allCount').textContent = counts.all;
  document.querySelector('#readingCount').textContent = counts.reading;
  document.querySelector('#readCount').textContent = counts.read;
  document.querySelector('#unreadCount').textContent = counts.unread;
  document.querySelector('#headingCount').textContent = counts.all;
}

function filteredBooks() {
  const query = searchInput.value.trim().toLocaleLowerCase('id-ID');
  return books.filter((book) => {
    const matchesStatus = activeFilter === 'all' || normalizedStatus(book) === activeFilter;
    const searchable = [book.title, book.author, book.genre, book.tag, book.kicker].join(' ').toLocaleLowerCase('id-ID');
    return matchesStatus && (!query || searchable.includes(query));
  });
}

function progressFor(book) {
  if (normalizedStatus(book) === 'read') return 100;
  if (normalizedStatus(book) !== 'reading') return 0;
  const pages = Number(book.pages) || 0;
  return pages > 0 ? Math.max(0, Math.min(99, Math.round((Number(book.currentPage) || 0) / pages * 100))) : 35;
}

function cardTemplate(book, index) {
  const status = normalizedStatus(book);
  const pages = Number(book.pages) || 0;
  const current = status === 'read' ? pages : Math.min(Number(book.currentPage) || 0, pages || Infinity);
  const progress = progressFor(book);
  const number = String(index + 1).padStart(2, '0');
  const pageLabel = status === 'reading' && pages ? `${current} / ${pages} hal.` : pages ? `${pages} halaman` : 'Halaman belum diisi';
  return `<article class="book-card" style="animation-delay:${Math.min(index * 45, 270)}ms">
    <div class="book-cover ${escapeHtml(book.cover || palettes[index % palettes.length])}">
      <span class="cover-number">${number}</span><span class="cover-kicker">${escapeHtml(book.kicker || 'Bacaan pilihan')}</span>
      <span class="cover-motif"></span><h3 class="cover-title">${escapeHtml(book.title)}</h3><span class="cover-author">${escapeHtml(book.author)}</span>
    </div>
    <div class="card-body">
      <div class="card-title-row"><div class="book-info"><h3 class="book-title" title="${escapeHtml(book.title)}">${escapeHtml(book.title)}</h3><p class="book-author" title="${escapeHtml(book.author)}">${escapeHtml(book.author)}</p></div><span class="genre-pill" title="${escapeHtml(book.genre || 'Umum')}">${escapeHtml(book.genre || 'Umum')}</span></div>
      <div class="card-divider"></div>
      <div class="card-foot"><span class="page-meta">${status === 'reading' ? `<strong>${escapeHtml(pageLabel)}</strong>` : escapeHtml(pageLabel)}</span>
        <label class="visually-hidden" for="status-${escapeHtml(book.id)}">Ubah status bacaan ${escapeHtml(book.title)}</label>
        <select class="status-select status-${status}" id="status-${escapeHtml(book.id)}" data-book-id="${escapeHtml(book.id)}" aria-label="Status bacaan ${escapeHtml(book.title)}">
          ${statusOptions.map((option) => `<option value="${option}" ${status === option ? 'selected' : ''}>${statusLabels[option]}</option>`).join('')}
        </select>
      </div>
      <div class="progress-track" role="progressbar" aria-label="Progres membaca ${escapeHtml(book.title)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress}"><div class="progress-fill" style="width:${progress}%"></div></div>
      <div class="card-actions"><button type="button" class="view-book-button" data-view-book="${escapeHtml(book.id)}">Lihat detail <span aria-hidden="true">↗</span></button></div>
    </div>
  </article>`;
}

function detailTemplate(book) {
  const status = normalizedStatus(book);
  const pages = Number(book.pages) || 0;
  const current = status === 'read' ? pages : Math.min(Number(book.currentPage) || 0, pages || Infinity);
  const pageText = pages ? (status === 'reading' ? `${current} dari ${pages} halaman` : `${pages} halaman`) : 'Belum dicatat';
  return `<div class="detail-form">
    <div class="dialog-topline"><span class="eyebrow">DETAIL BUKU</span><div class="detail-controls"><button class="print-button" type="button" data-print-book aria-label="Cetak detail buku"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 8V4h10v4M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2"/><path d="M7 14h10v6H7zM17 11h.01"/></svg>Cetak</button><button class="dialog-close" type="button" data-close-detail aria-label="Tutup detail buku">×</button></div></div>
    <div class="detail-layout">
      <div class="book-cover detail-cover ${escapeHtml(book.cover || palettes[0])}"><span class="cover-number">${String(books.indexOf(book) + 1).padStart(2, '0')}</span><span class="cover-kicker">${escapeHtml(book.kicker || 'Bacaan pilihan')}</span><span class="cover-motif"></span><span class="cover-title">${escapeHtml(book.title)}</span><span class="cover-author">${escapeHtml(book.author)}</span></div>
      <div class="detail-copy"><span class="detail-kicker">${escapeHtml(book.genre || 'Umum')}</span><h2 id="detailTitle">${escapeHtml(book.title)}</h2><p class="detail-byline">oleh <strong>${escapeHtml(book.author)}</strong></p><p class="detail-blurb">${escapeHtml(book.blurb || 'Buku ini menjadi bagian dari koleksi RAK BUKU ENDE.')}</p>
        <dl class="detail-meta"><div><dt>Jumlah halaman</dt><dd>${escapeHtml(pageText)}</dd></div><div><dt>Status bacaan</dt><dd>${statusLabels[status]}</dd></div></dl>
        <label class="detail-status-row" for="detailStatus">Ubah status bacaan<select id="detailStatus" data-detail-book-id="${escapeHtml(book.id)}">${statusOptions.map((option) => `<option value="${option}" ${status === option ? 'selected' : ''}>${statusLabels[option]}</option>`).join('')}</select></label>
      </div>
    </div>
    <div class="detail-footer"><span>RAK BUKU ENDE</span><span>Tersimpan di perangkat ini</span></div>
  </div>`;
}

function openBookDetails(id, focus = true) {
  const book = books.find((item) => item.id === id);
  if (!book) return;
  activeDetailId = id;
  detailContent.innerHTML = detailTemplate(book);
  if (!detailDialog.open && typeof detailDialog.showModal === 'function') detailDialog.showModal();
  else if (!detailDialog.open) detailDialog.setAttribute('open', '');
  if (focus) detailDialog.querySelector('[data-print-book]').focus();
}

function render() {
  updateStats();
  const visible = filteredBooks();
  grid.innerHTML = visible.map(cardTemplate).join('');
  const noResults = visible.length === 0;
  emptyState.hidden = !noResults;
  grid.hidden = noResults;
  const q = searchInput.value.trim();
  document.querySelector('#resultsText').textContent = q ? `${visible.length} hasil untuk “${q}”` : `Menampilkan ${visible.length} buku`;
  if (noResults && books.length > 0) {
    document.querySelector('#emptyTitle').textContent = q ? 'Cerita itu belum ditemukan' : 'Belum ada buku di filter ini';
    document.querySelector('#emptyMessage').textContent = q ? 'Coba judul, nama penulis, atau genre yang berbeda.' : 'Pilih status lain atau tambahkan buku baru ke rakmu.';
  } else {
    document.querySelector('#emptyTitle').textContent = 'Belum ada buku di sini';
    document.querySelector('#emptyMessage').textContent = 'Tambahkan cerita pertama untuk mulai mengisi rakmu.';
  }
}

function setFilter(filter) {
  activeFilter = filter;
  const labels = { all: 'Semua buku', reading: 'Sedang dibaca', unread: 'Belum dibaca', read: 'Sudah selesai' };
  document.querySelector('#breadcrumbLabel').textContent = labels[filter] || labels.all;
  document.querySelectorAll('[data-filter]').forEach((button) => {
    const selected = button.dataset.filter === filter;
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  document.querySelectorAll('[data-nav-filter]').forEach((button) => {
    const selected = button.dataset.navFilter === filter;
    button.classList.toggle('is-active', selected);
    if (selected) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  render();
}

function showToast(message) {
  const toast = document.querySelector('#toast');
  toast.textContent = message;
  toast.classList.add('is-visible');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 2700);
}

function openDialog() {
  form.reset();
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');
  window.setTimeout(() => document.querySelector('#bookTitle').focus(), 50);
}

function closeDialog() {
  if (typeof dialog.close === 'function') dialog.close();
  else dialog.removeAttribute('open');
}

document.querySelectorAll('[data-open-modal]').forEach((button) => button.addEventListener('click', openDialog));
document.querySelectorAll('[data-close-modal]').forEach((button) => button.addEventListener('click', closeDialog));
document.querySelectorAll('[data-filter]').forEach((button) => button.addEventListener('click', () => setFilter(button.dataset.filter)));
document.querySelectorAll('[data-nav-filter]').forEach((button) => button.addEventListener('click', () => {
  setFilter(button.dataset.navFilter);
  if (window.matchMedia('(max-width: 680px)').matches) document.querySelector('#koleksi').scrollIntoView({ behavior: 'smooth' });
}));
searchInput.addEventListener('input', render);
grid.addEventListener('click', (event) => {
  const button = event.target.closest('[data-view-book]');
  if (button) openBookDetails(button.dataset.viewBook);
});
detailContent.addEventListener('click', (event) => {
  if (event.target.closest('[data-close-detail]')) detailDialog.close();
  if (event.target.closest('[data-print-book]')) window.print();
});
detailContent.addEventListener('change', (event) => {
  const select = event.target.closest('[data-detail-book-id]');
  if (!select) return;
  const book = books.find((item) => item.id === select.dataset.detailBookId);
  if (!book) return;
  const previous = normalizedStatus(book);
  book.status = select.value;
  if (book.status === 'read') book.currentPage = Number(book.pages) || book.currentPage || 0;
  if (book.status === 'unread') book.currentPage = 0;
  if (book.status === 'reading' && (!book.currentPage || book.currentPage >= Number(book.pages))) book.currentPage = Math.max(1, Math.round((Number(book.pages) || 100) * .25));
  saveBooks();
  render();
  openBookDetails(book.id, false);
  if (previous !== book.status) showToast(`Status “${book.title}” diubah menjadi ${statusLabels[book.status].toLocaleLowerCase('id-ID')}.`);
});
grid.addEventListener('change', (event) => {
  const select = event.target.closest('[data-book-id]');
  if (!select) return;
  const book = books.find((item) => item.id === select.dataset.bookId);
  if (!book) return;
  const previous = normalizedStatus(book);
  book.status = select.value;
  if (book.status === 'read') book.currentPage = Number(book.pages) || book.currentPage || 0;
  if (book.status === 'unread') book.currentPage = 0;
  if (book.status === 'reading' && (!book.currentPage || book.currentPage >= Number(book.pages))) book.currentPage = Math.max(1, Math.round((Number(book.pages) || 100) * .25));
  saveBooks();
  render();
  if (previous !== book.status) showToast(`Status “${book.title}” diubah menjadi ${statusLabels[book.status].toLocaleLowerCase('id-ID')}.`);
});
form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const values = new FormData(form);
  const title = String(values.get('title')).trim();
  const author = String(values.get('author')).trim();
  const rawPages = Number(values.get('pages'));
  const status = String(values.get('status'));
  const validStatus = statusOptions.includes(status) ? status : 'unread';
  const book = {
    id: `b-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    title,
    author,
    genre: String(values.get('genre')).trim() || 'Umum',
    pages: Number.isFinite(rawPages) && rawPages > 0 ? Math.round(rawPages) : 0,
    currentPage: validStatus === 'read' ? (rawPages > 0 ? Math.round(rawPages) : 0) : validStatus === 'reading' ? Math.max(1, Math.round((rawPages || 100) * .15)) : 0,
    status: validStatus,
    cover: palettes[books.length % palettes.length],
    kicker: 'Bacaan pilihan',
    tag: 'CERITA'
  };
  books.unshift(book);
  saveBooks();
  setFilter('all');
  searchInput.value = '';
  closeDialog();
  render();
  showToast(`“${title}” berhasil ditambahkan ke rak.`);
  document.querySelector('#koleksi').scrollIntoView({ behavior: 'smooth', block: 'start' });
});

document.addEventListener('keydown', (event) => {
  if (event.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName) && !dialog.open) {
    event.preventDefault();
    searchInput.focus();
  }
});

const date = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
document.querySelector('#todayDate').textContent = date.charAt(0).toLocaleUpperCase('id-ID') + date.slice(1);
render();
