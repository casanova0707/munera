const LINE_PUSH_URL = "https://api.line.me/v2/bot/message/push";

interface LineMessage {
  type: "text";
  text: string;
}

export async function sendLinePush(
  lineUserId: string,
  messages: LineMessage[]
): Promise<void> {
  const res = await fetch(LINE_PUSH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.LINE_MESSAGING_CHANNEL_TOKEN}`,
    },
    body: JSON.stringify({
      to: lineUserId,
      messages,
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`LINE push failed: ${error}`);
  }
}

export function buildExpenseReminderMessage(
  staffName: string,
  pendingCount: number
): LineMessage {
  return {
    type: "text",
    text: `【Munera】${staffName}さん、未承認の経費申請が${pendingCount}件あります。確認をお願いします。`,
  };
}
