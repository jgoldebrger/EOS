-- Strety parity: measurable value types, operators, daily cadence, weekly rollup

-- ---------------------------------------------------------------------------
-- scorecard_metrics: Strety-style target + cadence fields
-- ---------------------------------------------------------------------------
ALTER TABLE public.scorecard_metrics
  ADD COLUMN value_type text NOT NULL DEFAULT 'number'
    CHECK (value_type IN ('number', 'currency', 'percentage', 'boolean', 'time')),
  ADD COLUMN target_operator text NOT NULL DEFAULT '>='
    CHECK (target_operator IN ('>=', '<=', '=', '>', '<', 'between')),
  ADD COLUMN entry_cadence text NOT NULL DEFAULT 'weekly'
    CHECK (entry_cadence IN ('daily', 'weekly')),
  ADD COLUMN weekly_rollup_method text
    CHECK (
      weekly_rollup_method IS NULL
      OR weekly_rollup_method IN ('sum', 'average', 'last', 'min', 'max', 'count')
    );

ALTER TABLE public.scorecard_metrics
  ADD CONSTRAINT scorecard_metrics_daily_rollup_check CHECK (
    entry_cadence <> 'daily'
    OR weekly_rollup_method IS NOT NULL
  );

CREATE INDEX scorecard_metrics_entry_cadence_idx
  ON public.scorecard_metrics (entry_cadence);

-- Backfill from existing target_rule
UPDATE public.scorecard_metrics
SET
  value_type = CASE
    WHEN target_rule = 'boolean' THEN 'boolean'
    ELSE 'number'
  END,
  target_operator = CASE target_rule
    WHEN 'higher_is_better' THEN '>='
    WHEN 'lower_is_better' THEN '<='
    WHEN 'exact' THEN '='
    WHEN 'range' THEN 'between'
    WHEN 'boolean' THEN '='
    ELSE '>='
  END,
  entry_cadence = 'weekly',
  weekly_rollup_method = NULL;

-- ---------------------------------------------------------------------------
-- scorecard_values: allow daily period_type
-- ---------------------------------------------------------------------------
ALTER TABLE public.scorecard_values
  DROP CONSTRAINT IF EXISTS scorecard_values_period_type_check;

ALTER TABLE public.scorecard_values
  ADD CONSTRAINT scorecard_values_period_type_check
  CHECK (period_type IN ('daily', 'weekly', 'monthly', 'quarterly', 'annual'));
