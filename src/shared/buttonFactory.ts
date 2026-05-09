export interface IconButtonOptions {
  /** GitHub-style invisible icon button uses "invisible". The floating
   *  back-to-top button uses "default" so it has a visible background. */
  variant?: "invisible" | "default";
  size?: "small" | "medium";
  ariaLabel: string;
  title: string;
  /** Extra class to attach (e.g. our feature-specific class). */
  extraClassName?: string;
  innerHtml: string;
  /** Optional dataset entries to set on the button. */
  dataset?: Record<string, string>;
}

const BASE_CLASSES = "prc-Button-ButtonBase-9n-Xk prc-Button-IconButton-fyge7";
const INVISIBLE_EXTRA_CLASS = "flex-shrink-0";

export function createIconButton(options: IconButtonOptions): HTMLButtonElement {
  const {
    variant = "invisible",
    size = "small",
    ariaLabel,
    title,
    extraClassName,
    innerHtml,
    dataset,
  } = options;

  const button = document.createElement("button");
  button.type = "button";

  const classes = [BASE_CLASSES];
  if (variant === "invisible") {
    classes.push(INVISIBLE_EXTRA_CLASS);
  }
  if (extraClassName) {
    classes.push(extraClassName);
  }
  button.className = classes.join(" ");

  button.setAttribute("data-component", "IconButton");
  button.setAttribute("data-loading", "false");
  if (variant === "invisible") {
    button.setAttribute("data-no-visuals", "true");
  }
  button.setAttribute("data-size", size);
  button.setAttribute("data-variant", variant);
  button.setAttribute("aria-label", ariaLabel);
  button.title = title;
  button.innerHTML = innerHtml;

  if (dataset) {
    for (const [key, value] of Object.entries(dataset)) {
      button.dataset[key] = value;
    }
  }

  return button;
}

export function setButtonState(button: HTMLElement, state: string): void {
  if (state) {
    button.dataset["state"] = state;
  } else {
    delete button.dataset["state"];
  }
}
