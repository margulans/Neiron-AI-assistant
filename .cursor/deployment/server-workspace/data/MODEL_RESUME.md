# MODEL_RESUME — Поэтапное включение

> Активировано: 2026-03-06T07:05Z
> Причина остановки: rate limit на всех моделях

---

## Перед включением

```bash
ssh openclaw@100.73.176.127
export PATH=/home/openclaw/.npm-global/bin:$PATH
```

Проверить что rate limit прошёл:

```bash
# Тест OpenAI
curl -s https://api.openai.com/v1/models -H "Authorization: Bearer $OPENAI_API_KEY" | head -c 200

# Тест Gemini (через gateway logs)
journalctl --user -u openclaw-gateway --since "5 min ago" --no-pager | grep -i "rate_limit"
```

---

## Фаза 1 — Мониторинг (включить первыми)

```bash
# Участковый (основной)
openclaw cron enable 305e53a4-049c-4d2e-b248-0cdbea259d3f

# Механик (основной)
openclaw cron enable bef4ddfa-1fd8-4c64-9495-79d851f4f5f0

# Чекист (основной)
openclaw cron enable b72fece5-c8f7-4b9b-842a-208b7efcecc2
```

Подождать 30 мин. Проверить логи: нет rate limit ошибок.

---

## Фаза 2 — Контент (дайджесты + мнения)

```bash
# Утренний дайджест
openclaw cron enable 1c292387-c997-46f1-b8a1-e5fd40059713

# Дневной дайджест
openclaw cron enable a0ed4696-8c15-4ab2-b21d-e3e2e9a0b6b6

# Вечерний дайджест
openclaw cron enable 582cc3f0-9941-4e74-ae77-0afac52c6258

# Утренние мнения
openclaw cron enable 6d4944f0-7679-4c5f-b22d-49afc05158b2

# Дневные мнения
openclaw cron enable ba31c42d-be5d-486e-9897-6fb4fa6ae2ed

# Вечерние мнения
openclaw cron enable 1ebe95ac-91c9-45e5-a758-a1ff5be367e4

# Утренний брифинг
openclaw cron enable 4cc76b40-8c26-4d88-aa2d-967f432e9cee
```

Подождать один цикл дайджеста. Проверить доставку в @newsneiron.

---

## Фаза 3 — Аналитика и агенты

```bash
# Ежедневная рефлексия
openclaw cron enable 9d558661-b1bd-4636-afba-72ec30bb3190

# Экономист (сбор)
openclaw cron enable 22efd91b-5dbf-4cfe-a623-9cbe6a5b56bd

# Экономист (отчёт)
openclaw cron enable b1314adb-6d55-416f-b268-061549952089

# Marta → Aiganym (утро/обед/вечер)
openclaw cron enable 489dc543-09f4-4e25-8b31-25c31194b6a2
openclaw cron enable 694a76a6-f519-4107-824a-e81eb30ce37a
openclaw cron enable 255d2287-3a5a-4c56-b3a9-a809cece114d

# Марта: Саммари от Айганым
openclaw cron enable 9e47cd1e-caac-4873-bf51-d70cc50974be

# Memory Weekly Review
openclaw cron enable 6de61c1c-887a-4e67-90d4-b18c8f6d6863

# Еженедельный анализ источников
openclaw cron enable 7e21383e-9595-4cae-ac86-498615a41c05

# Аналитик
openclaw cron enable fb8d930d-9479-4d6f-8948-a6b703dff284
```

---

## Фаза 4 — Backup jobs

```bash
# BACKUP: Участковый
openclaw cron enable b9da6746-f3bf-4f00-a2c7-da5014855627

# BACKUP: Механик
openclaw cron enable a532ac04-61cf-419e-9eca-012b5595fd00

# BACKUP: Чекист
openclaw cron enable 734c608b-8b03-4653-b1fc-108edf6785d2

# BACKUP: Утренний дайджест
openclaw cron enable c1c58593-accd-4cf7-a175-3603514b0275

# BACKUP: Дневной дайджест
openclaw cron enable 62c89740-52fa-4364-b1ae-7c81110ef368

# BACKUP: Вечерний дайджест
openclaw cron enable e758d243-54e7-4d3b-b684-8115561831e6

# BACKUP: Утренние мнения
openclaw cron enable 10e6c5ea-652e-4776-b097-f72dbf6ef050

# BACKUP: Дневные мнения
openclaw cron enable d81fedff-8d6f-4e32-a105-a56f8833feb7

# BACKUP: Вечерние мнения
openclaw cron enable 8783bc2f-de99-4742-9229-09921260d546

# BACKUP: Утренний брифинг
openclaw cron enable 829eee9e-de87-4c35-82ed-a469ac67afc2

# BACKUP: Ежедневная рефлексия
openclaw cron enable 76f581a1-960c-4e35-bc9f-9ff0ccc56ae2

# BACKUP: Экономист (сбор)
openclaw cron enable 7b05bba1-25f3-43e6-b866-02e783c77fa2

# BACKUP: Экономист (отчёт)
openclaw cron enable ccd9f2e4-9ff2-4922-932c-8f160ba3a955

# BACKUP: Marta утро/обед/вечер
openclaw cron enable d10935f5-ebbb-4f6f-b964-d14c719b433d
openclaw cron enable ff2dfcf2-f093-42e6-8581-4720e9c0de32
openclaw cron enable 0caa28fa-a6ba-4e57-bd72-ff94ea55932b

# BACKUP: Саммари от Айганым
openclaw cron enable 6b3d2e36-4e34-4689-9b44-96deac5904bb

# BACKUP: Memory Weekly Review
openclaw cron enable 480fc3c0-2d1b-478a-b1ff-70e6211468b5

# BACKUP: Аналитик
openclaw cron enable 1560e572-8564-49c8-a0ba-90d7be9af64c

# BACKUP: Ежемесячный аудит
openclaw cron enable 3138ebbd-e0f2-4937-a761-9b048c314925
```

---

## Фаза 5 — Прочие (по желанию)

```bash
# Аводарт (Вс 09:00)
openclaw cron enable 8f79e567-0759-482d-be85-81f5a9b26285

# Авиценна (28-е 08:00)
openclaw cron enable f09cd8a5-2b4a-4bea-aa57-f2da041dd9a8

# Венди (goal-check + пятничный инсайт)
openclaw cron enable 579cc906-eb55-45f6-9c96-6954ca49ff8f
openclaw cron enable 83e0880a-ff90-48af-ab05-3be928ecf9e0

# Ночные jobs (Участковый ночь, Механик ночь, Чекист ночь)
openclaw cron enable bc20e704-af13-445d-af52-eaa3ac157d4b
openclaw cron enable 0ece27a3-dfc0-47a4-bd3c-6fb6c8c9d403
openclaw cron enable 89db97f7-e05e-4e3b-990b-fefc1815e7d7

# BACKUP: ночные
openclaw cron enable 8e8e7e2c-8616-43e3-a7e0-022a6f4c204f
openclaw cron enable 585d2b84-e992-47a7-ba3c-acd268165874
openclaw cron enable e529cf2b-6d25-4323-9c0d-63b68d8b0453

# Чекист gate report
openclaw cron enable 47eb57b2-b6bb-4712-8744-c4940e599643

# Monitor daily summary
openclaw cron enable f4ac0949-f857-4ab5-b534-4e826d0bf1fb

# Digest Weekly Improvements
openclaw cron enable 12459c64-6d58-428a-a63a-aeaf44594656

# Еженедельный куратор
openclaw cron enable a1de1ef4-e153-4415-8704-741f812ab75a
```

---

## После полного включения

```bash
# Проверить что все jobs активны
openclaw cron list

# Мониторить логи 30 мин
journalctl --user -u openclaw-gateway -f | grep -iE "error|rate_limit|fail"

# Удалить snapshot файл (опционально)
# rm ~/.openclaw/workspace/data/model-stop-snapshot.json
```

```bash
# Коммит
cd ~/Clowdbot && git add -A && git commit -m "ops: MODEL_RESUME complete — all jobs re-enabled" && git push
```
