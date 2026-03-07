import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

interface SelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  title?: string;
  className?: string;
  compact?: boolean;
}

export function CustomSelect({
  value,
  options,
  onChange,
  placeholder = "Select...",
  title,
  className = "",
  compact = false,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value);
  const displayLabel = selectedOption?.label || placeholder;

  // Position state for the fixed dropdown
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0, openUp: false });

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        wrapperRef.current && !wrapperRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleToggle = () => {
    if (!isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUp = spaceBelow < 200;
      const dropWidth = Math.max(rect.width, 180);
      setPos({
        top: openUp ? rect.top : rect.bottom + 4,
        left: rect.right - dropWidth,
        width: dropWidth,
        openUp,
      });
    }
    setIsOpen(!isOpen);
  };

  return (
    <div
      ref={wrapperRef}
      className={`custom-select ${compact ? "compact" : ""} ${className}`}
    >
      <button
        ref={triggerRef}
        type="button"
        className={`custom-select-trigger ${isOpen ? "open" : ""} ${!selectedOption ? "placeholder" : ""}`}
        onClick={handleToggle}
        title={title}
      >
        <span className="custom-select-label">{displayLabel}</span>
        <span className="custom-select-arrow">{isOpen ? "\u25B4" : "\u25BE"}</span>
      </button>
      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            className="custom-select-dropdown"
            style={{
              position: "fixed",
              top: pos.openUp ? undefined : pos.top,
              bottom: pos.openUp ? window.innerHeight - pos.top + 4 : undefined,
              left: pos.left,
              width: pos.width,
            }}
          >
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`custom-select-option ${opt.value === value ? "selected" : ""}`}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
}
