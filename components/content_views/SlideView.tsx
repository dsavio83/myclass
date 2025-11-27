import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Content, User } from '../../types';
import { useApi } from '../../hooks/useApi';
import * as api from '../../services/api';
import { SlideIcon } from '../icons/ResourceTypeIcons';
import { TrashIcon, UploadCloudIcon, ExpandIcon, XIcon, SaveIcon, ChevronLeftIcon, ChevronRightIcon } from '../icons/AdminIcons';
import { ConfirmModal } from '../ConfirmModal';
import { PdfViewer } from './PdfViewer';
import { useToast } from '../../context/ToastContext';

// Configure worker - using local worker file with CDN fallback
const CDN_WORKER_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
const LOCAL_WORKER_URL = '/pdf.worker.min.js';

interface SlideViewProps {
    lessonId: string;
    user: User;
}

// Utility to convert Base64 to Blob URL for faster PDF rendering
const useBase64ToBlobUrl = (base64String: string | undefined) => {
    const [blobUrl, setBlobUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!base64String || !base64String.startsWith('data:application/pdf')) {
            setBlobUrl(null);
            return;
        }

        let url: string | null = null;
        const timer = setTimeout(() => {
            try {
                const parts = base64String.split(',');
                const base64 = parts[1];
                const binaryStr = atob(base64);
                const len = binaryStr.length;
                const bytes = new Uint8Array(len);
                for (let i = 0; i < len; i++) {
                    bytes[i] = binaryStr.charCodeAt(i);
                }
                const blob = new Blob([bytes], { type: 'application/pdf' });
                url = URL.createObjectURL(blob);
                setBlobUrl(url);
            } catch (e) {
                setBlobUrl(base64String);
            }
        }, 0);

        return () => {
            clearTimeout(timer);
            if (url) URL.revokeObjectURL(url);
        };
    }, [base64String]);

    return blobUrl;
};

// Full-screen slide viewer with navigation controls
const FullscreenSlideViewer: React.FC<{ 
    content: Content; 
    onClose: () => void; 
    isMobile: boolean; 
    isLandscape: boolean; 
}> = ({ content, onClose, isMobile, isLandscape }) => {
    // Handle both base64 content and file-based content
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [currentSlide, setCurrentSlide] = useState(1);
    const [totalSlides, setTotalSlides] = useState(1);
    const viewerRef = useRef<any>(null);
    const [lastClickTime, setLastClickTime] = useState(0);

    useEffect(() => {
        const loadPdfFromFile = async () => {
            try {
                console.log('[FullscreenSlideViewer] Loading PDF for content:', content._id);
                
                // If content has a filePath, construct the URL to load the file
                if (content.filePath) {
                    // For uploaded files, construct URL from file path
                    const url = `/api/content/${content._id}/file`;
                    console.log('[FullscreenSlideViewer] Using file URL:', url);
                    setPdfUrl(url);
                } else if (content.body && content.body.startsWith('data:application/pdf')) {
                    // Fallback for base64 content
                    const blobUrl = useBase64ToBlobUrl(content.body);
                    setPdfUrl(blobUrl);
                } else {
                    console.log('[FullscreenSlideViewer] No filePath or base64 data found');
                }
            } catch (error) {
                console.error('[FullscreenSlideViewer] Error loading PDF:', error);
            }
        };

        loadPdfFromFile();
    }, [content]);

    // Handle keyboard navigation and ESC key
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') {
                setCurrentSlide(prev => Math.max(1, prev - 1));
            } else if (e.key === 'ArrowRight') {
                setCurrentSlide(prev => Math.min(totalSlides, prev + 1));
            } else if (e.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [totalSlides, onClose]);

    // Handle double-click to exit fullscreen
    const handleDoubleClick = useCallback((e: React.MouseEvent) => {
        const currentTime = new Date().getTime();
        if (currentTime - lastClickTime < 300) {
            onClose();
        }
        setLastClickTime(currentTime);
    }, [lastClickTime, onClose]);

    // Handle click navigation (left/right sides)
    const handleClickNavigation = useCallback((e: React.MouseEvent) => {
        if (!viewerRef.current) return;
        
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        
        // Determine if click is on left or right side
        const isLeftClick = clickX < rect.width / 2;
        
        if (isLeftClick) {
            // Left click - previous slide
            setCurrentSlide(prev => Math.max(1, prev - 1));
        } else {
            // Right click - next slide
            setCurrentSlide(prev => Math.min(totalSlides, prev + 1));
        }
    }, [totalSlides]);

    // Update total slides when PDF loads
    const handlePdfLoad = useCallback((pdf: any) => {
        setTotalSlides(pdf.numPages);
        setCurrentSlide(1);
    }, []);

    if (!isLandscape && isMobile) {
        return (
            <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
                <div className="text-center text-white p-8">
                    <div className="w-24 h-24 mx-auto mb-6 border-4 border-white rounded-full flex items-center justify-center">
                        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold mb-4">Please rotate your device</h2>
                    <p className="text-gray-300">Slides work best in landscape mode. Please rotate your device to continue.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
            {/* Slide content area - True fullscreen without headers/footers */}
            <div 
                className="w-full h-full relative cursor-pointer select-none"
                onClick={handleClickNavigation}
                onDoubleClick={handleDoubleClick}
                ref={viewerRef}
            >
                {pdfUrl ? (
                    <SlidePdfViewer
                        url={pdfUrl}
                        currentSlide={currentSlide}
                        onSlideChange={setCurrentSlide}
                        onPdfLoad={handlePdfLoad}
                        isMobile={isMobile}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-white">
                        <div className="text-center">
                            <SlideIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                            <p>Loading slides...</p>
                            {content.body && !content.body.startsWith('data:application/pdf') && (
                                <p className="text-sm text-gray-400 mt-2">No PDF data found</p>
                            )}
                        </div>
                    </div>
                )}

                {/* Left side - slide indicator (only shows when hovering left) */}
                <div className="absolute top-4 left-4 opacity-0 hover:opacity-100 transition-opacity">
                    <div className="bg-black/50 backdrop-blur-sm px-3 py-1 rounded-full text-white text-sm">
                        {currentSlide} / {totalSlides}
                    </div>
                </div>

                {/* Right side - close button (only shows when hovering right) */}
                <div className="absolute top-4 right-4 opacity-0 hover:opacity-100 transition-opacity">
                    <button 
                        onClick={onClose}
                        className="bg-red-500/80 hover:bg-red-600/90 backdrop-blur-sm p-2 rounded-full text-white transition-colors shadow-lg"
                        title="Close (ESC)"
                    >
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* ESC hint - only visible on hover */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 backdrop-blur-sm px-3 py-1 rounded-full text-white text-xs opacity-0 hover:opacity-100 transition-opacity">
                    Double-click or ESC to exit
                </div>
            </div>
        </div>
    );
};

// PDF viewer component specifically for slides
const SlidePdfViewer: React.FC<{
    url: string;
    currentSlide: number;
    onSlideChange: (slide: number) => void;
    onPdfLoad: (pdf: any) => void;
    isMobile: boolean;
}> = ({ url, currentSlide, onSlideChange, onPdfLoad, isMobile }) => {
    const [pdfDoc, setPdfDoc] = useState<any>(null);
    const [pdfjsLib, setPdfjsLib] = useState<any>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const renderTaskRef = useRef<any>(null);

    // Dynamically load pdfjs library
    useEffect(() => {
        const loadPdfJs = async () => {
            try {
                const pdfjs = await import('pdfjs-dist');
                // Configure worker
                pdfjs.GlobalWorkerOptions.workerSrc = LOCAL_WORKER_URL;
                setPdfjsLib(pdfjs);
            } catch (error) {
                console.error('Failed to load PDF.js library:', error);
            }
        };
        
        loadPdfJs();
    }, []);

    useEffect(() => {
        if (!url || !pdfjsLib) return;

        const loadPdf = async () => {
            try {
                const loadingTask = await pdfjsLib.getDocument(url);
                const pdf = await loadingTask.promise;
                setPdfDoc(pdf);
                onPdfLoad(pdf);
            } catch (error) {
                console.error('Error loading PDF:', error);
            }
        };

        loadPdf();
    }, [url, onPdfLoad, pdfjsLib]);

    useEffect(() => {
        if (!pdfDoc || !canvasRef.current) return;

        const renderPage = async () => {
            try {
                // Cancel previous render task
                if (renderTaskRef.current) {
                    renderTaskRef.current.cancel();
                }

                const page = await pdfDoc.getPage(currentSlide);
                const viewport = page.getViewport({ scale: isMobile ? 1.0 : 1.5 });
                const canvas = canvasRef.current;
                const context = canvas.getContext('2d');

                if (context) {
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;

                    const renderContext = {
                        canvasContext: context,
                        viewport: viewport
                    };

                    const renderTask = page.render(renderContext);
                    renderTaskRef.current = renderTask;

                    await renderTask.promise;
                    renderTaskRef.current = null;
                }
            } catch (error) {
                console.error('Error rendering page:', error);
            }
        };

        renderPage();
    }, [pdfDoc, currentSlide, isMobile]);

    return (
        <div className="w-full h-full flex items-center justify-center bg-white">
            <canvas ref={canvasRef} className="shadow-2xl max-w-full max-h-full" />
        </div>
    );
};

const SavedSlideViewer: React.FC<{ content: Content; onRemove: () => void; isAdmin: boolean; onExpand: () => void; }> = ({ 
    content, 
    onRemove, 
    isAdmin, 
    onExpand 
}) => {
    // Handle both base64 content and file-based content
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [isMobile, setIsMobile] = useState(false);
    const [isLandscape, setIsLandscape] = useState(true);
    const [lastClickTime, setLastClickTime] = useState(0);

    useEffect(() => {
        const loadPdfFromFile = async () => {
            try {
                console.log('[SavedSlideViewer] Loading content:', content._id);
                console.log('[SavedSlideViewer] Content has filePath:', !!content.filePath);
                console.log('[SavedSlideViewer] Content body:', content.body);
                
                // If content has a filePath, construct the URL to load the file
                if (content.filePath) {
                    // For uploaded files, construct URL from content ID
                    const url = `/api/content/${content._id}/file`;
                    console.log('[SavedSlideViewer] Using file URL:', url);
                    setPdfUrl(url);
                } else if (content.body && content.body.startsWith('data:application/pdf')) {
                    // Fallback for base64 content
                    const blobUrl = useBase64ToBlobUrl(content.body);
                    setPdfUrl(blobUrl);
                } else {
                    console.log('[SavedSlideViewer] No filePath or base64 data found, checking if body contains file path...');
                    // Try to parse JSON metadata for file path
                    try {
                        // Handle escaped JSON in body
                        const cleanedBody = content.body.replace(/\\"/g, '"');
                        const metadata = JSON.parse(cleanedBody);
                        if (metadata.subCategory && metadata.subCategory.includes('.pdf')) {
                            const url = `/api/content/${content._id}/file`;
                            console.log('[SavedSlideViewer] Found file path in metadata:', url);
                            setPdfUrl(url);
                        }
                    } catch (parseError) {
                        console.log('[SavedSlideViewer] Could not parse body as JSON, trying direct file path...');
                        // If the body contains a direct file path to a PDF, try to serve it
                        if (content.body.includes('.pdf')) {
                            console.log('[SavedSlideViewer] Body contains PDF path, using content API');
                            setPdfUrl(`/api/content/${content._id}/file`);
                        }
                    }
                }
            } catch (error) {
                console.error('Error loading PDF:', error);
            }
        };

        loadPdfFromFile();
    }, [content]);

    // Handle double-click to enter fullscreen
    const handleDoubleClick = useCallback((e: React.MouseEvent) => {
        const currentTime = new Date().getTime();
        if (currentTime - lastClickTime < 300) {
            onExpand();
        }
        setLastClickTime(currentTime);
    }, [lastClickTime, onExpand]);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
            setIsLandscape(window.innerWidth > window.innerHeight);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        window.addEventListener('orientationchange', checkMobile);
        return () => {
            window.removeEventListener('resize', checkMobile);
            window.removeEventListener('orientationchange', checkMobile);
        };
    }, []);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-2 relative h-full flex flex-col">
            <div className="absolute top-4 right-4 flex gap-2 z-20">
                <button 
                    onClick={onExpand} 
                    className={`${isMobile ? 'p-3' : 'p-2'} rounded-full bg-white/50 dark:bg-black/50 hover:bg-white/80 dark:hover:bg-black/80 backdrop-blur-sm shadow-md`} 
                    title="View Fullscreen"
                >
                    <ExpandIcon className={`${isMobile ? 'w-6 h-6' : 'w-5 h-5'} text-gray-600 dark:text-gray-300`} />
                </button>
                {isAdmin && (
                    <button 
                        onClick={onRemove} 
                        className={`${isMobile ? 'p-3' : 'p-2'} rounded-full bg-white/50 dark:bg-black/50 hover:bg-white/80 dark:hover:bg-black/80 backdrop-blur-sm shadow-md`} 
                        title="Remove Slides"
                    >
                        <TrashIcon className={`${isMobile ? 'w-6 h-6' : 'w-5 h-5'} text-gray-600 dark:text-gray-300`} />
                    </button>
                )}
            </div>

            <h2 className="text-lg font-semibold mb-4 pr-24 shrink-0 text-gray-800 dark:text-white truncate" title={content.title}>
                {content.title}
            </h2>

            {pdfUrl ? (
                <div 
                    className="flex-1 overflow-hidden rounded border dark:border-gray-700 bg-gray-100 dark:bg-gray-900 relative cursor-pointer"
                    onClick={onExpand}
                    onDoubleClick={handleDoubleClick}
                    title="Double-click to view in fullscreen"
                >
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-900">
                        <div className="text-center p-8">
                            <div className="w-20 h-20 mx-auto mb-4 bg-white dark:bg-gray-700 rounded-lg shadow-lg flex items-center justify-center">
                                <SlideIcon className="w-10 h-10 text-blue-500 dark:text-blue-400" />
                            </div>
                            <p className="text-gray-700 dark:text-gray-200 font-semibold">PDF Slides Ready</p>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Double-click to open fullscreen</p>
                            <p className="text-xs text-gray-400 mt-2">Use left/right clicks to navigate slides</p>
                        </div>
                    </div>
                    {/* Hover hint */}
                    <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-black/70 text-white text-xs px-2 py-1 rounded opacity-0 hover:opacity-100 transition-opacity">
                        Double-click to enter fullscreen
                    </div>
                </div>
            ) : (
                <div className="flex-1 aspect-[16/9] w-full bg-gray-200 dark:bg-gray-700 rounded border dark:border-gray-600 flex flex-col items-center justify-center text-center p-4">
                    <SlideIcon className="w-16 h-16 text-gray-400 dark:text-gray-500 mb-4" />
                    <p className="text-gray-600 dark:text-gray-300 font-semibold">Cannot display PDF</p>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">This slide deck cannot be opened.</p>
                    {process.env.NODE_ENV === 'development' && (
                        <div className="mt-2 text-xs text-gray-400 dark:text-gray-500 font-mono text-left w-full max-w-sm">
                            <p>Debug info:</p>
                            <p>• Has filePath: {!!content.filePath}</p>
                            <p>• Has body: {!!content.body}</p>
                            <p>• Body type: {typeof content.body}</p>
                            <p>• Body length: {content.body ? content.body.length : 0}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const UploadForm: React.FC<{ lessonId: string; onUpload: () => void; onExpand: () => void; }> = ({ lessonId, onUpload, onExpand }) => {
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [autoTitle, setAutoTitle] = useState('Loading title...');
    const [folderPath, setFolderPath] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const { showToast } = useToast();

    // Responsive initial scale
    const [isMobile, setIsMobile] = React.useState(false);

    React.useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Optimized Path and Title Logic - Fast loading with minimal API calls
    useEffect(() => {
        const fetchTitleAndPath = async () => {
            try {
                // Strategy 1: Try breadcrumbs first (fastest for lessons)
                const breadcrumbs = await api.getBreadcrumbs(lessonId);
                if (breadcrumbs && breadcrumbs.trim()) {
                    const parts = breadcrumbs.split(' > ').filter(part => part.trim());
                    if (parts.length >= 2) {
                        const fileName = parts[parts.length - 1];
                        const hierarchyPath = parts.join('/');
                        const cleanSubjectNameLower = parts[1].toLowerCase().replace(/\s+/g, '');
                        const cleanUnitNameFormatted = parts[2].replace(/\s+/g, '');
                        const fullVirtualPath = `../uploads/${parts[0]}/${cleanSubjectNameLower}/${cleanUnitNameFormatted}/Slides/${fileName}.pdf`;

                        setAutoTitle(fileName);
                        setFolderPath(fullVirtualPath);
                        return;
                    }
                }

                // Strategy 2: Fast identification with minimal calls
                let foundLevel = false;
                let breadcrumbParts: string[] = [];
                let fileName = 'New Slides';

                // Get all classes first (usually just 2-3)
                const classes = await api.getClasses();

                // Try each class - parallel approach would be better but this is still fast
                for (const classItem of classes) {
                    const subjects = await api.getSubjectsByClassId(classItem._id);

                    for (const subject of subjects) {
                        const units = await api.getUnitsBySubjectId(subject._id);

                        // Check if lessonId matches any unit directly
                        const unit = units.find(u => u._id === lessonId);
                        if (unit) {
                            breadcrumbParts = [classItem.name, subject.name, unit.name];
                            fileName = unit.name;
                            foundLevel = true;
                            break;
                        }

                        // Check subUnits
                        for (const unitItem of units) {
                            const subUnits = await api.getSubUnitsByUnitId(unitItem._id);

                            const subUnit = subUnits.find(su => su._id === lessonId);
                            if (subUnit) {
                                breadcrumbParts = [classItem.name, subject.name, unitItem.name, subUnit.name];
                                fileName = subUnit.name;
                                foundLevel = true;
                                break;
                            }

                            // Only check lessons if we haven't found it yet
                            if (!foundLevel) {
                                for (const subUnitItem of subUnits) {
                                    const lessons = await api.getLessonsBySubUnitId(subUnitItem._id);
                                    const lesson = lessons.find(l => l._id === lessonId);
                                    if (lesson) {
                                        // Should have been caught by breadcrumbs, but just in case
                                        breadcrumbParts = [classItem.name, subject.name, unitItem.name, subUnitItem.name, lesson.name];
                                        fileName = lesson.name;
                                        foundLevel = true;
                                        break;
                                    }
                                }
                            }
                        }

                        if (foundLevel) break;
                    }
                    if (foundLevel) break;
                }

                // Generate final path
                if (foundLevel && breadcrumbParts.length > 0) {
                    const hierarchyPath = breadcrumbParts.join('/');
                    const cleanSubjectNameLower = breadcrumbParts[1].toLowerCase().replace(/\s+/g, '');
                    const cleanUnitNameFormatted = breadcrumbParts[2].replace(/\s+/g, '');
                    const fullVirtualPath = `../uploads/${breadcrumbParts[0]}/${cleanSubjectNameLower}/${cleanUnitNameFormatted}/Slides/${fileName}.pdf`;

                    setAutoTitle(fileName);
                    setFolderPath(fullVirtualPath);
                } else {
                    // Quick fallback
                    const fallbackTitle = `Slides_${lessonId.slice(-4)}`;
                    const fallbackPath = `../uploads/Class/default/Unit/Slides/${fallbackTitle}.pdf`;

                    setAutoTitle(fallbackTitle);
                    setFolderPath(fallbackPath);
                }

            } catch (e) {
                setAutoTitle('New Slides');
                setFolderPath('Default/Slides/New Slides.pdf');
            }
        };

        if (lessonId) {
            fetchTitleAndPath();
        } else {
            setAutoTitle('Select a lesson/unit first');
            setFolderPath('../uploads/Class/Pending/Unit/Slides/Pending Selection.pdf');
        }
    }, [lessonId]);

    useEffect(() => {
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        };
    }, [previewUrl]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            if (selectedFile.type === "application/pdf") {
                setFile(selectedFile);
                const objectUrl = URL.createObjectURL(selectedFile);
                setPreviewUrl(objectUrl);
            } else {
                showToast("Please select a valid PDF file.", 'error');
                setFile(null);
                setPreviewUrl(null);
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !autoTitle || isSaving) return;

        setIsSaving(true);

        try {
            // Use FormData for file upload instead of base64 encoding
            const formData = new FormData();
            formData.append('file', file);
            formData.append('lessonId', lessonId);
            formData.append('type', 'slide');
            formData.append('title', autoTitle);
            formData.append('metadata', JSON.stringify({ category: 'Custom', subCategory: folderPath }));

            await api.uploadFile(formData);
            showToast('Slides uploaded successfully!', 'success');
            onUpload();
        } catch (err) {
            console.error('Upload error:', err);
            showToast('Failed to upload slides.', 'error');
            setIsSaving(false);
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto bg-white dark:bg-gray-800/50 p-8 rounded-lg shadow-md h-full flex flex-col overflow-hidden">
            <h3 className="text-lg font-semibold text-center mb-1 text-gray-800 dark:text-white shrink-0">Upload New Slides</h3>
            <p className="text-sm text-center text-gray-500 dark:text-gray-400 mb-2 shrink-0">File will be saved as: <span className="font-mono font-medium text-blue-600 dark:text-blue-400">{autoTitle}</span></p>
            <p className="text-xs text-center text-gray-400 dark:text-gray-500 mb-6 shrink-0 font-mono truncate" title={folderPath}>Folder: {folderPath}</p>

            <div className="grid md:grid-cols-2 gap-8 items-start flex-1 overflow-y-auto pr-2">
                <form onSubmit={handleSubmit} className="space-y-6 shrink-0">
                    <div>
                        <label htmlFor="pdfFile" className="block text-sm font-medium text-gray-700 dark:text-gray-300">PDF File</label>
                        <div className="mt-1 flex items-center justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-md">
                            <div className="space-y-1 text-center">
                                <UploadCloudIcon className="mx-auto h-12 w-12 text-gray-400" />
                                <div className="flex text-sm text-gray-600 dark:text-gray-400">
                                    <label htmlFor="pdfFile" className="relative cursor-pointer bg-white dark:bg-gray-800 rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none">
                                        <span>Upload a file</span>
                                        <input id="pdfFile" name="pdfFile" type="file" className="sr-only" onChange={handleFileChange} accept=".pdf" />
                                    </label>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-500">{file ? `${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)` : 'PDF up to 500MB (upload limit)'}</p>
                            </div>
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        disabled={!file || isSaving} 
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
                    >
                        <SaveIcon className={`${isMobile ? 'w-6 h-6' : 'w-5 h-5'}`} />
                        <span className={isMobile ? 'hidden' : 'inline'}>
                            {isSaving ? 'Saving...' : 'Save Slides'}
                        </span>
                    </button>
                </form>

                <div className="flex flex-col h-full overflow-hidden min-h-[300px]">
                    <div className="flex justify-between items-center mb-1 shrink-0">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Preview</label>
                        {previewUrl && (
                            <button type="button" onClick={onExpand} className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" title="View Fullscreen">
                                <ExpandIcon className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                            </button>
                        )}
                    </div>
                    <div className="flex-1 rounded border dark:border-gray-600 overflow-hidden relative">
                        {previewUrl ? (
                            <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-700">
                                <div className="text-center p-8">
                                    <SlideIcon className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                                    <p className="text-gray-600 dark:text-gray-300 font-semibold">Slides Preview</p>
                                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Full-screen viewer will be available after upload</p>
                                </div>
                            </div>
                        ) : (
                            <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex flex-col items-center justify-center text-center text-gray-500 dark:text-gray-400 rounded">
                                <SlideIcon className="w-12 h-12 mb-2" />
                                <p>Slides preview will appear here</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export const SlideView: React.FC<SlideViewProps> = ({ lessonId, user }) => {
    const [version, setVersion] = useState(0);

    useEffect(() => {
        console.log('[SlideView] LessonId changed:', lessonId);
    }, [lessonId]);

    const { data: groupedContent, isLoading } = useApi(
        () => api.getContentsByLessonId(lessonId, ['slide']),
        [lessonId, version]
    );

    useEffect(() => {
        console.log('[SlideView] Content loaded:', groupedContent);
    }, [groupedContent]);

    const [confirmModalState, setConfirmModalState] = useState<{ isOpen: boolean; onConfirm: (() => void) | null }>({ isOpen: false, onConfirm: null });
    const [fullscreenMode, setFullscreenMode] = useState(false);
    const { showToast } = useToast();

    const slideContent = groupedContent?.[0]?.docs[0];
    const canEdit = user.role === 'admin' || !!user.canEdit;

    const handleDelete = (contentId: string) => {
        const confirmAction = async () => {
            await api.deleteContent(contentId);
            setVersion(v => v + 1);
            showToast('Slides deleted successfully.', 'success');
            setConfirmModalState({ isOpen: false, onConfirm: null });
        };
        setConfirmModalState({ isOpen: true, onConfirm: confirmAction });
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 h-full overflow-hidden flex flex-col">
            <div className="hidden sm:flex justify-between items-center mb-6 shrink-0">
                <div className="flex items-center">
                    <SlideIcon className="w-8 h-8 mr-3 text-blue-500" />
                    <h1 className="text-lg sm:text-2xl font-bold text-gray-800 dark:text-white">Slides</h1>
                </div>
            </div>

            <div className="flex-1 overflow-hidden min-h-0 flex flex-col">
                {isLoading && <div className="text-center py-10">Loading slides...</div>}

                {!isLoading && slideContent && (
                    <SavedSlideViewer
                        content={slideContent}
                        onRemove={() => handleDelete(slideContent._id)}
                        isAdmin={canEdit}
                        onExpand={() => setFullscreenMode(true)}
                    />
                )}

                {!isLoading && !slideContent && (
                    canEdit ? (
                        <UploadForm 
                            lessonId={lessonId} 
                            onUpload={() => setVersion(v => v + 1)} 
                            onExpand={() => setFullscreenMode(true)}
                        />
                    ) : (
                        <div className="text-center py-20 bg-white dark:bg-gray-800/50 rounded-lg">
                            <SlideIcon className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600" />
                            <p className="mt-4 text-gray-500">No slides available.</p>
                        </div>
                    )
                )}
            </div>

            <ConfirmModal
                isOpen={confirmModalState.isOpen}
                onClose={() => setConfirmModalState({ isOpen: false, onConfirm: null })}
                onConfirm={confirmModalState.onConfirm}
                title="Remove Slides"
                message="Are you sure you want to remove these slides? This action cannot be undone."
            />

            {fullscreenMode && slideContent && (
                <FullscreenSlideViewer
                    content={slideContent}
                    onClose={() => setFullscreenMode(false)}
                    isMobile={window.innerWidth < 768}
                    isLandscape={window.innerWidth > window.innerHeight}
                />
            )}
        </div>
    );
};