const COMMIT_MESSAGES = {
  create: 'Skapa innehåll',
  update: 'Uppdatera hemsidan',
  delete: 'Ta bort innehåll',
  uploadMedia: 'Ladda upp "{{path}}"',
  deleteMedia: 'Ta bort "{{path}}"',
};

function stripTrailingSlash(value = '') {
  return String(value).replace(/\/+$/, '');
}

function resolvePublicSiteUrl() {
  if (typeof window === 'undefined') {
    return 'https://dev.vokalen.se';
  }

  const params = new URLSearchParams(window.location.search);
  const explicitSiteUrl = params.get('site');
  if (explicitSiteUrl) {
    return stripTrailingSlash(explicitSiteUrl);
  }

  return stripTrailingSlash(window.location.origin);
}

function resolveDefaultBranch() {
  if (typeof window === 'undefined') {
    return 'dev';
  }

  return window.location.hostname.startsWith('dev.') ? 'dev' : 'main';
}

function buildProxyUrl(apiBase = '', sessionToken = '') {
  const base = stripTrailingSlash(apiBase) || resolvePublicSiteUrl();
  const url = new URL('/api/cms', `${base}/`);

  if (sessionToken) {
    url.searchParams.set('token', sessionToken);
  }

  return url.toString();
}

export function createCmsConfig({ apiBase = '', sessionToken = '', branch = resolveDefaultBranch() } = {}) {
  const siteUrl = resolvePublicSiteUrl();

  return {
    backend: {
      name: 'proxy',
      proxy_url: buildProxyUrl(apiBase, sessionToken),
      branch,
      commit_messages: COMMIT_MESSAGES,
    },
    locale: 'sv',
    display_url: siteUrl,
    site_url: siteUrl,
    search: false,
    publish_mode: 'simple',
    media_folder: 'images/uploads',
    public_folder: '/images/uploads',
    slug: {
      encoding: 'ascii',
      clean_accents: true,
    },
    media_library: {
      max_file_size: 10485760,
      folder_support: false,
    },
    collections: [
      {
        name: 'site',
        label: 'Hemsidan',
        format: 'json',
        editor: {
          preview: true,
        },
        files: [
          {
            name: 'site',
            label: 'Redigera hemsidan',
            file: 'content/site.json',
            fields: [
              {
                label: 'Sök och delning',
                name: 'meta',
                widget: 'object',
                collapsed: false,
                fields: [
                  { label: 'Titel', name: 'title', widget: 'string' },
                  {
                    label: 'Beskrivning',
                    name: 'description',
                    widget: 'text',
                    hint: 'Visas i sökresultat och när länken delas.',
                  },
                ],
              },
              {
                label: 'Toppmeny och sociala länkar',
                name: 'header',
                widget: 'object',
                collapsed: false,
                fields: [
                  {
                    label: 'Logo-bild',
                    name: 'logoImage',
                    widget: 'image',
                    required: false,
                    hint: 'Om den lämnas tom används den befintliga illustrerade loggan.',
                  },
                  {
                    label: 'Sociala länkar',
                    name: 'socialLinks',
                    widget: 'list',
                    summary: '{{fields.label}}',
                    fields: [
                      { label: 'Namn', name: 'label', widget: 'string' },
                      { label: 'Länk', name: 'url', widget: 'string' },
                    ],
                  },
                ],
              },
              {
                label: 'Övre delen av startsidan',
                name: 'hero',
                widget: 'object',
                collapsed: false,
                fields: [
                  { label: 'Stor bild', name: 'image', widget: 'image', required: false },
                  { label: 'Bildtext för skärmläsare', name: 'imageAlt', widget: 'string', required: false },
                  {
                    label: 'Bildfokus horisontellt',
                    name: 'imageFocusX',
                    widget: 'number',
                    required: false,
                    value_type: 'int',
                    min: 0,
                    max: 100,
                    step: 1,
                    hint: '50 är mitten. Justera om viktiga personer hamnar för långt åt vänster eller höger i beskärningen.',
                  },
                  {
                    label: 'Bildfokus vertikalt',
                    name: 'imageFocusY',
                    widget: 'number',
                    required: false,
                    value_type: 'int',
                    min: 0,
                    max: 100,
                    step: 1,
                    hint: '50 är mitten. Höj värdet om ni vill visa mer av nederdelen av bilden och mindre tak.',
                  },
                  { label: 'Liten rubrik', name: 'eyebrow', widget: 'string' },
                  { label: 'Huvudrubrik', name: 'title', widget: 'string' },
                  { label: 'Beskrivning', name: 'intro', widget: 'text' },
                  { label: 'Första knappens text', name: 'primaryCtaLabel', widget: 'string' },
                  { label: 'Första knappens länk', name: 'primaryCtaHref', widget: 'string' },
                  { label: 'Andra knappens text', name: 'secondaryCtaLabel', widget: 'string' },
                  { label: 'Andra knappens länk', name: 'secondaryCtaHref', widget: 'string' },
                  {
                    label: 'Highlight / viktig nyhet',
                    name: 'featured',
                    widget: 'object',
                    fields: [
                      { label: 'Liten rubrik', name: 'eyebrow', widget: 'string', required: false },
                      { label: 'Rubrik', name: 'title', widget: 'string' },
                      { label: 'Datum', name: 'date', widget: 'string', required: false },
                      { label: 'Plats', name: 'location', widget: 'string', required: false },
                      { label: 'Text', name: 'body', widget: 'text', required: false },
                      { label: 'Knapptext', name: 'buttonLabel', widget: 'string', required: false },
                      { label: 'Knapplänk', name: 'buttonUrl', widget: 'string', required: false },
                    ],
                  },
                ],
              },
              {
                label: 'Om oss',
                name: 'about',
                widget: 'object',
                collapsed: false,
                fields: [
                  { label: 'Rubrik', name: 'title', widget: 'string' },
                  { label: 'Text', name: 'body', widget: 'text' },
                  { label: 'Bild', name: 'image', widget: 'image', required: false },
                  { label: 'Bildtext', name: 'imageAlt', widget: 'string', required: false },
                  { label: 'Rund badge-text', name: 'badgeText', widget: 'string', required: false },
                ],
              },
              {
                label: 'Bildgalleri',
                name: 'gallery',
                widget: 'object',
                collapsed: false,
                fields: [
                  {
                    label: 'Bilder',
                    name: 'images',
                    widget: 'list',
                    summary: '{{fields.imageAlt}}',
                    fields: [
                      { label: 'Bild', name: 'image', widget: 'image' },
                      { label: 'Bildtext', name: 'imageAlt', widget: 'string', required: false },
                    ],
                  },
                ],
              },
              {
                label: 'Kalender / agenda',
                name: 'agenda',
                widget: 'object',
                collapsed: false,
                fields: [
                  { label: 'Rubrik', name: 'title', widget: 'string' },
                  { label: 'Kort intro', name: 'intro', widget: 'text', required: false },
                  {
                    label: 'Dekorativ bild bredvid agendan',
                    name: 'markImage',
                    widget: 'image',
                    required: false,
                    hint: 'Valfri dekorativ bild. Döljs automatiskt på mindre skärmar.',
                  },
                  {
                    label: 'Poster',
                    name: 'items',
                    widget: 'list',
                    summary: '{{fields.title}} — {{fields.date}}',
                    fields: [
                      { label: 'Titel', name: 'title', widget: 'string' },
                      { label: 'Datum', name: 'date', widget: 'string' },
                      { label: 'Plats', name: 'location', widget: 'string', required: false },
                      { label: 'Beskrivning', name: 'description', widget: 'text', required: false },
                      { label: 'Knapptext', name: 'buttonLabel', widget: 'string', required: false },
                      { label: 'Knapplänk', name: 'buttonUrl', widget: 'string', required: false },
                    ],
                  },
                ],
              },
              {
                label: 'Kontakt',
                name: 'contact',
                widget: 'object',
                collapsed: false,
                fields: [
                  { label: 'Rubrik', name: 'title', widget: 'string' },
                  { label: 'Text', name: 'body', widget: 'text' },
                  { label: 'E-postadress', name: 'email', widget: 'string' },
                  { label: 'Text för e-postlänken', name: 'emailLabel', widget: 'string', required: false },
                  { label: 'Social länk', name: 'instagram', widget: 'string', required: false },
                  { label: 'Text för social knapp', name: 'instagramLabel', widget: 'string', required: false },
                ],
              },
              {
                label: 'Sidfot',
                name: 'footer',
                widget: 'object',
                collapsed: true,
                fields: [{ label: 'Text', name: 'note', widget: 'text', required: false }],
              },
            ],
          },
        ],
      },
    ],
  };
}
