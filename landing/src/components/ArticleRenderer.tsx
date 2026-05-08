import { useMemo } from "react";
import { marked, type Tokens } from "marked";
import {
  ArticleAccordion,
  ArticleCallout,
  ArticleDivider,
  ArticleList,
  ArticleStats,
  ArticleTable,
  ArticleCTA,
} from "./article-kit";

interface Props {
  content: string;
  /** Optional stats extracted from content */
  stats?: Array<{ value: string; label: string; note?: string }>;
}

// Custom dark-mode HTML renderer for marked
function buildRenderer() {
  const renderer = new marked.Renderer();

  renderer.heading = ({ text, depth }) => {
    const sizes: Record<number, string> = {
      2: "text-xl font-bold text-white mt-10 mb-3",
      3: "text-lg font-semibold text-white mt-7 mb-2",
      4: "text-base font-semibold text-zinc-200 mt-5 mb-1.5",
    };
    const cls = sizes[depth] ?? "text-sm font-semibold text-zinc-300 mt-4 mb-1";
    const tag = `h${depth}`;
    return `<${tag} class="${cls}">${text}</${tag}>`;
  };

  renderer.paragraph = ({ text }) =>
    `<p class="text-zinc-300 leading-relaxed mb-4">${text}</p>`;

  renderer.strong = ({ text }) =>
    `<strong class="font-semibold text-white">${text}</strong>`;

  renderer.em = ({ text }) =>
    `<em class="text-zinc-200 italic">${text}</em>`;

  renderer.list = ({ items, ordered }) => {
    const tag = ordered ? "ol" : "ul";
    const listCls = ordered
      ? "list-decimal list-inside space-y-1.5 my-4 text-zinc-300"
      : "list-none space-y-1.5 my-4 text-zinc-300";
    const itemPrefix = ordered ? "" : '<span class="mr-2 text-zinc-500">•</span>';
    const inner = items
      .map((item) => `<li class="flex items-start gap-1">${itemPrefix}<span>${item.text}</span></li>`)
      .join("");
    return `<${tag} class="${listCls}">${inner}</${tag}>`;
  };

  renderer.blockquote = ({ text }) =>
    `<blockquote class="border-l-2 border-zinc-600 bg-zinc-900 px-4 py-3 rounded-r-xl my-5 text-zinc-300 text-sm">${text}</blockquote>`;

  renderer.hr = () =>
    `<hr class="my-8 border-zinc-800" />`;

  renderer.code = ({ text, lang }) =>
    `<pre class="bg-zinc-900 border border-zinc-800 rounded-xl p-4 overflow-x-auto my-5"><code class="text-zinc-200 text-sm font-mono">${text}</code></pre>`;

  renderer.codespan = ({ text }) =>
    `<code class="bg-zinc-800 text-zinc-200 text-sm px-1.5 py-0.5 rounded font-mono">${text}</code>`;

  renderer.table = (token: Tokens.Table) => {
    const headers = token.header.map((h) => h.text);
    const rows = token.rows.map((row) => row.map((cell) => cell.text));

    const head = `<tr>${headers
      .map((h) => `<th class="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-400 border-b border-zinc-700">${h}</th>`)
      .join("")}</tr>`;

    const body = rows
      .map(
        (row) =>
          `<tr class="border-b border-zinc-800 hover:bg-zinc-900/50 transition-colors">${row
            .map((cell) => `<td class="px-3 py-2.5 text-sm text-zinc-300">${cell}</td>`)
            .join("")}</tr>`
      )
      .join("");

    return `<div class="overflow-x-auto my-6 rounded-xl border border-zinc-800">
      <table class="w-full text-left">
        <thead class="bg-zinc-900">${head}</thead>
        <tbody>${body}</tbody>
      </table>
    </div>`;
  };

  renderer.link = ({ href, title, text }) =>
    `<a href="${href}" ${title ? `title="${title}"` : ""} class="text-white underline underline-offset-2 decoration-zinc-600 hover:decoration-zinc-400 transition-colors" target="_blank" rel="noopener noreferrer">${text}</a>`;

  return renderer;
}

// Split markdown into top-level sections by h2 for structure-aware rendering
type Section = { heading: string | null; body: string };

function parseSections(md: string): Section[] {
  const lines = md.split("\n");
  const sections: Section[] = [];
  let current: Section = { heading: null, body: "" };

  for (const line of lines) {
    if (line.startsWith("## ")) {
      if (current.body.trim() || current.heading) {
        sections.push(current);
      }
      current = { heading: line.slice(3).trim(), body: "" };
    } else {
      current.body += line + "\n";
    }
  }
  if (current.body.trim() || current.heading) {
    sections.push(current);
  }
  return sections;
}

function renderMd(md: string): string {
  return marked(md, {
    renderer: buildRenderer(),
    breaks: false,
    gfm: true,
  }) as string;
}

export default function ArticleRenderer({ content, stats }: Props) {
  const sections = useMemo(() => parseSections(content), [content]);

  return (
    <div className="space-y-0">
      {sections.map((section, i) => {
        const bodyLower = section.body.toLowerCase();

        // Detect section type for visual treatment
        const isCta =
          section.heading?.toLowerCase().includes("cta") ||
          section.heading?.toLowerCase().includes("empez") ||
          section.heading?.toLowerCase().includes("conclus") ||
          section.heading?.toLowerCase().includes("descarga") ||
          section.heading?.toLowerCase().includes("prueba");

        const isStats =
          section.heading?.toLowerCase().includes("estadística") ||
          section.heading?.toLowerCase().includes("resultado") ||
          section.heading?.toLowerCase().includes("éxito");

        const isTip =
          section.heading?.toLowerCase().includes("error") ||
          section.heading?.toLowerCase().includes("fallo") ||
          section.heading?.toLowerCase().includes("evitar") ||
          section.heading?.toLowerCase().includes("consejo");

        if (isCta && section.heading) {
          return (
            <ArticleCTA
              key={i}
              href="https://t.me/skilyapp_bot"
              label="Empezar gratis en Telegram"
              description={section.body.replace(/#+.*\n/g, "").replace(/#.*\n/g, "").trim().split("\n")[0]}
            />
          );
        }

        return (
          <div key={i}>
            {section.heading && (
              <h2 className="text-xl font-bold text-white mt-10 mb-4 pb-2 border-b border-zinc-800">
                {section.heading}
              </h2>
            )}
            {isTip && section.heading ? (
              <ArticleCallout type="warning" title={undefined}>
                <div
                  dangerouslySetInnerHTML={{ __html: renderMd(section.body) }}
                />
              </ArticleCallout>
            ) : (
              <div dangerouslySetInnerHTML={{ __html: renderMd(section.body) }} />
            )}
          </div>
        );
      })}

      {stats && stats.length > 0 && (
        <div className="mt-8">
          <ArticleStats stats={stats} />
        </div>
      )}
    </div>
  );
}
