import type { Book, Decor, Shelf, ShelfItem } from "./types";
import { olCoverByIsbn } from "./covers";

export const EXAMPLE_SHELF: Shelf = {
  id: "example-shelf",
  user_id: "example",
  name: "Example shelf",
  position: 0,
};

type Seed = Pick<Book, "title" | "author" | "year_published" | "pages" | "genre" | "short_description" | "rating" | "what_i_liked" | "favourite_line" | "date_finished" | "cover_color" | "display" | "status" | "favourite"> & { isbn?: string };

const SEEDS: Seed[] = [
  {
    title: "Pride and Prejudice",
    status: "read",
    favourite: true,
    display: "cover",
    author: "Jane Austen",
    isbn: "9780141439518",
    year_published: 1813,
    pages: 432,
    genre: "Classics",
    short_description: "Elizabeth Bennet spars with the proud Mr Darcy in a comedy of manners about first impressions.",
    rating: 5,
    what_i_liked: "Elizabeth reading Darcy's letter and realising she had been just as proud as he was.",
    favourite_line: "I declare after all there is no enjoyment like reading!",
    date_finished: "2026-02-14",
    cover_color: "#f2c4c0",
  },
  {
    title: "Jane Eyre",
    status: "read",
    favourite: true,
    display: "spine",
    author: "Charlotte Brontë",
    isbn: "9780141441146",
    year_published: 1847,
    pages: 532,
    genre: "Classics",
    short_description: "An orphaned governess finds love, secrets and her own voice at Thornfield Hall.",
    rating: 4,
    what_i_liked: "Jane refusing to shrink herself, even when it costs her everything.",
    favourite_line: "I am no bird; and no net ensnares me: I am a free human being with an independent will.",
    date_finished: "2026-01-09",
    cover_color: "#c8cbf0",
  },
  {
    title: "Little Women",
    status: "to_read",
    favourite: false,
    display: "spine",
    author: "Louisa May Alcott",
    isbn: "9780147514011",
    year_published: 1868,
    pages: 449,
    genre: "Classics",
    short_description: "Four March sisters grow up through poverty, ambition and love in Civil War-era Massachusetts.",
    rating: 0,
    what_i_liked: "Everyone says Jo March is the heroine I've been missing.",
    favourite_line: null,
    date_finished: null,
    cover_color: "#ecc5dc",
  },
  {
    title: "The Great Gatsby",
    status: "read",
    favourite: false,
    display: "cover",
    author: "F. Scott Fitzgerald",
    isbn: "9780743273565",
    year_published: 1925,
    pages: 180,
    genre: "Classics",
    short_description: "Nick Carraway watches his mysterious neighbour chase a dream across Long Island Sound.",
    rating: 3,
    what_i_liked: "The green light at the end of Daisy's dock.",
    favourite_line: "So we beat on, boats against the current, borne back ceaselessly into the past.",
    date_finished: "2026-03-02",
    cover_color: "#bfd8ee",
  },
  {
    title: "Gitanjali",
    status: "reading",
    favourite: false,
    display: "spine",
    author: "Rabindranath Tagore",
    year_published: 1910,
    pages: 112,
    genre: "Poetry",
    short_description: "Song offerings: devotional poems that won Tagore the Nobel Prize in Literature.",
    rating: 0,
    what_i_liked: "Reading one poem each morning with tea.",
    favourite_line: "Where the mind is without fear and the head is held high…",
    date_finished: null,
    cover_color: "#f3e3a2",
  },
];

export const EXAMPLE_BOOKS: Book[] = SEEDS.map(({ isbn, ...s }, i) => ({
  ...s,
  id: `example-${i}`,
  user_id: "example",
  shelf_id: EXAMPLE_SHELF.id,
  position: i,
  cover_url: isbn ? olCoverByIsbn(isbn) : null,
  uploaded_cover: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
}));

export const isExample = (b: Pick<Book, "id">) => b.id.startsWith("example-");

const decor = (id: string, kind: Decor["kind"]): Decor => ({
  id: `example-decor-${id}`,
  user_id: "example",
  shelf_id: EXAMPLE_SHELF.id,
  kind,
  position: 0,
  created_at: "2026-01-01T00:00:00Z",
});

const asItem = (x: Book | Decor): ShelfItem =>
  "title" in x
    ? { type: "book", id: x.id, shelf_id: x.shelf_id, position: 0, created_at: x.created_at, book: x }
    : { type: "decor", id: x.id, shelf_id: x.shelf_id, position: 0, created_at: x.created_at, decor: x };

/** The example shelf as it's arranged: books mixed with a few objects, like a real shelf. */
export const EXAMPLE_ITEMS: ShelfItem[] = [
  decor("plant", "plant"),
  EXAMPLE_BOOKS[0],
  EXAMPLE_BOOKS[1],
  EXAMPLE_BOOKS[2],
  EXAMPLE_BOOKS[4],
  decor("candles", "candles"),
  EXAMPLE_BOOKS[3],
  decor("globe", "globe"),
].map((x, position) => ({ ...asItem(x), position }));
