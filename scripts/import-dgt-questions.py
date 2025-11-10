#!/usr/bin/env python3
"""
Скрипт для импорта вопросов DGT из JSON файлов в Supabase
"""

import json
import os
from pathlib import Path
from supabase import create_client, Client
from dotenv import load_dotenv

# Загружаем переменные окружения
load_dotenv()

# Настройки Supabase
SUPABASE_URL = os.getenv('VITE_SUPABASE_URL')
SUPABASE_KEY = os.getenv('VITE_SUPABASE_ANON_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Ошибка: Не найдены переменные VITE_SUPABASE_URL или VITE_SUPABASE_ANON_KEY")
    print("Создайте файл .env с этими переменными")
    exit(1)

# Создаем клиент Supabase
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Путь к данным
DATA_DIR = Path(__file__).parent.parent / 'data'

# Маппинг файлов и категорий
FILES = {
    'A1': 'data_A1.json',
    'B': 'data_B.json',
    'D': 'data_D.json'
}

def parse_correct_answer(correct_string: str) -> str:
    """
    Преобразует строку вида "1 0 0" в букву ответа (a, b, c)
    """
    parts = correct_string.strip().split()
    if len(parts) != 3:
        print(f"⚠️  Неверный формат ответа: {correct_string}")
        return 'a'  # По умолчанию
    
    if parts[0] == '1':
        return 'a'
    elif parts[1] == '1':
        return 'b'
    elif parts[2] == '1':
        return 'c'
    else:
        print(f"⚠️  Не найден правильный ответ: {correct_string}")
        return 'a'

def import_questions(category: str, filepath: Path) -> int:
    """
    Импортирует вопросы из JSON файла в Supabase
    """
    print(f"\n📚 Импорт вопросов категории {category}...")
    print(f"   Файл: {filepath}")
    
    if not filepath.exists():
        print(f"❌ Файл не найден: {filepath}")
        return 0
    
    # Читаем JSON файл
    with open(filepath, 'r', encoding='utf-8') as f:
        questions = json.load(f)
    
    print(f"   Найдено вопросов: {len(questions)}")
    
    # Подготавливаем данные для вставки
    records = []
    for idx, q in enumerate(questions, 1):
        try:
            record = {
                'category': category,
                'question_es': q.get('question', '').strip(),
                'option_a_es': q.get('a.', '').strip(),
                'option_b_es': q.get('b.', '').strip(),
                'option_c_es': q.get('c.', '').strip(),
                'correct_answer': parse_correct_answer(q.get('correct', '1 0 0')),
                'explanation_es': q.get('explanation', '').strip() if q.get('explanation') else None,
                'image_filename': q.get('img', '').strip() if q.get('img') else None,
                'source': 'anki-carnet-conducir'
            }
            
            # Проверяем обязательные поля
            if not record['question_es'] or not record['option_a_es']:
                print(f"⚠️  Пропущен вопрос {idx}: отсутствуют обязательные поля")
                continue
            
            records.append(record)
            
        except Exception as e:
            print(f"⚠️  Ошибка обработки вопроса {idx}: {str(e)}")
            continue
    
    print(f"   Подготовлено для импорта: {len(records)}")
    
    # Импортируем батчами по 100 записей
    batch_size = 100
    imported = 0
    errors = 0
    
    for i in range(0, len(records), batch_size):
        batch = records[i:i + batch_size]
        try:
            result = supabase.table('dgt_questions').insert(batch).execute()
            imported += len(batch)
            print(f"   ✅ Импортировано: {imported}/{len(records)}", end='\r')
        except Exception as e:
            errors += len(batch)
            print(f"\n   ❌ Ошибка импорта батча {i//batch_size + 1}: {str(e)}")
    
    print(f"\n   ✅ Импорт завершен: {imported} успешно, {errors} ошибок")
    return imported

def clear_existing_data():
    """
    Очищает существующие данные DGT вопросов
    """
    print("\n🗑️  Очистка существующих данных...")
    try:
        # Удаляем все записи
        supabase.table('dgt_questions').delete().neq('id', '00000000-0000-0000-0000-000000000000').execute()
        print("   ✅ Данные очищены")
        return True
    except Exception as e:
        print(f"   ⚠️  Ошибка очистки: {str(e)}")
        return False

def main():
    """
    Основная функция импорта
    """
    print("=" * 60)
    print("🚗 ИМПОРТ ВОПРОСОВ DGT В SUPABASE")
    print("=" * 60)
    
    # Проверяем подключение
    try:
        result = supabase.table('dgt_questions').select('id').limit(1).execute()
        print("✅ Подключение к Supabase установлено")
    except Exception as e:
        print(f"❌ Ошибка подключения к Supabase: {str(e)}")
        exit(1)
    
    # Спрашиваем, нужно ли очистить существующие данные
    response = input("\n❓ Очистить существующие данные перед импортом? (y/n): ").lower()
    if response == 'y':
        clear_existing_data()
    
    # Импортируем данные для каждой категории
    total_imported = 0
    for category, filename in FILES.items():
        filepath = DATA_DIR / filename
        imported = import_questions(category, filepath)
        total_imported += imported
    
    print("\n" + "=" * 60)
    print(f"✅ ИМПОРТ ЗАВЕРШЕН")
    print(f"   Всего импортировано: {total_imported} вопросов")
    print("=" * 60)
    
    # Показываем статистику
    print("\n📊 Статистика по категориям:")
    for category in FILES.keys():
        try:
            result = supabase.table('dgt_questions').select('id', count='exact').eq('category', category).execute()
            count = result.count if hasattr(result, 'count') else len(result.data)
            print(f"   {category}: {count} вопросов")
        except Exception as e:
            print(f"   {category}: ошибка получения статистики")

if __name__ == '__main__':
    main()

