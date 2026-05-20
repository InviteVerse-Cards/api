import type { Request, Response, NextFunction } from "express";
import { success, AppError } from "@/utils/response";
import { TemplateService } from "@/services/template.service";
import { TemplateModel } from "@/models/template.model";

export const AdminTemplateController = {
  list: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const templates = await TemplateService.listForAdmin();
      return res.json(success(templates));
    } catch (err) {
      next(err);
    }
  },

  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        category,
        slug,
        name,
        description,
        thumbnail_url,
        preview_url,
        plan_required,
        default_config,
      } = req.body;
      const template = await TemplateService.create({
        category,
        slug,
        name,
        description,
        thumbnail_url,
        preview_url,
        plan_required,
        default_config,
      });
      return res.status(201).json(success(template, "Tạo template thành công"));
    } catch (err) {
      next(err);
    }
  },

  update: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { uuid } = req.params;
      const {
        name,
        description,
        thumbnail_url,
        preview_url,
        plan_required,
        is_active,
        default_config,
      } = req.body;
      const template = await TemplateService.update(uuid, {
        name,
        description,
        thumbnail_url,
        preview_url,
        plan_required,
        is_active,
        default_config,
      });
      return res.json(success(template, "Cập nhật template thành công"));
    } catch (err) {
      next(err);
    }
  },

  remove: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { uuid } = req.params;
      await TemplateService.remove(uuid);
      return res.json(success(null, "Đã xóa template"));
    } catch (err) {
      next(err);
    }
  },

  getFull: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { uuid } = req.params;
      const data = await TemplateModel.findByUuidFull(uuid);
      if (!data) return next(new AppError("NOT_FOUND", "Template không tồn tại", 404));
      return res.json(success({
        ...data,
        category: data.category_slug,
        theme_config: data.theme_config_parsed,
        sections: data.sections,
        default_music_track: data.default_music_track,
      }));
    } catch (err) {
      next(err);
    }
  },

  updateTheme: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { uuid } = req.params;
      const { theme_config } = req.body;
      if (!theme_config || typeof theme_config !== "object") {
        return next(new AppError("VALIDATION_ERROR", "theme_config phải là object", 400));
      }
      await TemplateModel.updateThemeConfig(uuid, theme_config as Record<string, unknown>);
      return res.json(success(null, "Đã cập nhật theme"));
    } catch (err) {
      next(err);
    }
  },

  updateSections: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { uuid } = req.params;
      const { sections } = req.body;
      if (!Array.isArray(sections)) {
        return next(new AppError("VALIDATION_ERROR", "sections phải là array", 400));
      }
      const template = await TemplateModel.findByUuid(uuid);
      if (!template) return next(new AppError("NOT_FOUND", "Template không tồn tại", 404));
      await TemplateModel.upsertSections(template.id, sections as Array<{
        section_type: string; sort_order: number; is_enabled: boolean; config: Record<string, unknown>
      }>);
      return res.json(success(null, "Đã cập nhật sections"));
    } catch (err) {
      next(err);
    }
  },

  updateMusic: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { uuid } = req.params;
      const { track_id } = req.body;
      await TemplateModel.setDefaultMusic(uuid, track_id ?? null);
      return res.json(success(null, "Đã cập nhật nhạc mặc định"));
    } catch (err) {
      next(err);
    }
  },

  reorder: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const items = req.body as { uuid: string; sort_order: number }[]
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'items is required' } })
      }
      await TemplateModel.reorderCategory(items)
      return res.json(success(null, 'Đã cập nhật thứ tự template'))
    } catch (err) {
      next(err)
    }
  },
};
