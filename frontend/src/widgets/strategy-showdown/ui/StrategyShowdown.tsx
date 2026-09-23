import CrownOutlined from "@ant-design/icons/lib/icons/CrownOutlined";
import { Alert, Card, Col, Empty, Progress, Row, Skeleton, Statistic, Tag, Typography } from "antd";

import type { StrategyComparison } from "@/entities/strategy-comparison";
import { StrategyComparisonControls } from "@/features/compare-strategies";
import { useLanguage } from "@/shared/i18n";
import { money } from "@/shared/lib";

interface StrategyShowdownProps {
  runs: number;
  onRunsChange: (value: number) => void;
  onCompare: () => void;
  loading: boolean;
  error: Error | null;
  comparison: StrategyComparison | undefined;
}

export function StrategyShowdown({
  runs,
  onRunsChange,
  onCompare,
  loading,
  error,
  comparison,
}: StrategyShowdownProps) {
  const { language, t } = useLanguage();
  const maxNet = Math.max(1, ...(comparison?.summaries.map((item) => item.medianNet) ?? []));
  const leader = comparison?.summaries.find((item) => item.policy === comparison.winner);
  const policyName = (id: string): string =>
    t.strategyNames[id as keyof typeof t.strategyNames] ?? id;
  const policyDescription = (id: string): string =>
    t.strategyDescriptions[id as keyof typeof t.strategyDescriptions] ?? "";

  return (
    <section aria-labelledby="strategy-showdown-title" className="strategy-section">
      <div className="strategy-hero">
        <div className="strategy-hero-copy">
          <span className="eyebrow">{t.strategyKicker}</span>
          <Typography.Title id="strategy-showdown-title" level={2} className="strategy-heading">
            {t.strategyTitle}
          </Typography.Title>
          <p>{t.strategyDescription}</p>
        </div>
        <div className="strategy-controls-panel">
          <span>{t.strategyRunsLabel}</span>
          <StrategyComparisonControls
            runs={runs}
            onRunsChange={onRunsChange}
            onCompare={onCompare}
            loading={loading}
          />
        </div>
        <div className="strategy-graphic" aria-hidden="true">
          {t.chartWords.map((word, index) => (
            <span key={word} style={{ "--line": index } as React.CSSProperties}>
              {word}
            </span>
          ))}
        </div>
      </div>

      {error && (
        <Alert type="error" showIcon message={t.strategyError} description={error.message} />
      )}
      {loading && !comparison ? (
        <Card className="surface-card"><Skeleton active paragraph={{ rows: 5 }} /></Card>
      ) : comparison && leader ? (
        <>
          <Card className="leader-card">
            <div className="leader-name">
              <span className="eyebrow"><CrownOutlined /> {t.winnerOn}</span>
              <Typography.Title level={3}>{policyName(comparison.winner)}</Typography.Title>
              <span>{leader.positiveRuns}/{comparison.runs} {t.positiveLaunches}</span>
            </div>
            <div className="leader-metrics">
              <Statistic title={t.medianNet} value={money(leader.medianNet, language)} />
              <Statistic title={t.lowerTail} value={money(leader.p10Net, language)} />
            </div>
          </Card>

          <Card title={t.chartTitle} className="surface-card strategy-chart-card">
            <p className="section-intro">{t.chartHelp}</p>
            <div className="strategy-chart">
              {comparison.summaries.map((item, index) => (
                <div className="strategy-chart-row" key={item.policy}>
                  <div className="strategy-chart-label">
                    <strong>{String(index + 1).padStart(2, "0")} / {policyName(item.policy)}</strong>
                    <b>{money(item.medianNet, language)}</b>
                  </div>
                  <Progress
                    percent={Math.max(0, (item.medianNet / maxNet) * 100)}
                    showInfo={false}
                    strokeColor={item.policy === comparison.winner ? "#10b981" : "#64748b"}
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
                  <div className="strategy-chart-caption">
                    <span>{t.lowerTail}: {money(item.p10Net, language)}</span>
                    <span>{item.positiveRuns}/{comparison.runs} {t.positiveLaunches}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Row gutter={[16, 16]}>
            {comparison.summaries.map((item) => (
              <Col xs={24} md={12} xl={6} key={item.policy}>
                <Card
                  className={`strategy-card h-full ${item.policy === comparison.winner ? "strategy-card-winner" : ""}`}
                  title={policyName(item.policy)}
                  extra={item.policy === comparison.winner ? <Tag color="success">{t.leaderTag}</Tag> : null}
                >
                  <p className="strategy-card-description">{policyDescription(item.policy)}</p>
                  <div className="strategy-card-stats">
                    <Statistic title={t.strategyMedian} value={money(item.medianNet, language)} />
                    <Statistic title={t.worstRun} value={money(item.minimumNet, language)} />
                    <Statistic title={t.beatsCurrent} value={`${item.winsVsCurrent}/${comparison.runs}`} />
                    <Statistic title={t.pilots} value={Math.round(item.medianPilots)} />
                  </div>
                  <div className="strategy-costs">
                    <div><span>{t.calls}</span><b>{money(item.medianCallCost, language)}</b></div>
                    <div><span>{t.ads}</span><b>{money(item.medianAdsCost, language)}</b></div>
                    <div><span>{t.largestCampaign}</span><b>{money(item.maxCampaignCost, language)}</b></div>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
          <Alert
            type="warning"
            showIcon
            message={t.strategyDisclaimerTitle}
            description={t.strategyDisclaimer}
          />
        </>
      ) : !loading && !error ? (
        <Card className="surface-card"><Empty description={t.strategyEmpty} /></Card>
      ) : null}
    </section>
  );
}
