export function downloadAttachment(file) {
  if (!file?.dataUrl && !file?.downloadUrl) return;
  const link=document.createElement('a');link.href=file.dataUrl||file.downloadUrl;link.download=file.name||'attachment';document.body.appendChild(link);link.click();link.remove();
}
