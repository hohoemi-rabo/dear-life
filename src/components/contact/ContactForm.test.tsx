import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CONTACT_MESSAGE_MAX_LENGTH } from "@/lib/contact/rules";
import { CONTACT_FAILURE_TEXT, CONTACT_SENT_TEXT, ContactForm } from "./ContactForm";

const fetchMock = vi.fn();
let online = true;

beforeEach(() => {
  fetchMock.mockReset();
  online = true;
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(navigator, "onLine", "get").mockImplementation(() => online);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const textbox = () => screen.getByRole("textbox", { name: "お問い合わせの内容" }) as HTMLTextAreaElement;

async function send(message: string) {
  fireEvent.change(textbox(), { target: { value: message } });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "送る" }));
  });
}

function respond(status: number, body: unknown) {
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));
}

describe("ContactForm", () => {
  it("本文と空のハニーポットを送り、送れたら入力を消して知らせる", async () => {
    respond(200, { ok: true });
    render(<ContactForm />);
    await send("鼎の保育園の数が違います");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/contact");
    expect(JSON.parse(init.body as string)).toEqual({ message: "鼎の保育園の数が違います", website: "" });
    expect(screen.getByRole("status")).toHaveTextContent(CONTACT_SENT_TEXT);
    expect(textbox().value).toBe("");
  });

  it("空の本文・長すぎる本文は送らずに知らせる", async () => {
    render(<ContactForm />);
    await send("   ");
    expect(screen.getByRole("alert")).toHaveTextContent(CONTACT_FAILURE_TEXT.empty);

    await send("あ".repeat(CONTACT_MESSAGE_MAX_LENGTH + 1));
    expect(screen.getByRole("alert")).toHaveTextContent(CONTACT_FAILURE_TEXT.tooLong);
    expect(screen.getByText(`1,001 / 1,000文字`)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("圏外では送らず、入力は残す", async () => {
    online = false;
    render(<ContactForm />);
    await send("こんにちは");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(CONTACT_FAILURE_TEXT.offline);
    expect(textbox().value).toBe("こんにちは");
  });

  it("連続送信で弾かれたとき・送れなかったときは理由を出し、入力は残す", async () => {
    render(<ContactForm />);
    respond(429, { ok: false, error: "rate-limited" });
    await send("こんにちは");
    expect(screen.getByRole("alert")).toHaveTextContent(CONTACT_FAILURE_TEXT.rateLimited);

    respond(502, { ok: false, error: "unavailable" });
    await send("こんにちは");
    expect(screen.getByRole("alert")).toHaveTextContent(CONTACT_FAILURE_TEXT.unavailable);

    // 開発サーバーなど、Worker がなく JSON でない応答が返るとき
    fetchMock.mockResolvedValueOnce(new Response("Not Found", { status: 404 }));
    await send("こんにちは");
    expect(screen.getByRole("alert")).toHaveTextContent(CONTACT_FAILURE_TEXT.unavailable);

    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await send("こんにちは");
    expect(screen.getByRole("alert")).toHaveTextContent(CONTACT_FAILURE_TEXT.unavailable);
    expect(textbox().value).toBe("こんにちは");
  });
});
