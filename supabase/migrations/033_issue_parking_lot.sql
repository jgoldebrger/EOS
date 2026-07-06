-- Parking lot: issues deferred from active IDS during L10
ALTER TABLE issues
  ADD COLUMN IF NOT EXISTS is_parking_lot boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS issues_parking_lot_idx
  ON issues (organization_id, is_parking_lot)
  WHERE is_parking_lot = true;
