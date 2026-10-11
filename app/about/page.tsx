import Link from "next/link";
import { GuidePage, guideMetadata } from "@/components/GuidePage";
import { SITE_NAME, SITE_URL } from "@/lib/site";

const PATH = "/about/";
const TITLE = "About SelfShelf";

export const metadata = {
  ...guideMetadata(
    PATH,
    TITLE,
    "SelfShelf is a free digital bookshelf and reading tracker, made in India. What it is, who it’s for, what it does, and how it handles your data.",
  ),
  title: { absolute: "About SelfShelf: your free digital bookshelf" },
};

/** Plain facts about SelfShelf, for readers and for the search engines and AI tools that describe it. */
const aboutJsonLd = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  url: `${SITE_URL}${PATH}`,
  name: TITLE,
  mainEntity: {
    "@type": "WebApplication",
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    applicationCategory: "LifestyleApplication",
    operatingSystem: "Any (web browser)",
    countryOfOrigin: "India",
    offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
    description: "A free digital bookshelf and reading tracker with a decorated virtual room, a reading journal, yearly goals and Goodreads import.",
  },
};

export default function Page() {
  return (
    <GuidePage
      path={PATH}
      title={TITLE}
      jsonLd={aboutJsonLd}
      intro={<p>SelfShelf is a free digital bookshelf and reading tracker. It’s for readers who love the look of their books as much as reading them.</p>}
    >
      <h2>What SelfShelf is</h2>
      <p>
        Most book trackers are lists. SelfShelf puts your books on real-looking shelves in a cosy room that you decorate yourself, so your reading life looks like a bookcase at home, and
        every book opens to what you thought of it.
      </p>

      <h2>What you can do with it</h2>
      <ul className="list">
        <li>Build a virtual bookshelf: spines, covers, leaning and stacked books, on shelves you name, in as many rooms as you like.</li>
        <li>Decorate the room: room styles such as cottagecore, dark academia and Japandi, wallpaper, lamp, the view from the window, plants and other objects.</li>
        <li>Track your reading: Want to read, Reading, Finished and Did not finish, your current page, and a yearly reading goal.</li>
        <li>Keep a reading journal: ratings (with half stars), what stayed with you, tags, dates, and saved quotes with page numbers.</li>
        <li>Look back with a yearly “wrapped” summary of your reading.</li>
        <li>
          Add books by searching title, author or ISBN, add them by hand, or <Link className="inline" href="/import-goodreads/">import a Goodreads library</Link>.
        </li>
        <li>Share a public shelf link and a picture of your shelf, if you want to.</li>
      </ul>

      <h2>Key facts</h2>
      <ul className="list">
        <li>
          <strong>Price:</strong> free to use.
        </li>
        <li>
          <strong>Where it works:</strong> in any modern web browser on phone, tablet or computer; it can be added to a phone’s home screen like an app.
        </li>
        <li>
          <strong>Privacy:</strong> your shelf is private by default. Public shelves are optional, and you choose whether visitors see your reviews and quotes.
        </li>
        <li>
          <strong>Book data:</strong> details and covers come from Open Library and Google Books.
        </li>
        <li>
          <strong>Made in:</strong> India, as an independent project.
        </li>
        <li>
          <strong>Website:</strong> www.selfshelf.in
        </li>
      </ul>

      <h2>Who it’s for</h2>
      <p>
        Readers who want a calm, personal place for their books: people who journal about what they read, set reading goals, love bookshelf aesthetics, or are looking for a simpler,
        more visual alternative to apps like Goodreads.
      </p>

      <p>
        New here? Start with <Link className="inline" href="/virtual-bookshelf/">how to make a virtual bookshelf</Link>, or read the <Link className="inline" href="/faq/">questions and answers</Link>.
      </p>
    </GuidePage>
  );
}
