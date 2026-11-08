import { useCallback, useEffect, useRef, useState } from 'react';
import { EMPTY_META, errorStatus, errorText, store } from '@/lib/data';
import type { Meta } from '@/lib/data';
import type { Item } from '@/lib/model';

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error' | 'forbidden' | 'unauthorized';

/** 配置快照（items + 域/组统计）。页面只依赖这一层，不直接碰 store。 */
export function useConfigStore(enabled: boolean) {
  const [items, setItems] = useState<Item[]>([]);
  const [meta, setMeta] = useState<Meta>(EMPTY_META);
  const [status, setStatus] = useState<LoadStatus>('idle');
  /** 条目的单独进度：外壳已是 ready 时，域/组页据此显示自己的 loading。 */
  const [itemsStatus, setItemsStatus] = useState<LoadStatus>('idle');
  const [error, setError] = useState('');
  const generation = useRef(0);

  const load = useCallback(async (silent = false) => {
    const run = generation.current + 1;
    generation.current = run;
    if (!silent) {
      setStatus('loading');
      setItemsStatus('idle');
    }
    // 阶段一：聚合（1 次请求）→ 外壳/概览/导航即可渲染
    try {
      const nextMeta = await store.loadMeta();
      if (run !== generation.current) return;
      setMeta(nextMeta);
      setError('');
      setStatus('ready');
    } catch (err) {
      if (run !== generation.current) return;
      const code = errorStatus(err);
      setError(errorText(err));
      setStatus(code === 401 ? 'unauthorized' : code === 403 ? 'forbidden' : 'error');
      return;
    }
    // 阶段二：全量条目（21 页 × ~1s，后台补）
    setItemsStatus('loading');
    try {
      const nextItems = await store.loadItems();
      if (run !== generation.current) return;
      setItems(nextItems);
      // 服务名只能由条目推导：条目到位后回填 meta，避免侧栏/概览一直显示 0。
      const services = Array.from(new Set(nextItems.filter((item) => item.s).map((item) => item.s))).sort();
      setMeta((prev) => ({ ...prev, services }));
      setItemsStatus('ready');
    } catch (err) {
      if (run !== generation.current) return;
      setItemsStatus(errorStatus(err) === 403 ? 'forbidden' : 'error');
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void load();
  }, [enabled, load]);

  const reset = useCallback(async () => {
    store.reset();
    await load(true);
  }, [load]);

  /**
   * 按域快速取数：服务端支持 `?domain=`，482 条只要 5 页（~1s），
   * 不用等 21 页的全量。结果并入 items，域/组页据此立即出表。
   */
  const domainCache = useRef(new Map<string, Item[]>());
  const [domainState, setDomainState] = useState<Record<string, LoadStatus>>({});
  const [domainRev, setDomainRev] = useState(0);

  const ensureDomain = useCallback(async (domain: string) => {
    if (!domain || domainCache.current.has(domain)) return;
    setDomainState((prev) => ({ ...prev, [domain]: 'loading' }));
    try {
      const rows = await store.loadDomainItems(domain);
      domainCache.current.set(domain, rows);
      const seen = new Set<string>();
      setItems((prev) => {
        const merged: Item[] = [];
        for (const item of prev) {
          const key = `${item.s}|${item.k}`;
          seen.add(key);
          merged.push(item);
        }
        for (const item of rows) {
          const key = `${item.s}|${item.k}`;
          if (!seen.has(key)) {
            seen.add(key);
            merged.push(item);
          }
        }
        return merged;
      });
      setDomainState((prev) => ({ ...prev, [domain]: 'ready' }));
      setDomainRev((v) => v + 1);
    } catch (err) {
      setDomainState((prev) => ({ ...prev, [domain]: errorStatus(err) === 403 ? 'forbidden' : 'error' }));
    }
  }, []);

  const domainStatus = useCallback((domain: string): LoadStatus => domainState[domain] ?? 'idle', [domainState]);

  return { items, meta, status, itemsStatus, error, load, reset, setItems, setMeta, ensureDomain, domainStatus, domainRev };
}
