import Link from "next/link";
import { notFound } from "next/navigation";
import { publicCampusWebsite } from "@/lib/services/campus-branch";

export default async function SchoolWebsitePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  let site: Awaited<ReturnType<typeof publicCampusWebsite>>;
  try {
    site = await publicCampusWebsite(code);
  } catch {
    notFound();
  }
  const applyHref = `/apply?campus=${encodeURIComponent(site.campus.code ?? code)}`;
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      {site.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={site.logoUrl} alt="" className="mb-6 h-16 w-auto" />
      ) : null}
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--brass)]">
        {site.campus.name}
      </p>
      <h1 className="font-display mt-2 text-4xl">{site.tagline || site.campus.name}</h1>
      {site.about ? <p className="mt-4 text-sm leading-6">{site.about}</p> : null}
      <dl className="mt-6 space-y-1 text-sm text-[var(--muted)]">
        {site.address ? (
          <div>
            <dt className="inline font-medium">Address</dt>
            <dd className="inline"> · {site.address}</dd>
          </div>
        ) : null}
        {site.phone ? (
          <div>
            <dt className="inline font-medium">Phone</dt>
            <dd className="inline"> · {site.phone}</dd>
          </div>
        ) : null}
        {site.email ? (
          <div>
            <dt className="inline font-medium">Email</dt>
            <dd className="inline"> · {site.email}</dd>
          </div>
        ) : null}
      </dl>
      {site.links.length ? (
        <ul className="mt-6 space-y-2 text-sm">
          {site.links.map((link) => (
            <li key={link.id}>
              <a
                className="underline underline-offset-4"
                href={link.url}
                target="_blank"
                rel="noreferrer"
              >
                {link.title}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="mt-8 flex flex-wrap gap-4 text-sm">
        <Link className="underline underline-offset-4" href={applyHref}>
          Apply
        </Link>
        <Link className="underline underline-offset-4" href="/login">
          Login
        </Link>
      </p>
    </main>
  );
}
