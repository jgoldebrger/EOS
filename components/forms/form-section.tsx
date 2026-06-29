import { cn } from "@/lib/utils";

interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormSection({
  title,
  description,
  children,
  className,
}: FormSectionProps) {
  const sectionId = `form-section-${title.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <section className={cn("space-y-4", className)} aria-labelledby={sectionId}>
      <div className="space-y-1">
        <h3 id={sectionId} className="text-base font-semibold tracking-tight">
          {title}
        </h3>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
