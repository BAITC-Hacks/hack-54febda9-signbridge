import { Card, Collapse, Table, Tag, Typography } from "antd";
import type { TableProps } from "antd";

import type { ModelTrace, Run, Pilot } from "@/entities/run";

import { audience, integer, money, percent, tariff } from "@/shared/lib";

interface PilotAnalysisProps {
  run: Run;
}

const columns: TableProps<Pilot>["columns"] = [
  {
    title: "Пилот",
    dataIndex: "name",
    key: "name",
    render: (_: string, pilot: Pilot) => (
      <span className="font-medium">
        {pilot.name.replace(/^pilot_/, "Пилот ")}
      </span>
    ),
  },
  {
    title: "Аудитория",
    key: "audience",
    render: (_: unknown, pilot: Pilot) =>
      audience(pilot.arpuSegment, pilot.dataSegment, pilot.callSegment),
  },
  {
    title: "Переход",
    key: "tariff",
    render: (_: unknown, pilot: Pilot) =>
      `${tariff(pilot.fromTariff)} → ${tariff(pilot.targetTariff)}`,
  },
  {
    title: "Людей",
    dataIndex: "contacts",
    key: "contacts",
    render: (value: number) => integer(value),
  },
  {
    title: "Расход",
    dataIndex: "cost",
    key: "cost",
    render: (value: number) => money(value),
  },
  {
    title: "Измерено",
    dataIndex: "observedLiftPct",
    key: "observedLiftPct",
    render: (value: number) => (
      <Tag color={value >= 0 ? "success" : "error"}>{percent(value, true)}</Tag>
    ),
  },
];

const modelColumns: TableProps<ModelTrace>["columns"] = [
  {
    title: "Пилот",
    dataIndex: "pilot",
    key: "pilot",
    render: (value: string) => value.replace(/^pilot_/, "Пилот "),
  },
  {
    title: "Источник",
    dataIndex: "source",
    key: "source",
    render: (value: ModelTrace["source"]) =>
      value === "coverage" ? "Новая группа" : "История",
  },
  {
    title: "До",
    dataIndex: "predictedBeforePct",
    key: "before",
    render: (value: number) => percent(value, true),
  },
  {
    title: "Неопределённость",
    dataIndex: "uncertaintyBeforePct",
    key: "uncertainty",
    render: (value: number) => `±${percent(value)}`,
  },
  {
    title: "Измерено",
    dataIndex: "observedPct",
    key: "observed",
    render: (value: number) => percent(value, true),
  },
  {
    title: "После",
    dataIndex: "predictedAfterPct",
    key: "after",
    render: (value: number) => percent(value, true),
  },
];

export function PilotAnalysis({ run }: PilotAnalysisProps) {
  const coverage = run.modelTrace.find((item) => item.source === "coverage");

  return (
    <Card title="Как агент проверял гипотезы" className="shadow-sm">
      <Typography.Paragraph type="secondary">
        Пилот — небольшая тестовая кампания. «Измерено» показывает шумное
        изменение выручки у этой группы, а не вероятность успеха. Агент
        сравнивает результаты с историей и выбирает итоговые кампании.
      </Typography.Paragraph>
      {coverage && (
        <div className="mb-4 rounded-xl bg-blue-50 p-3 text-sm text-slate-700">
          <Tag color="blue">Новая группа</Tag>
          Один пилот выделен для группы «
          {audience(coverage.arpuSegment, null, null)}»: так агент проверяет
          сегмент, для которого раньше не было прямого пилота.
        </div>
      )}
      <Table<Pilot>
        rowKey="name"
        size="small"
        columns={columns}
        dataSource={run.pilots}
        pagination={false}
        scroll={{ x: 850 }}
      />
      <Typography.Text type="secondary" className="mt-3 block text-xs">
        Прогноз строится по данным и пилотам; эффект финальных кампаний известен
        только после оценки мок-средой.
      </Typography.Text>
      {run.modelTrace.length > 0 && (
        <Collapse
          className="mt-4"
          items={[
            {
              key: "model",
              label: "Как менялся прогноз ML-модели",
              children: (
                <>
                  <Typography.Paragraph type="secondary">
                    «До» и «После» — ожидаемое относительное изменение выручки
                    группы. Неопределённость показывает разброс оценки до
                    пилота; это не вероятность успеха. «Измерено» — шумный
                    результат пилота, по которому модель уточнила прогноз.
                  </Typography.Paragraph>
                  <Table<ModelTrace>
                    rowKey="pilot"
                    size="small"
                    columns={modelColumns}
                    dataSource={run.modelTrace}
                    pagination={false}
                    scroll={{ x: 720 }}
                  />
                </>
              ),
            },
          ]}
        />
      )}
    </Card>
  );
}
