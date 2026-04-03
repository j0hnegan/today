"use client";

interface RestScreenProps {
  message?: string;
  onNavigateVault?: () => void;
  onRandomTask?: () => void;
  onReadyForTask?: () => void;
  hasAvailableTasks?: boolean;
  hasSomedayTasks?: boolean;
}

export function RestScreen({
  message = "Nothing critical today. Rest without guilt.",
  onNavigateVault,
  onRandomTask,
  onReadyForTask,
  hasAvailableTasks,
  hasSomedayTasks,
}: RestScreenProps) {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="text-center space-y-4 max-w-sm animate-fade-in-up">
        <h2 className="text-xl font-medium tracking-tight">{message}</h2>
        <p className="text-sm text-muted-foreground">
          You can browse the{" "}
          <button
            onClick={onNavigateVault}
            className="underline hover:text-foreground transition-colors"
          >
            My Tasks
          </button>{" "}
          anytime if you want to.
        </p>
        {hasSomedayTasks && onReadyForTask && (
          <p className="text-sm text-muted-foreground">
            <button
              onClick={onReadyForTask}
              className="underline hover:text-foreground transition-colors"
            >
              I&apos;m ready for a task
            </button>
          </p>
        )}
        {hasAvailableTasks && onRandomTask && (
          <p className="text-sm text-muted-foreground">
            <button
              onClick={onRandomTask}
              className="underline hover:text-foreground transition-colors"
            >
              or give me something anyway
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
