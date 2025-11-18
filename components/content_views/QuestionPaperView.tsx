import React, { useState, useMemo, useEffect } from 'react';
import { Content, User, QuestionPaperCategory, QuestionPaperMetadata } from '../../types';
import { useApi } from '../../hooks/useApi';
import * as api from '../../services/api';
import { QuestionPaperIcon } from '../icons/ResourceTypeIcons';
import { PlusIcon, EditIcon, TrashIcon, XIcon } from '../icons/AdminIcons';
import { ConfirmModal } from '../ConfirmModal';
import { PdfViewer } from './PdfViewer';

interface QuestionPaperViewProps {
    lessonId: string;
    user: User;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const TERMS = ['First Summative', 'Second Summative', 'Annual Summative'];

const AddEditModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Omit<Content, '_id' | 'lessonId' | 'type'>) => Promise<void>;
    paperToEdit: Content | null;
}> = ({ isOpen, onClose, onSave, paperToEdit }) => {
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState<QuestionPaperCategory>('Monthly');
    const [subCategory, setSubCategory] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            if (paperToEdit) {
                setTitle(paperToEdit.title);
                setCategory(paperToEdit.metadata?.category || 'Monthly');
                setSubCategory(paperToEdit.metadata?.subCategory || '');
                setPreviewDataUrl(paperToEdit.body); // Assumes body is a data URL for editing
            } else {
                setTitle('');
                setCategory('Monthly');
                setSubCategory('');
                setFile(null);
                setPreviewDataUrl(null);
                setError('');
            }
        }
    }, [isOpen, paperToEdit]);
    
    // Reset subCategory when main category changes
    useEffect(() => {
        setSubCategory('');
    }, [category]);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile && selectedFile.type === "application/pdf") {
            setFile(selectedFile);
            setError('');
            const reader = new FileReader();
            reader.onloadend = () => setPreviewDataUrl(reader.result as string);
            reader.readAsDataURL(selectedFile);
        } else {
            setError("Please select a valid PDF file.");
            setFile(null);
            setPreviewDataUrl(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !previewDataUrl) {
            setError("Title and a PDF file are required.");
            return;
        }
        if (category !== 'SSLC Exam' && !subCategory.trim()) {
            setError("Please fill in the sub-category details.");
            return;
        }
        setIsSaving(true);
        setError('');
        try {
            const metadata: QuestionPaperMetadata = { category };
            if (category !== 'SSLC Exam') {
                metadata.subCategory = subCategory.trim();
            }
            await onSave({ title: title.trim(), body: previewDataUrl, metadata });
            onClose();
        } catch (err) {
            setError("Failed to save. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };
    
    const renderSubCategoryInput = () => {
        const commonClasses = "mt-1 w-full p-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600";
        switch (category) {
            case 'Monthly':
                return <>
                    <label className="block text-sm font-medium">Month</label>
                    <select value={subCategory} onChange={e => setSubCategory(e.target.value)} required className={commonClasses}>
                        <option value="" disabled>Select Month</option>
                        {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </>;
            case 'Term Exam':
                return <>
                    <label className="block text-sm font-medium">Term</label>
                    <select value={subCategory} onChange={e => setSubCategory(e.target.value)} required className={commonClasses}>
                        <option value="" disabled>Select Term</option>
                        {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </>;
            case 'Model Exam':
                return <>
                    <label className="block text-sm font-medium">Model Name</label>
                    <input type="text" value={subCategory} onChange={e => setSubCategory(e.target.value)} placeholder="e.g., Model 1" required className={commonClasses} />
                </>;
            case 'Custom':
                 return <>
                    <label className="block text-sm font-medium">Custom Name</label>
                    <input type="text" value={subCategory} onChange={e => setSubCategory(e.target.value)} placeholder="e.g., Special Test Series" required className={commonClasses} />
                </>;
            case 'SSLC Exam':
                return null;
            default:
                return null;
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg max-h-full overflow-y-auto" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold mb-4">{paperToEdit ? 'Edit' : 'Add'} Question Paper</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium">Title</label>
                        <input type="text" value={title} onChange={e => setTitle(e.target.value)} required className="mt-1 w-full p-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Category</label>
                        <select value={category} onChange={e => setCategory(e.target.value as QuestionPaperCategory)} className="mt-1 w-full p-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600">
                            <option value="Monthly">Monthly</option>
                            <option value="Term Exam">Term Exam</option>
                            <option value="Model Exam">Model Exam</option>
                            <option value="SSLC Exam">SSLC Exam</option>
                            <option value="Custom">Custom</option>
                        </select>
                    </div>
                    {renderSubCategoryInput()}
                    <div>
                        <label className="block text-sm font-medium">PDF File</label>
                        <input type="file" onChange={handleFileChange} accept=".pdf" className="mt-1 w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/50 dark:file:text-blue-300 dark:hover:file:bg-blue-900"/>
                        {previewDataUrl && !file && <p className="text-xs text-gray-500 mt-1">Current PDF is retained. Upload a new file to replace it.</p>}
                        {file && <p className="text-xs text-green-600 dark:text-green-400 mt-1">New PDF selected: {file.name}</p>}
                    </div>
                    {error && <p className="text-sm text-red-500">{error}</p>}
                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md" disabled={isSaving}>Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:bg-blue-400" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export const QuestionPaperView: React.FC<QuestionPaperViewProps> = ({ lessonId, user }) => {
    const [version, setVersion] = useState(0);
    const { data: groupedContent, isLoading } = useApi(() => api.getContentsByLessonId(lessonId, ['questionPaper']), [lessonId, version]);
    
    const [modalState, setModalState] = useState<{ isOpen: boolean; paper: Content | null }>({ isOpen: false, paper: null });
    const [confirmModalState, setConfirmModalState] = useState<{ isOpen: boolean; onConfirm: (() => void) | null }>({ isOpen: false, onConfirm: null });
    const [fullscreenPdfUrl, setFullscreenPdfUrl] = useState<string | null>(null);

    const papers = groupedContent?.[0]?.docs || [];

    const groupedPapers = useMemo(() => {
        const groups: { [key: string]: { [key: string]: Content[] } } = {};
        papers.forEach(paper => {
            const category = paper.metadata?.category || 'Uncategorized';
            const subCategory = paper.metadata?.subCategory || 'General';
            if (!groups[category]) groups[category] = {};
            if (!groups[category][subCategory]) groups[category][subCategory] = [];
            groups[category][subCategory].push(paper);
        });
        return groups;
    }, [papers]);

    const handleSave = async (data: Omit<Content, '_id' | 'lessonId' | 'type'>) => {
        if (modalState.paper) {
            await api.updateContent(modalState.paper._id, data);
        } else {
            await api.addContent({ ...data, lessonId, type: 'questionPaper' });
        }
        setVersion(v => v + 1);
    };

    const handleDelete = (paperId: string) => {
        const confirmAction = async () => {
            await api.deleteContent(paperId);
            setVersion(v => v + 1);
            setConfirmModalState({ isOpen: false, onConfirm: null });
        };
        setConfirmModalState({ isOpen: true, onConfirm: confirmAction });
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center">
                    <QuestionPaperIcon className="w-8 h-8 mr-3 text-blue-500" />
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Question Papers</h1>
                </div>
                {user.role === 'admin' && (
                    <button onClick={() => setModalState({ isOpen: true, paper: null })} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        <PlusIcon className="w-5 h-5" /><span>Add Paper</span>
                    </button>
                )}
            </div>

            {isLoading && <div className="text-center py-10">Loading papers...</div>}

            {!isLoading && papers.length === 0 && (
                <div className="text-center py-20 bg-white dark:bg-gray-800/50 rounded-lg">
                    <QuestionPaperIcon className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600" />
                    <p className="mt-4 text-gray-500">No question papers available for this chapter.</p>
                </div>
            )}

            {!isLoading && papers.length > 0 && (
                <div className="space-y-8">
                    {Object.entries(groupedPapers).map(([category, subCategories]) => (
                        <div key={category}>
                            <h2 className="text-xl font-bold pb-2 border-b-2 border-blue-500 dark:border-blue-400 mb-4">{category}</h2>
                            <div className="space-y-4">
                                {Object.entries(subCategories).map(([subCategory, paperList]) => (
                                    <div key={subCategory}>
                                        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3">{subCategory}</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {paperList.map(paper => {
                                                const canOpen = paper.body.startsWith('data:application/pdf');
                                                return (
                                                    <div key={paper._id} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-md flex justify-between items-center group">
                                                        <button 
                                                            onClick={() => canOpen && setFullscreenPdfUrl(paper.body)} 
                                                            disabled={!canOpen}
                                                            className="flex items-center gap-3 text-left flex-1 min-w-0 disabled:cursor-not-allowed disabled:opacity-60"
                                                            title={canOpen ? "View Paper" : "Cannot open mock paper"}
                                                        >
                                                            <QuestionPaperIcon className="w-6 h-6 text-blue-500 shrink-0" />
                                                            <span className="font-medium flex-1 truncate">{paper.title}</span>
                                                        </button>
                                                        {user.role === 'admin' && (
                                                            <div className="flex items-center shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button onClick={() => setModalState({ isOpen: true, paper })} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full" title="Edit"><EditIcon className="w-4 h-4" /></button>
                                                                <button onClick={() => handleDelete(paper._id)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full" title="Delete"><TrashIcon className="w-4 h-4" /></button>
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
            
            <AddEditModal isOpen={modalState.isOpen} onClose={() => setModalState({ isOpen: false, paper: null })} onSave={handleSave} paperToEdit={modalState.paper} />
            <ConfirmModal isOpen={confirmModalState.isOpen} onClose={() => setConfirmModalState({ isOpen: false, onConfirm: null })} onConfirm={confirmModalState.onConfirm} title="Delete Paper" message="Are you sure you want to delete this question paper?" />
            {fullscreenPdfUrl && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col p-4 animate-fade-in">
                    <div className="flex justify-end mb-2 shrink-0">
                        <button onClick={() => setFullscreenPdfUrl(null)} className="p-2 rounded-full bg-white/20 hover:bg-white/40 text-white" aria-label="Close fullscreen PDF viewer">
                            <XIcon className="w-6 h-6" />
                        </button>
                    </div>
                    <div className="flex-1 overflow-hidden h-full">
                       <PdfViewer url={fullscreenPdfUrl} />
                    </div>
                </div>
            )}
        </div>
    );
};