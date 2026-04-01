import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BASE_URL = "https://sdadim.eu";

const STATIC_PAGES = [
  { loc: "/", priority: "1.0", changefreq: "weekly" },
  { loc: "/blog", priority: "0.9", changefreq: "weekly" },
];

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: posts } = await supabase
    .from("blog_posts")
    .select("slug, published_at, updated_at")
    .eq("published", true)
    .eq("site_id", "sdadim")
    .order("published_at", { ascending: false });

  const staticUrls = STATIC_PAGES.map(
    (p) => `
  <url>
    <loc>${BASE_URL}${p.loc}</loc>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`,
  ).join("");

  const postUrls = (posts ?? []).map((p) => {
    const lastmod = (p.updated_at ?? p.published_at ?? "").split("T")[0];
    return `
  <url>
    <loc>${BASE_URL}/blog/${p.slug}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ""}
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`;
  }).join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${staticUrls}${postUrls}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
});
