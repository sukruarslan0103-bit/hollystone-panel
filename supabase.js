// ============================================
// supabase.js — Veritabanı Bağlantı Katmanı
// ============================================

// BURAYI KENDİ BİLGİLERİNLE DOLDUR
const SUPABASE_URL = 'https://pqdwxvwdoifyfqqxudiv.supabase.co';
const SUPABASE_URL = 'https://pqdwxvwdoifyfqqxudiv.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_XXXXXXXXXXXXXXX';

// Supabase bağlantısı
const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


// ============================================
// AUTH — Giriş / Çıkış
// ============================================

const Auth = {

  async signIn(email, password) {

    const { data, error } = await sb.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    return data;
  },


  async signOut() {

    const { error } = await sb.auth.signOut();

    if (error) throw error;

  },


  async getUser() {

    const { data: { user } } = await sb.auth.getUser();

    return user;

  },


  onAuthChange(callback) {

    return sb.auth.onAuthStateChange((_event, session) => {

      callback(session?.user || null);

    });

  }

};


// ============================================
// GÜNLÜK SATIŞ
// ============================================

const GunlukSatis = {

  async getAll() {

    const { data, error } = await sb
      .from('gunluk_satis')
      .select('*')
      .order('tarih', { ascending: false });

    if (error) throw error;

    return data || [];
  },


  async add(row) {

    const { data, error } = await sb
      .from('gunluk_satis')
      .insert([row])
      .select()
      .single();

    if (error) throw error;

    return data;
  },


  async update(id, row) {

    const { data, error } = await sb
      .from('gunluk_satis')
      .update(row)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return data;
  },


  async delete(id) {

    const { error } = await sb
      .from('gunluk_satis')
      .delete()
      .eq('id', id);

    if (error) throw error;

  }

};


// ============================================
// KONSERLER
// ============================================

const Konserler = {

  async getAll() {

    const { data, error } = await sb
      .from('konserler')
      .select('*')
      .order('tarih', { ascending: false });

    if (error) throw error;

    return data || [];
  },


  async add(row) {

    const { data, error } = await sb
      .from('konserler')
      .insert([row])
      .select()
      .single();

    if (error) throw error;

    return data;
  },


  async update(id, row) {

    const { data, error } = await sb
      .from('konserler')
      .update(row)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return data;
  },


  async delete(id) {

    const { error } = await sb
      .from('konserler')
      .delete()
      .eq('id', id);

    if (error) throw error;

  }

};


// ============================================
// ÜRÜNLER
// ============================================

const Urunler = {

  async getAll() {

    const { data, error } = await sb
      .from('urunler')
      .select('*');

    if (error) throw error;

    return data || [];
  },


  async add(row) {

    const { data, error } = await sb
      .from('urunler')
      .insert([row])
      .select()
      .single();

    if (error) throw error;

    return data;
  },


  async update(id, row) {

    const { data, error } = await sb
      .from('urunler')
      .update(row)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return data;
  },


  async delete(id) {

    const { error } = await sb
      .from('urunler')
      .delete()
      .eq('id', id);

    if (error) throw error;

  }

};


// ============================================
// PERSONEL
// ============================================

const Personel = {

  async getAll() {

    const { data, error } = await sb
      .from('personel')
      .select('*');

    if (error) throw error;

    return data || [];
  },


  async add(row) {

    const { data, error } = await sb
      .from('personel')
      .insert([row])
      .select()
      .single();

    if (error) throw error;

    return data;
  },


  async delete(id) {

    const { error } = await sb
      .from('personel')
      .delete()
      .eq('id', id);

    if (error) throw error;

  }

};


// ============================================
// GİDERLER
// ============================================

const Giderler = {

  async getAll() {

    const { data, error } = await sb
      .from('giderler')
      .select('*')
      .order('tarih', { ascending: false });

    if (error) throw error;

    return data || [];
  },


  async add(row) {

    const { data, error } = await sb
      .from('giderler')
      .insert([row])
      .select()
      .single();

    if (error) throw error;

    return data;
  },


  async delete(id) {

    const { error } = await sb
      .from('giderler')
      .delete()
      .eq('id', id);

    if (error) throw error;

  }

};