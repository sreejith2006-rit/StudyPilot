import * as React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", label, error, helperText, type = "text", ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label className="text-xs font-semibold text-muted-text uppercase tracking-wider pl-1">
            {label}
          </label>
        )}
        <input
          type={type}
          ref={ref}
          className={`glass-input px-4 py-3 text-sm focus:ring-2 focus:ring-primary-indigo/20 ${
            error 
              ? "border-danger/70 focus:border-danger focus:ring-danger/20" 
              : "border-white/10"
          } ${className}`}
          {...props}
        />
        {error ? (
          <span className="text-[11px] text-danger font-medium pl-1">{error}</span>
        ) : helperText ? (
          <span className="text-[11px] text-muted-text pl-1">{helperText}</span>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";
