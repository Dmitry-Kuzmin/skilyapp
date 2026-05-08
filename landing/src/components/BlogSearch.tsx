import { useState } from "react";
import type { ArticleMeta, Lang } from "../data/articles";

interface Props {
  articles: ArticleMeta[];
  lang: Lang;
  labels: {
    searchPlaceholder: string;
    categories: Record<string, string>;
    readMin: string;
    readMore: string;
  };
}

const categoryOrder = ["all", "dgt-2026", "news", "preparation", "tips"] as const;

export default function BlogSearch({ articles, lang, labels }: Props) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const sorted = [...articles].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );

  const filtered = sorted.filter((a) => {
    const loc = a[lang];
    const matchesSearch =
      query === "" ||
      loc.title.toLowerCase().includes(query.toLowerCase()) ||
      loc.description.toLowerCase().includes(query.toLowerCase()) ||
      loc.excerpt.toLowerCase().includes(query.toLowerCase());
    const matchesCategory = activeCategory === "all" || a.categorySlug === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(lang === "ru" ? "ru-RU" : lang === "es" ? "es-ES" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={labels.searchPlaceholder}
          className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-zinc-600 sm:max-w-xs"
        />
        <div className="flex flex-wrap gap-2">
          {categoryOrder.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                activeCategory === cat
                  ? "bg-white text-black"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
            >
              {labels.categories[cat] ?? cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((article) => {
          const loc = article[lang];
          return (
            <a
              key={article.slug}
              href={`/article/${article.slug}`}
              className="group flex flex-col rounded-2xl border border-zinc-800 bg-zinc-900 p-5 transition-colors hover:border-zinc-600"
            >
              <span className="mb-2 inline-block rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs text-zinc-400">
                {loc.category}
              </span>
              <h2 className="mb-2 text-base font-semibold text-white group-hover:text-zinc-200 line-clamp-3">
                {loc.title}
              </h2>
              <p className="mb-4 text-sm text-zinc-400 line-clamp-2">{loc.excerpt}</p>
              <div className="mt-auto flex items-center justify-between text-xs text-zinc-500">
                <span>{formatDate(article.publishedAt)}</span>
                <span>{article.readTime} {labels.readMin}</span>
              </div>
            </a>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="py-12 text-center text-zinc-500">— — —</p>
      )}
    </div>
  );
}
