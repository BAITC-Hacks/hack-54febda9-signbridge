# SignBridge tariff campaign agent

Репозиторий для агента, который выбирает тарифные кампании по профилям абонентов и результатам пилотов. Подробности кейса — в [`context/PARTICIPANT_GUIDE.md`](context/PARTICIPANT_GUIDE.md).

## Стек

- Python 3.11
- NumPy и pandas — зависимости закреплены в `requirements.txt`
- Docker Compose — воспроизводимый запуск локальной проверки и генерации отправки

Для сдачи не нужны отдельный API-сервер, база данных или фронтенд. Приложенные настройки backend-проекта использовались только как пример контейнеризации; FastAPI, Redis и другие его зависимости сюда не переносились.

## Запуск в Docker

Собрать образ и запустить локальную проверку:

```bash
docker compose run --build --rm agent
```

Создать `context/submission.csv`:

```bash
docker compose run --build --rm agent python make_submission.py
```

Папка `context` подключена внутрь контейнера, поэтому созданный файл останется на хосте.

## Локальный запуск без Docker

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
cd context
python local_eval.py
python make_submission.py
```

`make_submission.py` сохраняет `submission.csv` в текущую папку `context`.
