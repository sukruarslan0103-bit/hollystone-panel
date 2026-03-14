-- ============================================
-- VENUE PANEL - SUPABASE VERITABANI ŞEMASI
-- Supabase Dashboard > SQL Editor'e yapıştır
-- ============================================

-- 1. GÜNLÜK SATIŞ
CREATE TABLE IF NOT EXISTS gunluk_satis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tarih DATE NOT NULL,
  ciro NUMERIC(12,2) DEFAULT 0,
  nakit NUMERIC(12,2) DEFAULT 0,
  pos NUMERIC(12,2) DEFAULT 0,
  bira NUMERIC(12,2) DEFAULT 0,
  alkol NUMERIC(12,2) DEFAULT 0,
  alkolsuz NUMERIC(12,2) DEFAULT 0,
  yiyecek NUMERIC(12,2) DEFAULT 0,
  cerez NUMERIC(12,2) DEFAULT 0,
  bilet NUMERIC(12,2) DEFAULT 0,
  urun_maliyet NUMERIC(12,2) DEFAULT 0,
  ikram_maliyet NUMERIC(12,2) DEFAULT 0,
  not_alani TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. KONSERLER (KAR/ZARAR)
CREATE TABLE IF NOT EXISTS konserler (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tip INTEGER DEFAULT 1,
  sanatci TEXT NOT NULL,
  tarih DATE NOT NULL,
  durum TEXT DEFAULT 'Planlandı',
  not_alani TEXT DEFAULT '',
  bilet_adet INTEGER DEFAULT 0,
  bilet_fiyat NUMERIC(12,2) DEFAULT 0,
  bar_ciro NUMERIC(12,2) DEFAULT 0,
  bilet_ciro NUMERIC(12,2) DEFAULT 0,
  sponsor NUMERIC(12,2) DEFAULT 0,
  diger_gelir NUMERIC(12,2) DEFAULT 0,
  destek_tutari NUMERIC(12,2) DEFAULT 0,
  kase NUMERIC(12,2) DEFAULT 0,
  konser_diger_gider NUMERIC(12,2) DEFAULT 0,
  ekipman NUMERIC(12,2) DEFAULT 0,
  guvenlik NUMERIC(12,2) DEFAULT 0,
  ekstra_personel NUMERIC(12,2) DEFAULT 0,
  kadrolu_personel NUMERIC(12,2) DEFAULT 0,
  ikram_maliyet NUMERIC(12,2) DEFAULT 0,
  urun_maliyet NUMERIC(12,2) DEFAULT 0,
  bilet_maliyet NUMERIC(12,2) DEFAULT 0,
  reklam NUMERIC(12,2) DEFAULT 0,
  ulasim NUMERIC(12,2) DEFAULT 0,
  diger_gider NUMERIC(12,2) DEFAULT 0,
  toplam_gelir NUMERIC(12,2) DEFAULT 0,
  toplam_gider NUMERIC(12,2) DEFAULT 0,
  net_kar NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ÜRÜNLER
CREATE TABLE IF NOT EXISTS urunler (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ad TEXT NOT NULL,
  kategori TEXT DEFAULT 'Diğer',
  satis_fiyati NUMERIC(12,2) DEFAULT 0,
  maliyet NUMERIC(12,2) DEFAULT 0,
  aylik_adet INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. AYLIK ÖZET
CREATE TABLE IF NOT EXISTS aylik_ozet (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ay INTEGER NOT NULL CHECK (ay >= 0 AND ay <= 11),
  yil INTEGER NOT NULL,
  ciro NUMERIC(12,2) DEFAULT 0,
  urun_maliyet NUMERIC(12,2) DEFAULT 0,
  ikram_maliyet NUMERIC(12,2) DEFAULT 0,
  diger_giderler NUMERIC(12,2) DEFAULT 0,
  toplam_gider NUMERIC(12,2) DEFAULT 0,
  brut_kar NUMERIC(12,2) DEFAULT 0,
  net_kar NUMERIC(12,2) DEFAULT 0,
  brut_marj NUMERIC(8,4) DEFAULT 0,
  net_marj NUMERIC(8,4) DEFAULT 0,
  gider_detay JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ay, yil)
);

-- 5. GİDERLER
CREATE TABLE IF NOT EXISTS giderler (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tarih DATE NOT NULL,
  kategori TEXT NOT NULL,
  aciklama TEXT DEFAULT '',
  tutar NUMERIC(12,2) DEFAULT 0,
  odeme_yontemi TEXT DEFAULT 'Nakit',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. PERSONEL
CREATE TABLE IF NOT EXISTS personel (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ad_soyad TEXT NOT NULL,
  pozisyon TEXT DEFAULT 'Diğer',
  tur TEXT DEFAULT 'Kadrolu',
  aylik_maas NUMERIC(12,2) DEFAULT 0,
  sgk NUMERIC(12,2) DEFAULT 0,
  telefon TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. AYARLAR
CREATE TABLE IF NOT EXISTS ayarlar (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  anahtar TEXT UNIQUE NOT NULL,
  deger JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. KONSER MALİYET KALEMLERI
CREATE TABLE IF NOT EXISTS konser_kalemler (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  etiket TEXT NOT NULL,
  sira INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Varsayılan konser kalemleri
INSERT INTO konser_kalemler (etiket, sira) VALUES
  ('Sanatçı Kaşesi', 1),
  ('Konser Diğer Gider (Yemek, Otel vs.)', 2),
  ('Ekipman', 3),
  ('Müzisyen', 4),
  ('Güvenlik Personel', 5),
  ('Gelen Ekstra Personel', 6),
  ('Kadrolu Personel', 7),
  ('Reklam / Tanıtım', 8),
  ('Uçak', 9),
  ('Otel', 10),
  ('Diğer Masraflar', 11)
ON CONFLICT DO NOTHING;

-- ============================================
-- UPDATED_AT OTOMATİK GÜNCELLEME
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_gunluk_satis BEFORE UPDATE ON gunluk_satis FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_konserler BEFORE UPDATE ON konserler FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_urunler BEFORE UPDATE ON urunler FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_aylik_ozet BEFORE UPDATE ON aylik_ozet FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_giderler BEFORE UPDATE ON giderler FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_personel BEFORE UPDATE ON personel FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_ayarlar BEFORE UPDATE ON ayarlar FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- ROW LEVEL SECURITY (RLS) - Güvenlik
-- ============================================
ALTER TABLE gunluk_satis ENABLE ROW LEVEL SECURITY;
ALTER TABLE konserler ENABLE ROW LEVEL SECURITY;
ALTER TABLE urunler ENABLE ROW LEVEL SECURITY;
ALTER TABLE aylik_ozet ENABLE ROW LEVEL SECURITY;
ALTER TABLE giderler ENABLE ROW LEVEL SECURITY;
ALTER TABLE personel ENABLE ROW LEVEL SECURITY;
ALTER TABLE ayarlar ENABLE ROW LEVEL SECURITY;
ALTER TABLE konser_kalemler ENABLE ROW LEVEL SECURITY;

-- Authenticated kullanıcılar her şeyi yapabilir
CREATE POLICY "auth_all" ON gunluk_satis FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON konserler FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON urunler FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON aylik_ozet FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON giderler FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON personel FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON ayarlar FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON konser_kalemler FOR ALL TO authenticated USING (true) WITH CHECK (true);
