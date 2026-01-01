import { useEffect } from 'react';

export function useKeyPress(
  keys: string[],
  callback: (event: KeyboardEvent) => void,
  options?: { ignoreWhenInputFocused?: boolean }
) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if any modifier keys are pressed along with the main key
      const isMeta = event.metaKey || event.ctrlKey;

      // Skip if input is focused and option is enabled
      if (
        options?.ignoreWhenInputFocused &&
        (event.target instanceof HTMLInputElement ||
          event.target instanceof HTMLTextAreaElement ||
          (event.target as HTMLElement).isContentEditable)
      ) {
        return;
      }

      // Build key combination string
      const keyCombo = [];
      if (isMeta) keyCombo.push(event.metaKey ? 'Meta' : 'Ctrl');
      if (event.shiftKey) keyCombo.push('Shift');
      if (event.altKey) keyCombo.push('Alt');
      keyCombo.push(event.key.toLowerCase());

      const pressedKey = keyCombo.join('+');

      // Check if pressed key matches any of the specified keys
      const isMatch = keys.some(key => {
        const normalizedKey = key.toLowerCase();
        return (
          pressedKey === normalizedKey ||
          (isMeta && pressedKey === normalizedKey.replace('meta', 'ctrl')) ||
          (isMeta && pressedKey === normalizedKey.replace('ctrl', 'meta'))
        );
      });

      if (isMatch) {
        event.preventDefault();
        callback(event);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [keys, callback, options]);
}
