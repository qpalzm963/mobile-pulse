import type { Metadata } from "next";
import config from "@payload-config";
import { RootPage, generatePageMetadata } from "@payloadcms/next/views";
import { getPayload } from "payload";
import { BespokeStudioDashboard } from "@/components/admin/BespokeStudioDashboard";
import { importMap } from "../importMap";

type Args = {
  params: Promise<{
    segments?: string[];
  }>;
  searchParams: Promise<{
    [key: string]: string | string[];
  }>;
};

export const generateMetadata = ({ params, searchParams }: Args): Promise<Metadata> =>
  generatePageMetadata({ config, params: params as unknown as Parameters<typeof generatePageMetadata>[0]["params"], searchParams });

const Page = async ({ params, searchParams }: Args) => {
  const resolvedParams = await params;
  const segments = resolvedParams?.segments || [];

  // When visiting /admin directly, display the Bespoke Studio Dashboard
  if (segments.length === 0) {
    let articles: Parameters<typeof BespokeStudioDashboard>[0]["initialArticles"] = [];
    let tags: Parameters<typeof BespokeStudioDashboard>[0]["initialTags"] = [];
    try {
      const payload = await getPayload({ config });
      const [artRes, tagRes] = await Promise.all([
        payload.find({ collection: "articles", limit: 100, sort: "-updatedAt" }),
        payload.find({ collection: "tags", limit: 50 }),
      ]);
      articles = artRes.docs as unknown as Parameters<typeof BespokeStudioDashboard>[0]["initialArticles"];
      tags = tagRes.docs as unknown as Parameters<typeof BespokeStudioDashboard>[0]["initialTags"];
    } catch (e) {
      console.error("Payload initial fetch error:", e);
    }
    return <BespokeStudioDashboard initialArticles={articles} initialTags={tags} />;
  }

  return RootPage({ config, params: params as unknown as Parameters<typeof RootPage>[0]["params"], searchParams, importMap });
};

export default Page;
