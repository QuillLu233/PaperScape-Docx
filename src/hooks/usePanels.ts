import { useCallback, useEffect, useState } from 'react';

const LEFT_KEY = 'paperscape.panels.left';
const RIGHT_KEY = 'paperscape.panels.right';

function readOpen(key: string): boolean {
  if (typeof localStorage === 'undefined') return true;
  return localStorage.getItem(key) !== 'false';
}

export function usePanels() {
  const [leftOpen, setLeftOpen] = useState(() => readOpen(LEFT_KEY));
  const [rightOpen, setRightOpen] = useState(() => readOpen(RIGHT_KEY));

  useEffect(() => {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(LEFT_KEY, String(leftOpen));
  }, [leftOpen]);

  useEffect(() => {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(RIGHT_KEY, String(rightOpen));
  }, [rightOpen]);

  const toggleLeft = useCallback(() => setLeftOpen((open) => !open), []);
  const toggleRight = useCallback(() => setRightOpen((open) => !open), []);

  return { leftOpen, rightOpen, toggleLeft, toggleRight, setLeftOpen, setRightOpen };
}
