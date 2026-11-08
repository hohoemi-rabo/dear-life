// お問い合わせ（035・要件 F-15）の決めごと。画面（/contact）と画面の Worker（workers/site）の両方が使うので、
// ブラウザにも Worker にもない API は使わない

export const CONTACT_API_PATH = "/api/contact";

// 本文の長さ（文字数）。Discord の1メッセージの上限 2,000 文字に、見出しを足しても収まる長さにした
export const CONTACT_MESSAGE_MAX_LENGTH = 1000;

// 人には見えない入力欄（ハニーポット）の名前。自動で全部の欄を埋めるプログラムだけが値を入れる
export const CONTACT_HONEYPOT_FIELD = "website";

export type ContactPayload = {
  message: string;
  [CONTACT_HONEYPOT_FIELD]?: string;
};

// 絵文字などのサロゲートペアを1文字と数える（String#length だと2文字になり、画面の表示とずれる）
export function contactMessageLength(message: string): number {
  return Array.from(message.trim()).length;
}

export type ContactMessageProblem = "empty" | "too-long";

export function contactMessageProblem(message: string): ContactMessageProblem | null {
  const length = contactMessageLength(message);
  if (length === 0) return "empty";
  if (length > CONTACT_MESSAGE_MAX_LENGTH) return "too-long";
  return null;
}

// 送れなかった理由。Worker は応答の error にこの値を入れ、画面は文言に替える
export type ContactError = "invalid" | "forbidden" | "rate-limited" | "unavailable";
