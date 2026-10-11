import Link from "next/link";
import { GuidePage, guideMetadata } from "@/components/GuidePage";

const PATH = "/reading-tracker/";
const TITLE = "How to track the books you read";

export const metadata = guideMetadata(
  PATH,
  TITLE,
  "Keep a simple reading log: track what you’re reading, your page, a yearly reading goal, ratings, reviews and favourite quotes, all in one free reading tracker.",
);

export default function Page() {
  return (
    <GuidePage
      path={PATH}
      title={TITLE}
      intro={<p>A reading tracker helps you remember what you’ve read, notice what you love, and keep going with the books you’ve started. Here’s a simple way to keep one that you’ll actually enjoy opening.</p>}
    >
      <h2>1. Give every book a status</h2>
      <p>
        On SelfShelf each book is <em>Want to read</em>, <em>Reading</em>, <em>Finished</em> or <em>Did not finish</em>. That alone answers the questions readers ask most: what am I reading
        now, what’s next, and how many books did I finish this year? The <em>By status</em> view lays your books out on those shelves for you.
      </p>

      <h2>2. Note your page as you go</h2>
      <p>For the book you’re reading, add the page you’re on. Your home page shows how far through you are, so picking it up again is easy.</p>

      <h2>3. Set a yearly reading goal</h2>
      <p>
        Choose how many books you’d like to finish this year in Edit profile. A progress bar fills as you finish books, and your profile shows how many months in a row you’ve finished at
        least one.
      </p>

      <h2>4. Write a few lines when you finish</h2>
      <p>
        Your future self will thank you. For each book you can give a rating (half stars too), write what stayed with you, add tags, note when you started and finished, and save quotes with
        their page number. Your journal and quote wall collect them all in one place.
      </p>

      <h2>5. Look back on your year</h2>
      <p>
        <em>Your year, wrapped</em> turns your reading into shareable cards: books finished, your book of the year, month by month, your favourite genres and authors.
      </p>

      <h2>Tips for keeping a reading log</h2>
      <ul className="list">
        <li>Log a book the day you start it, not when you finish, so nothing slips through.</li>
        <li>Mark books you didn’t finish too. Knowing what didn’t work for you is useful.</li>
        <li>Keep your goal realistic; it’s there to encourage you, not to make reading a chore.</li>
        <li>Save the line you underlined while you still remember the page.</li>
      </ul>

      <p>
        Want to see your books on a shelf as well as in a log? Read <Link className="inline" href="/virtual-bookshelf/">how to make a virtual bookshelf</Link>.
      </p>
    </GuidePage>
  );
}
