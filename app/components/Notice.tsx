"use client";

import { CircleCheck, TriangleAlert } from "lucide-react";

/** A page's status message ("Saved!", "Error: …"), green or red from its wording. */
export default function Notice({ text }: { text?: string | null }) {
  if (!text) return null;
  const error = /^(error|failed|could not|an error|something went wrong)/i.test(text.trim());
  return (
    <div className={`rd-alert ${error ? "rd-alert--error" : "rd-alert--success"}`} role={error ? "alert" : "status"}>
      {error ? <TriangleAlert size={16} /> : <CircleCheck size={16} />}
      <span>{text}</span>
    </div>
  );
}
