# Performance Dashboard Setup

## Data source

Use `/api/perf/dashboard?days=7` as a JSON data source for quick internal dashboards.

Response rows are pre-split by:
- `routeType=editor` for `/editor/*`
- `routeType=non-editor` for everything else

## Suggested dashboard panels

1. **Editor vs Non-editor LCP (avg)**
   - Filter `metricName = LCP`
   - Plot `averageValue`
   - Split series by `routeType`

2. **Editor vs Non-editor INP (avg)**
   - Filter `metricName = INP`
   - Plot `averageValue`
   - Split series by `routeType`

3. **CLS stability trend**
   - Filter `metricName = CLS`
   - Plot `averageValue`

4. **Long task pressure**
   - Filter `metricName = LONG_TASK`
   - Plot `samples` and `poorRate`

## Raw SQL alternative

If your BI system reads PostgreSQL directly:

```sql
SELECT
  date_trunc('day', "recordedAt") AS day,
  "routeType",
  "metricName",
  AVG("value") AS avg_value,
  COUNT(*) AS samples,
  AVG(CASE WHEN "rating" = 'poor' THEN 1 ELSE 0 END) AS poor_rate
FROM "PerfMetric"
WHERE "recordedAt" >= NOW() - INTERVAL '30 days'
GROUP BY 1,2,3
ORDER BY 1 DESC;
```
