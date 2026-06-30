-- Clock time vs duration for time measurables (e.g. "all orders shipped by 2 PM")

ALTER TABLE public.scorecard_metrics
  ADD COLUMN time_kind text NOT NULL DEFAULT 'duration'
    CHECK (time_kind IN ('duration', 'clock'));

CREATE INDEX scorecard_metrics_time_kind_idx
  ON public.scorecard_metrics (time_kind)
  WHERE value_type = 'time';
