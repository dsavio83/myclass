import React, { useState, useEffect } from 'react';
import { Content, User } from '../../types';
import { useApi } from '../../hooks/useApi';
import * as api from '../../services/api';
import { BookIcon } from '../icons/ResourceTypeIcons';
import { TrashIcon, UploadCloudIcon, ExpandIcon, XIcon } from '../icons/AdminIcons';
import { ConfirmModal } from '../ConfirmModal';
import { PdfViewer } from './PdfViewer';

interface BookViewProps {
    lessonId: string;
    user: User;
}

// Viewer for an already saved book
const SavedBookViewer: React.FC<{ content: Content; onRemove: () => void; isAdmin: boolean; onExpand: (url: string) => void; }> = ({ content, onRemove, isAdmin, onExpand }) => {
    const isDataUrl = content.body.startsWith('data:application/pdf');
    const isFilePath = content.body.startsWith('/uploads/');

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 relative">
            <div className="absolute top-4 right-4 flex gap-2 z-20">
                {(isDataUrl || isFilePath) && (
                     <button onClick={() => onExpand(content.body)} className="p-2 rounded-full bg-white/50 dark:bg-black/50 hover:bg-white/80 dark:hover:bg-black/80 backdrop-blur-sm shadow-md" title="View Fullscreen">
                        <ExpandIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    </button>
                )}
                {isAdmin && (
                    <button onClick={onRemove} className="p-2 rounded-full bg-white/50 dark:bg-black/50 hover:bg-white/80 dark:hover:bg-black/80 backdrop-blur-sm shadow-md" title="Remove Book">
                        <TrashIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    </button>
                )}
            </div>
            <h2 className="text-xl font-semibold mb-4 pr-24">{content.title}</h2>
            {(isDataUrl || isFilePath) ? (
                <PdfViewer url={content.body} />
            ) : (
                <div className="aspect-[8.5/11] w-full bg-gray-200 dark:bg-gray-700 rounded border dark:border-gray-600 flex flex-col items-center justify-center text-center p-4">
                    <BookIcon className="w-16 h-16 text-gray-400 dark:text-gray-500 mb-4" />
                    <p className="text-gray-600 dark:text-gray-300 font-semibold">Invalid file format</p>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">This book has an unsupported file format.</p>
                    <p className="text-xs text-gray-400 mt-1 truncate max-w-full">({content.body})</p>
                </div>
            )}
        </div>
    );
};

// Form for uploading a new book with file upload system
const UploadForm: React.FC<{ lessonId: string; onUpload: () => void; onExpand: (url: string) => void; }> = ({ lessonId, onUpload, onExpand }) => {
    const [file, setFile] = useState<File | null>(null);
    const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
    const [autoTitle, setAutoTitle] = useState('Loading title...');
    const [suggestedFilename, setSuggestedFilename] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch breadcrumbs and filename suggestion
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Get breadcrumb path for title
                const breadcrumbPath = await api.getBreadcrumbs(lessonId);
                setAutoTitle(breadcrumbPath);
                
                // Get suggested filename
                try {
                    const filenameData = await api.getFilenameSuggestion(lessonId, 'pdf');
                    setSuggestedFilename(filenameData.suggestedFilename);
                } catch (filenameErr) {
                    console.warn('Could not get filename suggestion:', filenameErr);
                    setSuggestedFilename('lesson_book.pdf');
                }
            } catch (err) {
                console.error('Error fetching metadata:', err);
                setAutoTitle('Lesson Book');
                setSuggestedFilename('lesson_book.pdf');
            }
        };
        
        fetchData();
    }, [lessonId]);

    // Handle file selection and create preview URL
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            if (selectedFile.type === "application/pdf") {
                setFile(selectedFile);
                setError(null);
                const reader = new FileReader();
                reader.onloadend = () => {
                    setPreviewDataUrl(reader.result as string);
                };
                reader.readAsDataURL(selectedFile);
            } else {
                setError("Please select a valid PDF file.");
                setFile(null);
                setPreviewDataUrl(null);
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !autoTitle || isSaving) return;
        
        setIsSaving(true);
        setError(null);
        
        try {
            // Use the new uploadFile API instead of addContent with base64
            await api.uploadFile(file, lessonId, autoTitle, 'book', suggestedFilename);
            onUpload();
        } catch (err: any) {
            console.error('Upload error:', err);
            setError(err.message || "Failed to upload book. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto bg-white dark:bg-gray-800/50 p-8 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-center mb-1 text-gray-800 dark:text-white">Upload New Book</h3>
            <p className="text-sm text-center text-gray-500 dark:text-gray-400 mb-6">
                Title: <span className="font-medium">{autoTitle}</span>
                <br />
                Suggested filename: <span className="font-mono text-xs">{suggestedFilename}</span>
            </p>
            
            <div className="grid md:grid-cols-2 gap-8 items-start">
                {/* Uploader and Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="pdfFile" className="block text-sm font-medium text-gray-700 dark:text-gray-300">PDF File</label>
                        <div className="mt-1 flex items-center justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-md">
                            <div className="space-y-1 text-center">
                                <UploadCloudIcon className="mx-auto h-12 w-12 text-gray-400"/>
                                <div className="flex text-sm text-gray-600 dark:text-gray-400">
                                    <label htmlFor="pdfFile" className="relative cursor-pointer bg-white dark:bg-gray-800 rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none">
                                        <span>Upload a file</span>
                                        <input id="pdfFile" name="pdfFile" type="file" className="sr-only" onChange={handleFileChange} accept=".pdf" />
                                    </label>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-500">
                                    {file ? file.name : 'PDF up to 100MB'}
                                    {file && ` (${(file.size / 1024 / 1024).toFixed(2)} MB)`}
                                </p>
                            </div>
                        </div>
                    </div>

                    {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}
                    
                    <button type="submit" disabled={!file || isSaving} className="w-full px-4 py-3 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed">
                        {isSaving ? 'Uploading...' : 'Upload Book'}
                    </button>
                </form>

                {/* Live Preview */}
                <div className="flex flex-col h-full">
                     <div className="flex justify-between items-center mb-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Preview</label>
                         {previewDataUrl && (
                            <button type="button" onClick={() => onExpand(previewDataUrl)} className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" title="View Fullscreen">
                                <ExpandIcon className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                            </button>
                         )}
                      </div>
                      <div className="flex-1 rounded border dark:border-gray-600 h-96 overflow-hidden">
                         {previewDataUrl ? (
                             <PdfViewer url={previewDataUrl} />
                         ) : (
                             <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex flex-col items-center justify-center text-center text-gray-500 dark:text-gray-400 rounded">
                                 <BookIcon className="w-12 h-12 mb-2" />
                                 <p>PDF preview will appear here</p>
                             </div>
                         )}
                      </div>
                </div>
            </div>
        </div>
    );
};

export const BookView: React.FC<BookViewProps> = ({ lessonId, user }) => {
    const [version, setVersion] = useState(0);
    const { data: groupedContent, isLoading } = useApi(
        () => api.getContentsByLessonId(lessonId, ['book']),
        [lessonId, version]
    );

    const [confirmModalState, setConfirmModalState] = useState<{ isOpen: boolean; onConfirm: (() => void) | null }>({ isOpen: false, onConfirm: null });
    const [fullscreenPdfUrl, setFullscreenPdfUrl] = useState<string | null>(null);

    const bookContent = groupedContent?.[0]?.docs[0];

    const handleDelete = (contentId: string) => {
        const confirmAction = async () => {
            try {
                await api.deleteContent(contentId);
                setVersion(v => v + 1);
                setConfirmModalState({ isOpen: false, onConfirm: null });
            } catch (error) {
                console.error('Error deleting content:', error);
                setConfirmModalState({ isOpen: false, onConfirm: null });
            }
        };
        setConfirmModalState({ isOpen: true, onConfirm: confirmAction });
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center">
                    <BookIcon className="w-8 h-8 mr-3 text-blue-500" />
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Book</h1>
                </div>
            </div>
            
            {isLoading && <div className="text-center py-10">Loading book...</div>}
            
            {!isLoading && bookContent && (
                <SavedBookViewer 
                    content={bookContent} 
                    onRemove={() => handleDelete(bookContent._id)} 
                    isAdmin={user.role === 'admin'} 
                    onExpand={setFullscreenPdfUrl}
                />
            )}

            {!isLoading && !bookContent && (
                user.role === 'admin' ? (
                    <UploadForm lessonId={lessonId} onUpload={() => setVersion(v => v + 1)} onExpand={setFullscreenPdfUrl} />
                ) : (
                    <div className="text-center py-20 bg-white dark:bg-gray-800/50 rounded-lg">
                        <BookIcon className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600" />
                        <p className="mt-4 text-gray-500">No book available for this chapter.</p>
                    </div>
                )
            )}
            
            <ConfirmModal 
                isOpen={confirmModalState.isOpen}
                onClose={() => setConfirmModalState({ isOpen: false, onConfirm: null })}
                onConfirm={confirmModalState.onConfirm}
                title="Remove Book"
                message="Are you sure you want to remove this book? This action cannot be undone."
            />
             {fullscreenPdfUrl && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col p-4 animate-fade-in">
                    <div className="flex justify-end mb-2 shrink-0">
                        <button 
                            onClick={() => setFullscreenPdfUrl(null)} 
                            className="p-2 rounded-full bg-white/20 hover:bg-white/40 text-white transition-colors"
                            aria-label="Close fullscreen PDF viewer"
                        >
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