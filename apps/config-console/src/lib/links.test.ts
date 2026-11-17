/**
 * links.ts 单测（纯逻辑，无渲染）：
 *   - 区域跟随站点域名后缀：`.cn` → secret.autional.cn，其余（含本地/预览）→ secret.autional.com；
 *   - `VITE_SECRET_CENTER_URL` 非空时优先，且去掉尾斜杠；
 *   - 深链只带**密钥名**，`key` 做 URL 编码（键名里可能有空格等字符）。
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

/** 按指定 hostname（null = 无 window，模拟 SSR/Node）重新加载模块，拿到按该站点推导出的常量。 */
async function loadLinks(hostname: string | null) {
  vi.resetModules();
  vi.stubGlobal('window', hostname === null ? undefined : { location: { hostname } });
  return import('./links');
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('SECRET_CENTER_URL', () => {
  it('com 站点（及任意非 .cn 站点）走 secret.autional.com', async () => {
    for (const host of ['config.autional.com', 'localhost', 'config-cn.vercel.app', '127.0.0.1']) {
      const { SECRET_CENTER_URL } = await loadLinks(host);
      expect(SECRET_CENTER_URL, host).toBe('https://secret.autional.com');
    }
  });

  it('cn 站点走 secret.autional.cn', async () => {
    const { SECRET_CENTER_URL } = await loadLinks('config.autional.cn');
    expect(SECRET_CENTER_URL).toBe('https://secret.autional.cn');
  });

  it('VITE_SECRET_CENTER_URL 优先，并去掉尾斜杠', async () => {
    vi.stubEnv('VITE_SECRET_CENTER_URL', 'https://secret.example.com/');
    const { SECRET_CENTER_URL } = await loadLinks('config.autional.cn');
    expect(SECRET_CENTER_URL).toBe('https://secret.example.com');
  });
});

describe('secretCenterUrl', () => {
  it('不带钥匙名时就是站点根（顶栏入口）', async () => {
    const { secretCenterUrl } = await loadLinks('config.autional.com');
    expect(secretCenterUrl()).toBe('https://secret.autional.com');
  });

  it('带密钥名时深链到详情页，且只带键名（编码后）', async () => {
    const { secretCenterUrl } = await loadLinks('config.autional.com');
    expect(secretCenterUrl('jwt.secret')).toBe('https://secret.autional.com/secrets?key=jwt.secret');
    // 键名含空格 / 斜杠时按 URL 编码，不拼接原值
    expect(secretCenterUrl('a b/c')).toBe('https://secret.autional.com/secrets?key=a%20b%2Fc');
  });

  it('cn 站点的深链同域切换', async () => {
    const { secretCenterUrl } = await loadLinks('config.autional.cn');
    expect(secretCenterUrl('EMAIL_PASSWORD')).toBe('https://secret.autional.cn/secrets?key=EMAIL_PASSWORD');
  });
});
