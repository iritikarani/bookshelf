import Link from "next/link";
import { GuidePage, guideMetadata } from "@/components/GuidePage";

const PATH = "/virtual-bookshelf/";
const TITLE = "How to make a virtual bookshelf (free)";

export const metadata = guideMetadata(
  PATH,
  TITLE,
  "Make a free virtual bookshelf for the books you’ve read and want to read: add books by title, author or ISBN, arrange them on shelves, decorate your room and share it.",
);

export default function Page() {
  return (
    <GuidePage
      path={PATH}
      title={TITLE}
      intro={<p>A virtual bookshelf is an online home for your books: the ones you’ve finished, the one you’re reading, and the pile you want to read next. Here’s how to build one on SelfShelf in a few minutes.</p>}
    >
      <h2>What is a virtual bookshelf?</h2>
      <p>
        It’s a digital version of the bookcase at home. Instead of a spreadsheet or a plain list, your books stand on real-looking shelves with their covers and spines, so you can see
        your reading at a glance. A good virtual bookshelf also remembers what you thought of each book, which a real shelf can’t.
      </p>

      <h2>How to make your bookshelf on SelfShelf</h2>
      <ol>
        <li>
          <strong>Create your free shelf.</strong> <Link className="inline" href="/login/?signup=1">Sign up</Link> with your email, or try it first as a guest (a guest shelf is saved in that
          browser only).
        </li>
        <li>
          <strong>Add your books.</strong> Tap <em>Add a book</em> and type a title, an author’s name or an ISBN. Pick the right edition and its cover and details fill in for you. If a book
          isn’t listed, add it by hand and choose a cover colour or upload a photo of your copy.
        </li>
        <li>
          <strong>Mark where each book is in your reading:</strong> Want to read, Reading, Finished or Did not finish, plus a heart for favourites.
        </li>
        <li>
          <strong>Arrange your shelves.</strong> Name your shelves, drag books into the order you like, or sort a shelf by title, author, rating or when you finished it. Books can stand
          spine-out, face-out, lean or lie in a stack.
        </li>
        <li>
          <strong>Make the room yours.</strong> Choose a room style (cottagecore, dark academia, Japandi and more), then the wallpaper, floor, lamp and the view from the window. Add plants,
          candles or a sleeping cat between your books.
        </li>
        <li>
          <strong>Share it if you like.</strong> Your shelf is private by default. Turn on <em>Public shelf</em> in Edit profile to get a link like selfshelf.in/s/@yourname, or share a
          picture of your shelf for Instagram stories.
        </li>
      </ol>

      <h2>Ideas for organising a virtual bookshelf</h2>
      <ul className="list">
        <li>One shelf for what you’re reading now, one for your to-read pile, and the rest for finished books.</li>
        <li>Shelves by mood: comfort reads, books that broke you, books to reread.</li>
        <li>Shelves by genre, by author, or by the year you read them.</li>
        <li>A whole room for one kind of reading, such as a “Winter nook” for classics.</li>
      </ul>

      <h2>Already have a list somewhere else?</h2>
      <p>
        If your books are on Goodreads, you don’t need to add them one by one. See <Link className="inline" href="/import-goodreads/">how to move your Goodreads library to SelfShelf</Link>.
      </p>
    </GuidePage>
  );
}
