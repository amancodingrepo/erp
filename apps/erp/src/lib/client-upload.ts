export async function uploadCampusFile(
  file: File,
  kind: string,
  ownerId?: string,
) {
  const form = new FormData();
  form.append("file", file);
  form.append("kind", kind);
  if (ownerId) form.append("ownerId", ownerId);
  const res = await fetch("/api/v1/files", { method: "POST", body: form });
  const json = (await res.json().catch(() => ({}))) as {
    url?: string;
    message?: string;
    fields?: { file?: string };
  };
  if (!res.ok || !json.url) {
    throw new Error(json.fields?.file ?? json.message ?? "upload failed");
  }
  return json.url;
}

export async function mediaUrlFromForm(
  form: FormData,
  kind: string,
  opts?: { urlName?: string; fileName?: string; ownerId?: string },
) {
  const file = form.get(opts?.fileName ?? "file");
  if (file instanceof File && file.size > 0) {
    return uploadCampusFile(file, kind, opts?.ownerId);
  }
  return String(form.get(opts?.urlName ?? "url") ?? "").trim();
}
