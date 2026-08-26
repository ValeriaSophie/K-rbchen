import { useQuery } from '@tanstack/react-query';
import type { MeDto } from '@koerbchen/shared';
import { api, ApiError } from '../../lib/api';
import { qk } from '../../lib/queryKeys';

// Current user (or null when not logged in). A 401 is a normal "logged out"
// state, not an error.
export function useMe() {
  return useQuery<MeDto | null>({
    queryKey: qk.me,
    queryFn: async () => {
      try {
        return await api.me();
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) return null;
        throw e;
      }
    },
  });
}
