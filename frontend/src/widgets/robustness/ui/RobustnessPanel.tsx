import { Alert, Card, Empty, Statistic, Table, Tag, Typography } from "antd";
import type { TableProps } from "antd";

import { RobustnessControls } from "@/features/check-robustness";

import type { Robustness, RobustnessResult } from "@/entities/robustness";

import { money } from "@/shared/lib";

interface RobustnessPanelProps {
  runs: number;
  onRunsChange: (value: number) => void;
  onCheck: () => void;
  loading: boolean;
  error: Error | null;
  robustness: Robustness | undefined;
}

const columns: TableProps<RobustnessResult>["columns"] = [
  {
    title: "Сценарий",
    dataIndex: "seed",
    key: "seed",
    render: (value: number) => `#${value}`,
  },
  {
    title: "Чистый прирост",
    dataIndex: "netGain",
    key: "netGain",
    render: (value: number) => money(value),
  },
  {
    title: "Статус",
    dataIndex: "status",
    key: "status",
    render: (value: string) => (
      <Tag color={value === "PASS" ? "success" : "error"}>
        {value === "PASS" ? "Плюс" : "Минус"}
      </Tag>
    ),
  },
];

export function RobustnessPanel({
  runs,
  onRunsChange,
  onCheck,
  loading,
  error,
  robustness,
}: RobustnessPanelProps) {
  return (
    <Card title="Проверка устойчивости" className="shadow-sm">
      <Typography.Paragraph type="secondary">
        Несколько запусков с разными случайными выборками показывают, насколько
        результат зависит от случайности пилотов. Это локальная проверка, а не
        официальный балл.
      </Typography.Paragraph>
      <div className="max-w-sm">
        <RobustnessControls
          runs={runs}
          onRunsChange={onRunsChange}
          onCheck={onCheck}
          loading={loading}
        />
      </div>
      {error && (
        <Alert
          className="mt-4"
          type="error"
          message="Не удалось провести проверку"
          description={error.message}
          showIcon
        />
      )}
      {robustness ? (
        <>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Statistic
              title="Прогонов с плюсом"
              value={`${robustness.positive} из ${robustness.runs}`}
            />
            <Statistic
              title="Медианный прирост"
              value={robustness.median}
              formatter={() => money(robustness.median)}
            />
            <Statistic
              title="Минимум"
              value={robustness.minimum}
              formatter={() => money(robustness.minimum)}
            />
            <Statistic
              title="Максимум"
              value={robustness.maximum}
              formatter={() => money(robustness.maximum)}
            />
          </div>
          <Table<RobustnessResult>
            className="mt-5"
            rowKey="seed"
            size="small"
            columns={columns}
            dataSource={robustness.results}
            pagination={{ pageSize: 10 }}
          />
        </>
      ) : !loading && !error ? (
        <Empty
          className="mt-6"
          description="Нажмите «Проверить», чтобы увидеть результаты"
        />
      ) : null}
    </Card>
  );
}
