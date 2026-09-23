import { Card, Progress, Statistic, Tag, Typography } from "antd";

import type { Run } from "@/entities/run";

import { useLanguage } from "@/shared/i18n";
import { integer, money, percent } from "@/shared/lib";

interface OverviewProps {
  run: Run;
}

export function Overview({ run }: OverviewProps) {
  const { language, t } = useLanguage();
  const budgetShare = Math.min(100, (run.totalCost / run.budgetLimit) * 100);
  const contactShare = Math.min(
    100,
    (run.totalContacts / run.contactLimit) * 100,
  );

  return (
    <section aria-labelledby="result-heading" className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Typography.Title id="result-heading" level={3} className="!mb-0">
          {t.resultTitle} #{run.seed}
        </Typography.Title>
        <Tag color={run.status === "PASS" ? "success" : "error"}>
          {run.status === "PASS"
            ? t.positive
            : t.negative}
        </Tag>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr_1fr]">
        <Card className="border-0 bg-slate-900 shadow-sm">
          <Typography.Text className="!text-blue-100">
            {t.netGain}
          </Typography.Text>
          <div className="mt-2 text-3xl font-semibold tracking-tight text-white md:text-4xl">
            {money(run.netGain, language)}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Tag color={run.growthPct >= 0 ? "green" : "red"}>
              {percent(run.growthPct, true, language)}
            </Tag>
            <Typography.Text className="!text-blue-100">
              {t.netHelp}
            </Typography.Text>
          </div>
        </Card>
        <Card className="shadow-sm">
          <Statistic
            title={t.grossLift}
            value={run.grossLift}
            formatter={() => money(run.grossLift, language)}
          />
          <Typography.Text type="secondary" className="mt-3 block text-xs">
            {t.grossHelp}
          </Typography.Text>
        </Card>
        <Card className="shadow-sm">
          <Statistic
            title={t.contactCost}
            value={run.totalCost}
            formatter={() => money(run.totalCost, language)}
          />
          <Typography.Text type="secondary" className="mt-3 block text-xs">
            {t.contactHelp}
          </Typography.Text>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card size="small" className="shadow-sm">
          <Statistic
            title={t.baseline}
            value={run.baseline}
            formatter={() => money(run.baseline, language)}
          />
        </Card>
        <Card size="small" className="shadow-sm">
          <Statistic
            title={t.pilotsCampaigns}
            value={`${run.pilots.length} / ${run.campaigns.length}`}
          />
          <Typography.Text type="secondary" className="text-xs">
            {t.limits}
          </Typography.Text>
        </Card>
        <Card size="small" className="shadow-sm">
          <Statistic
            title={t.uniquePeople}
            value={integer(run.uniqueCustomers, language)}
          />
          <Typography.Text type="secondary" className="text-xs">
            {percent(run.coveragePct, false, language)} {t.audienceOf} {integer(run.audienceTotal, language)} {t.subscribers}
          </Typography.Text>
        </Card>
        <Card size="small" className="shadow-sm">
          <Statistic title={t.negativePeople} value={percent(run.riskPct, false, language)} />
          <Typography.Text type="secondary" className="text-xs">
            {t.mockOnly}
          </Typography.Text>
        </Card>
      </div>

      <Card title={t.limitsTitle} className="surface-card">
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <div className="mb-2 flex justify-between gap-3 text-sm">
              <span>{t.budget}</span>
              <strong>
                {money(run.totalCost, language)} / {money(run.budgetLimit, language)}
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
              <span>{t.contacts}</span>
              <strong>
                {integer(run.totalContacts, language)} / {integer(run.contactLimit, language)}
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
          {t.contactLimitHelp}
        </Typography.Text>
      </Card>
    </section>
  );
}
