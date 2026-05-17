import type { Pool } from 'mysql2/promise'

function makeSections(heroBackground: string, heroOverlay = 40, isBirthday = false, isBaby = false) {
  return [
    {
      section_type: 'hero', sort_order: 0, is_enabled: true,
      config: {
        bride_name: '', groom_name: '',
        celebrant_name: isBirthday || isBaby ? '' : undefined,
        age_milestone: isBirthday ? '' : undefined,
        tagline: isBirthday ? "Let's celebrate" : isBaby ? 'Welcome to the world' : 'Trọn đời bên nhau',
        show_countdown: true, background_overlay: heroOverlay,
        background_url: heroBackground,
      },
    },
    {
      section_type: 'event_info', sort_order: 1, is_enabled: true,
      config: {
        invitation_message: isBirthday || isBaby 
          ? 'Trân trọng kính mời Quý khách đến chung vui cùng gia đình chúng tôi.'
          : 'Với tất cả tình yêu thương, chúng tôi trân trọng kính mời Quý khách đến tham dự hôn lễ của chúng tôi.',
        ceremonies: isBirthday || isBaby ? [
          { name: 'Tiệc mừng', date: '', time: '18:00', venue: 'Nhà hàng', address: '' },
        ] : [
          { name: 'Lễ vu quy', date: '', time: '08:00', venue: 'Nhà hàng tiệc cưới', address: '' },
          { name: 'Lễ thành hôn', date: '', time: '17:00', venue: 'Trung tâm hội nghị', address: '' },
        ],
      },
    },
    {
      section_type: 'family_info', sort_order: 2, is_enabled: false,
      config: {
        groom_family: { family_name: 'Nhà Trai', father: { title: 'Ông', name: '' }, mother: { title: 'Bà', name: '' } },
        bride_family: { family_name: 'Nhà Gái', father: { title: 'Ông', name: '' }, mother: { title: 'Bà', name: '' } },
      },
    },
    {
      section_type: 'gallery', sort_order: 3, is_enabled: false,
      config: { images: [], layout: 'grid' },
    },
    {
      section_type: 'timeline', sort_order: 4, is_enabled: false,
      config: {
        title: isBirthday || isBaby ? 'Hành trình' : 'Hành trình của chúng tôi',
        events: [
          { date: '', title: 'Bắt đầu', description: 'Câu chuyện bắt đầu từ đây...' },
        ],
      },
    },
    {
      section_type: 'countdown', sort_order: 5, is_enabled: true,
      config: { title: 'Đếm ngược đến ngày vui' },
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
        title: 'Gửi quà',
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

const NEW_TEMPLATES = [
  // 5 WEDDING
  {
    category: 'wedding', slug: 'cuoi-rong-phung', name: 'Rồng Phụng', layout_type: 'traditional-viet',
    description: 'Phong cách truyền thống Việt Nam với hoạ tiết Rồng Phụng.', plan_required: 'pro',
    thumbnail_url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=1000&fit=crop&q=85',
    hero_background: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920&q=85',
    theme: { primary_color: '#8B0000', secondary_color: '#B22222', background_color: '#FFF8F8', text_color: '#2D0A0E', accent_color: '#FFD700', font_heading: 'Cinzel Decorative', font_body: 'Inter', border_radius: 'none', animation: 'fade' },
    overlay: 45
  },
  {
    category: 'wedding', slug: 'cuoi-noir-elegance', name: 'Noir Elegance', layout_type: 'luxury-dark',
    description: 'Sang trọng và bí ẩn với tone đen vàng metallic.', plan_required: 'pro',
    thumbnail_url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&h=1000&fit=crop&q=85',
    hero_background: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=1920&q=85',
    theme: { primary_color: '#111111', secondary_color: '#222222', background_color: '#0F0F0F', text_color: '#FFFFFF', accent_color: '#D4A73A', font_heading: 'Playfair Display', font_body: 'Nunito', border_radius: 'sm', animation: 'none' },
    overlay: 60
  },
  {
    category: 'wedding', slug: 'cuoi-hoa-hong-co-dien', name: 'Hoa Hồng Cổ Điển', layout_type: 'rustic',
    description: 'Phong cách Rustic ấm cúng với tone màu hoa hồng đất.', plan_required: 'free',
    thumbnail_url: 'https://images.unsplash.com/photo-1537633552985-df8429e8048b?w=600&h=1000&fit=crop&q=85',
    hero_background: 'https://images.unsplash.com/photo-1537633552985-df8429e8048b?w=1920&q=85',
    theme: { primary_color: '#8C564B', secondary_color: '#A0522D', background_color: '#FAF0E6', text_color: '#3E2723', accent_color: '#D2B48C', font_heading: 'Dancing Script', font_body: 'Lato', border_radius: 'md', animation: 'fade' },
    overlay: 30
  },
  {
    category: 'wedding', slug: 'cuoi-thien-nhien-bien', name: 'Thiên Nhiên Biển', layout_type: 'romantic-photo',
    description: 'Khung cảnh lãng mạn hòa mình vào thiên nhiên biển khơi.', plan_required: 'free',
    thumbnail_url: 'https://images.unsplash.com/photo-1508672019048-805bab0cf2c3?w=600&h=1000&fit=crop&q=85',
    hero_background: 'https://images.unsplash.com/photo-1508672019048-805bab0cf2c3?w=1920&q=85',
    theme: { primary_color: '#006994', secondary_color: '#008B8B', background_color: '#F0FFFF', text_color: '#003366', accent_color: '#87CEEB', font_heading: 'Great Vibes', font_body: 'Nunito', border_radius: 'lg', animation: 'slide' },
    overlay: 20
  },
  {
    category: 'wedding', slug: 'cuoi-geometry', name: 'Geometry', layout_type: 'minimalist',
    description: 'Đường nét hình học sắc sảo và tối giản.', plan_required: 'free',
    thumbnail_url: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=600&h=1000&fit=crop&q=85',
    hero_background: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=1920&q=85',
    theme: { primary_color: '#333333', secondary_color: '#666666', background_color: '#FFFFFF', text_color: '#1A1A1A', accent_color: '#999999', font_heading: 'Inter', font_body: 'Inter', border_radius: 'none', animation: 'none' },
    overlay: 15
  },

  // 5 BIRTHDAY
  {
    category: 'birthday', slug: 'sn-neon-party', name: 'Neon Party', layout_type: 'birthday-playful',
    description: 'Phong cách tiệc tùng rực rỡ với ánh sáng neon sôi động.', plan_required: 'pro',
    thumbnail_url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&h=1000&fit=crop&q=85',
    hero_background: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1920&q=85',
    theme: { primary_color: '#FF00FF', secondary_color: '#00FFFF', background_color: '#111111', text_color: '#FFFFFF', accent_color: '#FFFF00', font_heading: 'Inter', font_body: 'Inter', border_radius: 'lg', animation: 'fade' },
    overlay: 50, isBirthday: true
  },
  {
    category: 'birthday', slug: 'sn-sweet-sixteen', name: 'Sweet Sixteen', layout_type: 'birthday-elegant',
    description: 'Thanh lịch và ngọt ngào dành cho ngày sinh nhật 16 tuổi.', plan_required: 'free',
    thumbnail_url: 'https://images.unsplash.com/photo-1558636508-e0db3814bd1d?w=600&h=1000&fit=crop&q=85',
    hero_background: 'https://images.unsplash.com/photo-1558636508-e0db3814bd1d?w=1920&q=85',
    theme: { primary_color: '#FF69B4', secondary_color: '#FFB6C1', background_color: '#FFF0F5', text_color: '#4B0082', accent_color: '#DA70D6', font_heading: 'Dancing Script', font_body: 'Nunito', border_radius: 'lg', animation: 'slide' },
    overlay: 30, isBirthday: true
  },
  {
    category: 'birthday', slug: 'sn-golden-age', name: 'Golden Age', layout_type: 'luxury-dark',
    description: 'Trang trọng và trưởng thành với tông đen và gold.', plan_required: 'pro',
    thumbnail_url: 'https://images.unsplash.com/photo-1533227260871-0f868a8f5cc0?w=600&h=1000&fit=crop&q=85',
    hero_background: 'https://images.unsplash.com/photo-1533227260871-0f868a8f5cc0?w=1920&q=85',
    theme: { primary_color: '#B8860B', secondary_color: '#DAA520', background_color: '#000000', text_color: '#FFFFFF', accent_color: '#FFD700', font_heading: 'Playfair Display', font_body: 'Lato', border_radius: 'md', animation: 'fade' },
    overlay: 60, isBirthday: true
  },
  {
    category: 'birthday', slug: 'sn-garden-tea', name: 'Garden Tea', layout_type: 'botanical',
    description: 'Tiệc trà nhẹ nhàng ngoài vườn với nhiều hoa.', plan_required: 'free',
    thumbnail_url: 'https://images.unsplash.com/photo-1464699908537-0954e50791ee?w=600&h=1000&fit=crop&q=85',
    hero_background: 'https://images.unsplash.com/photo-1464699908537-0954e50791ee?w=1920&q=85',
    theme: { primary_color: '#556B2F', secondary_color: '#8FBC8F', background_color: '#F5FFFA', text_color: '#2F4F4F', accent_color: '#9ACD32', font_heading: 'Cormorant Garamond', font_body: 'Raleway', border_radius: 'lg', animation: 'fade' },
    overlay: 25, isBirthday: true
  },
  {
    category: 'birthday', slug: 'sn-retro-vibes', name: 'Retro Vibes', layout_type: 'birthday-playful',
    description: 'Sắc màu hoài cổ mang phong cách thập niên 80, 90.', plan_required: 'free',
    thumbnail_url: 'https://images.unsplash.com/photo-1550684848-FAC1C5B4E853?w=600&h=1000&fit=crop&q=85',
    hero_background: 'https://images.unsplash.com/photo-1550684848-FAC1C5B4E853?w=1920&q=85',
    theme: { primary_color: '#FF4500', secondary_color: '#FFA500', background_color: '#FFF8DC', text_color: '#8B0000', accent_color: '#FFD700', font_heading: 'Inter', font_body: 'Inter', border_radius: 'md', animation: 'slide' },
    overlay: 40, isBirthday: true
  },

  // 3 BABY SHOWER
  {
    category: 'baby_shower', slug: 'baby-pastel-clouds', name: 'Pastel Clouds', layout_type: 'baby-soft',
    description: 'Đáng yêu và êm dịu như những đám mây pastel.', plan_required: 'free',
    thumbnail_url: 'https://images.unsplash.com/photo-1519689680058-324335c77eba?w=600&h=1000&fit=crop&q=85',
    hero_background: 'https://images.unsplash.com/photo-1519689680058-324335c77eba?w=1920&q=85',
    theme: { primary_color: '#87CEFA', secondary_color: '#B0E0E6', background_color: '#F0F8FF', text_color: '#4682B4', accent_color: '#ADD8E6', font_heading: 'Nunito', font_body: 'Nunito', border_radius: 'lg', animation: 'slide' },
    overlay: 15, isBaby: true
  },
  {
    category: 'baby_shower', slug: 'baby-animal-safari', name: 'Animal Safari', layout_type: 'baby-soft',
    description: 'Vui nhộn với những loài động vật ngộ nghĩnh.', plan_required: 'free',
    thumbnail_url: 'https://images.unsplash.com/photo-1535205312386-3532292f7093?w=600&h=1000&fit=crop&q=85',
    hero_background: 'https://images.unsplash.com/photo-1535205312386-3532292f7093?w=1920&q=85',
    theme: { primary_color: '#9ACD32', secondary_color: '#ADFF2F', background_color: '#F5FFFA', text_color: '#556B2F', accent_color: '#7FFF00', font_heading: 'Nunito', font_body: 'Nunito', border_radius: 'lg', animation: 'fade' },
    overlay: 20, isBaby: true
  },
  {
    category: 'baby_shower', slug: 'baby-little-princess', name: 'Little Princess', layout_type: 'botanical',
    description: 'Chủ đề công chúa ngọt ngào với vương miện và tông hồng.', plan_required: 'pro',
    thumbnail_url: 'https://images.unsplash.com/photo-1518895949257-7621c3c78617?w=600&h=1000&fit=crop&q=85',
    hero_background: 'https://images.unsplash.com/photo-1518895949257-7621c3c78617?w=1920&q=85',
    theme: { primary_color: '#FF69B4', secondary_color: '#FFC0CB', background_color: '#FFF0F5', text_color: '#C71585', accent_color: '#FF1493', font_heading: 'Dancing Script', font_body: 'Nunito', border_radius: 'lg', animation: 'fade' },
    overlay: 25, isBaby: true
  },

  // 3 HOUSE WARMING
  {
    category: 'house_warming', slug: 'hw-cozy-home', name: 'Cozy Home', layout_type: 'house-warm',
    description: 'Phong cách ấm áp mừng gia đình mới dọn vào tổ ấm.', plan_required: 'free',
    thumbnail_url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=600&h=1000&fit=crop&q=85',
    hero_background: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1920&q=85',
    theme: { primary_color: '#D2691E', secondary_color: '#CD853F', background_color: '#FAEBD7', text_color: '#8B4513', accent_color: '#DEB887', font_heading: 'Playfair Display', font_body: 'Lato', border_radius: 'sm', animation: 'fade' },
    overlay: 30
  },
  {
    category: 'house_warming', slug: 'hw-modern-living', name: 'Modern Living', layout_type: 'minimalist',
    description: 'Tân gia với phong cách nội thất tối giản, hiện đại.', plan_required: 'free',
    thumbnail_url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&h=1000&fit=crop&q=85',
    hero_background: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1920&q=85',
    theme: { primary_color: '#2F4F4F', secondary_color: '#696969', background_color: '#F8F8FF', text_color: '#000000', accent_color: '#A9A9A9', font_heading: 'Inter', font_body: 'Inter', border_radius: 'none', animation: 'none' },
    overlay: 25
  },
  {
    category: 'house_warming', slug: 'hw-botanical-house', name: 'Botanical House', layout_type: 'botanical',
    description: 'Không gian sống tràn ngập sắc xanh cây cỏ tự nhiên.', plan_required: 'pro',
    thumbnail_url: 'https://images.unsplash.com/photo-1550581190-9c1c48d21d6c?w=600&h=1000&fit=crop&q=85',
    hero_background: 'https://images.unsplash.com/photo-1550581190-9c1c48d21d6c?w=1920&q=85',
    theme: { primary_color: '#228B22', secondary_color: '#32CD32', background_color: '#F0FFF0', text_color: '#006400', accent_color: '#90EE90', font_heading: 'Cormorant Garamond', font_body: 'Nunito', border_radius: 'lg', animation: 'slide' },
    overlay: 35
  }
]

export async function up(pool: Pool) {
  // Add new category
  await pool.query(`
    INSERT IGNORE INTO template_categories (slug, name, sort_order) VALUES
    ('house_warming', 'Tân gia / Mở mới', 5)
  `)

  // Get category IDs
  const [catRows] = await pool.query<Array<{ id: number, slug: string } & import('mysql2').RowDataPacket>>(
    'SELECT id, slug FROM template_categories'
  )
  const categories = Object.fromEntries(catRows.map(row => [row.slug, row.id]))

  for (const t of NEW_TEMPLATES) {
    const categoryId = categories[t.category]
    if (!categoryId) {
      console.warn(`[033] Category not found for ${t.category}`)
      continue
    }

    const sections = makeSections(t.hero_background, t.overlay, t.isBirthday, t.isBaby)
    const defaultConfig = JSON.stringify({ theme: t.theme, sections, layout_type: t.layout_type })

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

  console.log("[033] Inserted " + NEW_TEMPLATES.length + " new diverse templates")
}

export async function down(pool: Pool) {
  const slugs = NEW_TEMPLATES.map(t => t.slug)
  if (slugs.length > 0) {
    await pool.query(
      `DELETE FROM templates WHERE slug IN (${slugs.map(() => '?').join(',')})`,
      slugs
    )
  }

  await pool.query('DELETE FROM template_categories WHERE slug = ?', ['house_warming'])
}
