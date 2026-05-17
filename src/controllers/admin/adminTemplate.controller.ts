import type { Request, Response, NextFunction } from "express";
import { success } from "@/utils/response";
import { TemplateService } from "@/services/template.service";

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
};
