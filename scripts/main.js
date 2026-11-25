/* =========================================================
   FinTrack: головний скрипт
   1. Адаптивне мобільне меню та перемикач теми
   2. Кнопка «Нагору» з плавним переходом
   3. Карусель відгуків користувачів (секція зворотного зв'язку)
   4. Модальні вікна та показ пароля
   5. Supabase: вхід, реєстрація, транзакції (БЕЗ ЗМІН БД)
   6. Відображення: показники, графіки, списки
   ========================================================= */

const el = (id) => document.getElementById(id);

/* =========================================================
   1. Тема інтерфейсу (Light / Dark) та Адаптивне меню
   ========================================================= */
(function initTheme() {
  const saved = localStorage.getItem('fintrack-theme');
  const initial = saved || 'light';
  document.documentElement.setAttribute('data-theme', initial);
  updateThemeIcons(initial);
})();

function updateThemeIcons(theme) {
  document.querySelectorAll('.theme-icon').forEach((icon) => {
    icon.textContent = theme === 'dark' ? '☀️' : '🌙';
  });
}

document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('fintrack-theme', next);
    updateThemeIcons(next);
  });
});

/* Адаптивне бургер-меню для планшетів і смартфонів */
const mobileToggle = el('mobile-menu-toggle');
const mobileClose = el('mobile-menu-close');
const mainNav = el('main-nav');
const navBackdrop = el('nav-backdrop');

function setMobileMenu(open) {
  if (!mainNav || !mobileToggle) return;
  mainNav.classList.toggle('is-mobile-open', open);
  mobileToggle.setAttribute('aria-expanded', String(open));
  if (navBackdrop) {
    if (open) {
      navBackdrop.hidden = false;
      requestAnimationFrame(() => navBackdrop.classList.add('is-visible'));
    } else {
      navBackdrop.classList.remove('is-visible');
      setTimeout(() => {
        if (!mainNav.classList.contains('is-mobile-open')) navBackdrop.hidden = true;
      }, 250);
    }
  }
  document.body.style.overflow = open ? 'hidden' : '';
}

if (mobileToggle) {
  mobileToggle.addEventListener('click', () => {
    const isOpen = mainNav.classList.contains('is-mobile-open');
    setMobileMenu(!isOpen);
  });
}
if (mobileClose) {
  mobileClose.addEventListener('click', () => setMobileMenu(false));
}
if (navBackdrop) {
  navBackdrop.addEventListener('click', () => setMobileMenu(false));
}

/* =========================================================
   2. Кнопка «Нагору» з плавним переходом
   ========================================================= */
const scrollUp = el('scroll-up');

function toggleScrollUp() {
  if (window.scrollY > 280) {
    scrollUp.hidden = false;
    requestAnimationFrame(() => scrollUp.classList.add('is-visible'));
  } else {
    scrollUp.classList.remove('is-visible');
    setTimeout(() => {
      if (window.scrollY <= 280) scrollUp.hidden = true;
    }, 350);
  }
}
window.addEventListener('scroll', toggleScrollUp, { passive: true });
toggleScrollUp();

scrollUp.addEventListener('click', (e) => {
  e.preventDefault();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  const nav = el('main-nav');
  if (nav) nav.focus({ preventScroll: true });
});

/* =========================================================
   Підменю навігації
   ========================================================= */
const submenuItems = document.querySelectorAll('.has-submenu');

function setSubmenu(item, open) {
  item.classList.toggle('is-open', open);
  const trigger = item.querySelector(':scope > a');
  if (trigger) trigger.setAttribute('aria-expanded', String(open));
}

submenuItems.forEach((item) => {
  const link = item.querySelector(':scope > a');

  item.addEventListener('mouseenter', () => {
    if (window.innerWidth > 760) setSubmenu(item, true);
  });
  item.addEventListener('mouseleave', () => {
    if (window.innerWidth > 760) setSubmenu(item, false);
  });
  item.addEventListener('focusin', () => setSubmenu(item, true));
  item.addEventListener('focusout', (e) => {
    if (!item.contains(e.relatedTarget)) setSubmenu(item, false);
  });

  link.addEventListener('click', (e) => {
    const isMobileOrTouch = window.innerWidth <= 760 || window.matchMedia('(hover: none)').matches;
    if (isMobileOrTouch && !item.classList.contains('is-open')) {
      e.preventDefault();
      submenuItems.forEach((other) => setSubmenu(other, other === item));
    } else if (window.innerWidth <= 760) {
      setMobileMenu(false);
    }
  });
});

/* Закриття мобільного меню при переході за внутрішнім посиланням */
if (mainNav) {
  mainNav.querySelectorAll('a').forEach((a) => {
    a.addEventListener('click', () => {
      const parentHasSub = a.parentElement && a.parentElement.classList.contains('has-submenu');
      if (!parentHasSub && window.innerWidth <= 760) {
        setMobileMenu(false);
      }
    });
  });
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('.has-submenu')) submenuItems.forEach((i) => setSubmenu(i, false));
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    submenuItems.forEach((i) => setSubmenu(i, false));
    setMobileMenu(false);
  }
});

/* =========================================================
   3. Карусель відгуків користувачів (Лаб. 4 — п. 6)
   ========================================================= */
(function initReviewsCarousel() {
  const track = el('reviews-track');
  const dotsWrap = el('reviews-dots');
  const prevBtn = el('reviews-prev');
  const nextBtn = el('reviews-next');
  const carousel = el('reviews-carousel');
  if (!track || !dotsWrap) return;

  let currentIndex = 0;
  let autoplayTimer = null;

  function perView() {
    return window.innerWidth <= 760 ? 1 : 2;
  }

  function slidesCount() {
    return track.querySelectorAll('.review-slide').length;
  }

  function maxIndex() {
    return Math.max(0, slidesCount() - perView());
  }

  function buildDots() {
    dotsWrap.replaceChildren();
    const pages = maxIndex() + 1;
    for (let i = 0; i < pages; i++) {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'carousel-dot' + (i === currentIndex ? ' is-active' : '');
      dot.setAttribute('aria-label', 'Слайд відгуків ' + (i + 1));
      dot.addEventListener('click', () => goTo(i));
      dotsWrap.appendChild(dot);
    }
  }

  function updateCarousel() {
    if (currentIndex > maxIndex()) currentIndex = maxIndex();
    const stepPct = 100 / perView();
    track.style.transform = 'translateX(-' + (currentIndex * stepPct) + '%)';
    dotsWrap.querySelectorAll('.carousel-dot').forEach((d, idx) => {
      d.classList.toggle('is-active', idx === currentIndex);
    });
  }

  function goTo(index) {
    const max = maxIndex();
    if (index < 0) currentIndex = max;
    else if (index > max) currentIndex = 0;
    else currentIndex = index;
    updateCarousel();
  }

  function startAutoplay() {
    stopAutoplay();
    autoplayTimer = setInterval(() => goTo(currentIndex + 1), 5500);
  }

  function stopAutoplay() {
    if (autoplayTimer) clearInterval(autoplayTimer);
  }

  if (prevBtn) prevBtn.addEventListener('click', () => { goTo(currentIndex - 1); startAutoplay(); });
  if (nextBtn) nextBtn.addEventListener('click', () => { goTo(currentIndex + 1); startAutoplay(); });

  if (carousel) {
    carousel.addEventListener('mouseenter', stopAutoplay);
    carousel.addEventListener('mouseleave', startAutoplay);
    carousel.addEventListener('focusin', stopAutoplay);
    carousel.addEventListener('focusout', startAutoplay);

    let touchStartX = 0;
    carousel.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].clientX;
    }, { passive: true });
    carousel.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 45) {
        goTo(dx < 0 ? currentIndex + 1 : currentIndex - 1);
        startAutoplay();
      }
    }, { passive: true });
  }

  window.addEventListener('resize', () => {
    buildDots();
    updateCarousel();
  });

  buildDots();
  updateCarousel();
  startAutoplay();

  /* Додавання нового відгуку з форми зворотного зв'язку в карусель */
  const fbForm = el('feedback-form');
  if (fbForm) {
    fbForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = el('fb-name').value.trim();
      const text = el('fb-message').value.trim();
      if (!name || !text) return;

      const initials = name.split(/\s+/).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
      const slide = document.createElement('article');
      slide.className = 'review-slide';
      slide.innerHTML =
        '<div class="review-card">' +
          '<div class="review-top">' +
            '<div class="review-avatar" style="background:#eaf1fe;color:#2f6fed;"></div>' +
            '<div>' +
              '<strong class="review-author"></strong>' +
              '<span class="review-role">Користувач FinTrack</span>' +
            '</div>' +
            '<span class="review-stars" aria-label="Оцінка 5 з 5">&#9733;&#9733;&#9733;&#9733;&#9733;</span>' +
          '</div>' +
          '<p class="review-text"></p>' +
          '<span class="review-date">Щойно</span>' +
        '</div>';

      slide.querySelector('.review-avatar').textContent = initials || 'КФ';
      slide.querySelector('.review-author').textContent = name;
      slide.querySelector('.review-text').textContent = '«' + text + '»';

      track.appendChild(slide);
      buildDots();
      goTo(maxIndex());
      fbForm.reset();
      setMsg('fb-msg', 'Дякуємо! Ваш відгук опубліковано у каруселі вище.', true);
      setTimeout(() => setMsg('fb-msg', ''), 4000);
    });
  }
})();

/* =========================================================
   4. Модальні вікна та показ/приховування пароля
   ========================================================= */
const authModal = el('auth-modal');
const surveyModal = el('survey-modal');
const settingsModal = el('settings-modal');

function openDialog(dialog) {
  if (dialog && !dialog.open) dialog.showModal();
}

el('open-auth').addEventListener('click', () => {
  if (currentUser) openSettings();
  else openDialog(authModal);
});
el('tx-login-btn').addEventListener('click', () => openDialog(authModal));
el('open-survey').addEventListener('click', () => openDialog(surveyModal));
el('open-settings').addEventListener('click', () => {
  if (currentUser) openSettings();
  else openDialog(authModal);
});

el('close-auth').addEventListener('click', () => authModal.close());
el('close-survey').addEventListener('click', () => surveyModal.close());
el('close-settings').addEventListener('click', () => settingsModal.close());

[authModal, surveyModal, settingsModal].forEach((dlg) => {
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg) dlg.close();
  });
});

/* Перемикач видимості пароля */
document.querySelectorAll('[data-toggle-pwd]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const input = el(btn.dataset.togglePwd);
    if (!input) return;
    const isPwd = input.type === 'password';
    input.type = isPwd ? 'text' : 'password';
    btn.style.opacity = isPwd ? '1' : '0.65';
  });
});

el('survey-form').addEventListener('submit', (e) => {
  e.preventDefault();
  e.target.reset();
  surveyModal.close();
  alert('Дякуємо! Відповіді збережено.');
});

/* =========================================================
   5. Supabase (ПІДКЛЮЧЕННЯ ДО БАЗИ ДАНИХ ЗБЕРЕЖЕНО)
   ========================================================= */
const { supabaseUrl, supabaseKey } = window.FINTRACK_CONFIG;
const db = window.supabase.createClient(supabaseUrl, supabaseKey);

let currentUser = null;
let transactions = [];

function translateError(message) {
  const map = [
    ['Invalid login credentials', 'Невірний email або пароль.'],
    ['User already registered', 'Користувач з таким email уже існує.'],
    ['Password should be at least', 'Пароль має містити щонайменше 6 символів.'],
    ['Unable to validate email', 'Некоректний email.'],
    ['Email not confirmed', 'Підтвердіть пошту за посиланням у листі.'],
    ['rate limit', 'Забагато спроб. Спробуйте за хвилину.']
  ];
  const found = map.find(([en]) => message.toLowerCase().includes(en.toLowerCase()));
  return found ? found[1] : message;
}

function setMsg(id, text, ok = false) {
  const node = el(id);
  if (!node) return;
  node.textContent = text;
  node.classList.toggle('form-msg--ok', ok);
}

/* ---------- Реєстрація ---------- */
el('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const email = form.email.value.trim();
  const password = form.password.value;

  if (password !== form.password2.value) {
    setMsg('reg-msg', 'Паролі не збігаються.');
    return;
  }
  setMsg('reg-msg', 'Реєструємо…', true);
  const { data, error } = await db.auth.signUp({ email, password });
  if (error) {
    setMsg('reg-msg', translateError(error.message));
    return;
  }
  if (data.session) {
    form.reset();
    setMsg('reg-msg', '');
    authModal.close();
  } else {
    setMsg('reg-msg', 'Готово! Перевірте пошту й підтвердіть email.', true);
  }
});

/* ---------- Вхід ---------- */
el('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  setMsg('login-msg', 'Входимо…', true);
  const { error } = await db.auth.signInWithPassword({
    email: form.email.value.trim(),
    password: form.password.value
  });
  if (error) {
    setMsg('login-msg', translateError(error.message));
    return;
  }
  form.reset();
  setMsg('login-msg', '');
  authModal.close();
});

/* ---------- Вихід ---------- */
async function logout() {
  settingsModal.close();
  await db.auth.signOut();
}
el('logout-btn').addEventListener('click', logout);
el('settings-logout').addEventListener('click', logout);

/* ---------- Стан інтерфейсу ---------- */
function applyAuthState(user) {
  currentUser = user;
  const logged = Boolean(user);
  const openAuthBtn = el('open-auth');
  el('logout-btn').hidden = !logged;
  openAuthBtn.classList.toggle('is-logged', logged);
  el('profile-initial').textContent = logged ? user.email[0].toUpperCase() : 'Sign in';
  openAuthBtn.title = logged ? user.email : 'Sign in / Вхід';
  el('tx-guest').hidden = logged;
  el('tx-app').hidden = !logged;
  if (logged) {
    loadTransactions();
  } else {
    transactions = [];
    render();
  }
}

db.auth.onAuthStateChange((_event, session) => {
  applyAuthState(session ? session.user : null);
});
db.auth.getSession().then(({ data }) => applyAuthState(data.session ? data.session.user : null));

/* ---------- Читання ---------- */
async function loadTransactions() {
  const { data, error } = await db
    .from('transactions')
    .select('*')
    .order('created_at', { ascending: false })
    .order('id', { ascending: false });
  if (error) {
    setMsg('tx-msg', 'Не вдалося завантажити дані: ' + error.message);
    return;
  }
  setMsg('tx-msg', '');
  transactions = data;
  render();
}

/* ---------- Додавання ---------- */
function pad(n) { return String(n).padStart(2, '0'); }
function dateKey(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }

el('tx-date').value = dateKey(new Date());

el('tx-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const f = form.elements;
  const row = {
    title: f.title.value.trim(),
    category: f.category.value,
    type: f.type.value,
    amount: Number(f.amount.value),
    created_at: f.date.value
  };
  const { error } = await db.from('transactions').insert(row);
  if (error) {
    setMsg('tx-msg', 'Не вдалося додати: ' + error.message);
    return;
  }
  f.title.value = '';
  f.amount.value = '';
  setMsg('tx-msg', 'Додано.', true);
  setTimeout(() => setMsg('tx-msg', ''), 2500);
  loadTransactions();
});

/* ---------- Видалення ---------- */
async function deleteTransaction(id) {
  const { error } = await db.from('transactions').delete().eq('id', id);
  if (error) {
    setMsg('tx-msg', 'Не вдалося видалити: ' + error.message);
    return;
  }
  loadTransactions();
}

/* ---------- Налаштування ---------- */
function openSettings() {
  el('settings-email').textContent = currentUser.email;
  el('settings-count').textContent = transactions.length;
  openDialog(settingsModal);
}

el('settings-wipe').addEventListener('click', async () => {
  if (!transactions.length) return;
  if (!confirm('Видалити всі ' + transactions.length + ' транзакцій? Це не можна скасувати.')) return;
  const { error } = await db.from('transactions').delete().eq('user_id', currentUser.id);
  if (error) {
    alert('Не вдалося видалити: ' + error.message);
    return;
  }
  await loadTransactions();
  el('settings-count').textContent = 0;
});

/* ---------- Експорт CSV ---------- */
function exportCsv() {
  if (!currentUser) {
    openDialog(authModal);
    return;
  }
  const esc = (v) => '"' + String(v).replace(/"/g, '""') + '"';
  const lines = [['Дата', 'Опис', 'Категорія', 'Тип', 'Сума'].map(esc).join(';')];
  transactions.forEach((t) => {
    lines.push([
      t.created_at,
      t.title,
      t.category,
      t.type === 'income' ? 'Дохід' : 'Витрата',
      Number(t.amount).toFixed(2).replace('.', ',')
    ].map(esc).join(';'));
  });
  const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'fintrack-transactions.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
el('export-csv').addEventListener('click', (e) => {
  e.preventDefault();
  exportCsv();
});
el('settings-export').addEventListener('click', exportCsv);

/* =========================================================
   6. Відображення
   ========================================================= */
const CATEGORIES = {
  'Продукти':   { icon: '🛒', color: '#fff1e0' },
  'Транспорт':  { icon: '🚕', color: '#e3f0ff' },
  'Розваги':    { icon: '🎬', color: '#f3e8ff' },
  'Комунальні': { icon: '💡', color: '#fff9db' },
  'Підписки':   { icon: '📺', color: '#e6f7f1' },
  'Зарплата':   { icon: '💼', color: '#e4f8e9' },
  'Інше':       { icon: '📦', color: '#eef0f3' }
};
const catInfo = (name) => CATEGORIES[name] || CATEGORIES['Інше'];

const MONTHS_SHORT = ['січ', 'лют', 'бер', 'кві', 'тра', 'чер', 'лип', 'сер', 'вер', 'жов', 'лис', 'гру'];
const MONTHS_FULL = ['січень', 'лютий', 'березень', 'квітень', 'травень', 'червень', 'липень', 'серпень', 'вересень', 'жовтень', 'листопад', 'грудень'];

const money = (n) => Number(n).toLocaleString('uk-UA', { maximumFractionDigits: 2 }) + ' ₴';
const fmtDate = (key) => key.split('-').reverse().join('.');
const sum = (list) => list.reduce((s, t) => s + Number(t.amount), 0);

(function fillCategories() {
  const txSelect = el('tx-category');
  const filterSelect = el('filter-category');
  Object.keys(CATEGORIES).forEach((name) => {
    txSelect.add(new Option(name, name));
    filterSelect.add(new Option(name, name));
  });
})();

/* ---------- Фільтри ---------- */
function getFiltered() {
  const period = el('filter-period').value;
  const type = el('filter-type').value;
  const category = el('filter-category').value;
  const q = el('search-input').value.trim().toLowerCase();
  const today = dateKey(new Date());

  return transactions.filter((t) => {
    if (period === 'month' && t.created_at.slice(0, 7) !== today.slice(0, 7)) return false;
    if (period === 'year' && t.created_at.slice(0, 4) !== today.slice(0, 4)) return false;
    if (type !== 'all' && t.type !== type) return false;
    if (category && t.category !== category) return false;
    if (q && !(t.title.toLowerCase().includes(q) || t.category.toLowerCase().includes(q))) return false;
    return true;
  });
}

['filter-period', 'filter-type', 'filter-category'].forEach((id) => el(id).addEventListener('change', render));
el('search-input').addEventListener('input', render);
el('search-form').addEventListener('submit', (e) => {
  e.preventDefault();
  el('transactions').scrollIntoView({ behavior: 'smooth' });
});
el('filters').addEventListener('submit', (e) => e.preventDefault());
el('chart-period').addEventListener('change', render);

/* ---------- Головна функція відмальовування ---------- */
function render() {
  const list = getFiltered();
  renderStats(list);
  renderSparklines(list);
  renderChart(list);
  renderTopCategories(list);
  renderRankings(list);
  renderTxList(list);
}

/* ---------- Показники ---------- */
function renderStats(list) {
  const income = sum(list.filter((t) => t.type === 'income'));
  const expenses = list.filter((t) => t.type === 'expense');
  const expense = sum(expenses);
  const biggest = expenses.reduce((m, t) => Math.max(m, Number(t.amount)), 0);

  el('stat-count').textContent = list.length;
  el('stat-income').textContent = money(income);
  el('stat-expense').textContent = money(expense);
  el('stat-balance').textContent = money(income - expense);
  el('stat-balance').classList.toggle('stat-value--negative', income - expense < 0);
  el('stat-avg').textContent = money(expenses.length ? expense / expenses.length : 0);
  el('stat-max').textContent = money(biggest);
}

/* ---------- Спарклайни ---------- */
function lastMonths(count) {
  const now = new Date();
  const result = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push({ key: d.getFullYear() + '-' + pad(d.getMonth() + 1), month: d.getMonth(), year: d.getFullYear() });
  }
  return result;
}

function smoothPath(points) {
  let d = 'M' + points[0][0] + ',' + points[0][1];
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    const mx = (x0 + x1) / 2;
    d += ' C' + mx + ',' + y0 + ' ' + mx + ',' + y1 + ' ' + x1 + ',' + y1;
  }
  return d;
}

function sparkSvg(values, color, gradId) {
  const W = 120, H = 40, margin = 4;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  const points = values.map((v, i) => [
    +(i * (W / (values.length - 1))).toFixed(2),
    +(span === 0 ? H / 2 : H - margin - ((v - min) / span) * (H - margin * 2)).toFixed(2)
  ]);
  const line = smoothPath(points);
  const area = line + ' L' + W + ',' + H + ' L0,' + H + ' Z';
  return '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" focusable="false">' +
    '<defs><linearGradient id="' + gradId + '" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="' + color + '" stop-opacity="0.28"/>' +
    '<stop offset="1" stop-color="' + color + '" stop-opacity="0"/></linearGradient></defs>' +
    '<path d="' + area + '" fill="url(#' + gradId + ')"/>' +
    '<path d="' + line + '" fill="none" stroke="' + color + '" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linecap="round"/>' +
    '</svg>';
}

function renderSparklines(list) {
  const months = lastMonths(12);
  const incomeBy = months.map(() => 0);
  const expenseBy = months.map(() => 0);
  let before = 0;

  list.forEach((t) => {
    const idx = months.findIndex((m) => m.key === t.created_at.slice(0, 7));
    const amount = Number(t.amount);
    const signed = t.type === 'income' ? amount : -amount;
    if (idx === -1) {
      if (t.created_at.slice(0, 7) < months[0].key) before += signed;
      return;
    }
    if (t.type === 'income') incomeBy[idx] += amount;
    else expenseBy[idx] += amount;
  });

  let running = before;
  const balanceBy = months.map((_, i) => (running += incomeBy[i] - expenseBy[i]));

  el('spark-income').innerHTML = sparkSvg(incomeBy, '#2f6fed', 'g-income');
  el('spark-balance').innerHTML = sparkSvg(balanceBy, '#2f6fed', 'g-balance');
  el('spark-expense').innerHTML = sparkSvg(expenseBy, '#e8704f', 'g-expense');
}

/* ---------- Стовпчаста діаграма ---------- */
function buildBuckets(list, mode) {
  const now = new Date();
  const buckets = [];

  if (mode === 'months') {
    lastMonths(12).forEach((m) => {
      buckets.push({
        key: m.key,
        label: MONTHS_SHORT[m.month],
        full: MONTHS_FULL[m.month] + ' ' + m.year,
        income: 0,
        expense: 0
      });
    });
  } else {
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      buckets.push({
        key: dateKey(d),
        label: String(d.getDate()),
        full: d.getDate() + ' ' + MONTHS_FULL[d.getMonth()],
        income: 0,
        expense: 0
      });
    }
  }

  const map = new Map(buckets.map((b) => [b.key, b]));
  list.forEach((t) => {
    const key = mode === 'months' ? t.created_at.slice(0, 7) : t.created_at;
    const bucket = map.get(key);
    if (bucket) bucket[t.type] += Number(t.amount);
  });
  return buckets;
}

function niceMax(value) {
  if (value <= 0) return 100;
  const raw = value / 4;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 5, 10].find((s) => raw / pow <= s) * pow;
  return step * 4;
}

function shortNumber(n) {
  if (n >= 1000000) return +(n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return +(n / 1000).toFixed(1) + 'к';
  return String(n);
}

const chartEl = el('chart');
let chartBuckets = [];

function renderChart(list) {
  const mode = el('chart-period').value;
  chartBuckets = buildBuckets(list, mode);

  const W = 270, H = 215, L = 32, R = 4, T = 10, B = 24;
  const ch = H - T - B;
  const n = chartBuckets.length;
  const groupW = (W - L - R) / n;
  const barW = Math.min(8, groupW * 0.3);
  const gap = 2;
  const total = barW * 2 + gap;

  const peak = Math.max(0, ...chartBuckets.flatMap((b) => [b.income, b.expense]));
  const max = niceMax(peak);

  let svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" focusable="false"><defs>' +
    '<linearGradient id="bar-income" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5b8ff5"/><stop offset="1" stop-color="#2f6fed"/></linearGradient>' +
    '<linearGradient id="bar-expense" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6b93b"/><stop offset="1" stop-color="#e05a4f"/></linearGradient>' +
    '</defs>';

  for (let i = 0; i <= 4; i++) {
    const y = T + ch - (ch * i) / 4;
    svg += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y + '" y2="' + y + '" class="chart-grid"/>';
    svg += '<text x="' + (L - 6) + '" y="' + (y + 3) + '" text-anchor="end" class="chart-axis">' + shortNumber((max * i) / 4) + '</text>';
  }

  chartBuckets.forEach((b, i) => {
    const cx = L + i * groupW + groupW / 2;
    const x0 = cx - total / 2;
    const hIncome = b.income ? Math.max(3, (b.income / max) * ch) : 0;
    const hExpense = b.expense ? Math.max(3, (b.expense / max) * ch) : 0;

    svg += '<rect x="' + (x0 - 3) + '" y="' + T + '" width="' + (total + 6) + '" height="' + ch + '" rx="' + ((total + 6) / 2) + '" class="chart-track"/>';
    if (hIncome) svg += '<rect x="' + x0 + '" y="' + (T + ch - hIncome) + '" width="' + barW + '" height="' + hIncome + '" rx="' + (barW / 2) + '" fill="url(#bar-income)"/>';
    if (hExpense) svg += '<rect x="' + (x0 + barW + gap) + '" y="' + (T + ch - hExpense) + '" width="' + barW + '" height="' + hExpense + '" rx="' + (barW / 2) + '" fill="url(#bar-expense)"/>';
    svg += '<text x="' + cx + '" y="' + (H - 7) + '" text-anchor="middle" class="chart-axis">' + b.label + '</text>';
    svg += '<rect x="' + (cx - groupW / 2) + '" y="' + T + '" width="' + groupW + '" height="' + ch + '" fill="transparent" data-i="' + i + '" class="chart-hit"/>';
  });

  svg += '</svg>';
  const empty = peak === 0 ? '<p class="chart-empty">' + (currentUser ? 'Немає даних за цей період' : 'Увійдіть і додайте транзакції, щоб побачити графік') + '</p>' : '';
  chartEl.innerHTML = svg + empty + '<div class="chart-tip" id="chart-tip" hidden></div>';
}

chartEl.addEventListener('mousemove', (e) => {
  const tip = el('chart-tip');
  const target = e.target.closest('[data-i]');
  if (!tip) return;
  if (!target) { tip.hidden = true; return; }

  const b = chartBuckets[Number(target.dataset.i)];
  tip.replaceChildren();
  const title = document.createElement('strong');
  title.textContent = b.full;
  const inc = document.createElement('span');
  inc.textContent = 'Доходи: ' + money(b.income);
  const exp = document.createElement('span');
  exp.textContent = 'Витрати: ' + money(b.expense);
  tip.append(title, inc, exp);
  tip.hidden = false;

  const box = chartEl.getBoundingClientRect();
  let x = e.clientX - box.left + 14;
  if (x + tip.offsetWidth > box.width) x = e.clientX - box.left - tip.offsetWidth - 14;
  tip.style.left = Math.max(0, x) + 'px';
  tip.style.top = Math.max(0, e.clientY - box.top - 10) + 'px';
});
chartEl.addEventListener('mouseleave', () => {
  const tip = el('chart-tip');
  if (tip) tip.hidden = true;
});

/* ---------- Категорії ---------- */
function topCategories(list, type) {
  const items = list.filter((t) => t.type === type);
  const total = sum(items);
  const byCat = new Map();
  items.forEach((t) => byCat.set(t.category, (byCat.get(t.category) || 0) + Number(t.amount)));
  return [...byCat.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, value]) => ({ name, value, pct: total ? (value / total) * 100 : 0 }));
}

function catIcon(name) {
  const info = catInfo(name);
  const span = document.createElement('span');
  span.className = 'cat-icon';
  span.style.background = info.color;
  span.textContent = info.icon;
  span.setAttribute('aria-hidden', 'true');
  return span;
}

function renderTopList(listId, emptyId, rows, barClass) {
  const ul = el(listId);
  ul.replaceChildren();
  el(emptyId).hidden = rows.length > 0;

  rows.forEach((row) => {
    const li = document.createElement('li');

    const name = document.createElement('span');
    name.className = 'topic-name';
    name.textContent = row.name;

    const bar = document.createElement('progress');
    bar.className = 'bar ' + barClass;
    bar.max = 100;
    bar.value = Math.round(row.pct);
    bar.textContent = Math.round(row.pct) + '%';

    const pct = document.createElement('span');
    pct.className = 'topic-pct';
    pct.textContent = Math.round(row.pct) + '% ';
    const small = document.createElement('small');
    small.textContent = money(row.value);
    pct.appendChild(small);

    li.append(catIcon(row.name), name, bar, pct);
    ul.appendChild(li);
  });
}

function renderTopCategories(list) {
  renderTopList('top-expense', 'top-expense-empty', topCategories(list, 'expense'), 'bar--warn');
  renderTopList('top-income', 'top-income-empty', topCategories(list, 'income'), 'bar--good');
}

/* ---------- Рейтинги ---------- */
function renderRankList(listId, emptyId, items, isIncome) {
  const ul = el(listId);
  ul.replaceChildren();
  el(emptyId).hidden = items.length > 0;

  items.forEach((t) => {
    const li = document.createElement('li');

    const info = document.createElement('span');
    info.className = 'rank-info';
    const name = document.createElement('span');
    name.className = 'rank-name';
    name.textContent = t.title;
    const sub = document.createElement('span');
    sub.className = 'rank-sub';
    sub.textContent = t.category + ' · ' + fmtDate(t.created_at);
    info.append(name, sub);

    const badge = document.createElement('span');
    badge.className = 'rank-badge ' + (isIncome ? '' : 'rank-badge--down');
    badge.textContent = (isIncome ? '+' : '−') + money(t.amount);

    li.append(catIcon(t.category), info, badge);
    ul.appendChild(li);
  });
}

function renderRankings(list) {
  const biggest = list.filter((t) => t.type === 'expense')
    .sort((a, b) => Number(b.amount) - Number(a.amount))
    .slice(0, 3);
  const latestIncome = list.filter((t) => t.type === 'income').slice(0, 3);
  renderRankList('rank-expense', 'rank-expense-empty', biggest, false);
  renderRankList('rank-income', 'rank-income-empty', latestIncome, true);
}

/* ---------- Список транзакцій ---------- */
function renderTxList(list) {
  const ul = el('tx-list');
  ul.replaceChildren();

  const pill = el('tx-count');
  pill.hidden = !currentUser;
  pill.textContent = list.length === transactions.length
    ? transactions.length + ' записів'
    : list.length + ' з ' + transactions.length;

  el('tx-empty').hidden = !currentUser || list.length > 0;

  list.forEach((t) => {
    const isIncome = t.type === 'income';
    const li = document.createElement('li');
    li.className = 'tx-row';

    const main = document.createElement('div');
    main.className = 'tx-main';
    const title = document.createElement('span');
    title.className = 'tx-title';
    title.textContent = t.title;
    const meta = document.createElement('span');
    meta.className = 'tx-meta';
    meta.textContent = fmtDate(t.created_at);
    main.append(title, meta);

    const chip = document.createElement('span');
    chip.className = 'tx-chip';
    chip.textContent = t.category;

    const amount = document.createElement('span');
    amount.className = 'tx-amount ' + (isIncome ? 'amount--positive' : 'amount--negative');
    amount.textContent = (isIncome ? '+' : '−') + money(t.amount);

    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'row-delete';
    del.setAttribute('aria-label', 'Видалити транзакцію ' + t.title);
    del.textContent = '×';
    del.addEventListener('click', () => deleteTransaction(t.id));

    li.append(catIcon(t.category), main, chip, amount, del);
    ul.appendChild(li);
  });
}

render();
