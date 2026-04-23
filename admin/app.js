import { createCmsConfig } from './config.js';
import { registerPreviewTemplates } from './preview.js';

const loginScreen = document.getElementById('login-screen');
const cmsRoot = document.getElementById('nc-root');
const loginForm = document.getElementById('login-form');
const loginStatus = document.getElementById('login-status');
const passwordField = document.getElementById('password');
const submitButton = loginForm.querySelector('button[type="submit"]');

const SESSION_STORAGE_KEY = 'vokalen_admin_session';
const API_BASE = resolveApiBase();

let cmsBooted = false;
let activeSessionToken = '';

function setLoginStatus(message, kind = '') {
  loginStatus.textContent = message || '';
  loginStatus.className = `status${kind ? ` ${kind}` : ''}`;
}

function resolveApiBase() {
  const params = new URLSearchParams(window.location.search);
  const explicitApiBase = params.get('api');
  if (explicitApiBase) {
    return explicitApiBase.replace(/\/+$/, '');
  }

  const isLocalHost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  if (isLocalHost && window.location.port === '8080') {
    return `${window.location.protocol}//${window.location.hostname}:8787`;
  }

  return '';
}

function buildApiUrl(path, sessionToken = '') {
  const base = API_BASE || window.location.origin;
  const url = new URL(path, `${base}/`);

  if (sessionToken) {
    url.searchParams.set('token', sessionToken);
  }

  return url.toString();
}

function readStoredSessionToken() {
  try {
    return window.sessionStorage.getItem(SESSION_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

function writeStoredSessionToken(token) {
  try {
    if (token) {
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, token);
    } else {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
  } catch {
    // ignore
  }
}

function setBusy(isBusy) {
  passwordField.disabled = isBusy;
  submitButton.disabled = isBusy;
}

async function requestJson(path, options = {}, sessionToken = '') {
  const headers = new Headers(options.headers || {});
  if (options.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  const response = await fetch(buildApiUrl(path, sessionToken), {
    credentials: 'include',
    ...options,
    headers,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(data.error || 'Något gick fel.');
  }

  return data;
}

function showLogin() {
  loginScreen.classList.remove('hidden');
  cmsRoot.classList.add('hidden');
  setBusy(false);
  passwordField.focus();
}

async function showCms(sessionToken = '') {
  if (sessionToken) {
    activeSessionToken = sessionToken;
    writeStoredSessionToken(sessionToken);
  }

  if (cmsBooted) {
    loginScreen.classList.add('hidden');
    cmsRoot.classList.remove('hidden');
    return;
  }

  if (!window.CMS) {
    throw new Error('Static CMS kunde inte laddas.');
  }

  registerPreviewTemplates(window.CMS);
  window.CMS.init({
    config: createCmsConfig({
      apiBase: API_BASE,
      sessionToken: activeSessionToken,
    }),
  });
  cmsBooted = true;
  loginScreen.classList.add('hidden');
  cmsRoot.classList.remove('hidden');
}

async function boot() {
  const storedToken = readStoredSessionToken();

  try {
    const session = await requestJson('/api/session', { method: 'GET' }, storedToken);
    if (session.authenticated) {
      await showCms(session.sessionToken || storedToken);
      return;
    }
  } catch (error) {
    console.error(error);
    showLogin();
    setLoginStatus('Kunde inte ansluta till adminpanelen.', 'error');
  }

  activeSessionToken = '';
  writeStoredSessionToken('');
  showLogin();
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setLoginStatus('Loggar in...');
  setBusy(true);

  try {
    const response = await requestJson('/api/login', {
      method: 'POST',
      body: JSON.stringify({ password: passwordField.value }),
    });

    passwordField.value = '';
    setLoginStatus('');
    setBusy(false);
    await showCms(response.sessionToken || '');
  } catch (error) {
    setBusy(false);
    showLogin();
    setLoginStatus(error.message || 'Fel lösenord.', 'error');
  }
});

boot();
