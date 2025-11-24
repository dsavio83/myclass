import React, { useEffect, useRef, useCallback } from 'react';

declare const Quill: any;

interface NoteEditorProps {
    initialValue: string;
    onSave: (html: string) => Promise<void>;
    onCancel: () => void;
}

export const NoteEditor: React.FC<NoteEditorProps> = ({ initialValue, onSave, onCancel }) => {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const quillInstance = useRef<any>(null);
    const isSaving = useRef(false);

    const setupQuill = useCallback(() => {
        if (wrapperRef.current && !quillInstance.current) {
            const editorContainer = wrapperRef.current.querySelector('.editor');
            const toolbarContainer = wrapperRef.current.querySelector('.toolbar');
            
            if (editorContainer && toolbarContainer) {
                const quill = new Quill(editorContainer, {
                    debug: false,
                    theme: 'snow',
                    modules: {
                        toolbar: {
                            container: toolbarContainer,
                            handlers: {
                                'formula-custom': function() {
                                    // 'this' is bound to the module instance.
                                    const formula = prompt('Enter your LaTeX formula (without delimiters):');
                                    if (formula) {
                                        const range = this.quill.getSelection(true);
                                        // Using display math $$...$$ which MathJax will render
                                        this.quill.insertText(range.index, `$$${formula}$$`, 'user');
                                    }
                                }
                            }
                        },
                    },
                    placeholder: 'Start writing your notes here...',
                });

                quill.root.innerHTML = initialValue;
                quillInstance.current = quill;
            }
        }
    }, [initialValue]);

    useEffect(() => {
        setupQuill();
    }, [setupQuill]);

    const handleSaveClick = async () => {
        if (quillInstance.current && !isSaving.current) {
            isSaving.current = true;
            await onSave(quillInstance.current.root.innerHTML);
            isSaving.current = false;
        }
    };

    return (
        <div ref={wrapperRef} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-5 w-full note-editor-container">
            <div className="toolbar border border-gray-300 dark:border-gray-600 rounded-t-lg bg-gray-50 dark:bg-gray-700 p-1">
                <span className="ql-formats">
                    <select className="ql-header" defaultValue=""></select>
                </span>
                <span className="ql-formats">
                    <button className="ql-bold"></button>
                    <button className="ql-italic"></button>
                    <button className="ql-underline"></button>
                </span>
                <span className="ql-formats">
                    <select className="ql-color"></select>
                    <select className="ql-background"></select>
                </span>
                <span className="ql-formats">
                    <button className="ql-list" value="ordered"></button>
                    <button className="ql-list" value="bullet"></button>
                    <button className="ql-blockquote"></button>
                </span>
                <span className="ql-formats">
                    <button className="ql-link"></button>
                    <button className="ql-image"></button>
                    <button className="ql-video"></button>
                </span>
                <span className="ql-formats">
                    <button className="ql-formula-custom" type="button" title="Insert Formula (LaTeX)">
                         <svg viewBox="0 0 18 18" style={{ width: '18px', height: '18px' }}>
                            <text x="2" y="14" style={{ fontFamily: 'monospace, sans-serif', fontSize: '14px' }}>ƒx</text>
                        </svg>
                    </button>
                </span>
                <span className="ql-formats">
                    <button className="ql-clean"></button>
                </span>
            </div>
            <div className="editor h-96 border-l border-r border-b border-gray-300 dark:border-gray-600 rounded-b-lg"></div>
            <div className="mt-4 flex justify-end space-x-3">
                <button onClick={onCancel} className="flex items-center gap-2 px-4 py-2 rounded-md text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500" title="Cancel">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                    <span className="hidden sm:inline">Cancel</span>
                </button>
                <button onClick={handleSaveClick} className="flex items-center gap-2 px-4 py-2 rounded-md text-white bg-blue-600 hover:bg-blue-700" title="Save Note">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <span className="hidden sm:inline">Save Note</span>
                </button>
            </div>
        </div>
    );
};