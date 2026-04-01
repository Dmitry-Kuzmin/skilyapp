const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://yffjnqegeiorunyvcxkn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmZmpucWVnZWlvcnVueXZjeGtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjUwNDIxNiwiZXhwIjoyMDc4MDgwMjE2fQ.Sfw_uZk-vpBjcfulE-0SJwQr0bhZdRv5RElT89Fe8Nw';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const post = {
    slug: 'tseny-na-prava',
    title: 'Сколько реально стоят водительские права в Испании в 2026 году?',
    excerpt: 'Полный разбор цен на получение водительских прав в Испании в 2026 году. Интерактивный калькулятор расходов с учетом пошлин, Tasa DGT и пересдач.',
    content: '<p>Расчет цен и затрат на права в Испании.</p>',
    cover_image: '/assets/blog/tseny-na-prava.jpg',
    published_at: '2025-04-05T10:00:00Z',
    category: 'Финансы',
    reading_time: 8,
    published: true,
    site_id: 'sdadim'
  };
  
  const { data: existing } = await supabase.from('blog_posts').select('id').eq('slug', post.slug);
  
  if (existing && existing.length > 0) {
    const { error } = await supabase.from('blog_posts').update(post).eq('id', existing[0].id);
    if (error) console.error("Update err:", error);
    else console.log("Updated", post.slug);
  } else {
    const { error } = await supabase.from('blog_posts').insert(post);
    if (error) console.error("Insert err:", error);
    else console.log("Inserted", post.slug);
  }
}

run();
