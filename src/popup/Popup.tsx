import { useEffect, useState, type ReactElement } from "react";
import {
  ArrowDown,
  ArrowLeftRight,
  ArrowUp,
  Copy,
  Eye,
  Loader2,
  MessageSquareText,
  Pin,
} from "lucide-react";

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
import {
  eventToShortcut,
  formatShortcut,
} from "@/shared/shortcut";

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
  const reviewRailControlsDisabled = !settings.reviewFlowEnabled;

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
        id="file-tabs-enabled"
        title="File tabs"
        description="Show IDE-like preview and permanent tabs above the diff view."
        checked={settings.fileTabsEnabled}
        onCheckedChange={(value) => void update({ fileTabsEnabled: value })}
      />

      <div className="space-y-2 rounded-md border bg-muted/35 p-3">
        <FeatureHint
          icon={<Pin className="h-3.5 w-3.5" />}
          title="Preview and keep"
          description="Single-click a file header for an italic preview tab; double-click the file or tab to keep it."
        />
      </div>

      <Row
        id="explorer-sync-enabled"
        title="Sync file tree"
        description="Highlight the file you are viewing in the left explorer while you scroll the diff."
        checked={settings.explorerSyncEnabled}
        onCheckedChange={(value) =>
          void update({ explorerSyncEnabled: value })
        }
      />

      <Separator />

      <Row
        id="review-flow-enabled"
        title="Review flow rail"
        description="Show comment navigation, unviewed-file jump, review context copy, and comment dots."
        checked={settings.reviewFlowEnabled}
        onCheckedChange={(value) => void update({ reviewFlowEnabled: value })}
      />

      <div className="space-y-2 rounded-md border bg-muted/35 p-3">
        <p className="text-xs font-medium">Review rail buttons</p>
        <ControlRow
          id="review-flow-previous-comment-enabled"
          icon={<ArrowUp className="h-3.5 w-3.5" />}
          title="Previous comment"
          checked={settings.reviewFlowPreviousCommentEnabled}
          disabled={reviewRailControlsDisabled}
          onCheckedChange={(value) =>
            void update({ reviewFlowPreviousCommentEnabled: value })
          }
        />
        <ControlRow
          id="review-flow-next-comment-enabled"
          icon={<ArrowDown className="h-3.5 w-3.5" />}
          title="Next comment"
          checked={settings.reviewFlowNextCommentEnabled}
          disabled={reviewRailControlsDisabled}
          onCheckedChange={(value) =>
            void update({ reviewFlowNextCommentEnabled: value })
          }
        />
        <ControlRow
          id="review-flow-next-unviewed-enabled"
          icon={<Eye className="h-3.5 w-3.5" />}
          title="Next unviewed"
          checked={settings.reviewFlowNextUnviewedEnabled}
          disabled={reviewRailControlsDisabled}
          onCheckedChange={(value) =>
            void update({ reviewFlowNextUnviewedEnabled: value })
          }
        />
        <ControlRow
          id="review-flow-copy-context-enabled"
          icon={<Copy className="h-3.5 w-3.5" />}
          title="Copy context"
          checked={settings.reviewFlowCopyContextEnabled}
          disabled={reviewRailControlsDisabled}
          onCheckedChange={(value) =>
            void update({ reviewFlowCopyContextEnabled: value })
          }
        />
        <ControlRow
          id="review-flow-copy-comments-to-agent-enabled"
          icon={<MessageSquareText className="h-3.5 w-3.5" />}
          title="Copy comments to agent"
          checked={settings.reviewFlowCopyCommentsToAgentEnabled}
          disabled={reviewRailControlsDisabled}
          onCheckedChange={(value) =>
            void update({ reviewFlowCopyCommentsToAgentEnabled: value })
          }
        />
        <p className="text-[11px] leading-snug text-muted-foreground">
          Files with visible review comments get a small dot in the file explorer.
        </p>
      </div>

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

      <Separator />

      <Row
        id="page-top-shortcut-enabled"
        title="Scroll-to-top shortcut"
        description="Keyboard shortcut that scrolls to the very top of the page."
        checked={settings.pageTopShortcutEnabled}
        onCheckedChange={(value) =>
          void update({ pageTopShortcutEnabled: value })
        }
      />

      <ShortcutCapture
        value={settings.pageTopShortcut}
        disabled={!settings.pageTopShortcutEnabled}
        onChange={(value) => void update({ pageTopShortcut: value })}
        onReset={() =>
          void update({ pageTopShortcut: DEFAULT_SETTINGS.pageTopShortcut })
        }
      />
    </div>
  );
}

interface ShortcutCaptureProps {
  value: string;
  disabled: boolean;
  onChange: (next: string) => void;
  onReset: () => void;
}

function ShortcutCapture({
  value,
  disabled,
  onChange,
  onReset,
}: ShortcutCaptureProps): ReactElement {
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    if (!capturing) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        event.preventDefault();
        setCapturing(false);
        return;
      }

      const parsed = eventToShortcut(event);
      if (!parsed) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      onChange(formatShortcut(parsed));
      setCapturing(false);
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [capturing, onChange]);

  return (
    <div className="space-y-2 pl-1">
      <Label className="text-xs text-muted-foreground">Shortcut</Label>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="xs"
          className="flex-1 justify-center font-mono"
          disabled={disabled}
          onClick={() => setCapturing((prev) => !prev)}
        >
          {capturing ? "Press keys… (Esc to cancel)" : value || "Set shortcut"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="xs"
          disabled={disabled}
          onClick={() => {
            setCapturing(false);
            onReset();
          }}
        >
          Reset
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
  disabled?: boolean;
  onCheckedChange: (next: boolean) => void;
}

function Row({
  id,
  title,
  description,
  checked,
  disabled = false,
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
        disabled={disabled}
        onCheckedChange={onCheckedChange}
        className="mt-0.5"
      />
    </div>
  );
}

interface ControlRowProps {
  id: string;
  icon: ReactElement;
  title: string;
  checked: boolean;
  disabled: boolean;
  onCheckedChange: (next: boolean) => void;
}

function ControlRow({
  id,
  icon,
  title,
  checked,
  disabled,
  onCheckedChange,
}: ControlRowProps): ReactElement {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <Label
        htmlFor={id}
        className="flex min-w-0 items-center gap-2 font-normal"
      >
        <span className="text-muted-foreground">{icon}</span>
        <span className="truncate">{title}</span>
      </Label>
      <Switch
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
      />
    </div>
  );
}

interface FeatureHintProps {
  icon: ReactElement;
  title: string;
  description: string;
}

function FeatureHint({
  icon,
  title,
  description,
}: FeatureHintProps): ReactElement {
  return (
    <div className="flex gap-2 text-xs">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <span className="space-y-0.5">
        <span className="block font-medium leading-tight">{title}</span>
        <span className="block leading-snug text-muted-foreground">
          {description}
        </span>
      </span>
    </div>
  );
}
