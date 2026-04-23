const CONTENT_URL = 'content/site.json';

const elements = {
  heroBanner: document.querySelector('.hero-banner'),
  heroImage: document.getElementById('hero-image'),
  heroImagePlaceholder: document.getElementById('hero-image-placeholder'),
  heroEyebrow: document.getElementById('hero-eyebrow'),
  heroTitle: document.getElementById('hero-title'),
  heroIntro: document.getElementById('hero-intro'),
  heroPrimaryCta: document.getElementById('hero-primary-cta'),
  heroSecondaryCta: document.getElementById('hero-secondary-cta'),
  headerSocials: document.getElementById('header-socials'),
  headerSocialIcon: document.getElementById('header-social-icon'),
  featuredEyebrow: document.getElementById('featured-eyebrow'),
  featuredTitle: document.getElementById('featured-title'),
  featuredDate: document.getElementById('featured-date'),
  featuredLocation: document.getElementById('featured-location'),
  featuredBody: document.getElementById('featured-body'),
  featuredLink: document.getElementById('featured-link'),
  aboutTitle: document.getElementById('about-title'),
  aboutBody: document.getElementById('about-body'),
  aboutImage: document.getElementById('about-image'),
  aboutImagePlaceholder: document.getElementById('about-image-placeholder'),
  aboutBadge: document.getElementById('about-badge'),
  galleryGrid: document.getElementById('gallery-grid'),
  agendaTitle: document.getElementById('agenda-title'),
  agendaIntro: document.getElementById('agenda-intro'),
  agendaList: document.getElementById('agenda-list'),
  contactTitle: document.getElementById('contact-title'),
  contactBody: document.getElementById('contact-body'),
  contactEmail: document.getElementById('contact-email'),
  contactSocialLink: document.getElementById('contact-social-link'),
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

function normalizeHref(value = '') {
  const href = String(value || '').trim();
  if (!href) {
    return '';
  }

  if (/^(#|\/|mailto:|tel:|https?:\/\/)/i.test(href)) {
    return href;
  }

  if (/^[\w.-]+\.[a-z]{2,}(?:[/?#].*)?$/i.test(href)) {
    return `https://${href}`;
  }

  return href;
}

function isExternalHref(value = '') {
  return /^https?:\/\//i.test(value);
}

function applyLinkBehavior(element, href = '') {
  if (!href) {
    element.removeAttribute('href');
    element.removeAttribute('target');
    element.removeAttribute('rel');
    return;
  }

  element.href = href;

  if (isExternalHref(href)) {
    element.target = '_blank';
    element.rel = 'noreferrer';
  } else {
    element.removeAttribute('target');
    element.removeAttribute('rel');
  }
}

function applyImage(element, placeholder, url, alt = '') {
  if (!url) {
    element.classList.add('hidden');
    element.removeAttribute('src');
    element.alt = '';
    placeholder.classList.remove('hidden');
    return;
  }

  element.src = url;
  element.alt = alt || '';
  element.classList.remove('hidden');
  placeholder.classList.add('hidden');
}

function clampPercent(value, fallback) {
  const numericValue = Number.parseFloat(value);
  if (!Number.isFinite(numericValue)) {
    return fallback;
  }

  return Math.min(100, Math.max(0, numericValue));
}

function resetHeroImageFrame() {
  if (!elements.heroBanner) {
    return;
  }

  elements.heroBanner.style.removeProperty('--hero-media-ratio');
  elements.heroBanner.style.removeProperty('--hero-focus-x');
  elements.heroBanner.style.removeProperty('--hero-focus-y');
  elements.heroBanner.removeAttribute('data-image-shape');
}

function updateHeroImageFrame(image, focusX, focusY) {
  if (!elements.heroBanner) {
    return;
  }

  elements.heroBanner.style.setProperty('--hero-focus-x', `${clampPercent(focusX, 50)}%`);
  elements.heroBanner.style.setProperty('--hero-focus-y', `${clampPercent(focusY, 58)}%`);

  const applyRatio = () => {
    if (!image.naturalWidth || !image.naturalHeight) {
      return;
    }

    const ratio = image.naturalWidth / image.naturalHeight;
    const shape = ratio >= 1.7 ? 'wide' : ratio <= 1 ? 'portrait' : 'balanced';

    elements.heroBanner.style.setProperty('--hero-media-ratio', `${image.naturalWidth} / ${image.naturalHeight}`);
    elements.heroBanner.dataset.imageShape = shape;
  };

  if (image.complete) {
    applyRatio();
    return;
  }

  image.addEventListener('load', applyRatio, { once: true });
}

function applyHeroImage(url, alt = '', focusX, focusY) {
  applyImage(elements.heroImage, elements.heroImagePlaceholder, url, alt);

  if (!url) {
    resetHeroImageFrame();
    return;
  }

  updateHeroImageFrame(elements.heroImage, focusX, focusY);
}

function renderRichText(target, text = '') {
  const paragraphs = String(text)
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  target.innerHTML = paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('');
}

function clearElement(target) {
  while (target.firstChild) {
    target.removeChild(target.firstChild);
  }
}

function renderSocialLinks(target, items = []) {
  clearElement(target);

  (items || []).forEach((item) => {
    const href = normalizeHref(item?.url);
    if (!item?.label || !href) {
      return;
    }

    const link = document.createElement('a');
    link.className = 'social-text-link';
    link.textContent = item.label;
    applyLinkBehavior(link, href);
    target.appendChild(link);
  });
}

function getPrimarySocialLink(data) {
  const instagramHref = normalizeHref(data.contact?.instagram);
  if (instagramHref) {
    return {
      label: data.contact?.instagramLabel || 'Instagram',
      url: instagramHref,
    };
  }

  const fallback = (data.header?.socialLinks || []).find((item) => item?.label && normalizeHref(item.url));
  if (!fallback) {
    return null;
  }

  return {
    label: fallback.label,
    url: normalizeHref(fallback.url),
  };
}

function renderHeaderSocials(data) {
  const socialLinks = (data.header?.socialLinks || []).map((item) => ({
    label: item?.label || '',
    url: normalizeHref(item?.url),
  }));

  renderSocialLinks(elements.headerSocials, socialLinks);

  const firstSocial = socialLinks.find((item) => item.label && item.url);
  if (!firstSocial) {
    elements.headerSocialIcon.classList.add('hidden');
    applyLinkBehavior(elements.headerSocialIcon, '');
    elements.headerSocialIcon.setAttribute('aria-label', 'Social länk');
    return;
  }

  elements.headerSocialIcon.classList.remove('hidden');
  elements.headerSocialIcon.setAttribute('aria-label', firstSocial.label);
  applyLinkBehavior(elements.headerSocialIcon, firstSocial.url);
}

function setButtonLink(element, label, href, fallbackLabel, fallbackHref) {
  element.textContent = label || fallbackLabel;
  applyLinkBehavior(element, normalizeHref(href || fallbackHref));
}

function setOptionalLink(element, label, href, fallbackLabel = '') {
  const normalizedHref = normalizeHref(href);
  if (!normalizedHref) {
    element.classList.add('hidden');
    element.textContent = fallbackLabel;
    applyLinkBehavior(element, '');
    return;
  }

  element.classList.remove('hidden');
  element.textContent = label || fallbackLabel;
  applyLinkBehavior(element, normalizedHref);
}

function splitDateParts(value = '') {
  const trimmed = String(value || '').trim();
  if (!trimmed) {
    return { primary: '', secondary: '' };
  }

  const match = trimmed.match(/^(\d{1,2})(?:\s+)(.*)$/);
  if (!match) {
    return { primary: trimmed, secondary: '' };
  }

  return {
    primary: match[1],
    secondary: match[2],
  };
}

function getGalleryImages(data) {
  const explicitImages = (data.gallery?.images || [])
    .map((item) => ({
      image: item?.image || '',
      imageAlt: item?.imageAlt || '',
    }))
    .filter((item) => item.image);

  if (explicitImages.length > 0) {
    return explicitImages;
  }

  return [
    {
      image: data.about?.image || '',
      imageAlt: data.about?.imageAlt || '',
    },
    {
      image: data.hero?.image || '',
      imageAlt: data.hero?.imageAlt || '',
    },
  ].filter((item) => item.image);
}

function renderGallery(data) {
  clearElement(elements.galleryGrid);

  const images = getGalleryImages(data);

  if (images.length === 0) {
    const placeholder = document.createElement('article');
    placeholder.className = 'gallery-card';
    placeholder.innerHTML = '<div class="gallery-image-placeholder"><span>Lägg till bilder i CMS:et för att fylla galleriet.</span></div>';
    elements.galleryGrid.appendChild(placeholder);
    return;
  }

  images.forEach((item) => {
    const card = document.createElement('article');
    card.className = 'gallery-card hover-lift';

    const image = document.createElement('img');
    image.className = 'gallery-image';
    image.src = item.image;
    image.alt = item.imageAlt || '';
    card.appendChild(image);

    elements.galleryGrid.appendChild(card);
  });
}

function renderAgenda(items = []) {
  clearElement(elements.agendaList);

  if ((items || []).length === 0) {
    const emptyState = document.createElement('article');
    emptyState.className = 'agenda-card';
    emptyState.innerHTML = `
      <div class="agenda-date-panel">
        <p class="agenda-date-primary">-</p>
      </div>
      <div class="agenda-card-body">
        <h3>Inga evenemang just nu</h3>
        <p class="agenda-description">Lägg till nästa spelning eller konsert i CMS:et.</p>
      </div>
    `;
    elements.agendaList.appendChild(emptyState);
    return;
  }

  (items || []).forEach((item) => {
    const article = document.createElement('article');
    article.className = 'agenda-card hover-lift';

    const dateParts = splitDateParts(item.date || '');
    const normalizedButtonUrl = normalizeHref(item.buttonUrl || '');
    const buttonMarkup = normalizedButtonUrl
      ? `<a class="agenda-link" href="${escapeHtml(normalizedButtonUrl)}"${isExternalHref(normalizedButtonUrl) ? ' target="_blank" rel="noreferrer"' : ''}>${escapeHtml(item.buttonLabel || 'Läs mer')}</a>`
      : '';

    article.innerHTML = `
      <div class="agenda-date-panel">
        <div>
          <p class="agenda-date-primary">${escapeHtml(dateParts.primary || item.date || '')}</p>
          ${dateParts.secondary ? `<p class="agenda-date-secondary">${escapeHtml(dateParts.secondary)}</p>` : ''}
        </div>
      </div>
      <div class="agenda-card-body">
        <h3>${escapeHtml(item.title || '')}</h3>
        <p class="agenda-place">${escapeHtml(item.location || '')}</p>
        <p class="agenda-description">${escapeHtml(item.description || '')}</p>
        ${buttonMarkup}
      </div>
    `;

    elements.agendaList.appendChild(article);
  });
}

function applyFeatured(featured = {}) {
  elements.featuredEyebrow.textContent = featured.eyebrow || 'Nyhet!';
  elements.featuredTitle.textContent = featured.title || 'Kommande konsert';
  elements.featuredDate.textContent = featured.date || '';
  elements.featuredLocation.textContent = featured.location || '';
  elements.featuredBody.textContent = featured.body || '';

  setOptionalLink(elements.featuredLink, featured.buttonLabel, featured.buttonUrl, 'Mer info');
}

function applySiteData(data) {
  if (data.meta?.title) {
    document.title = data.meta.title;
  }

  const description = document.querySelector('meta[name="description"]');
  if (description && data.meta?.description) {
    description.setAttribute('content', data.meta.description);
  }

  applyHeroImage(
    data.hero?.image || '',
    data.hero?.imageAlt || '',
    data.hero?.imageFocusX,
    data.hero?.imageFocusY,
  );
  elements.heroEyebrow.textContent = data.hero?.eyebrow || 'Vokalen';
  elements.heroTitle.textContent = data.hero?.title || 'Vokalen';
  renderRichText(elements.heroIntro, data.hero?.intro || '');
  setButtonLink(elements.heroPrimaryCta, data.hero?.primaryCtaLabel, data.hero?.primaryCtaHref, 'Boka eller kontakta oss', '#kontakt');
  setButtonLink(elements.heroSecondaryCta, data.hero?.secondaryCtaLabel, data.hero?.secondaryCtaHref, 'Se mer', '#kalender');

  renderHeaderSocials(data);
  applyFeatured(data.hero?.featured || {});

  elements.aboutTitle.textContent = data.about?.title || 'Om oss';
  renderRichText(elements.aboutBody, data.about?.body || '');
  applyImage(elements.aboutImage, elements.aboutImagePlaceholder, data.about?.image || '', data.about?.imageAlt || '');

  if (data.about?.badgeText) {
    elements.aboutBadge.textContent = data.about.badgeText;
    elements.aboutBadge.classList.remove('hidden');
  } else {
    elements.aboutBadge.classList.add('hidden');
  }

  renderGallery(data);

  elements.agendaTitle.textContent = data.agenda?.title || 'Vår agenda';
  elements.agendaIntro.textContent = data.agenda?.intro || '';
  renderAgenda(data.agenda?.items || []);

  elements.contactTitle.textContent = data.contact?.title || 'Kontakt';
  renderRichText(elements.contactBody, data.contact?.body || '');

  const email = data.contact?.email || 'kontakt@vokalen.se';
  elements.contactEmail.textContent = data.contact?.emailLabel || email;
  applyLinkBehavior(elements.contactEmail, `mailto:${email}`);

  const primarySocial = getPrimarySocialLink(data);
  setOptionalLink(
    elements.contactSocialLink,
    primarySocial?.label || data.contact?.instagramLabel,
    primarySocial?.url || data.contact?.instagram,
    'Social länk',
  );

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
