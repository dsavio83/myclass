import React, { useState } from 'react';
import { sanitizeQuotes } from './flashcardUtils';

interface ImportFlashcardsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (cards: { title: string; body: string }[]) => Promise<void>;
}

export const ImportFlashcardsModal: React.FC<ImportFlashcardsModalProps> = ({ isOpen, onClose, onImport }) => {
    const [text, setText] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleImport = async () => {
        if (isSaving || !text.trim()) return;

        setIsSaving(true);
        setError(null);
        let cards: { title: string; body: string }[] = [];

        // Sanitize the input using the shared quote replacement function
        let sanitizedText = sanitizeQuotes(text.trim());

        // Try parsing as JSON first
        try {
            const parsedJson = JSON.parse(sanitizedText);
            if (Array.isArray(parsedJson)) {
                cards = parsedJson
                    .filter(item => item && typeof item.f === 'string' && typeof item.b === 'string')
                    .map(item => ({ 
                        title: sanitizeQuotes(item.f.trim()), 
                        body: sanitizeQuotes(item.b.trim()) 
                    }));
            }
        } catch (e) {
            // Not valid JSON, will fallback to semicolon parsing.
        }

        // If JSON parsing didn't produce cards, try semicolon format
        if (cards.length === 0) {
            const lines = sanitizedText.split('\n');
            cards = lines
                .map(line => line.split(';'))
                .filter(parts => parts.length === 2 && parts[0].trim() && parts[1].trim())
                .map(parts => ({
                    title: sanitizeQuotes(parts[0].trim()),
                    body: sanitizeQuotes(parts[1].trim()),
                }));
        }

        if (cards.length > 0) {
            await onImport(cards);
            setText('');
        } else {
            setError('Could not parse any cards. Please check the format and try again.');
        }
        
        setIsSaving(false);
    };
    
    return (
         <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-xl" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Import Flashcards</h2>
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-4 space-y-2">
                    <p>Paste your content below. Two formats are supported:</p>
                    <ul className="list-disc list-inside text-xs space-y-1">
                        <li><b>JSON Array:</b> Paste an array of objects, like <code className="bg-gray-100 dark:bg-gray-700 p-1 rounded-sm">{`[{"f":"Question","b":"Answer"}]`}</code>.</li>
                        <li><b>Plain Text:</b> Each line should be a <code className="bg-gray-100 dark:bg-gray-700 p-1 rounded-sm">{`Question;Answer`}</code> pair.</li>
                    </ul>
                    <p className="text-xs mt-2">
                        <b>Features:</b> Single quotes will be converted to double quotes. HTML tags like {'<'}br{'>'}, {'<'}bold{'>'}, {'<'}i{'>'}, {'<'}u{'>'} are supported for formatting.
                    </p>
                </div>
                <textarea
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder={`[{"f":"Question 1","b":"Answer 1"},\n {"f":"Question 2","b":"Answer 2"}] \n\n OR \n\nQuestion 1;Answer 1\nQuestion 2;Answer 2`}
                    rows={12}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-mono text-sm"
                    autoFocus
                />
                {error && <p className="text-sm text-red-500 dark:text-red-400 mt-2">{error}</p>}
                <div className="mt-6 flex justify-end space-x-3">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-md text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 disabled:opacity-50" disabled={isSaving}>
                        Cancel
                    </button>
                    <button onClick={handleImport} className="px-4 py-2 rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-wait" disabled={isSaving || !text.trim()}>
                        {isSaving ? 'Importing...' : 'Import Cards'}
                    </button>
                </div>
            </div>
        </div>
    );
};