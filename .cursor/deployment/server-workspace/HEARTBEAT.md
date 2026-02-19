# HEARTBEAT.md

## News Monitoring Tasks

### Daily Checks (rotate through these)

1. **Check urgent AI/tech news** (2-3 times daily)
2. **Monitor eVTOL developments** (daily)
3. **Scan startup funding news** (daily)
4. **Review new productivity tools** (2-3 times weekly)

### Source Exploration Tasks (33% Rule Maintenance)

5. **Discover new sources** (weekly) - find 2-3 new channels/feeds
6. **Evaluate source performance** (daily) - check ratings and promote/demote
7. **Monitor exploration ratio** (daily) - ensure 33% new sources in digests
8. **Clean rejected sources** (monthly) - review and give second chances

### Maintenance Tasks

- Update news cache and remove old files
- Review and update keyword relevance
- Update source-status-tracking.json with new discoveries
- Commit workspace changes
- Generate source performance reports

### Exploration Workflow

```
Every heartbeat (rotate):
1. Check if exploration ratio < 33% → add more new sources
2. Look for highly-cited sources in quality articles
3. Monitor user reactions → update source ratings
4. Discover trending hashtags/channels in target topics
5. Review and promote candidate sources to proven status
```

### Source Discovery Targets

- **AI/ML**: OpenAI blog, Anthropic, DeepMind updates
- **Robotics**: IEEE Spectrum, robotics forums, research labs
- **eVTOL**: Vertical mag, urban air mobility news, startup updates
- **Business**: Product Hunt, startup databases, funding announcements
- **Tools**: Indie Hackers, maker communities, productivity blogs

---

## ⚕️ Авиценна — Медицинский мониторинг

### Еженедельно (раз в 7 дней)

1. Открой `skills/avicenna/data/schedule.md`
2. Проверь: есть ли чекап через ≤14 дней → напомни Маргулану
3. Проверь таблицу "Рекомендованные" → если дата последнего пустая или >порога → предложи запланировать
4. Открой `skills/avicenna/data/medications.md` → если у курсового препарата конец курса через ≤7 дней → напомни

### Ежемесячно (раз в 30 дней)

5. Открой `skills/avicenna/data/checkups.md` → посчитай сколько дней с последнего ОАК/биохимии
6. Если >90 дней без анализов → отправь Маргулану напоминание о плановом чекапе
7. Сверь `risks.md` → если есть активные 🔴 риски без действий >30 дней → напомни

### Формат напоминания

Сообщение должно быть конкретным:

> "⚕️ Авиценна: Плановый чекап — прошло 3 месяца с последних анализов. Рекомендую: ОАК + биохимия + витамин D. Записать?"

---

### Quiet Hours

- 23:00-08:00 UTC (05:00-14:00 Almaty) - minimal alerts only
- During scheduled digest times - skip heartbeat checks

### Quality Metrics to Track

- **Discovery Rate**: >2 new quality sources per month
- **Promotion Rate**: >1 source promoted to "proven" monthly
- **Exploration Ratio**: 30-40% in each digest
- **User Satisfaction**: Track reaction patterns to source quality
