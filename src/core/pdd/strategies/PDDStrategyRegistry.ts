/**
 * Registry для стратегий работы с данными ПДД
 * Централизованная точка доступа к стратегиям для разных стран
 */

import { CountryCode } from '@/types/pdd';
import { PDDDataStrategy } from '../PDDDataStrategy';
import { RussiaUnifiedStrategy } from './RussiaUnifiedStrategy';
// Legacy import kept for fallback if needed:
// import { RussiaLegacyStrategy } from './RussiaLegacyStrategy';
import { DefaultCountryStrategy } from './DefaultCountryStrategy';

/**
 * Реестр стратегий
 * Каждая страна имеет свою стратегию получения данных
 * 
 * Стратегии регистрируются автоматически:
 * - Россия: RussiaUnifiedStrategy (использует unified таблицу questions_new)
 * - Остальные страны: DefaultCountryStrategy (работает с единой таблицей pdd_questions)
 */
class PDDStrategyRegistry {
  private strategies: Map<CountryCode, PDDDataStrategy> = new Map();

  constructor() {
    // РФ - unified стратегия (использует questions_new, country='ru')
    this.register('russia', new RussiaUnifiedStrategy());

    // Остальные страны - стандартные, используют единую таблицу
    // Регистрируются автоматически при первом обращении через getStrategy()
    // Или можно зарегистрировать заранее:
    // this.register('ukraine', new DefaultCountryStrategy('ukraine'));
    // this.register('spain', new DefaultCountryStrategy('spain'));
  }

  /**
   * Зарегистрировать стратегию для страны
   */
  register(country: CountryCode, strategy: PDDDataStrategy): void {
    this.strategies.set(country, strategy);
  }

  /**
   * Получить стратегию для страны
   * Автоматически создает DefaultCountryStrategy для новых стран
   */
  getStrategy(country: CountryCode): PDDDataStrategy {
    let strategy = this.strategies.get(country);

    if (!strategy) {
      // Автоматически создаем DefaultCountryStrategy для новых стран
      // Это позволяет добавлять страны без изменения кода
      console.log(`[PDDStrategyRegistry] Auto-creating DefaultCountryStrategy for: ${country}`);
      strategy = new DefaultCountryStrategy(country);
      this.register(country, strategy);
    }

    return strategy;
  }

  /**
   * Проверить, есть ли стратегия для страны
   */
  hasStrategy(country: CountryCode): boolean {
    return this.strategies.has(country);
  }

  /**
   * Получить список всех зарегистрированных стран
   */
  getRegisteredCountries(): CountryCode[] {
    return Array.from(this.strategies.keys());
  }
}

// Singleton instance
export const pddStrategyRegistry = new PDDStrategyRegistry();

/**
 * Удобная функция для получения стратегии
 */
export function getPDDStrategy(country: CountryCode): PDDDataStrategy {
  return pddStrategyRegistry.getStrategy(country);
}

