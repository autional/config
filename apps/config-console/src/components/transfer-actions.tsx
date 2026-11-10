import { useState } from 'react';
import { App, Button, Dropdown, Space } from 'antd';
import { ChevronDown, Download, Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { store } from '@/lib/data';
import { downloadText, exportFilename } from '@/lib/transfer';
import { ImportWizard } from './import-wizard';

/** 导出 JSON/YAML + 导入向导。概览页与配置域页共用同一份实现。
 *
 * 导出收进一个下拉：页头右侧按钮越少，标题/描述在 1024–1280 宽度下越不容易被挤压
 * （设计系统给右侧 `sm:shrink-0`，按钮多时左侧文本会被压到 ~240px）。
 */
export function TransferActions({ onImported }: { onImported?: () => void | Promise<void> }) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [importing, setImporting] = useState(false);

  const doExport = async (format: 'json' | 'yaml') => {
    try {
      const text = await store.exportConfig(format);
      downloadText(exportFilename(format), text, format === 'yaml' ? 'application/yaml' : 'application/json');
      message.success(t('overview.exportDone', { format: format.toUpperCase() }));
    } catch (err) {
      message.error(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <>
      <Space size={8} wrap>
        <Dropdown
          menu={{
            items: [
              { key: 'json', label: 'JSON', onClick: () => void doExport('json') },
              { key: 'yaml', label: 'YAML', onClick: () => void doExport('yaml') },
            ],
          }}
          trigger={['click']}
        >
          <Button icon={<Download size={14} />}>
            {t('common.export')}
            <ChevronDown size={12} className="ml-1" />
          </Button>
        </Dropdown>
        <Button icon={<Upload size={14} />} onClick={() => setImporting(true)}>
          {t('import.title')}
        </Button>
      </Space>
      <ImportWizard open={importing} onClose={() => setImporting(false)} onDone={async () => { await onImported?.(); }} />
    </>
  );
}
