import { defineConfig } from '@playwright/test';

/**
 * 生产 `.cn` 冒烟（一次性核对用，不入 CI）。
 * 无 webServer：直接打线上；本机用已安装 Chrome。
 */
export default defineConfig({
	testDir: './e2e',
	testMatch: /prod-cn-smoke\.spec\.ts/,
	timeout: 90_000,
	expect: { timeout: 20_000 },
	fullyParallel: true,
	reporter: 'list',
	use: {
		...(process.env.CI ? {} : { channel: 'chrome' }),
		ignoreHTTPSErrors: false,
	},
});
