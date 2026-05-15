import axios from 'axios';

export async function sendSlackMessage(webhookUrl: string, text: string, blocks?: any[]) {
  const payload: Record<string, unknown> = { text };

  if (blocks) {
    payload.blocks = blocks;
  }

  await axios.post(webhookUrl, payload, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
}