import PostDetailClient from "./PostDetailClient";

// Static export placeholder — Netlify rewrites /community/posts/<id>/ here.
export function generateStaticParams() {
  return [{ id: "_" }];
}

export const dynamicParams = false;

export default function Page() {
  return <PostDetailClient />;
}
