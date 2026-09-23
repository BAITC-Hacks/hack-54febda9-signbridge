import ExperimentOutlined from "@ant-design/icons/lib/icons/ExperimentOutlined";
import ArrowDownOutlined from "@ant-design/icons/lib/icons/ArrowDownOutlined";
import { Alert, Button, Card, Divider, Segmented, Skeleton, Typography } from "antd";
import { useState } from "react";

import { CampaignPlan } from "@/widgets/campaign-plan";
import { Overview } from "@/widgets/overview";
import { PilotAnalysis } from "@/widgets/pilot-analysis";
import { RobustnessPanel } from "@/widgets/robustness";
import { StrategyShowdown } from "@/widgets/strategy-showdown";

import { RunControls } from "@/features/run-agent";

import { useRobustness } from "@/entities/robustness";
import { useRun } from "@/entities/run";
import { useStrategyComparison } from "@/entities/strategy-comparison";
import { useLanguage } from "@/shared/i18n";
import type { Language } from "@/shared/i18n";

export function DashboardPage() {
  const { language, setLanguage, t } = useLanguage();
  const [seed, setSeed] = useState<number>(42);
  const [selectedSeed, setSelectedSeed] = useState<number>(42);
  const [runs, setRuns] = useState<number>(15);
  const [checkedRuns, setCheckedRuns] = useState<number | null>(null);
  const [strategyRuns, setStrategyRuns] = useState<number>(10);
  const [checkedStrategyRuns, setCheckedStrategyRuns] = useState<number | null>(
    null,
  );
  const runQuery = useRun(selectedSeed);
  const robustnessQuery = useRobustness(checkedRuns);
  const strategyQuery = useStrategyComparison(checkedStrategyRuns);

  const handleRun = (): void => {
    if (seed === selectedSeed) {
      void runQuery.refetch();
    } else {
      setSelectedSeed(seed);
    }
  };

  const handleCheck = (): void => {
    if (runs === checkedRuns) {
      void robustnessQuery.refetch();
    } else {
      setCheckedRuns(runs);
    }
  };

  const handleCompareStrategies = (): void => {
    if (strategyRuns === checkedStrategyRuns) {
      void strategyQuery.refetch();
    } else {
      setCheckedStrategyRuns(strategyRuns);
    }
  };

  return (
    <main className="dashboard-shell mx-auto max-w-[1440px] space-y-8 px-4 py-5 sm:px-7 lg:px-10">
      <header className="hero-panel">
        <div className="hero-topline">
          <span className="hero-brand">{t.brand}</span>
          <div className="flex items-center gap-3">
            <span className="hero-status"><i />{t.demo}</span>
            <Segmented
              aria-label="Language / Язык / Тіл"
              value={language}
              onChange={(value) => setLanguage(value as Language)}
              options={[
                { label: "ҚАЗ", value: "kk" },
                { label: "РУС", value: "ru" },
                { label: "ENG", value: "en" },
              ]}
              className="language-switch"
            />
          </div>
        </div>
        <div className="hero-content">
          <div className="hero-copy">
            <Typography.Title level={1} className="hero-title">
              {t.heroTitle}
            </Typography.Title>
            <p className="hero-subtitle">{t.heroSubtitle}</p>
            <Button
              href="#scenario-start"
              size="large"
              icon={<ArrowDownOutlined />}
              className="hero-cta"
            >
              {t.jumpToRun}
            </Button>
          </div>
          <div className="hero-metrics" aria-label={t.demo}>
            <div><span>23 441</span><small>{t.heroAudience}</small></div>
            <div><span>100 000</span><small>{t.heroBudget}, у.е.</small></div>
            <div><span>20</span><small>{t.heroPilots}</small></div>
          </div>
        </div>
        <div className="hero-orbit hero-orbit-one" aria-hidden="true" />
        <div className="hero-orbit hero-orbit-two" aria-hidden="true" />
      </header>

      <Alert
        className="mock-notice"
        type="info"
        showIcon
        message={t.disclaimerTitle}
        description={t.disclaimer}
      />

      <div id="scenario-start" className="grid scroll-mt-8 gap-5 lg:grid-cols-[0.85fr_1.5fr]">
        <Card title={t.runTitle} className="surface-card">
          <RunControls
            seed={seed}
            onSeedChange={setSeed}
            onRun={handleRun}
            loading={runQuery.isFetching}
          />
        </Card>
        <Card title={t.agentTitle} className="surface-card">
          <div className="agent-steps">
            {t.steps.map(([title, detail], index) => (
              <div key={title} className="agent-step">
                <span className="agent-step-number">0{index + 1}</span>
                <div><strong>{title}</strong><p>{detail}</p></div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {runQuery.error && (
        <Alert
          type="error"
          showIcon
          message={t.runError}
          description={runQuery.error.message}
        />
      )}
      {runQuery.isLoading && (
        <Card>
          <Skeleton active paragraph={{ rows: 8 }} />
        </Card>
      )}
      {runQuery.data && (
        <>
          {runQuery.data.agentError && (
            <Alert
              type="warning"
              showIcon
          message={t.agentError}
              description={runQuery.data.agentError}
            />
          )}
          <Overview run={runQuery.data} />
          <PilotAnalysis run={runQuery.data} />
          <CampaignPlan run={runQuery.data} />
        </>
      )}

      <RobustnessPanel
        runs={runs}
        onRunsChange={setRuns}
        onCheck={handleCheck}
        loading={robustnessQuery.isFetching}
        error={robustnessQuery.error}
        robustness={robustnessQuery.data}
      />

      <StrategyShowdown
        runs={strategyRuns}
        onRunsChange={setStrategyRuns}
        onCompare={handleCompareStrategies}
        loading={strategyQuery.isFetching}
        error={strategyQuery.error}
        comparison={strategyQuery.data}
      />

      <footer className="dashboard-footer">
        <Divider />
        <ExperimentOutlined />
        <span>{t.footer}</span>
      </footer>
    </main>
  );
}
