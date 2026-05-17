import nodemailer from 'nodemailer'
import { logger } from '@/utils/logger'

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

const FROM = process.env.EMAIL_FROM ?? 'Phong Thuỷ Tâm Đức <noreply@phongthuytamduc.vn>'
const APP_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173'

function buildEmailHtml(opts: {
  preheader: string
  icon: string
  title: string
  bodyLines: string[]
  ctaHref: string
  ctaText: string
  ctaColor: string
  noteLines: string[]
  expiry: string
}): string {
  const noteHtml = opts.noteLines.map(l => `<p style="margin:0 0 4px 0;color:#9590b8;font-size:13px;line-height:1.7;">${l}</p>`).join('')
  const bodyHtml = opts.bodyLines.map(l => `<p style="margin:0 0 10px 0;color:#b8b4d8;font-size:15px;line-height:1.7;text-align:center;">${l}</p>`).join('')

  return `<!DOCTYPE html>
<html lang="vi" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
  <title>${opts.title}</title>
  <style type="text/css">
    body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
    table,td{mso-table-lspace:0pt;mso-table-rspace:0pt}
    img{-ms-interpolation-mode:bicubic;border:0;outline:none;text-decoration:none}
    body{margin:0!important;padding:0!important;background-color:#08080f}
    @media only screen and (max-width:600px){
      .wrap{width:100%!important;min-width:100%!important}
      .pad{padding:28px 20px!important}
      .pad-footer{padding:20px!important}
      .cta-btn{width:100%!important;display:block!important;box-sizing:border-box}
      .hide-sm{display:none!important}
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#08080f;">

  <!--[if mso]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="#08080f"><![endif]-->

  <!-- Preheader -->
  <div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">
    ${opts.preheader}&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;
  </div>

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#08080f;">
    <tr>
      <td align="center" style="padding:40px 16px 48px;">

        <table class="wrap" width="560" cellpadding="0" cellspacing="0" border="0"
               style="max-width:560px;width:100%;border-radius:20px;overflow:hidden;
                      box-shadow:0 0 0 1px rgba(124,58,237,0.25),0 24px 60px rgba(0,0,0,0.6);">

          <!-- ═══ HEADER ═══ -->
          <tr>
            <td align="center" bgcolor="#110d1f"
                style="background:linear-gradient(160deg,#1c0f35 0%,#110d1f 60%,#0d1020 100%);
                       padding:36px 40px 28px;border-bottom:1px solid rgba(124,58,237,0.3);">
              <!-- Logo glyph -->
              <div style="font-size:40px;line-height:1;margin-bottom:10px;">&#9775;</div>
              <!-- Brand name -->
              <div style="font-family:Georgia,'Times New Roman',serif;font-size:26px;
                          font-weight:700;color:#f5c842;letter-spacing:1.5px;margin-bottom:4px;">
                Phong Thuỷ Tâm Đức
              </div>
              <div style="font-size:11px;color:#6b6490;letter-spacing:3px;text-transform:uppercase;">
                Thiên Cơ · Tâm Đức · Huyền Mệnh
              </div>
            </td>
          </tr>

          <!-- Gold gradient divider -->
          <tr>
            <td style="background:linear-gradient(90deg,transparent 0%,#7c3aed 30%,#f5c842 50%,#7c3aed 70%,transparent 100%);
                       height:1px;font-size:0;line-height:0;mso-line-height-rule:exactly;">&nbsp;</td>
          </tr>

          <!-- ═══ BODY ═══ -->
          <tr>
            <td class="pad" bgcolor="#0f0f1a"
                style="background-color:#0f0f1a;padding:44px 48px 36px;">

              <!-- Icon circle -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding-bottom:24px;">
                    <div style="display:inline-block;width:68px;height:68px;
                                background:rgba(124,58,237,0.12);
                                border:1px solid rgba(124,58,237,0.4);
                                border-radius:50%;line-height:68px;
                                font-size:30px;text-align:center;">
                      ${opts.icon}
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Title -->
              <h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;
                         font-size:24px;font-weight:700;color:#f1f0ff;text-align:center;
                         letter-spacing:0.3px;">
                ${opts.title}
              </h1>

              <!-- Body text -->
              ${bodyHtml}

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding:28px 0 32px;">
                    <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${opts.ctaHref}" style="height:52px;v-text-anchor:middle;width:220px;" arcsize="25%" strokecolor="${opts.ctaColor}" fillcolor="${opts.ctaColor}"><w:anchorlock/><center style="color:#0f0f1a;font-family:sans-serif;font-size:15px;font-weight:bold;">${opts.ctaText}</center></v:roundrect><![endif]-->
                    <!--[if !mso]><!-->
                    <a href="${opts.ctaHref}" class="cta-btn"
                       style="display:inline-block;padding:15px 40px;
                              background:${opts.ctaColor};
                              color:#0f0f1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;
                              font-size:15px;font-weight:700;text-decoration:none;
                              border-radius:12px;letter-spacing:0.4px;
                              mso-padding-alt:15px 40px;">
                      ${opts.ctaText}
                    </a>
                    <!--<![endif]-->
                  </td>
                </tr>
              </table>

              <!-- Fallback URL box -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background:#161625;border-radius:10px;padding:14px 16px;margin-bottom:24px;">
                    <p style="margin:0 0 6px;color:#6b6490;font-size:11px;letter-spacing:0.5px;text-transform:uppercase;">
                      Nút không hoạt động? Dùng link sau:
                    </p>
                    <p style="margin:0;word-break:break-all;font-size:12px;color:#7c6aed;line-height:1.5;">
                      ${opts.ctaHref}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Note box -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:20px;">
                <tr>
                  <td style="border-left:3px solid #f5c842;background:rgba(245,200,66,0.04);
                             border-radius:0 10px 10px 0;padding:14px 18px;">
                    <p style="margin:0 0 6px;color:#f5c842;font-size:12px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;">
                      Lưu ý
                    </p>
                    ${noteHtml}
                    <p style="margin:4px 0 0;color:#9590b8;font-size:13px;line-height:1.7;">
                      ⏱ Link có hiệu lực trong <strong style="color:#f5c842;">${opts.expiry}</strong>.
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- ═══ FOOTER ═══ -->
          <tr>
            <td class="pad-footer" bgcolor="#0a0a14"
                style="background-color:#0a0a14;padding:24px 48px;
                       border-top:1px solid rgba(255,255,255,0.05);">
              <p style="margin:0 0 6px;color:#4b4870;font-size:12px;text-align:center;line-height:1.6;">
                Email này được gửi tự động từ hệ thống <strong style="color:#6b6490;">Phong Thuỷ Tâm Đức</strong>.<br/>
                Vui lòng không trả lời email này.
              </p>
              <p style="margin:8px 0 0;color:#352f58;font-size:11px;text-align:center;">
                &copy; ${new Date().getFullYear()} Phong Thuỷ Tâm Đức. Mọi quyền được bảo lưu.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

  <!--[if mso]></td></tr></table><![endif]-->
</body>
</html>`
}

export const EmailService = {
  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const link = `${APP_URL}/verify-email?token=${token}`
    const html = buildEmailHtml({
      preheader: 'Xác nhận địa chỉ email để kích hoạt tài khoản Phong Thuỷ Tâm Đức của bạn',
      icon: '✉',
      title: 'Xác thực email của bạn',
      bodyLines: [
        'Cảm ơn bạn đã đăng ký tài khoản <strong style="color:#f1f0ff;">Phong Thuỷ Tâm Đức</strong>.',
        'Nhấn vào nút bên dưới để xác thực địa chỉ email và bắt đầu<br/>khám phá vận mệnh của bạn.',
      ],
      ctaHref: link,
      ctaText: '✨ Xác thực tài khoản',
      ctaColor: 'linear-gradient(135deg,#f5c842 0%,#d97706 100%)',
      noteLines: [
        '🔒 Nếu bạn không tạo tài khoản này, hãy bỏ qua email.',
      ],
      expiry: '24 giờ',
    })

    try {
      await createTransport().sendMail({
        from: FROM,
        to: email,
        subject: '✨ Xác thực tài khoản Phong Thuỷ Tâm Đức',
        html,
      })
    } catch (err) {
      logger.error('[EMAIL] sendVerificationEmail failed:', err)
      throw err
    }
  },

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const link = `${APP_URL}/reset-password?token=${token}`
    const html = buildEmailHtml({
      preheader: 'Yêu cầu đặt lại mật khẩu tài khoản Phong Thuỷ Tâm Đức của bạn',
      icon: '🔐',
      title: 'Đặt lại mật khẩu',
      bodyLines: [
        'Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản',
        'liên kết với địa chỉ email này.',
        'Nhấn vào nút bên dưới để tạo mật khẩu mới.',
      ],
      ctaHref: link,
      ctaText: '🔑 Đặt lại mật khẩu',
      ctaColor: 'linear-gradient(135deg,#7c3aed 0%,#6d28d9 100%)',
      noteLines: [
        '🛡 Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này — mật khẩu hiện tại của bạn vẫn an toàn.',
      ],
      expiry: '1 giờ',
    })

    try {
      await createTransport().sendMail({
        from: FROM,
        to: email,
        subject: '🔑 Đặt lại mật khẩu Phong Thuỷ Tâm Đức',
        html,
      })
    } catch (err) {
      logger.error('[EMAIL] sendPasswordResetEmail failed:', err)
      throw err
    }
  },
}
