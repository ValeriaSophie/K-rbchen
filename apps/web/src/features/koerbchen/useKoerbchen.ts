import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { qk } from '../../lib/queryKeys';

export function useKoerbchen(id: string | null) {
  return useQuery({
    queryKey: id ? qk.koerbchen(id) : ['koerbchen', 'none'],
    queryFn: () => api.getKoerbchen(id as string),
    enabled: !!id,
  });
}
