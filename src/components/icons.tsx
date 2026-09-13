/** Small line icons. 16px grid, 1.4 stroke, no fills. */
const S = ({ children, size = 16 }: { children: React.ReactNode; size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.4}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
)

export const IconMap = () => (
  <S>
    <circle cx="8" cy="3.2" r="1.6" />
    <circle cx="3.4" cy="12.2" r="1.6" />
    <circle cx="12.6" cy="12.2" r="1.6" />
    <path d="M7 4.6 4.4 10.8M9 4.6l2.6 6.2M5 12.2h6" />
  </S>
)
export const IconSearchCompanies = () => (
  <S>
    <circle cx="7" cy="7" r="4.2" />
    <path d="M10.2 10.2 14 14" />
  </S>
)
export const IconDoc = () => (
  <S>
    <path d="M4 2.2h5l3 3v8.6H4z" />
    <path d="M9 2.2V5.4h3M6 8.4h4M6 10.8h3" />
  </S>
)
export const IconSleeves = () => (
  <S>
    <rect x="2.2" y="3" width="11.6" height="3.2" rx="1" />
    <rect x="2.2" y="9.8" width="7.4" height="3.2" rx="1" />
  </S>
)
export const IconQueue = () => (
  <S>
    <path d="M2.6 4.4h10.8M2.6 8h10.8M2.6 11.6h6.4" />
  </S>
)
export const IconJournal = () => (
  <S>
    <path d="M3.4 2.6h9.2v10.8H3.4z" />
    <path d="M5.8 2.6v10.8M7.8 5.6h3M7.8 8h3" />
  </S>
)
export const IconChat = () => (
  <S>
    <path d="M2.6 7.2c0-2.5 2.4-4.4 5.4-4.4s5.4 1.9 5.4 4.4-2.4 4.4-5.4 4.4c-.7 0-1.4-.1-2-.3l-2.6 1.2.7-2.2a4.2 4.2 0 0 1-1.5-3.1Z" />
  </S>
)
export const IconClose = () => (
  <S>
    <path d="M4 4l8 8M12 4l-8 8" />
  </S>
)
export const IconPlus = () => (
  <S>
    <path d="M8 3.4v9.2M3.4 8h9.2" />
  </S>
)
export const IconExternal = () => (
  <S>
    <path d="M7 3.4H3.4v9.2h9.2V9" />
    <path d="M9.4 2.8h3.8v3.8M13.2 2.8 7.8 8.2" />
  </S>
)
export const IconCheck = () => (
  <S>
    <path d="M3.2 8.4 6.4 11.6 12.8 4.8" />
  </S>
)
export const IconReset = () => (
  <S>
    <path d="M13 8a5 5 0 1 1-1.6-3.7" />
    <path d="M13.4 2.6v3h-3" />
  </S>
)
export const IconPin = () => (
  <S>
    <path d="M8 9.6V14" />
    <path d="M5 2.4h6l-.9 4.1 1.3 1.4H4.6l1.3-1.4z" />
  </S>
)
