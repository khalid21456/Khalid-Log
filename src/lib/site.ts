const GITHUB_URL = "https://github.com/khalid21456";
const LINKEDIN_URL = "https://www.linkedin.com/in/khalid-edaoudi-8b27a130b/";
const INSTAGRAM_URL = "https://www.instagram.com/khalid_da2045/";

export const site = {
  name: "Khalid Edaoudi",
  wordmark: "Khalid's Log",
  tagline: "Welcome to my blog site",
  description:
    "Hi, this is Khalid. I’m documenting my learning notes in this blog.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",

  author: {
    name: "Khalid Edaoudi",
    initials: "KE",
    role: "Software developer",
  },

  nav: [
    { href: "/", label: "Home" },
    { href: "/blog", label: "Blog" },
  ],

  /** Icon links shown in the top nav and repeated at the bottom of the mobile sheet. */
  social: [
    { platform: "github", href: GITHUB_URL, label: "GitHub" },
    { platform: "linkedin", href: LINKEDIN_URL, label: "LinkedIn" },
    { platform: "instagram", href: INSTAGRAM_URL, label: "Instagram" },
  ],

  footerColumns: [
    {
      heading: "Writing",
      links: [
        { href: "/blog", label: "All posts" },
        { href: "/blog?tag=engineering", label: "Engineering" },
        { href: "/blog?tag=design", label: "Design" },
      ],
    },
    {
      heading: "Topics",
      links: [
        { href: "/blog?tag=typescript", label: "TypeScript" },
        { href: "/blog?tag=python", label: "Python" },
        { href: "/blog?tag=process", label: "Process" },
      ],
    },
    {
      heading: "Elsewhere",
      links: [
        { href: GITHUB_URL, label: "GitHub", external: true },
        { href: LINKEDIN_URL, label: "LinkedIn", external: true },
        { href: INSTAGRAM_URL, label: "Instagram", external: true },
      ],
    },
  ],
} as const;

export type Site = typeof site;
