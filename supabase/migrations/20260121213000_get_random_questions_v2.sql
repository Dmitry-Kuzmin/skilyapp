-- Функция для получения случайных вопросов (оптимизирована через random())
-- Используется в SpainUnifiedStrategy и других местах где нужен честный рандом
create or replace function get_random_questions(
  country_code text,
  limit_count int
)
returns setof questions_new
language sql
security definer
set search_path = public
as $$
  select *
  from questions_new
  where country = country_code
  order by random()
  limit limit_count;
$$;

-- Grant access to authenticated users
grant execute on function get_random_questions(text, int) to authenticated;
grant execute on function get_random_questions(text, int) to service_role;
