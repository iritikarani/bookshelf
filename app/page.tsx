import { App } from "@/components/App";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

/** Tells search engines what SelfShelf is: a free web app, and the site it lives on. */
const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "WebSite", "@id": `${SITE_URL}/#website`, name: SITE_NAME, url: `${SITE_URL}/`, inLanguage: "en" },
    {
      "@type": "WebApplication",
      name: SITE_NAME,
      url: `${SITE_URL}/`,
      description: SITE_DESCRIPTION,
      applicationCategory: "LifestyleApplication",
      operatingSystem: "Any (web browser)",
      browserRequirements: "Requires JavaScript",
      image: `${SITE_URL}/og.png`,
      offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
      featureList: [
        "Virtual bookshelf with spines, covers and decor",
        "Reading tracker: want to read, reading, finished, did not finish",
        "Yearly reading goal and reading statistics",
        "Book journal with ratings, reviews and saved quotes",
        "Import from Goodreads",
        "Shareable public shelf (optional)",
      ],
    },
  ],
};

export default function Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <App />
    </>
  );
}
