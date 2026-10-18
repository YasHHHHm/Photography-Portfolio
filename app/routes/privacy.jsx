import { PageHeader } from "../components/content/PageHeader.jsx";
import { Prose } from "../components/content/Prose.jsx";
import { getPrivacy } from "../lib/content.server.js";
import { seo } from "../lib/seo.js";

export const loader = () => getPrivacy();

/** @type {import("react-router").MetaFunction} */
export const meta = (args) =>
  seo(args, {
    title: "Privacy",
    description:
      "How this site handles your data: no cookies, no tracking, and contact messages used only to reply.",
  });

/**
 * Privacy, from content/privacy.md.
 * @param {{ loaderData: { html: string } }} props
 */
export default function Privacy({ loaderData }) {
  return (
    <div className="mx-auto flex max-w-page flex-col gap-12 px-(--gutter) pt-28 md:pt-36">
      <PageHeader title="Privacy" size="l" />
      <Prose html={loaderData.html} />
    </div>
  );
}
