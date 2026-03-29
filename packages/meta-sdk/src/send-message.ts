/**
 * Meta Graph API — DM 送信
 */

const GRAPH_API_BASE = "https://graph.instagram.com/v21.0";

interface SendMessageParams {
  recipientId: string;
  messageText: string;
  accessToken: string;
  igAccountId: string;
}

interface SendMessageResult {
  recipientId: string;
  messageId: string;
}

export async function sendTextMessage(
  params: SendMessageParams,
): Promise<SendMessageResult> {
  const { recipientId, messageText, accessToken, igAccountId } = params;

  const url = `${GRAPH_API_BASE}/${igAccountId}/messages`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text: messageText },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Meta API error: ${response.status} ${response.statusText} — ${errorBody}`,
    );
  }

  const data = (await response.json()) as {
    recipient_id: string;
    message_id: string;
  };

  return {
    recipientId: data.recipient_id,
    messageId: data.message_id,
  };
}
