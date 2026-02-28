import { useEffect, useState } from 'react';
import { useOfflineCache } from './useOfflineCache';

/**
 * Hook que integra cache offline com queries tRPC
 * Retorna dados do cache quando offline, e atualiza cache quando online
 */
export const useOfflineData = <T,>(
  key: string,
  fetchedData: T | undefined,
  isLoading: boolean,
  cacheDurationMs: number = 24 * 60 * 60 * 1000 // 24 horas por padrão
) => {
  const { isOnline, set, get } = useOfflineCache();
  const [cachedData, setCachedData] = useState<T | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);

  // Carregar dados do cache ao montar
  useEffect(() => {
    const loadFromCache = async () => {
      const cached = await get<T>(key);
      if (cached) {
        setCachedData(cached);
        setIsFromCache(true);
      }
    };

    loadFromCache();
  }, [key, get]);

  // Atualizar cache quando dados são fetched
  useEffect(() => {
    if (fetchedData && !isLoading && isOnline) {
      set(key, fetchedData, cacheDurationMs);
      setCachedData(fetchedData);
      setIsFromCache(false);
    }
  }, [fetchedData, isLoading, isOnline, key, set, cacheDurationMs]);

  // Usar dados fetched se disponíveis, senão usar cache
  const data = fetchedData ?? cachedData;

  return {
    data,
    isFromCache,
    isOnline,
  };
};
