const BOTANICAL_MARKUP = `
  <svg viewBox="0 0 70 92" aria-hidden="true" class="brand-mark">
    <path d="M34 88C33 61 34 34 35 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
    <path d="M36 21C50 12 58 11 64 14C59 27 49 31 37 29" fill="currentColor" opacity=".72" />
    <path d="M34 39C18 27 9 27 4 31C10 45 22 48 34 46" fill="currentColor" opacity=".55" />
    <path d="M35 58C52 47 61 48 66 53C59 67 48 70 36 65" fill="currentColor" opacity=".42" />
    <path d="M32 75C18 65 9 66 4 70C10 82 21 85 32 81" fill="currentColor" opacity=".55" />
  </svg>
`;

const INSTAGRAM_ICON = `
  <svg viewBox="0 0 24 24" aria-hidden="true" class="social-icon">
    <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="1.8" />
    <circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="1.8" />
    <circle cx="17.3" cy="6.7" r="1.2" fill="currentColor" />
  </svg>
`;

const MAIL_ICON = `
  <svg viewBox="0 0 24 24" class="mail-icon" aria-hidden="true">
    <path d="M4 6h16v12H4z" fill="none" stroke="currentColor" stroke-width="1.8" />
    <path d="m5 7 7 6 7-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
`;

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function hasTextContent(value = '') {
  return String(value || '').trim().length > 0;
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

function clampPercent(value, fallback) {
  const numericValue = Number.parseFloat(value);
  if (!Number.isFinite(numericValue)) {
    return fallback;
  }

  return Math.min(100, Math.max(0, numericValue));
}

function isExternalHref(value = '') {
  return /^https?:\/\//i.test(value);
}

function renderRichText(text = '') {
  return String(text)
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
    .join('');
}

function buildLinkAttributes(href = '') {
  const normalizedHref = normalizeHref(href);
  if (!normalizedHref) {
    return '';
  }

  return `href="${escapeHtml(normalizedHref)}"${isExternalHref(normalizedHref) ? ' target="_blank" rel="noreferrer"' : ''}`;
}

function renderSocialLinks(items = []) {
  return (items || [])
    .filter((item) => item?.label && normalizeHref(item?.url))
    .map((item) => `<a class="social-text-link" ${buildLinkAttributes(item.url)}>${escapeHtml(item.label)}</a>`)
    .join('');
}

function getSiteTitle(data) {
  return data.meta?.title || 'Vokalen';
}

function renderBrandMark(data) {
  return data.header?.logoImage
    ? `<img class="brand-mark brand-mark-image" src="${escapeHtml(data.header.logoImage)}" alt="" />`
    : BOTANICAL_MARKUP;
}

function buildHeroBannerStyle(hero = {}) {
  return `style="--hero-focus-x: ${clampPercent(hero.imageFocusX, 50)}%; --hero-focus-y: ${clampPercent(hero.imageFocusY, 58)}%;"`;
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

function renderHeaderSocialIcon(data) {
  const firstSocial = (data.header?.socialLinks || []).find((item) => item?.label && normalizeHref(item.url));
  if (!firstSocial) {
    return '';
  }

  return `<a class="social-icon-button" ${buildLinkAttributes(firstSocial.url)} aria-label="${escapeHtml(firstSocial.label)}">${INSTAGRAM_ICON}</a>`;
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
  const images = getGalleryImages(data);

  if (images.length === 0) {
    return `
      <article class="gallery-card">
        <div class="gallery-image-placeholder"><span>Lägg till bilder i CMS:et för att fylla galleriet.</span></div>
      </article>
    `;
  }

  return images
    .map(
      (item) => `
        <article class="gallery-card hover-lift">
          <img class="gallery-image" src="${escapeHtml(item.image)}" alt="${escapeHtml(item.imageAlt || '')}" />
        </article>
      `,
    )
    .join('');
}

function renderAgenda(items = []) {
  if ((items || []).length === 0) {
    return `
      <article class="agenda-card">
        <div class="agenda-date-panel">
          <p class="agenda-date-primary">-</p>
        </div>
        <div class="agenda-card-body">
          <h3>Inga evenemang just nu</h3>
          <p class="agenda-description">Lägg till nästa spelning eller konsert i CMS:et.</p>
        </div>
      </article>
    `;
  }

  return (items || [])
    .map((item) => {
      const dateParts = splitDateParts(item.date || '');
      const buttonHref = normalizeHref(item.buttonUrl || '');
      const buttonMarkup = buttonHref
        ? `<a class="agenda-link" ${buildLinkAttributes(buttonHref)}>${escapeHtml(item.buttonLabel || 'Läs mer')}</a>`
        : '';

      return `
        <article class="agenda-card hover-lift">
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
        </article>
      `;
    })
    .join('');
}

function renderAgendaMark(data) {
  if (!data.agenda?.markImage) {
    return '';
  }

  return `
    <div class="agenda-mark" aria-hidden="true">
      <div class="agenda-mark-frame">
        <img class="agenda-mark-image" src="${escapeHtml(data.agenda.markImage)}" alt="" />
      </div>
    </div>
  `;
}

function buildPreviewHtml(data) {
  const primarySocial = getPrimarySocialLink(data);
  const siteTitle = getSiteTitle(data);
  const featuredLink = normalizeHref(data.hero?.featured?.buttonUrl || '');
  const heroImageMarkup = data.hero?.image
    ? `<img class="hero-banner-image" src="${escapeHtml(data.hero.image)}" alt="${escapeHtml(data.hero?.imageAlt || '')}" />`
    : '<div class="hero-image-placeholder"><span>Stor ensemblebild</span></div>';
  const aboutImageMarkup = data.about?.image
    ? `<img class="about-image hover-lift" src="${escapeHtml(data.about.image)}" alt="${escapeHtml(data.about?.imageAlt || '')}" />`
    : '<div class="about-image-placeholder"><span>Bild från repetition eller konsert</span></div>';

  return `<!doctype html>
<html lang="sv">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(data.meta?.title || 'Vokalen')}</title>
    <meta name="description" content="${escapeHtml(data.meta?.description || '')}" />
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body>
    <div class="page-shell">
      <header class="site-header">
        <nav class="site-nav-shell" aria-label="Huvudnavigering">
          <a class="brand" href="#hem" aria-label="Vokalen startsida">
            ${renderBrandMark(data)}
            <span class="brand-wordmark">${escapeHtml(siteTitle)}</span>
          </a>

          <div class="nav-cluster">
            <div class="nav-links">
              <a href="#om-oss">Om oss</a>
              <a href="#kalender">Kalender</a>
              <a href="#kontakt">Kontakt</a>
            </div>

            <div class="social-strip">
              <div class="social-text-links">${renderSocialLinks(data.header?.socialLinks || [])}</div>
              ${renderHeaderSocialIcon(data)}
            </div>
          </div>
        </nav>
      </header>

      <main id="hem">
        <section class="hero-section section-frame">
          <div class="hero-banner organic-divider" ${buildHeroBannerStyle(data.hero || {})}>
            ${heroImageMarkup}
          </div>

          <div class="hero-grid">
            <div class="hero-copy">
              <p class="script-kicker">${escapeHtml(data.hero?.eyebrow || 'Vokalen')}</p>
              <h1>${escapeHtml(data.hero?.title || 'Vokalen')}</h1>
              <div class="body-copy lead-copy">${renderRichText(data.hero?.intro || '')}</div>

              <div class="button-row">
                <a class="button button-primary" ${buildLinkAttributes(data.hero?.primaryCtaHref || '#kontakt')}>${escapeHtml(data.hero?.primaryCtaLabel || 'Boka eller kontakta oss')}</a>
                <a class="button button-secondary" ${buildLinkAttributes(data.hero?.secondaryCtaHref || '#kalender')}>${escapeHtml(data.hero?.secondaryCtaLabel || 'Se mer')}</a>
              </div>
            </div>

            <article class="highlight-panel">
              <p class="section-kicker highlight-kicker">${escapeHtml(data.hero?.featured?.eyebrow || 'Nyhet!')}</p>
              <h2>${escapeHtml(data.hero?.featured?.title || 'Kommande konsert')}</h2>
              <p class="highlight-date">${escapeHtml(data.hero?.featured?.date || '')}</p>
              <p class="highlight-location">${escapeHtml(data.hero?.featured?.location || '')}</p>
              <p class="highlight-body">${escapeHtml(data.hero?.featured?.body || '')}</p>
              ${featuredLink ? `<a class="button button-highlight" ${buildLinkAttributes(featuredLink)}>${escapeHtml(data.hero?.featured?.buttonLabel || 'Mer info')}</a>` : ''}
            </article>
          </div>
        </section>

        <section class="about-section section-frame" id="om-oss">
          <div class="about-copy">
            <p class="section-kicker">Om oss</p>
            <h2>${escapeHtml(data.about?.title || 'Om oss')}</h2>
            <div class="section-rule" aria-hidden="true"></div>
            <div class="body-copy">${renderRichText(data.about?.body || '')}</div>
          </div>

          <div class="about-visual">
            ${aboutImageMarkup}
            ${hasTextContent(data.about?.badgeText) ? `<div class="about-badge">${escapeHtml(String(data.about.badgeText).trim())}</div>` : ''}
          </div>
        </section>

        <section class="gallery-section section-frame" aria-label="Bildgalleri">
          <div class="gallery-grid">${renderGallery(data)}</div>
        </section>

        <section class="agenda-section" id="kalender">
          <div class="section-frame agenda-grid">
            <div class="agenda-copy">
              <p class="section-kicker">Kalender</p>
              <h2>${escapeHtml(data.agenda?.title || 'Vår agenda')}</h2>
              <p class="agenda-intro">${escapeHtml(data.agenda?.intro || '')}</p>
              <div class="agenda-cards">${renderAgenda(data.agenda?.items || [])}</div>
            </div>
            ${renderAgendaMark(data)}
          </div>
        </section>

        <section class="contact-section section-frame" id="kontakt">
          <div class="contact-panel">
            <div class="contact-panel-left">
              ${MAIL_ICON}
              <p class="section-kicker contact-kicker">Kontakt</p>
              <h2>${escapeHtml(data.contact?.title || 'Kontakt')}</h2>
              <div class="body-copy contact-body">${renderRichText(data.contact?.body || '')}</div>
            </div>

            <div class="contact-panel-right">
              <div>
                <p class="contact-helper">Skicka ett mejl till oss</p>
                <a class="contact-email" ${buildLinkAttributes(`mailto:${data.contact?.email || 'kontakt@vokalen.se'}`)}>${escapeHtml(data.contact?.emailLabel || data.contact?.email || 'kontakt@vokalen.se')}</a>
              </div>

              ${primarySocial ? `<a class="button button-secondary" ${buildLinkAttributes(primarySocial.url)}>${escapeHtml(primarySocial.label || 'Social länk')}</a>` : ''}
            </div>
          </div>
        </section>
      </main>

      <footer class="site-footer">
        <div class="footer-inner">
          <a class="brand footer-brand" href="#hem" aria-label="Tillbaka till toppen">
            ${renderBrandMark(data)}
            <span class="brand-wordmark">${escapeHtml(siteTitle)}</span>
          </a>

          <p class="footer-note">${escapeHtml(data.footer?.note || 'Vokalen')}</p>
          <a class="footer-admin" href="/admin/">Admin</a>
        </div>
      </footer>
    </div>
    <script>
      (() => {
        const root = document.documentElement;
        const siteHeader = document.querySelector('.site-header');
        const siteNavShell = document.querySelector('.site-nav-shell');
        const heroSection = document.querySelector('.hero-section');
        const banner = document.querySelector('.hero-banner');
        const image = document.querySelector('.hero-banner-image');

        const clamp01 = (value) => Math.min(1, Math.max(0, value));

        const syncHeaderHeight = () => {
          const headerHeight = (siteHeader && siteHeader.offsetHeight) || (siteNavShell && siteNavShell.offsetHeight) || 80;
          root.style.setProperty('--header-height', headerHeight + 'px');
        };

        const syncScrollEffects = () => {
          root.style.setProperty('--header-progress', clamp01(window.scrollY / 176).toFixed(3));

          if (!heroSection) {
            root.style.setProperty('--hero-progress', '0');
            return;
          }

          const heroTop = window.scrollY + heroSection.getBoundingClientRect().top;
          const heroStart = Math.max(0, heroTop - 72);
          const heroDistance = Math.max(window.innerHeight * 0.86, 420);
          const heroProgress = clamp01((window.scrollY - heroStart) / heroDistance);

          root.style.setProperty('--hero-progress', heroProgress.toFixed(3));
        };

        if (!banner || !image) {
          syncHeaderHeight();
          syncScrollEffects();
          window.addEventListener('scroll', syncScrollEffects, { passive: true });
          window.addEventListener('resize', () => {
            syncHeaderHeight();
            syncScrollEffects();
          });
          return;
        }

        const applyRatio = () => {
          if (!image.naturalWidth || !image.naturalHeight) {
            return;
          }

          const ratio = image.naturalWidth / image.naturalHeight;
          banner.style.setProperty('--hero-media-ratio', image.naturalWidth + ' / ' + image.naturalHeight);
          banner.dataset.imageShape = ratio >= 1.7 ? 'wide' : ratio <= 1 ? 'portrait' : 'balanced';
        };

        if (image.complete) {
          applyRatio();
        } else {
          image.addEventListener('load', applyRatio, { once: true });
        }

        syncHeaderHeight();
        syncScrollEffects();
        window.addEventListener('scroll', syncScrollEffects, { passive: true });
        window.addEventListener('resize', () => {
          syncHeaderHeight();
          syncScrollEffects();
        });
      })();
    </script>
  </body>
</html>`;
}

function iframePreview(html) {
  return window.h('iframe', {
    srcDoc: html,
    style: {
      width: '100%',
      minHeight: '85vh',
      border: '1px solid rgba(0,0,0,0.08)',
      borderRadius: '12px',
      background: '#ffffff',
    },
  });
}

function entryToObject(entry) {
  if (!entry) {
    return {};
  }

  const data = typeof entry.get === 'function' ? entry.get('data') : entry.data;
  if (!data) {
    return {};
  }

  return typeof data.toJS === 'function' ? data.toJS() : data;
}

function Preview({ entry }) {
  const data = entryToObject(entry);
  return iframePreview(buildPreviewHtml(data));
}

export function registerPreviewTemplates(CMS) {
  CMS.registerPreviewTemplate('site', Preview);
}
