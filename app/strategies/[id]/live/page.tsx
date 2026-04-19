import LiveClient from "./LiveClient";

// Static export pre-renders a single "_" placeholder; Netlify rewrites
// any /strategies/<real-id>/live/ to it. The client reads the real id
// from window.location and fetches the live telemetry feed.
export function generateStaticParams() {
  return [{ id: "_" }];
}

export const dynamicParams = false;

export default function Page() {
  return <LiveClient />;
}
