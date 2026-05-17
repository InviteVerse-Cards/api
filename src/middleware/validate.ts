import type { Request, Response, NextFunction } from 'express'
import { validationResult, type Schema, checkSchema } from 'express-validator'
import { createError } from '@/utils/response'

export function validate(schema: Schema) {
  return [
    ...checkSchema(schema),
    (req: Request, _res: Response, next: NextFunction) => {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return next(createError('VALIDATION_ERROR', errors.array()[0]?.msg ?? 'Dữ liệu không hợp lệ', 422))
      }
      next()
    },
  ]
}

export const registerSchema: Schema = {
  full_name: { notEmpty: { errorMessage: 'Vui lòng nhập họ tên' }, trim: true },
  email: { isEmail: { errorMessage: 'Email không hợp lệ' }, normalizeEmail: true },
  password: { isLength: { options: { min: 6 }, errorMessage: 'Mật khẩu tối thiểu 6 ký tự' } },
}

export const loginSchema: Schema = {
  email: { isEmail: { errorMessage: 'Email không hợp lệ' } },
  password: { notEmpty: { errorMessage: 'Vui lòng nhập mật khẩu' } },
}

export const readingInputSchema: Schema = {
  full_name:  { notEmpty: { errorMessage: 'Vui lòng nhập họ tên' }, trim: true },
  birth_date: { isDate: { errorMessage: 'Ngày sinh không hợp lệ (YYYY-MM-DD)' } },
  for_other:  { optional: true, isBoolean: true, toBoolean: true },
}

export const createOrderSchema: Schema = {
  package_id: { isInt: { options: { min: 1 }, errorMessage: 'package_id không hợp lệ' }, toInt: true },
}

export const verifyEmailSchema: Schema = {
  token: { notEmpty: { errorMessage: 'Token xác thực không được để trống' }, trim: true },
}

export const resendVerificationSchema: Schema = {
  email: { isEmail: { errorMessage: 'Email không hợp lệ' }, normalizeEmail: true },
}

export const forgotPasswordSchema: Schema = {
  email: { isEmail: { errorMessage: 'Email không hợp lệ' }, normalizeEmail: true },
}

export const resetPasswordSchema: Schema = {
  token: { notEmpty: { errorMessage: 'Token không được để trống' }, trim: true },
  new_password: { isLength: { options: { min: 6 }, errorMessage: 'Mật khẩu mới tối thiểu 6 ký tự' } },
}
