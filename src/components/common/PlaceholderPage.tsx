interface PlaceholderPageProps {
  title: string;
  phase: number;
}

export function PlaceholderPage({ title, phase }: PlaceholderPageProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-2 text-center p-6">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-muted-foreground text-sm">Coming in Phase {phase}</p>
    </div>
  );
}
