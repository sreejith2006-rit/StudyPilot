import * as React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className = "", hoverable = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`glass-panel ${hoverable ? "glass-panel-hover" : ""} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = "Card";

export const CardHeader = ({ className = "", children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`p-6 pb-3 flex flex-col space-y-1.5 ${className}`} {...props}>
    {children}
  </div>
);
CardHeader.displayName = "CardHeader";

export const CardTitle = ({ className = "", children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={`text-lg font-bold leading-none tracking-tight text-white ${className}`} {...props}>
    {children}
  </h3>
);
CardTitle.displayName = "CardTitle";

export const CardDescription = ({ className = "", children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={`text-xs text-muted-text font-medium ${className}`} {...props}>
    {children}
  </p>
);
CardDescription.displayName = "CardDescription";

export const CardContent = ({ className = "", children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`p-6 pt-0 ${className}`} {...props}>
    {children}
  </div>
);
CardContent.displayName = "CardContent";

export const CardFooter = ({ className = "", children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`p-6 pt-0 border-t border-white/[0.04] mt-4 flex items-center ${className}`} {...props}>
    {children}
  </div>
);
CardFooter.displayName = "CardFooter";
