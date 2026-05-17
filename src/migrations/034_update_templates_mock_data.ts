import type { Pool } from 'mysql2/promise'

interface TemplateRow {
  id: number
  slug: string
  name: string
  thumbnail_url?: string
  default_config: any
  category_slug: string
}

const TEMPLATE_LOOKUP: Record<string, { layout_type: string; theme: any }> = {
  // 15 Wedding Templates
  'cuoi-hong-blossom': {
    layout_type: 'botanical',
    theme: { primary_color: '#C2637A', secondary_color: '#E8A0B0', background_color: '#FFF5F7', text_color: '#3D2830', accent_color: '#F2C4CE', font_heading: 'Great Vibes', font_body: 'Lato', border_radius: 'md', animation: 'fade' }
  },
  'cuoi-xanh-sage': {
    layout_type: 'botanical',
    theme: { primary_color: '#5C8A6B', secondary_color: '#8FB89E', background_color: '#F4F8F5', text_color: '#253328', accent_color: '#C8DFD0', font_heading: 'Cormorant Garamond', font_body: 'Nunito', border_radius: 'lg', animation: 'slide' }
  },
  'cuoi-vang-gold': {
    layout_type: 'luxury-dark',
    theme: { primary_color: '#B8922A', secondary_color: '#D4B86A', background_color: '#FDFBF2', text_color: '#2A2010', accent_color: '#EEE0B0', font_heading: 'Cinzel Decorative', font_body: 'Raleway', border_radius: 'none', animation: 'fade' }
  },
  'cuoi-trang-minimal': {
    layout_type: 'minimalist',
    theme: { primary_color: '#2D3748', secondary_color: '#718096', background_color: '#FFFFFF', text_color: '#1A202C', accent_color: '#EDF2F7', font_heading: 'DM Serif Display', font_body: 'Inter', border_radius: 'sm', animation: 'none' }
  },
  'cuoi-tim-lavender': {
    layout_type: 'romantic-photo',
    theme: { primary_color: '#7C3AED', secondary_color: '#A78BFA', background_color: '#F5F3FF', text_color: '#2D1B69', accent_color: '#EDE9FE', font_heading: 'Dancing Script', font_body: 'Poppins', border_radius: 'lg', animation: 'slide' }
  },
  'cuoi-do-truyen-thong': {
    layout_type: 'traditional-viet',
    theme: { primary_color: '#C41E3A', secondary_color: '#E85D75', background_color: '#FFF8F8', text_color: '#2D0A0E', accent_color: '#FFD5D5', font_heading: 'Cinzel Decorative', font_body: 'Raleway', border_radius: 'sm', animation: 'fade' }
  },
  'cuoi-xanh-royal': {
    layout_type: 'luxury-dark',
    theme: { primary_color: '#1B3A6B', secondary_color: '#4A6FA5', background_color: '#F0F4FC', text_color: '#0D1F3C', accent_color: '#BDD1F5', font_heading: 'Cormorant Garamond', font_body: 'Nunito', border_radius: 'none', animation: 'fade' }
  },
  'cuoi-cam-rustic': {
    layout_type: 'rustic',
    theme: { primary_color: '#B5651D', secondary_color: '#D4884A', background_color: '#FDF6EF', text_color: '#3D1C02', accent_color: '#F5D6B5', font_heading: 'Playfair Display', font_body: 'Lato', border_radius: 'md', animation: 'slide' }
  },
  'cuoi-xam-modern': {
    layout_type: 'minimalist',
    theme: { primary_color: '#374151', secondary_color: '#6B7280', background_color: '#F9FAFB', text_color: '#111827', accent_color: '#D1D5DB', font_heading: 'DM Serif Display', font_body: 'Inter', border_radius: 'sm', animation: 'none' }
  },
  'cuoi-hong-cherry': {
    layout_type: 'botanical',
    theme: { primary_color: '#DB2777', secondary_color: '#F472B6', background_color: '#FFF0F6', text_color: '#500724', accent_color: '#FCE7F3', font_heading: 'Dancing Script', font_body: 'Poppins', border_radius: 'lg', animation: 'fade' }
  },
  'cuoi-xanh-bien': {
    layout_type: 'romantic-photo',
    theme: { primary_color: '#0284C7', secondary_color: '#38BDF8', background_color: '#F0F9FF', text_color: '#0C4A6E', accent_color: '#BAE6FD', font_heading: 'Cormorant Garamond', font_body: 'Nunito', border_radius: 'lg', animation: 'slide' }
  },
  'cuoi-nau-earth': {
    layout_type: 'rustic',
    theme: { primary_color: '#78350F', secondary_color: '#92400E', background_color: '#FEFCE8', text_color: '#1C0A00', accent_color: '#FDE68A', font_heading: 'Playfair Display', font_body: 'Lato', border_radius: 'md', animation: 'fade' }
  },
  'cuoi-kem-ivory': {
    layout_type: 'minimalist',
    theme: { primary_color: '#92400E', secondary_color: '#B45309', background_color: '#FFFBF0', text_color: '#1C1610', accent_color: '#FEF3C7', font_heading: 'Great Vibes', font_body: 'Raleway', border_radius: 'none', animation: 'fade' }
  },
  'cuoi-tim-hoang-gia': {
    layout_type: 'luxury-dark',
    theme: { primary_color: '#5B21B6', secondary_color: '#7C3AED', background_color: '#FAF5FF', text_color: '#2E1065', accent_color: '#E9D5FF', font_heading: 'Cinzel Decorative', font_body: 'Inter', border_radius: 'sm', animation: 'slide' }
  },
  'cuoi-hong-nude': {
    layout_type: 'botanical',
    theme: { primary_color: '#C48A72', secondary_color: '#DBA896', background_color: '#FFF9F7', text_color: '#3D1E14', accent_color: '#F5D8CF', font_heading: 'Dancing Script', font_body: 'Poppins', border_radius: 'lg', animation: 'fade' }
  },
  'cuoi-rong-phung': {
    layout_type: 'traditional-viet',
    theme: { primary_color: '#8B0000', secondary_color: '#B22222', background_color: '#FFF8F8', text_color: '#2D0A0E', accent_color: '#FFD700', font_heading: 'Cinzel Decorative', font_body: 'Inter', border_radius: 'none', animation: 'fade' }
  },
  'cuoi-noir-elegance': {
    layout_type: 'luxury-dark',
    theme: { primary_color: '#111111', secondary_color: '#222222', background_color: '#0F0F0F', text_color: '#FFFFFF', accent_color: '#D4A73A', font_heading: 'Playfair Display', font_body: 'Nunito', border_radius: 'sm', animation: 'none' }
  },
  'cuoi-hoa-hong-co-dien': {
    layout_type: 'rustic',
    theme: { primary_color: '#8C564B', secondary_color: '#A0522D', background_color: '#FAF0E6', text_color: '#3E2723', accent_color: '#D2B48C', font_heading: 'Dancing Script', font_body: 'Lato', border_radius: 'md', animation: 'fade' }
  },
  'cuoi-thien-nhien-bien': {
    layout_type: 'romantic-photo',
    theme: { primary_color: '#006994', secondary_color: '#008B8B', background_color: '#F0FFFF', text_color: '#003366', accent_color: '#87CEEB', font_heading: 'Great Vibes', font_body: 'Nunito', border_radius: 'lg', animation: 'slide' }
  },
  'cuoi-geometry': {
    layout_type: 'minimalist',
    theme: { primary_color: '#333333', secondary_color: '#666666', background_color: '#FFFFFF', text_color: '#1A1A1A', accent_color: '#999999', font_heading: 'Inter', font_body: 'Inter', border_radius: 'none', animation: 'none' }
  },

  // 5 Birthday Templates
  'sn-neon-party': {
    layout_type: 'birthday-playful',
    theme: { primary_color: '#FF00FF', secondary_color: '#00FFFF', background_color: '#111111', text_color: '#FFFFFF', accent_color: '#FFFF00', font_heading: 'Inter', font_body: 'Inter', border_radius: 'lg', animation: 'fade' }
  },
  'sn-sweet-sixteen': {
    layout_type: 'birthday-elegant',
    theme: { primary_color: '#FF69B4', secondary_color: '#FFB6C1', background_color: '#FFF0F5', text_color: '#4B0082', accent_color: '#DA70D6', font_heading: 'Dancing Script', font_body: 'Nunito', border_radius: 'lg', animation: 'slide' }
  },
  'sn-golden-age': {
    layout_type: 'luxury-dark',
    theme: { primary_color: '#B8860B', secondary_color: '#DAA520', background_color: '#000000', text_color: '#FFFFFF', accent_color: '#FFD700', font_heading: 'Playfair Display', font_body: 'Lato', border_radius: 'md', animation: 'fade' }
  },
  'sn-garden-tea': {
    layout_type: 'botanical',
    theme: { primary_color: '#556B2F', secondary_color: '#8FBC8F', background_color: '#F5FFFA', text_color: '#2F4F4F', accent_color: '#9ACD32', font_heading: 'Cormorant Garamond', font_body: 'Raleway', border_radius: 'lg', animation: 'fade' }
  },
  'sn-retro-vibes': {
    layout_type: 'birthday-playful',
    theme: { primary_color: '#FF4500', secondary_color: '#FFA500', background_color: '#FFF8DC', text_color: '#8B0000', accent_color: '#FFD700', font_heading: 'Inter', font_body: 'Inter', border_radius: 'md', animation: 'slide' }
  },

  // 3 Baby Shower Templates
  'baby-pastel-clouds': {
    layout_type: 'baby-soft',
    theme: { primary_color: '#87CEFA', secondary_color: '#B0E0E6', background_color: '#F0F8FF', text_color: '#4682B4', accent_color: '#ADD8E6', font_heading: 'Nunito', font_body: 'Nunito', border_radius: 'lg', animation: 'slide' }
  },
  'baby-animal-safari': {
    layout_type: 'baby-soft',
    theme: { primary_color: '#9ACD32', secondary_color: '#ADFF2F', background_color: '#F5FFFA', text_color: '#556B2F', accent_color: '#7FFF00', font_heading: 'Nunito', font_body: 'Nunito', border_radius: 'lg', animation: 'fade' }
  },
  'baby-little-princess': {
    layout_type: 'botanical',
    theme: { primary_color: '#FF69B4', secondary_color: '#FFC0CB', background_color: '#FFF0F5', text_color: '#C71585', accent_color: '#FF1493', font_heading: 'Dancing Script', font_body: 'Nunito', border_radius: 'lg', animation: 'fade' }
  },

  // 3 House Warming Templates
  'hw-cozy-home': {
    layout_type: 'house-warm',
    theme: { primary_color: '#D2691E', secondary_color: '#CD853F', background_color: '#FAEBD7', text_color: '#8B4513', accent_color: '#DEB887', font_heading: 'Playfair Display', font_body: 'Lato', border_radius: 'sm', animation: 'fade' }
  },
  'hw-modern-living': {
    layout_type: 'minimalist',
    theme: { primary_color: '#2F4F4F', secondary_color: '#696969', background_color: '#F8F8FF', text_color: '#000000', accent_color: '#A9A9A9', font_heading: 'Inter', font_body: 'Inter', border_radius: 'none', animation: 'none' }
  },
  'hw-botanical-house': {
    layout_type: 'botanical',
    theme: { primary_color: '#228B22', secondary_color: '#32CD32', background_color: '#F0FFF0', text_color: '#006400', accent_color: '#90EE90', font_heading: 'Cormorant Garamond', font_body: 'Nunito', border_radius: 'lg', animation: 'slide' }
  }
}

export async function up(pool: Pool) {
  // Fetch all templates and categories
  const [rows] = await pool.query(`
    SELECT t.id, t.slug, t.name, t.thumbnail_url, t.default_config, tc.slug as category_slug
    FROM templates t
    JOIN template_categories tc ON t.category_id = tc.id
  `)

  const templates = rows as TemplateRow[]

  for (const t of templates) {
    let currentConfig: any = {}
    
    // Safely parse default_config which can be object or string in mysql2
    if (t.default_config) {
      if (typeof t.default_config === 'string') {
        try {
          currentConfig = JSON.parse(t.default_config)
        } catch {
          currentConfig = {}
        }
      } else {
        currentConfig = t.default_config
      }
    }

    const lookup = TEMPLATE_LOOKUP[t.slug]

    const theme = lookup?.theme || currentConfig.theme || {
      primary_color: '#6366F1', secondary_color: '#A5B4FC',
      background_color: '#FFFFFF', text_color: '#1F2937',
      accent_color: '#F59E0B', font_heading: 'Playfair Display',
      font_body: 'Inter', border_radius: 'md', animation: 'fade'
    }

    const layout_type = lookup?.layout_type || currentConfig.layout_type || 'minimalist'

    // Extract current hero background url if it exists and is not the generic default, otherwise fall back to thumbnail_url converted to high-res
    let heroBackground = t.thumbnail_url
      ? t.thumbnail_url.replace('w=600&h=1000&fit=crop&q=85', 'w=1920&q=85').replace('w=600&h=800&fit=crop&q=80', 'w=1920&q=85')
      : 'https://images.unsplash.com/photo-1519741497674-611481863552?w=1920&q=85'
    let heroOverlay = 40

    if (currentConfig.sections && Array.isArray(currentConfig.sections)) {
      const existingHero = currentConfig.sections.find((s: any) => s.section_type === 'hero')
      if (existingHero && existingHero.config) {
        if (existingHero.config.background_url && existingHero.config.background_url !== 'https://images.unsplash.com/photo-1519741497674-611481863552?w=1920&q=85') {
          heroBackground = existingHero.config.background_url
        }
        if (existingHero.config.background_overlay !== undefined) heroOverlay = existingHero.config.background_overlay
      }
    }

    const sampleDate = (() => {
      const d = new Date()
      d.setMonth(d.getMonth() + 6)
      return d.toISOString().split('T')[0]
    })()

    const cat = t.category_slug

    const sections = [
      // 1. HERO
      {
        section_type: 'hero',
        sort_order: 0,
        is_enabled: true,
        config: {
          bride_name: cat === 'wedding' ? 'Nguyễn Kim Chi' : cat === 'house_warming' ? 'Gia đình' : undefined,
          groom_name: cat === 'wedding' ? 'Trần Anh Tú' : cat === 'house_warming' ? 'Anh Tú & Kim Chi' : undefined,
          bride_short_name: cat === 'wedding' ? 'Kim Chi' : undefined,
          groom_short_name: cat === 'wedding' ? 'Anh Tú' : undefined,
          bride_title: cat === 'wedding' ? 'Út Nữ' : undefined,
          groom_title: cat === 'wedding' ? 'Trưởng Nam' : undefined,
          celebrant_name: cat === 'birthday' ? 'Nguyễn Bảo Ngọc' : cat === 'baby_shower' ? 'Trần Minh Khang' : undefined,
          age_milestone: cat === 'birthday' ? '18 TUỔI' : undefined,
          tagline: cat === 'birthday' ? 'Tuổi 18 rực rỡ - Hãy cùng chia sẻ niềm vui!' : cat === 'baby_shower' ? 'Chào mừng bé cưng tròn 1 tuổi!' : cat === 'house_warming' ? 'Tân gia nhà mới - Ấm áp tình thân' : 'Trọn đời bên nhau',
          show_countdown: true,
          background_overlay: heroOverlay,
          background_url: heroBackground,
          couple_photo_url: undefined,
          event_date: sampleDate,
        }
      },
      // 2. COUPLE IMAGES (Separate circular photos, only for Wedding)
      {
        section_type: 'couple_images',
        sort_order: 1,
        is_enabled: cat === 'wedding',
        config: {
          groom_photo_url: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600&h=600&fit=crop&q=80',
          bride_photo_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&h=600&fit=crop&q=80',
        }
      },
      // 3. EVENT INFO
      {
        section_type: 'event_info',
        sort_order: 2,
        is_enabled: true,
        config: {
          invitation_message: cat === 'birthday' 
            ? 'Trân trọng kính mời Quý khách đến tham dự tiệc sinh nhật mừng tuổi 18 của con gái chúng tôi.'
            : cat === 'baby_shower'
            ? 'Trân trọng kính mời Quý khách đến chung vui cùng gia đình trong buổi tiệc thôi nôi mừng cháu tròn 1 tuổi.'
            : cat === 'house_warming'
            ? 'Trân trọng kính mời Quý khách đến tham dự buổi tiệc tân gia mừng tổ ấm mới của gia đình chúng tôi.'
            : 'Với tất cả tình yêu thương, chúng tôi trân trọng kính mời Quý khách đến tham dự buổi lễ hôn nhân của chúng tôi.',
          ceremonies: cat === 'birthday' ? [
            {
              name: 'Tiệc sinh nhật',
              date: sampleDate,
              time: '18:00',
              venue: 'Nhà hàng Sky Zone',
              address: 'Tầng 20, Tòa nhà Landmark, TP.HCM',
            }
          ] : cat === 'baby_shower' ? [
            {
              name: 'Tiệc thôi nôi',
              date: sampleDate,
              time: '11:30',
              venue: 'Trung tâm hội nghị Golden Bell',
              address: '789 Sư Vạn Hạnh, Q.10, TP.HCM',
            }
          ] : cat === 'house_warming' ? [
            {
              name: 'Tiệc tân gia',
              date: sampleDate,
              time: '17:00',
              venue: 'Tư gia mới',
              address: 'Khu đô thị Sala, Quận 2, TP.Thủ Đức',
            }
          ] : [
            {
              name: 'Lễ vu quy',
              date: sampleDate,
              time: '08:00',
              venue: 'Tư gia nhà gái',
              address: '123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM',
            },
            {
              name: 'Lễ thành hôn',
              date: sampleDate,
              time: '17:00',
              venue: 'Trung tâm tiệc cưới Palace',
              address: '456 Hai Bà Trưng, Phường Võ Thị Sáu, Quận 3, TP.HCM',
            }
          ],
        }
      },
      // 4. FAMILY INFO (Only for Wedding)
      {
        section_type: 'family_info',
        sort_order: 3,
        is_enabled: cat === 'wedding',
        config: {
          groom_family: {
            family_name: 'Nhà Trai',
            father: { title: 'Ông', name: 'Trần Văn Hùng' },
            mother: { title: 'Bà', name: 'Lê Thị Mai' },
          },
          bride_family: {
            family_name: 'Nhà Gái',
            father: { title: 'Ông', name: 'Nguyễn Văn Hải' },
            mother: { title: 'Bà', name: 'Phạm Thị Cúc' },
          },
        }
      },
      // 5. GALLERY
      {
        section_type: 'gallery',
        sort_order: 4,
        is_enabled: true,
        config: {
          images: [
            { url: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600&q=80', caption: 'Khoảnh khắc ngọt ngào' },
            { url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80', caption: 'Ngập tràn hạnh phúc' },
            { url: 'https://images.unsplash.com/photo-1494959764136-6be9eb3c261e?w=600&q=80', caption: 'Yêu thương đong đầy' }
          ],
          layout: 'grid'
        }
      },
      // 6. TIMELINE
      {
        section_type: 'timeline',
        sort_order: 5,
        is_enabled: false,
        config: {
          title: cat === 'wedding' ? 'Hành trình tình yêu' : 'Hành trình cột mốc',
          events: [
            { date: sampleDate, title: 'Ngày gặp gỡ đầu tiên', description: 'Câu chuyện tuyệt đẹp bắt đầu từ những giây phút định mệnh này...' }
          ]
        }
      },
      // 7. COUNTDOWN
      {
        section_type: 'countdown',
        sort_order: 6,
        is_enabled: true,
        config: {
          title: cat === 'wedding' ? 'Đếm ngược đến ngày chung đôi' : 'Đếm ngược sự kiện',
          event_date: sampleDate,
        }
      },
      // 8. MAP
      {
        section_type: 'map',
        sort_order: 7,
        is_enabled: false,
        config: {
          venue_name: cat === 'wedding' ? 'Trung tâm tiệc cưới Palace' : 'Địa điểm tổ chức',
          address: cat === 'wedding' ? '456 Hai Bà Trưng, Phường Võ Thị Sáu, Quận 3, TP.HCM' : 'Địa chỉ chi tiết',
          embed_url: '',
        }
      },
      // 9. RSVP
      {
        section_type: 'rsvp',
        sort_order: 8,
        is_enabled: true,
        config: {
          title: 'Xác nhận tham dự',
          subtitle: 'Sự hiện diện của bạn là niềm hạnh phúc lớn nhất của chúng tôi',
        }
      },
      // 10. BANK TRANSFER
      {
        section_type: 'bank_transfer',
        sort_order: 9,
        is_enabled: false,
        config: {
          title: 'Gửi quà chúc mừng',
          bank_id: 'VCB',
          account_number: '1234567890',
          account_name: 'TRẦN ANH TÚ',
          note: 'Sự hiện diện của bạn là món quà quý giá nhất đối với gia đình chúng tôi',
        }
      },
      // 11. MUSIC
      {
        section_type: 'music',
        sort_order: 10,
        is_enabled: false,
        config: {
          enabled: false,
          autoplay: false,
          track_name: '',
          track_url: '',
        }
      },
      // 12. WISHES
      {
        section_type: 'wishes',
        sort_order: 11,
        is_enabled: true,
        config: {
          title: 'Sổ lưu bút chúc mừng'
        }
      }
    ]

    const updatedConfig = JSON.stringify({ theme, sections, layout_type })

    await pool.query(
      'UPDATE templates SET default_config = ? WHERE id = ?',
      [updatedConfig, t.id]
    )
  }

  console.log(`[034] Successfully updated ${templates.length} templates with complete mock data and corrected styles`)
}

export async function down(pool: Pool) {
  // Safe to do nothing or restore default structures
}
