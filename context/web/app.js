const byId = (id) => document.getElementById(id);
const number = new Intl.NumberFormat("ru-RU", {maximumFractionDigits: 0});
const decimal = new Intl.NumberFormat("ru-RU", {minimumFractionDigits: 2, maximumFractionDigits: 2});
const money = (value) => `${number.format(value)} у.е.`;
const percent = (value) => `${decimal.format(value)}%`;
const channelName = {push: "Push", sms: "SMS", digital_ads: "Реклама", call: "Звонки"};
const tariffName = (code) => code && code !== "Все" ? `Тариф ${String(code).replace(/^tariff_/, "")}` : "Любой тариф";
const pilotName = (code) => String(code).replace(/^pilot_(\d+)$/, "Пилот $1");
const arpuName = {LOW: "низкая выручка", MID: "средняя выручка", HIGH: "высокая выручка"};
const dataName = {NON_USER: "без интернета", LITE: "до 2 ГБ", HEAVY: "много интернета"};
const callName = {LOW: "мало звонков", MEDIUM: "среднее число звонков", HIGH: "много звонков"};
const audienceName = (item) => [
  arpuName[item.arpu_segment] || item.arpu_segment,
  dataName[item.data_segment] || item.data_segment,
  callName[item.call_segment] || item.call_segment,
].filter(Boolean).join(" · ") || "все абоненты";
const plural = (count, one, few, many) => {
  const lastTwo = count % 100;
  const last = count % 10;
  return `${count} ${lastTwo >= 11 && lastTwo <= 14 ? many : last === 1 ? one : last >= 2 && last <= 4 ? few : many}`;
};

function setText(id, value) {
  byId(id).textContent = value;
}

async function loadJson(url) {
  const response = await fetch(url, {cache: "no-store"});
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "Не удалось получить результат");
  return payload;
}

function cell(row, value, className = "") {
  const item = document.createElement("td");
  item.textContent = value;
  if (className) item.className = className;
  row.append(item);
  return item;
}

function emptyTable(body, message, colSpan = 6) {
  const row = document.createElement("tr");
  const item = cell(row, message, "empty-row");
  item.colSpan = colSpan;
  body.append(row);
}

function renderCampaigns(campaigns) {
  const body = byId("campaign-table");
  body.replaceChildren();
  setText("campaign-label", plural(campaigns.length, "кампания", "кампании", "кампаний"));
  if (!campaigns.length) return emptyTable(body, "Финальных кампаний в этом прогоне нет");
  for (const campaign of campaigns) {
    const row = document.createElement("tr");
    cell(row, `${tariffName(campaign.from_tariff)} → ${tariffName(campaign.to_tariff)}`);
    cell(row, audienceName(campaign));
    const channel = cell(row, "");
    const badge = document.createElement("span");
    badge.className = "channel-tag";
    badge.textContent = channelName[campaign.channel] || campaign.channel;
    channel.append(badge);
    cell(row, number.format(campaign.contacts), "numeric");
    cell(row, money(campaign.cost), "numeric");
    cell(row, money(campaign.gross_lift), `numeric ${campaign.gross_lift >= 0 ? "positive" : "negative"}`);
    body.append(row);
  }
}

function renderPilots(pilots) {
  const body = byId("pilot-table");
  body.replaceChildren();
  setText("pilot-label", plural(pilots.length, "пилот", "пилота", "пилотов"));
  if (!pilots.length) return emptyTable(body, "Пилоты в этом прогоне не проводились", 7);
  for (const pilot of pilots) {
    const row = document.createElement("tr");
    cell(row, pilotName(pilot.name));
    cell(row, `${tariffName(pilot.from_tariff)} → ${tariffName(pilot.target_tariff)}`);
    cell(row, audienceName(pilot));
    const channel = cell(row, "");
    const badge = document.createElement("span");
    badge.className = "channel-tag";
    badge.textContent = channelName[pilot.channel] || pilot.channel;
    channel.append(badge);
    cell(row, number.format(pilot.contacts), "numeric");
    cell(row, money(pilot.cost), "numeric");
    cell(row, `${pilot.observed_lift_pct >= 0 ? "+" : ""}${percent(pilot.observed_lift_pct)}`,
      `numeric ${pilot.observed_lift_pct >= 0 ? "positive" : "negative"}`);
    body.append(row);
  }
}

function renderModel(trace) {
  const body = byId("model-table");
  body.replaceChildren();
  setText("model-label", plural(trace.length, "обновление", "обновления", "обновлений"));
  if (!trace.length) {
    const row = document.createElement("tr");
    const item = cell(row, "Модель не получила результатов пилотов", "empty-row");
    item.colSpan = 5;
    body.append(row);
    setText("model-example", "Без результатов SMS-пилотов прогноз не обновлялся.");
    return;
  }
  for (const item of trace) {
    const row = document.createElement("tr");
    cell(row, pilotName(item.pilot));
    cell(row, `${tariffName(item.current_tariff)} → ${tariffName(item.target_tariff)} · ${arpuName[item.arpu_segment] || item.arpu_segment}`);
    cell(row, percent(item.predicted_before_pct), "numeric");
    cell(row, `${item.observed_pct >= 0 ? "+" : ""}${percent(item.observed_pct)}`,
      `numeric ${item.observed_pct >= 0 ? "positive" : "negative"}`);
    cell(row, percent(item.predicted_after_pct), "numeric");
    body.append(row);
  }
  const first = trace[0];
  setText("model-example", `Пример (${pilotName(first.pilot)}): модель ожидала ${percent(first.predicted_before_pct)}, малая группа показала ${first.observed_pct >= 0 ? "+" : ""}${percent(first.observed_pct)}, после этого прогноз стал ${percent(first.predicted_after_pct)}. Это оценка эффекта, а не шанс успеха.`);
}

function renderChannels(channels, budget) {
  const container = byId("channel-bars");
  container.replaceChildren();
  for (const key of ["push", "sms", "digital_ads", "call"]) {
    const data = channels[key] || {cost: 0, contacts: 0};
    const row = document.createElement("div");
    row.className = "channel-row";
    const name = document.createElement("span");
    name.className = "name";
    name.textContent = channelName[key];
    const track = document.createElement("div");
    track.className = "channel-track";
    const fill = document.createElement("div");
    fill.className = "channel-fill";
    fill.style.width = `${Math.min(100, data.cost / budget * 100)}%`;
    track.append(fill);
    const value = document.createElement("span");
    value.className = "value";
    value.textContent = money(data.cost);
    row.append(name, track, value);
    container.append(row);
  }
}

function renderRun(result) {
  byId("result").hidden = false;
  const status = byId("status-pill");
  status.textContent = result.status === "PASS" ? "✓ Плюс на мок-модели" : "! Минус на мок-модели";
  status.className = `status-pill ${result.status === "PASS" ? "pass" : "fail"}`;
  setText("net-gain", money(result.net_gain));
  setText("growth", `${result.growth_pct >= 0 ? "+" : ""}${percent(result.growth_pct)} к исходной выручке всей базы`);
  setText("gross-lift", money(result.gross_lift));
  setText("total-cost", money(result.total_cost));
  setText("budget-used", `${percent(result.total_cost / result.budget_limit * 100)} бюджета`);
  setText("unique-customers", number.format(result.unique_customers));
  setText("coverage", `${percent(result.coverage_pct)} аудитории`);
  setText("coverage-explanation", `${number.format(result.unique_customers)} разных людей из ${number.format(result.audience_total)} в базе. Повторное предложение одному человеку не увеличивает это число.`);
  setText("calculation-note", `Расчёт этого запуска: ${money(result.gross_lift)} дополнительной выручки − ${money(result.total_cost)} расходов = ${money(result.net_gain)} чистого результата. Изменение ${percent(result.growth_pct)} считается относительно исходной выручки всей базы (${money(result.baseline)}), это не вероятность успеха.`);
  setText("budget-fraction", `${money(result.total_cost)} / ${money(result.budget_limit)}`);
  byId("budget-meter-fill").style.width = `${Math.min(100, result.total_cost / result.budget_limit * 100)}%`;
  setText("pilot-count", `${result.pilots.length} / 20`);
  setText("campaign-count", `${result.campaigns.length} / 10`);
  setText("contacts-count", `${number.format(result.total_contacts)} / ${number.format(result.contact_limit)}`);
  setText("contact-example", `Обращений: ${number.format(result.total_contacts)}; разных людей: ${number.format(result.unique_customers)}. Разница (${number.format(result.total_contacts - result.unique_customers)}) — повторные обращения; каждое тратит лимит и, если канал платный, деньги.`);
  setText("risk-score", percent(result.risk_pct));
  renderChannels(result.channels, result.budget_limit);
  renderModel(result.model_trace || []);
  renderCampaigns(result.campaigns);
  renderPilots(result.pilots);
}

async function runAgent(event) {
  if (event) event.preventDefault();
  const button = byId("run-button");
  const state = byId("run-state");
  const seed = byId("seed").value;
  button.disabled = true;
  state.classList.remove("error");
  state.textContent = `Запускаем агента, seed ${seed}…`;
  try {
    const result = await loadJson(`/api/run?seed=${encodeURIComponent(seed)}`);
    renderRun(result);
    state.textContent = result.agent_error
      ? `Агент завершился с ошибкой: ${result.agent_error}. Пилоты учтены в результате.`
      : `Готово: seed ${result.seed}, ${plural(result.pilots.length, "пилот", "пилота", "пилотов")} и ${plural(result.campaigns.length, "финальная кампания", "финальные кампании", "финальных кампаний")}.`;
    if (result.agent_error) state.classList.add("error");
  } catch (error) {
    state.classList.add("error");
    state.textContent = error.message;
  } finally {
    button.disabled = false;
  }
}

function renderRobustness(data) {
  byId("robustness-result").hidden = false;
  setText("positive-runs", `${data.positive} / ${data.runs}`);
  setText("median-net", money(data.median));
  setText("minimum-net", money(data.minimum));
  setText("maximum-net", money(data.maximum));
  const chart = byId("run-chart");
  chart.replaceChildren();
  const maximum = Math.max(...data.results.map((item) => Math.abs(item.net_gain)), 1);
  for (const item of data.results) {
    const bar = document.createElement("div");
    bar.className = `run-bar ${item.net_gain > 0 ? "" : "fail"}`;
    bar.title = `Seed ${item.seed}: ${money(item.net_gain)}`;
    const shape = document.createElement("span");
    shape.style.height = `${Math.max(5, Math.abs(item.net_gain) / maximum * 110)}px`;
    const label = document.createElement("small");
    label.textContent = item.seed;
    bar.append(shape, label);
    chart.append(bar);
  }
}

async function runRobustness() {
  const button = byId("robustness-button");
  const state = byId("robustness-state");
  const runs = byId("runs").value;
  button.disabled = true;
  state.classList.remove("error");
  state.textContent = `Проверяем ${runs} серий пилотов…`;
  try {
    const data = await loadJson(`/api/robustness?runs=${encodeURIComponent(runs)}`);
    renderRobustness(data);
    state.textContent = `Готово: положительных прогонов ${data.positive} из ${data.runs}.`;
  } catch (error) {
    state.classList.add("error");
    state.textContent = error.message;
  } finally {
    button.disabled = false;
  }
}

byId("run-form").addEventListener("submit", runAgent);
byId("robustness-button").addEventListener("click", runRobustness);
runAgent();
