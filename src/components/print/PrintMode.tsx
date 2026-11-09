"use client";

import { createContext, useContext } from "react";

// 印刷用の中身を作っているかどうか。画面では閉じておく一覧（施設の一覧など）を、紙では開いて出すために使う（023）
const PrintModeContext = createContext(false);

export const PrintModeProvider = PrintModeContext.Provider;

export function usePrintMode(): boolean {
  return useContext(PrintModeContext);
}
