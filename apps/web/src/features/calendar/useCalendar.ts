import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { qk } from '../../lib/queryKeys';

// Calendar events (recurrence already expanded server-side) within [from, to].
export function useCalendar(koerbchenId: string, fromISO: string, toISO: string) {
  return useQuery({
    queryKey: qk.calendar(koerbchenId, fromISO, toISO),
    queryFn: () => api.getCalendar(koerbchenId, fromISO, toISO),
  });
}
