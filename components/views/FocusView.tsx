"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { EnergyCheckin } from "@/components/focus/EnergyCheckin";
import { FocusCard } from "@/components/focus/FocusCard";
import { SnoozeModal } from "@/components/focus/SnoozeModal";
import { CompletionScreen } from "@/components/focus/CompletionScreen";
import { RestScreen } from "@/components/focus/RestScreen";
import { TimeSlider } from "@/components/focus/TimeSlider";
import { TaskEditModal } from "@/components/vault/TaskEditModal";
import { Button } from "@/components/ui/button";
import { useTasks, useSettings, useLatestCheckin, useTags } from "@/lib/hooks";
import {
  selectTask,
  selectRandomTask,
  selectPullTask,
  hasRemainingUrgentTasks,
} from "@/lib/taskSelector";
import type { EnergyLevel, Task, TimeAvailable } from "@/lib/types";

type Screen =
  | "loading"
  | "energy_check"
  | "time_question"
  | "focus_card"
  | "completed"
  | "rest";

interface FocusViewProps {
  onNavigateVault?: () => void;
  onEnergyChange?: (energy: EnergyLevel | null) => void;
  resetEnergyRef?: React.MutableRefObject<(() => void) | null>;
}

export function FocusView({ onNavigateVault, onEnergyChange, resetEnergyRef }: FocusViewProps) {
  const {
    data: tasks,
    isLoading: tasksLoading,
    mutate: mutateTasks,
  } = useTasks({
    destination: "on_deck",
    status: "active",
  });
  const {
    data: somedayTasks,
    mutate: mutateSomeday,
  } = useTasks({
    destination: "someday",
    status: "active",
  });
  const { data: settings, isLoading: settingsLoading } = useSettings();
  const { data: latestCheckin, isLoading: checkinLoading } =
    useLatestCheckin();
  const { data: tags } = useTags();

  const [screen, setScreen] = useState<Screen>("loading");
  const [energy, setEnergy] = useState<EnergyLevel | null>(null);
  const [timeAvailable, setTimeAvailable] = useState<
    TimeAvailable | undefined
  >(undefined);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [completedTask, setCompletedTask] = useState<Task | null>(null);
  const [restMessage, setRestMessage] = useState<string | undefined>(
    undefined
  );
  const [showSnooze, setShowSnooze] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const initializedRef = useRef(false);

  // Check if a new energy check-in is needed
  const needsCheckin = useCallback((): boolean => {
    const intervalHours = parseInt(
      settings?.checkin_interval_hours ?? "4",
      10
    );
    if (typeof window === "undefined") return true;
    const lastCheckinStr = localStorage.getItem("focus_last_checkin_at");
    if (!lastCheckinStr) return true;
    const hoursSince =
      (Date.now() - new Date(lastCheckinStr).getTime()) / (1000 * 60 * 60);
    return hoursSince >= intervalHours;
  }, [settings]);

  // Initialize once all data has loaded
  useEffect(() => {
    if (tasksLoading || settingsLoading || checkinLoading) return;
    if (initializedRef.current) return;
    initializedRef.current = true;

    if (needsCheckin()) {
      setScreen("energy_check");
    } else if (latestCheckin) {
      const e = latestCheckin.energy;
      setEnergy(e);
      onEnergyChange?.(e);
      if (e === "high" || e === "medium") {
        setScreen("time_question");
      } else {
        const result = selectTask({
          energy: e,
          onDeckTasks: tasks ?? [],
        });
        if (result.task) {
          setCurrentTask(result.task);
          setScreen("focus_card");
        } else {
          setRestMessage(result.message);
          setScreen("rest");
        }
      }
    } else {
      setScreen("energy_check");
    }
  }, [
    tasksLoading,
    settingsLoading,
    checkinLoading,
    latestCheckin,
    tasks,
    settings,
    needsCheckin,
    onEnergyChange,
  ]);

  // --- handlers ---

  function handleEnergySelect(e: EnergyLevel) {
    setEnergy(e);
    onEnergyChange?.(e);
    if (e === "high" || e === "medium") {
      setScreen("time_question");
    } else {
      // Run selection immediately with current tasks
      const result = selectTask({
        energy: e,
        onDeckTasks: tasks ?? [],
      });
      if (result.task) {
        setCurrentTask(result.task);
        setScreen("focus_card");
      } else {
        setRestMessage(result.message);
        setScreen("rest");
      }
    }
  }

  async function handleTimeSelect(t: TimeAvailable) {
    setTimeAvailable(t);
    const result = selectTask({
      energy: energy ?? "high",
      timeAvailable: t,
      onDeckTasks: tasks ?? [],
    });
    if (result.task) {
      setCurrentTask(result.task);
      setScreen("focus_card");
    } else {
      // Medium/high energy: auto-pull from someday instead of resting
      const pool = somedayTasks ?? [];
      const pulled = selectPullTask(pool);
      if (pulled) {
        setScreen("loading");
        try {
          const res = await fetch(`/api/tasks/${pulled.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ destination: "on_deck" }),
          });
          if (res.ok) {
            const updated = await res.json();
            setCurrentTask(updated);
            setScreen("focus_card");
            mutateTasks();
            mutateSomeday();
            return;
          }
        } catch {
          // fall through to rest
        }
      }
      setRestMessage(result.message);
      setScreen("rest");
    }
  }

  async function handleDone() {
    if (!currentTask) return;
    await fetch(`/api/tasks/${currentTask.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "done" }),
    });
    setCompletedTask(currentTask);
    setCurrentTask(null);
    setScreen("completed");
    mutateTasks();
  }

  function handleContinue() {
    setScreen("loading");
    mutateTasks().then(async (freshTasks) => {
      if (!freshTasks || !energy) {
        setScreen("rest");
        return;
      }
      const result = selectTask({
        energy,
        timeAvailable,
        onDeckTasks: freshTasks,
      });
      if (result.task) {
        setCurrentTask(result.task);
        setScreen("focus_card");
      } else if (energy !== "low") {
        // Medium/high energy: auto-pull from someday
        const freshSomeday = await mutateSomeday();
        const pulled = selectPullTask(freshSomeday ?? []);
        if (pulled) {
          try {
            const res = await fetch(`/api/tasks/${pulled.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ destination: "on_deck" }),
            });
            if (res.ok) {
              const updated = await res.json();
              setCurrentTask(updated);
              setScreen("focus_card");
              mutateTasks();
              mutateSomeday();
              return;
            }
          } catch {
            // fall through to rest
          }
        }
        setRestMessage(result.message);
        setScreen("rest");
      } else {
        setRestMessage(result.message);
        setScreen("rest");
      }
    });
  }

  function handleSnoozed() {
    setShowSnooze(false);
    setScreen("loading");
    mutateTasks().then(async (freshTasks) => {
      if (!freshTasks || !energy) {
        setScreen("rest");
        return;
      }
      const result = selectTask({
        energy,
        timeAvailable,
        onDeckTasks: freshTasks,
      });
      if (result.task) {
        setCurrentTask(result.task);
        setScreen("focus_card");
      } else if (energy !== "low") {
        // Medium/high energy: auto-pull from someday
        const freshSomeday = await mutateSomeday();
        const pulled = selectPullTask(freshSomeday ?? []);
        if (pulled) {
          try {
            const res = await fetch(`/api/tasks/${pulled.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ destination: "on_deck" }),
            });
            if (res.ok) {
              const updated = await res.json();
              setCurrentTask(updated);
              setScreen("focus_card");
              mutateTasks();
              mutateSomeday();
              return;
            }
          } catch {
            // fall through to rest
          }
        }
        setRestMessage(result.message);
        setScreen("rest");
      } else {
        setRestMessage(result.message);
        setScreen("rest");
      }
    });
  }

  function handleUpdateEnergy() {
    setEnergy(null);
    onEnergyChange?.(null);
    setTimeAvailable(undefined);
    setCurrentTask(null);
    initializedRef.current = false;
    setScreen("energy_check");
  }

  // Expose handleUpdateEnergy to parent via ref
  useEffect(() => {
    if (resetEnergyRef) {
      resetEnergyRef.current = handleUpdateEnergy;
    }
  });

  function handleEditTask() {
    if (currentTask) {
      setEditingTask(currentTask);
    }
  }

  function handleEditClose() {
    setEditingTask(null);
    // Refresh tasks so the FocusCard reflects any edits
    mutateTasks().then((freshTasks) => {
      if (!freshTasks || !energy) return;
      // Re-select the current task from the fresh data in case it was edited
      if (currentTask) {
        const updated = freshTasks.find((t: Task) => t.id === currentTask.id);
        if (updated && updated.status === "active") {
          setCurrentTask(updated);
        } else {
          // Task was deleted or completed via edit — select next
          const result = selectTask({
            energy,
            timeAvailable,
            onDeckTasks: freshTasks,
          });
          if (result.task) {
            setCurrentTask(result.task);
            setScreen("focus_card");
          } else {
            setRestMessage(result.message);
            setScreen("rest");
          }
        }
      }
    });
  }

  function handleRandomTask() {
    if (!energy || !tasks) return;
    const task = selectRandomTask({
      energy,
      timeAvailable,
      onDeckTasks: tasks,
    });
    if (task) {
      setCurrentTask(task);
      setScreen("focus_card");
    }
  }

  async function handlePullTask() {
    const pool = somedayTasks ?? [];
    const task = selectPullTask(pool);
    if (!task) return;

    // Move task to on_deck
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination: "on_deck" }),
      });
      if (!res.ok) return;
      const updated = await res.json();
      setCurrentTask(updated);
      setScreen("focus_card");
      mutateTasks();
      mutateSomeday();
    } catch {
      // silently fail
    }
  }

  // --- render ---

  const userName = settings?.user_name ?? "there";

  const hasAvailableTasks =
    (tasks ?? []).filter(
      (t) => t.status === "active" && (!t.snoozed_until || new Date(t.snoozed_until) <= new Date())
    ).length > 0;

  const isLowEnergyDone =
    energy === "low" &&
    completedTask !== null &&
    tasks !== undefined &&
    !hasRemainingUrgentTasks(tasks, completedTask.id);

  return (
    <div className="relative flex flex-col h-full">
      {screen === "energy_check" && (
        <EnergyCheckin userName={userName} onSelect={handleEnergySelect} />
      )}

      {screen === "time_question" && energy === "medium" && (
        <TimeSlider onSelect={handleTimeSelect} />
      )}

      {screen === "time_question" && energy === "high" && (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center space-y-6 max-w-md">
            <h2 className="text-xl font-medium tracking-tight">
              How much time do you have?
            </h2>
            <div className="flex gap-3 justify-center flex-wrap">
              <Button
                variant="outline"
                size="lg"
                onClick={() => handleTimeSelect("xs")}
              >
                1-15 min
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => handleTimeSelect("small")}
              >
                15-30 min
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => handleTimeSelect("medium")}
              >
                30-60 min
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => handleTimeSelect("large")}
              >
                60+ min
              </Button>
            </div>
          </div>
        </div>
      )}

      {screen === "focus_card" && currentTask && (
        <>
          <FocusCard
            task={currentTask}
            onDone={handleDone}
            onSnooze={() => setShowSnooze(true)}
            onEdit={handleEditTask}
          />
          {showSnooze && (
            <SnoozeModal
              task={currentTask}
              open={true}
              onClose={() => setShowSnooze(false)}
              onSnoozed={handleSnoozed}
            />
          )}
          {editingTask && (
            <TaskEditModal
              task={editingTask}
              allTags={tags ?? []}
              open={true}
              onClose={handleEditClose}
            />
          )}
        </>
      )}

      {screen === "completed" && (
        <CompletionScreen
          isLowEnergyDone={isLowEnergyDone}
          onContinue={handleContinue}
          onRest={() => {
            setRestMessage(undefined);
            setScreen("rest");
          }}
        />
      )}

      {screen === "rest" && (
        <RestScreen
          message={restMessage}
          onNavigateVault={onNavigateVault}
          onRandomTask={handleRandomTask}
          onReadyForTask={handlePullTask}
          hasAvailableTasks={hasAvailableTasks}
          hasSomedayTasks={(somedayTasks ?? []).filter(
            (t) => t.status === "active" && (!t.snoozed_until || new Date(t.snoozed_until) <= new Date())
          ).length > 0}
        />
      )}
    </div>
  );
}
