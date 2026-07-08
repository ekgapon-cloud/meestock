/** Opens the server-rendered PDF (see lib/pdf/) in a new tab — the browser's own PDF viewer covers print/save from there. */
export function DownloadPdfButton({ href }: { href: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="btn-secondary-sm print-hide">
      ดาวน์โหลด PDF
    </a>
  );
}
