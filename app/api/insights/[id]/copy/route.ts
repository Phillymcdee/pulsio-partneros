import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { insights, signals, partners } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

/**
 * Copy outreach draft page
 * Shows the draft with copy-to-clipboard functionality
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    
    if (!user?.id) {
      // Redirect to sign in with callback
      const signInUrl = new URL('/auth/signin', request.url);
      signInUrl.searchParams.set('callbackUrl', request.url);
      return NextResponse.redirect(signInUrl);
    }

    // Get insight with draft
    const insightResult = await db
      .select({
        insight: insights,
        signal: signals,
        partner: partners,
      })
      .from(insights)
      .innerJoin(signals, eq(insights.signalId, signals.id))
      .innerJoin(partners, eq(signals.partnerId, partners.id))
      .where(and(eq(insights.id, id), eq(partners.userId, user.id)))
      .limit(1);

    if (insightResult.length === 0) {
      return NextResponse.redirect(new URL('/dashboard?error=insight_not_found', request.url));
    }

    const { insight, signal, partner } = insightResult[0];
    const draft = insight.outreachDraft || '';

    // Return HTML page with copy functionality
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Copy Outreach Draft - PartnerOS</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f3f4f6;
      padding: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .container {
      background: white;
      border-radius: 12px;
      padding: 32px;
      max-width: 800px;
      width: 100%;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    h1 {
      font-size: 24px;
      margin-bottom: 8px;
      color: #1f2937;
    }
    .meta {
      color: #6b7280;
      font-size: 14px;
      margin-bottom: 24px;
    }
    .draft-box {
      background: #f9fafb;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      padding: 16px;
      font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
      font-size: 14px;
      line-height: 1.6;
      white-space: pre-wrap;
      word-wrap: break-word;
      margin-bottom: 24px;
      min-height: 200px;
    }
    .button-group {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }
    button {
      padding: 12px 24px;
      border-radius: 6px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
    }
    .button-primary {
      background: #3b82f6;
      color: white;
    }
    .button-primary:hover {
      background: #2563eb;
    }
    .button-secondary {
      background: #e5e7eb;
      color: #374151;
    }
    .button-secondary:hover {
      background: #d1d5db;
    }
    .success-message {
      background: #d1fae5;
      color: #065f46;
      padding: 12px;
      border-radius: 6px;
      margin-bottom: 16px;
      display: none;
    }
    .success-message.show {
      display: block;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Outreach Draft</h1>
    <div class="meta">
      Partner: ${partner.name} | Signal: ${signal.title}
    </div>
    <div class="success-message" id="successMessage">
      ✓ Copied to clipboard!
    </div>
    <div class="draft-box" id="draftBox">${escapeHtml(draft)}</div>
    <div class="button-group">
      <button class="button-primary" onclick="copyToClipboard()">Copy to Clipboard</button>
      <button class="button-secondary" onclick="window.close()">Close</button>
      <a href="/dashboard" style="text-decoration: none;">
        <button class="button-secondary">Go to Dashboard</button>
      </a>
    </div>
  </div>
  <script>
    function copyToClipboard() {
      const draft = document.getElementById('draftBox').textContent;
      navigator.clipboard.writeText(draft).then(() => {
        const successMsg = document.getElementById('successMessage');
        successMsg.classList.add('show');
        setTimeout(() => {
          successMsg.classList.remove('show');
        }, 3000);
      }).catch(err => {
        alert('Failed to copy. Please select and copy manually.');
      });
    }
  </script>
</body>
</html>
    `;

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html' },
    });
  } catch (error) {
    console.error('Error loading draft:', error);
    return NextResponse.redirect(new URL('/dashboard?error=load_failed', request.url));
  }
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

