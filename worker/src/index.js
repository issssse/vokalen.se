const COOKIE_NAME = 'vokalen_admin';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const DEFAULT_CONTENT = {
  'content/site.json': `${JSON.stringify(
    {
      meta: {
        title: 'Vokalen',
        description: 'Vokalen är en vokalensemble med varm klang, närvaro och konserter som stannar kvar.',
      },
      header: {
        socialLinks: [
          {
            label: 'Instagram',
            url: 'https://instagram.com/',
          },
          {
            label: 'Facebook',
            url: 'https://facebook.com/',
          },
        ],
      },
      hero: {
        image: '',
        imageAlt: 'Vokalen under konsert',
        eyebrow: 'Varm klang. Tydlig närvaro.',
        title: 'Sång som känns i rummet.',
        intro: 'Vokalen är en vokalensemble som bygger konserter med precision, närvaro och energi. Vi sjunger för att skapa kvällar som stannar kvar länge efter sista tonen.',
        primaryCtaLabel: 'Boka eller kontakta oss',
        primaryCtaHref: 'mailto:kontakt@vokalen.se',
        secondaryCtaLabel: 'Se kalendern',
        secondaryCtaHref: '#agenda',
        featured: {
          eyebrow: 'Aktuellt',
          title: 'Vårkonsert 24 maj 2026',
          date: '24 maj 2026',
          location: 'Mer information kommer',
          body: 'Använd den här rutan till er viktigaste nyhet just nu, till exempel nästa konsert, biljettsläpp eller ett nytt projekt.',
          buttonLabel: 'Läs mer',
          buttonUrl: '',
        },
      },
      about: {
        title: 'Om oss',
        body: 'Vokalen är en kör som vill låta ambitiöst utan att tappa värme. Vi arbetar med scenisk närvaro, text och klang som en helhet. Här kan ni skriva om dirigent, medlemmar, repertoar och var ni brukar framträda.',
      },
      agenda: {
        title: 'Kalender & agenda',
        intro: 'Kommande konserter och framträdanden.',
        items: [
          {
            title: 'Vårkonsert',
            date: '24 maj 2026',
            location: 'Mer information kommer',
            description: 'Det här blocket är till för nästa spelning eller konsertserie.',
            buttonLabel: 'Läs mer',
            buttonUrl: '',
          },
          {
            title: 'Sommarframträdande',
            date: 'Juni 2026',
            location: 'TBA',
            description: 'Lägg in fler konserter direkt i listan utan att skriva kod.',
            buttonLabel: 'Läs mer',
            buttonUrl: '',
          },
        ],
      },
      contact: {
        title: 'Kontakt',
        body: 'För bokningar, frågor och samarbeten är ni varmt välkomna att höra av er.',
        email: 'kontakt@vokalen.se',
        emailLabel: 'kontakt@vokalen.se',
      },
      footer: {
        note: 'Vokalen.se drivs som en statisk webbplats med GitHub Pages och Static CMS.',
      },
    },
    null,
    2,
  )}
`,
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    try {
      if (url.pathname.startsWith('/api/') && request.method === 'OPTIONS') {
        return emptyResponse(request, 204);
      }

      if (url.pathname === '/api/session' && request.method === 'GET') {
        const session = await getSessionState(request, env);
        return jsonResponse(request, {
          authenticated: session.authenticated,
          sessionToken: session.authenticated ? session.token : null,
        });
      }

      if (url.pathname === '/api/login' && request.method === 'POST') {
        return handleLogin(request, env);
      }

      if (url.pathname === '/api/logout' && request.method === 'POST') {
        return handleLogout(request);
      }

      if (url.pathname === '/api/cms' && request.method === 'POST') {
        const session = await getSessionState(request, env);
        if (!session.authenticated) {
          return jsonResponse(request, { error: 'Obehörig.' }, 401);
        }

        const body = await request.json();
        return handleCmsAction(request, body, env);
      }

      if ((request.method === 'GET' || request.method === 'HEAD') && isGithubBackedPublicPath(url.pathname)) {
        return handlePublicGithubFile(request, env, url.pathname);
      }

      if (env.ASSETS) {
        return handleAssetRequest(request, env, url);
      }

      return jsonResponse(request, { error: 'Hittades inte.' }, 404);
    } catch (error) {
      console.error(error);
      return jsonResponse(request, { error: error.message || 'Okänt fel.' }, 500);
    }
  },
};

async function handleLogin(request, env) {
  const { password = '' } = await request.json();
  if (!env.ADMIN_PASSWORD || !env.SESSION_SECRET) {
    return jsonResponse(request, { error: 'Worker-secrets är inte konfigurerade.' }, 500);
  }

  if (password !== env.ADMIN_PASSWORD) {
    return jsonResponse(request, { error: 'Fel lösenord.' }, 401);
  }

  const token = await createSessionToken(env.SESSION_SECRET);

  return jsonResponse(
    request,
    { ok: true, sessionToken: token },
    200,
    {
      'Set-Cookie': buildSessionCookie(token, request, SESSION_TTL_SECONDS),
    },
  );
}

function handleLogout(request) {
  return jsonResponse(
    request,
    { ok: true },
    200,
    {
      'Set-Cookie': buildSessionCookie('', request, 0),
    },
  );
}

async function handleCmsAction(request, body, env) {
  assertGithubConfig(env);

  const action = body?.action;
  const params = body?.params || {};
  const branch = resolveGithubBranch(request, env, params.branch);

  switch (action) {
    case 'info':
      return jsonResponse(request, {
        repo: `${env.GITHUB_OWNER}/${env.GITHUB_REPO}`,
        publish_modes: ['simple'],
        type: 'github_proxy',
      });

    case 'entriesByFiles': {
      const entries = await Promise.all((params.files || []).map((file) => readEntry(env, file.path, branch, file.label)));
      return jsonResponse(request, entries);
    }

    case 'entriesByFolder': {
      const items = await listRepoFiles(env, branch, params.folder || '', params.extension || '', params.depth || 10);
      const entries = await Promise.all(items.map((item) => readEntry(env, item.path, branch)));
      return jsonResponse(request, entries);
    }

    case 'getEntry': {
      const entry = await readEntry(env, params.path, branch);
      return jsonResponse(request, entry);
    }

    case 'persistEntry': {
      if (params.options?.useWorkflow) {
        return jsonResponse(request, { error: 'Editorial workflow stöds inte i den här enklare proxyn.' }, 422);
      }

      let commitUrl = null;
      const dataFiles = params.dataFiles || (params.entry ? [params.entry] : []);
      const assets = params.assets || [];
      const commitMessage = params.options?.commitMessage || 'Update content';

      for (const dataFile of dataFiles) {
        const targetPath = dataFile.newPath || dataFile.path;
        const result = await upsertTextFile(env, targetPath, dataFile.raw, branch, commitMessage);
        commitUrl = result.commitUrl || commitUrl;

        if (dataFile.newPath && dataFile.newPath !== dataFile.path) {
          const deleted = await deleteFileIfExists(env, dataFile.path, branch, commitMessage);
          commitUrl = deleted?.commitUrl || commitUrl;
        }
      }

      for (const asset of assets) {
        const result = await upsertBase64File(env, asset.path, asset.content, branch, commitMessage);
        commitUrl = result.commitUrl || commitUrl;
      }

      return jsonResponse(request, { message: 'entry persisted', commitUrl });
    }

    case 'getMedia': {
      const files = await listRepoFiles(env, branch, params.mediaFolder || 'images/uploads', '', 10);
      const mediaFolder = stripLeadingSlash(params.mediaFolder || 'images/uploads');
      const publicFolder = params.publicFolder || `/${mediaFolder}`;

      return jsonResponse(
        request,
        files.map((item) => ({
          path: item.path,
          url: `/${item.path}`.replace(`/${mediaFolder}`, publicFolder),
          isDirectory: false,
        })),
      );
    }

    case 'getMediaFile': {
      const file = await readMediaFile(env, params.path, branch);
      return jsonResponse(request, file);
    }

    case 'persistMedia': {
      const commitMessage = params.options?.commitMessage || `Upload ${params.asset?.path}`;
      await upsertBase64File(env, params.asset.path, params.asset.content, branch, commitMessage);
      const file = await readMediaFile(env, params.asset.path, branch);
      return jsonResponse(request, file);
    }

    case 'deleteFile': {
      const result = await deleteFileIfExists(env, params.path, branch, params.options?.commitMessage || `Delete ${params.path}`);
      return jsonResponse(request, { message: `deleted file ${params.path}`, commitUrl: result?.commitUrl || null });
    }

    case 'deleteFiles': {
      let commitUrl = null;
      for (const filePath of params.paths || []) {
        const result = await deleteFileIfExists(env, filePath, branch, params.options?.commitMessage || `Delete ${filePath}`);
        commitUrl = result?.commitUrl || commitUrl;
      }
      return jsonResponse(request, { message: `deleted files ${(params.paths || []).join(', ')}`, commitUrl });
    }

    case 'getDeployPreview':
      return jsonResponse(request, null);

    default:
      return jsonResponse(request, { error: `Unknown action ${action}` }, 422);
  }
}

function isGithubBackedPublicPath(pathname = '') {
  const normalizedPath = resolveGithubPublicPath(pathname);

  return (
    normalizedPath === 'index.html' ||
    normalizedPath === 'styles.css' ||
    normalizedPath === 'script.js' ||
    normalizedPath.startsWith('admin/') ||
    normalizedPath.startsWith('content/') ||
    normalizedPath.startsWith('images/uploads/')
  );
}

async function handlePublicGithubFile(request, env, pathname) {
  assertGithubConfig(env);

  const branch = resolveGithubBranch(request, env);
  const normalizedPath = resolveGithubPublicPath(pathname);
  const file = await getRepoFile(env, normalizedPath, branch);

  if (!file) {
    const fallback = getDefaultContent(normalizedPath);
    if (fallback !== null) {
      return new Response(fallback, {
        status: 200,
        headers: {
          'content-type': getContentType(normalizedPath),
          'cache-control': 'no-store',
        },
      });
    }

    return new Response('Not found', {
      status: 404,
      headers: { 'cache-control': 'no-store' },
    });
  }

  return new Response(decodeBase64ToBytes(file.content), {
    status: 200,
    headers: {
      'content-type': getContentType(normalizedPath),
      'cache-control': 'no-store',
      etag: file.sha || '',
    },
  });
}

async function handleAssetRequest(request, env, url) {
  const candidates = [url];

  if (url.pathname.endsWith('/')) {
    candidates.push(new URL(`${url.pathname}index.html`, url));
  } else if (!url.pathname.split('/').pop()?.includes('.')) {
    candidates.push(new URL(`${url.pathname}/index.html`, url));
  }

  let lastError = null;

  for (const candidate of candidates) {
    try {
      const assetRequest = new Request(candidate.toString(), request);
      const response = await env.ASSETS.fetch(assetRequest);
      if (response.status !== 404) {
        return response;
      }
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) {
    throw lastError;
  }

  return new Response('Not found', { status: 404 });
}

async function getSessionState(request, env) {
  const token = getSessionTokenFromRequest(request);
  if (!token || !env.SESSION_SECRET) {
    return { authenticated: false, token: null };
  }

  const isValid = await validateSessionToken(token, env.SESSION_SECRET);
  return {
    authenticated: isValid,
    token: isValid ? token : null,
  };
}

function getSessionTokenFromRequest(request) {
  const authorization = request.headers.get('authorization') || '';
  if (authorization.startsWith('Bearer ')) {
    return authorization.slice('Bearer '.length).trim();
  }

  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  if (token) {
    return token;
  }

  const cookies = parseCookies(request.headers.get('cookie') || '');
  return cookies[COOKIE_NAME] || '';
}

function buildSessionCookie(token, request, maxAge) {
  const secureFlag = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${COOKIE_NAME}=${token}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Lax${secureFlag}`;
}

async function createSessionToken(secret) {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  return `${expiresAt}.${await signValue(String(expiresAt), secret)}`;
}

async function validateSessionToken(raw, secret) {
  const [expiresAt, signature] = raw.split('.');
  if (!expiresAt || !signature) {
    return false;
  }

  if (Number(expiresAt) < Math.floor(Date.now() / 1000)) {
    return false;
  }

  const expected = await signValue(expiresAt, secret);
  return timingSafeEqual(signature, expected);
}

function assertGithubConfig(env) {
  const missing = ['GITHUB_TOKEN', 'GITHUB_OWNER', 'GITHUB_REPO'].filter((key) => !env[key]);
  if (missing.length > 0) {
    throw new Error(`Worker-miljön saknar: ${missing.join(', ')}`);
  }
}

function parseCookies(cookieHeader) {
  return Object.fromEntries(
    cookieHeader
      .split(';')
      .map((chunk) => chunk.trim())
      .filter(Boolean)
      .map((chunk) => {
        const index = chunk.indexOf('=');
        return index === -1 ? [chunk, ''] : [chunk.slice(0, index), chunk.slice(index + 1)];
      }),
  );
}

async function signValue(value, secret) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return base64UrlEncode(signature);
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let index = 0; index < a.length; index += 1) {
    result |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return result === 0;
}

async function readEntry(env, filePath, branch, label) {
  const normalizedPath = normalizePath(filePath);
  const file = await getRepoFile(env, normalizedPath, branch);
  const data = file ? decodeBase64(file.content) : getDefaultContent(normalizedPath);

  return {
    data,
    file: {
      path: normalizedPath,
      label,
      id: data ? await sha256Hex(data) : null,
    },
  };
}

function getDefaultContent(filePath) {
  return DEFAULT_CONTENT[normalizePath(filePath)] || null;
}

async function readMediaFile(env, filePath, branch) {
  const file = await getRepoFile(env, filePath, branch);
  if (!file) {
    throw new Error(`Media file not found: ${filePath}`);
  }

  return {
    id: await sha256HexFromBase64(file.content),
    content: stripBase64Formatting(file.content),
    encoding: 'base64',
    path: normalizePath(filePath),
    name: normalizePath(filePath).split('/').pop(),
  };
}

async function listRepoFiles(env, branch, folder, extension, depth) {
  const tree = await getRepoTree(env, branch);
  const normalizedFolder = stripLeadingSlash(folder).replace(/\/$/, '');
  const prefix = normalizedFolder ? `${normalizedFolder}/` : '';

  return tree
    .filter((item) => item.type === 'blob')
    .filter((item) => !prefix || item.path.startsWith(prefix))
    .filter((item) => {
      if (!extension) {
        return true;
      }
      return item.path.toLowerCase().endsWith(extension.toLowerCase());
    })
    .filter((item) => {
      if (!prefix) {
        return true;
      }
      const relative = item.path.slice(prefix.length);
      const level = relative.split('/').length;
      return level <= Math.max(1, depth);
    })
    .map((item) => ({ path: normalizePath(item.path) }));
}

async function getRepoTree(env, branch) {
  const ref = await githubRequest(env, `/git/ref/heads/${encodeURIComponent(branch)}`);
  const commit = await githubRequest(env, `/git/commits/${ref.object.sha}`);
  const tree = await githubRequest(env, `/git/trees/${commit.tree.sha}?recursive=1`);
  return tree.tree || [];
}

async function getRepoFile(env, filePath, branch) {
  const encodedPath = filePath.split('/').map(encodeURIComponent).join('/');
  const response = await githubRequest(env, `/contents/${encodedPath}?ref=${encodeURIComponent(branch)}`, { allow404: true });
  return response;
}

async function upsertTextFile(env, filePath, text, branch, message) {
  return putRepoFile(env, filePath, utf8ToBase64(text), branch, message);
}

async function upsertBase64File(env, filePath, contentBase64, branch, message) {
  return putRepoFile(env, filePath, stripBase64Formatting(contentBase64), branch, message);
}

async function putRepoFile(env, filePath, contentBase64, branch, message) {
  const existing = await getRepoFile(env, filePath, branch);
  const encodedPath = filePath.split('/').map(encodeURIComponent).join('/');
  const payload = {
    message,
    content: stripBase64Formatting(contentBase64),
    branch,
  };

  if (existing?.sha) {
    payload.sha = existing.sha;
  }

  const result = await githubRequest(env, `/contents/${encodedPath}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

  return {
    commitUrl: result.commit?.html_url || null,
  };
}

async function deleteFileIfExists(env, filePath, branch, message) {
  const existing = await getRepoFile(env, filePath, branch);
  if (!existing?.sha) {
    return null;
  }

  const encodedPath = filePath.split('/').map(encodeURIComponent).join('/');
  const result = await githubRequest(env, `/contents/${encodedPath}`, {
    method: 'DELETE',
    body: JSON.stringify({
      message,
      sha: existing.sha,
      branch,
    }),
  });

  return {
    commitUrl: result.commit?.html_url || null,
  };
}

async function githubRequest(env, path, options = {}) {
  const { allow404 = false, ...init } = options;
  const response = await fetch(`https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}${path}`, {
    method: init.method || 'GET',
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'vokalen-cms-worker',
    },
    body: init.body,
  });

  if (allow404 && response.status === 404) {
    return null;
  }

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(data.message || `GitHub request failed with ${response.status}`);
  }

  return data;
}

function utf8ToBase64(value) {
  const bytes = new TextEncoder().encode(value);
  return bytesToBase64(bytes);
}

function decodeBase64(base64) {
  const binary = atob(stripBase64Formatting(base64));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function decodeBase64ToBytes(base64) {
  const binary = atob(stripBase64Formatting(base64));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function stripBase64Formatting(value = '') {
  return String(value).replace(/\n/g, '');
}

function bytesToBase64(bytes) {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

async function sha256Hex(value) {
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function sha256HexFromBase64(value) {
  const binary = atob(stripBase64Formatting(value));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  const buffer = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function stripLeadingSlash(value = '') {
  return String(value).replace(/^\//, '');
}

function normalizePath(value = '') {
  return String(value).replace(/\\/g, '/').replace(/^\//, '');
}

function resolveGithubPublicPath(pathname = '') {
  const normalized = normalizePath(pathname);

  if (!normalized) {
    return 'index.html';
  }

  if (normalized === 'admin') {
    return 'admin/index.html';
  }

  if (normalized.endsWith('/')) {
    return `${normalized}index.html`;
  }

  return normalized;
}

function resolveGithubBranch(request, env, requestedBranch = '') {
  if (requestedBranch) {
    return requestedBranch;
  }

  const hostname = new URL(request.url).hostname;
  if (hostname.startsWith('dev.')) {
    return 'dev';
  }

  return env.GITHUB_BRANCH || 'main';
}

function getContentType(filePath = '') {
  const extension = filePath.split('.').pop()?.toLowerCase() || '';
  const types = {
    css: 'text/css; charset=utf-8',
    gif: 'image/gif',
    html: 'text/html; charset=utf-8',
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    js: 'text/javascript; charset=utf-8',
    json: 'application/json; charset=utf-8',
    png: 'image/png',
    svg: 'image/svg+xml',
    webp: 'image/webp',
  };

  return types[extension] || 'application/octet-stream';
}

function base64UrlEncode(buffer) {
  const bytes = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : buffer;
  return bytesToBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function jsonResponse(request, data, status = 200, extraHeaders = {}) {
  const headers = new Headers({
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    ...extraHeaders,
  });

  applyCorsHeaders(request, headers);

  return new Response(JSON.stringify(data), {
    status,
    headers,
  });
}

function emptyResponse(request, status = 204, extraHeaders = {}) {
  const headers = new Headers(extraHeaders);
  applyCorsHeaders(request, headers);
  return new Response(null, { status, headers });
}

function applyCorsHeaders(request, headers) {
  const origin = getAllowedOrigin(request);
  if (!origin) {
    return;
  }

  headers.set('Access-Control-Allow-Origin', origin);
  headers.set('Access-Control-Allow-Credentials', 'true');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  headers.append('Vary', 'Origin');
}

function getAllowedOrigin(request) {
  const origin = request.headers.get('origin');
  if (!origin) {
    return '';
  }

  try {
    const originUrl = new URL(origin);
    const requestUrl = new URL(request.url);
    const localHosts = new Set(['localhost', '127.0.0.1']);

    if (originUrl.origin === requestUrl.origin) {
      return origin;
    }

    if (originUrl.hostname === requestUrl.hostname) {
      return origin;
    }

    if (localHosts.has(originUrl.hostname) && localHosts.has(requestUrl.hostname)) {
      return origin;
    }
  } catch {
    return '';
  }

  return '';
}
