# Cosmic Space

An online bookshelf for the books you've finished, with a personal journal entry for each one.

It feels like a corner of home, drawn to look real: wood grain, painted and plastered surfaces (all generated SVG noise, no image downloads), bookcase compartments with depth and shadow, rounded cloth-textured spines, daylight from the window and floorboards in perspective. There's a window with curtains (a night sky in dark mode), a reading lamp you can switch on, a rug, and a real bookshelf. Books stand spine-out (thickness from page count, colour from the cover) or turn to face their cover out, mixed with objects like plants, candles, a sleeping cat, a cup of kulhad chai or a brass diya. Mark books ❤ Favourite, 📖 Reading now or 🔖 To read; marks show as ribbon bookmarks and the filter chips highlight them, so shelves never have to double as categories. Click a book and it opens like a book, with the cover, rating and marks on the left page and your journal on the right. **Add a book** is one form: type a title, an author or a publisher (with suggestions for 50+ Indian publishers) to search Open Library and Google Books, and picking a match fills in its cover and details. Drag anything to rearrange it, and pick from 10 room aesthetics: Pastel dream, Modern black, Scandi, Japandi, Dark academia, Cottagecore, Mid-century, Coastal, Boho and Industrial. Each one changes the wall, the floor and how the shelves are built (boxed bookcase, floating boards, rope-hung or iron pipe). Tap one to open its card: rating, what you liked, your favourite line, the date you finished it, and an "EX LIBRIS" bookplate.

**Stack:** Next.js 15 (App Router) · React 19 · Tailwind CSS · Supabase (auth, Postgres, storage) · dnd-kit · html-to-image · Google Books and Open Library APIs.

## Running it

```bash
npm install
cp .env.example .env.local   # optional: add Supabase keys
npm run dev                  # http://localhost:3000
```

**Without Supabase keys** the app runs entirely in the browser and saves to `localStorage`. Everything works except real accounts and cross-device sharing.

**With Supabase keys** visitors land on the sign-in page (`/login/`): Google, email and password, password reset, or *continue as a guest* (a guest shelf lives in that browser; a guest can sign up later from Settings).

`npm run build` writes a fully static site to `out/`; `npm run preview` builds and serves it locally.

### Connecting Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. In **SQL Editor**, run [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql), then [`0002_username.sql`](supabase/migrations/0002_username.sql) , [`0003_decor.sql`](supabase/migrations/0003_decor.sql) (new decor objects), [`0004_half_stars.sql`](supabase/migrations/0004_half_stars.sql) (half-star ratings) and [`0005_current_page.sql`](supabase/migrations/0005_current_page.sql) (reading progress) (usernames: a unique `profiles.username`, a `username_available()` check the sign-up form calls, and a sign-up trigger that saves the chosen username). Together they create:
   - `profiles`, `shelves` and `books`, with row-level security so each user sees only their own rows (private by default).
   - A sign-up trigger that gives every new user three plain shelves: **Top shelf**, **Middle shelf** and **Bottom shelf**.
   - `get_public_shelf(slug)`, a security-definer function that returns a shelf only when its owner has turned the public link on.
   - A `covers` storage bucket for uploaded cover photos. Each user can only write inside their own folder.
3. Copy the project URL and anon key from **Settings → API** into `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```
4. Set up auth:
   - **Email:** enabled by default. Under Authentication → URL configuration, set the Site URL to your app's URL.
   - **Google:** Authentication → Providers → Google. Add a Google OAuth client ID and secret. In Google Cloud, add `https://<project>.supabase.co/auth/v1/callback` as an authorised redirect URI. Add your app's origin to Supabase's redirect allow-list.
   - **Redirect URLs** (Authentication → URL configuration): add your site's address, e.g. `https://<user>.github.io/bookshelf/**`, so sign-up confirmation, Google sign-in and password-reset links come back to the site.

## Deploying

The site is static (`output: "export"`), so any static host works. There's no server to run.

### GitHub Pages (set up in this repo)

[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) builds and publishes the site on every push to `main`.

1. In the repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Optional, to switch on accounts: **Settings → Secrets and variables → Actions → New repository secret**, add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (the anon key is public by design, and row-level security protects the data).
3. Merge to `main` (or run the workflow from the **Actions** tab). The site appears at `https://<user>.github.io/<repo>/`. The workflow sets the sub-folder path (`NEXT_PUBLIC_BASE_PATH`) automatically.
4. If you use Supabase, add that address to its redirect URLs (see above).

### Vercel or Netlify

Import the repo. [`vercel.json`](vercel.json) already tells Vercel to run `npm run build` and serve the static `out/` folder, whatever the project's framework setting is. Add the two `NEXT_PUBLIC_SUPABASE_*` environment variables if you want accounts. Leave `NEXT_PUBLIC_BASE_PATH` unset when the site is served from the domain root.

## Data model

| Table | Fields |
|---|---|
| `shelves` | id, user_id, name, position |
| `books` | id, user_id, title, author, cover_url, uploaded_cover, cover_color, display (`spine` / `cover`), status (`read` / `reading` / `to_read`), favourite, year_published, pages, current_page, genre, short_description, shelf_id, position, rating (0–5 in halves), what_i_liked, favourite_line, date_finished, created_at, updated_at |
| `decor` | id, user_id, shelf_id, kind, position (shares the shelf's ordering with books) |
| `profiles` | id, display_name, username (unique, 3–20 of `a-z 0-9 _ .`), shelf_style (one of the 10 aesthetics), is_public, public_slug |

Beyond the brief: `status` and `favourite` are the marks (they replace the brief's "Want to read" shelf), `cover_color` stores the pastel picked for a generated cover, `display` says whether a book stands spine-out or cover-out, and the `decor` table holds the objects on each shelf.

## How it's organised

```
app/
  page.tsx               the app (shelf, quote wall, reading year)
  login/page.tsx         sign-in / sign-up / password reset / guest entry
  s/page.tsx             public read-only shelf (/s/?u=<slug>)
components/
  App.tsx                shell, tabs, dialogs, example shelf
  ShelfWall.tsx          shelf structures, books + decor in one row, drag & drop with an insertion marker
  BookSpine.tsx          spine-out books
  Decor.tsx              the 17 decor objects (inline SVG)
  ArrangeSheet.tsx       pick an aesthetic, place decor
  DecorSheet.tsx         move or remove one object
  BookDetail.tsx         the open-book spread: rating, marks, journal, arrange controls, remove confirmation
  RoomScene.tsx          window, reading lamp, rug and floor around the shelves
  Marks.tsx              mark definitions, ribbons, chips and the mark picker
  AddBookDialog.tsx      search-as-you-type, cover picker, generated covers, upload, journal fields
  EditShelves.tsx        rename, reorder, add, delete empty shelves
  QuoteWall.tsx          masonry of favourite lines
  ReadingYear.tsx        monthly bar chart, totals, book of the year, longest read
  ShareDialog.tsx        1080×1920 story image via html-to-image
  Settings.tsx           light/dark, public link, account
lib/
  store/                 Store interface with Supabase and localStorage versions
  library.tsx            React context: state, optimistic updates, position bookkeeping
  search.ts              Google Books + Open Library search (title, author, publisher), merging, cleanup
  indianPublishers.ts    Indian publishers suggested in the Publisher box
  covers.ts, image.ts    cover URLs, swatches, image probing, 300px compression
  themes.ts              the 10 aesthetics and their shelf structures (colours in app/room.css)
```

### Details

- **Search** queries Open Library and Google Books in parallel, with a debounce. It merges duplicates by normalised title and author, and pools their cover candidates. Each candidate is checked by loading it, and up to four that actually load are offered. If none load, a designed cover is used, with 10 colour swatches.
- **Positions:** books and decor share one ordering per shelf. Every move renumbers the affected shelves from 0 to n and saves only the rows that changed. Updates are optimistic, and the app reloads from the server if a save fails.
- **Drag and drop** uses a mouse sensor only. On touch screens, the shelf scrolls sideways, and books are moved with the Move control in the book card (shelf dropdown plus ← →).
- **Accessibility:** dialogs trap focus, close on Esc and return focus when they close. Covers have alt text. The star rating works with arrow keys. Focus rings are visible, and `prefers-reduced-motion` turns off animations.
- **Example shelf:** shown while you have no books, and never stored in the database.
