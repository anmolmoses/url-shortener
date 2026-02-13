-- Performance indexes for analytics aggregation queries

-- Composite index for date-range filtered queries on a link
CREATE INDEX IF NOT EXISTS idx_click_events_link_id_clicked_at
  ON click_events (link_id, clicked_at);

-- Index for country-based aggregation per link
CREATE INDEX IF NOT EXISTS idx_click_events_link_id_country
  ON click_events (link_id, country);

-- Index for referrer-based aggregation per link
CREATE INDEX IF NOT EXISTS idx_click_events_link_id_referrer
  ON click_events (link_id, referrer);
