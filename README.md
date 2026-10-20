# IIHE Cambodia website

English version of the IIHE Cambodia website, built with [Eleventy](https://www.11ty.dev/) (a static-site generator) and the Decap content editor. It is designed mobile first, because most visitors in Cambodia browse on smartphones.

## Pages

| Page | URL | Source file |
|---|---|---|
| Home | `/` | `src/index.njk` |
| Business Management | `/programmes/business-management/` | `src/programmes/business-management.njk` |
| Software Engineering | `/programmes/software-engineering/` | `src/programmes/software-engineering.njk` |
| Fees & Admissions | `/fees-and-admissions/` | `src/fees-and-admissions.njk` |
| News & guides | `/news/` | `src/news/index.njk` + posts in `src/news/posts/` |
| About us | `/about/` | `src/about.njk` |
| Book a free consultation | `/book-a-consultation/` | `src/book-a-consultation.njk` |
| Thank you (after the form) | `/thank-you/` | `src/thank-you.njk` |

## Everyday edits (no coding)

Once the site is live, open `https://<your-domain>/admin/` and sign in. Three things can be edited there:

- **News & guides**: write a new post, choose “News” or “Guide”, pick a card graphic and publish. Guides also appear on the home page.
- **Settings → Fees**: change the fee for any stage. The total is calculated automatically.
- **Settings → Contacts & next intake**: phone, email, Telegram, Messenger, Facebook, TikTok, campus address, opening hours and intake dates. Any empty field shows “To be added” or “To be confirmed” on the site, so you can fill them in as they become ready.

The same values live in plain files if you prefer: `src/_data/fees.json`, `src/_data/site.json` and `src/news/posts/*.md`.

## Photos

There are no campus photos yet, so the site uses brand graphics in IIHE colours instead (`src/_includes/partials/art.njk`). When real photos exist, put them in `src/assets/img/` and replace the graphic with an `<img>` in the relevant page.

## Run it on this computer

Needs Node.js. From this folder run:

```bash
npm install
npm start
```

Then open http://localhost:8080.

## Going live (when the domain is bought)

1. Put this folder in a GitHub repository.
2. Create a Netlify site from that repository. The settings are already in `netlify.toml`.
3. Connect the domain in Netlify (Domain management).
4. Enable form notifications in Netlify (Forms → consultation → email notification) so consultation requests reach the admissions inbox.
5. Connect the content editor: set `repo:` in `src/admin/config.yml` and enable GitHub sign-in for the editor.

## Still to come

- Khmer version (the EN | KH switch is in place; KH is disabled until the translation is ready)
- Contact details, social links and intake dates (fill in via the editor)
- NCC Education approval of the wording, especially “guaranteed route” and “first in Cambodia”
- Real photography of the campus, trainers and students

## Photos and the brand filter

All photos are free Unsplash photos (free for commercial use, no attribution required). Every photo gets the same IIHE treatment: slightly softer colour, deeper charcoal shadows, warm midtones and highlights (so skin tones stay natural and welcoming) and a 3:2 crop.

To add a new photo:
1. Put the original JPG in `photo-originals/` with a short name, for example `graduation.jpg`.
2. Run `uv run --with pillow --with numpy python tools/brand_photos.py`.
3. Use it in a page with `{{ photo("graduation", "Description of the photo") }}`.

## NCC Education marketing rules (guideline 2025)

Source: `NCC materials/NCC Marketing/Marketing Guideline_Full Page.pdf`. Applied on the site:

- NCC logo: supplied master files only (`src/assets/img/ncc/`), dark blue with ®, on white, never recoloured, cropped or placed on photos; clear space at least the height of the "N".
- Degree wording: “validated and awarded by the University of Greater Manchester, delivered online by Western International College Online (WINC)”.
- Always clear that IIHE Cambodia is accredited by NCC Education, not by the university.
- No Ofqual logo (text mention “recognised by Ofqual” is fine). No university logos or named-university promotion without NCC approval.
- Text labels are at least 12px.

Still needed from NCC: the Accredited Partner badge, approval of all programme copy (including “guaranteed route” and “first in Cambodia”), co-branded programme sheets to add as downloads.
