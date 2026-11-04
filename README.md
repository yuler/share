# share

Static share site → **https://yuler.github.io/share/**

Drop an HTML file in, push, send the link. No backend, no build.

- `assets/share.css` — one stylesheet: CSS-variable tokens, 3 themes (`paper` / `dark` / `terminal`, default auto), components for chat / code / media
- `assets/share.js` — copy buttons + syntax highlighting (optional)
- `templates/{note,chat,code,media}/` — starting points ([live preview](https://yuler.github.io/share/templates/chat/))
- `s/<YYYY-MM-DD-slug>/` — the shares
- `AGENTS.md` — conventions for AI agents creating shares
