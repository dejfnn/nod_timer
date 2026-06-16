import type { ReactNode } from 'react'

const paths: Record<string, ReactNode> = {
  play: <path d="M8 5.4v13.2L19 12z" fill="currentColor" stroke="none" />,
  stop: <rect x="7" y="7" width="10" height="10" rx="1.5" fill="currentColor" stroke="none" />,
  plus: <path d="M12 5v14M5 12h14" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  check: <path d="m5 12.5 4.5 4.5L19 7" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </>
  ),
  chart: <path d="M5 20v-9m7 9V4m7 16v-6" />,
  calendar: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M4 10h16M8 3v4m8-4v4" />
    </>
  ),
  folder: (
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
  ),
  users: (
    <>
      <circle cx="9" cy="8.5" r="3.5" />
      <path d="M3.5 19.5c.6-3.2 2.7-5 5.5-5s4.9 1.8 5.5 5" />
      <path d="M15.5 5.6a3 3 0 0 1 0 5.8M17.5 14.7c1.7.6 2.7 2.2 3 4.3" />
    </>
  ),
  tag: (
    <>
      <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z" />
      <circle cx="7.5" cy="7.5" r="1.3" fill="currentColor" stroke="none" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2.5v3m0 13v3m-9.5-9.5h3m13 0h3M5.3 5.3l2.1 2.1m9.2 9.2 2.1 2.1m0-13.4-2.1 2.1M7.4 16.6l-2.1 2.1" />
    </>
  ),
  dollar: (
    <path d="M12 3.5v17M16 7.5c-.7-1.3-2.2-2-4-2-2.2 0-4 1.2-4 3s1.6 2.5 4 3 4 1.3 4 3.2-1.8 3-4 3c-1.8 0-3.3-.7-4-2" />
  ),
  trash: <path d="M5 7h14M10 4h4M7.5 7l.7 13h7.6l.7-13M10 11v5.5M14 11v5.5" />,
  pencil: <path d="m15 5 4 4L8.5 19.5 4 20.5l1-4.5z" />,
  copy: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </>
  ),
  dots: (
    <>
      <circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20.5 20.5-4.5-4.5" />
    </>
  ),
  chevronLeft: <path d="m14.5 6-6 6 6 6" />,
  chevronRight: <path d="m9.5 6 6 6-6 6" />,
  download: <path d="M12 3.5V15m0 0 4.5-4.5M12 15l-4.5-4.5M4.5 20h15" />,
  upload: <path d="M12 15V3.5m0 0L7.5 8M12 3.5 16.5 8M4.5 20h15" />,
  archive: (
    <>
      <rect x="3" y="4" width="18" height="4.5" rx="1" />
      <path d="M5 8.5V19a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8.5M10 12.5h4" />
    </>
  ),
  keyboard: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M7 10h.01M11 10h.01M15 10h.01M7 14h10" />
    </>
  ),
}

export type IconName = keyof typeof paths

interface IconProps {
  name: IconName
  size?: number
  className?: string
}

export const Icon = ({ name, size = 18, className }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden
  >
    {paths[name]}
  </svg>
)
