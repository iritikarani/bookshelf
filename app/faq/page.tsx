import Link from "next/link";
import { GuidePage, guideMetadata } from "@/components/GuidePage";

const PATH = "/faq/";
const TITLE = "SelfShelf questions and answers";

export const metadata = guideMetadata(
  PATH,
  "Frequently asked questions",
  "Is SelfShelf free? Is my bookshelf private? How do I add books or import from Goodreads? Answers to common questions about the SelfShelf virtual bookshelf.",
);

/** Each answer as plain text (for search engines) and as the page shows it. */
const FAQS: { q: string; text: string; answer: React.ReactNode }[] = [
  {
    q: "What is SelfShelf?",
    text: "SelfShelf is a virtual bookshelf and reading tracker. You put the books you love on real-looking shelves in a room you decorate, track what you're reading, and keep a journal for every book.",
    answer: (
      <>
        SelfShelf is a virtual bookshelf and reading tracker. You put the books you love on real-looking shelves in a room you decorate, track what you’re reading, and keep a journal for
        every book.
      </>
    ),
  },
  {
    q: "Is SelfShelf free?",
    text: "Yes, SelfShelf is free to use. Create an account with your email to keep your shelf on every device.",
    answer: <>Yes, SelfShelf is free to use. Create an account with your email to keep your shelf on every device.</>,
  },
  {
    q: "Is my bookshelf private?",
    text: "Yes, your shelf is private by default and only you can see it. If you turn on Public shelf in Edit profile, anyone with your link can view it (but never change it), and it may be suggested to other readers on SelfShelf's Discover page. You can also choose whether visitors see your reviews and quotes. Public shelves are not put in search engine results.",
    answer: (
      <>
        Yes, your shelf is private by default and only you can see it. If you turn on <em>Public shelf</em> in Edit profile, anyone with your link can view it (but never change it), and it may be
        suggested to other readers on SelfShelf’s Discover page. You can also choose whether visitors see your reviews and quotes. Public shelves are not put in search engine results.
      </>
    ),
  },
  {
    q: "How do I add books?",
    text: "Tap Add a book and search by title, author or ISBN. Book details and covers come from Open Library and Google Books. If a book isn't listed, you can add it by hand and upload a photo of its cover.",
    answer: (
      <>
        Tap <em>Add a book</em> and search by title, author or ISBN. Book details and covers come from Open Library and Google Books. If a book isn’t listed, you can add it by hand and upload a
        photo of its cover.
      </>
    ),
  },
  {
    q: "Can I import my books from Goodreads?",
    text: "Yes. Export your library from Goodreads as a CSV file, then choose Import from Goodreads in SelfShelf. Your ratings, reviews, dates read and shelves come with it.",
    answer: (
      <>
        Yes. Export your library from Goodreads as a CSV file, then choose <em>Import from Goodreads</em> in SelfShelf. Your ratings, reviews, dates read and shelves come with it.{" "}
        <Link className="inline" href="/import-goodreads/">
          Step-by-step guide
        </Link>
        .
      </>
    ),
  },
  {
    q: "Can I use SelfShelf without an account?",
    text: "Yes, you can try it as a guest. A guest shelf is saved only in that browser, so create an account (free) to keep it safe and to share it.",
    answer: <>Yes, you can try it as a guest. A guest shelf is saved only in that browser, so create an account (free) to keep it safe and to share it.</>,
  },
  {
    q: "Does SelfShelf work on my phone?",
    text: "Yes. SelfShelf works in any modern phone, tablet or computer browser. To open it like an app, use your browser's Add to Home screen option.",
    answer: (
      <>
        Yes. SelfShelf works in any modern phone, tablet or computer browser. To open it like an app, use your browser’s <em>Add to Home screen</em> option.
      </>
    ),
  },
  {
    q: "How can I share my bookshelf?",
    text: "Turn on Public shelf in Edit profile and share your link, such as selfshelf.in/s/@yourname. You can also download a picture of your shelf sized for Instagram stories. Visitors can leave you a note in your guest book.",
    answer: (
      <>
        Turn on <em>Public shelf</em> in Edit profile and share your link, such as selfshelf.in/s/@yourname. You can also download a picture of your shelf sized for Instagram stories. Visitors can
        leave you a note in your guest book.
      </>
    ),
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.text } })),
};

export default function Page() {
  return (
    <GuidePage path={PATH} title={TITLE} intro={<p>The things readers most often ask about SelfShelf.</p>} jsonLd={faqJsonLd}>
      {FAQS.map((f) => (
        <section key={f.q}>
          <h2>{f.q}</h2>
          <p>{f.answer}</p>
        </section>
      ))}
    </GuidePage>
  );
}
