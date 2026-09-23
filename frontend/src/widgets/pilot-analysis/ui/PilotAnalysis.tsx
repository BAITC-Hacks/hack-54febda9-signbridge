import { Card, Collapse, Table, Tag, Typography } from "antd";
import type { TableProps } from "antd";

import type { ModelTrace, Pilot, Run } from "@/entities/run";

import { useLanguage } from "@/shared/i18n";
import { audience, integer, money, percent, tariff } from "@/shared/lib";

interface PilotAnalysisProps {
  run: Run;
}

export function PilotAnalysis({ run }: PilotAnalysisProps) {
  const { language, t } = useLanguage();
  const columns: TableProps<Pilot>["columns"] = [
    {
      title: t.pilotColumn,
      dataIndex: "name",
      key: "name",
      render: (value: string) => (
        <span className="font-semibold text-slate-900">
          {t.pilotColumn} {value.replace(/^pilot_/, "")}
        </span>
      ),
    },
    {
      title: t.audienceColumn,
      key: "audience",
      render: (_: unknown, pilot: Pilot) =>
        audience(pilot.arpuSegment, pilot.dataSegment, pilot.callSegment, language),
    },
    {
      title: t.transitionColumn,
      key: "tariff",
      render: (_: unknown, pilot: Pilot) =>
        `${tariff(pilot.fromTariff, language)} → ${tariff(pilot.targetTariff, language)}`,
    },
    {
      title: t.peopleColumn,
      dataIndex: "contacts",
      key: "contacts",
      render: (value: number) => integer(value, language),
    },
    {
      title: t.spendColumn,
      dataIndex: "cost",
      key: "cost",
      render: (value: number) => money(value, language),
    },
    {
      title: t.measuredColumn,
      dataIndex: "observedLiftPct",
      key: "observedLiftPct",
      render: (value: number) => (
        <Tag color={value >= 0 ? "success" : "error"}>
          {percent(value, true, language)}
        </Tag>
      ),
    },
  ];
  const modelColumns: TableProps<ModelTrace>["columns"] = [
    {
      title: t.pilotColumn,
      dataIndex: "pilot",
      key: "pilot",
      render: (value: string) => `${t.pilotColumn} ${value.replace(/^pilot_/, "")}`,
    },
    {
      title: t.modelSource,
      dataIndex: "source",
      key: "source",
      render: (value: ModelTrace["source"]) =>
        value === "coverage" ? t.newGroup : t.sourceHistory,
    },
    {
      title: t.before,
      dataIndex: "predictedBeforePct",
      key: "before",
      render: (value: number) => percent(value, true, language),
    },
    {
      title: t.uncertainty,
      dataIndex: "uncertaintyBeforePct",
      key: "uncertainty",
      render: (value: number) => `±${percent(value, false, language)}`,
    },
    {
      title: t.measuredColumn,
      dataIndex: "observedPct",
      key: "observed",
      render: (value: number) => percent(value, true, language),
    },
    {
      title: t.after,
      dataIndex: "predictedAfterPct",
      key: "after",
      render: (value: number) => percent(value, true, language),
    },
  ];
  const coverage = run.modelTrace.find((item) => item.source === "coverage");

  return (
    <Card title={t.pilotsTitle} className="surface-card">
      <Typography.Paragraph className="section-intro">
        {t.pilotsDescription}
      </Typography.Paragraph>
      {coverage && (
        <div className="mb-5 flex flex-wrap items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-base text-emerald-950">
          <Tag color="success">{t.newGroup}</Tag>
          <span>
            {t.newGroupDescription} {audience(coverage.arpuSegment, null, null, language)}
          </span>
        </div>
      )}
      <Table<Pilot>
        rowKey="name"
        size="middle"
        columns={columns}
        dataSource={run.pilots}
        pagination={false}
        scroll={{ x: 850 }}
      />
      {run.modelTrace.length > 0 && (
        <Collapse
          className="mt-5"
          items={[
            {
              key: "model",
              label: t.modelDetails,
              children: (
                <>
                  <Typography.Paragraph className="section-intro">
                    {t.modelHelp}
                  </Typography.Paragraph>
                  <Table<ModelTrace>
                    rowKey="pilot"
                    size="middle"
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
