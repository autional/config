import { App, Button, Card, Popconfirm, Space, Statistic, Tag, Tooltip } from 'antd';
import { RotateCcw } from 'lucide-react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/page-header';
import { PageSection } from '@/components/page-section';
import { store } from '@/lib/data';
import { useConfigData } from './config-data';
import { TransferActions } from '@/components/transfer-actions';
import { localizeDomainDesc, localizeDomainName, localizeGroupName } from '@/lib/taxonomy-i18n';

export default function OverviewPage() {
  const { t, i18n } = useTranslation();
  const { message } = App.useApp();
  const { meta, reload, reset, itemsStatus } = useConfigData();

  const groups = meta.domains.reduce((n, domain) => n + domain.groups.length, 0);
  const stats: { key: string; label: string; hint: string; value: string | number }[] = [
    { key: 'items', label: t('overview.stat.items'), hint: t('overview.stat.itemsHint'), value: meta.total },
    { key: 'base', label: t('overview.stat.base'), hint: t('overview.stat.baseHint'), value: meta.base },
    { key: 'svc', label: t('overview.stat.svc'), hint: t('overview.stat.svcHint'), value: meta.svc },
    // 服务名只能从条目推导；条目在后台补，未就绪前给「—」而不是错的 0。
    { key: 'services', label: t('overview.stat.services'), hint: t('overview.stat.servicesHint'), value: itemsStatus === 'ready' ? meta.services.length : '—' },
    { key: 'domains', label: t('overview.stat.domains'), hint: t('overview.stat.domainsHint'), value: meta.domains.length },
    { key: 'groups', label: t('overview.stat.groups'), hint: t('overview.stat.groupsHint'), value: groups },
  ];

  return (
    <>
      <PageHeader
        title={t('overview.title')}
        description={t('overview.description')}
        actions={
          <Space size={8} wrap>
            <TransferActions onImported={reload} />
            {store.canReset ? (
              <Popconfirm
                title={t('overview.resetConfirm')}
                description={t('overview.resetHint')}
                onConfirm={async () => {
                  await reset();
                  message.success(t('overview.resetDone'));
                }}
              >
                <Tooltip title={t('overview.reset')}>
                  <Button icon={<RotateCcw size={14} />} aria-label={t('overview.reset')} />
                </Tooltip>
              </Popconfirm>
            ) : null}
          </Space>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {stats.map((item) => (
          <Card key={item.key} size="small">
            <Statistic title={item.label} value={item.value} />
            <div className="mt-1 text-xs text-[var(--color-text-secondary)]">{item.hint}</div>
          </Card>
        ))}
      </div>

      <PageSection title={t('overview.domainsTitle')} className="mb-6">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {meta.domains.map((domain) => {
            const pct = domain.count ? Math.round((domain.base / domain.count) * 100) : 0;
            return (
              <Link
                key={domain.name}
                to={`/domains/${encodeURIComponent(domain.name)}`}
                className="block rounded-lg border border-[var(--color-border-subtle)] p-4 transition-colors hover:bg-[var(--color-bg-muted)]"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold text-white"
                    style={{ background: domain.color }}
                  >
                    {domain.mono}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-[var(--color-text-primary)]">{localizeDomainName(domain.name, i18n.language)}</div>
                    <div className="truncate text-xs text-[var(--color-text-secondary)]">{localizeDomainDesc(domain.name, domain.desc, i18n.language)}</div>
                  </div>
                  <div className="ml-auto text-right">
                    <div className="text-lg font-bold">{domain.count}</div>
                    <div className="text-[10px] text-[var(--color-text-muted)]">{t('overview.itemsUnit')}</div>
                  </div>
                </div>
                <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-[var(--color-bg-muted)]">
                  <span className="bg-[var(--color-primary-600)]" style={{ width: `${pct}%` }} />
                  <span className="bg-[var(--color-primary-200)]" style={{ width: `${100 - pct}%` }} />
                </div>
                <div className="mt-2 flex gap-3 text-xs text-[var(--color-text-secondary)]">
                  <span>{t('overview.baseCount', { count: domain.base })}</span>
                  <span>{t('overview.svcCount', { count: domain.svc })}</span>
                  <span>{t('overview.groupCount', { count: domain.groups.length })}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {domain.groups.slice(0, 3).map((group) => (
                    <Tag key={group.name} className="!mr-0">
                      {localizeGroupName(group.name, i18n.language)} {group.count}
                    </Tag>
                  ))}
                </div>
              </Link>
            );
          })}
        </div>
      </PageSection>


      <PageSection title={t('overview.structureTitle')}>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-[var(--color-text-secondary)]">
          <li>{t('overview.structure.domain')}</li>
          <li>{t('overview.structure.group')}</li>
          <li>{t('overview.structure.item')}</li>
          <li>{t('overview.structure.effective')}</li>
        </ol>
      </PageSection>
    </>
  );
}
