import React from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "./ThemeContext";
import type { Theme } from "./ThemeContext";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const themes = [
    { value: "light" as const, icon: Sun, label: "Light" },
    { value: "dark" as const, icon: Moon, label: "Dark" },
    { value: "system" as const, icon: Monitor, label: "System" },
  ];

  const handleThemeChange = (newTheme: Theme) => {
    // Use View Transitions API for smooth circular animation
    if (!document.startViewTransition) {
      // Fallback for browsers that don't support View Transitions
      setTheme(newTheme);
      return;
    }

    // Find the logo element and calculate its center position
    const logo = document.getElementById("boilermap-logo");
    if (logo) {
      const rect = logo.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;

      // Set CSS custom properties for the animation origin
      document.documentElement.style.setProperty("--logo-x", `${x}px`);
      document.documentElement.style.setProperty("--logo-y", `${y}px`);
    } else {
      // Fallback to top-left if logo not found
      document.documentElement.style.setProperty("--logo-x", "0px");
      document.documentElement.style.setProperty("--logo-y", "0px");
    }

    document.startViewTransition(() => {
      setTheme(newTheme);
    });
  };

  return (
    <div className="flex items-center gap-1 bg-surface rounded-lg p-1 border border-border">
      {themes.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => handleThemeChange(value)}
          className={`
            flex items-center gap-2 px-3 py-2 rounded-md transition-all duration-200
            ${
              theme === value
                ? "bg-primary-500 text-white shadow-sm"
                : "text-text-muted hover:text-text-primary hover:bg-surface-light"
            }
          `}
          title={label}
          aria-label={`Switch to ${label.toLowerCase()} theme`}
        >
          <Icon size={16} />
          <span className="text-sm font-medium hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}
