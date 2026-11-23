"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import styles from "./detections.module.css";

export default function FilterSelect({ label, hint, value, options, onChange }: {
  label: string;
  hint?: string;
  value: string;
  options: readonly { key: string; label: string }[];
  onChange: (value: string) => void;
}) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const selected = Math.max(0, options.findIndex((option) => option.key === value));
  const [active, setActive] = useState(selected);

  useEffect(() => {
    if (!open) return;
    function dismiss(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [open]);

  useEffect(() => {
    if (open) root.current?.querySelectorAll<HTMLButtonElement>('[role="option"]')[active]?.focus();
  }, [open, active]);

  function choose(index: number) {
    onChange(options[index].key);
    setOpen(false);
    trigger.current?.focus();
  }

  return (
    <div className={styles.selectField} ref={root} onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }}>
      <span id={`${id}-label`}>{label}</span>{hint && <small>{hint}</small>}
      <button ref={trigger} type="button" className={styles.selectTrigger} aria-labelledby={`${id}-label ${id}-value`}
        aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? id : undefined}
        onClick={() => { setActive(selected); setOpen(!open); }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault(); setActive(selected); setOpen(true);
          }
        }}>
        <span id={`${id}-value`}>{options[selected].label}</span><ChevronDown size={16} aria-hidden="true" />
      </button>
      {open && <div id={id} role="listbox" aria-labelledby={`${id}-label`} className={styles.selectMenu}
        onKeyDown={(event) => {
          if (event.key === "Escape") { event.preventDefault(); setOpen(false); trigger.current?.focus(); }
          else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault(); setActive((current) => (current + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length);
          } else if (event.key === "Home" || event.key === "End") {
            event.preventDefault(); setActive(event.key === "Home" ? 0 : options.length - 1);
          } else if (event.key.length === 1 && event.key !== " ") {
            const index = options.findIndex((option) => option.label.startsWith(event.key));
            if (index >= 0) { event.preventDefault(); setActive(index); }
          }
        }}>
        {options.map((option, index) => <button type="button" role="option" key={option.key}
          aria-selected={value === option.key} tabIndex={index === active ? 0 : -1}
          onClick={() => choose(index)}>
          <span>{option.label}</span>{value === option.key && <Check size={16} aria-hidden="true" />}
        </button>)}
      </div>}
    </div>
  );
}
