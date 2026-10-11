import Link from "next/link";
import { GuidePage, guideMetadata } from "@/components/GuidePage";

const PATH = "/import-goodreads/";
const TITLE = "How to move your Goodreads library to SelfShelf";

export const metadata = guideMetadata(
  PATH,
  TITLE,
  "Export your Goodreads library as a CSV file and import it into SelfShelf in a few taps. Your ratings, reviews, dates read and shelves come with it.",
);

export default function Page() {
  return (
    <GuidePage
      path={PATH}
      title={TITLE}
      intro={<p>You don’t have to add your books again one by one. Goodreads lets you download your whole library as a file, and SelfShelf can read that file and put every book on your shelves.</p>}
    >
      <h2>Step 1: Export your library from Goodreads</h2>
      <ol>
        <li>Sign in at goodreads.com in a web browser (on a computer, or your phone’s browser rather than the app).</li>
        <li>
          Go to <strong>My Books</strong>, then <strong>Import and export</strong> (the page address is goodreads.com/review/import).
        </li>
        <li>
          Tap <strong>Export Library</strong>. After a short while a link appears; download the file. It ends in <code>.csv</code>, usually named goodreads_library_export.csv.
        </li>
      </ol>

      <h2>Step 2: Import it into SelfShelf</h2>
      <ol>
        <li>
          <Link className="inline" href="/login/">Sign in</Link> to SelfShelf, or <Link className="inline" href="/login/?signup=1">create your free shelf</Link>.
        </li>
        <li>
          Open the <strong>•••</strong> menu and choose <strong>Import from Goodreads</strong>.
        </li>
        <li>Choose the file you downloaded. SelfShelf shows how many books it found, and how many are read, being read and want-to-read.</li>
        <li>
          Tap <strong>Import</strong>. SelfShelf looks up covers, then puts the books on the shelves of the room you’re in. Books already on your shelves are skipped, so you won’t get
          doubles.
        </li>
      </ol>

      <h2>What comes across</h2>
      <ul className="list">
        <li>Each book’s title, author, year and page count.</li>
        <li>Your star ratings and written reviews.</li>
        <li>The date you finished each book.</li>
        <li>Whether it’s read, currently reading or want to read.</li>
        <li>Your own Goodreads shelves, as tags on each book.</li>
      </ul>
      <p>Books without a cover found get a designed cover in their own colour; you can change any cover later by opening the book and tapping Edit.</p>

      <h2>After importing</h2>
      <p>
        Arrange your shelves, sort them by author or title, and decorate your room. Our guide to <Link className="inline" href="/virtual-bookshelf/">making a virtual bookshelf</Link> has ideas,
        and <Link className="inline" href="/reading-tracker/">tracking your reading</Link> shows how to keep it up to date.
      </p>
    </GuidePage>
  );
}
