import axios from 'axios';

export function getSlackChartUrl(chartConfig: Record<string, unknown>) {
  const encoded = encodeURIComponent(JSON.stringify(chartConfig));
  return `https://quickchart.io/chart?c=${encoded}&width=600&height=360&devicePixelRatio=2`;
}

export async function sendSlackMessage(webhookUrl: string, text: string, blocks?: any[], imageUrl?: string) {
  const payload: Record<string, unknown> = { text };

  const messageBlocks = blocks ? [...blocks] : [];
  if (imageUrl) {
    messageBlocks.push({
      type: 'image',
      image_url: imageUrl,
      alt_text: 'Test metrics chart',
    });
  }

  if (messageBlocks.length > 0) {
    payload.blocks = messageBlocks;
  }

  await axios.post(webhookUrl, payload, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
