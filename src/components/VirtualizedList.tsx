/**
 * Виртуализированный список для оптимизации рендеринга длинных списков
 * Использует react-window для рендеринга только видимых элементов
 */

import { FixedSizeGrid, FixedSizeList, ListChildComponentProps, GridChildComponentProps } from 'react-window';
import { memo, ReactNode } from 'react';

interface VirtualizedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  itemHeight?: number;
  height?: number;
  overscanCount?: number;
  className?: string;
}

interface VirtualizedGridProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  itemHeight?: number;
  itemWidth?: number;
  columnCount?: number;
  height?: number;
  overscanCount?: number;
  className?: string;
}

/**
 * Виртуализированный список (вертикальный)
 * Используется для списков с одним столбцом
 */
export function VirtualizedList<T>({
  items,
  renderItem,
  itemHeight = 100,
  height = 400,
  overscanCount = 5,
  className = '',
}: VirtualizedListProps<T>) {
  const Row = memo(({ index, style }: ListChildComponentProps) => {
    const item = items[index];
    if (!item) return null;
    
    return (
      <div style={style}>
        {renderItem(item, index)}
      </div>
    );
  });

  Row.displayName = 'Row';

  if (items.length === 0) {
    return null;
  }

  return (
    <FixedSizeList
      height={height}
      itemCount={items.length}
      itemSize={itemHeight}
      overscanCount={overscanCount}
      className={className}
    >
      {Row}
    </FixedSizeList>
  );
}

/**
 * Виртуализированная сетка (многоколоночная)
 * Используется для grid layouts (RoadSigns, Dictionary)
 */
export function VirtualizedGrid<T>({
  items,
  renderItem,
  itemHeight = 200,
  itemWidth = 200,
  columnCount = 4,
  height = 600,
  overscanCount = 5,
  className = '',
}: VirtualizedGridProps<T>) {
  const Cell = memo(({ columnIndex, rowIndex, style }: GridChildComponentProps) => {
    const index = rowIndex * columnCount + columnIndex;
    const item = items[index];
    
    if (!item) return null;
    
    return (
      <div style={style}>
        {renderItem(item, index)}
      </div>
    );
  });

  Cell.displayName = 'Cell';

  const rowCount = Math.ceil(items.length / columnCount);

  if (items.length === 0) {
    return null;
  }

  return (
    <FixedSizeGrid
      columnCount={columnCount}
      columnWidth={itemWidth}
      height={height}
      rowCount={rowCount}
      rowHeight={itemHeight}
      width={columnCount * itemWidth}
      overscanCount={overscanCount}
      className={className}
    >
      {Cell}
    </FixedSizeGrid>
  );
}

