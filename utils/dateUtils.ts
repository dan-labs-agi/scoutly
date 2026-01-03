import { Timeframe } from '../types';

export const getFormattedDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export const getRelativeDateRange = (timeframe: Timeframe): { start: string, end: string, label: string } => {
  const end = new Date();
  const start = new Date();

  // Reset hours to ensure full day coverage
  end.setHours(23, 59, 59, 999);
  start.setHours(0, 0, 0, 0);

  switch (timeframe) {
    case 'today':
      // Start is already today 00:00
      return {
        start: getFormattedDate(start),
        end: getFormattedDate(end),
        label: 'Today'
      };
    case 'yesterday':
      start.setDate(start.getDate() - 1);
      end.setDate(end.getDate() - 1);
      return {
        start: getFormattedDate(start),
        end: getFormattedDate(end),
        label: 'Yesterday'
      };
    case '2_days':
      start.setDate(start.getDate() - 2);
      return {
        start: getFormattedDate(start),
        end: getFormattedDate(end),
        label: 'Last 48 Hours'
      };
    case 'week':
      start.setDate(start.getDate() - 7);
      return {
        start: getFormattedDate(start),
        end: getFormattedDate(end),
        label: 'Last 7 Days'
      };
    case 'month':
      start.setDate(start.getDate() - 30);
      return {
        start: getFormattedDate(start),
        end: getFormattedDate(end),
        label: 'Last 30 Days'
      };
    case 'quarter':
      start.setDate(start.getDate() - 90);
      return {
        start: getFormattedDate(start),
        end: getFormattedDate(end),
        label: 'Last Quarter'
      };
    default:
      start.setDate(start.getDate() - 14);
      return {
        start: getFormattedDate(start),
        end: getFormattedDate(end),
        label: 'Recent'
      };
  }
};