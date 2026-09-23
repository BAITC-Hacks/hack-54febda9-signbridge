import CrownOutlined from "@ant-design/icons/lib/icons/CrownOutlined";
import {
  Alert,
  Card,
  Col,
  Empty,
  Progress,
  Row,
  Skeleton,
  Statistic,
  Tag,
  Typography,
} from "antd";

import { StrategyComparisonControls } from "@/features/compare-strategies";

import type { StrategyComparison } from "@/entities/strategy-comparison";

import { money } from "@/shared/lib";

interface StrategyShowdownProps {
  runs: number;
  onRunsChange: (value: number) => void;
  onCompare: () => void;
  loading: boolean;
  error: Error | null;
  comparison: StrategyComparison | undefined;
}

const descriptions: Record<string, string> = {
  "Текущая: адаптивная":
    "Обновляет оценки после каждого пилота и проверяет перспективную новую группу.",
  "Фиксированная очередь":
    "Проходит заранее заданный список SMS-гипотез без адаптации порядка по результатам.",
  "Без разведки новой группы":
    "Оставляет адаптивный выбор, но не тратит пилот на ранее не проверенную группу.",
  "Более строгие лимиты расходов":
    "Оставляет пилоты, но жёстче ограничивает расходы одной кампании и канала.",
};

export function StrategyShowdown({
  runs,
  onRunsChange,
  onCompare,
  loading,
  error,
  comparison,
}: StrategyShowdownProps) {
  const maxNet = Math.max(
    1,
    ...(comparison?.summaries.map((item) => item.medianNet) ?? []),
  );
  const leader = comparison?.summaries.find(
    (item) => item.policy === comparison.winner,
  );

  return (
    <section aria-labelledby="strategy-showdown-title" className="space-y-5">
      <div className="overflow-hidden rounded-3xl bg-slate-950 p-5 text-white shadow-xl sm:p-8">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <Tag color="cyan" className="!mb-3 !border-0">
              ЛАБОРАТОРИЯ РЕШЕНИЙ · 04
            </Tag>
            <Typography.Title
              id="strategy-showdown-title"
              level={2}
              className="!mb-3 !text-3xl !text-white sm:!text-4xl"
            >
              Битва стратегий
            </Typography.Title>
            <Typography.Paragraph className="!mb-0 max-w-2xl !text-slate-300">
              Четыре подхода проходят одни и те же случайные сценарии. Сравните
              прибыль, устойчивость и цену дорогих каналов, прежде чем выбирать
              правила пилотирования.
            </Typography.Paragraph>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
            <Typography.Text className="!mb-3 block !text-sm !text-slate-300">
              Сколько одинаковых сценариев прогнать?
            </Typography.Text>
            <StrategyComparisonControls
              runs={runs}
              onRunsChange={onRunsChange}
              onCompare={onCompare}
              loading={loading}
            />
          </div>
        </div>
      </div>

      {error && (
        <Alert
          type="error"
          showIcon
          message="Сравнение не удалось"
          description={error.message}
        />
      )}
      {loading && !comparison ? (
        <Card>
          <Skeleton active paragraph={{ rows: 6 }} />
        </Card>
      ) : comparison && leader ? (
        <>
          <Card className="!border-emerald-200 !bg-emerald-50 shadow-sm">
            <Row gutter={[24, 16]} align="middle">
              <Col xs={24} lg={12}>
                <div className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-emerald-800">
                  <CrownOutlined /> Лидер на {comparison.runs} сценариях
                </div>
                <Typography.Title level={3} className="!mb-1 !text-slate-900">
                  {comparison.winner}
                </Typography.Title>
                <Typography.Text type="secondary">
                  {leader.positiveRuns} из {comparison.runs} запусков
                  завершились с плюсом
                </Typography.Text>
              </Col>
              <Col xs={12} lg={6}>
                <Statistic
                  title="Медианная чистая выгода"
                  value={money(leader.medianNet)}
                  valueStyle={{ color: "#047857", fontWeight: 700 }}
                />
              </Col>
              <Col xs={12} lg={6}>
                <Statistic
                  title="Нижние 10% сценариев"
                  value={money(leader.p10Net)}
                  valueStyle={{ color: "#334155" }}
                />
              </Col>
            </Row>
          </Card>

          <Card title="Сравнение на одном поле" className="shadow-sm">
            <Typography.Paragraph type="secondary">
              Верхняя полоса показывает медианную чистую выгоду, нижняя —
              результат в нижних сценариях. Чистая выгода уже учитывает
              стоимость всех контактов.
            </Typography.Paragraph>
            <div className="space-y-5">
              {comparison.summaries.map((item, index) => (
                <div key={item.policy}>
                  <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                    <Typography.Text strong>
                      {index + 1}. {item.policy}
                    </Typography.Text>
                    <Typography.Text strong>
                      {money(item.medianNet)}
                    </Typography.Text>
                  </div>
                  <Progress
                    percent={Math.max(0, (item.medianNet / maxNet) * 100)}
                    showInfo={false}
                    strokeColor={
                      item.policy === comparison.winner ? "#10b981" : "#64748b"
                    }
                    trailColor="#e2e8f0"
                    size={{ height: 12 }}
                  />
                  <Progress
                    percent={Math.max(0, (item.p10Net / maxNet) * 100)}
                    showInfo={false}
                    strokeColor="#f59e0b"
                    trailColor="#f1f5f9"
                    size={{ height: 4 }}
                  />
                  <div className="mt-1 flex flex-wrap justify-between gap-2 text-xs text-slate-500">
                    <span>Нижние 10%: {money(item.p10Net)}</span>
                    <span>
                      Плюсовых запусков: {item.positiveRuns}/{comparison.runs}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Row gutter={[16, 16]}>
            {comparison.summaries.map((item) => (
              <Col xs={24} md={12} xl={6} key={item.policy}>
                <Card
                  className={`h-full shadow-sm ${item.policy === comparison.winner ? "!border-emerald-400 ring-2 ring-emerald-100" : ""}`}
                  title={item.policy}
                  extra={
                    item.policy === comparison.winner ? (
                      <Tag color="success">Лидер</Tag>
                    ) : null
                  }
                >
                  <Typography.Paragraph type="secondary" className="min-h-12">
                    {descriptions[item.policy] ??
                      "Альтернативное правило распределения пилотов и бюджета."}
                  </Typography.Paragraph>
                  <div className="grid grid-cols-2 gap-4">
                    <Statistic title="Медиана" value={money(item.medianNet)} />
                    <Statistic
                      title="Худший запуск"
                      value={money(item.minimumNet)}
                    />
                    <Statistic
                      title="Лучше текущей"
                      value={`${item.winsVsCurrent}/${comparison.runs}`}
                    />
                    <Statistic
                      title="Пилотов"
                      value={Math.round(item.medianPilots)}
                    />
                  </div>
                  <div className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-sm">
                    <div className="flex justify-between gap-3">
                      <span className="text-slate-500">Звонки</span>
                      <span>{money(item.medianCallCost)}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-slate-500">Реклама</span>
                      <span>{money(item.medianAdsCost)}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-slate-500">
                        Крупнейшая кампания
                      </span>
                      <span>{money(item.maxCampaignCost)}</span>
                    </div>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
          <Alert
            type="warning"
            showIcon
            message="Это лабораторный эксперимент на синтетической модели"
            description="Все варианты сравниваются на одинаковых случайных сценариях, чтобы сравнение было честнее. Но эффекты в моке отличаются от судейских — результат не является прогнозом баллов хакатона."
          />
        </>
      ) : !loading && !error ? (
        <Card className="shadow-sm">
          <Empty description="Запустите сравнение, чтобы увидеть, какая стратегия выигрывает" />
        </Card>
      ) : null}
    </section>
  );
}
