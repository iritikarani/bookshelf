# Ex Libris

An online bookshelf for the books you've finished, with a personal journal entry for each one.

Books sit face-out in a tall boxed bookcase painted in soft pastels (sage, blush, powder, butter or lavender), or in classic birch, walnut or painted slate. Tap one to open its card: rating, what you liked, your favourite line, the date you finished it, and an "EX LIBRIS" bookplate.

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
   - A sign-up trigger that gives every new user the shelves **Favourites**, **Read** and **Want to read**.
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
| `shelves` | id, user_id, name, position, is_want_to_read |
| `books` | id, user_id, title, author, cover_url, uploaded_cover, cover_color, year_published, pages, genre, short_description, shelf_id, position, rating (0–5), what_i_liked, favourite_line, date_finished, created_at, updated_at |
| `profiles` | id, display_name, wood_theme (`sage` / `blush` / `powder` / `butter` / `lavender` / `birch` / `walnut` / `slate`), is_public, public_slug |

`cover_color` is the one field beyond the brief. It stores the pastel picked for a generated cover.

## How it's organised

```
app/
  page.tsx               the app (shelf, quote wall, reading year)
  s/[slug]/page.tsx      public read-only shelf
components/
  App.tsx                shell, tabs, dialogs, example shelf
  ShelfWall.tsx          the bookcase (top, compartments, boards, base), drag & drop with an insertion marker
  BookDetail.tsx         side panel / bottom sheet, move controls, remove confirmation
  AddBookDialog.tsx      search-as-you-type, cover picker, generated covers, upload, journal fields
  EditShelves.tsx        rename, reorder, add, delete empty shelves
  QuoteWall.tsx          masonry of favourite lines
  ReadingYear.tsx        monthly bar chart, totals, book of the year, longest read
  ShareDialog.tsx        1080×1920 story image via html-to-image
  Settings.tsx           bookcase finish, light/dark, public link, account
lib/
  store/                 Store interface with Supabase and localStorage versions
  library.tsx            React context: state, optimistic updates, position bookkeeping
  search.ts              Google Books + Open Library search, merging, genre/description cleanup
  covers.ts, image.ts    cover URLs, swatches, image probing, 300px compression
```

### Details

- **Search** queries Open Library and Google Books in parallel, with a debounce. It merges duplicates by normalised title and author, and pools their cover candidates. Each candidate is checked by loading it, and up to four that actually load are offered. If none load, a designed cover is used, with 10 colour swatches.
- **Positions:** every move renumbers the affected shelves from 0 to n and saves only the rows that changed. Updates are optimistic, and the app reloads from the server if a save fails.
- **Drag and drop** uses a mouse sensor only. On touch screens, the shelf scrolls sideways, and books are moved with the Move control in the book card (shelf dropdown plus ← →).
- **Accessibility:** dialogs trap focus, close on Esc and return focus when they close. Covers have alt text. The star rating works with arrow keys. Focus rings are visible, and `prefers-reduced-motion` turns off animations.
- **Example shelf:** shown while you have no books, and never stored in the database.
