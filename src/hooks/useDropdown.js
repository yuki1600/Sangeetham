import { useState, useEffect, useRef } from 'react';

/**
 * Standard dropdown plumbing: open/closed state + click-outside detection.
 *
 * Returns a ref to attach to the wrapper element, and `open`/`setOpen` for
 * the dropdown contents. The wrapper auto-closes when the user clicks
 * anywhere outside it.
 *
 *   const { open, setOpen, ref } = useDropdown();
 *   return (
 *     <div ref={ref}>
 *       <button onClick={() => setOpen(!open)}>...</button>
 *       {open && <Menu />}
 *     </div>
 *   );
 */
export function useDropdown(initialOpen = false) {
    const [open, setOpen] = useState(initialOpen);
    const ref = useRef(null);

    useEffect(() => {
        if (!open) return undefined;
        const handleClickOutside = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [open]);

    return { open, setOpen, ref };
}
