# vokalen.se

Dev-versionen av Vokalen med publik sajt, Static CMS i `/admin/` och en
Cloudflare Worker som sköter inloggning och GitHub-synk.

## Hur det hänger ihop

- GitHub är källan för webbplatsens filer och innehåll.
- `index.html`, `styles.css`, `script.js`, `admin/*`, `content/*` och
  `images/uploads/*` ligger i repot.
- Cloudflare Workern på `dev.vokalen.se` fungerar som gateway:
  - den hanterar `/api/*` för login och CMS-skrivningar
  - den kan läsa publika filer från GitHub för `/`, `/admin/`, `/content/*`
    och `/images/uploads/*`
- Cloudflare lagrar bara den deployade worker-koden och dess secrets, inte
  själva innehållet ni redigerar.

## Lokalt

### 1. Publik sajt + adminfiler

```bash
cd /home/cvi/Projects/vokalen.se
python3 -m http.server 8080
```

Detta serverar både `/` och `/admin/` på `http://localhost:8080/`.

### 2. Worker-API

```bash
cd /home/cvi/Projects/vokalen.se/worker
npm install
cp .dev.vars.example .dev.vars
npm run dev
```

Lokal `.dev.vars` ska innehålla:

- `ADMIN_PASSWORD`
- `SESSION_SECRET`
- `GITHUB_TOKEN`
- `GITHUB_OWNER`
- `GITHUB_REPO`
- `GITHUB_BRANCH`

Öppna sedan `http://localhost:8080/admin/`.

Adminappen använder automatiskt `http://localhost:8787` som API i lokal
utveckling. Om du kör Workern på en annan port kan du ändra detta med till
exempel `http://localhost:8080/admin/?api=http://localhost:8788`.

## Struktur

- `index.html`, `styles.css`, `script.js`: publik startsida
- `content/site.json`: innehåll som används av startsidan och CMS:et
- `content/home.json`: äldre innehållsfil som fortfarande finns i repot
- `admin/`: Static CMS, svensk inloggning och live-preview
- `worker/`: Cloudflare Worker med login, session och GitHub-proxy

## Produktion

1. `dev.vokalen.se` pekar på Cloudflare Workern i `worker/`.
2. Redaktörer öppnar `/admin/` och loggar in där.
3. Static CMS sparar ändringar via `/api/cms`.
4. Workern skriver ändringar tillbaka till GitHub med `GITHUB_TOKEN`.
5. Publika filer och innehåll kan sedan läsas från GitHub av samma worker.
