import type { Request, Response, NextFunction } from "express";
import { success, createError } from "@/utils/response";
import { MusicService } from "@/services/music.service";
import { uploadToCloudinary } from "@/services/upload.service";

export const AdminMusicController = {
  list: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const tracks = await MusicService.listForAdmin();
      return res.json(success(tracks));
    } catch (err) {
      next(err);
    }
  },

  upload: async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        throw createError("MISSING_FILE", "Vui lòng chọn file nhạc", 400);
      }
      const result = await uploadToCloudinary(req.file.buffer, "music_tracks");
      return res.json(success({ url: result.url }, "Tải nhạc lên thành công"));
    } catch (err) {
      next(err);
    }
  },

  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, url, is_active } = req.body;
      const track = await MusicService.create({ name, url, is_active });
      return res.status(201).json(success(track, "Thêm nhạc thành công"));
    } catch (err) {
      next(err);
    }
  },

  update: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { name, url, is_active } = req.body;
      const track = await MusicService.update(Number(id), { name, url, is_active });
      return res.json(success(track, "Cập nhật nhạc thành công"));
    } catch (err) {
      next(err);
    }
  },

  remove: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      await MusicService.remove(Number(id));
      return res.json(success(null, "Đã xóa bản nhạc"));
    } catch (err) {
      next(err);
    }
  },

  setDefault: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const track = await MusicService.setDefault(Number(id));
      return res.json(success(track, "Đã đặt làm nhạc mặc định"));
    } catch (err) {
      next(err);
    }
  },
};
