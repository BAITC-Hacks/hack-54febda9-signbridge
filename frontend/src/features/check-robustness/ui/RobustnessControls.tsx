import BarChartOutlined from "@ant-design/icons/lib/icons/BarChartOutlined";
import { Button, InputNumber, Space, Typography } from "antd";

import { useLanguage } from "@/shared/i18n";

interface RobustnessControlsProps {
  runs: number;
  onRunsChange: (runs: number) => void;
  onCheck: () => void;
  loading: boolean;
}

export function RobustnessControls({
  runs,
  onRunsChange,
  onCheck,
  loading,
}: RobustnessControlsProps) {
  const { t } = useLanguage();

  return (
    <Space direction="vertical" size={8} className="w-full">
      <Typography.Text strong>{t.runCount}</Typography.Text>
      <Space.Compact className="w-full">
        <InputNumber
          aria-label={t.runCount}
          min={1}
          max={30}
          precision={0}
          value={runs}
          onChange={(value) => onRunsChange(value ?? 1)}
          className="w-full"
        />
        <Button icon={<BarChartOutlined />} onClick={onCheck} loading={loading}>
          {t.check}
        </Button>
      </Space.Compact>
      <Typography.Text type="secondary" className="text-xs">
        {t.checkHelp}
      </Typography.Text>
    </Space>
  );
}
