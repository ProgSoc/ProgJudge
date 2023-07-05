type GetStateFunc<Id, T> = (id: Id) => Promise<T>;

type Optional<T> = { exists: true; value: T } | { exists: false };

type ItemState<T> = {
  lastState: Optional<T>;
  subscribers: Set<(state: T) => void>;
};

class StatefulPubSub<Id, T> {
  private items: Map<Id, ItemState<T>>;
  private getLastState: GetStateFunc<Id, T>;

  constructor(getState: GetStateFunc<Id, T>) {
    this.items = new Map();
    this.getLastState = getState;
  }

  subscribe(id: Id, callback: (state: T) => void) {
    // There are 3 possible states an item can be in:
    // - Not in the items map: we don't know the state of the item and there's no subscribers. When a new
    // subscriber is added, a background task is spawned to fetch the first state of the item.
    // - In the map but without a lastState: This means there is a background task running that will fetch
    // the most up to date last state. New subscribers can safely be inserted with no other work, as the
    // background task will soon notify them anyway.
    // - In the map with a lastState: This means we know the state of the item, new subscribers will need
    // to be given the existing lastState before being added.

    const unsub = this.makeUnsubCallback(id, callback);

    const item = this.items.get(id);

    if (!item) {
      this.items.set(id, {
        lastState: { exists: false },
        subscribers: new Set([callback]),
      });

      void this.spawnFetchInitialStateJob(id);
      return unsub;
    }

    if (!item.lastState.exists) {
      item.subscribers.add(callback);
      return unsub;
    }

    item.subscribers.add(callback);
    callback(item.lastState.value);
    return unsub;
  }

  unsubscribe(id: Id, callback: (state: T) => void) {
    const item = this.items.get(id);
    if (!item) {
      return;
    }

    item.subscribers.delete(callback);

    if (item.subscribers.size === 0) {
      this.items.delete(id);
    }
  }

  notify(id: Id, newState: T) {
    const item = this.items.get(id);
    if (!item) {
      return;
    }

    item.lastState = { exists: true, value: newState };
    item.subscribers.forEach((callback) => callback(newState));
  }

  private notifyIfNotExists(id: Id, newState: T) {
    const item = this.items.get(id);
    if (!item) {
      return;
    }

    if (item.lastState.exists) {
      return;
    }

    item.lastState = { exists: true, value: newState };
    item.subscribers.forEach((callback) => callback(newState));
  }

  private async spawnFetchInitialStateJob(id: Id) {
    const currentState = await this.getLastState(id);
    this.notifyIfNotExists(id, currentState);
  }

  private makeUnsubCallback(id: Id, callback: (state: T) => void) {
    return () => this.unsubscribe(id, callback);
  }
}
