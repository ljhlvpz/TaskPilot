// Tracks active task snapshot listeners so logout can stop them before Firebase signOut.
const activeTaskListeners = new Set();

export const registerTaskListener = (unsubscribe) => {
  if (typeof unsubscribe !== "function") return () => {};
  let active = true;
  const stop = () => {
    if (!active) return;
    active = false;
    activeTaskListeners.delete(stop);
    unsubscribe();
  };
  activeTaskListeners.add(stop);
  return stop;
};

export const stopAllTaskListeners = () => {
  for (const stop of [...activeTaskListeners]) stop();
};
