import { useEffect, useId, useRef, useState, type ReactNode } from "react";
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
    tooltip = useRef<HTMLSpanElement>(null),
    pointerFocus = useRef(false),
    [open, setOpen] = useState(false);
  const rect = button.current?.getBoundingClientRect();
  useEffect(() => {
    if (!open) return;
    function outside(event: PointerEvent) {
      const target = event.target as Node;
      if (
        !button.current?.contains(target) &&
        !tooltip.current?.contains(target)
      )
        setOpen(false);
    }
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  return (
    <span
      className="builder-help"
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") setOpen(true);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === "mouse") setOpen(false);
      }}
    >
      <button
        ref={button}
        type="button"
        aria-label={label}
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        onPointerDown={() => {
          pointerFocus.current = true;
        }}
        onPointerCancel={() => {
          pointerFocus.current = false;
        }}
        onFocus={() => {
          if (!pointerFocus.current) setOpen(true);
        }}
        onBlur={() => {
          pointerFocus.current = false;
          setOpen(false);
        }}
        onClick={() => {
          // Touch focus can arrive after pointerup; suppress it until click.
          pointerFocus.current = false;
          setOpen((value) => !value);
        }}
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
            ref={tooltip}
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
