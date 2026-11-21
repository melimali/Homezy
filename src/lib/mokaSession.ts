export type MokaQuota = { day: number; month: number; until: number };

export type MokaSession<T> = {
  messages: () => T;
  saveMessages: (messages: T) => void;
  quota: () => MokaQuota | null;
  saveQuota: (quota: MokaQuota | null) => void;
  nextFreeAsked: () => boolean;
  nextCanned: () => number;
  isActive: () => boolean;
  deactivate: () => void;
};

/** Keep only current owner's in-memory data; switching owner drops the prior conversation. */
export function createMokaSessionStore<T>(initialMessages: () => T): (owner: string) => MokaSession<T> {
  let activeOwner: string | null = null;
  let activeSession: MokaSession<T> | null = null;

  return owner => {
    if (owner !== activeOwner || !activeSession) {
      activeSession?.deactivate();
      activeOwner = owner;
      let messages = initialMessages();
      let quota: MokaQuota | null = null;
      let freeAsked = 0;
      let cannedN = 0;
      let active = true;
      activeSession = {
        messages: () => messages,
        saveMessages: next => { messages = next; },
        quota: () => quota,
        saveQuota: next => { quota = next; },
        nextFreeAsked: () => freeAsked++ === 0,
        nextCanned: () => cannedN++,
        isActive: () => active,
        deactivate: () => { active = false; },
      };
    }
    return activeSession;
  };
}

export function activeMokaQuota(quota: MokaQuota | null, now = Date.now()): MokaQuota | null {
  return quota && now < quota.until ? quota : null;
}

export function boundMokaMessages<T>(items: readonly T[], limit = 100): T[] {
  if (limit <= 0) return [];
  return items.length <= limit ? [...items] : items.slice(-limit);
}
