import { useState } from 'react';
import type { ReactNode } from 'react';
import { Input } from 'antd';
import { Modal } from '@autional/ui/antd';
import { useTranslation } from 'react-i18next';

/** 写操作「变更原因」：后端要求 1–200 字，并写入审计。 */
export function ReasonModal(props: {
  title: string;
  description: ReactNode;
  confirmText: string;
  danger?: boolean;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  const trimmed = reason.trim();
  const invalid = trimmed.length === 0 || trimmed.length > 200;

  return (
    <Modal
      open
      title={`${props.title} · ${t('reason.title')}`}
      okText={props.confirmText}
      cancelText={t('common.cancel')}
      okButtonProps={{ danger: props.danger, disabled: invalid, loading: props.busy }}
      onCancel={props.onCancel}
      onOk={() => {
        if (!invalid) props.onConfirm(trimmed);
      }}
      destroyOnHidden
    >
      {props.description}
      {/* 不用 autoFocus：jsx-a11y/no-autofocus 会拦（抢焦点、键盘用户失去上下文）；
          Modal 打开时本身会把焦点移进对话框。 */}
      <Input.TextArea
        rows={3}
        maxLength={200}
        showCount
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        placeholder={t('reason.placeholder')}
      />
    </Modal>
  );
}
