import Link from "next/link";
import { site } from "@/lib/site";


export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto bg-footer text-on-dark-soft">
      <div className="shell">
        <div className="flex flex-col gap-2 border-t border-footer-hairline py-6 t-body-sm sm:flex-row sm:items-center sm:justify-between">
          <p>
            &copy; {year} {site.name}
          </p>
        </div>
      </div>
    </footer>
  );
}
