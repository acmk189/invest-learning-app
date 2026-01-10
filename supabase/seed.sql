-- Seed Data for Local Development
-- Description: ローカル開発環境用のテストデータ
-- Usage: supabase db reset (マイグレーション適用後にシードを投入)

-- ============================================
-- News Test Data
-- ============================================

INSERT INTO news (date, world_news_title, world_news_summary, japan_news_title, japan_news_summary)
VALUES 
  -- 今日のニュース
  (CURRENT_DATE, 
   '【世界市場】米国株式市場が史上最高値を更新',
   'テスト用の世界ニュース要約です。米国株式市場は堅調な経済指標を背景に上昇を続けています。S&P500指数は前日比1.2%高となり、年初来高値を更新しました。テクノロジーセクターが牽引役となり、特にAI関連銘柄への投資意欲が高まっています。',
   '【日本市場】日経平均が3万9000円台に回復',
   'テスト用の日本ニュース要約です。日経平均株価は円安進行を追い風に大幅高となりました。輸出関連株を中心に買いが先行し、終値は前日比500円高の3万9200円となりました。'),
  -- 昨日のニュース
  (CURRENT_DATE - INTERVAL '1 day',
   '【世界市場】欧州中央銀行が金利据え置きを発表',
   'テスト用の世界ニュース要約です。ECBは政策金利の据え置きを決定しました。インフレ率の低下傾向を確認しつつも、慎重な姿勢を維持しています。',
   '【日本市場】半導体関連株が軒並み上昇',
   'テスト用の日本ニュース要約です。半導体関連株が買われ、東京エレクトロンや信越化学が年初来高値を更新しました。'),
  -- 2日前のニュース
  (CURRENT_DATE - INTERVAL '2 days',
   '【世界市場】原油価格が急騰、中東情勢の緊張高まる',
   'テスト用の世界ニュース要約です。原油先物価格が急騰しました。中東地域での地政学的リスクが高まっていることが背景にあります。',
   '【日本市場】銀行株が上昇、日銀の政策修正期待で',
   'テスト用の日本ニュース要約です。日銀の金融政策正常化への期待から、銀行株が軒並み上昇しました。');

-- ============================================
-- Terms Test Data
-- ============================================

INSERT INTO terms (date, name, description, difficulty)
VALUES 
  -- 今日の用語（3件）
  (CURRENT_DATE, 'PER（株価収益率）',
   'PER（Price Earnings Ratio）は、株価を1株当たり純利益（EPS）で割った指標です。株価が利益の何倍で取引されているかを示し、企業の割安・割高を判断する際に使用されます。一般的にPERが低いほど割安とされますが、業種や成長性によって適正水準は異なります。',
   'beginner'),
  (CURRENT_DATE, 'ボラティリティ',
   'ボラティリティは、価格変動の大きさを示す指標です。標準偏差を用いて計算され、値が大きいほど価格変動が激しいことを意味します。投資のリスク管理において重要な概念であり、オプション取引の価格決定にも使用されます。',
   'intermediate'),
  (CURRENT_DATE, 'デリバティブ',
   'デリバティブ（金融派生商品）は、株式や債券、為替などの原資産から派生した金融商品です。先物、オプション、スワップなどが含まれます。リスクヘッジや投機目的で使用されますが、レバレッジ効果により大きな損失が生じる可能性もあります。',
   'advanced'),
  -- 昨日の用語（3件）
  (CURRENT_DATE - INTERVAL '1 day', 'EPS（1株当たり純利益）',
   'EPS（Earnings Per Share）は、当期純利益を発行済み株式数で割った指標です。企業の収益力を株主の視点から評価する際に使用され、PERの計算にも用いられます。',
   'beginner'),
  (CURRENT_DATE - INTERVAL '1 day', 'ROE（自己資本利益率）',
   'ROE（Return On Equity）は、純利益を自己資本で割った指標です。株主が出資した資本に対してどれだけの利益を生み出しているかを示し、経営効率の評価に使用されます。',
   'intermediate'),
  (CURRENT_DATE - INTERVAL '1 day', 'アービトラージ',
   'アービトラージ（裁定取引）は、同一資産の価格差を利用して利益を得る取引手法です。異なる市場間や先物と現物の価格差を利用し、リスクなく利益を確定させます。',
   'advanced');

-- ============================================
-- Terms History Test Data
-- ============================================

INSERT INTO terms_history (term_name, delivered_at, difficulty)
VALUES 
  ('PER（株価収益率）', CURRENT_TIMESTAMP, 'beginner'),
  ('ボラティリティ', CURRENT_TIMESTAMP, 'intermediate'),
  ('デリバティブ', CURRENT_TIMESTAMP, 'advanced'),
  ('EPS（1株当たり純利益）', CURRENT_TIMESTAMP - INTERVAL '1 day', 'beginner'),
  ('ROE（自己資本利益率）', CURRENT_TIMESTAMP - INTERVAL '1 day', 'intermediate'),
  ('アービトラージ', CURRENT_TIMESTAMP - INTERVAL '1 day', 'advanced');

-- ============================================
-- Batch Metadata Test Data
-- ============================================

-- batch_metadataは初期レコードがマイグレーションで作成済み
-- 最終更新日時を設定
UPDATE batch_metadata
SET 
  news_last_updated = CURRENT_TIMESTAMP,
  terms_last_updated = CURRENT_TIMESTAMP
WHERE id = 1;
