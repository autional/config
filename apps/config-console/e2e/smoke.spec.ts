import { expect, test } from '@playwright/test';

type Lang = 'zh-CN' | 'en-US';

const ROUTES: { path: string; zh: string; en: string }[] = [
  { path: '/', zh: '配置中心概览', en: 'Config Console overview' },
  { path: '/domains', zh: '配置域', en: 'Domains' },
  { path: '/changes', zh: '变更记录', en: 'Change log' },
  { path: '/changesets', zh: '变更单', en: 'Change sets' },
  { path: '/audit', zh: '审计日志', en: 'Audit Logs' },
  { path: `/domains/${encodeURIComponent('数据库')}`, zh: '数据库', en: 'Database' },
];

const LANGS: Lang[] = ['zh-CN', 'en-US'];

for (const lang of LANGS) {
  test.describe(`lang=${lang}`, () => {
    for (const route of ROUTES) {
      test(`${route.path} 渲染正确且无控制台错误`, async ({ page }) => {
        const errors: string[] = [];
        page.on('console', (msg) => {
          if (msg.type() === 'error') errors.push(msg.text());
        });
        page.on('pageerror', (err) => errors.push(err.message));

        await page.addInitScript((value) => {
          window.localStorage.setItem('config-console-lang', value);
        }, lang);

        await page.goto(route.path);
        // 标题是页面真正渲染出来的证据（不是 key 占位）。
        await expect(page.locator('h1')).toHaveText(lang === 'zh-CN' ? route.zh : route.en);
        await expect(page.locator('html')).toHaveAttribute('lang', lang);

        const main = page.locator('main');
        const text = await main.innerText();
        expect(text).not.toContain('overview.title');
        expect(text).not.toContain('undefined');

        if (lang === 'en-US') {
          // 英文界面不应再出现中文域/组名（2026-11 中英混排修复的回归护栏）。
          expect(text).not.toContain('数据库');
          expect(text).not.toContain('GORM 行为');
        }

        expect(errors).toEqual([]);
      });
    }
  });
}

test.describe('跨站入口', () => {
  const cases: [Lang, string][] = [
    ['zh-CN', '密钥中心'],
    ['en-US', 'Secret Center'],
  ];
  for (const [lang, label] of cases) {
    test(`${label} 出现在导航（${lang}）`, async ({ page }) => {
      await page.addInitScript((value) => localStorage.setItem('config-console-lang', value), lang);
      await page.goto('/');
      await expect(page.getByRole('menuitem', { name: label })).toBeVisible();
    });
  }
});
