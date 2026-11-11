import { useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
export function Help({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const id = useId(),
    button = useRef<HTMLButtonElement>(null),
    [open, setOpen] = useState(false);
  const rect = button.current?.getBoundingClientRect();
  return (
    <span
      className="builder-help"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        ref={button}
        type="button"
        aria-label={label}
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
            e.stopPropagation();
          }
        }}
      >
        i
      </button>
      {open &&
        rect &&
        createPortal(
          <span
            className="builder-tooltip"
            id={id}
            role="tooltip"
            style={{
              left: Math.max(
                8,
                Math.min(rect.left - 100, window.innerWidth - 256),
              ),
              top: Math.min(rect.bottom + 8, window.innerHeight - 110),
            }}
          >
            {children}
          </span>,
          document.body,
        )}
    </span>
  );
}
