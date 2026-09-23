import { Alert, Card, Empty, Statistic, Table, Tag } from "antd";
import type { TableProps } from "antd";

import { RobustnessControls } from "@/features/check-robustness";
import type { Robustness, RobustnessResult } from "@/entities/robustness";
import { useLanguage } from "@/shared/i18n";
import { integer, money } from "@/shared/lib";

interface RobustnessPanelProps {
  runs: number;
  onRunsChange: (value: number) => void;
  onCheck: () => void;
  loading: boolean;
  error: Error | null;
  robustness: Robustness | undefined;
}

export function RobustnessPanel({
  runs,
  onRunsChange,
  onCheck,
  loading,
  error,
  robustness,
}: RobustnessPanelProps) {
  const { language, t } = useLanguage();
  const columns: TableProps<RobustnessResult>["columns"] = [
    {
      title: t.scenarioColumn,
      dataIndex: "seed",
      key: "seed",
      render: (value: number) => `#${integer(value, language)}`,
    },
    {
      title: t.netGain,
      dataIndex: "netGain",
      key: "netGain",
      render: (value: number) => money(value, language),
    },
    {
      title: t.statusColumn,
      dataIndex: "status",
      key: "status",
      render: (value: string) => (
        <Tag color={value === "PASS" ? "success" : "error"}>
          {value === "PASS" ? t.plus : t.minus}
        </Tag>
      ),
    },
  ];

  return (
    <Card title={t.robustnessTitle} className="surface-card">
      <p className="section-intro">{t.robustnessDescription}</p>
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
          className="mt-5"
          type="error"
          message={t.robustnessError}
          description={error.message}
          showIcon
        />
      )}
      {robustness ? (
        <>
          <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Statistic
              title={t.positiveRuns}
              value={`${robustness.positive} / ${robustness.runs}`}
            />
            <Statistic
              title={t.median}
              value={money(robustness.median, language)}
            />
            <Statistic
              title={t.minimum}
              value={money(robustness.minimum, language)}
            />
            <Statistic
              title={t.maximum}
              value={money(robustness.maximum, language)}
            />
          </div>
          <Table<RobustnessResult>
            className="mt-6"
            rowKey="seed"
            size="middle"
            columns={columns}
            dataSource={robustness.results}
            pagination={{ pageSize: 10, showSizeChanger: false }}
            scroll={{ x: 480 }}
          />
        </>
      ) : !loading && !error ? (
        <Empty className="mt-6" description={t.emptyRobustness} />
      ) : null}
    </Card>
  );
}
