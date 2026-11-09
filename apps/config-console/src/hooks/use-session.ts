import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { AUTH_MODE, DATA_MODE, REQUIRE_AUTH, isCallbackPath } from '@/lib/config';
import { completeLogin, patchSessionUser, refreshSession, restoreSession, signOut, startLogin } from '@/lib/auth';
import type { Session } from '@/lib/auth';
import { UNAUTHORIZED_EVENT } from '@/lib/api';
import { errorText } from '@/lib/data';
import { resolveProfile } from '@/lib/profile';

type BootResult = { session: Session | null; error: string };

/**
 * 登录态引导：进程内只跑一次（StrictMode 二次挂载 / HMR 不会重复消费授权码）。
 * OIDC 回调页先换票，再把 URL 上的 code/state 清掉（避免刷新重放授权码）。
 */
let bootPromise: Promise<BootResult> | null = null;

function bootstrap(navigate: (to: string, opts?: { replace?: boolean }) => void): Promise<BootResult> {
  if (bootPromise) return bootPromise;
  bootPromise = (async () => {
    try {
      if (AUTH_MODE === 'oidc' && isCallbackPath()) {
        const params = new URLSearchParams(window.location.search);
        // 只有真的带了 code 才换票；直接刷新 /oauth/callback 时不能当成回调
        const oauthError = params.get('error_description') || params.get('error') || '';
        const session = params.get('code') ? await completeLogin(params.toString()) : await restoreSession();
        // 关键：用**路由**离开 /oauth/callback（不是 history.replaceState —— 后者不通知
        // BrowserRouter，路由仍停在回调地址 → 渲染 * 的 404）。刷新也不会再重放授权码。
        navigate('/', { replace: true });
        return { session, error: oauthError };
      }
      return { session: await restoreSession(), error: '' };
    } catch (err) {
      return { session: null, error: errorText(err) };
    }
  })();
  return bootPromise;
}

export function useSession() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    void bootstrap(navigate).then((result) => {
      if (!alive) return;
      setSession(result.session);
      setError(result.error);
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, [navigate]);

  // 主动续期：access token 只有 5 分钟，别等 401 再续（硬刷新时容易撞上，
  // 多个并发请求同时 401 → 多次续期会互相作废）。剩余 < 2 分钟时静默续期。
  useEffect(() => {
    if (!session || AUTH_MODE !== 'oidc') return;
    let alive = true;
    const tick = async () => {
      const expiresAt = session.expiresAt ?? 0;
      if (expiresAt === 0 || expiresAt - Date.now() > 120_000) return;
      const next = await refreshSession();
      if (!alive) return;
      if (!next) {
        // 会话已失效（闲置过期/吊销）：必须切回登录态，否则 UI 还停在控制台，
        // 用户点任何东西才被弹回登录页（体感像"卡住"）。
        setSession(null);
        return;
      }
      setSession((prev) => (prev && prev.accessToken === next.accessToken ? prev : next));
    };
    const timer = window.setInterval(() => void tick(), 60_000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void tick();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive = false;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [session]);

  // 展示名补全：token 里没有 name/email 时，用 identity 资料替换「…XXXXXX」。
  useEffect(() => {
    const user = session?.user;
    if (!session || !user?.sub || !session.accessToken) return;
    if (!user.name.startsWith('…')) return;
    let alive = true;
    void resolveProfile({
      sub: user.sub,
      token: session.accessToken,
      tenantId: user.tenantId,
      appId: user.appId,
    }).then((patch) => {
      if (!alive || !patch) return;
      const next = patchSessionUser(patch);
      if (next) setSession(next);
    });
    return () => {
      alive = false;
    };
  }, [session?.user.sub, session?.accessToken]);

  // 令牌失效（401）：清会话，回到登录态
  useEffect(() => {
    const onUnauthorized = () => {
      void signOut().then(() => setSession(null));
    };
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  const login = useCallback(async () => {
    setError('');
    try {
      const next = await startLogin();
      if (next) setSession(next);
    } catch (err) {
      setError(errorText(err));
    }
  }, []);

  const logout = useCallback(async () => {
    await signOut();
    setSession(null);
  }, []);

  // api 模式必须有 JWT；mock 演示只有显式 REQUIRE_AUTH 才挡
  const needsLogin = !session && (REQUIRE_AUTH || DATA_MODE === 'api');

  return { ready, session, error, needsLogin, login, logout };
}
