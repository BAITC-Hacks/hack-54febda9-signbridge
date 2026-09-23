import { Card, Empty, Table, Tag, Typography } from "antd";
import type { TableProps } from "antd";

import type { Campaign, Run } from "@/entities/run";

import { audience, channelLabel, integer, money, tariff } from "@/shared/lib";

interface CampaignPlanProps {
  run: Run;
}

const columns: TableProps<Campaign>["columns"] = [
  {
    title: "Кампания",
    key: "name",
    render: (_: unknown, item: Campaign, index: number) => (
      <span className="font-medium" title={item.name}>
        Кампания {index + 1}
      </span>
    ),
  },
  {
    title: "Аудитория",
    key: "audience",
    render: (_: unknown, item: Campaign) =>
      audience(item.arpuSegment, item.dataSegment, item.callSegment),
  },
  {
    title: "Переход",
    key: "tariff",
    render: (_: unknown, item: Campaign) =>
      `${tariff(item.fromTariff)} → ${tariff(item.toTariff)}`,
  },
  {
    title: "Канал",
    dataIndex: "channel",
    key: "channel",
    render: (value: string) => channelLabel(value),
  },
  {
    title: "Контактов",
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
    title: "Прирост до расходов",
    dataIndex: "grossLift",
    key: "grossLift",
    render: (value: number) => money(value),
  },
  {
    title: "Ограничение",
    dataIndex: "capped",
    key: "capped",
    render: (value: boolean) =>
      value ? <Tag color="gold">Сработал лимит</Tag> : "—",
  },
];

export function CampaignPlan({ run }: CampaignPlanProps) {
  return (
    <Card title="План итоговых кампаний" className="shadow-sm">
      <Typography.Paragraph type="secondary">
        Агент сам выбирает аудиторию, новый тариф и канал связи. Расходы на эти
        контакты уже вычтены из чистого результата выше.
      </Typography.Paragraph>
      {run.campaigns.length ? (
        <Table<Campaign>
          rowKey="name"
          size="small"
          columns={columns}
          dataSource={run.campaigns}
          pagination={false}
          scroll={{ x: 1100 }}
        />
      ) : (
        <Empty description="Агент не выбрал кампании для этого сценария" />
      )}
    </Card>
  );
}
