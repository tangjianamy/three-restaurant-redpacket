-- ================================================================
-- 三店联动红包系统 · Supabase 数据库建表脚本
-- 在 Supabase Dashboard → SQL Editor 中粘贴执行
-- ================================================================

-- 1. 统计数据表 (单行, id=1)
CREATE TABLE IF NOT EXISTS stats (
  id INTEGER PRIMARY KEY DEFAULT 1,
  scan_count INTEGER DEFAULT 0,
  redpacket_claimed INTEGER DEFAULT 0,
  redpacket_used INTEGER DEFAULT 0
);

INSERT INTO stats (id, scan_count, redpacket_claimed, redpacket_used)
VALUES (1, 0, 0, 0)
ON CONFLICT (id) DO NOTHING;

-- 2. 红包领取记录表
CREATE TABLE IF NOT EXISTS redpackets (
  id TEXT PRIMARY KEY,
  pin TEXT NOT NULL,
  phone TEXT NOT NULL,
  phone_masked TEXT,
  restaurant_id INTEGER NOT NULL,
  restaurant_name TEXT,
  restaurant_color TEXT,
  amount INTEGER,
  min_spend INTEGER,
  claimed_at TIMESTAMPTZ,
  expire_at TIMESTAMPTZ,
  used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_redpackets_phone_restaurant
  ON redpackets(phone, restaurant_id);
CREATE INDEX IF NOT EXISTS idx_redpackets_claimed_at
  ON redpackets(claimed_at DESC);

-- 3. 餐厅数据表 (JSONB 存储, 每家餐厅一行)
CREATE TABLE IF NOT EXISTS restaurants (
  id INTEGER PRIMARY KEY,
  data JSONB
);

-- 4. 操作日志表
CREATE TABLE IF NOT EXISTS logs (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  action TEXT,
  details TEXT,
  admin TEXT
);

CREATE INDEX IF NOT EXISTS idx_logs_created_at
  ON logs(created_at DESC);

-- ================================================================
-- 行级安全策略 (RLS)
-- 启用 RLS 但不添加任何 policy
-- → 使用 anon key 无法读写 (默认拒绝)
-- → 使用 service_role key 可完全绕过 RLS
-- 服务端只用 service_role key，确保数据安全
-- ================================================================

ALTER TABLE stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE redpackets ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- 说明：
-- 1. Storage bucket 需要在 Dashboard → Storage 中手动创建
--    bucket 名称: uploads
--    设为 Public (允许公开读取图片)
-- 2. 餐厅默认数据由服务端首次启动时自动插入
-- ================================================================
