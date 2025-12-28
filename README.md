# Field Notes (frontend-only)

A calm, analytical, WordPress-style research / insights microsite.

## Pages
- `index.html`, Home (editorial intro, featured report, recent notes, newsletter CTA UI)
- `insights.html`, Insights listing w/ filter + sort + search (JS)
- `report.html`, Long report template w/ JS-generated TOC, scrollspy, footnotes popover, reading progress, print styles
- `brief.html`, Short, scannable brief template
- `about.html`, Mission + methodology
- `contact.html`, Contact form (UI only)

## Where to add your content
- Replace the `<article data-article>` blocks on `report.html` / `brief.html`.
- On `insights.html`, replace each `<article data-insight ...>` card with your own post metadata:
  - `data-topic="research|strategy|product|ops"`
  - `data-date="YYYY-MM-DD"`
  - `data-length="word_count_or_bucket"`
  - `data-depth="1-10"`

## Features (in `assets/app.js`)
- Table of contents (generated from `h2` + `h3`)
- Sticky TOC + scroll-linked section highlight
- Reading time estimator (220 wpm)
- Reading progress bar
- Inline footnotes popover (click footnote numbers)
- Keyboard nav: `Alt+J` / `Alt+K` (next/prev section)
- Insights: filter pills + search + sort

## Print
Use your browser print dialog. Print CSS hides nav/rail/CTA and appends URLs after links.

---

Tip: If you eventually move to WordPress, this structure maps cleanly to:
- `single.php` (report / essay)
- `archive.php` (insights listing)
- `page.php` (about/contact)
