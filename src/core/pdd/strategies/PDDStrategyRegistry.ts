/**
 * Registry для стратегий работы с данными ПДД
 * Централизованная точка доступа к стратегиям для разных стран
 */

import { CountryCode } from '@/types/pdd';
import { PDDDataStrategy } from '../PDDDataStrategy';
import { RussiaLegacyStrategy } from './RussiaLegacyStrategy';

/**
 * Реестр стратегий
 * Каждая страна имеет свою стратегию получения данных
 */
class PDDStrategyRegistry {
  private strategies: Map<CountryCode, PDDDataStrategy> = new Map();

  constructor() {
    // Регистрируем существующие стратегии
    this.register('russia', new RussiaLegacyStrategy());
    // TODO: Добавить SpainStrategy когда будет готова
    // this.register('spain', new SpainStrategy());
  }

  /**
   * Зарегистрировать стратегию для страны
   */
  register(country: CountryCode, strategy: PDDDataStrategy): void {
    this.strategies.set(country, strategy);
  }

  /**
   * Получить стратегию для страны
   */
  getStrategy(country: CountryCode): PDDDataStrategy {
    const strategy = this.strategies.get(country);
    
    if (!strategy) {
      // Fallback на стратегию России, если стратегия не найдена
      console.warn(`[PDDStrategyRegistry] Strategy not found for country: ${country}, using Russia as fallback`);
      return this.strategies.get('russia')!;
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

