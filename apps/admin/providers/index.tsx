"use client";

import React from "react";
import { QueryProvider } from "./query-provider";
import { ToastProvider } from "./toast-provider";

export { QueryProvider } from "./query-provider";
export { ToastProvider } from "./toast-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <ToastProvider>
        {children}
      </ToastProvider>
    </QueryProvider>
  );
}
