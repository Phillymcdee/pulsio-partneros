import { Resend } from 'resend';
import type { DigestItem } from './digest';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendDigestEmail(
  to: string,
  subject: string,
  items: DigestItem[]
): Promise<void> {
  const html = generateEmailHtml(items);

  await resend.emails.send({
    from: process.env.EMAIL_FROM || 'PartnerOS <noreply@partneros.com>',
    to,
    subject,
    html,
  });
}

function generateEmailHtml(items: DigestItem[]): string {
  const baseUrl = process.env.AUTH_URL || 'http://localhost:3000';
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .item { border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
    .header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px; }
    .partner { font-weight: 600; color: #1f2937; }
    .score { background: #3b82f6; color: white; padding: 4px 12px; border-radius: 12px; font-size: 14px; font-weight: 600; }
    .signal-title { font-size: 18px; font-weight: 600; margin-bottom: 8px; }
    .signal-title a { color: #2563eb; text-decoration: none; }
    .why { color: #4b5563; margin-bottom: 12px; }
    .recommendation { background: #f3f4f6; padding: 12px; border-radius: 6px; margin-bottom: 12px; }
    .action { font-weight: 600; color: #059669; margin-bottom: 12px; }
    .outreach-draft { background: #f9fafb; border-left: 3px solid #3b82f6; padding: 12px; margin-bottom: 12px; font-family: monospace; font-size: 14px; white-space: pre-wrap; }
    .buttons { display: flex; gap: 8px; margin-top: 16px; flex-wrap: wrap; }
    .button { display: inline-block; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-size: 14px; }
    .button-primary { background: #3b82f6; color: white; }
    .button-secondary { background: #e5e7eb; color: #374151; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Partner Pulse</h1>
    <p>Here are your top partner insights this week:</p>
    
    ${items.map((item, idx) => `
      <div class="item">
        <div class="header">
          <span class="partner">${item.partner}</span>
          <span class="score">Score: ${item.score}</span>
        </div>
        <div class="signal-title">
          <a href="${item.signalUrl}" target="_blank">${item.signalTitle}</a>
        </div>
        <div class="why">${item.why}</div>
        <div class="recommendation">${item.recommendation}</div>
        <div class="action">Recommended Action: ${item.action}</div>
        <div class="outreach-draft">${item.outreachDraft}</div>
        <div class="buttons">
          <a href="${baseUrl}/api/insights/${item.insightId}/copy" class="button button-primary" target="_blank">📋 Copy Draft</a>
          <a href="${baseUrl}/api/insights/${item.insightId}/feedback?type=thumbs_up" class="button button-secondary" target="_blank">👍 Useful</a>
          <a href="${baseUrl}/api/insights/${item.insightId}/feedback?type=thumbs_down" class="button button-secondary" target="_blank">👎 Not Useful</a>
          <a href="${baseUrl}/api/insights/${item.insightId}/feedback?type=na" class="button button-secondary" target="_blank">Mark N/A</a>
        </div>
      </div>
    `).join('')}
    
    <p style="margin-top: 32px; color: #6b7280; font-size: 14px;">
      <a href="${baseUrl}/dashboard">View Dashboard</a> | 
      <a href="${baseUrl}/settings/channels">Manage Preferences</a>
    </p>
  </div>
</body>
</html>
  `;
}

