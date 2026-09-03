import type { ReactNode } from 'react';

/*
  Körbchen icon set — hand-drawn line icons in the "Care-Journal" spirit.
  All 24×24, drawn on a common grid with round caps/joins, coloured via
  `currentColor` so they inherit whatever text colour their container uses
  (muted taupe in a resting tab, cream in an active one, rosé in a heading).
  Size with a utility class, e.g. <IconDrink className="h-5 w-5" />.
*/

interface IconProps {
  className?: string;
  strokeWidth?: number;
  // Give an icon a label only when it carries meaning of its own (a recurrence
  // marker, a "goal reached" mark). Decorative icons next to visible text stay
  // unlabelled and are hidden from screen readers.
  'aria-label'?: string;
}

function Icon({
  className,
  strokeWidth = 1.7,
  'aria-label': ariaLabel,
  children,
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={ariaLabel ? 'img' : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
    >
      {children}
    </svg>
  );
}

// Baby bottle — hydration.
export function IconDrink(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M9 7.5h6v9.2a3 3 0 0 1-3 3 3 3 0 0 1-3-3z" />
      <path d="M9 7.5V6h6v1.5" />
      <path d="M10.4 6c0-2.3 3.2-2.3 3.2 0" />
      <path d="M11 11.5h2M11 14.5h2" />
    </Icon>
  );
}

// Folded nappy — diapering.
export function IconDiaper(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M4 7.5h16c0 6-3.6 10.5-8 10.5S4 13.5 4 7.5z" />
      <path d="M4 7.7c2.2 1.3 5 1.9 8 1.9s5.8-.6 8-1.9" />
      <circle cx="6.6" cy="9.4" r=".9" fill="currentColor" stroke="none" />
      <circle cx="17.4" cy="9.4" r=".9" fill="currentColor" stroke="none" />
    </Icon>
  );
}

// Five-point star — rewards. `filled` for earned/emphasis.
export function IconStar({ filled, ...p }: IconProps & { filled?: boolean }) {
  return (
    <Icon {...p}>
      <path
        d="M12 3.4l2.5 5.15 5.6.8-4.05 3.95.95 5.6L12 21.3l-5-2.4.95-5.6L3.9 9.35l5.6-.8z"
        fill={filled ? 'currentColor' : 'none'}
      />
    </Icon>
  );
}

// Hand bell — quick-call.
export function IconBell(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M6 16.2h12l-1.5-2.2a2 2 0 0 1-.35-1.12V10a4.15 4.15 0 0 0-8.3 0v2.88a2 2 0 0 1-.35 1.12z" />
      <path d="M10.1 19a2 2 0 0 0 3.8 0" />
      <path d="M12 5.8V4.2" />
    </Icon>
  );
}

// Calendar page — schedule.
export function IconCalendar(p: IconProps) {
  return (
    <Icon {...p}>
      <rect x="4" y="5" width="16" height="15" rx="2.6" />
      <path d="M4 9.2h16" />
      <path d="M8 3.4v3.2M16 3.4v3.2" />
      <circle cx="12" cy="14.2" r="1.35" fill="currentColor" stroke="none" />
    </Icon>
  );
}

// Sliders — setup / settings.
export function IconSliders(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M5 8.2h8M17.5 8.2H19" />
      <circle cx="15" cy="8.2" r="2.1" />
      <path d="M5 15.8h1.5M11 15.8h8" />
      <circle cx="8.5" cy="15.8" r="2.1" />
    </Icon>
  );
}

// Little basket — the app itself (Körbchen).
export function IconBasket(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M4.2 9h15.6l-1.25 8.8a2 2 0 0 1-2 1.7H7.45a2 2 0 0 1-2-1.7z" />
      <path d="M3.2 9h17.6" />
      <path d="M8 9a4 4 0 0 1 8 0" />
      <path d="M9.3 12.4l.5 4M12 12.4v4M14.7 12.4l-.5 4" />
    </Icon>
  );
}

// Duffel bag — packing lists.
export function IconBag(p: IconProps) {
  return (
    <Icon {...p}>
      <rect x="3.5" y="9" width="17" height="10.5" rx="3.2" />
      <path d="M8.6 9V7.7A2.6 2.6 0 0 1 11.2 5.1h1.6A2.6 2.6 0 0 1 15.4 7.7V9" />
      <path d="M3.5 13.2h17" />
      <path d="M12 12v2.4" />
    </Icon>
  );
}

// Teddy bear — plushie Steckbriefe.
export function IconTeddy(p: IconProps) {
  return (
    <Icon {...p}>
      <circle cx="7.2" cy="6.6" r="2.2" />
      <circle cx="16.8" cy="6.6" r="2.2" />
      <path d="M12 20.4c-3.5 0-6.2-2.5-6.2-5.9S8.5 8.2 12 8.2s6.2 2.9 6.2 6.3-2.7 5.9-6.2 5.9z" />
      <circle cx="9.7" cy="13.1" r=".9" fill="currentColor" stroke="none" />
      <circle cx="14.3" cy="13.1" r=".9" fill="currentColor" stroke="none" />
      <path d="M12 15.4c-1 0-1.7.6-1.7 1.4s.7 1.4 1.7 1.4 1.7-.6 1.7-1.4-.7-1.4-1.7-1.4z" />
      <path d="M12 15.4v-1.1" />
    </Icon>
  );
}

// Paw print — pupp role.
export function IconPaw(p: IconProps) {
  return (
    <Icon {...p}>
      <circle cx="8" cy="9" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="7.5" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="16" cy="9" r="1.5" fill="currentColor" stroke="none" />
      <path d="M12 12.2c-2.6 0-4.6 1.8-4.6 3.8 0 1.6 1.4 2.3 3 2.3h3.2c1.6 0 3-.7 3-2.3 0-2-2-3.8-4.6-3.8z" />
    </Icon>
  );
}

// Heart — caregiver role.
export function IconHeart({ filled, ...p }: IconProps & { filled?: boolean }) {
  return (
    <Icon {...p}>
      <path
        d="M12 20.3 4.8 13a4.3 4.3 0 0 1 6.1-6.05l1.1 1.1 1.1-1.1A4.3 4.3 0 0 1 19.2 13z"
        fill={filled ? 'currentColor' : 'none'}
      />
    </Icon>
  );
}

// Alarm clock — reminder.
export function IconAlarm(p: IconProps) {
  return (
    <Icon {...p}>
      <circle cx="12" cy="13.2" r="6.4" />
      <path d="M12 9.6v3.6l2.4 1.4" />
      <path d="M5.6 5.6 3.7 3.7M18.4 5.6 20.3 3.7" />
    </Icon>
  );
}

// Loop arrows — recurrence.
export function IconRepeat(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M4 9.5a5 5 0 0 1 5-5h7" />
      <path d="M13.8 1.9 16.6 4.5 13.8 7.1" />
      <path d="M20 14.5a5 5 0 0 1-5 5H8" />
      <path d="M10.2 22.1 7.4 19.5 10.2 16.9" />
    </Icon>
  );
}

// Pencil — edit.
export function IconPencil(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M4 20h4L18.3 9.7a1.8 1.8 0 0 0 0-2.5l-1.5-1.5a1.8 1.8 0 0 0-2.5 0L4 16z" />
      <path d="M13.5 6.7 17.3 10.5" />
    </Icon>
  );
}

// Trash — delete.
export function IconTrash(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M5 7h14" />
      <path d="M9 7V5.6A1.6 1.6 0 0 1 10.6 4h2.8A1.6 1.6 0 0 1 15 5.6V7" />
      <path d="M6.6 7 7.5 18.9A2 2 0 0 0 9.5 20.8h5A2 2 0 0 0 16.5 18.9L17.4 7" />
      <path d="M10 11v6M14 11v6" />
    </Icon>
  );
}

// Cross — dismiss / remove.
export function IconX(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M6.6 6.6 17.4 17.4M17.4 6.6 6.6 17.4" />
    </Icon>
  );
}

// Check — confirm / acknowledge.
export function IconCheck(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M5 12.5 10 17.5 19 6.8" />
    </Icon>
  );
}

export function IconChevronLeft(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M14.5 6 8.5 12l6 6" />
    </Icon>
  );
}

export function IconChevronRight(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M9.5 6l6 6-6 6" />
    </Icon>
  );
}

// Sparkle — a reached goal / celebration.
export function IconSparkle(p: IconProps) {
  return (
    <Icon {...p}>
      <path
        d="M12 3.5c.45 3.9 1.6 5.05 5.5 5.5-3.9.45-5.05 1.6-5.5 5.5-.45-3.9-1.6-5.05-5.5-5.5 3.9-.45 5.05-1.6 5.5-5.5z"
        fill="currentColor"
      />
      <path d="M18.5 15.5c.2 1.6.7 2.1 2.3 2.3-1.6.2-2.1.7-2.3 2.3-.2-1.6-.7-2.1-2.3-2.3 1.6-.2 2.1-.7 2.3-2.3z" fill="currentColor" />
    </Icon>
  );
}
