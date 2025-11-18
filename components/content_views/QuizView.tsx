import React, { useState, useEffect } from 'react';
import { Content, User, QuizQuestion, AnswerOption } from '../../types';
import { useApi } from '../../hooks/useApi';
import * as api from '../../services/api';
import { QuizIcon } from '../icons/ResourceTypeIcons';
import { PlusIcon, ImportIcon } from '../icons/AdminIcons';
import { Fireworks } from './Fireworks';

interface QuizViewProps {
    lessonId: string;
    user: User;
}

const ImportQuizModal: React.FC<{ isOpen: boolean; onClose: () => void; onImport: (json: string) => void; }> = ({ isOpen, onClose, onImport }) => {
    const [jsonText, setJsonText] = useState('');
    const [error, setError] = useState('');
    if (!isOpen) return null;

    const handleImport = () => {
        try {
            // Sanitize and parse
            const sanitizedText = jsonText.replace(/&quot;/g, '"');
            const parsed = JSON.parse(sanitizedText);
            if (!Array.isArray(parsed)) throw new Error("Input must be a JSON array.");
            onImport(JSON.stringify(parsed));
            onClose();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Invalid JSON format.");
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-2xl">
                <h2 className="text-xl font-bold mb-4">Import Quiz</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Paste your quiz questions as a JSON array.</p>
                <textarea
                    value={jsonText}
                    onChange={(e) => { setJsonText(e.target.value); setError(''); }}
                    rows={15}
                    className="w-full p-2 border rounded-md font-mono text-sm bg-gray-50 dark:bg-gray-700 dark:border-gray-600"
                    placeholder={`[{"question": "What is 2+2?", "answerOptions": [...], "hint": "..."}]`}
                />
                {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                <div className="flex justify-end gap-4 mt-4">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md">Cancel</button>
                    <button onClick={handleImport} className="px-4 py-2 bg-blue-600 text-white rounded-md">Import</button>
                </div>
            </div>
        </div>
    );
};


export const QuizView: React.FC<QuizViewProps> = ({ lessonId, user }) => {
    const [version, setVersion] = useState(0);
    const { data: groupedContent, isLoading } = useApi(() => api.getContentsByLessonId(lessonId, ['quiz']), [lessonId, version]);
    
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswerIndex, setSelectedAnswerIndex] = useState<number | null>(null);
    const [showHint, setShowHint] = useState(false);
    const [score, setScore] = useState(0);
    const [isFinished, setIsFinished] = useState(false);
    
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    useEffect(() => {
        const quizContent = groupedContent?.[0]?.docs?.[0];
        if (quizContent?.body) {
            try {
                const parsedQuestions = JSON.parse(quizContent.body.replace(/&quot;/g, '"'));
                setQuestions(parsedQuestions);
            } catch (e) {
                console.error("Failed to parse quiz JSON:", e);
                setQuestions([]);
            }
        } else {
            setQuestions([]);
        }
        // Reset state when quiz data changes
        setCurrentQuestionIndex(0);
        setSelectedAnswerIndex(null);
        setShowHint(false);
        setScore(0);
        setIsFinished(false);
    }, [groupedContent]);

    const handleAnswerSelect = (index: number) => {
        if (selectedAnswerIndex === null) {
            setSelectedAnswerIndex(index);
            if (questions[currentQuestionIndex].answerOptions[index].isCorrect) {
                setScore(s => s + 1);
            }
        }
    };

    const handleNext = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(i => i + 1);
            setSelectedAnswerIndex(null);
            setShowHint(false);
        } else {
            setIsFinished(true);
        }
    };

    const handlePrev = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(i => i - 1);
            setSelectedAnswerIndex(null);
            setShowHint(false);
        }
    };

    const handleRetry = () => {
        setCurrentQuestionIndex(0);
        setSelectedAnswerIndex(null);
        setShowHint(false);
        setScore(0);
        setIsFinished(false);
    };
    
    const handleImport = async (jsonString: string) => {
        const quizContent = groupedContent?.[0]?.docs?.[0];
        if (quizContent) { // Update existing quiz
            await api.updateContent(quizContent._id, { body: jsonString });
        } else { // Create new quiz
            await api.addContent({ lessonId, type: 'quiz', title: 'Chapter Quiz', body: jsonString });
        }
        setVersion(v => v + 1);
    };

    if (isLoading) {
        return <div className="text-center p-8">Loading Quiz...</div>;
    }

    if (questions.length === 0) {
        return (
            <div className="p-8">
                 <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center">
                        <QuizIcon className="w-8 h-8 mr-3 text-blue-500" />
                        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Quiz</h1>
                    </div>
                </div>
                <div className="text-center py-20 bg-white dark:bg-gray-800/50 rounded-lg">
                    <QuizIcon className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600" />
                    <p className="mt-4 text-gray-500">No quiz available for this chapter.</p>
                </div>
                <ImportQuizModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} onImport={handleImport} />
            </div>
        );
    }
    
    const currentQuestion = questions[currentQuestionIndex];
    const isAnswered = selectedAnswerIndex !== null;

    if (isFinished) {
        const finalScorePercentage = (score / questions.length) * 100;
        const passed = finalScorePercentage >= 80;

        return (
            <div className="p-4 sm:p-6 lg:p-8 flex items-center justify-center h-full">
                <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg text-center relative w-full">
                    {passed && <Fireworks />}
                    <h2 className="text-3xl font-bold mb-4 text-gray-800 dark:text-white">Quiz Complete!</h2>
                    <p className="text-xl mb-6 text-gray-600 dark:text-gray-300">
                        You scored <span className="font-bold text-blue-600 dark:text-blue-400">{score}</span> out of <span className="font-bold">{questions.length}</span>
                    </p>
                    {passed && <p className="text-lg text-green-500 mb-6">Excellent work!</p>}
                    <button onClick={handleRetry} className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-full hover:bg-blue-700 transition-transform transform hover:scale-105">
                        Retry Quiz
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center">
                    <QuizIcon className="w-8 h-8 mr-3 text-blue-500" />
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Quiz</h1>
                </div>
            </div>

            <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">Question {currentQuestionIndex + 1} of {questions.length}</div>
                <h2 className="text-xl font-semibold mb-6">{currentQuestion.question}</h2>

                <div className="space-y-4 mb-6">
                    {currentQuestion.answerOptions.map((option, index) => {
                        let buttonClass = 'w-full text-left p-4 rounded-lg border-2 transition-all duration-200 ';
                        if (isAnswered) {
                            if (option.isCorrect) {
                                buttonClass += 'bg-green-100 dark:bg-green-900/50 border-green-500';
                            } else if (selectedAnswerIndex === index) {
                                buttonClass += 'bg-red-100 dark:bg-red-900/50 border-red-500';
                            } else {
                                buttonClass += 'bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600 opacity-70';
                            }
                        } else {
                            buttonClass += 'bg-gray-50 dark:bg-gray-700/50 border-gray-300 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-400';
                        }

                        const isThisOptionSelected = selectedAnswerIndex === index;
                        const wasSelectionCorrect = selectedAnswerIndex !== null && questions[currentQuestionIndex].answerOptions[selectedAnswerIndex].isCorrect;
                        let shouldShowRationale = false;
                        if (isAnswered) {
                            if (wasSelectionCorrect) {
                                if (isThisOptionSelected) shouldShowRationale = true;
                            } else {
                                if (isThisOptionSelected || option.isCorrect) shouldShowRationale = true;
                            }
                        }

                        return (
                            <div key={index}>
                                <button onClick={() => handleAnswerSelect(index)} disabled={isAnswered} className={buttonClass}>
                                    {option.text}
                                </button>
                                {shouldShowRationale && (
                                    <p className={`mt-2 text-sm px-4 ${option.isCorrect ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                                        {option.rationale}
                                    </p>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="mb-6">
                    <button onClick={() => setShowHint(!showHint)} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                        {showHint ? 'Hide Hint' : 'Show Hint'}
                    </button>
                    {showHint && <p className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/40 rounded-lg text-sm text-yellow-800 dark:text-yellow-200">{currentQuestion.hint}</p>}
                </div>
                
                <div className="flex justify-between items-center border-t dark:border-gray-700 pt-4">
                    <button onClick={handlePrev} disabled={currentQuestionIndex === 0} className="px-6 py-2 rounded-md bg-gray-200 dark:bg-gray-600 disabled:opacity-50">Previous</button>
                    <button onClick={handleNext} disabled={!isAnswered} className="px-6 py-2 rounded-md bg-blue-600 text-white disabled:opacity-50">
                        {currentQuestionIndex === questions.length - 1 ? 'Finish' : 'Next'}
                    </button>
                </div>
            </div>
            <ImportQuizModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} onImport={handleImport} />
        </div>
    );
};