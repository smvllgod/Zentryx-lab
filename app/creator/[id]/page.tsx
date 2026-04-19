import CreatorProfileClient from "./CreatorProfileClient";

// Static export pre-renders a single "_" placeholder; Netlify rewrites
// any /creator/<real-id>/ to it (see netlify.toml). The client reads the
// real id from window.location and fetches the profile at runtime.
export function generateStaticParams() {
  return [{ id: "_" }];
}

export const dynamicParams = false;

export default function Page() {
  return <CreatorProfileClient />;
}
