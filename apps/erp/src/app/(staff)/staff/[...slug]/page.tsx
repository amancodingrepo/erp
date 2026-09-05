import { Workbench } from "@/components/modules/workbench";

export default async function CatalogScreenPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const href = `/staff/${slug.join("/")}`;
  return <Workbench href={href} />;
}
