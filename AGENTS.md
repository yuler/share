# share

Public static share site: `https://yuler.github.io/share/`. GitHub Pages serves `main` from the repo root (branch mode, `.nojekyll`, no build). **Push = publish**, live in ~1 minute. **Everything in this repo is public.**

## New share

1. `git pull --rebase`
2. Pick a template from `templates/`: `note` (idea / short write-up), `chat` (AI / agent conversation), `code` (snippet), `media` (images / video). Mixed content: start from the closest one and borrow blocks from the others.
3. Slug: `YYYY-MM-DD-<kebab-title>` — today's date + 2–5 English words. The directory `s/<slug>/` must not exist yet.
4. `cp -r templates/<type> s/<slug>`, then edit `s/<slug>/index.html`: `<title>`, `description`, `og:*`, `<time>`, tags, lede, body. Replace every placeholder; delete demo blocks you don't use.
5. Redact before committing: tokens / keys / passwords, private emails and phone numbers, internal hostnames and IPs, `/home/<user>` paths.
6. `git add s/<slug> && git commit -m "📝 share: <title>" && git push`
7. Reply with `https://yuler.github.io/share/s/<slug>/`.

Done = the push succeeded and the URL is in the reply.

## Page rules

- Keep the template's `<head>` block: `noindex`, and `share.css` / `share.js` via `../../assets/` (relative — the site lives under `/share/`).
- Plain HTML inside `<main class="page">` is styled by default. Components (see comments in `assets/share.css`): `.meta` header with `.lede`, `.tag`, `.chat` + `.msg[data-role=user|assistant|system|tool][data-name]`, `.callout[data-kind=info|tip|warn]`, `.grid` gallery, `.wide` breakout, `pre[data-title]`.
- Theme: `data-theme` on `<html>` — omit (auto light/dark), `paper`, `dark`, `terminal`. One-off tweaks: `<style>:root { --accent: #0ea5e9; }</style>` using tokens from `assets/share.css`.
- Code: escape `<` `>` `&` inside `<pre><code>`; add `class="language-<lang>"` for highlighting.
- Chat: one `.msg` per turn, markdown converted to HTML. Tool calls and long outputs go in collapsed `<details class="msg" data-role="tool">`. Keep the substance verbatim; trim noise (retries, irrelevant tool output).
- Assets live next to `index.html`, referenced as `./file.ext`. Images: prefer `.webp`/`.jpg` under ~1 MB. Video: under ~25 MB, otherwise host externally and embed with `<iframe>` (GitHub rejects files over 100 MB).
- The root `index.html` lists nothing by design; shares are reachable only by link.

## Editing `assets/share.css` / `share.js`

Every published page links these files, so changes are **append-only**: add tokens, classes, themes; keep existing names and their meaning. After a change, open each `templates/*/index.html` under every theme to check nothing regressed.
