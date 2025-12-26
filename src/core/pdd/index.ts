/**
 * Public API для работы с ПДД данными
 */

export type { PDDDataStrategy } from './PDDDataStrategy';
export { getPDDStrategy, pddStrategyRegistry } from './strategies/PDDStrategyRegistry';
export { RussiaUnifiedStrategy } from './strategies/RussiaUnifiedStrategy';
export { RussiaLegacyStrategy } from './strategies/RussiaLegacyStrategy';
export { DefaultCountryStrategy } from './strategies/DefaultCountryStrategy';

