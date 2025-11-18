import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Content, User, ResourceType } from '../../types';
import { useApi } from '../../hooks/useApi';
import * as api from '../../services/api';
import { FlashcardIcon } from '../icons/ResourceTypeIcons';
import { PlusIcon, EditIcon, TrashIcon, ImportIcon } from '../icons/AdminIcons';
import { ContentModal } from '../ContentModal';
import { ConfirmModal } from '../ConfirmModal';
import { ImportFlashcardsModal } from './ImportFlashcardsModal';
import { Fireworks } from './Fireworks';
import { SafeHTML, sanitizeQuotes } from './flashcardUtils';

// Main Props
interface FlashcardViewProps {
    lessonId: string;
    user: User;
}

// Single Flashcard Component
const Flashcard: React.FC<{ card: Content; isCurrent: boolean; onEdit: () => void; onDelete: () => void; isAdmin: boolean; }> = ({ card, isCurrent, onEdit, onDelete, isAdmin }) => {
    const [isFlipped, setIsFlipped] = useState(false);

    useEffect(() => {
        setIsFlipped(false); // Reset flip state when card changes
    }, [card]);

    return (
        <div className="w-full h-full [perspective:1500px]" onClick={() => setIsFlipped(!isFlipped)}>
            <div className={`relative w-full h-full transition-transform duration-700 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''} ease-in-out`}>
                {/* Front */}
                <div className="absolute w-full h-full rounded-2xl shadow-2xl flex flex-col items-center justify-center p-6 [backface-visibility:hidden] bg-[linear-gradient(45deg,#ff9a9e_0%,#fad0c4_100%)]">
                    <div className="text-5xl mb-4">❓</div>
                    <div className="text-center max-w-full overflow-hidden">
                        <SafeHTML html={card.title} className="text-xl md:text-2xl font-bold text-gray-800 leading-tight" />
                    </div>
                    <p className="absolute bottom-4 text-sm text-gray-700/60 animate-pulse">Click to flip</p>
                </div>
                {/* Back */}
                <div className="absolute w-full h-full rounded-2xl shadow-2xl flex flex-col items-center justify-center p-6 [transform:rotateY(180deg)] [backface-visibility:hidden] bg-[linear-gradient(45deg,#a1c4fd_0%,#c2e9fb_100%)]">
                    <div className="text-5xl mb-4">✅</div>
                    <div className="text-center max-w-full overflow-hidden">
                        <SafeHTML html={card.body} className="text-lg md:text-xl text-gray-800 leading-tight" />
                    </div>
                </div>
            </div>
             {isAdmin && isCurrent && (
                <div className="absolute top-4 right-4 flex gap-2 z-10">
                    <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="p-2 rounded-full bg-white/50 dark:bg-black/50 hover:bg-white/80 dark:hover:bg-black/80 backdrop-blur-sm shadow-md" title="Edit Card"><EditIcon className="w-5 h-5 text-gray-700 dark:text-gray-200" /></button>
                    <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-2 rounded-full bg-white/50 dark:bg-black/50 hover:bg-white/80 dark:hover:bg-black/80 backdrop-blur-sm shadow-md" title="Delete Card"><TrashIcon className="w-5 h-5 text-gray-700 dark:text-gray-200" /></button>
                </div>
            )}
        </div>
    );
};

// Thank You Screen Component
const ThankYouScreen: React.FC<{ onRetry: () => void }> = ({ onRetry }) => (
    <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center">
        <Fireworks />
        <h2 className="text-5xl font-bold text-white mb-4">Congratulations!</h2>
        <p className="text-xl text-gray-300 mb-8">You've completed the deck.</p>
        <button onClick={onRetry} className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-full hover:bg-blue-700 transition-transform transform hover:scale-105">
            Retry Deck
        </button>
    </div>
);

// Main View Component
export const FlashcardView: React.FC<FlashcardViewProps> = ({ lessonId, user }) => {
    const [version, setVersion] = useState(0);
    const { data: groupedContent, isLoading } = useApi(() => api.getContentsByLessonId(lessonId, ['flashcard']), [lessonId, version]);
    
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [showThankYou, setShowThankYou] = useState(false);
    
    // Modals state
    const [contentModalState, setContentModalState] = useState<{ isOpen: boolean; content: Content | null }>({ isOpen: false, content: null });
    const [confirmModalState, setConfirmModalState] = useState<{ isOpen: boolean; onConfirm: (() => void) | null }>({ isOpen: false, onConfirm: null });
    const [importModalOpen, setImportModalOpen] = useState(false);

    const flashcards = useMemo(() => groupedContent?.[0]?.docs || [], [groupedContent]);
    const resourceType: ResourceType = 'flashcard';

    // Reset index when cards change
    useEffect(() => {
        setCurrentCardIndex(0);
        setShowThankYou(false);
    }, [flashcards]);

    const handleNext = useCallback(() => {
        if (currentCardIndex < flashcards.length - 1) {
            setCurrentCardIndex(prev => prev + 1);
        } else {
            setShowThankYou(true);
        }
    }, [currentCardIndex, flashcards.length]);

    const handlePrev = useCallback(() => {
        setShowThankYou(false);
        if (currentCardIndex > 0) {
            setCurrentCardIndex(prev => prev - 1);
        }
    }, [currentCardIndex]);
    
    const handleProgressClick = (index: number) => {
        setCurrentCardIndex(index);
        setShowThankYou(false);
    };

    const handleRetry = () => {
        setCurrentCardIndex(0);
        setShowThankYou(false);
    };

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') handleNext();
            if (e.key === 'ArrowLeft') handlePrev();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleNext, handlePrev]);

    // CRUD Handlers
    const handleSave = async (contentData: { title: string; body: string }) => {
        // Apply quote sanitization to the data before saving
        const sanitizedData = {
            title: sanitizeQuotes(contentData.title),
            body: sanitizeQuotes(contentData.body)
        };
        
        if (contentModalState.content) {
            await api.updateContent(contentModalState.content._id, sanitizedData);
        } else {
            await api.addContent({ ...sanitizedData, lessonId, type: resourceType });
        }
        setVersion(v => v + 1);
        setContentModalState({ isOpen: false, content: null });
    };

    const handleDelete = (contentId: string) => {
        const confirmAction = async () => {
            await api.deleteContent(contentId);
            setVersion(v => v + 1);
            setConfirmModalState({ isOpen: false, onConfirm: null });
        };
        setConfirmModalState({ isOpen: true, onConfirm: confirmAction });
    };

    const handleImport = async (cards: { title: string; body: string }[]) => {
        const newContents = cards.map(card => ({
            ...card,
            lessonId,
            type: resourceType,
        }));
        await api.addMultipleContent(lessonId, newContents);
        setVersion(v => v + 1);
        setImportModalOpen(false);
    };

    const currentCard = flashcards[currentCardIndex];
    const progressPercentage = flashcards.length > 0 ? ((currentCardIndex + 1) / flashcards.length) * 100 : 0;
    
    // Render logic
    if (isLoading) {
        return <div className="text-center py-10">Loading flashcards...</div>;
    }

    if (flashcards.length === 0) {
        return (
            <div className="p-4 sm:p-6 lg:p-8 flex flex-col h-full">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center">
                        <FlashcardIcon className="w-8 h-8 mr-3 text-blue-500" />
                        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Flashcards</h1>
                    </div>
                </div>
                <div className="flex-1 text-center py-20 bg-white dark:bg-gray-800/50 rounded-lg flex flex-col justify-center items-center">
                    <FlashcardIcon className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600" />
                    <p className="mt-4 text-gray-500">No flashcards available for this chapter.</p>
                </div>
                <ContentModal isOpen={contentModalState.isOpen} onClose={() => setContentModalState({ isOpen: false, content: null })} onSave={handleSave} contentToEdit={contentModalState.content} resourceType={resourceType} />
                <ImportFlashcardsModal isOpen={importModalOpen} onClose={() => setImportModalOpen(false)} onImport={handleImport} />
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center mb-4 shrink-0">
                <div className="flex items-center">
                    <FlashcardIcon className="w-8 h-8 mr-3 text-blue-500" />
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Flashcards</h1>
                </div>
            </div>
            
            {/* Player */}
            <div className="flex-1 flex flex-col items-center justify-center relative">
                {/* Card container */}
                <div className="w-full max-w-2xl h-64 md:h-80 mb-6 relative">
                     <div className={`absolute w-full h-full transition-all duration-500 ease-in-out`}>
                        <Flashcard 
                            card={currentCard} 
                            isCurrent={true}
                            onEdit={() => setContentModalState({isOpen: true, content: currentCard})}
                            onDelete={() => handleDelete(currentCard._id)}
                            isAdmin={user.role === 'admin'}
                        />
                    </div>
                </div>
                
                {/* Controls */}
                <div className="w-full max-w-2xl flex flex-col items-center">
                    <div className="flex items-center justify-between w-full mb-2">
                        <button onClick={handlePrev} disabled={currentCardIndex === 0} className="px-6 py-2 rounded-full bg-white dark:bg-gray-700 shadow-md disabled:opacity-50 disabled:cursor-not-allowed">Prev</button>
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{currentCardIndex + 1} / {flashcards.length}</span>
                        <button onClick={handleNext} className="px-6 py-2 rounded-full bg-white dark:bg-gray-700 shadow-md">
                            {currentCardIndex === flashcards.length - 1 ? 'Finish' : 'Next'}
                        </button>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full cursor-pointer" onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const clickX = e.clientX - rect.left;
                        const newIndex = Math.floor((clickX / rect.width) * flashcards.length);
                        handleProgressClick(newIndex);
                    }}>
                        <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${progressPercentage}%` }}></div>
                    </div>
                </div>

                {showThankYou && <ThankYouScreen onRetry={handleRetry} />}
            </div>

            {/* Modals */}
            <ContentModal isOpen={contentModalState.isOpen} onClose={() => setContentModalState({ isOpen: false, content: null })} onSave={handleSave} contentToEdit={contentModalState.content} resourceType={resourceType} />
            <ConfirmModal isOpen={confirmModalState.isOpen} onClose={() => setConfirmModalState({ isOpen: false, onConfirm: null })} onConfirm={confirmModalState.onConfirm} title="Delete Flashcard" message="Are you sure you want to delete this flashcard?" />
            <ImportFlashcardsModal isOpen={importModalOpen} onClose={() => setImportModalOpen(false)} onImport={handleImport} />
        </div>
    );
};