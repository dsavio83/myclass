import React, { useState, useEffect } from 'react';

interface ImportFlashcardsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (cards: { title: string; body: string }[]) => Promise<void>;
}

export const ImportFlashcardsModal: React.FC<ImportFlashcardsModalProps> = ({ isOpen, onClose, onImport }) => {
    const [text, setText] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setText('');
            setError(null);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const sanitizeAndParse = (raw: string): any[] | null => {
        try {
            // Sanitize the input by replacing HTML entities for quotes with actual quotes.
            let sanitizedText = raw.trim().replace(/&quot;/g, '"');
            // Handle smart quotes
            sanitizedText = sanitizedText.replace(/[\u201C\u201D]/g, '"');

            const parsedJson = JSON.parse(sanitizedText);
            if (Array.isArray(parsedJson)) {
                return parsedJson;
            }
            return null;
        } catch (e) {
            return null;
        }
    };

    const handleFormat = () => {
        setError(null);
        const parsed = sanitizeAndParse(text);
        if (parsed) {
            setText(JSON.stringify(parsed, null, 2));
        } else {
            setError("Invalid JSON. Could not format. Please check your syntax.");
        }
    };

    const handleImport = async () => {
        if (isSaving || !text.trim()) return;

        setIsSaving(true);
        setError(null);
        let cards: { title: string; body: string }[] = [];

        const parsedJson = sanitizeAndParse(text);

        if (parsedJson) {
             cards = parsedJson
                .filter(item => item && (item.f || item.front || item.title) && (item.b || item.back || item.body))
                .map(item => ({ 
                    title: (item.f || item.front || item.title || '').trim(), 
                    body: (item.b || item.back || item.body || '').trim() 
                }));
        } else {
            // If JSON parsing didn't produce cards, try semicolon format as fallback
            const lines = text.split('\n');
            cards = lines
                .map(line => line.split(';'))
                .filter(parts => parts.length >= 2 && parts[0].trim() && parts[1].trim())
                .map(parts => ({
                    title: parts[0].trim(),
                    body: parts.slice(1).join(';').trim(), // Join rest in case answer has semicolons
                }));
        }

        if (cards.length > 0) {
            await onImport(cards);
            onClose();
        } else {
            setError('Could not parse any cards. Please ensure JSON is an array of objects (e.g., [{"f":"Question", "b":"Answer"}]) or use "Question;Answer" format per line.');
        }
        
        setIsSaving(false);
    };
    
    return (
         <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-3xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Import Flashcards</h2>
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-4 space-y-2">
                    <p>Paste your content below. Supported formats:</p>
                    <ul className="list-disc list-inside text-xs space-y-1">
                        <li><b>JSON Array:</b> <code className="bg-gray-100 dark:bg-gray-700 p-1 rounded-sm select-all">{`[{"f":"Question HTML","b":"Answer HTML"}]`}</code> (Use 'Format' button to clean quotes).</li>
                        <li><b>Plain Text:</b> Each line: <code className="bg-gray-100 dark:bg-gray-700 p-1 rounded-sm select-all">{`Question;Answer`}</code></li>
                    </ul>
                </div>
                <textarea
                    value={text}
                    onChange={e => { setText(e.target.value); setError(null); }}
                    placeholder={`[\n  {\n    "f": "What is <b>HTML</b>?",\n    "b": "HyperText Markup Language"\n  }\n]`}
                    className="flex-1 w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-mono text-xs resize-none"
                    autoFocus
                />
                {error && <p className="text-sm text-red-500 dark:text-red-400 mt-2">{error}</p>}
                <div className="mt-4 flex justify-end gap-3">
                    <button onClick={handleFormat} className="px-4 py-2 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 rounded-md hover:bg-yellow-200 dark:hover:bg-yellow-800 font-medium text-sm">
                        Format & Preview
                    </button>
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-md text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-sm" disabled={isSaving}>
                        Cancel
                    </button>
                    <button onClick={handleImport} className="px-4 py-2 rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-wait text-sm font-medium" disabled={isSaving || !text.trim()}>
                        {isSaving ? 'Importing...' : 'Import Cards'}
                    </button>
                </div>
            </div>
        </div>
    );
};