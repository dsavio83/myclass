import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Content, User, ResourceType } from '../../types';
import { useApi } from '../../hooks/useApi';
import * as api from '../../services/api';
import { FlashcardIcon } from '../icons/ResourceTypeIcons';
import { PlusIcon, EditIcon, TrashIcon, ImportIcon, ChevronRightIcon, ChevronLeftIcon } from '../icons/AdminIcons';
import { ConfirmModal } from '../ConfirmModal';
import { ImportFlashcardsModal } from './ImportFlashcardsModal';
import { Fireworks } from './Fireworks';
import { useToast } from '../../context/ToastContext';

declare const Quill: any;

// Generate different themes for front and back of cards
const getFrontTheme = () => {
    const h1 = Math.floor(Math.random() * 360);
    const h2 = (h1 + 40 + Math.random() * 60) % 360;
    const isLight = Math.random() > 0.3; // 70% chance for light theme on front
    
    if (isLight) {
        return {
            bg: `linear-gradient(135deg, hsl(${h1}, 80%, 90%), hsl(${h2}, 80%, 98%))`,
            textClass: 'text-gray-900'
        };
    } else {
        return {
            bg: `linear-gradient(135deg, hsl(${h1}, 60%, 25%), hsl(${h2}, 60%, 35%))`,
            textClass: 'text-white'
        };
    }
};

const getBackTheme = () => {
    const h1 = Math.floor(Math.random() * 360);
    const h2 = (h1 + 40 + Math.random() * 60) % 360;
    const isDark = Math.random() > 0.3; // 70% chance for dark theme on back
    
    if (isDark) {
        return {
            bg: `linear-gradient(135deg, hsl(${h1}, 70%, 15%), hsl(${h2}, 70%, 25%))`,
            textClass: 'text-white'
        };
    } else {
        return {
            bg: `linear-gradient(135deg, hsl(${h1}, 85%, 85%), hsl(${h2}, 85%, 95%))`,
            textClass: 'text-gray-900'
        };
    }
};

// ... (FlashcardEditorModal remains same)
interface FlashcardEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: { title: string; body: string }) => Promise<void>;
    cardToEdit: Content | null;
}

const FlashcardEditorModal: React.FC<FlashcardEditorModalProps> = ({ isOpen, onClose, onSave, cardToEdit }) => {
    const [activeTab, setActiveTab] = useState<'front' | 'back'>('front');
    const [frontHtml, setFrontHtml] = useState('');
    const [backHtml, setBackHtml] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    
    const editorContainerRef = useRef<HTMLDivElement>(null);
    const quillRef = useRef<any>(null);

    useEffect(() => {
        if (isOpen) {
            setFrontHtml(cardToEdit ? cardToEdit.title : '');
            setBackHtml(cardToEdit ? cardToEdit.body : '');
            setActiveTab('front');
            if (quillRef.current) {
                 quillRef.current.root.innerHTML = cardToEdit ? cardToEdit.title : '';
            }
        } else {
             setFrontHtml('');
             setBackHtml('');
        }
    }, [isOpen, cardToEdit]);

    useEffect(() => {
        if (isOpen && editorContainerRef.current && !quillRef.current) {
            const quill = new Quill(editorContainerRef.current, {
                theme: 'snow',
                modules: {
                    toolbar: [
                        ['bold', 'italic', 'underline', 'strike'],
                        ['blockquote', 'code-block'],
                        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                        [{ 'script': 'sub'}, { 'script': 'super' }],
                        [{ 'color': [] }, { 'background': [] }],
                        ['clean']
                    ]
                },
                placeholder: 'Enter content...',
            });
            
            quill.root.innerHTML = cardToEdit ? cardToEdit.title : '';
            quillRef.current = quill;
        }
        
        return () => {
            if (!isOpen) {
                quillRef.current = null;
            }
        };
    }, [isOpen, cardToEdit]);

    useEffect(() => {
        if (quillRef.current && isOpen) {
            const contentToLoad = activeTab === 'front' ? frontHtml : backHtml;
            if (quillRef.current.root.innerHTML !== contentToLoad) {
                 quillRef.current.root.innerHTML = contentToLoad;
            }
        }
    }, [activeTab, isOpen]);

    const handleTabSwitch = (newTab: 'front' | 'back') => {
        if (newTab === activeTab) return;

        if (quillRef.current) {
            const currentContent = quillRef.current.root.innerHTML;
            if (activeTab === 'front') {
                setFrontHtml(currentContent);
            } else {
                setBackHtml(currentContent);
            }
        }
        setActiveTab(newTab);
    };

    const handleSaveClick = async () => {
        if (isSaving) return;
        
        let finalFront = frontHtml;
        let finalBack = backHtml;
        
        if (quillRef.current) {
            const currentContent = quillRef.current.root.innerHTML;
            if (activeTab === 'front') finalFront = currentContent;
            else finalBack = currentContent;
        }

        console.log('[FlashcardEditor] Save attempt:', { 
            front: finalFront.substring(0, 100) + '...', 
            back: finalBack.substring(0, 100) + '...',
            frontLength: finalFront.length,
            backLength: finalBack.length
        });

        if (!finalFront.trim() || !finalBack.trim()) {
            alert("Both Front and Back sides must have content.");
            return;
        }

        setIsSaving(true);
        try {
            console.log('[FlashcardEditor] Calling onSave with:', { title: finalFront, body: finalBack });
            await onSave({ title: finalFront, body: finalBack });
            console.log('[FlashcardEditor] Save successful');
        } catch (error) {
            console.error('[FlashcardEditor] Save error:', error);
            alert('Failed to save flashcard: ' + error.message);
        }
        setFrontHtml('');
        setBackHtml('');
        if (quillRef.current) quillRef.current.root.innerHTML = '';
        setIsSaving(false);
    };
    
    const handleClose = () => {
        setFrontHtml('');
        setBackHtml('');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">{cardToEdit ? 'Edit Flashcard' : 'Add New Flashcard'}</h2>
                    <button onClick={handleClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                        <span className="text-2xl">&times;</span>
                    </button>
                </div>
                <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                    <button 
                        className={`flex-1 py-3 text-sm font-medium text-center transition-colors ${activeTab === 'front' ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-t-2 border-blue-500' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                        onClick={() => handleTabSwitch('front')}
                    >
                        Front (Question)
                    </button>
                    <button 
                        className={`flex-1 py-3 text-sm font-medium text-center transition-colors ${activeTab === 'back' ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-t-2 border-blue-500' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                        onClick={() => handleTabSwitch('back')}
                    >
                        Back (Answer)
                    </button>
                </div>
                <div className="flex-1 flex flex-col p-4 overflow-hidden bg-white dark:bg-gray-800">
                    <div className="bg-white dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 flex-1 flex flex-col overflow-hidden text-gray-900 dark:text-gray-100">
                        <div ref={editorContainerRef} className="flex-1 overflow-y-auto" style={{ minHeight: '200px' }}></div>
                    </div>
                </div>
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-end gap-3">
                    <button onClick={handleClose} className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600" disabled={isSaving}>Cancel</button>
                    <button onClick={handleSaveClick} className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-400" disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Save Card'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Main Props ---
interface FlashcardViewProps {
    lessonId: string;
    user: User;
}

// --- Single Flashcard Component ---
const Flashcard: React.FC<{ 
    card: Content; 
    frontTheme: { bg: string; textClass: string };
    backTheme: { bg: string; textClass: string };
    isCurrent: boolean; 
    onEdit: () => void; 
    onDelete: () => void; 
    isAdmin: boolean; 
}> = ({ card, frontTheme, backTheme, isCurrent, onEdit, onDelete, isAdmin }) => {
    const [isFlipped, setIsFlipped] = useState(false);

    useEffect(() => {
        setIsFlipped(false); // Reset flip state when card changes
    }, [card]);

    const contentClass = "w-full max-h-full overflow-y-auto prose prose-lg max-w-none text-center px-4 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent";

    return (
        <div className="w-full h-full [perspective:1500px]" onClick={() => setIsFlipped(!isFlipped)}>
            <div className={`relative w-full h-full transition-transform duration-700 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''} ease-in-out`}>
                <div 
                    className={`absolute w-full h-full rounded-2xl shadow-2xl flex flex-col items-center justify-center p-8 [backface-visibility:hidden] ${frontTheme.textClass} cursor-pointer`}
                    style={{ background: frontTheme.bg }}
                >
                    <div className="text-5xl mb-6 opacity-80 shrink-0">❓</div>
                    <div className={contentClass} style={{ color: 'inherit' }} dangerouslySetInnerHTML={{ __html: card.title }} />
                    <p className="absolute bottom-6 text-xs uppercase tracking-widest opacity-60 animate-pulse shrink-0">Tap to Flip</p>
                    {isAdmin && isCurrent && (
                        <div className="absolute top-4 right-4 flex gap-2 z-10" onClick={e => e.stopPropagation()}>
                            <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="p-2 rounded-full bg-white/30 hover:bg-white/50 backdrop-blur-md shadow-sm transition-all" title="Edit Card"><EditIcon className="w-5 h-5 text-current" /></button>
                            <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-2 rounded-full bg-white/30 hover:bg-white/50 backdrop-blur-md shadow-sm transition-all" title="Delete Card"><TrashIcon className="w-5 h-5 text-current" /></button>
                        </div>
                    )}
                </div>
                
                <div 
                    className={`absolute w-full h-full rounded-2xl shadow-2xl flex flex-col items-center justify-center p-8 [transform:rotateY(180deg)] [backface-visibility:hidden] ${backTheme.textClass} cursor-pointer`}
                    style={{ background: backTheme.bg }} 
                >
                    <div className="text-5xl mb-6 opacity-80 shrink-0">💡</div>
                    <div className={contentClass} style={{ color: 'inherit' }} dangerouslySetInnerHTML={{ __html: card.body }} />
                </div>
            </div>
        </div>
    );
};

// --- Thank You Screen Component ---
const ThankYouScreen: React.FC<{ onRetry: () => void }> = ({ onRetry }) => (
    <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-4 text-center">
        <Fireworks />
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Great Job!</h2>
        <p className="text-lg text-gray-300 mb-8">You've reviewed all the flashcards.</p>
        <button onClick={onRetry} className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-full hover:bg-blue-700 transition-transform transform hover:scale-105 shadow-lg">
            Start Over
        </button>
    </div>
);

// --- Main View Component ---
export const FlashcardView: React.FC<FlashcardViewProps> = ({ lessonId, user }) => {
    const [version, setVersion] = useState(0);
    
    // Debug logging to track lessonId changes
    useEffect(() => {
        console.log('[FlashcardView] LessonId changed:', lessonId);
    }, [lessonId]);
    
    // Use the same API pattern as QAView - fetch content by type
    const { data: groupedContent, isLoading } = useApi(() => api.getContentsByLessonId(lessonId, ['flashcard']), [lessonId, version]);
    
    // Debug logging to track content changes
    useEffect(() => {
        console.log('[FlashcardView] Grouped content response:', groupedContent);
        console.log('[FlashcardView] Response structure:', {
            hasResponse: !!groupedContent,
            length: groupedContent?.length,
            firstGroup: groupedContent?.[0]
        });
    }, [groupedContent]);
    
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [showThankYou, setShowThankYou] = useState(false);
    
    const [frontTheme, setFrontTheme] = useState<{bg: string, textClass: string}>(getFrontTheme);
    const [backTheme, setBackTheme] = useState<{bg: string, textClass: string}>(getBackTheme);

    const [editorModalState, setEditorModalState] = useState<{ isOpen: boolean; content: Content | null }>({ isOpen: false, content: null });
    const [confirmModalState, setConfirmModalState] = useState<{ isOpen: boolean; onConfirm: (() => void) | null }>({ isOpen: false, onConfirm: null });
    const [importModalOpen, setImportModalOpen] = useState(false);
    const { showToast } = useToast();

    const flashcards = useMemo(() => groupedContent?.[0]?.docs || [], [groupedContent]);
    const resourceType: ResourceType = 'flashcard';
    const canEdit = user.role === 'admin' || !!user.canEdit;
    
    // Debug logging for flashcards array
    useEffect(() => {
        console.log('[FlashcardView] Flashcards array:', flashcards);
        console.log('[FlashcardView] Flashcards count:', flashcards.length);
    }, [flashcards]);

    // ... (effects and handlers same as before)
    useEffect(() => {
        setCurrentCardIndex(0);
        setShowThankYou(false);
        setFrontTheme(getFrontTheme());
        setBackTheme(getBackTheme());
    }, [lessonId]);

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

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') handleNext();
            if (e.key === 'ArrowLeft') handlePrev();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleNext, handlePrev]);

    const handleSave = async (contentData: { title: string; body: string }) => {
        try {
            console.log('[FlashcardView] Saving flashcard content with lessonId:', lessonId);
            console.log('[FlashcardView] Content data received:', {
                title: contentData.title.substring(0, 100) + '...',
                body: contentData.body.substring(0, 100) + '...',
                titleLength: contentData.title.length,
                bodyLength: contentData.body.length
            });
            
            // Validate that we have a valid lessonId
            if (!lessonId) {
                throw new Error('No lesson selected');
            }
            
            if (editorModalState.content) {
                console.log('[FlashcardView] Updating existing flashcard:', editorModalState.content._id);
                await api.updateContent(editorModalState.content._id, contentData);
            } else {
                const newContent = { 
                    ...contentData, 
                    lessonId, 
                    type: resourceType 
                };
                console.log('[FlashcardView] Creating new flashcard:', {
                    ...newContent,
                    title: newContent.title.substring(0, 100) + '...',
                    body: newContent.body.substring(0, 100) + '...'
                });
                await api.addContent(newContent);
            }
            setVersion(v => v + 1);
            showToast('Card saved successfully!', 'success');
        } catch (e) {
            console.error('[FlashcardView] Save error:', e);
            showToast('Failed to save card.', 'error');
        }
        setEditorModalState({ isOpen: false, content: null });
    };

    const handleDelete = (contentId: string) => {
        const confirmAction = async () => {
            try {
                await api.deleteContent(contentId);
                setVersion(v => v + 1);
                showToast('Card deleted.', 'error'); // Red toast for delete
            } catch (e) {
                showToast('Failed to delete card.', 'error');
            }
            setConfirmModalState({ isOpen: false, onConfirm: null });
        };
        setConfirmModalState({ isOpen: true, onConfirm: confirmAction });
    };

    const handleImport = async (cards: { title: string; body: string }[]) => {
        try {
            const newContents = cards.map(card => ({
                ...card,
                lessonId,
                type: resourceType,
            }));
            await api.addMultipleContent(newContents);
            setVersion(v => v + 1);
            showToast(`${cards.length} cards imported successfully!`, 'success');
        } catch (e) {
            showToast('Failed to import cards.', 'error');
        }
        setImportModalOpen(false);
    };

    const currentCard = flashcards[currentCardIndex];
    const progressPercentage = flashcards.length > 0 ? ((currentCardIndex + 1) / flashcards.length) * 100 : 0;
    
    if (isLoading) {
        return <div className="text-center py-10">Loading flashcards...</div>;
    }

    if (flashcards.length === 0) {
        return (
            <div className="p-4 sm:p-6 lg:p-8 flex flex-col h-full">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center">
                        <FlashcardIcon className="w-6 h-6 sm:w-8 sm:h-8 mr-2 sm:mr-3 text-blue-500" />
                        <h1 className="text-lg sm:text-2xl font-bold text-gray-800 dark:text-white">Flashcards</h1>
                    </div>
                    {canEdit && (
                        <div className="flex gap-2">
                            <button onClick={() => setEditorModalState({ isOpen: true, content: null })} className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-colors" title="Add Card">
                                <PlusIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                                <span className="hidden sm:inline">Add New</span>
                            </button>
                             <button onClick={() => setImportModalOpen(true)} className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-sm transition-colors" title="Import Cards">
                                <ImportIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                                <span className="hidden sm:inline">Import</span>
                            </button>
                        </div>
                    )}
                </div>
                <div className="flex-1 text-center py-20 bg-white dark:bg-gray-800/50 rounded-lg flex flex-col justify-center items-center shadow-inner">
                    <FlashcardIcon className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600" />
                    <p className="mt-4 text-gray-500">No flashcards available for this chapter.</p>
                </div>
                <FlashcardEditorModal isOpen={editorModalState.isOpen} onClose={() => setEditorModalState({ isOpen: false, content: null })} onSave={handleSave} cardToEdit={editorModalState.content} />
                <ImportFlashcardsModal isOpen={importModalOpen} onClose={() => setImportModalOpen(false)} onImport={handleImport} />
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 flex flex-col h-full overflow-hidden">
            <div className="flex justify-between items-center mb-8 shrink-0">
                <div className="flex items-center">
                    <FlashcardIcon className="w-6 h-6 sm:w-8 sm:h-8 mr-2 sm:mr-3 text-blue-500" />
                    <h1 className="text-lg sm:text-2xl font-bold text-gray-800 dark:text-white">Flashcards</h1>
                </div>
                {canEdit && (
                    <div className="flex gap-2">
                        <button onClick={() => setEditorModalState({ isOpen: true, content: null })} className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-colors" title="Add Card">
                            <PlusIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                            <span className="hidden sm:inline">Add New</span>
                        </button>
                        <button onClick={() => setImportModalOpen(true)} className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-sm transition-colors" title="Import">
                            <ImportIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                            <span className="hidden sm:inline">Import</span>
                        </button>
                    </div>
                )}
            </div>
            
            <div className="flex-1 flex flex-col items-center justify-center relative min-h-0 w-full pb-4">
                <div className="w-full max-w-3xl flex-1 mb-6 relative z-10">
                     <div className={`absolute w-full h-full transition-all duration-500 ease-in-out`}>
                        <Flashcard 
                            card={currentCard} 
                            frontTheme={frontTheme}
                            backTheme={backTheme}
                            isCurrent={true}
                            onEdit={() => setEditorModalState({isOpen: true, content: currentCard})}
                            onDelete={() => handleDelete(currentCard._id)}
                            isAdmin={canEdit}
                        />
                    </div>
                </div>
                
                <div className="w-full max-w-3xl flex flex-col items-center z-10">
                    <div className="flex items-center justify-between w-full mb-3 px-2">
                        <button onClick={handlePrev} disabled={currentCardIndex === 0} className="px-4 py-2 sm:px-6 rounded-full bg-white dark:bg-gray-800 shadow-md text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2">
                            <ChevronLeftIcon className="w-5 h-5" />
                            <span className="hidden sm:inline">Previous</span>
                        </button>
                        <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">{currentCardIndex + 1} / {flashcards.length}</span>
                        <button onClick={handleNext} className="px-4 py-2 sm:px-6 rounded-full bg-blue-600 text-white shadow-md hover:bg-blue-700 transition-colors flex items-center gap-2">
                            <span className="hidden sm:inline">{currentCardIndex === flashcards.length - 1 ? 'Finish' : 'Next'}</span>
                            <ChevronRightIcon className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full cursor-pointer overflow-hidden" onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const clickX = e.clientX - rect.left;
                        const newIndex = Math.floor((clickX / rect.width) * flashcards.length);
                        handleProgressClick(newIndex);
                    }}>
                        <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${progressPercentage}%` }}></div>
                    </div>
                </div>

                {showThankYou && <ThankYouScreen onRetry={handleRetry} />}
            </div>

            <FlashcardEditorModal isOpen={editorModalState.isOpen} onClose={() => setEditorModalState({ isOpen: false, content: null })} onSave={handleSave} cardToEdit={editorModalState.content} />
            <ConfirmModal isOpen={confirmModalState.isOpen} onClose={() => setConfirmModalState({ isOpen: false, onConfirm: null })} onConfirm={confirmModalState.onConfirm} title="Delete Flashcard" message="Are you sure you want to delete this flashcard?" />
            <ImportFlashcardsModal isOpen={importModalOpen} onClose={() => setImportModalOpen(false)} onImport={handleImport} />
        </div>
    );
};