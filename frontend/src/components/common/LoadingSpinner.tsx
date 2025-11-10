import React from "react";

interface LoadingSpinnerProps {
  text?: string;
  className?: string;
}

export default function LoadingSpinner({
  text = "Loading...",
  className = "",
}: LoadingSpinnerProps) {
  return (
    <div className={`loading-state ${className}`}>
      <div className="spinner"></div>
      <span className="text">{text}</span>
    </div>
  );
}
