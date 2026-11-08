-- Fictional sample data for local development (`supabase db reset` loads it).
-- One company, one warehouse site, and generic forklift safety rules.
-- Rules are written in Japanese because the analysis prompt asks Gemini to
-- answer in Japanese; the English comments explain each one.
--
-- No users are seeded: create your first admin as described in README.md.

-- Company: "Demo Logistics Co., Ltd."
insert into public.companies (uid, name, abbreviation, address) values
  ('00000000-0000-4000-8000-000000000001', 'デモ物流株式会社', 'DEMO', 'サンプル県サンプル市1-1-1');

-- Site: "Demo Warehouse No. 1"
insert into public.locations (uid, company_uid, name, address) values
  ('00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000001', 'デモ第一倉庫', 'サンプル県サンプル市港町2-3');

-- Rules. location_uid null = applies to every site of the company.
insert into public.rules (uid, company_uid, location_uid, name, details, status) values
  -- No sudden starts, stops or sharp turns. The camera app files its
  -- accelerometer alerts under this rule (ACCELERATION_ALERT_RULE_UID in
  -- apps/camera/config/example.json).
  ('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000001', null,
   '急発進・急停止・急旋回をしない',
   '発進・停止・旋回はゆっくり行い、急なアクセル・ブレーキ・ハンドル操作をしないこと。',
   'active'),
  -- Wear the seat belt while driving.
  ('00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000001', null,
   '運転中はシートベルトを着用する',
   'フォークリフトを運転するときは、必ずシートベルトを締めること。',
   'active'),
  -- Never travel with the load raised; keep the forks 15-20 cm above the floor.
  ('00000000-0000-4000-8000-000000000103', '00000000-0000-4000-8000-000000000001', null,
   '荷を上げたまま走行しない',
   '走行中はフォークを床から15〜20cm程度に下げ、荷を高く上げたまま移動しないこと。',
   'active'),
  -- Stop and look both ways at intersections and blind corners.
  ('00000000-0000-4000-8000-000000000104', '00000000-0000-4000-8000-000000000001', null,
   '交差点・曲がり角では一時停止して左右を確認する',
   '見通しの悪い交差点や曲がり角では一時停止し、左右の安全を確認してから進むこと。',
   'active'),
  -- Slow down near pedestrians and give them the right of way.
  ('00000000-0000-4000-8000-000000000105', '00000000-0000-4000-8000-000000000001', null,
   '歩行者の近くでは徐行し、歩行者を優先する',
   '作業者や歩行者が近くにいるときは速度を落とし、歩行者の通行を優先すること。',
   'active'),
  -- Drive in reverse when the load blocks the forward view.
  ('00000000-0000-4000-8000-000000000106', '00000000-0000-4000-8000-000000000001', null,
   '前方が見えない荷は後進で運ぶ',
   '荷で前方の視界が遮られる場合は、後進で走行し進行方向を目視すること。',
   'active'),
  -- Do not use a phone while driving.
  ('00000000-0000-4000-8000-000000000107', '00000000-0000-4000-8000-000000000001', null,
   '運転中にスマートフォンを操作しない',
   '走行中・荷役中は携帯電話やスマートフォンを手に持たないこと。',
   'active'),
  -- Site rule for Demo Warehouse No. 1: keep to 8 km/h indoors. Inactive as an
  -- example: speed is hard to judge from video, so it is kept but not sent to Gemini.
  ('00000000-0000-4000-8000-000000000108', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000011',
   '屋内は時速8km以下で走行する',
   'デモ第一倉庫の屋内通路では時速8km以下で走行すること。',
   'inactive');
