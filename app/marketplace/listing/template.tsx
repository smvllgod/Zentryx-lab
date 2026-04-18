import { Suspense } from "react";

export default function MarketplaceListingTemplate({ children }: { children: React.ReactNode }) {
  return <Suspense>{children}</Suspense>;
}
