import { Fragment } from "react";
import ui from "./kidsUi.module.css";

export function StarIcon({ filled, className }: { filled: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={`${ui.star} ${filled ? ui.starOn : ui.starOff} ${className ?? ""}`}>
      <path d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4l-5.8 3.1 1.1-6.5-4.7-4.6 6.5-.9z" />
    </svg>
  );
}

export function StarRow({ stars, max = 3, size = "md", label }: { stars: number; max?: number; size?: "sm" | "md" | "lg"; label?: string }) {
  return (
    <span className={`${ui.stars} ${size !== "md" ? ui[`stars_${size}`] : ""}`} role="img" aria-label={label ?? `${stars} out of ${max} stars`}>
      {Array.from({ length: max }, (_, index) => (
        <StarIcon key={index} filled={index < stars} />
      ))}
    </span>
  );
}

/** Renders text where `backtick` segments become inline code. */
export function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split("`").map((part, index) =>
        index % 2 === 1 ? (
          <code key={index} className={ui.inlineCode}>
            {part}
          </code>
        ) : (
          <Fragment key={index}>{part}</Fragment>
        ),
      )}
    </>
  );
}
