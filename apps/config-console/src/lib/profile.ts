import type { SessionUser } from './auth';

const IDENTITY_USERS = '/bff/identity/api/v1/admin/users';

/**
 * 用 identity 服务补全展示名。
 *
 * IdC 签发的 access/id token 里没有 name/email，顶栏只能回落 sub 尾段（…MDSVNC）。
 * 这里在浏览器侧补一次用户资料；拿不到就保持原样。
 *
 * 刻意**不走** `lib/api` 的 request()：identity 若返回 401，共享层会当作会话失效
 * 触发登出。这里独立 fetch，任何失败一律静默。
 */
export async function resolveProfile(input: {
  sub: string;
  token: string;
  tenantId?: string;
  appId?: string;
}): Promise<Partial<SessionUser> | null> {
  const { sub, token, tenantId, appId } = input;
  if (!sub || !token) return null;
  const headers: Record<string, string> = {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
  };
  if (tenantId) headers['X-Tenant-ID'] = tenantId;
  if (appId) headers['X-App-ID'] = appId;
  try {
    const res = await fetch(`${IDENTITY_USERS}/${encodeURIComponent(sub)}`, {
      headers,
      credentials: 'omit',
    });
    if (!res.ok) return null;
    const body = (await res.json().catch(() => null)) as
      | { data?: { user?: { username?: string; email?: string } } }
      | null;
    const user = body?.data?.user ?? null;
    const username = typeof user?.username === 'string' ? user.username.trim() : '';
    const email = typeof user?.email === 'string' ? user.email.trim() : '';
    if (!username && !email) return null;
    const patch: Partial<SessionUser> = { name: username || email };
    if (email) patch.email = email;
    return patch;
  } catch {
    return null;
  }
}
