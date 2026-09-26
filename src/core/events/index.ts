/**
 * A minimal typed event emitter used internally by `core/auth` to announce
 * token lifecycle changes (refreshed, cleared) without pulling in a runtime
 * dependency. Kept deliberately tiny: no wildcard listeners, no `once`, no
 * error-swallowing — a listener that throws propagates to the caller that
 * triggered the emit.
 */

export type Listener<Event> = (event: Event) => void;
export type Unsubscribe = () => void;

export class EventEmitter<Event> {
  private readonly listeners = new Set<Listener<Event>>();

  /** Subscribe. Returns an unsubscribe function. */
  on(listener: Listener<Event>): Unsubscribe {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  off(listener: Listener<Event>): void {
    this.listeners.delete(listener);
  }

  protected emit(event: Event): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  /** Number of active subscribers. Mostly useful for tests. */
  get listenerCount(): number {
    return this.listeners.size;
  }
}
