const { createClient } = require('@supabase/supabase-js')
const supabase = createClient('https://yffjnqegeiorunyvcxkn.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmZmpucWVnZWlvcnVueXZjeGtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjUwNDIxNiwiZXhwIjoyMDc4MDgwMjE2fQ.Sfw_uZk-vpBjcfulE-0SJwQr0bhZdRv5RElT89Fe8Nw')

async function run() {
  const posts = [
    {
      slug: 'ekonomichnoe-vozhdenie',
      title: 'Экономичное вождение: 13 техник для снижения расхода на 20–30%',
      excerpt: 'Многие водители сливают деньги через педаль газа. Разбираем экономичную езду, мифы про нейтраль и то, почему это важно для экзамена DGT.',
      content: '<p>Интерактивная статья с тестом DGT</p>',
      cover_image: '/assets/blog/ekonomichnoe-vozhdenie.jpg',
      published_at: '2025-04-01T10:00:00Z',
      category: 'Подготовка',
      reading_time: 9,
      published: true,
      site_id: 'sdadim'
    },
    {
      slug: 'poddelnyye-prava-ispaniya',
      title: 'Поддельные права в Испании: тюрьма, штрафы и легальный путь',
      excerpt: 'Что грозит за покупку фейковых прав в Испании в 2026 году? Огромные штрафы до 24 месяцев, срок до 3 лет и отказ страховой. Как сдать легально.',
      content: '<p>Детальный разбор последствий езды с поддельными правами</p>',
      cover_image: '/assets/blog/poddelnyye-prava-ispaniya.jpg',
      published_at: '2025-04-02T10:00:00Z',
      category: 'Документы',
      reading_time: 7,
      published: true,
      site_id: 'sdadim'
    }
  ]
  
  for (const post of posts) {
     const { data: existing } = await supabase.from('blog_posts').select('id').eq('slug', post.slug)
     if (existing && existing.length > 0) {
        const { error } = await supabase.from('blog_posts').update(post).eq('id', existing[0].id)
        if (error) console.error("Update err:", error)
        else console.log("Updated", post.slug)
     } else {
        const { error } = await supabase.from('blog_posts').insert(post)
        if (error) console.error("Insert err:", error)
        else console.log("Inserted", post.slug)
     }
  }
}
run()
