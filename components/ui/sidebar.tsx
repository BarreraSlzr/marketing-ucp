import { cn } from "@/lib/utils";
import { Slot } from "@radix-ui/react-slot";
import * as React from "react";

export const SidebarProvider = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex min-h-dvh w-full", className)} {...props} />
);

export const Sidebar = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement>
>(({ className, ...props }, ref) => (
  <aside
    ref={ref}
    className={cn(
      "flex w-full flex-col border-b border-[var(--color-border)] bg-[color:var(--color-card)]/90 text-[var(--color-foreground)] backdrop-blur md:sticky md:top-0 md:h-dvh md:w-64 md:shrink-0 md:border-b-0 md:border-r",
      className,
    )}
    {...props}
  />
));
Sidebar.displayName = "Sidebar";

export const SidebarHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center gap-3 px-6 pt-6", className)}
    {...props}
  />
));
SidebarHeader.displayName = "SidebarHeader";

export const SidebarContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex-1 px-6 py-4", className)} {...props} />
));
SidebarContent.displayName = "SidebarContent";

export const SidebarFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "border-t border-[var(--color-border)] px-6 py-4 text-sm text-[var(--color-muted-foreground)]",
      className,
    )}
    {...props}
  />
));
SidebarFooter.displayName = "SidebarFooter";

export const SidebarMenu = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex flex-col gap-2", className)} {...props} />
));
SidebarMenu.displayName = "SidebarMenu";

export const SidebarMenuItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex", className)} {...props} />
));
SidebarMenuItem.displayName = "SidebarMenuItem";

interface SidebarMenuButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export const SidebarMenuButton = React.forwardRef<
  HTMLButtonElement,
  SidebarMenuButtonProps
>(({ className, asChild = false, type, ...props }, ref) => {
  const Component = (asChild ? Slot : "button") as React.ElementType;
  return (
    <Component
      ref={ref}
      type={asChild ? undefined : (type ?? "button")}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2 text-left text-sm font-medium text-[var(--color-foreground)] transition hover:border-[var(--color-border)] hover:bg-[var(--color-secondary)]",
        className,
      )}
      {...props}
    />
  );
});
SidebarMenuButton.displayName = "SidebarMenuButton";

export const SidebarInset = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement>
>(({ className, ...props }, ref) => (
  <main
    ref={ref}
    className={cn("flex min-w-0 flex-1 flex-col", className)}
    {...props}
  />
));
SidebarInset.displayName = "SidebarInset";
