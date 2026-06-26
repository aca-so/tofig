import type { LayerNode } from "../engine/layers";

export type EditorTarget = "design" | "slides";

// ---- sandbox (code.ts) -> UI ----

export interface InitMessage {
  type: "init";
  target: EditorTarget;
  /** default render width for a Design import */
  renderWidth: number;
  /** slide canvas size, when running inside a Slides file */
  slideSize?: { width: number; height: number };
}

export interface ProgressMessage {
  type: "progress";
  message: string;
}

export interface DoneMessage {
  type: "done";
  count: number;
  /** "Requested -> Used" font substitutions, when any font wasn't in Figma */
  fontsSubstituted?: string[];
}

export interface ErrorMessage {
  type: "error";
  message: string;
}

export type SandboxToUI = InitMessage | ProgressMessage | DoneMessage | ErrorMessage;

// ---- UI -> sandbox (code.ts) ----

export interface ImportMessage {
  type: "import";
  target: EditorTarget;
  title: string;
  /** one root per Design import (the page) or one root per slide */
  roots: LayerNode[];
}

export interface CancelMessage {
  type: "cancel";
}

export interface ResizeMessage {
  type: "resize";
  width: number;
  height: number;
}

export type UIToSandbox = ImportMessage | CancelMessage | ResizeMessage;
