import PlayCircleOutlined from "@ant-design/icons/lib/icons/PlayCircleOutlined";
import { Button, InputNumber, Space, Typography } from "antd";

import { useLanguage } from "@/shared/i18n";

interface RunControlsProps {
  seed: number;
  onSeedChange: (seed: number) => void;
  onRun: () => void;
  loading: boolean;
}

export function RunControls({
  seed,
  onSeedChange,
  onRun,
  loading,
}: RunControlsProps) {
  const { t } = useLanguage();

  return (
    <Space direction="vertical" size={8} className="w-full">
      <Typography.Text strong>{t.seedLabel}</Typography.Text>
      <Space.Compact className="w-full">
        <InputNumber
          aria-label={t.seedLabel}
          min={0}
          max={1_000_000}
          precision={0}
          value={seed}
          onChange={(value) => onSeedChange(value ?? 0)}
          className="w-full"
        />
        <Button
          type="primary"
          icon={<PlayCircleOutlined />}
          onClick={onRun}
          loading={loading}
        >
          {t.launch}
        </Button>
      </Space.Compact>
      <Typography.Text type="secondary" className="text-xs">
        {t.seedHelp}
      </Typography.Text>
    </Space>
  );
}
