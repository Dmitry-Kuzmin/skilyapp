const { createClient } = require('@supabase/supabase-js');

// Using the service key we found earlier in the env file
const supabaseUrl = 'https://yffjnqegeiorunyvcxkn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmZmpucWVnZWlvcnVueXZjeGtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjUwNDIxNiwiZXhwIjoyMDc4MDgwMjE2fQ.Sfw_uZk-vpBjcfulE-0SJwQr0bhZdRv5RElT89Fe8Nw';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const post = {
    slug: 'slovar-dgt',
    title: 'Испанский словарик будущего водителя: термины DGT',
    excerpt: 'Интерактивные карточки с испанскими терминами, которые используются инструкторами и на экзаменах в Испании. Выучи язык дороги.',
    content: '<p>Интерактивный словарь терминов DGT.</p>',
    cover_image: '/assets/blog/slovar-dgt.jpg',
    published_at: '2025-04-04T10:00:00Z',
    category: 'Документы',
    reading_time: 5,
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
