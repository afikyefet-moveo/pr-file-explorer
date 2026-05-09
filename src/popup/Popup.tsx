import { useEffect, useState, type ReactElement } from "react";
import { ArrowLeftRight, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Segmented, type SegmentedOption } from "@/components/ui/segmented";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  DEFAULT_SETTINGS,
  getSettings,
  onSettingsChanged,
  setSettings,
  type ScrollTarget,
  type Settings,
} from "@/shared/settings";

const SCROLL_OPTIONS: ReadonlyArray<SegmentedOption<ScrollTarget>> = [
  { value: "filesTop", label: "Files top" },
  { value: "pageTop", label: "Page top" },
];

export function Popup(): ReactElement {
  const [settings, setLocalSettings] = useState<Settings | null>(null);

  useEffect(() => {
    let active = true;
    void getSettings().then((next) => {
      if (active) {
        setLocalSettings(next);
      }
    });
    const unsubscribe = onSettingsChanged((next) => {
      if (active) {
        setLocalSettings(next);
      }
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const update = async (patch: Partial<Settings>): Promise<void> => {
    const optimistic = { ...(settings ?? DEFAULT_SETTINGS), ...patch };
    setLocalSettings(optimistic);
    await setSettings(patch);
  };

  if (!settings) {
    return (
      <div className="flex h-[260px] items-center justify-center">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const swapBindings = async (): Promise<void> => {
    await update({
      backToTopClickAction: settings.backToTopShiftClickAction,
      backToTopShiftClickAction: settings.backToTopClickAction,
    });
  };

  const bindingsDisabled = !settings.backToTopEnabled;

  return (
    <div className="space-y-3 p-4">
      <header className="space-y-0.5">
        <h1 className="text-sm font-semibold leading-tight">
          PR File Explorer
        </h1>
        <p className="text-xs text-muted-foreground">
          Quick toggles for the GitHub PR review helpers.
        </p>
      </header>

      <Separator />

      <Row
        id="locate-enabled"
        title="File explorer locate"
        description="Show the locate icon in each file diff header."
        checked={settings.locateEnabled}
        onCheckedChange={(value) => void update({ locateEnabled: value })}
      />

      <Separator />

      <Row
        id="back-to-top-enabled"
        title="Back to top button"
        description="Floating button that appears after you scroll down."
        checked={settings.backToTopEnabled}
        onCheckedChange={(value) => void update({ backToTopEnabled: value })}
      />

      <div className="space-y-2 pl-1">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Click</Label>
          <Segmented
            ariaLabel="Back to top click action"
            options={SCROLL_OPTIONS}
            value={settings.backToTopClickAction}
            disabled={bindingsDisabled}
            onValueChange={(value) =>
              void update({ backToTopClickAction: value })
            }
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Shift + Click</Label>
          <Segmented
            ariaLabel="Back to top shift-click action"
            options={SCROLL_OPTIONS}
            value={settings.backToTopShiftClickAction}
            disabled={bindingsDisabled}
            onValueChange={(value) =>
              void update({ backToTopShiftClickAction: value })
            }
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="xs"
          className="w-full"
          disabled={bindingsDisabled}
          onClick={() => void swapBindings()}
        >
          <ArrowLeftRight className="mr-1 h-3 w-3" />
          Swap click and shift-click
        </Button>
      </div>
    </div>
  );
}

interface RowProps {
  id: string;
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
}

function Row({
  id,
  title,
  description,
  checked,
  onCheckedChange,
}: RowProps): ReactElement {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="space-y-0.5">
        <Label htmlFor={id} className="text-sm">
          {title}
        </Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="mt-0.5"
      />
    </div>
  );
}
