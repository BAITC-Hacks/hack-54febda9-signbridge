import { Card, Empty, Table, Tag } from "antd";
import type { TableProps } from "antd";

import type { Campaign, Run } from "@/entities/run";

import { useLanguage } from "@/shared/i18n";
import { audience, channelLabel, integer, money, tariff } from "@/shared/lib";

interface CampaignPlanProps {
  run: Run;
}

export function CampaignPlan({ run }: CampaignPlanProps) {
  const { language, t } = useLanguage();
  const columns: TableProps<Campaign>["columns"] = [
    {
      title: t.campaignColumn,
      key: "name",
      render: (_: unknown, item: Campaign, index: number) => (
        <span className="font-semibold text-slate-900" title={item.name}>
          {t.campaignColumn} {index + 1}
        </span>
      ),
    },
    {
      title: t.audienceColumn,
      key: "audience",
      render: (_: unknown, item: Campaign) =>
        audience(item.arpuSegment, item.dataSegment, item.callSegment, language),
    },
    {
      title: t.transitionColumn,
      key: "tariff",
      render: (_: unknown, item: Campaign) =>
        `${tariff(item.fromTariff, language)} → ${tariff(item.toTariff, language)}`,
    },
    {
      title: t.channelColumn,
      dataIndex: "channel",
      key: "channel",
      render: (value: string) => channelLabel(value, language),
    },
    {
      title: t.contacts,
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
      title: t.grossColumn,
      dataIndex: "grossLift",
      key: "grossLift",
      render: (value: number) => money(value, language),
    },
    {
      title: t.capColumn,
      dataIndex: "capped",
      key: "capped",
      render: (value: boolean) =>
        value ? <Tag color="gold">{t.capped}</Tag> : "—",
    },
  ];

  return (
    <Card title={t.campaignTitle} className="surface-card">
      <p className="section-intro">{t.campaignDescription}</p>
      {run.campaigns.length ? (
        <Table<Campaign>
          rowKey="name"
          size="middle"
          columns={columns}
          dataSource={run.campaigns}
          pagination={false}
          scroll={{ x: 1100 }}
        />
      ) : (
        <Empty description={t.noCampaigns} />
      )}
    </Card>
  );
}
