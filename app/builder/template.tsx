import { Suspense } from "react";

export default function BuilderTemplate({ children }: { children: React.ReactNode }) {
  return <Suspense>{children}</Suspense>;
}
