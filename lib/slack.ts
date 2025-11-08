import type { DigestItem } from './digest';

export async function sendSlackDigest(
  webhookUrl: string,
  items: DigestItem[]
): Promise<void> {
  const baseUrl = process.env.AUTH_URL || 'http://localhost:3000';
  
  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: '📊 Partner Pulse',
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `Here are your top ${items.length} partner insights this week:`,
      },
    },
    {
      type: 'divider',
    },
  ];

  items.forEach((item) => {
    blocks.push(
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${item.partner}* | Score: ${item.score}\n<${item.signalUrl}|${item.signalTitle}>`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `_${item.why}_\n\n*Recommendation:* ${item.recommendation}\n*Action:* ${item.action}`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `\`\`\`${item.outreachDraft}\`\`\``,
        },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '👍 Useful',
            },
            url: `${baseUrl}/api/insights/${item.insightId}/feedback?type=thumbs_up`,
            style: 'primary',
          },
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '👎 Not Useful',
            },
            url: `${baseUrl}/api/insights/${item.insightId}/feedback?type=thumbs_down`,
          },
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Mark N/A',
            },
            url: `${baseUrl}/api/insights/${item.insightId}/feedback?type=na`,
          },
        ],
      } as any,
      {
        type: 'divider',
      }
    );
  });

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      blocks,
    }),
  });

  if (!response.ok) {
    throw new Error(`Slack webhook failed: ${response.statusText}`);
  }
}

