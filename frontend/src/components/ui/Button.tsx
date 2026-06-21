import * as React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "glow";
  size?: "sm" | "md" | "lg";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "primary", size = "md", children, ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-300 active:scale-98 select-none disabled:opacity-50 disabled:pointer-events-none cursor-pointer";
    
    const variants = {
      primary: "bg-primary-indigo hover:bg-primary-indigo/90 text-white shadow-lg shadow-primary-indigo/20",
      secondary: "bg-white/[0.06] border border-white/10 hover:bg-white/[0.1] text-white",
      outline: "border border-primary-indigo/40 hover:border-primary-indigo bg-transparent text-white",
      ghost: "hover:bg-white/[0.05] text-muted-text hover:text-white bg-transparent",
      danger: "bg-danger hover:bg-danger/90 text-white shadow-lg shadow-danger/20",
      glow: "glow-btn text-white"
    };

    const sizes = {
      sm: "px-3.5 py-1.5 text-xs gap-1.5",
      md: "px-5 py-2.5 text-sm gap-2",
      lg: "px-7 py-3.5 text-base gap-2.5"
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
