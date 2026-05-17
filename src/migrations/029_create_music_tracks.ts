import type { Pool } from 'mysql2/promise'

export async function up(pool: Pool) {
  // 1. Create music_tracks table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS music_tracks (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      url TEXT NOT NULL,
      is_active TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `)

  // 2. Seed default tracks
  const tracks = [
    { name: 'Beautiful In White (Westlife)', url: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3' },
    { name: 'A Thousand Years (Christina Perri Piano)', url: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_24a132eb9c.mp3' },
    { name: 'Canon in D (Pachelbel Piano)', url: 'https://cdn.pixabay.com/download/audio/2022/03/10/audio_5500e3954c.mp3' },
    { name: 'Wedding March (Classic)', url: 'https://cdn.pixabay.com/download/audio/2022/02/07/audio_d69613146e.mp3' },
    { name: 'Thinking Out Loud (Instrumental)', url: 'https://cdn.pixabay.com/download/audio/2023/05/22/audio_2415d7426a.mp3' },
    { name: 'I Do (911 Instrumental)', url: 'https://cdn.pixabay.com/download/audio/2022/01/20/audio_0991572979.mp3' },
  ]

  for (const track of tracks) {
    await pool.query(
      'INSERT INTO music_tracks (name, url) VALUES (?, ?)',
      [track.name, track.url]
    )
  }

  console.log(`[029] Created music_tracks table and seeded ${tracks.length} tracks.`)
}

export async function down(pool: Pool) {
  await pool.query('DROP TABLE IF EXISTS music_tracks;')
}
