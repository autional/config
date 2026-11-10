import { describe, expect, it } from 'vitest';
import raw from '../data/inventory.json';
import {
  DOMAIN_I18N,
  GROUP_I18N,
  localizeDomainDesc,
  localizeDomainName,
  localizeGroupName,
} from './taxonomy-i18n';

type Row = { d?: string; g?: string };
const rows: Row[] = Array.isArray(raw) ? (raw as Row[]) : ((raw as { items?: Row[] }).items ?? []);

const domains = new Set(rows.map((r) => r.d).filter((v): v is string => !!v));
const groups = new Set(rows.map((r) => r.g).filter((v): v is string => !!v));
const CJK = /[\u4e00-\u9fff]/;

describe('taxonomy i18n 覆盖率', () => {
  it('每个配置域都有英译', () => {
    const missing = [...domains].filter((name) => !DOMAIN_I18N[name]);
    expect(missing).toEqual([]);
  });

  it('每个含中文的配置组都有英译', () => {
    const missing = [...groups].filter((name) => CJK.test(name) && !GROUP_I18N[name]);
    expect(missing).toEqual([]);
  });

  it('包含后端兜底域「其他」的英译', () => {
    // service-config/grouping.DefaultDomain = 「其他」：生产上未命中的键会形成第 14 个域。
    expect(localizeDomainName('其他', 'en-US')).toBe('Other');
  });

  it('英文名不含中文', () => {
    const bad = [
      ...Object.entries(DOMAIN_I18N).filter(([, v]) => CJK.test(v.name) || CJK.test(v.desc)),
      ...Object.entries(GROUP_I18N).filter(([, v]) => CJK.test(v)),
    ];
    expect(bad).toEqual([]);
  });
});

describe('localize helpers', () => {
  it('中文原样返回，英文用映射', () => {
    expect(localizeDomainName('数据库', 'zh-CN')).toBe('数据库');
    expect(localizeDomainName('数据库', 'en-US')).toBe('Database');
    expect(localizeGroupName('GORM 行为', 'zh-CN')).toBe('GORM 行为');
    expect(localizeGroupName('GORM 行为', 'en-US')).toBe('GORM Behavior');
  });

  it('描述：en 用映射，zh 用原描述', () => {
    expect(localizeDomainDesc('数据库', '端点', 'zh-CN')).toBe('端点');
    expect(localizeDomainDesc('数据库', '端点', 'en-US')).toContain('Secret Center');
  });

  it('未登记的名字回退原名（不丢内容）', () => {
    expect(localizeGroupName('未登记组', 'en-US')).toBe('未登记组');
    expect(localizeDomainName('PostgreSQL', 'en-US')).toBe('PostgreSQL');
  });
});
