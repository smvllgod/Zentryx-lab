import StrategyDetailClient from "./StrategyDetailClient";

// Strategy IDs are user-generated and fetched client-side at runtime.
// A single "_" placeholder is pre-rendered for static export; Netlify
// rewrites any /admin/strategies/<id>/ to it (see netlify.toml), and
// the client reads the real id from window.location.
export function generateStaticParams() {
  return [{ id: "_" }];
}

export const dynamicParams = false;

export default function Page() {
  return <StrategyDetailClient />;
}
