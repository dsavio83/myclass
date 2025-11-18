import React, { useState, useEffect, useMemo } from 'react';
import { Content } from '../../types';
import { useApi } from '../../hooks/useApi';
import * as api from '../../services/api';
import { FlashcardIcon } from '../icons/ResourceTypeIcons';
import { PlusIcon, EditIcon, TrashIcon, ImportIcon } from '../icons/AdminIcons';
import { ImportFlashcardsModal } from './ImportFlashcardsModal';
import { SafeHTML, sanitizeQuotes } from './flashcardUtils';

interface FlashcardAdminViewProps {
    lessonId: string;
}

interface FlashcardEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    flashcard: Content | null;
    onSave: (data: { title: string; body: string }) => void;
}

const FlashcardEditorModal: React.FC<FlashcardEditorModalProps> = ({ isOpen, onClose, flashcard, onSave }) => {
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');

    useEffect(() => {
        if (flashcard) {
            setTitle(flashcard.title);
            setBody(flashcard.body);
        } else {
            setTitle('');
            setBody('');
        }
    }, [flashcard]);

    if (!isOpen) return null;

    const handleSave = () => {
        if (!title.trim() || !body.trim()) {
            alert('Both question and answer are required');
            return;
        }
        onSave({ title, body });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-2xl">
                <h2 className="text-2xl font-bold mb-6">{flashcard ? 'Edit Flashcard' : 'Add New Flashcard'}</h2>
                
                <div className="mb-4">
                    <label className="block text-sm font-semibold mb-2">Question (Front)</label>
                    <textarea
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        rows={3}
                        className="w-full p-3 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600"
                        placeholder="Enter the question or term..."
                    />
                </div>

                <div className="mb-6">
                    <label className="block text-sm font-semibold mb-2">Answer (Back)</label>
                    <textarea
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        rows={4}
                        className="w-full p-3 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600"
                        placeholder="Enter the answer or definition..."
                    />
                </div>

                <div className="flex justify-end gap-4">
                    <button onClick={onClose} className="px-6 py-2 bg-gray-200 dark:bg-gray-600 rounded-md">Cancel</button>
                    <button onClick={handleSave} className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Save Flashcard</button>
                </div>
            </div>
        </div>
    );
};

export const FlashcardAdminView: React.FC<FlashcardAdminViewProps> = ({ lessonId }) => {
    const [version, setVersion] = useState(0);
    const { data: groupedContent, isLoading } = useApi(() => api.getContentsByLessonId(lessonId, ['flashcard']), [lessonId, version]);
    
    const [isEditorModalOpen, setIsEditorModalOpen] = useState(false);
    const [editingFlashcard, setEditingFlashcard] = useState<Content | null>(null);
    const [importModalOpen, setImportModalOpen] = useState(false);

    const flashcards = useMemo(() => groupedContent?.[0]?.docs || [], [groupedContent]);

    const handleAddFlashcard = () => {
        setEditingFlashcard(null);
        setIsEditorModalOpen(true);
    };

    const handleEditFlashcard = (flashcard: Content) => {
        setEditingFlashcard(flashcard);
        setIsEditorModalOpen(true);
    };

    const handleDeleteFlashcard = async (flashcardId: string) => {
        if (confirm('Are you sure you want to delete this flashcard?')) {
            await api.deleteContent(flashcardId);
            setVersion(v => v + 1);
        }
    };

    const handleSaveFlashcard = async (data: { title: string; body: string }) => {
        // Apply quote sanitization to the data before saving
        const sanitizedData = {
            title: sanitizeQuotes(data.title),
            body: sanitizeQuotes(data.body)
        };
        
        if (editingFlashcard) {
            await api.updateContent(editingFlashcard._id, sanitizedData);
        } else {
            await api.addContent({ ...sanitizedData, lessonId, type: 'flashcard' });
        }
        setVersion(v => v + 1);
    };

    const handleImport = async (cards: { title: string; body: string }[]) => {
        const newContents = cards.map(card => ({
            ...card,
            lessonId,
            type: 'flashcard' as const,
        }));
        await api.addMultipleContent(lessonId, newContents);
        setVersion(v => v + 1);
        setImportModalOpen(false);
    };

    if (isLoading) {
        return <div className="text-center p-8">Loading Flashcards...</div>;
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center">
                    <FlashcardIcon className="w-8 h-8 mr-3 text-blue-500" />
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Flashcard Management</h1>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setImportModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                    >
                        <ImportIcon className="w-5 h-5" />
                        <span>Import Cards</span>
                    </button>
                    <button
                        onClick={handleAddFlashcard}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        <PlusIcon className="w-5 h-5" />
                        <span>Add Flashcard</span>
                    </button>
                </div>
            </div>

            {flashcards.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-gray-800/50 rounded-lg">
                    <FlashcardIcon className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600" />
                    <p className="mt-4 text-gray-500">No flashcards yet. Add your first flashcard!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {flashcards.map((card, index) => (
                        <div key={card._id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                            <div className="p-4 border-b dark:border-gray-700 bg-gradient-to-r from-pink-100 to-orange-100 dark:from-pink-900/30 dark:to-orange-900/30">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Card #{index + 1}</span>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => handleEditFlashcard(card)}
                                            className="p-1.5 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-md"
                                            title="Edit Flashcard"
                                        >
                                            <EditIcon className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteFlashcard(card._id)}
                                            className="p-1.5 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-md"
                                            title="Delete Flashcard"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-2xl">❓</span>
                                    <div className="flex-1 min-w-0">
                                        <SafeHTML html={card.title} className="font-semibold text-gray-800 dark:text-gray-200 line-clamp-2 leading-tight" />
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 bg-gradient-to-r from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30">
                                <div className="flex items-start gap-2">
                                    <span className="text-2xl">✅</span>
                                    <div className="flex-1 min-w-0">
                                        <SafeHTML html={card.body} className="text-gray-700 dark:text-gray-300 line-clamp-3 leading-tight" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <FlashcardEditorModal
                isOpen={isEditorModalOpen}
                onClose={() => setIsEditorModalOpen(false)}
                flashcard={editingFlashcard}
                onSave={handleSaveFlashcard}
            />

            <ImportFlashcardsModal
                isOpen={importModalOpen}
                onClose={() => setImportModalOpen(false)}
                onImport={handleImport}
            />
        </div>
    );
};
