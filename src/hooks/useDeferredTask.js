import { useEffect, useRef } from 'react';

/** Schedule effect-triggered async work after the commit that changed its inputs. */
export function useDeferredTask(task, dependencyKey) {
  const taskRef = useRef(task);

  useEffect(() => {
    taskRef.current = task;
  }, [task]);

  useEffect(() => {
    const timer = setTimeout(() => { void taskRef.current(); }, 0);
    return () => clearTimeout(timer);
  }, [dependencyKey]);
}
