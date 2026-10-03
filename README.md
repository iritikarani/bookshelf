# Ex Libris

An online bookshelf for the books you've finished, with a personal journal entry for each one.

It feels like a corner of home: a window with curtains (a night sky in dark mode), a reading lamp you can switch on, a rug, and a real bookshelf. Books stand spine-out (thickness from page count, colour from the cover) or turn to face their cover out, mixed with objects like plants, candles, a globe or a bust. Mark books ❤ Favourite, 📖 Reading now or 🔖 To read; marks show as ribbon bookmarks and the filter chips highlight them, so shelves never have to double as categories. Click a book and it opens like a book, with the cover, rating and marks on the left page and your journal on the right. Drag anything to rearrange it, and pick from 10 room aesthetics: Pastel dream, Modern black, Scandi, Japandi, Dark academia, Cottagecore, Mid-century, Coastal, Boho and Industrial. Each one changes the wall, the floor and how the shelves are built (boxed bookcase, floating boards, rope-hung or iron pipe). Tap one to open its card: rating, what you liked, your favourite line, the date you finished it, and an "EX LIBRIS" bookplate.

**Stack:** Next.js 15 (App Router) · React 19 · Tailwind CSS · Supabase (auth, Postgres, storage) · dnd-kit · html-to-image · Google Books and Open Library APIs.

## Running it

```bash
npm install
cp .env.example .env.local   # optional: add Supabase keys
npm run dev                  # http://localhost:3000
```

**Demo mode:** with no Supabase keys, the app runs entirely in the browser and saves to `localStorage`. All features work except real accounts and cross-device sharing. Use it to try the app or develop the UI.

### Connecting Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. In **SQL Editor**, run [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql). It creates:
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

## Data model

| Table | Fields |
|---|---|
| `shelves` | id, user_id, name, position |
| `books` | id, user_id, title, author, cover_url, uploaded_cover, cover_color, display (`spine` / `cover`), status (`read` / `reading` / `to_read`), favourite, year_published, pages, genre, short_description, shelf_id, position, rating (0–5), what_i_liked, favourite_line, date_finished, created_at, updated_at |
| `decor` | id, user_id, shelf_id, kind, position (shares the shelf's ordering with books) |
| `profiles` | id, display_name, shelf_style (one of the 10 aesthetics), is_public, public_slug |

Beyond the brief: `status` and `favourite` are the marks (they replace the brief's "Want to read" shelf), `cover_color` stores the pastel picked for a generated cover, `display` says whether a book stands spine-out or cover-out, and the `decor` table holds the objects on each shelf.

## How it's organised

```
app/
  page.tsx               the app (shelf, quote wall, reading year)
  s/[slug]/page.tsx      public read-only shelf
components/
  App.tsx                shell, tabs, dialogs, example shelf
  ShelfWall.tsx          shelf structures, books + decor in one row, drag & drop with an insertion marker
  BookSpine.tsx          spine-out books
  Decor.tsx              the 10 decor objects (inline SVG)
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
  search.ts              Google Books + Open Library search, merging, genre/description cleanup
  covers.ts, image.ts    cover URLs, swatches, image probing, 300px compression
  themes.ts              the 10 aesthetics and their shelf structures (colours in app/room.css)
```

### Details

- **Search** queries Open Library and Google Books in parallel, with a debounce. It merges duplicates by normalised title and author, and pools their cover candidates. Each candidate is checked by loading it, and up to four that actually load are offered. If none load, a designed cover is used, with 10 colour swatches.
- **Positions:** books and decor share one ordering per shelf. Every move renumbers the affected shelves from 0 to n and saves only the rows that changed. Updates are optimistic, and the app reloads from the server if a save fails.
- **Drag and drop** uses a mouse sensor only. On touch screens, the shelf scrolls sideways, and books are moved with the Move control in the book card (shelf dropdown plus ← →).
- **Accessibility:** dialogs trap focus, close on Esc and return focus when they close. Covers have alt text. The star rating works with arrow keys. Focus rings are visible, and `prefers-reduced-motion` turns off animations.
- **Example shelf:** shown while you have no books, and never stored in the database.
