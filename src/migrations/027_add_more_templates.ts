import type { Pool } from 'mysql2/promise'

// ─── Section builder ─────────────────────────────────────────────────────────

function makeSections(heroBackground: string, heroOverlay = 40) {
  return [
    {
      section_type: 'hero', sort_order: 0, is_enabled: true,
      config: {
        bride_name: '', groom_name: '', tagline: 'Trọn đời bên nhau',
        show_countdown: true, background_overlay: heroOverlay,
        background_url: heroBackground,
      },
    },
    {
      section_type: 'event_info', sort_order: 1, is_enabled: true,
      config: {
        invitation_message: 'Với tất cả tình yêu thương, chúng tôi trân trọng kính mời Quý khách đến tham dự hôn lễ của chúng tôi.',
        ceremonies: [
          { name: 'Lễ vu quy', date: '', time: '08:00', venue: 'Nhà hàng tiệc cưới', address: '' },
          { name: 'Lễ thành hôn', date: '', time: '17:00', venue: 'Trung tâm hội nghị', address: '' },
        ],
      },
    },
    {
      section_type: 'family_info', sort_order: 2, is_enabled: false,
      config: {
        groom_family: {
          family_name: 'Nhà Trai',
          father: { title: 'Ông', name: '' },
          mother: { title: 'Bà', name: '' },
        },
        bride_family: {
          family_name: 'Nhà Gái',
          father: { title: 'Ông', name: '' },
          mother: { title: 'Bà', name: '' },
        },
      },
    },
    {
      section_type: 'gallery', sort_order: 3, is_enabled: false,
      config: { images: [], layout: 'grid' },
    },
    {
      section_type: 'timeline', sort_order: 4, is_enabled: false,
      config: {
        title: 'Hành trình của chúng tôi',
        events: [
          { date: '', title: 'Lần đầu gặp gỡ', description: 'Câu chuyện tình yêu bắt đầu từ đây...' },
          { date: '', title: 'Cầu hôn', description: 'Một khoảnh khắc đáng nhớ không thể nào quên.' },
          { date: '', title: 'Đính hôn', description: 'Chúng tôi chính thức hứa hẹn cùng nhau.' },
          { date: '', title: 'Ngày cưới', description: 'Và từ đây, một hành trình mới bắt đầu.' },
        ],
      },
    },
    {
      section_type: 'countdown', sort_order: 5, is_enabled: true,
      config: { title: 'Đếm ngược đến ngày trọng đại' },
    },
    {
      section_type: 'map', sort_order: 6, is_enabled: false,
      config: { venue_name: '', address: '', embed_url: '' },
    },
    {
      section_type: 'rsvp', sort_order: 7, is_enabled: true,
      config: {
        title: 'Xác nhận tham dự',
        subtitle: 'Sự hiện diện của bạn là niềm vui lớn nhất của chúng tôi',
      },
    },
    {
      section_type: 'bank_transfer', sort_order: 8, is_enabled: false,
      config: {
        title: 'Mừng cưới',
        bank_id: '',
        account_number: '',
        account_name: '',
        note: 'Sự hiện diện của bạn là món quà quý nhất với chúng tôi',
      },
    },
    {
      section_type: 'music', sort_order: 9, is_enabled: false,
      config: { enabled: false, autoplay: false, track_name: '', track_url: '' },
    },
    {
      section_type: 'wishes', sort_order: 10, is_enabled: true,
      config: { title: 'Lời chúc' },
    },
  ]
}

// ─── All templates (existing 5 + 10 new) ─────────────────────────────────────
// Force-update existing ones (thumbnail_url was null in DB due to migration ordering)
// Add new ones for Phase 7 (5 → 15 templates)

const ALL_TEMPLATES = [
  // ── Existing 5 — force-update data ──────────────────────────────────────────
  {
    slug: 'cuoi-hong-blossom',
    name: 'Hồng Blossom',
    description: 'Lãng mạn và nhẹ nhàng, tone hồng pastel thanh lịch. Phù hợp đám cưới mùa xuân.',
    plan_required: 'free',
    thumbnail_url: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=600&h=1000&fit=crop&q=85',
    hero_background: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1920&q=85',
    theme: {
      primary_color: '#C2637A', secondary_color: '#E8A0B0',
      background_color: '#FFF5F7', text_color: '#3D2830', accent_color: '#F2C4CE',
      font_heading: 'Great Vibes', font_body: 'Lato',
      border_radius: 'md', animation: 'fade',
    },
    overlay: 35,
  },
  {
    slug: 'cuoi-xanh-sage',
    name: 'Sage Garden',
    description: 'Tươi mát và tự nhiên với tông xanh sage. Phù hợp đám cưới ngoài trời, vườn hoa.',
    plan_required: 'free',
    thumbnail_url: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=600&h=1000&fit=crop&q=85',
    hero_background: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=1920&q=85',
    theme: {
      primary_color: '#5C8A6B', secondary_color: '#8FB89E',
      background_color: '#F4F8F5', text_color: '#253328', accent_color: '#C8DFD0',
      font_heading: 'Cormorant Garamond', font_body: 'Nunito',
      border_radius: 'lg', animation: 'slide',
    },
    overlay: 38,
  },
  {
    slug: 'cuoi-vang-gold',
    name: 'Golden Luxury',
    description: 'Sang trọng và đẳng cấp với sắc vàng gold. Phù hợp đám cưới trang trọng, tiệc tối.',
    plan_required: 'free',
    thumbnail_url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&h=1000&fit=crop&q=85',
    hero_background: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=1920&q=85',
    theme: {
      primary_color: '#B8922A', secondary_color: '#D4B86A',
      background_color: '#FDFBF2', text_color: '#2A2010', accent_color: '#EEE0B0',
      font_heading: 'Cinzel Decorative', font_body: 'Raleway',
      border_radius: 'none', animation: 'fade',
    },
    overlay: 42,
  },
  {
    slug: 'cuoi-trang-minimal',
    name: 'White Minimal',
    description: 'Tinh tế và hiện đại. Thiết kế tối giản, không gian trắng sạch sẽ và sang trọng.',
    plan_required: 'free',
    thumbnail_url: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=600&h=1000&fit=crop&q=85',
    hero_background: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=1920&q=85',
    theme: {
      primary_color: '#2D3748', secondary_color: '#718096',
      background_color: '#FFFFFF', text_color: '#1A202C', accent_color: '#EDF2F7',
      font_heading: 'DM Serif Display', font_body: 'Inter',
      border_radius: 'sm', animation: 'none',
    },
    overlay: 30,
  },
  {
    slug: 'cuoi-tim-lavender',
    name: 'Lavender Dream',
    description: 'Mộng mơ và lãng mạn với sắc tím lavender. Dành cho những tâm hồn yêu thích sự thơ mộng.',
    plan_required: 'pro',
    thumbnail_url: 'https://images.unsplash.com/photo-1464699908537-0954e50791ee?w=600&h=1000&fit=crop&q=85',
    hero_background: 'https://images.unsplash.com/photo-1464699908537-0954e50791ee?w=1920&q=85',
    theme: {
      primary_color: '#7C3AED', secondary_color: '#A78BFA',
      background_color: '#F5F3FF', text_color: '#2D1B69', accent_color: '#EDE9FE',
      font_heading: 'Dancing Script', font_body: 'Poppins',
      border_radius: 'lg', animation: 'slide',
    },
    overlay: 40,
  },

  // ── 10 New Templates (Phase 7) ───────────────────────────────────────────────
  {
    slug: 'cuoi-do-truyen-thong',
    name: 'Đỏ Truyền Thống',
    description: 'Ấm áp và trang trọng theo phong cách truyền thống Việt Nam với gam đỏ đặc trưng.',
    plan_required: 'free',
    thumbnail_url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=1000&fit=crop&q=85',
    hero_background: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920&q=85',
    theme: {
      primary_color: '#C41E3A', secondary_color: '#E85D75',
      background_color: '#FFF8F8', text_color: '#2D0A0E', accent_color: '#FFD5D5',
      font_heading: 'Cinzel Decorative', font_body: 'Raleway',
      border_radius: 'sm', animation: 'fade',
    },
    overlay: 45,
  },
  {
    slug: 'cuoi-xanh-royal',
    name: 'Royal Blue',
    description: 'Sang trọng và uy nghi với sắc xanh hoàng gia. Phù hợp lễ cưới quy mô lớn, long trọng.',
    plan_required: 'pro',
    thumbnail_url: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=600&h=1000&fit=crop&q=85',
    hero_background: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=1920&q=85',
    theme: {
      primary_color: '#1B3A6B', secondary_color: '#4A6FA5',
      background_color: '#F0F4FC', text_color: '#0D1F3C', accent_color: '#BDD1F5',
      font_heading: 'Cormorant Garamond', font_body: 'Nunito',
      border_radius: 'none', animation: 'fade',
    },
    overlay: 48,
  },
  {
    slug: 'cuoi-cam-rustic',
    name: 'Rustic Amber',
    description: 'Mộc mạc và ấm cúng với tone cam/nâu đất. Phù hợp đám cưới phong cách bohemian, dã ngoại.',
    plan_required: 'free',
    thumbnail_url: 'https://images.unsplash.com/photo-1537633552985-df8429e8048b?w=600&h=1000&fit=crop&q=85',
    hero_background: 'https://images.unsplash.com/photo-1537633552985-df8429e8048b?w=1920&q=85',
    theme: {
      primary_color: '#B5651D', secondary_color: '#D4884A',
      background_color: '#FDF6EF', text_color: '#3D1C02', accent_color: '#F5D6B5',
      font_heading: 'Playfair Display', font_body: 'Lato',
      border_radius: 'md', animation: 'slide',
    },
    overlay: 40,
  },
  {
    slug: 'cuoi-xam-modern',
    name: 'Slate Modern',
    description: 'Hiện đại và lịch lãm với tông xám xanh tinh tế. Phong cách tối giản đương đại.',
    plan_required: 'free',
    thumbnail_url: 'https://images.unsplash.com/photo-1490914327404-89efa662e4b2?w=600&h=1000&fit=crop&q=85',
    hero_background: 'https://images.unsplash.com/photo-1490914327404-89efa662e4b2?w=1920&q=85',
    theme: {
      primary_color: '#374151', secondary_color: '#6B7280',
      background_color: '#F9FAFB', text_color: '#111827', accent_color: '#D1D5DB',
      font_heading: 'DM Serif Display', font_body: 'Inter',
      border_radius: 'sm', animation: 'none',
    },
    overlay: 35,
  },
  {
    slug: 'cuoi-hong-cherry',
    name: 'Cherry Blossom',
    description: 'Dịu dàng như hoa anh đào, nhẹ nhàng như buổi sáng mùa xuân. Phong cách Nhật Bản tinh tế.',
    plan_required: 'pro',
    thumbnail_url: 'https://images.unsplash.com/photo-1522748906645-95d8adfd52c7?w=600&h=1000&fit=crop&q=85',
    hero_background: 'https://images.unsplash.com/photo-1522748906645-95d8adfd52c7?w=1920&q=85',
    theme: {
      primary_color: '#DB2777', secondary_color: '#F472B6',
      background_color: '#FFF0F6', text_color: '#500724', accent_color: '#FCE7F3',
      font_heading: 'Dancing Script', font_body: 'Poppins',
      border_radius: 'lg', animation: 'fade',
    },
    overlay: 35,
  },
  {
    slug: 'cuoi-xanh-bien',
    name: 'Ocean Breeze',
    description: 'Tươi mát như gió biển, trong xanh như đại dương. Lý tưởng cho đám cưới bãi biển.',
    plan_required: 'free',
    thumbnail_url: 'https://images.unsplash.com/photo-1508672019048-805bab0cf2c3?w=600&h=1000&fit=crop&q=85',
    hero_background: 'https://images.unsplash.com/photo-1508672019048-805bab0cf2c3?w=1920&q=85',
    theme: {
      primary_color: '#0284C7', secondary_color: '#38BDF8',
      background_color: '#F0F9FF', text_color: '#0C4A6E', accent_color: '#BAE6FD',
      font_heading: 'Cormorant Garamond', font_body: 'Nunito',
      border_radius: 'lg', animation: 'slide',
    },
    overlay: 38,
  },
  {
    slug: 'cuoi-nau-earth',
    name: 'Earth & Olive',
    description: 'Hòa quyện với thiên nhiên qua tông màu đất và xanh olive. Tự nhiên, bền vững, đặc biệt.',
    plan_required: 'free',
    thumbnail_url: 'https://images.unsplash.com/photo-1433878455169-4698e60005b1?w=600&h=1000&fit=crop&q=85',
    hero_background: 'https://images.unsplash.com/photo-1433878455169-4698e60005b1?w=1920&q=85',
    theme: {
      primary_color: '#78350F', secondary_color: '#92400E',
      background_color: '#FEFCE8', text_color: '#1C0A00', accent_color: '#FDE68A',
      font_heading: 'Playfair Display', font_body: 'Lato',
      border_radius: 'md', animation: 'fade',
    },
    overlay: 42,
  },
  {
    slug: 'cuoi-kem-ivory',
    name: 'Ivory Classic',
    description: 'Cổ điển và vượt thời gian với tông kem ivory. Vẻ đẹp thuần khiết, sang trọng bậc nhất.',
    plan_required: 'pro',
    thumbnail_url: 'https://images.unsplash.com/photo-1532712938310-34cb3982ef74?w=600&h=1000&fit=crop&q=85',
    hero_background: 'https://images.unsplash.com/photo-1532712938310-34cb3982ef74?w=1920&q=85',
    theme: {
      primary_color: '#92400E', secondary_color: '#B45309',
      background_color: '#FFFBF0', text_color: '#1C1610', accent_color: '#FEF3C7',
      font_heading: 'Great Vibes', font_body: 'Raleway',
      border_radius: 'none', animation: 'fade',
    },
    overlay: 32,
  },
  {
    slug: 'cuoi-tim-hoang-gia',
    name: 'Purple Royale',
    description: 'Hoành tráng và huyền bí với sắc tím hoàng gia. Lựa chọn của những đám cưới độc đáo.',
    plan_required: 'pro',
    thumbnail_url: 'https://images.unsplash.com/photo-1553444836-bc6c8d340d56?w=600&h=1000&fit=crop&q=85',
    hero_background: 'https://images.unsplash.com/photo-1553444836-bc6c8d340d56?w=1920&q=85',
    theme: {
      primary_color: '#5B21B6', secondary_color: '#7C3AED',
      background_color: '#FAF5FF', text_color: '#2E1065', accent_color: '#E9D5FF',
      font_heading: 'Cinzel Decorative', font_body: 'Inter',
      border_radius: 'sm', animation: 'slide',
    },
    overlay: 50,
  },
  {
    slug: 'cuoi-hong-nude',
    name: 'Blush Nude',
    description: 'Nhẹ nhàng và tinh tế với tông hồng nude ấm áp. Vẻ đẹp nữ tính, dịu dàng.',
    plan_required: 'free',
    thumbnail_url: 'https://images.unsplash.com/photo-1519741347686-c1e0aadf4611?w=600&h=1000&fit=crop&q=85',
    hero_background: 'https://images.unsplash.com/photo-1519741347686-c1e0aadf4611?w=1920&q=85',
    theme: {
      primary_color: '#C48A72', secondary_color: '#DBA896',
      background_color: '#FFF9F7', text_color: '#3D1E14', accent_color: '#F5D8CF',
      font_heading: 'Dancing Script', font_body: 'Poppins',
      border_radius: 'lg', animation: 'fade',
    },
    overlay: 30,
  },
]

export async function up(pool: Pool) {
  const [catRows] = await pool.query<Array<{ id: number } & import('mysql2').RowDataPacket>>(
    'SELECT id FROM template_categories WHERE slug = ?', ['wedding']
  )
  const categoryId = catRows[0]?.id
  if (!categoryId) {
    console.warn('[027] Wedding category not found — skipping template seed')
    return
  }

  for (const t of ALL_TEMPLATES) {
    const sections = makeSections(t.hero_background, t.overlay ?? 40)
    const defaultConfig = JSON.stringify({ theme: t.theme, sections })

    await pool.query(
      `INSERT INTO templates (category_id, slug, name, description, thumbnail_url, plan_required, is_active, default_config)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?)
       ON DUPLICATE KEY UPDATE
         name          = VALUES(name),
         description   = VALUES(description),
         thumbnail_url = VALUES(thumbnail_url),
         plan_required = VALUES(plan_required),
         default_config = VALUES(default_config),
         is_active     = 1,
         updated_at    = NOW()`,
      [categoryId, t.slug, t.name, t.description, t.thumbnail_url, t.plan_required, defaultConfig]
    )
  }

  console.log(`[027] Upserted ${ALL_TEMPLATES.length} templates (5 updated + 10 new)`)
}

export async function down(pool: Pool) {
  const newSlugs = ALL_TEMPLATES.slice(5).map(t => t.slug)
  if (newSlugs.length > 0) {
    await pool.query(
      `DELETE FROM templates WHERE slug IN (${newSlugs.map(() => '?').join(',')})`,
      newSlugs
    )
  }
}
