import React from "react";

interface StandardFormProps {
  title?: string;
  onSubmit: (e: React.FormEvent) => void;
  children: React.ReactNode;
  actions: React.ReactNode;
  loading?: boolean;
  className?: string;
  containerClass?: "card" | "panel";
}

export const StandardForm: React.FC<StandardFormProps> = ({
  title,
  onSubmit,
  children,
  actions,
  loading = false,
  className = "",
  containerClass = "card",
}) => {
  return (
    <div className={`${containerClass} ${className}`}>
      {title && <h2 className="heading-2 mb-6">{title}</h2>}
      <form onSubmit={onSubmit} className="form-container">
        {children}
        <div className="form-actions">{actions}</div>
      </form>
    </div>
  );
};
