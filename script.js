const CONTENT_URL = 'content/site.json';

const elements = {
  heroImage: document.getElementById('hero-image'),
  heroImagePlaceholder: document.getElementById('hero-image-placeholder'),
  heroEyebrow: document.getElementById('hero-eyebrow'),
  heroTitle: document.getElementById('hero-title'),
  heroIntro: document.getElementById('hero-intro'),
  heroPrimaryCta: document.getElementById('hero-primary-cta'),
  heroSecondaryCta: document.getElementById('hero-secondary-cta'),
  headerSocials: document.getElementById('header-socials'),
  featuredEyebrow: document.getElementById('featured-eyebrow'),
  featuredTitle: document.getElementById('featured-title'),
  featuredDate: document.getElementById('featured-date'),
  featuredLocation: document.getElementById('featured-location'),
  featuredBody: document.getElementById('featured-body'),
  featuredLink: document.getElementById('featured-link'),
  aboutTitle: document.getElementById('about-title'),
  aboutBody: document.getElementById('about-body'),
  agendaTitle: document.getElementById('agenda-title'),
  agendaIntro: document.getElementById('agenda-intro'),
  agendaList: document.getElementById('agenda-list'),
  contactTitle: document.getElementById('contact-title'),
  contactBody: document.getElementById('contact-body'),
  contactEmail: document.getElementById('contact-email'),
  contactSocials: document.getElementById('contact-socials'),
  footerNote: document.getElementById('footer-note'),
};

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderRichText(target, text = '') {
  const paragraphs = String(text)
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  target.innerHTML = paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('');
}

function renderLinks(target, items = []) {
  target.innerHTML = '';

  (items || []).forEach((item) => {
    if (!item?.label || !item?.url) {
      return;
    }

    const link = document.createElement('a');
    link.href = item.url;
    link.target = '_blank';
    link.rel = 'noreferrer';
    link.textContent = item.label;
    target.appendChild(link);
  });
}

function renderAgenda(target, items = []) {
  target.innerHTML = '';

  (items || []).forEach((item) => {
    const article = document.createElement('article');
    article.className = 'agenda-item';

    const buttonMarkup = item.buttonUrl
      ? `<a class="agenda-link" href="${escapeHtml(item.buttonUrl)}" target="_blank" rel="noreferrer">${escapeHtml(item.buttonLabel || 'Läs mer')}</a>`
      : '';

    article.innerHTML = `
      <div class="agenda-date">${escapeHtml(item.date || '')}</div>
      <div class="agenda-content">
        <h3>${escapeHtml(item.title || '')}</h3>
        <p class="agenda-location">${escapeHtml(item.location || '')}</p>
        <p class="agenda-description">${escapeHtml(item.description || '')}</p>
        ${buttonMarkup}
      </div>
    `;

    target.appendChild(article);
  });
}

function applyImage(url, alt = '') {
  if (!url) {
    elements.heroImage.classList.add('hidden');
    elements.heroImage.removeAttribute('src');
    elements.heroImage.alt = '';
    elements.heroImagePlaceholder.classList.remove('hidden');
    return;
  }

  elements.heroImage.src = url;
  elements.heroImage.alt = alt || '';
  elements.heroImage.classList.remove('hidden');
  elements.heroImagePlaceholder.classList.add('hidden');
}

function applyLink(element, label, href, fallbackLabel, fallbackHref) {
  element.textContent = label || fallbackLabel;
  element.href = href || fallbackHref;
}

function applyFeatured(featured = {}) {
  elements.featuredEyebrow.textContent = featured.eyebrow || 'Aktuellt';
  elements.featuredTitle.textContent = featured.title || 'Kommande konsert';
  elements.featuredDate.textContent = featured.date || '';
  elements.featuredLocation.textContent = featured.location || '';
  elements.featuredBody.textContent = featured.body || '';

  if (featured.buttonUrl) {
    elements.featuredLink.href = featured.buttonUrl;
    elements.featuredLink.textContent = featured.buttonLabel || 'Läs mer';
    elements.featuredLink.classList.remove('hidden');
  } else {
    elements.featuredLink.classList.add('hidden');
    elements.featuredLink.removeAttribute('href');
  }
}

function applySiteData(data) {
  if (data.meta?.title) {
    document.title = data.meta.title;
  }

  const description = document.querySelector('meta[name="description"]');
  if (description && data.meta?.description) {
    description.setAttribute('content', data.meta.description);
  }

  applyImage(data.hero?.image || '', data.hero?.imageAlt || '');

  elements.heroEyebrow.textContent = data.hero?.eyebrow || 'Vokalen';
  elements.heroTitle.textContent = data.hero?.title || 'Vokalen';
  renderRichText(elements.heroIntro, data.hero?.intro || '');

  applyLink(
    elements.heroPrimaryCta,
    data.hero?.primaryCtaLabel,
    data.hero?.primaryCtaHref,
    'Boka eller kontakta oss',
    '#contact',
  );

  applyLink(
    elements.heroSecondaryCta,
    data.hero?.secondaryCtaLabel,
    data.hero?.secondaryCtaHref,
    'Se kalendern',
    '#agenda',
  );

  renderLinks(elements.headerSocials, data.header?.socialLinks || []);
  applyFeatured(data.hero?.featured || {});

  elements.aboutTitle.textContent = data.about?.title || 'Om oss';
  renderRichText(elements.aboutBody, data.about?.body || '');

  elements.agendaTitle.textContent = data.agenda?.title || 'Kalender & agenda';
  elements.agendaIntro.textContent = data.agenda?.intro || '';
  renderAgenda(elements.agendaList, data.agenda?.items || []);

  elements.contactTitle.textContent = data.contact?.title || 'Kontakt';
  renderRichText(elements.contactBody, data.contact?.body || '');

  const email = data.contact?.email || 'kontakt@vokalen.se';
  elements.contactEmail.href = `mailto:${email}`;
  elements.contactEmail.textContent = data.contact?.emailLabel || email;

  renderLinks(elements.contactSocials, data.header?.socialLinks || []);
  elements.footerNote.textContent = data.footer?.note || 'Vokalen';
}

async function loadSiteData() {
  try {
    const response = await fetch(CONTENT_URL, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error('Kunde inte ladda innehållet.');
    }

    const data = await response.json();
    applySiteData(data);
  } catch (error) {
    console.error(error);
    elements.heroEyebrow.textContent = 'Innehåll kunde inte laddas';
    elements.heroIntro.innerHTML = '<p>Kontrollera att content/site.json finns och innehåller giltig JSON.</p>';
  }
}

loadSiteData();
