import type { APIRoute } from "astro";
import { jsonResponse } from "@/lib/api/json";
import { getEmailBinding } from "@/lib/cloudflare/email";
import { parseReportIssue } from "@/lib/contact/report-issue-schema";
import { CONTACT_EMAIL } from "@/lib/routes";

export const prerender = false;

const FROM_EMAIL = "noreply@bassmap.pl";
const FROM_NAME = "BassMap PL";

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

export const POST: APIRoute = async (context) => {
  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return jsonResponse({ error: "Nieprawidłowe dane JSON" }, 400);
  }

  const parsed = parseReportIssue(body);
  if (!parsed.success) {
    return jsonResponse({ error: parsed.error }, 400);
  }

  const emailBinding = getEmailBinding(context.locals);
  if (!emailBinding) {
    return jsonResponse(
      {
        error: "Wysyłka e-mail nie jest skonfigurowana w tym środowisku. Napisz bezpośrednio na kontakt@bassmap.pl.",
      },
      503,
    );
  }

  const { email, message, name } = parsed.data;
  const senderLabel = name ?? email;
  const text = [`Zgłoszenie od: ${senderLabel} <${email}>`, "", message].join("\n");
  const html = [
    `<p><strong>Zgłoszenie od:</strong> ${escapeHtml(senderLabel)} &lt;${escapeHtml(email)}&gt;</p>`,
    `<pre style="white-space:pre-wrap;font-family:inherit">${escapeHtml(message)}</pre>`,
  ].join("\n");

  try {
    await emailBinding.send({
      to: CONTACT_EMAIL,
      from: { email: FROM_EMAIL, name: FROM_NAME },
      replyTo: email,
      subject: "Zgłoszenie problemu – BassMap PL",
      text,
      html,
    });
  } catch {
    return jsonResponse({ error: "Nie udało się wysłać wiadomości. Spróbuj ponownie później." }, 500);
  }

  return jsonResponse({ ok: true }, 200);
};
