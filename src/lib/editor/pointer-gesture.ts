/** Keep touch, pen and mouse edit sessions tied to one pointer. */
export interface EditorPointer {
  pointerId: number;
  isPrimary: boolean;
  button: number;
}

/** Ignore secondary touches and non-left mouse presses before mutating a slide. */
export function canStartEditorGesture(event: EditorPointer): boolean {
  return event.isPrimary && event.button === 0;
}

/** Secondary fingers cannot move or terminate an active object edit. */
export function isActiveEditorPointer(activePointerId: number, event: Pick<EditorPointer, "pointerId">): boolean {
  return event.pointerId === activePointerId;
}
