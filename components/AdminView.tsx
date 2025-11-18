import React, { useState, useCallback, useEffect, useRef } from 'react';
import { CascadeSelectors } from './CascadeSelectors';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { AdminSidebar } from './AdminSidebar';
import { ManagementPage } from './ManagementPage';
import { ClassManagement } from './ClassManagement';
import { UserManagement } from './UserManagement';
import { ReportsPage } from './ReportsPage';
import { QuizAdminView } from './content_views/QuizAdminView';
import { FlashcardAdminView } from './content_views/FlashcardAdminView';
import { QAAdminView } from './content_views/QAAdminView';
import { ResourceType } from '../types';
import { ContentDisplay } from './ContentDisplay';
import { useSession } from '../context/SessionContext';
import { AdminState } from '../types';

export const AdminView: React.FC = () => {
    const { session, logout, updateAdminState } = useSession();
    const { user, adminState: state } = session;
    
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [adminSidebarOpen, setAdminSidebarOpen] = useState(true);
    const mainContentRef = useRef<HTMLElement>(null);
    
    // Restore scroll position when the view changes
    useEffect(() => {
        const timer = setTimeout(() => {
            if (mainContentRef.current) {
                mainContentRef.current.scrollTop = state.scrollPosition;
            }
        }, 0); // Use a timeout to ensure the DOM is updated
        return () => clearTimeout(timer);
    // The dependency array includes all state variables that define a "view"
    }, [state.classId, state.subjectId, state.unitId, state.subUnitId, state.lessonId, state.selectedResourceType, state.activePage]);

    const handleScroll = useCallback(() => {
        if (mainContentRef.current) {
            updateAdminState({ scrollPosition: mainContentRef.current.scrollTop });
        }
    }, [updateAdminState]);

    const updateStateAndResetScroll = useCallback((updates: Partial<AdminState>) => {
        updateAdminState({ ...updates, scrollPosition: 0 });
        if (mainContentRef.current) {
            mainContentRef.current.scrollTop = 0;
        }
    }, [updateAdminState]);

    const handleClassChange = useCallback((id: string | null) => {
        updateStateAndResetScroll({ classId: id, subjectId: null, unitId: null, subUnitId: null, lessonId: null, selectedResourceType: null });
    }, [updateStateAndResetScroll]);
    
    const handleSubjectChange = useCallback((id: string | null) => {
        updateStateAndResetScroll({ subjectId: id, unitId: null, subUnitId: null, lessonId: null, selectedResourceType: null });
    }, [updateStateAndResetScroll]);

    const handleUnitChange = useCallback((id: string | null) => {
        updateStateAndResetScroll({ unitId: id, subUnitId: null, lessonId: null, selectedResourceType: null });
    }, [updateStateAndResetScroll]);

    const handleSubUnitChange = useCallback((id: string | null) => {
        updateStateAndResetScroll({ subUnitId: id, lessonId: null, selectedResourceType: null });
    }, [updateStateAndResetScroll]);
    
    const handleLessonChange = useCallback((id: string | null) => {
        updateStateAndResetScroll({ lessonId: id, selectedResourceType: id ? 'book' : null });
    }, [updateStateAndResetScroll]);

    const handleSelectResourceType = useCallback((resourceType: ResourceType) => {
        updateStateAndResetScroll({ selectedResourceType: resourceType });
    }, [updateStateAndResetScroll]);

    const handleSetActivePage = useCallback((page: string) => {
        updateStateAndResetScroll({ activePage: page });
    }, [updateStateAndResetScroll]);

    if (!user) {
        return null; // Should be handled by App router, but as a safeguard.
    }

    const renderContent = () => {
        switch (state.activePage) {
            case 'browser':
                return (
                    <>
                        <CascadeSelectors
                            classId={state.classId}
                            subjectId={state.subjectId}
                            unitId={state.unitId}
                            subUnitId={state.subUnitId}
                            lessonId={state.lessonId}
                            onClassChange={handleClassChange}
                            onSubjectChange={handleSubjectChange}
                            onUnitChange={handleUnitChange}
                            onSubUnitChange={handleSubUnitChange}
                            onLessonChange={handleLessonChange}
                        />
                        <div className="flex-1">
                            <ContentDisplay
                                lessonId={state.lessonId}
                                selectedResourceType={state.selectedResourceType}
                                user={user}
                            />
                        </div>
                    </>
                );
            case 'course-structure':
                return <ClassManagement />;
            case 'user-management':
                return <UserManagement />;
            case 'quiz-management':
                return (
                    <>
                        <CascadeSelectors
                            classId={state.classId}
                            subjectId={state.subjectId}
                            unitId={state.unitId}
                            subUnitId={state.subUnitId}
                            lessonId={state.lessonId}
                            onClassChange={handleClassChange}
                            onSubjectChange={handleSubjectChange}
                            onUnitChange={handleUnitChange}
                            onSubUnitChange={handleSubUnitChange}
                            onLessonChange={handleLessonChange}
                        />
                        <div className="flex-1">
                            {state.lessonId ? (
                                <QuizAdminView lessonId={state.lessonId} />
                            ) : (
                                <div className="p-8 text-center text-gray-500">
                                    Please select a lesson to manage its quiz
                                </div>
                            )}
                        </div>
                    </>
                );
            case 'flashcard-management':
                return (
                    <>
                        <CascadeSelectors
                            classId={state.classId}
                            subjectId={state.subjectId}
                            unitId={state.unitId}
                            subUnitId={state.subUnitId}
                            lessonId={state.lessonId}
                            onClassChange={handleClassChange}
                            onSubjectChange={handleSubjectChange}
                            onUnitChange={handleUnitChange}
                            onSubUnitChange={handleSubUnitChange}
                            onLessonChange={handleLessonChange}
                        />
                        <div className="flex-1">
                            {state.lessonId ? (
                                <FlashcardAdminView lessonId={state.lessonId} />
                            ) : (
                                <div className="p-8 text-center text-gray-500">
                                    Please select a lesson to manage its flashcards
                                </div>
                            )}
                        </div>
                    </>
                );
            case 'qa-management':
                return (
                    <>
                        <CascadeSelectors
                            classId={state.classId}
                            subjectId={state.subjectId}
                            unitId={state.unitId}
                            subUnitId={state.subUnitId}
                            lessonId={state.lessonId}
                            onClassChange={handleClassChange}
                            onSubjectChange={handleSubjectChange}
                            onUnitChange={handleUnitChange}
                            onSubUnitChange={handleSubUnitChange}
                            onLessonChange={handleLessonChange}
                        />
                        <div className="flex-1">
                            {state.lessonId ? (
                                <QAAdminView lessonId={state.lessonId} />
                            ) : (
                                <div className="p-8 text-center text-gray-500">
                                    Please select a lesson to manage its Q&A
                                </div>
                            )}
                        </div>
                    </>
                );
            case 'reports':
                return <ReportsPage />;
            default:
                return <ManagementPage title={state.activePage} />;
        }
    };

    return (
        <>
            <Header 
                user={user} 
                onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} 
                onToggleAdminSidebar={() => setAdminSidebarOpen(!adminSidebarOpen)}
                onLogout={logout}
            />
            <div className="flex flex-1 overflow-hidden">
                {state.activePage === 'browser' && (
                    <Sidebar 
                        lessonId={state.lessonId}
                        selectedResourceType={state.selectedResourceType}
                        onSelectResourceType={handleSelectResourceType}
                        isOpen={sidebarOpen}
                    />
                )}
                <main 
                    ref={mainContentRef}
                    onScroll={handleScroll}
                    className="flex-1 flex flex-col bg-gray-100 dark:bg-gray-800 overflow-y-auto transition-all duration-300 border-l border-gray-200 dark:border-gray-700">
                    {renderContent()}
                </main>
                <AdminSidebar 
                    isOpen={adminSidebarOpen}
                    activePage={state.activePage}
                    setActivePage={handleSetActivePage}
                />
            </div>
        </>
    );
};
