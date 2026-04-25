const LEFT_SECTIONS = ["Workspaces", "Files", "History"] as const;

function EmptySection({ title }: { title: string }) {
  return (
    <section aria-label={title} className="flex min-h-0 flex-1 flex-col gap-2">
      <h2 className="text-xs font-semibold text-gray-600">{title}</h2>
      <div
        className="min-h-12 flex-1 border border-dashed border-gray-200 bg-gray-50"
        style={{ borderRadius: "var(--agent-radius-r6)" }}
      />
    </section>
  );
}

export function LeftPane() {
  return (
    <aside
      aria-label="Agent workspace navigation"
      className="flex h-full flex-col gap-4 bg-white p-4 shadow-sm"
      data-testid="agent-left-pane"
      style={{ borderRadius: "var(--agent-radius-r10)" }}
    >
      {LEFT_SECTIONS.map((section) => (
        <EmptySection key={section} title={section} />
      ))}
    </aside>
  );
}
