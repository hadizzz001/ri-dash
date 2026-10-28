"use server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// Same logo as the website header, served by Cloudinary as a transparent PNG
// (many mail apps can't show .webp)
const LOGO = "https://res.cloudinary.com/dgi9mfldc/image/upload/f_png,h_160/v1766829842/black123_fbqmfb.png";

const esc = (s: string) =>
  String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

/**
 * "Your appointment was updated" email: the same full details sent on
 * WhatsApp from the dashboard (services, discount, totals…), in the
 * client's language.
 */
export const sendUpdateEmail = async ({
  email,
  name,
  reference,
  message,
  lang,
}: {
  email: string;
  name: string;
  reference?: string;
  message: string;
  lang?: string;
}) => {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
  const rtl = lang === "ar";
  const cancelled = /cancel|annul|إلغاء/i.test(message.split("\n")[0] || "");
  const subject = cancelled
    ? lang === "ar"
      ? "تم إلغاء حجزك — رافي دهام"
      : lang === "fr"
      ? "Votre réservation a été annulée — Rafi Daham"
      : "Your appointment has been cancelled — Rafi Daham"
    : lang === "ar"
      ? "تم تعديل حجزك — رافي دهام"
      : lang === "fr"
      ? "Votre réservation a été modifiée — Rafi Daham"
      : "Your appointment has been updated — Rafi Daham";

  // WhatsApp *bold* → <b>bold</b>
  const body = esc(message)
    .replace(new RegExp("\\*([^*\\n]+)\\*", "g"), "<b>$1</b>")
    .replace(/\n/g, "<br />");

  await resend.emails.send({
    from: "noreply@rafidaham.com",
    to: email,
    subject: reference ? `${subject} (${reference})` : subject,
    text: message.split("*").join(""),
    html: `
<div style="font-family: Arial, sans-serif; padding:30px;">
  <div dir="${rtl ? "rtl" : "ltr"}" style="max-width:600px; margin:auto; padding:30px; text-align:${rtl ? "right" : "left"};">
    <div style="text-align:center; margin-bottom:24px;">
      <img src="${LOGO}" alt="Rafi Daham" height="60" style="height:60px; width:auto; display:inline-block; border:0; outline:none; background:transparent;" />
    </div>
    <p style="font-size:15px; line-height:1.6; color:#111;">${body}</p>
    <p style="margin-top:30px; color:#666;">— Rafi Daham</p>
  </div>
</div>`,
  });
};
