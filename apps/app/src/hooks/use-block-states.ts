import { useState, useCallback } from 'react';
import type { EditUserForm } from '@/components/features/users/types';

export type BlockState = 'idle' | 'saving' | 'success' | 'error';

export function useBlockStates() {
  const [changedBlocks, setChangedBlocks] = useState<Set<string>>(new Set());
  const [originalForm, setOriginalForm] = useState<EditUserForm | null>(null);
  const [blockStates, setBlockStates] = useState<Record<string, BlockState>>({});
  const [animatedBlocks, setAnimatedBlocks] = useState<Set<string>>(new Set());

  // Функции для отслеживания изменений в блоках
  const trackBlockChange = useCallback((blockName: string, fieldName: string, value: any) => {
    if (!originalForm) return;
    
    const originalValue = originalForm[fieldName as keyof EditUserForm];
    const currentValue = originalForm[fieldName as keyof EditUserForm];
    
    setChangedBlocks(prev => {
      const newSet = new Set(prev);
      if (originalValue !== currentValue) {
        newSet.add(blockName);
      } else {
        // Проверим, есть ли другие изменения в этом блоке
        const hasOtherChanges = checkBlockChanges(blockName);
        if (!hasOtherChanges) {
          newSet.delete(blockName);
        }
      }
      return newSet;
    });
  }, [originalForm]);

  const checkBlockChanges = useCallback((blockName: string): boolean => {
    if (!originalForm) return false;
    
    const blockFields = getBlockFields(blockName);
    return blockFields.some(field => originalForm[field as keyof EditUserForm] !== originalForm[field as keyof EditUserForm]);
  }, [originalForm]);

  const getBlockFields = (blockName: string): string[] => {
    switch (blockName) {
      case 'basic':
        return ['givenName', 'familyName', 'internalExtensions', 'mobilePhones'];
      case 'telegram':
        return ['telegram_daily_report', 'telegram_manager_report', 'telegram_weekly_report', 'telegram_monthly_report'];
      case 'max':
        return ['max_daily_report', 'max_manager_report'];
      case 'email':
        return ['email', 'email_daily_report', 'email_weekly_report', 'email_monthly_report'];
      case 'reports':
        return ['report_include_call_summaries', 'report_detailed', 'report_include_avg_value', 'report_include_avg_rating'];
      case 'kpi':
        return ['kpi_base_salary', 'kpi_target_bonus', 'kpi_target_talk_time_minutes'];
      case 'filters':
        return ['filter_exclude_answering_machine', 'filter_min_duration', 'filter_min_replicas'];
      default:
        return [];
    }
  };

  const clearBlockChanges = useCallback((blockName: string) => {
    setChangedBlocks(prev => {
      const newSet = new Set(prev);
      newSet.delete(blockName);
      return newSet;
    });
  }, []);

  // Функции для управления анимациями
  const setBlockState = useCallback((blockName: string, state: BlockState) => {
    setBlockStates(prev => ({ ...prev, [blockName]: state }));
    
    // Добавляем анимацию для success/error состояний
    if (state === 'success' || state === 'error') {
      setAnimatedBlocks(prev => new Set(prev).add(blockName));
      setTimeout(() => {
        setAnimatedBlocks(prev => {
          const newSet = new Set(prev);
          newSet.delete(blockName);
          return newSet;
        });
        setBlockStates(prev => ({ ...prev, [blockName]: 'idle' }));
      }, 2000);
    }
  }, []);

  const getBlockAnimationClass = useCallback((blockName: string) => {
    if (!animatedBlocks.has(blockName)) return '';
    
    const state = blockStates[blockName];
    switch (state) {
      case 'success':
        return 'animate-pulse border-green-200 bg-green-50';
      case 'error':
        return 'animate-pulse border-red-200 bg-red-50';
      case 'saving':
        return 'opacity-75';
      default:
        return '';
    }
  }, [animatedBlocks, blockStates]);

  const initializeForm = useCallback((form: EditUserForm) => {
    setOriginalForm(form);
    setChangedBlocks(new Set());
  }, []);

  const updateOriginalForm = useCallback((form: EditUserForm) => {
    setOriginalForm({ ...form });
  }, []);

  return {
    changedBlocks,
    blockStates,
    trackBlockChange,
    clearBlockChanges,
    setBlockState,
    getBlockAnimationClass,
    initializeForm,
    updateOriginalForm,
    hasBlockChanges: (blockName: string) => changedBlocks.has(blockName),
    getBlockState: (blockName: string) => blockStates[blockName] || 'idle'
  };
}
