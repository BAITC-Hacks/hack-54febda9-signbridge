import ThunderboltOutlined from "@ant-design/icons/lib/icons/ThunderboltOutlined";

import { useLanguage } from "@/shared/i18n";
import { Button, Select, Space } from "antd";

interface StrategyComparisonControlsProps {
  runs: number;
  onRunsChange: (value: number) => void;
  onCompare: () => void;
  loading: boolean;
}

export function StrategyComparisonControls({
  runs,
  onRunsChange,
  onCompare,
  loading,
}: StrategyComparisonControlsProps) {
  const { t } = useLanguage();

  return (
    <Space wrap>
      <Select
        aria-label={t.strategyRunsLabel}
        value={runs}
        onChange={onRunsChange}
        options={[5, 10, 15, 20].map((value) => ({
          value,
          label: `${value} ${t.scenarioUnit}`,
        }))}
        className="min-w-36"
      />
      <Button
        type="primary"
        size="large"
        icon={<ThunderboltOutlined />}
        loading={loading}
        onClick={onCompare}
      >
        {loading ? t.strategyLoading : t.strategyRun}
      </Button>
    </Space>
  );
}
