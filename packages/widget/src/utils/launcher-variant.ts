import type { AgentWidgetConfig } from "../types";
import type { LauncherTokens } from "../types/theme";

export const resolveLauncherVariant = (config?: Pick<AgentWidgetConfig, "launcher" | "future">): "pill" | "circle" =>
  config?.launcher?.variant ?? (config?.future?.v5Defaults === true ? "circle" : "pill");

export const CIRCLE_LAUNCHER_TOKENS: LauncherTokens = {
  background: "semantic.colors.primary",
  foreground: "semantic.colors.textInverse",
  border: "transparent",
  size: "48px",
  iconSize: "24px",
  borderRadius: "palette.radius.full",
  shadow: "0 8px 24px rgba(0,0,0,.16)",
  offset: "20px",
};
