import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Input, Select } from 'antd';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/page-header';
import { DataTable } from '@autional/ui/antd';
import { PageSection } from '@/components/page-section';
import { DATA_MODE } from '@/lib/config';
import { errorText } from '@/lib/data';
import { listAuditLogs } from '@/lib/api';
import type { AuditLogItem } from '@/lib/api';

const ACTIONS = [
  'admin_reveal',
  'admin_create_changeset',
  'admin_publish_changeset',
  'admin_reject_changeset',
  'admin_upsert',
  'admin_delete',
  'admin_rollback',
  'admin_import',
];

const PAGE_SIZE = 20;

function metaText(row: AuditLogItem, key: string): string {
  const value = row.metadata?.[key];
  return typeof value === 'string' && value ? value : '—';
}

/** 配置中心审计：查看 admin_reveal（查看明文）等管理面操作。 */
export default function AuditPage() {
  const { t } = useTranslation();
  const [tenantId, setTenantId] = useState('_system');
  const [action, setAction] = useState('admin_reveal');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<AuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (DATA_MODE !== 'api') return;
    setLoading(true);
    setError('');
    try {
      const res = await listAuditLogs({ tenantId, action, page, pageSize: PAGE_SIZE });
      const items = res.items ?? res.data?.items ?? [];
      setRows(items);
      setTotal(res.total ?? res.data?.total ?? items.length);
    } catch (err) {
      setError(errorText(err));
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [tenantId, action, page]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <PageHeader title={t('audit.title')} description={t('audit.description')} />

      {DATA_MODE !== 'api' ? (
        <Alert type="info" showIcon className="mb-3" title={t('audit.mock')} />
      ) : null}
      {error ? <Alert type="error" showIcon className="mb-3" title={error} /> : null}

      <PageSection>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <Input
            value={tenantId}
            onChange={(event) => {
              setTenantId(event.target.value);
              setPage(1);
            }}
            prefix={<span className="pr-2 text-[var(--color-text-secondary)]">{t('audit.tenant')}</span>}
            placeholder="_system"
            className="max-w-[360px]"
          />
          <Select
            value={action}
            onChange={(value) => {
              setAction(value);
              setPage(1);
            }}
            className="min-w-[220px]"
            options={[
              { value: 'all', label: t('audit.allActions') },
              ...ACTIONS.map((value) => ({ value, label: value })),
            ]}
          />
          <Button onClick={() => void load()} loading={loading}>
            {t('audit.refresh')}
          </Button>
        </div>

        <DataTable
          size="small"
          rowKey="id"
          loading={loading}
          dataSource={rows}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total,
            showSizeChanger: false,
            onChange: setPage,
          }}
          columns={[
            {
              title: t('audit.time'),
              dataIndex: 'timestamp',
              width: 180,
              render: (value?: number) =>
                value ? new Date(value * 1000).toLocaleString() : '—',
            },
            { title: t('audit.action'), dataIndex: 'action', width: 190 },
            {
              title: t('audit.service'),
              width: 150,
              render: (_: unknown, row: AuditLogItem) => metaText(row, 'service_name'),
            },
            {
              title: t('audit.key'),
              width: 220,
              render: (_: unknown, row: AuditLogItem) => metaText(row, 'key'),
            },
            {
              title: t('audit.reason'),
              render: (_: unknown, row: AuditLogItem) => metaText(row, 'reason'),
            },
            {
              title: t('audit.operator'),
              width: 180,
              render: (_: unknown, row: AuditLogItem) => row.operator_id ?? '—',
            },
          ]}
          locale={{ emptyText: t('audit.empty') }}
        />
      </PageSection>
    </>
  );
}
