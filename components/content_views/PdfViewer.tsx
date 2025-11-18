import React, { useState, useEffect, useRef, useCallback } from 'react';

// Icons for controls
const ZoomInIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
);
const ZoomOutIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
);
const ChevronLeftIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><polyline points="15 18 9 12 15 6"></polyline></svg>
);
const ChevronRightIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><polyline points="9 18 15 12 9 6"></polyline></svg>
);


declare const pdfjsLib: any;

interface PdfViewerProps {
    url: string; // The data: or http: URL of the PDF
}

export const PdfViewer: React.FC<PdfViewerProps> = ({ url }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const renderTaskRef = useRef<any>(null);
    const [pdfDoc, setPdfDoc] = useState<any>(null);
    const [pageNum, setPageNum] = useState(1);
    const [numPages, setNumPages] = useState(0);
    const [scale, setScale] = useState(1.5);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const cancelRender = useCallback(() => {
        if (renderTaskRef.current) {
            try {
                renderTaskRef.current.cancel();
            } catch (e) {
                // Ignore cancellation errors
            }
            renderTaskRef.current = null;
        }
    }, []);

    const clearCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            const context = canvas.getContext('2d');
            if (context) {
                // Clear the canvas
                context.clearRect(0, 0, canvas.width, canvas.height);
                // Reset canvas dimensions
                canvas.width = 0;
                canvas.height = 0;
            }
        }
    }, []);

    const renderPage = useCallback(async (num: number) => {
        if (!pdfDoc) return;
        
        // Cancel any ongoing render
        cancelRender();
        
        try {
            const page = await pdfDoc.getPage(num);
            const viewport = page.getViewport({ scale });
            const canvas = canvasRef.current;
            
            if (canvas) {
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                
                if (context) {
                    // Clear canvas before rendering
                    context.clearRect(0, 0, canvas.width, canvas.height);
                    
                    const renderContext = {
                        canvasContext: context,
                        viewport: viewport,
                        intent: 'display'
                    };
                    
                    // Store the render task so we can cancel it if needed
                    renderTaskRef.current = page.render(renderContext);
                    await renderTaskRef.current.promise;
                }
            }
        } catch (e) {
            // Only set error if it's not a cancellation error
            if (e.name !== 'RenderingCancelledException') {
                setError('Failed to render PDF page.');
                console.error('PDF render error:', e);
            }
        } finally {
            renderTaskRef.current = null;
        }
    }, [pdfDoc, scale, cancelRender]);

    useEffect(() => {
        if (!url) return;

        if (typeof pdfjsLib === 'undefined') {
            setError("PDF.js library is not loaded.");
            setIsLoading(false);
            return;
        }

        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js`;

        const loadingTask = pdfjsLib.getDocument(url);
        setIsLoading(true);
        setError(null);

        loadingTask.promise.then((doc: any) => {
            setPdfDoc(doc);
            setNumPages(doc.numPages);
            setPageNum(1);
            setIsLoading(false);
        }).catch((err: any) => {
            setError('Failed to load PDF.');
            console.error('Error loading PDF:', err);
            setIsLoading(false);
        });
        
        // Cleanup function
        return () => {
            cancelRender();
            clearCanvas();
            setPdfDoc(null);
        };
    }, [url, cancelRender, clearCanvas]);

    useEffect(() => {
        if (pdfDoc && !isLoading) {
            renderPage(pageNum);
        }
        
        return () => {
            // Cancel render when component unmounts or dependencies change
            cancelRender();
        };
    }, [pdfDoc, pageNum, renderPage, isLoading, cancelRender]);

    const onPrevPage = () => {
        if (pageNum <= 1) return;
        setPageNum(pageNum - 1);
    };

    const onNextPage = () => {
        if (pageNum >= numPages) return;
        setPageNum(pageNum + 1);
    };

    const onZoomIn = () => {
        setScale(prevScale => Math.min(3.0, prevScale + 0.2));
    };

    const onZoomOut = () => {
        setScale(prevScale => Math.max(0.4, prevScale - 0.2));
    };

    return (
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded border dark:border-gray-600 flex flex-col items-center">
            <div className="w-full flex items-center justify-center p-2 bg-gray-100 dark:bg-gray-800/50 sticky top-0 z-10 shadow-sm rounded-t">
                <button onClick={onPrevPage} disabled={pageNum <= 1 || !pdfDoc} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50" aria-label="Previous Page" title="Previous Page"><ChevronLeftIcon className="w-5 h-5" /></button>
                <span className="mx-4 text-sm font-medium">Page {pageNum} of {numPages || '...'}</span>
                <button onClick={onNextPage} disabled={pageNum >= numPages || !pdfDoc} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50" aria-label="Next Page" title="Next Page"><ChevronRightIcon className="w-5 h-5" /></button>
                <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-4"></div>
                <button onClick={onZoomOut} disabled={!pdfDoc} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50" aria-label="Zoom Out" title="Zoom Out"><ZoomOutIcon className="w-5 h-5" /></button>
                <span className="mx-2 text-sm font-medium">{(scale * 100).toFixed(0)}%</span>
                <button onClick={onZoomIn} disabled={!pdfDoc} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50" aria-label="Zoom In" title="Zoom In"><ZoomInIcon className="w-5 h-5" /></button>
            </div>

            <div className="p-4 overflow-auto w-full">
                {isLoading && <div className="text-center p-10">Loading PDF...</div>}
                {error && <div className="text-center p-10 text-red-500">{error}</div>}
                <canvas ref={canvasRef} className="mx-auto shadow-lg" />
            </div>
        </div>
    );
};
