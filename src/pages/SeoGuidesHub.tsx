import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { SeoHead } from "@/components/seo/SeoHead";
import { seoGuidePages } from "@/content/seoGuides";

const structuredData = [
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Skilyapp", item: "https://skilyapp.com/" },
      { "@type": "ListItem", position: 2, name: "Guides", item: "https://skilyapp.com/guides" },
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Skilyapp DGT Guides",
    url: "https://skilyapp.com/guides",
    description: "Публичные SEO-гайды Skilyapp по экзамену DGT в Испании: как сдать теорию, как учить знаки, как разбирать ошибки и спорные вопросы.",
    mainEntity: {
      "@type": "ItemList",
      itemListOrder: "https://schema.org/ItemListOrderAscending",
      numberOfItems: seoGuidePages.length,
      itemListElement: seoGuidePages.map((guide, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `https://skilyapp.com/guides/${guide.slug}`,
        name: guide.title,
        description: guide.description,
      })),
    },
  },
];

export default function SeoGuidesHub() {
  return (
    <Layout>
      <SeoHead
        title="Guides Skilyapp | Подготовка к экзамену DGT по темам, ошибкам и знакам"
        description="Собрание публичных guide-страниц Skilyapp: как сдать теорию DGT, как учить темы, как разбирать ошибки, спорные вопросы и дорожные знаки Испании."
        canonicalUrl="https://skilyapp.com/guides"
        structuredData={structuredData}
      />

      <main className="min-h-screen bg-slate-950 text-white">
        <section className="relative overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.22),transparent_45%),linear-gradient(180deg,#020617_0%,#0f172a_100%)]">
          <div className="mx-auto max-w-6xl px-6 py-20 md:px-10 md:py-24">
            <div className="max-w-3xl space-y-6">
              <div className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-1 text-xs font-bold uppercase tracking-[0.25em] text-cyan-200">
                DGT Knowledge Hub
              </div>
              <h1 className="text-4xl font-black tracking-tight text-white md:text-6xl">
                Публичные guides по экзамену DGT, ошибкам, знакам и стратегиям подготовки
              </h1>
              <p className="text-lg leading-8 text-slate-300 md:text-xl">
                Это не просто интерфейс с тестами, а отдельный индексируемый контентный слой. Здесь собраны страницы, которые Google и AI-системы могут читать как самостоятельные источники: как сдать теорию, как учить темы, как разбирать ошибки и как не путаться в знаках Испании.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-16 md:px-10">
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {seoGuidePages.map((guide) => (
              <article key={guide.slug} className="group rounded-3xl border border-white/10 bg-white/[0.03] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-cyan-400/30 hover:bg-white/[0.05]">
                <div className="mb-4 text-xs font-bold uppercase tracking-[0.25em] text-cyan-200/80">Guide</div>
                <h2 className="text-2xl font-black leading-tight text-white">
                  <Link to={`/guides/${guide.slug}`} className="hover:text-cyan-200 transition-colors">
                    {guide.title}
                  </Link>
                </h2>
                <p className="mt-4 text-sm leading-7 text-slate-300">{guide.excerpt}</p>
                <div className="mt-6 flex flex-wrap gap-2">
                  {guide.relatedLinks.slice(0, 2).map((link) => (
                    <Link
                      key={link.href}
                      to={link.href}
                      className="rounded-full border border-white/10 px-3 py-1 text-xs font-medium text-slate-300 transition-colors hover:border-cyan-400/40 hover:text-white"
                    >
                      {link.title}
                    </Link>
                  ))}
                </div>
                <Link
                  to={`/guides/${guide.slug}`}
                  className="mt-8 inline-flex items-center rounded-full bg-cyan-400 px-4 py-2 text-sm font-bold text-slate-950 transition-transform hover:scale-[1.02]"
                >
                  Читать guide
                </Link>
              </article>
            ))}
          </div>
        </section>
      </main>
    </Layout>
  );
}
