/**
 * 登录会话：OIDC 授权码 + PKCE（S256，state + nonce）。
 *
 * **实现已统一**：流程在 `@autional/shared/console-auth` 的 `createConsoleAuth`，
 * 本文件只负责「本站的策略与常量」：
 *   - 令牌存 **sessionStorage**（关闭标签页即失效；不写 localStorage，避免长期驻留）；
 *   - 演示会话 = 平台管理员；
 *   - 存储 key 前缀。
 *
 * 与密钥中心共用同一份引擎：任一处流程修复（瞬时故障保活、吊销、声明合并等）
 * 两站同时生效，不会再出现「一边改了另一边没改」的漂移。
 */
import {
  createConsoleAuth,
  type ConsoleSession,
  type ConsoleSessionUser,
} from '@autional/shared/console-auth';
import { APP_ID, AUTH_MODE, OIDC, TENANT_ID } from './config';

export type SessionUser = ConsoleSessionUser;
export type Session = ConsoleSession;

/** 存储 key（含 PKCE 上下文与 mock 退出标记）。 */
const SESSION_KEY = 'config-console:auth:v1';

const auth = createConsoleAuth({
  authMode: AUTH_MODE,
  // 本站策略：令牌只存 sessionStorage（关标签页即失效）
  storage: 'session',
  keys: {
    session: SESSION_KEY,
    pkce: 'config-console:pkce:v1',
    mockSignedOut: 'config-console:auth:signed-out:v1',
  },
  oidc: {
    authorizeUrl: OIDC.authorizeUrl,
    tokenUrl: OIDC.tokenUrl,
    clientId: OIDC.clientId,
    scope: OIDC.scope,
    redirectUri: OIDC.redirectUri,
  },
  /** 演示会话：平台管理员（VITE_AUTH_MODE=mock 默认）。 */
  mockSession: () => ({
    mode: 'mock',
    accessToken: '',
    expiresAt: 0,
    user: {
      sub: 'demo-admin',
      name: '平台管理员',
      email: 'admin@demo.local',
      tenantId: TENANT_ID,
      appId: APP_ID,
      roles: ['super_admin'],
    },
  }),
});

export const mockSession = auth.mockSession;
/** 当前会话（同步读）；过期返回 null。 */
export const currentSession = auth.currentSession;
/** 启动时恢复会话：过期但有 refresh_token 时静默续期。 */
export const restoreSession = auth.restoreSession;
/** 发起登录：mock 直接给演示会话；oidc 生成 PKCE 并跳转授权端点。 */
export const startLogin = auth.startLogin;
/** 处理 `/oauth/callback?code=...&state=...`：校验 state、换票、校验 nonce、落会话。 */
export const completeLogin = auth.completeLogin;
/** 用 refresh_token 续期；单飞（并发 401 / 定时刷新只发一次）。 */
export const refreshSession = auth.refreshSession;
/** 退出登录：吊销令牌（服务端）+ 清本地会话。 */
export const signOut = auth.signOut;
/** 供 api 层调用：401 时尝试静默续期，成功则返回新会话。 */
export const renewAfterUnauthorized = auth.renewAfterUnauthorized;

/** 把用户资料合并进当前会话并落盘（用于 identity 补全展示名）。 */
export function patchSessionUser(patch: Partial<SessionUser>): Session | null {
  return auth.patchUser(patch);
}
