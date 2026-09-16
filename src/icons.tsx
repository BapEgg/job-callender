import type { ReactNode } from "react";
const paths: Record<string, ReactNode> = {
  home: (
    <>
      <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"></path>
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5"></circle>
      <path d="m16 16 5 5"></path>
    </>
  ),
  briefcase: (
    <>
      <rect x="3" y="7" width="18" height="14" rx="2"></rect>
      <path d="M8 7V4h8v3M3 12a19 19 0 0 0 18 0M10 13h4"></path>
    </>
  ),
  folder: (
    <>
      <path d="M3 7V5a2 2 0 0 1 2-2h4l2 3h8a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"></path>
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2"></rect>
      <path d="M7 3v4M17 3v4M3 10h18M7 14h2M12 14h2M7 18h2"></path>
    </>
  ),
  settings: (
    <>
      <path d="m9 3-.6 2.2-2 .9-2-.7-2 3.5L4 10.5v2.9l-1.6 1.7 2 3.5 2-.7 2 .9L9 21h6l.6-2.2 2-.9 2 .7 2-3.5-1.6-1.7v-2.9l1.6-1.6-2-3.5-2 .7-2-.9L15 3z"></path>
      <circle cx="12" cy="12" r="3"></circle>
    </>
  ),
  arrow: (
    <>
      <path d="M5 12h14m-5-5 5 5-5 5"></path>
    </>
  ),
  back: (
    <>
      <path d="M19 12H5m5-5-5 5 5 5"></path>
    </>
  ),
  chevron: (
    <>
      <path d="m9 5 7 7-7 7"></path>
    </>
  ),
  down: (
    <>
      <path d="m6 9 6 6 6-6"></path>
    </>
  ),
  up: (
    <>
      <path d="m6 15 6-6 6 6"></path>
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14M5 12h14"></path>
    </>
  ),
  check: (
    <>
      <path d="m5 12 4 4L19 6"></path>
    </>
  ),
  checkCircle: (
    <>
      <circle cx="12" cy="12" r="9"></circle>
      <path d="m7 12 3 3 7-7"></path>
    </>
  ),
  circle: (
    <>
      <circle cx="12" cy="12" r="9"></circle>
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9"></circle>
      <path d="M12 7v5l3 2"></path>
    </>
  ),
  refresh: (
    <>
      <path d="M20 7v5h-5M4 17v-5h5"></path>
      <path d="M6.5 6a8 8 0 0 1 13 3M4.5 15a8 8 0 0 0 13 3"></path>
    </>
  ),
  external: (
    <>
      <path d="M14 3h7v7M10 14 21 3M11 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6"></path>
    </>
  ),
  bookmark: (
    <>
      <path d="M6 4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17l-6-4-6 4z"></path>
    </>
  ),
  bell: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"></path>
    </>
  ),
  file: (
    <>
      <path d="M14 2H5a1 1 0 0 0-1 1v18a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V8zM14 2v6h6M8 12h8M8 16h6"></path>
    </>
  ),
  edit: (
    <>
      <path d="m15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-5-5L4 14z"></path>
    </>
  ),
  link: (
    <>
      <path
        d="m10 13 4-4M8 16l-2 2a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0m2 1 2-2a4 4 0 0 1 6 6l-5 5a4 4 0 0 1-6 0"
        transform="translate(1 -1)"
      ></path>
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9"></circle>
      <path d="M12 11v6M12 7h.01"></path>
    </>
  ),
  alert: (
    <>
      <path d="m12 3 10 18H2zM12 9v5M12 17h.01"></path>
    </>
  ),
  layers: (
    <>
      <path d="m12 3 10 5-10 5L2 8zM2 12l10 5 10-5M2 16l10 5 10-5"></path>
    </>
  ),
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1"></rect>
      <rect x="14" y="3" width="7" height="7" rx="1"></rect>
      <rect x="3" y="14" width="7" height="7" rx="1"></rect>
      <rect x="14" y="14" width="7" height="7" rx="1"></rect>
    </>
  ),
  list: (
    <>
      <path d="M8 5h13M8 12h13M8 19h13M3 5h.01M3 12h.01M3 19h.01"></path>
    </>
  ),
  message: (
    <>
      <path d="M21 11a8 8 0 0 1-8 8H7l-5 3 2-6a8 8 0 0 1 0-10 10 10 0 0 1 17 5zM7 10h10M7 14h6"></path>
    </>
  ),
  spark: (
    <>
      <path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z"></path>
    </>
  ),
  monitor: (
    <>
      <rect x="2" y="3" width="20" height="14" rx="2"></rect>
      <path d="M8 21h8M12 17v4"></path>
    </>
  ),
  lock: (
    <>
      <rect x="4" y="10" width="16" height="12" rx="2"></rect>
      <path d="M8 10V6a4 4 0 0 1 8 0v4M12 15v3"></path>
    </>
  ),
  copy: (
    <>
      <rect x="8" y="8" width="13" height="13" rx="2"></rect>
      <path d="M16 8V3H3v13h5"></path>
    </>
  ),
  upload: (
    <>
      <path d="M12 16V3m-5 5 5-5 5 5M3 16v5h18v-5"></path>
    </>
  ),
  download: (
    <>
      <path d="M12 3v13m-5-5 5 5 5-5M3 16v5h18v-5"></path>
    </>
  ),
  close: (
    <>
      <path d="m6 6 12 12M6 18 18 6"></path>
    </>
  ),
  book: (
    <>
      <path d="M12 5C8 2 4 3 2 4v16c3-1 6-1 10 1 4-2 7-2 10-1V4c-3-1-6-1-10 1v16"></path>
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="7" r="4"></circle>
      <path d="M4 21v-3a8 8 0 0 1 16 0v3"></path>
    </>
  ),
  history: (
    <>
      <path d="M3 3v6h6M3.5 8a9 9 0 1 1-.1 8M12 7v5l4 2"></path>
    </>
  ),
  trash: (
    <>
      <path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"></path>
    </>
  ),
  filter: (
    <>
      <path d="M3 4h18l-7 8v7l-4 2v-9z"></path>
    </>
  ),
  palette: (
    <>
      <path d="M12 3a9 9 0 1 0 0 18h1a2 2 0 0 0 2-2c0-1-1-2 0-3s4 1 6-3C24 6 17 3 12 3z"></path>
      <path d="M7 10h.01M10 6h.01M15 6h.01M18 10h.01"></path>
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="9"></circle>
      <path d="M9 8a3 3 0 0 1 6 1c0 2-3 2-3 4M12 17h.01"></path>
    </>
  ),
  play: (
    <>
      <path d="m8 4 12 8-12 8z"></path>
    </>
  ),
  logout: (
    <>
      <path d="M10 3H3v18h7M8 12h13m-4-4 4 4-4 4"></path>
    </>
  ),
  eye: (
    <>
      <path d="M2 12c5-9 15-9 20 0-5 9-15 9-20 0z"></path>
      <circle cx="12" cy="12" r="3"></circle>
    </>
  ),
  stop: (
    <>
      <rect x="5" y="5" width="14" height="14" rx="2"></rect>
    </>
  ),
};
export function Icon({
  name,
  small = false,
  size,
}: {
  name: string;
  small?: boolean;
  size?: "sm" | "lg";
}) {
  return (
    <svg
      className={`icon ${size || (small ? "sm" : "")}`}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      {paths[name] ?? paths.file}
    </svg>
  );
}
