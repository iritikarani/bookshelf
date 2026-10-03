import { PublicShelfView } from "@/components/PublicShelfView";

export default async function PublicShelfPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <PublicShelfView slug={slug} />;
}

export const metadata = {
  title: "A shelf on Cosmic Space",
  robots: { index: false },
};
