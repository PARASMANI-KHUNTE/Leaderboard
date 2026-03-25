import { useMemo } from 'react';
import { useAuth } from '../providers/AuthProvider';
import { createHttpClient } from './http';

export function useApi() {
  const { token } = useAuth();

  return useMemo(() => {
    return createHttpClient(token);
  }, [token]);
}

