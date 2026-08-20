import Link from "next/link";

export function MarketingFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-xs text-muted-foreground sm:flex-row sm:px-6">
        <span>&copy; {new Date().getFullYear()} Altpitch. All rights reserved.</span>
        <div className="flex items-center gap-4">
          <Link href="/pricing" className="hover:text-foreground">Pricing</Link>
          <Link href="/blog" className="hover:text-foreground">Blog</Link>
          <Link href="/terms" className="hover:text-foreground">Terms</Link>
          <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
        </div>
      </div>
    </footer>
  );
}
