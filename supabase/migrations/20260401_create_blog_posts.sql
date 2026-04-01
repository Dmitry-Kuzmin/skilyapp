-- Blog posts table for sdadim.eu and other sites
CREATE TABLE IF NOT EXISTS blog_posts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT NOT NULL,
  site_id       TEXT NOT NULL DEFAULT 'sdadim',
  title         TEXT NOT NULL,
  excerpt       TEXT NOT NULL DEFAULT '',
  content       TEXT NOT NULL DEFAULT '',
  cover_image   TEXT,
  category      TEXT NOT NULL DEFAULT 'Статья',
  reading_time  INTEGER NOT NULL DEFAULT 5,
  published     BOOLEAN NOT NULL DEFAULT false,
  published_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (site_id, slug)
);

-- Public read access for published posts
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read published posts"
  ON blog_posts FOR SELECT
  USING (published = true);

-- Index for fast slug lookups
CREATE INDEX IF NOT EXISTS blog_posts_site_slug_idx ON blog_posts (site_id, slug);
CREATE INDEX IF NOT EXISTS blog_posts_published_at_idx ON blog_posts (published_at DESC) WHERE published = true;
