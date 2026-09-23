import BarChartOutlined from "@ant-design/icons/lib/icons/BarChartOutlined";
import { Button, InputNumber, Space, Typography } from "antd";

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
  return (
    <Space direction="vertical" size={8} className="w-full">
      <Typography.Text strong>Число прогонов</Typography.Text>
      <Space.Compact className="w-full">
        <InputNumber
          aria-label="Число прогонов"
          min={1}
          max={30}
          precision={0}
          value={runs}
          onChange={(value) => onRunsChange(value ?? 1)}
          className="w-full"
        />
        <Button icon={<BarChartOutlined />} onClick={onCheck} loading={loading}>
          Проверить
        </Button>
      </Space.Compact>
      <Typography.Text type="secondary" className="text-xs">
        Сравнивает результат на разных seed одной и той же мок-модели.
      </Typography.Text>
    </Space>
  );
}
