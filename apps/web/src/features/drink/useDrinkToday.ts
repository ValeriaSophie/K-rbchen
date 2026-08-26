import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { qk } from '../../lib/queryKeys';

// Today's drink status for one pupp in a Körbchen.
export function useDrinkToday(koerbchenId: string, userId: string) {
  return useQuery({
    queryKey: qk.drinkToday(koerbchenId, userId),
    queryFn: () => api.drinkToday(koerbchenId, userId),
  });
}
