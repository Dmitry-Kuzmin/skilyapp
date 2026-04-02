import { Link, Navigate, useParams } from "react-router-dom";
import Layout from "@/components/Layout";
import { SeoHead } from "@/components/seo/SeoHead";
import { getSeoGuideBySlug } from "@/content/seoGuides";

const GUIDE_DATE = "2026-04-02T00:00:00+00:00";

export default function SeoGuidePage() {
  const { slug } = useParams<{ slug: string }>();
  const guide = slug ? getSeoGuideBySlug(slug) : undefined;

  if (!guide) {
    return <Navigate to="/guides" replace />;
  }

  const canonicalUrl = `https://skilyapp.com/guides/${guide.slug}`;
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Skilyapp", item: "https://skilyapp.com/" },
        { "@type": "ListItem", position: 2, name: "Guides", item: "https://skilyapp.com/guides" },
        { "@type": "ListItem", position: 3, name: guide.title, item: canonicalUrl },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: guide.title,
      description: guide.description,
      author: { "@type": "Organization", name: "Skilyapp" },
      publisher: {
        "@type": "Organization",
        name: "Skilyapp",
        logo: { "@type": "ImageObject", url: "https://skilyapp.com/logo.png" },
      },
      mainEntityOfPage: canonicalUrl,
      datePublished: GUIDE_DATE,
      dateModified: GUIDE_DATE,
      articleSection: "DGT theory exam preparation",
      inLanguage: "ru",
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: guide.faq.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    },
  ];

  return (
    <Layout>
      <SeoHead
        title={`${guide.title} | Skilyapp Guide`}
        description={guide.description}
        canonicalUrl={canonicalUrl}
        ogType="article"
        publishedTime={GUIDE_DATE}
        modifiedTime={GUIDE_DATE}
        structuredData={structuredData}
      />

      <main className="min-h-screen bg-slate-950 text-white">
        <section className="border-b border-white/10 bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.18),transparent_42%),linear-gradient(180deg,#020617_0%,#0f172a_100%)]">
          <div className="mx-auto max-w-4xl px-6 py-16 md:px-10 md:py-20">
            <Link to="/guides" className="text-sm font-medium text-cyan-200 transition-colors hover:text-white">
              Назад в guides
            </Link>
            <div className="mt-6 inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-1 text-xs font-bold uppercase tracking-[0.25em] text-emerald-200">
              SEO Guide
            </div>
            <h1 className="mt-6 text-4xl font-black tracking-tight text-white md:text-6xl">{guide.title}</h1>
            <p className="mt-6 text-lg leading-8 text-slate-300 md:text-xl">{guide.description}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to={guide.cta.href}
                className="rounded-full bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 transition-transform hover:scale-[1.02]"
              >
                {guide.cta.label}
              </Link>
              <Link
                to="/blog"
                className="rounded-full border border-white/15 px-5 py-3 text-sm font-bold text-white transition-colors hover:border-cyan-400/40 hover:text-cyan-200"
              >
                Читать блог Skilyapp
              </Link>
            </div>
          </div>
        </section>

        <article className="mx-auto max-w-4xl px-6 py-16 md:px-10">
          <div className="space-y-12">
            {guide.sections.map((section) => (
              <section key={section.title} className="rounded-3xl border border-white/10 bg-white/[0.03] p-8">
                <h2 className="text-2xl font-black text-white md:text-3xl">{section.title}</h2>
                <div className="mt-6 space-y-4 text-base leading-8 text-slate-300">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
                {section.bullets?.length ? (
                  <ul className="mt-6 space-y-3 text-sm leading-7 text-slate-200">
                    {section.bullets.map((bullet) => (
                      <li key={bullet} className="flex gap-3">
                        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-cyan-300" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}
          </div>

          <section className="mt-14 rounded-3xl border border-white/10 bg-white/[0.02] p-8">
            <h2 className="text-2xl font-black text-white md:text-3xl">FAQ</h2>
            <div className="mt-6 space-y-6">
              {guide.faq.map((item) => (
                <div key={item.question} className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
                  <h3 className="text-lg font-bold text-white">{item.question}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-300">{item.answer}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-14">
            <h2 className="text-2xl font-black text-white md:text-3xl">Связанные страницы</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {guide.relatedLinks.map((link) => (
                <Link key={link.href} to={link.href} className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 transition-all hover:-translate-y-1 hover:border-cyan-400/30 hover:bg-white/[0.05]">
                  <h3 className="text-lg font-bold text-white">{link.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-300">{link.description}</p>
                </Link>
              ))}
            </div>
          </section>
        </article>
      </main>
    </Layout>
  );
}
