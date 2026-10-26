"use client";

import { Component, Suspense, use, useSyncExternalStore, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ScreenSkeleton } from "@/components/ui/Skeleton";
import { ScreenDataError } from "@/lib/data/fetch-screen-data";
import { clearScreenDataCache, loadScreenData } from "@/lib/data/load-screen-data";
import { ScreenDataFormatError, type ScreenData } from "@/lib/data/screen-data";

// 画面のデータを読む。ScreenDataBoundary の中でだけ使う（読み込み中は骨組みを出し、失敗したら再試行のボタンを出す）
export function useScreenData(): ScreenData {
  return use(loadScreenData());
}

function isLoadError(error: unknown): boolean {
  return error instanceof ScreenDataError || error instanceof ScreenDataFormatError;
}

type ErrorBoundaryProps = { children: ReactNode };
type ErrorBoundaryState = { error: unknown };

// データの読み込みの失敗だけを受け止める。ほかのエラー（画面の不具合）はそのまま上（error.tsx）に渡す
class LoadErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { error };
  }

  private retry = () => {
    clearScreenDataCache();
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (error === null) return this.props.children;
    if (!isLoadError(error)) throw error;
    return <LoadErrorMessage onRetry={this.retry} />;
  }
}

export function LoadErrorMessage({ onRetry }: { onRetry: () => void }) {
  return (
    <Card as="section" role="alert" className="flex flex-col items-start gap-3">
      <h2 className="text-lg font-bold">データを読み込めませんでした</h2>
      <p>通信の状態を確かめて、もう一度読み込んでください。</p>
      <Button onClick={onRetry}>もう一度読み込む</Button>
    </Card>
  );
}

const subscribeNothing = () => () => {};

// 静的書き出しのビルドではデータを読まない（ビルド時に読むと、そのときのデータが HTML に固まってしまう）。
// ビルドとハイドレーションのあいだは骨組みを出し、ブラウザで動き出してから読み込む
export function ScreenDataBoundary({ children, fallback = <ScreenSkeleton /> }: { children: ReactNode; fallback?: ReactNode }) {
  const inBrowser = useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  );
  if (!inBrowser) return fallback;
  return (
    <LoadErrorBoundary>
      <Suspense fallback={fallback}>{children}</Suspense>
    </LoadErrorBoundary>
  );
}
