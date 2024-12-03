import React, { useState } from 'react';
import { CategoryCardType } from '../../types';
import { useDraggable, DraggableAttributes } from '@dnd-kit/core';
import { formatAmount } from '../../utils/formatUtils';

interface CategoryCardProps {
  category: CategoryCardType;
  onHistoryClick: (e: React.MouseEvent) => void;
  isDragging?: boolean;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({ 
  category, 
  onHistoryClick,
  isDragging = false
}) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: category.id,
    data: category
  });

  const style: React.CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.5 : undefined,
    cursor: 'grab',
    touchAction: 'none'
  };

  return (
    <div
      ref={setNodeRef}
      style={{ ...style }}
      {...attributes}
      {...listeners}
      onClick={onHistoryClick}
      className={`flex flex-col items-center space-y-1 py-1 ${
        isDragging ? 'cursor-grabbing' : 'cursor-grab'
      } touch-none select-none`}
    >
      <div className={`w-12 h-12 ${category.color} rounded-full flex items-center justify-center shadow-lg`}>
        {category.icon}
      </div>
      <div className="text-center">
        <div className="text-[10px] font-medium text-gray-700 truncate max-w-[60px]">
          {category.title}
        </div>
        <div className={`text-[10px] font-medium ${
          category.amount.includes('-') ? 'text-red-500' : 'text-emerald-500'
        }`}>
          {formatAmount(parseFloat(category.amount.replace(/[^\d.-]/g, '')))}
        </div>
      </div>
    </div>
  );
};