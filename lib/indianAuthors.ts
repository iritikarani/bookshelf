/**
 * A hand-picked guide to Indian writers and some of their best-known books, for the Discover tab.
 * Years are first publication (original language). Covers and details are looked up live from
 * Open Library / Google Books when a reader opens an author.
 */
export interface DiscoverBook {
  title: string;
  year: number | null;
  /** Original-language title, when the book is best known in translation. */
  original?: string;
}

export interface DiscoverAuthor {
  name: string;
  /** Language(s) they write in. */
  language: string;
  era: "Classic" | "Modern" | "Contemporary";
  note: string;
  books: DiscoverBook[];
}

export const INDIAN_AUTHORS: DiscoverAuthor[] = [
  {
    name: "Rabindranath Tagore",
    language: "Bengali",
    era: "Classic",
    note: "Poet, novelist and the first non-European Nobel laureate in Literature.",
    books: [
      { title: "Gitanjali", year: 1910 },
      { title: "Gora", year: 1910 },
      { title: "The Home and the World", original: "Ghare Baire", year: 1916 },
      { title: "The Post Office", original: "Dak Ghar", year: 1912 },
    ],
  },
  {
    name: "Munshi Premchand",
    language: "Hindi, Urdu",
    era: "Classic",
    note: "The great realist of Hindi and Urdu fiction, writing village India with deep empathy.",
    books: [
      { title: "Godaan", year: 1936 },
      { title: "Nirmala", year: 1927 },
      { title: "Gaban", year: 1931 },
    ],
  },
  {
    name: "Bankim Chandra Chattopadhyay",
    language: "Bengali",
    era: "Classic",
    note: "A founder of the modern Indian novel; author of 'Vande Mataram'.",
    books: [{ title: "Anandamath", year: 1882 }],
  },
  {
    name: "Sarat Chandra Chattopadhyay",
    language: "Bengali",
    era: "Classic",
    note: "Beloved storyteller of love, family and social injustice in Bengal.",
    books: [
      { title: "Devdas", year: 1917 },
      { title: "Parineeta", year: 1914 },
    ],
  },
  {
    name: "Bibhutibhushan Bandyopadhyay",
    language: "Bengali",
    era: "Classic",
    note: "His village childhood novel became Satyajit Ray's first film.",
    books: [{ title: "Pather Panchali", year: 1929 }],
  },
  {
    name: "R. K. Narayan",
    language: "English",
    era: "Classic",
    note: "Creator of Malgudi, the gentle, funny small town at the heart of his novels.",
    books: [
      { title: "Swami and Friends", year: 1935 },
      { title: "Malgudi Days", year: 1943 },
      { title: "The English Teacher", year: 1945 },
      { title: "The Guide", year: 1958 },
    ],
  },
  {
    name: "Mulk Raj Anand",
    language: "English",
    era: "Classic",
    note: "Pioneer of Indian writing in English, giving voice to the oppressed.",
    books: [
      { title: "Untouchable", year: 1935 },
      { title: "Coolie", year: 1936 },
    ],
  },
  {
    name: "Raja Rao",
    language: "English",
    era: "Classic",
    note: "His village epic retells the freedom movement in the rhythm of a grandmother's tale.",
    books: [{ title: "Kanthapura", year: 1938 }],
  },
  {
    name: "Vaikom Muhammad Basheer",
    language: "Malayalam",
    era: "Classic",
    note: "Malayalam's most loved humanist, writing with warmth and wit.",
    books: [{ title: "Balyakalasakhi", year: 1944 }],
  },
  {
    name: "Ismat Chughtai",
    language: "Urdu",
    era: "Classic",
    note: "Fearless Urdu writer of women's inner lives.",
    books: [{ title: "The Crooked Line", original: "Terhi Lakeer", year: 1943 }],
  },
  {
    name: "Amrita Pritam",
    language: "Punjabi",
    era: "Classic",
    note: "The pre-eminent Punjabi poet and novelist of the twentieth century.",
    books: [{ title: "Pinjar", year: 1950 }],
  },
  {
    name: "Thakazhi Sivasankara Pillai",
    language: "Malayalam",
    era: "Classic",
    note: "Chronicler of Kerala's fishing and farming communities.",
    books: [{ title: "Chemmeen", year: 1956 }],
  },
  {
    name: "Khushwant Singh",
    language: "English",
    era: "Modern",
    note: "Witty, irreverent journalist and novelist.",
    books: [
      { title: "Train to Pakistan", year: 1956 },
      { title: "Delhi", year: 1990 },
    ],
  },
  {
    name: "Ruskin Bond",
    language: "English",
    era: "Modern",
    note: "Tender stories of the hills, childhood and small lives.",
    books: [
      { title: "The Room on the Roof", year: 1956 },
      { title: "A Flight of Pigeons", year: 1978 },
      { title: "The Blue Umbrella", year: null },
    ],
  },
  {
    name: "U. R. Ananthamurthy",
    language: "Kannada",
    era: "Modern",
    note: "Kannada modernist whose novella questioned caste and orthodoxy.",
    books: [{ title: "Samskara", year: 1965 }],
  },
  {
    name: "Girish Karnad",
    language: "Kannada",
    era: "Modern",
    note: "Playwright who reworked history and myth for the modern stage.",
    books: [
      { title: "Tughlaq", year: 1964 },
      { title: "Hayavadana", year: 1971 },
    ],
  },
  {
    name: "Mahasweta Devi",
    language: "Bengali",
    era: "Modern",
    note: "Writer-activist who wrote for and about India's tribal communities.",
    books: [
      { title: "Mother of 1084", original: "Hajar Churashir Maa", year: 1974 },
      { title: "Imaginary Maps", year: 1993 },
    ],
  },
  {
    name: "Kamala Das",
    language: "English, Malayalam",
    era: "Modern",
    note: "Confessional poet whose memoir broke silences about women's desire.",
    books: [{ title: "My Story", year: 1976 }],
  },
  {
    name: "Krishna Sobti",
    language: "Hindi",
    era: "Modern",
    note: "Jnanpith-winning Hindi novelist with a bold, earthy voice.",
    books: [{ title: "Zindaginama", year: 1979 }],
  },
  {
    name: "Anita Desai",
    language: "English",
    era: "Modern",
    note: "Three-time Booker finalist and a master of quiet interior lives.",
    books: [
      { title: "Fire on the Mountain", year: 1977 },
      { title: "Clear Light of Day", year: 1980 },
      { title: "In Custody", year: 1984 },
    ],
  },
  {
    name: "Salman Rushdie",
    language: "English",
    era: "Modern",
    note: "Booker of Bookers winner; big, playful novels of history and myth.",
    books: [
      { title: "Midnight's Children", year: 1981 },
      { title: "Shame", year: 1983 },
      { title: "The Moor's Last Sigh", year: 1995 },
    ],
  },
  {
    name: "Vikram Seth",
    language: "English",
    era: "Modern",
    note: "Author of one of the longest — and most loved — English novels.",
    books: [
      { title: "The Golden Gate", year: 1986 },
      { title: "A Suitable Boy", year: 1993 },
    ],
  },
  {
    name: "Shashi Tharoor",
    language: "English",
    era: "Modern",
    note: "Retold the Mahabharata as twentieth-century Indian politics.",
    books: [
      { title: "The Great Indian Novel", year: 1989 },
      { title: "An Era of Darkness", year: 2016 },
    ],
  },
  {
    name: "Amitav Ghosh",
    language: "English",
    era: "Modern",
    note: "Novels of migration, history and the sea; Jnanpith laureate.",
    books: [
      { title: "The Shadow Lines", year: 1988 },
      { title: "The Glass Palace", year: 2000 },
      { title: "The Hungry Tide", year: 2004 },
      { title: "Sea of Poppies", year: 2008 },
    ],
  },
  {
    name: "Rohinton Mistry",
    language: "English",
    era: "Modern",
    note: "Heartbreaking, generous novels of Bombay life.",
    books: [
      { title: "Such a Long Journey", year: 1991 },
      { title: "A Fine Balance", year: 1995 },
    ],
  },
  {
    name: "Arundhati Roy",
    language: "English",
    era: "Modern",
    note: "Her debut won the Booker Prize; also an essayist and activist.",
    books: [
      { title: "The God of Small Things", year: 1997 },
      { title: "The Ministry of Utmost Happiness", year: 2017 },
    ],
  },
  {
    name: "Kiran Nagarkar",
    language: "English, Marathi",
    era: "Modern",
    note: "Ambitious, darkly funny novels; Cuckold won the Sahitya Akademi Award.",
    books: [{ title: "Cuckold", year: 1997 }],
  },
  {
    name: "A. P. J. Abdul Kalam",
    language: "English",
    era: "Modern",
    note: "Scientist and President of India; his memoir has inspired millions.",
    books: [{ title: "Wings of Fire", year: 1999 }],
  },
  {
    name: "Jhumpa Lahiri",
    language: "English",
    era: "Contemporary",
    note: "Pulitzer-winning stories of the Indian diaspora.",
    books: [
      { title: "Interpreter of Maladies", year: 1999 },
      { title: "The Namesake", year: 2003 },
      { title: "The Lowland", year: 2013 },
    ],
  },
  {
    name: "Sudha Murty",
    language: "English, Kannada",
    era: "Contemporary",
    note: "Warm, simple stories drawn from a life of work and giving.",
    books: [
      { title: "Wise and Otherwise", year: 2002 },
      { title: "Three Thousand Stitches", year: 2017 },
    ],
  },
  {
    name: "Chetan Bhagat",
    language: "English",
    era: "Contemporary",
    note: "Best-selling novels of campus life, love and ambition.",
    books: [
      { title: "Five Point Someone", year: 2004 },
      { title: "The 3 Mistakes of My Life", year: 2008 },
      { title: "2 States", year: 2009 },
    ],
  },
  {
    name: "Kiran Desai",
    language: "English",
    era: "Contemporary",
    note: "Booker-winning novel of the Himalayas and the immigrant dream.",
    books: [{ title: "The Inheritance of Loss", year: 2006 }],
  },
  {
    name: "Aravind Adiga",
    language: "English",
    era: "Contemporary",
    note: "His Booker-winning debut is a sharp, savage story of class.",
    books: [{ title: "The White Tiger", year: 2008 }],
  },
  {
    name: "Anuja Chauhan",
    language: "English",
    era: "Contemporary",
    note: "Sparkling, funny romances full of Delhi chatter.",
    books: [
      { title: "The Zoya Factor", year: 2008 },
      { title: "Those Pricey Thakur Girls", year: 2013 },
    ],
  },
  {
    name: "Ravinder Singh",
    language: "English",
    era: "Contemporary",
    note: "Heartfelt love stories with a huge young readership.",
    books: [{ title: "I Too Had a Love Story", year: 2008 }],
  },
  {
    name: "Amish Tripathi",
    language: "English",
    era: "Contemporary",
    note: "Mythological fantasy that reimagines Shiva and Ram.",
    books: [
      { title: "The Immortals of Meluha", year: 2010 },
      { title: "The Secret of the Nagas", year: 2011 },
      { title: "The Oath of the Vayuputras", year: 2013 },
    ],
  },
  {
    name: "Devdutt Pattanaik",
    language: "English",
    era: "Contemporary",
    note: "Illustrated retellings that make Indian mythology approachable.",
    books: [
      { title: "Jaya: An Illustrated Retelling of the Mahabharata", year: 2010 },
      { title: "Sita: An Illustrated Retelling of the Ramayana", year: 2013 },
    ],
  },
  {
    name: "Manu Joseph",
    language: "English",
    era: "Contemporary",
    note: "Sharp satire of science, caste and ambition in Mumbai.",
    books: [{ title: "Serious Men", year: 2010 }],
  },
  {
    name: "Preeti Shenoy",
    language: "English",
    era: "Contemporary",
    note: "Popular, relatable novels about resilience and everyday life.",
    books: [{ title: "Life Is What You Make It", year: 2011 }],
  },
  {
    name: "Perumal Murugan",
    language: "Tamil",
    era: "Contemporary",
    note: "Tamil novelist of rural Kongu life, widely read in translation.",
    books: [
      { title: "One Part Woman", original: "Madhorubagan", year: 2010 },
      { title: "Poonachi", year: 2016 },
    ],
  },
  {
    name: "Geetanjali Shree",
    language: "Hindi",
    era: "Contemporary",
    note: "First Hindi novel to win the International Booker Prize.",
    books: [{ title: "Tomb of Sand", original: "Ret Samadhi", year: 2018 }],
  },
  {
    name: "Banu Mushtaq",
    language: "Kannada",
    era: "Contemporary",
    note: "Her stories of Muslim women's lives won the International Booker Prize.",
    books: [{ title: "Heart Lamp", year: 2025 }],
  },
];
