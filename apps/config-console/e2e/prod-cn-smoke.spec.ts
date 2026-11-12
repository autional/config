import { expect, test } from '@playwright/test';

/**
 * 生产 `.cn` 冒烟（一次性核对用，不入 CI）。
 *
 * 目的：确认控制台套件的改动**真的在 .cn 线上生效**（不只是构建成功）：
 *   - 页面能开、无 JS 异常；
 *   - 配置中心/密钥中心的登录页按钮文案是 **OIDC**（今天修的那个文案 bug）；
 *   - 门户切换/导航不炸。
 *
 * 不登录：只用公开可访问的登录页/首页，避免需要账号。
 */

// 默认打 .cn；用 PROD_SUFFIX=com 可核对 .com（两边站点同名）。
const SUFFIX = process.env.PROD_SUFFIX === 'com' ? 'com' : 'cn';
const host = (name: string) => `${name}.autional.${SUFFIX}`;

const SITES = [
	{ host: host('config'), expectOidcLabel: true },
	{ host: host('secret'), expectOidcLabel: true },
	{ host: host('admin'), expectOidcLabel: false },
	{ host: host('platform'), expectOidcLabel: false },
	{ host: host('security'), expectOidcLabel: false },
	{ host: host('user'), expectOidcLabel: false },
];

for (const site of SITES) {
	test(`${site.host} 可访问且无 JS 异常`, async ({ page }) => {
		const errors: string[] = [];
		page.on('pageerror', (err) => errors.push('pageerror: ' + err.message));
		page.on('console', (msg) => {
			if (msg.type() !== 'error') return;
			if (/Failed to load resource/i.test(msg.text())) return; // 无后端的 404/401 属预期
			errors.push(msg.text());
		});

		const res = await page.goto(`https://${site.host}/`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
		expect(res?.status(), 'HTTP 状态').toBeLessThan(400);

		// 等首屏渲染（SPA）
		await page.waitForTimeout(2500);
		const text = (await page.locator('body').innerText()).trim();
		expect(text.length, '首屏应有内容').toBeGreaterThan(30);

		if (site.expectOidcLabel) {
			// 今天的修复：按钮文案按 AUTH_MODE 判断，生产是 oidc ⇒ 文案必须提「Autional 账号」
			expect(text, '登录按钮应为 OIDC 文案').toContain('Autional');
			expect(text, '不应出现演示账号文案').not.toContain('演示账号');
		}

		expect(errors, errors.join(' | ')).toEqual([]);
		console.log(`[${site.host}] OK  text=${text.slice(0, 60).replace(/\s+/g, ' ')}`);
	});
}

/**
 * 点「使用 Autional 账号登录」后应跳到授权端点，且**带齐 PKCE 参数**。
 * 不需要账号：在请求层拦下授权 URL 立即 abort（不提交凭据、不打 IdP 登录页，避免 429）。
 */
for (const site of SITES.filter((x) => x.expectOidcLabel)) {
	test(`${site.host} 登录跳转带 PKCE 参数`, async ({ page }) => {
		let captured = '';
		await page.route('**/oauth/api/v1/oauth/authorize**', async (route) => {
			captured = route.request().url();
			await route.abort();
		});

		await page.goto(`https://${site.host}/`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
		await page.getByRole('button', { name: /Autional/ }).click();

		await expect.poll(() => captured, { timeout: 20_000 }).not.toBe('');
		const url = new URL(captured);

		expect(url.searchParams.get('response_type'), 'response_type').toBe('code');
		expect(url.searchParams.get('code_challenge_method'), 'PKCE method').toBe('S256');
		expect(url.searchParams.get('code_challenge') ?? '', 'code_challenge').toMatch(/^[A-Za-z0-9_-]{43}$/);
		expect(url.searchParams.get('state') ?? '', 'state').not.toBe('');
		expect(url.searchParams.get('nonce') ?? '', 'nonce').not.toBe('');
		expect(url.searchParams.get('redirect_uri'), 'redirect_uri').toBe(`https://${site.host}/oauth/callback`);
		expect(url.searchParams.get('client_id') ?? '', 'client_id').not.toBe('');

		console.log(`[${site.host}] authorize OK  host=${url.host} client_id=${url.searchParams.get('client_id')}`);
	});
}
