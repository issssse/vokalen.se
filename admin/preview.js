function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderRichText(text = '') {
  return String(text)
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
    .join('');
}

function renderLinks(items = []) {
  return (items || [])
    .filter((item) => item?.label && item?.url)
    .map((item) => `<a href="${escapeHtml(item.url)}">${escapeHtml(item.label)}</a>`)
    .join('');
}

function renderAgenda(items = []) {
  return (items || [])
    .map((item) => {
      const link = item.buttonUrl
        ? `<a class="agenda-link" href="${escapeHtml(item.buttonUrl)}">${escapeHtml(item.buttonLabel || 'Läs mer')}</a>`
        : '';

      return `
        <article class="agenda-item">
          <div class="agenda-date">${escapeHtml(item.date || '')}</div>
          <div class="agenda-content">
            <h3>${escapeHtml(item.title || '')}</h3>
            <p class="agenda-location">${escapeHtml(item.location || '')}</p>
            <p class="agenda-description">${escapeHtml(item.description || '')}</p>
            ${link}
          </div>
        </article>
      `;
    })
    .join('');
}

function buildPreviewHtml(data) {
  const socials = renderLinks(data.header?.socialLinks || []);
  const imageMarkup = data.hero?.image
    ? `<img class="hero-image" src="${escapeHtml(data.hero.image)}" alt="${escapeHtml(data.hero?.imageAlt || '')}" />`
    : `<div class="hero-image-placeholder"><span>Stor ensemblebild</span></div>`;
  const featuredLink = data.hero?.featured?.buttonUrl
    ? `<a class="button button-light" href="${escapeHtml(data.hero.featured.buttonUrl)}">${escapeHtml(data.hero.featured.buttonLabel || 'Läs mer')}</a>`
    : '';

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
    <div class="site-shell">
      <header class="site-header" id="top">
        <a class="wordmark" href="#top">Vokalen</a>
        <div class="header-right">
          <nav class="site-nav" aria-label="Huvudmeny">
            <a href="#about">Om oss</a>
            <a href="#agenda">Kalender</a>
            <a href="#contact">Kontakt</a>
          </nav>
          <div class="header-socials">${socials}</div>
        </div>
      </header>

      <main>
        <section class="hero-media">
          <div class="hero-image-wrap">${imageMarkup}</div>
        </section>

        <section class="hero-copy">
          <div class="hero-main">
            <p class="eyebrow">${escapeHtml(data.hero?.eyebrow || '')}</p>
            <h1>${escapeHtml(data.hero?.title || '')}</h1>
            <div class="rich-text intro">${renderRichText(data.hero?.intro || '')}</div>
            <div class="hero-actions">
              <a class="button button-primary" href="${escapeHtml(data.hero?.primaryCtaHref || '#contact')}">${escapeHtml(data.hero?.primaryCtaLabel || 'Boka eller kontakta oss')}</a>
              <a class="button button-secondary" href="${escapeHtml(data.hero?.secondaryCtaHref || '#agenda')}">${escapeHtml(data.hero?.secondaryCtaLabel || 'Se kalendern')}</a>
            </div>
          </div>

          <aside class="highlight-card">
            <p class="card-kicker">${escapeHtml(data.hero?.featured?.eyebrow || 'Aktuellt')}</p>
            <h2>${escapeHtml(data.hero?.featured?.title || '')}</h2>
            <p class="card-meta">${escapeHtml(data.hero?.featured?.date || '')}</p>
            <p class="card-meta">${escapeHtml(data.hero?.featured?.location || '')}</p>
            <p class="card-body">${escapeHtml(data.hero?.featured?.body || '')}</p>
            ${featuredLink}
          </aside>
        </section>

        <section class="section" id="about">
          <div class="section-heading">
            <p class="section-kicker">Om oss</p>
            <h2>${escapeHtml(data.about?.title || '')}</h2>
          </div>
          <div class="rich-text section-copy">${renderRichText(data.about?.body || '')}</div>
        </section>

        <section class="section" id="agenda">
          <div class="section-header split">
            <div>
              <p class="section-kicker">Kalender</p>
              <h2>${escapeHtml(data.agenda?.title || '')}</h2>
            </div>
            <p class="section-intro">${escapeHtml(data.agenda?.intro || '')}</p>
          </div>
          <div class="agenda-list">${renderAgenda(data.agenda?.items || [])}</div>
        </section>

        <section class="contact-section" id="contact">
          <div class="section-heading">
            <p class="section-kicker">Kontakt</p>
            <h2>${escapeHtml(data.contact?.title || '')}</h2>
          </div>
          <div class="contact-grid">
            <div class="rich-text section-copy">${renderRichText(data.contact?.body || '')}</div>
            <div class="contact-card">
              <a class="contact-email" href="mailto:${escapeHtml(data.contact?.email || '')}">${escapeHtml(data.contact?.emailLabel || data.contact?.email || '')}</a>
              <div class="contact-socials">${socials}</div>
            </div>
          </div>
        </section>
      </main>

      <footer class="site-footer">
        <p>${escapeHtml(data.footer?.note || '')}</p>
        <a href="/admin/">Admin</a>
      </footer>
    </div>
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
