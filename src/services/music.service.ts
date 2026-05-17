import { MusicModel } from '@/models/music.model'
import { AppError } from '@/utils/response'

export const MusicService = {
  async listForAdmin() {
    return MusicModel.listAll()
  },

  async create(data: { name: string; url: string; is_active?: boolean }) {
    if (!data.name || !data.url) {
      throw new AppError('VALIDATION_ERROR', 'Tên và URL nhạc là bắt buộc', 400)
    }
    return MusicModel.create(data)
  },

  async update(id: number, data: any) {
    const track = await MusicModel.findById(id)
    if (!track) throw new AppError('NOT_FOUND', 'Không tìm thấy bản nhạc', 404)
    
    return MusicModel.update(id, data)
  },

  async remove(id: number) {
    const track = await MusicModel.findById(id)
    if (!track) throw new AppError('NOT_FOUND', 'Không tìm thấy bản nhạc', 404)
    await MusicModel.remove(id)
  },

  async setDefault(id: number) {
    const track = await MusicModel.findById(id)
    if (!track) throw new AppError('NOT_FOUND', 'Không tìm thấy bản nhạc', 404)
    return MusicModel.setDefault(id)
  },
}
