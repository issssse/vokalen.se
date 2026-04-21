# vokalen.se

Minimal statisk testsida för GitHub Pages med egen domän.

## Publicering

1. Skapa ett GitHub-repo, till exempel `vokalen.se`.
2. Pusha innehållet från den här katalogen till `main`.
3. Aktivera GitHub Pages från `main` och roten `/`.
4. Låt `CNAME`-filen ligga kvar så att Pages använder `vokalen.se`.
5. Peka domänens DNS via Cloudflare till GitHub Pages.

## Lokalt

Öppna `index.html` direkt i webbläsaren eller kör en enkel filserver, till exempel:

```bash
python3 -m http.server 8000
```
