import ExperimentOutlined from "@ant-design/icons/lib/icons/ExperimentOutlined";
import { Alert, Card, Divider, Skeleton, Tag, Typography } from "antd";
import { useState } from "react";

import { CampaignPlan } from "@/widgets/campaign-plan";
import { Overview } from "@/widgets/overview";
import { PilotAnalysis } from "@/widgets/pilot-analysis";
import { RobustnessPanel } from "@/widgets/robustness";

import { RunControls } from "@/features/run-agent";

import { useRobustness } from "@/entities/robustness";
import { useRun } from "@/entities/run";

const steps = [
  {
    title: "Собирает варианты",
    detail: "Ищет возможные переходы на тарифы для групп абонентов.",
  },
  {
    title: "Проводит пилоты",
    detail:
      "Проверяет несколько вариантов на малых группах, включая новую группу.",
  },
  {
    title: "Обновляет прогноз",
    detail:
      "Совмещает исторические данные и измерения с учётом неопределённости.",
  },
  {
    title: "Выбирает план",
    detail:
      "Подбирает кампании и каналы в пределах бюджета и лимита контактов.",
  },
];

export function DashboardPage() {
  const [seed, setSeed] = useState<number>(42);
  const [selectedSeed, setSelectedSeed] = useState<number>(42);
  const [runs, setRuns] = useState<number>(15);
  const [checkedRuns, setCheckedRuns] = useState<number | null>(null);
  const runQuery = useRun(selectedSeed);
  const robustnessQuery = useRobustness(checkedRuns);

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

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="rounded-2xl bg-slate-900 px-5 py-7 text-white sm:px-8">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Tag color="blue">SignBridge</Tag>
          <Tag color="gold">Локальное демо</Tag>
        </div>
        <Typography.Title level={1} className="!mb-2 !text-white">
          Агент тарифных кампаний
        </Typography.Title>
        <p className="max-w-3xl text-base text-slate-200">
          Посмотрите, как агент проверяет гипотезы на пилотах и выбирает
          кампании, которые должны увеличить выручку после расходов на связь с
          абонентами.
        </p>
      </header>

      <Alert
        type="info"
        showIcon
        message="Все цифры на этой странице — результат локальной синтетической модели"
        description="Это учебные данные для проверки логики агента. Реальные эффекты кампаний и оценка жюри могут отличаться. Денежные значения указаны в условных единицах."
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_1.5fr]">
        <Card title="Запустить сценарий" className="shadow-sm">
          <RunControls
            seed={seed}
            onSeedChange={setSeed}
            onRun={handleRun}
            loading={runQuery.isFetching}
          />
        </Card>
        <Card title="Что делает AI-агент" className="shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            {steps.map((step, index) => (
              <div key={step.title} className="rounded-xl bg-slate-50 p-3">
                <div className="mb-1 flex items-center gap-2 font-semibold text-slate-800">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs text-blue-800">
                    {index + 1}
                  </span>
                  {step.title}
                </div>
                <p className="m-0 text-sm text-slate-600">{step.detail}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {runQuery.error && (
        <Alert
          type="error"
          showIcon
          message="Не удалось запустить агента"
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
              message="Во время работы агента возникла ошибка"
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

      <footer className="pb-4 text-sm text-slate-500">
        <Divider />
        <ExperimentOutlined className="mr-2" />
        Пилоты и оценка используют предоставленную мок-среду. Решения агент
        принимает по доступным данным и наблюдениям.
      </footer>
    </main>
  );
}
