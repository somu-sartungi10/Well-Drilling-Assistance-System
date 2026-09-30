import * as React from "react"
import { cn } from "cn"

const CARD_SPACING = "1.5rem" // matches the original v4 spacing token

function Card({
  className,
  size = "default",
  ...props
}: React.ComponentProps<"div"> & { size?: "default" | "sm" }) {
  const spacing = size === "sm" ? "1rem" : CARD_SPACING
  return (
    <div
      data-slot="card"
      data-size={size}
      style={{ ["--card-spacing" as string]: spacing }}
      className={cn(
        "group/card flex flex-col gap-6 overflow-hidden rounded-3xl bg-card py-6 text-sm text-card-foreground shadow-md ring-1 ring-foreground/5 data-[size=sm]:gap-4 data-[size=sm]:rounded-2xl data-[size=sm]:py-4 dark:ring-foreground/10",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "grid auto-rows-min items-start gap-1.5 px-6 data-[slot=card-action]:grid-cols-[1fr_auto] data-[slot=card-action]:col-start-2 data-[slot=card-action]:row-start-1 data-[slot=card-action]:row-span-2",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("text-base font-medium", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn("self-start justify-self-end", className)}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6", className)}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
