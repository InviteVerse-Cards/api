import type { Pool } from 'mysql2/promise'

function makeSections(overrides: Record<string, Record<string, unknown>> = {}) {
  return [
    {
      section_type: 'hero', sort_order: 0, is_enabled: true,
      config: {
        bride_name: '', groom_name: '', tagline: 'Trọn đời bên nhau',
        show_countdown: true, background_overlay: 35,
        ...overrides['hero'],
      },
    },
    {
      section_type: 'event_info', sort_order: 1, is_enabled: true,
      config: {
        invitation_message: 'Với tất cả tình yêu thương, chúng tôi trân trọng kính mời Quý khách đến tham dự hôn lễ của chúng tôi.',
        ceremonies: [
          {
            name: 'Lễ vu quy', date: '', time: '08:00',
            venue: 'Nhà hàng tiệc cưới', address: '',
          },
          {
            name: 'Lễ thành hôn', date: '', time: '17:00',
            venue: 'Trung tâm hội nghị', address: '',
          },
        ],
        ...overrides['event_info'],
      },
    },
    {
      section_type: 'gallery', sort_order: 2, is_enabled: false,
      config: { images: [], layout: 'grid', ...overrides['gallery'] },
    },
    {
      section_type: 'timeline', sort_order: 3, is_enabled: false,
      config: {
        title: 'Hành trình của chúng tôi',
        events: [
          { date: '', title: 'Lần đầu gặp gỡ', description: 'Câu chuyện tình yêu bắt đầu từ đây...' },
          { date: '', title: 'Cầu hôn', description: 'Một khoảnh khắc đáng nhớ không thể nào quên.' },
          { date: '', title: 'Đính hôn', description: 'Chúng tôi chính thức hứa hẹn cùng nhau.' },
          { date: '', title: 'Ngày cưới', description: 'Và từ đây, một hành trình mới bắt đầu.' },
        ],
        ...overrides['timeline'],
      },
    },
    {
      section_type: 'countdown', sort_order: 4, is_enabled: true,
      config: { title: 'Đếm ngược đến ngày trọng đại', ...overrides['countdown'] },
    },
    {
      section_type: 'map', sort_order: 5, is_enabled: false,
      config: { venue_name: '', address: '', embed_url: '', ...overrides['map'] },
    },
    {
      section_type: 'rsvp', sort_order: 6, is_enabled: true,
      config: {
        title: 'Xác nhận tham dự',
        subtitle: 'Sự hiện diện của bạn là niềm vui lớn nhất của chúng tôi',
        ...overrides['rsvp'],
      },
    },
    {
      section_type: 'music', sort_order: 7, is_enabled: false,
      config: { enabled: false, autoplay: false, track_name: '', track_url: '', ...overrides['music'] },
    },
    {
      section_type: 'wishes', sort_order: 8, is_enabled: true,
      config: { title: 'Lời chúc', ...overrides['wishes'] },
    },
  ]
}

// Background images define each template's visual identity — users do NOT change these
const TEMPLATES = [
  {
    slug: 'cuoi-hong-blossom',
    name: 'Hồng Blossom',
    description: 'Lãng mạn và nhẹ nhàng, tone hồng pastel thanh lịch. Phù hợp đám cưới mùa xuân.',
    plan_required: 'free',
    thumbnail_url: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=600&h=800&fit=crop&q=80',
    hero_background: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1920&q=80',
    theme: {
      primary_color: '#C2637A',
      secondary_color: '#E8A0B0',
      background_color: '#FFF5F7',
      text_color: '#3D2830',
      accent_color: '#F2C4CE',
      font_heading: 'Great Vibes',
      font_body: 'Lato',
      border_radius: 'md',
      animation: 'fade',
    },
  },
  {
    slug: 'cuoi-xanh-sage',
    name: 'Sage Garden',
    description: 'Tươi mát và tự nhiên với tông xanh sage. Phù hợp đám cưới ngoài trời, vườn hoa.',
    plan_required: 'free',
    thumbnail_url: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=600&h=800&fit=crop&q=80',
    hero_background: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=1920&q=80',
    theme: {
      primary_color: '#5C8A6B',
      secondary_color: '#8FB89E',
      background_color: '#F4F8F5',
      text_color: '#253328',
      accent_color: '#C8DFD0',
      font_heading: 'Cormorant Garamond',
      font_body: 'Nunito',
      border_radius: 'lg',
      animation: 'slide',
    },
  },
  {
    slug: 'cuoi-vang-gold',
    name: 'Golden Luxury',
    description: 'Sang trọng và đẳng cấp với sắc vàng gold. Phù hợp đám cưới trang trọng, tiệc tối.',
    plan_required: 'free',
    thumbnail_url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&h=800&fit=crop&q=80',
    hero_background: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=1920&q=80',
    theme: {
      primary_color: '#B8922A',
      secondary_color: '#D4B86A',
      background_color: '#FDFBF2',
      text_color: '#2A2010',
      accent_color: '#EEE0B0',
      font_heading: 'Cinzel Decorative',
      font_body: 'Raleway',
      border_radius: 'none',
      animation: 'fade',
    },
  },
  {
    slug: 'cuoi-trang-minimal',
    name: 'White Minimal',
    description: 'Tinh tế và hiện đại. Thiết kế tối giản, không gian trắng sạch sẽ và sang trọng.',
    plan_required: 'free',
    thumbnail_url: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=600&h=800&fit=crop&q=80',
    hero_background: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=1920&q=80',
    theme: {
      primary_color: '#2D3748',
      secondary_color: '#718096',
      background_color: '#FFFFFF',
      text_color: '#1A202C',
      accent_color: '#EDF2F7',
      font_heading: 'DM Serif Display',
      font_body: 'Inter',
      border_radius: 'sm',
      animation: 'none',
    },
  },
  {
    slug: 'cuoi-tim-lavender',
    name: 'Lavender Dream',
    description: 'Mộng mơ và lãng mạn với sắc tím lavender. Dành cho những tâm hồn yêu thích sự thơ mộng.',
    plan_required: 'pro',
    thumbnail_url: 'https://images.unsplash.com/photo-1464699908537-0954e50791ee?w=600&h=800&fit=crop&q=80',
    hero_background: 'https://images.unsplash.com/photo-1464699908537-0954e50791ee?w=1920&q=80',
    theme: {
      primary_color: '#7C3AED',
      secondary_color: '#A78BFA',
      background_color: '#F5F3FF',
      text_color: '#2D1B69',
      accent_color: '#EDE9FE',
      font_heading: 'Dancing Script',
      font_body: 'Poppins',
      border_radius: 'lg',
      animation: 'slide',
    },
  },
]

export async function up(pool: Pool) {
  const [catRows] = await pool.query<any[]>(
    'SELECT id FROM template_categories WHERE slug = ?', ['wedding']
  )
  const categoryId = catRows[0]?.id
  if (!categoryId) return

  for (const t of TEMPLATES) {
    const sections = makeSections({
      hero: { background_url: t.hero_background, background_overlay: 40 },
    })
    const defaultConfig = JSON.stringify({ theme: t.theme, sections })
    await pool.query(
      `INSERT INTO templates (category_id, slug, name, description, thumbnail_url, plan_required, is_active, default_config)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         description = VALUES(description),
         thumbnail_url = VALUES(thumbnail_url),
         default_config = VALUES(default_config),
         updated_at = NOW()`,
      [categoryId, t.slug, t.name, t.description, t.thumbnail_url, t.plan_required, defaultConfig]
    )
  }
}

export async function down(pool: Pool) {
  await pool.query(
    `DELETE FROM templates WHERE slug IN (${TEMPLATES.map(() => '?').join(',')})`,
    TEMPLATES.map(t => t.slug)
  )
}
