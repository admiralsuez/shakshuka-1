import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function useKeyboardShortcuts(
  onNewTask?: () => void,
  onPlanner?: () => void
) {
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only enable shortcuts on localhost
      if (typeof window !== "undefined" && !window.location.hostname.includes("localhost")) {
        return;
      }

      // Ignore if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      // N - New Task (open add task dialog)
      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        if (onNewTask) onNewTask();
      }

      // P - Planner
      if (e.key === "p" || e.key === "P") {
        e.preventDefault();
        if (onPlanner) {
          onPlanner();
        } else {
          router.push("/planner");
        }
      }

      // Override browser defaults on localhost
      // Ctrl/Cmd + S - Prevent default save
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
      }

      // Ctrl/Cmd + P - Prevent default print (navigate to planner instead)
      if ((e.ctrlKey || e.metaKey) && e.key === "p") {
        e.preventDefault();
        router.push("/planner");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onNewTask, onPlanner, router]);
}