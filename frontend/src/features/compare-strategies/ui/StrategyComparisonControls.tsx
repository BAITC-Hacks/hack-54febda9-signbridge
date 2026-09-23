import ThunderboltOutlined from "@ant-design/icons/lib/icons/ThunderboltOutlined";
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
  return (
    <Space wrap>
      <Select
        aria-label="Сценариев для сравнения"
        value={runs}
        onChange={onRunsChange}
        options={[5, 10, 15, 20].map((value) => ({
          value,
          label: `${value} сценариев`,
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
        Сравнить стратегии
      </Button>
    </Space>
  );
}
