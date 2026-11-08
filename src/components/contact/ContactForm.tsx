"use client";

import { type FormEvent, useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  CONTACT_API_PATH,
  CONTACT_HONEYPOT_FIELD,
  CONTACT_MESSAGE_MAX_LENGTH,
  type ContactError,
  contactMessageLength,
  contactMessageProblem,
} from "@/lib/contact/rules";

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent" }
  | { kind: "failed"; text: string };

// 送れなかったときの文言。どれも入力は消さない（035）
export const CONTACT_FAILURE_TEXT = {
  offline: "圏外のため送れませんでした。つながる場所で、もう一度「送る」を押してください。",
  empty: "お問い合わせの内容を書いてください。",
  tooLong: `${CONTACT_MESSAGE_MAX_LENGTH.toLocaleString("ja-JP")}文字以内にしてください。`,
  rateLimited: "続けて送られたため、受け付けを止めています。1分ほど待ってから、もう一度送ってください。",
  unavailable: "いまは送れませんでした。時間をおいて、もう一度送ってください。",
} as const;

export const CONTACT_SENT_TEXT = "送りました。ありがとうございました。";

function failureText(error: ContactError | undefined): string {
  if (error === "rate-limited") return CONTACT_FAILURE_TEXT.rateLimited;
  return CONTACT_FAILURE_TEXT.unavailable;
}

// お問い合わせの入力欄（035・要件 F-15）。本文だけを画面の Worker に送り、Worker が Discord に届ける
export function ContactForm() {
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const messageId = useId();
  const countId = useId();
  const length = contactMessageLength(message);
  const overLimit = length > CONTACT_MESSAGE_MAX_LENGTH;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const problem = contactMessageProblem(message);
    if (problem !== null) {
      setStatus({ kind: "failed", text: problem === "empty" ? CONTACT_FAILURE_TEXT.empty : CONTACT_FAILURE_TEXT.tooLong });
      return;
    }
    if (!navigator.onLine) {
      setStatus({ kind: "failed", text: CONTACT_FAILURE_TEXT.offline });
      return;
    }
    setStatus({ kind: "sending" });
    try {
      const response = await fetch(CONTACT_API_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, [CONTACT_HONEYPOT_FIELD]: honeypot }),
      });
      const result = (await response.json().catch(() => null)) as { ok?: boolean; error?: ContactError } | null;
      if (response.ok && result?.ok) {
        setMessage("");
        setStatus({ kind: "sent" });
        return;
      }
      setStatus({ kind: "failed", text: failureText(result?.error) });
    } catch {
      // つながらなかった（送っている途中で圏外になったなど）
      setStatus({ kind: "failed", text: navigator.onLine ? CONTACT_FAILURE_TEXT.unavailable : CONTACT_FAILURE_TEXT.offline });
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3">
      <label htmlFor={messageId} className="font-bold">
        お問い合わせの内容
      </label>
      <textarea
        id={messageId}
        name="message"
        value={message}
        onChange={(event) => {
          setMessage(event.target.value);
          if (status.kind !== "sending") setStatus({ kind: "idle" });
        }}
        rows={8}
        aria-describedby={countId}
        aria-invalid={overLimit || undefined}
        className="w-full rounded-button border-2 border-line bg-surface p-3 text-base leading-relaxed focus-visible:border-primary focus-visible:outline-none"
      />
      <p id={countId} className={["text-right text-sm", overLimit ? "font-bold text-ink" : "text-ink-muted"].join(" ")}>
        {length.toLocaleString("ja-JP")} / {CONTACT_MESSAGE_MAX_LENGTH.toLocaleString("ja-JP")}文字
      </p>

      {/* 人には見えない欄（ハニーポット）。自動で全部の欄を埋めるプログラムだけが値を入れる */}
      <div aria-hidden="true" className="absolute -left-[9999px] size-px overflow-hidden">
        <label>
          この欄は空のままにしてください
          <input
            type="text"
            name={CONTACT_HONEYPOT_FIELD}
            value={honeypot}
            onChange={(event) => setHoneypot(event.target.value)}
            tabIndex={-1}
            autoComplete="off"
          />
        </label>
      </div>

      <Button type="submit" disabled={status.kind === "sending"} className="self-start">
        {status.kind === "sending" ? "送っています…" : "送る"}
      </Button>

      <div aria-live="polite">
        {status.kind === "sent" ? (
          <p role="status" className="rounded-card border border-primary bg-primary-soft px-4 py-3 font-bold text-primary">
            {CONTACT_SENT_TEXT}
          </p>
        ) : null}
        {status.kind === "failed" ? (
          <p role="alert" className="rounded-card border-2 border-ink bg-kinari-deep px-4 py-3 font-bold">
            {status.text}
          </p>
        ) : null}
      </div>
    </form>
  );
}
