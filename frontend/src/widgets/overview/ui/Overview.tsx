import { Card, Progress, Statistic, Tag, Typography } from "antd";

import type { Run } from "@/entities/run";

import { integer, money, percent } from "@/shared/lib";

interface OverviewProps {
  run: Run;
}

export function Overview({ run }: OverviewProps) {
  const budgetShare = Math.min(100, (run.totalCost / run.budgetLimit) * 100);
  const contactShare = Math.min(
    100,
    (run.totalContacts / run.contactLimit) * 100,
  );

  return (
    <section aria-labelledby="result-heading" className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Typography.Title id="result-heading" level={3} className="!mb-0">
          Результат сценария #{run.seed}
        </Typography.Title>
        <Tag color={run.status === "PASS" ? "success" : "error"}>
          {run.status === "PASS"
            ? "Положительный результат"
            : "Отрицательный результат"}
        </Tag>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr_1fr]">
        <Card className="border-0 bg-slate-900 shadow-sm">
          <Typography.Text className="!text-blue-100">
            Чистый прирост ARPU
          </Typography.Text>
          <div className="mt-2 text-3xl font-semibold tracking-tight text-white md:text-4xl">
            {money(run.netGain)}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Tag color={run.growthPct >= 0 ? "green" : "red"}>
              {percent(run.growthPct, true)} к базе
            </Tag>
            <Typography.Text className="!text-blue-100">
              Прирост выручки после всех расходов на контакты
            </Typography.Text>
          </div>
        </Card>
        <Card className="shadow-sm">
          <Statistic
            title="Прирост до расходов"
            value={run.grossLift}
            formatter={() => money(run.grossLift)}
          />
          <Typography.Text type="secondary" className="mt-3 block text-xs">
            По уникальным абонентам: повторный контакт не удваивает эффект.
          </Typography.Text>
        </Card>
        <Card className="shadow-sm">
          <Statistic
            title="Стоимость контактов"
            value={run.totalCost}
            formatter={() => money(run.totalCost)}
          />
          <Typography.Text type="secondary" className="mt-3 block text-xs">
            Включены и пилоты, и итоговые кампании.
          </Typography.Text>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card size="small" className="shadow-sm">
          <Statistic
            title="Исходная выручка базы"
            value={run.baseline}
            formatter={() => money(run.baseline)}
          />
        </Card>
        <Card size="small" className="shadow-sm">
          <Statistic
            title="Пилоты / финальные кампании"
            value={`${run.pilots.length} / ${run.campaigns.length}`}
          />
          <Typography.Text type="secondary" className="text-xs">
            Лимиты: 20 / 10
          </Typography.Text>
        </Card>
        <Card size="small" className="shadow-sm">
          <Statistic
            title="Уникальных людей"
            value={integer(run.uniqueCustomers)}
          />
          <Typography.Text type="secondary" className="text-xs">
            {percent(run.coveragePct)} от {integer(run.audienceTotal)} абонентов
          </Typography.Text>
        </Card>
        <Card size="small" className="shadow-sm">
          <Statistic title="Людей с минусом" value={percent(run.riskPct)} />
          <Typography.Text type="secondary" className="text-xs">
            Доля с отрицательным эффектом по мок-модели
          </Typography.Text>
        </Card>
      </div>

      <Card title="Использование лимитов" className="shadow-sm">
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <div className="mb-2 flex justify-between gap-3 text-sm">
              <span>Бюджет</span>
              <strong>
                {money(run.totalCost)} / {money(run.budgetLimit)}
              </strong>
            </div>
            <Progress
              percent={budgetShare}
              showInfo={false}
              strokeColor="#1768ac"
            />
          </div>
          <div>
            <div className="mb-2 flex justify-between gap-3 text-sm">
              <span>Контакты</span>
              <strong>
                {integer(run.totalContacts)} / {integer(run.contactLimit)}
              </strong>
            </div>
            <Progress
              percent={contactShare}
              showInfo={false}
              strokeColor="#14835f"
            />
          </div>
        </div>
        <Typography.Text type="secondary" className="mt-3 block text-xs">
          Контактов может быть больше, чем уникальных людей: каждое обращение
          стоит денег.
        </Typography.Text>
      </Card>
    </section>
  );
}
