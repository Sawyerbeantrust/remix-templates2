import nodemailer from "nodemailer";
import { getGeminiClient, cleanJsonText } from "./ai.js";
import { logger } from "../utils/logger.js";
import { CONFIG } from "../config.js";

export async function sendSmtpEmail({
  replyTo,
  subject,
  body,
  fromName,
}: {
  replyTo?: string;
  subject: string;
  body: string;
  fromName?: string;
}): Promise<{ sent: boolean; reason?: string }> {
  let host = (process.env.SMTP_HOST || "").trim();
  const port = Number(process.env.SMTP_PORT || CONFIG.SMTP_PORT);
  const user = (process.env.SMTP_USER || CONFIG.SMTP_USER).trim();
  const pass = (process.env.SMTP_PASS || "").trim();

  if (host.includes("@")) {
    const domain = host.split("@")[1];
    if (domain) {
      host = `mail.${domain}`;
    }
  }

  if (!host || !pass) {
    logger.info("SMTP_HOST or SMTP_PASS not configured. Email payload logged successfully.");
    return { sent: false, reason: "SMTP credentials not configured on server" };
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      connectionTimeout: 4000,
      greetingTimeout: 4000,
      socketTimeout: 5000,
      auth: { user, pass },
    });

    await transporter.sendMail({
      from: `"${fromName || "Car-Lifts SA Web"}" <${user}>`,
      replyTo: replyTo || user,
      to: user,
      subject,
      text: body,
    });

    logger.info({ subject, to: user }, "Successfully dispatched email to sales team via SMTP");
    return { sent: true };
  } catch (err: any) {
    const isDnsError = err?.code === "ENOTFOUND" || err?.message?.includes("ENOTFOUND");
    const failureReason = isDnsError
      ? `Mail host '${host}' unreachable (DNS lookup failed)`
      : err?.message || "SMTP transmission error";

    logger.warn({ host, error: err?.message }, "Could not transmit email via SMTP");
    return { sent: false, reason: failureReason };
  }
}

export async function generateEmailPayloadWithGemini({
  name,
  email,
  phone,
  equipment,
  message,
  location,
}: {
  name?: string;
  email?: string;
  phone?: string;
  equipment?: string;
  message?: string;
  location?: string;
}): Promise<{ subject: string; body: string }> {
  const customerName = name || "Valued Customer";
  const customerEmail = email || "Not provided";
  const customerPhone = phone || "Not provided";
  const customerLocation = location || "South Africa";
  const equipmentRequested = equipment || "Car Lifts / Workshop Equipment";
  const customerNotes = message || "No additional custom requirements provided.";

  const fallbackPayload = {
    subject: `New Quote Request: ${equipmentRequested} - ${customerName}`,
    body: `NEW CUSTOMER QUOTE REQUEST & INQUIRY
==================================================

CUSTOMER DETAILS:
- Full Name: ${customerName}
- Phone Number: ${customerPhone}
- Email Address: ${customerEmail}
- Location/City: ${customerLocation}

REQUEST DETAILS:
- Equipment Requested: ${equipmentRequested}
- Quantity: 1
- Custom Requirements / Notes: ${customerNotes}

NEXT ACTION:
Note to Sales Team: Please review this inquiry and respond to the customer within 24 business hours.`,
  };

  const ai = getGeminiClient();
  if (ai) {
    try {
      const prompt = `You are an email generation assistant for Car-Lifts South Africa. When a customer submits a contact form or requests a quote, generate a clear, professional email notification that will be sent directly to the sales team inbox.

Extract and format the user's inquiry into a structured JSON response with two keys: "subject" and "body".

Rules:
1. "subject": Must be clear and actionable (e.g., "New Quote Request: [Equipment Name] - [Customer Name]").
2. "body": Must be plain text containing Customer Details, Request Details, and Next Action.
3. Output ONLY valid JSON with no markdown block wrappers around it.

Inquiry Data:
- Name: ${customerName}
- Email: ${customerEmail}
- Phone: ${customerPhone}
- Location: ${customerLocation}
- Equipment Requested: ${equipmentRequested}
- Message/Notes: ${customerNotes}`;

      const aiPromise = ai.models
        .generateContent({
          model: CONFIG.GEMINI_MODELS.primary,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
          },
        })
        .catch((err: any) => {
          logger.warn({ err: err?.message }, "Gemini request failed during email generation");
          return null;
        });

      const response = await Promise.race([
        aiPromise,
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000)),
      ]);

      if (response && (response as any).text) {
        const text = cleanJsonText((response as any).text);
        const parsed = JSON.parse(text);
        if (parsed && typeof parsed.subject === "string" && typeof parsed.body === "string") {
          return {
            subject: parsed.subject,
            body: parsed.body,
          };
        }
      }
    } catch (err: any) {
      logger.warn({ err: err?.message }, "Failed to generate email payload via Gemini, using fallback");
    }
  }

  return fallbackPayload;
}
