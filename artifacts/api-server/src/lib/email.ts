import nodemailer from "nodemailer";

const host     = process.env["SMTP_HOST"]       ?? "smtp.gmail.com";
const port     = Number(process.env["SMTP_PORT"] ?? "587");
const secure   = process.env["SMTP_SECURE"]     === "true";
const user     = process.env["SMTP_USER"]       ?? "";
const pass     = process.env["SMTP_PASS"]       ?? "";
const fromEmail = process.env["SMTP_FROM_EMAIL"] ?? user;
const fromName  = process.env["SMTP_FROM_NAME"]  ?? "POS App";
const replyTo   = process.env["AUTH_REPLY_TO_EMAIL"] ?? fromEmail;

const transporter = nodemailer.createTransport({
  host,
  port,
  secure,
  auth: { user, pass },
});

export async function sendMail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<void> {
  await transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    replyTo,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text ?? opts.html.replace(/<[^>]+>/g, ""),
  });
}

export async function sendVerificationEmail(opts: {
  to: string;
  storeName: string;
  code: string;
}): Promise<void> {
  const { to, storeName, code } = opts;
  await sendMail({
    to,
    subject: `Your ${fromName} verification code`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="font-family:sans-serif;background:#f5f5f5;margin:0;padding:0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0"
             style="background:#fff;border-radius:12px;padding:40px;box-shadow:0 2px 8px rgba(0,0,0,.08);">
        <tr><td align="center" style="padding-bottom:24px;">
          <h1 style="margin:0;font-size:24px;color:#111;">${fromName}</h1>
        </td></tr>
        <tr><td style="padding-bottom:16px;color:#444;font-size:16px;">
          Hi there,<br/><br/>
          Welcome to <strong>${fromName}</strong>! To activate your store
          <strong>${storeName}</strong>, use the verification code below:
        </td></tr>
        <tr><td align="center" style="padding:24px 0;">
          <div style="display:inline-block;background:#f0f4ff;border:2px dashed #4f46e5;
                      border-radius:12px;padding:20px 40px;">
            <span style="font-size:36px;font-weight:700;letter-spacing:10px;color:#4f46e5;">
              ${code}
            </span>
          </div>
        </td></tr>
        <tr><td style="color:#666;font-size:14px;padding-bottom:16px;">
          This code expires in <strong>30 minutes</strong>. If you didn't create this
          store, you can safely ignore this email.
        </td></tr>
        <tr><td style="color:#aaa;font-size:12px;border-top:1px solid #eee;padding-top:16px;">
          © ${new Date().getFullYear()} ${fromName}. All rights reserved.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });
}
