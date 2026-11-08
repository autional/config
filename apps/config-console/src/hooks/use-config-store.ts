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

  return { items, meta, status, itemsStatus, error, load, reset, setItems, setMeta };
}
