import { useEffect, useRef } from 'react';

/**
 * Editor keyboard shortcuts.
 *
 * Bindings (skipped when focus is in an INPUT/TEXTAREA):
 *   Space             play / pause                    (always active)
 *   T                 toggle Trim mode                (editor only)
 *   C                 toggle Calibrate mode           (editor only)
 *   Ctrl/Cmd+Z        undo last cut                   (editor only)
 *   R                 reset all edits                 (editor only)
 *   Esc               clear active selection          (editor only, in trim/calibrate)
 *   Delete/Backspace  delete selection / set calib    (editor only, in trim/calibrate)
 *   Enter             apply calibration               (editor only, in calibrate mode)
 *
 * The hook stores all callbacks in a ref so the inner listener never has to
 * be reattached when parent re-renders. Pass `readOnly` to fully disable
 * everything except Space.
 */
export function useKeyboardShortcuts({
    readOnly,
    editorMode,
    setEditorMode,
    activeSelection,
    setActiveSelection,
    togglePlay,
    handleUndoLastCut,
    handleResetAllEdits,
    handleDeleteSelection,
    setCustomAavartanaSec,
}) {
    const stateRef = useRef({});
    useEffect(() => {
        stateRef.current = {
            readOnly,
            editorMode,
            activeSelection,
            setEditorMode,
            setActiveSelection,
            togglePlay,
            handleUndoLastCut,
            handleResetAllEdits,
            handleDeleteSelection,
            setCustomAavartanaSec,
        };
    });

    useEffect(() => {
        const onKeyDown = (e) => {
            const inInput = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA';
            if (inInput) return;
            const s = stateRef.current;

            // Space: play / pause (works in read-only mode too)
            if (e.code === 'Space') {
                e.preventDefault();
                s.togglePlay();
                return;
            }

            if (s.readOnly) return;

            // T: toggle trim mode
            if (e.key === 't' || e.key === 'T') {
                s.setEditorMode(m => (m === 'trim' ? 'view' : 'trim'));
                return;
            }

            // C: toggle calibrate mode
            if (e.key === 'c' || e.key === 'C') {
                s.setEditorMode(m => (m === 'calibrate' ? 'view' : 'calibrate'));
                return;
            }

            // Ctrl+Z / Cmd+Z: undo
            if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
                e.preventDefault();
                s.handleUndoLastCut();
                return;
            }

            // R: reset all edits
            if (e.key === 'r' || e.key === 'R') {
                s.handleResetAllEdits();
                return;
            }

            if (s.editorMode !== 'trim' && s.editorMode !== 'calibrate') return;

            if (e.key === 'Escape') {
                s.setActiveSelection(null);
                return;
            }
            if ((e.key === 'Delete' || e.key === 'Backspace') && s.activeSelection?.endTime != null) {
                const start = Math.min(s.activeSelection.startTime, s.activeSelection.endTime);
                const end = Math.max(s.activeSelection.startTime, s.activeSelection.endTime);
                if (end - start < 0.1) return;
                e.preventDefault();
                if (s.editorMode === 'calibrate') {
                    s.setCustomAavartanaSec(end - start);
                    s.setActiveSelection(null);
                    s.setEditorMode('view');
                } else {
                    s.handleDeleteSelection();
                }
            }
            // Enter: apply calibration in calibrate mode
            if (e.key === 'Enter' && s.editorMode === 'calibrate' && s.activeSelection?.endTime != null) {
                const start = Math.min(s.activeSelection.startTime, s.activeSelection.endTime);
                const end = Math.max(s.activeSelection.startTime, s.activeSelection.endTime);
                if (end - start < 0.1) return;
                e.preventDefault();
                s.setCustomAavartanaSec(end - start);
                s.setActiveSelection(null);
                s.setEditorMode('view');
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);
}
