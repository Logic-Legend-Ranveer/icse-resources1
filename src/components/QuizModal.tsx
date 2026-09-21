import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { Question } from '@/types/quiz';
import { parseQuizTxt } from '@/lib/quizParser';
import { BookOpen, CheckCircle, HelpCircle, XCircle, ArrowRight, RotateCcw, Check, AlertCircle } from 'lucide-react';

const WORKER_URL = 'https://icse-file-proxy2.bybro.workers.dev';

interface QuizModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface QuizChapter {
  name: string;
  file: string;
}

interface SubjectQuizData {
  subject: string;
  chapters: QuizChapter[];
}

export const QuizModal: React.FC<QuizModalProps> = ({ isOpen, onClose }) => {
  const [quizCatalog, setQuizCatalog] = useState<SubjectQuizData[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [activeQuestions, setActiveQuestions] = useState<Question[]>([]);
  const [isAttempting, setIsAttempting] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [submittedQuestions, setSubmittedQuestions] = useState<Record<number, boolean>>({});
  const [isFinished, setIsFinished] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetch(`${import.meta.env.BASE_URL}quizzes.json`)
        .then((res) => {
          if (!res.ok) throw new Error('Failed to load quiz catalog manifest.');
          return res.json();
        })
        .then((data: any[]) => {
          if (!Array.isArray(data)) {
            setQuizCatalog([]);
            return;
          }

          const structuredCatalog: SubjectQuizData[] = [];

          data.forEach((item) => {
            if (!item) return;
            const subjectName = item.subject || 'General';
            const chapterFileId = (item.fileId || item.url) ?? item.file ?? '';
            const chapterName = item.title ?? item.name ?? 'Untitled Chapter';

            if (!chapterFileId) return;

            let subjectObj = structuredCatalog.find((s) => s.subject === subjectName);
            if (!subjectObj) {
              subjectObj = { subject: subjectName, chapters: [] };
              structuredCatalog.push(subjectObj);
            }

            subjectObj.chapters.push({ name: chapterName, file: chapterFileId });
          });

          setQuizCatalog(structuredCatalog);
          if (structuredCatalog.length > 0) {
            setSelectedSubject(structuredCatalog[0].subject);
          }
        })
        .catch((err) => {
          console.error('Error loading quizzes.json:', err);
          setErrorMsg('Could not load quiz index. Please ensure public/quizzes.json exists.');
        });
    }
  }, [isOpen]);

  const toggleSelectFile = (filePath: string) => {
    if (!filePath) return;
    setSelectedFiles((prev) =>
      prev.includes(filePath) ? prev.filter((f) => f !== filePath) : [...prev, filePath]
    );
  };

  const handleStartQuiz = async () => {
    if (selectedFiles.length === 0) return;

    setIsLoading(true);
    setErrorMsg(null);
    let combinedQuestions: Question[] = [];

    try {
      for (const fileId of selectedFiles) {
        if (!fileId) continue;
        
        const res = await fetch(`${WORKER_URL}/file?id=${fileId}`);
        if (!res.ok) throw new Error(`Could not download file content for ID: ${fileId}`);
        
        const text = await res.text();
        
        if (text.trim().startsWith('<!DOCTYPE html>') || text.trim().startsWith('<html')) {
          throw new Error('Worker returned an HTML page instead of raw text. Check worker deployment.');
        }

        const parsed = parseQuizTxt(text);
        if (Array.isArray(parsed)) {
          combinedQuestions = [...combinedQuestions, ...parsed];
        }
      }

      if (combinedQuestions.length === 0) {
        setErrorMsg('The selected quiz file contains no valid questions or is formatted incorrectly.');
        setIsLoading(false);
        return;
      }

      setActiveQuestions(combinedQuestions);
      setIsAttempting(true);
      setCurrentIdx(0);
      setUserAnswers({});
      setSubmittedQuestions({});
      setIsFinished(false);
    } catch (err: any) {
      console.error('Failed to parse quiz files:', err);
      setErrorMsg(err.message || 'Failed to load the selected quiz text file.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectOption = (optIdx: number) => {
    if (submittedQuestions[currentIdx]) return;
    setUserAnswers((prev) => ({ ...prev, [currentIdx]: optIdx }));
  };

  const handleSubmitCurrentAnswer = () => {
    if (userAnswers[currentIdx] === undefined) return;
    setSubmittedQuestions((prev) => ({ ...prev, [currentIdx]: true }));
  };

  const calculateScore = () => {
    let score = 0;
    activeQuestions.forEach((q, idx) => {
      if (userAnswers[idx] === q.correctAnswer) score++;
    });
    return score;
  };

  const resetState = () => {
    setIsAttempting(false);
    setIsFinished(false);
    setSelectedFiles([]);
    setErrorMsg(null);
    setUserAnswers({});
    setSubmittedQuestions({});
  };

  const currentSubjectData = quizCatalog.find((item) => item.subject === selectedSubject);
  const isCurrentSubmitted = submittedQuestions[currentIdx] || false;
  const hasSelectedOption = userAnswers[currentIdx] !== undefined;

  return (
    <Dialog open={isOpen} onOpenChange={() => { onClose(); resetState(); }}>
      <DialogContent className="w-[calc(100vw-8px)] sm:w-[90vw] md:!max-w-3xl max-h-[92vh] sm:max-h-[85vh] flex flex-col p-3 sm:p-6 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 my-auto mb-1 sm:mb-auto overflow-hidden">
        
        {/* Modal Header */}
        <DialogHeader className="border-b border-slate-200 dark:border-slate-800 pb-2.5 sm:pb-3 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-xl font-bold text-slate-800 dark:text-slate-100">
            <HelpCircle className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>ICSE Interactive Quiz Engine</span>
            <span className="text-[9px] sm:text-[10px] bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
              Experimental
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* Error Banner */}
        {errorMsg && (
          <div className="p-2.5 sm:p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 rounded-xl text-xs flex items-center gap-2 mt-1 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {!isAttempting ? (
          <div className="flex-1 flex flex-col min-h-0 gap-2.5 sm:gap-4 pt-1 sm:pt-2 overflow-hidden">
            {quizCatalog.length > 0 ? (
              <>
                {/* Fixed Subject Tabs Header */}
                <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-none shrink-0 border-b border-slate-100 dark:border-slate-800/60 pb-2.5">
                  {quizCatalog.map((item) => (
                    <button
                      key={item.subject}
                      onClick={() => { setSelectedSubject(item.subject); setSelectedFiles([]); }}
                      className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                        selectedSubject === item.subject
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                      }`}
                    >
                      {item.subject}
                    </button>
                  ))}
                </div>

                {/* Restricted Scrollable Chapter Grid */}
                <div className="flex-1 overflow-y-auto min-h-0 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 p-0.5 pr-1">
                  {currentSubjectData?.chapters.map((chapter) => {
                    const isSelected = selectedFiles.includes(chapter.file);
                    return (
                      <div
                        key={chapter.file}
                        onClick={() => toggleSelectFile(chapter.file)}
                        className={`p-3 sm:p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/50 dark:border-indigo-500 dark:bg-indigo-950/40 shadow-sm'
                            : 'border-slate-200 hover:border-slate-300 bg-white dark:border-slate-800 dark:hover:border-slate-700 dark:bg-slate-900/50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 pr-2">
                          <BookOpen className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`} />
                          <span className="font-medium text-slate-700 dark:text-slate-200 text-xs sm:text-sm truncate">{chapter.name}</span>
                        </div>
                        <div
                          className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center border shrink-0 ${
                            isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-800'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-sm text-slate-400 dark:text-slate-500">
                No quizzes available in public/quizzes.json.
              </div>
            )}

            {/* Fixed Bottom Footer Action */}
            <div className="pt-2 flex justify-center border-t border-slate-100 dark:border-slate-800 shrink-0">
              <button
                disabled={selectedFiles.length === 0 || isLoading}
                onClick={handleStartQuiz}
                className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 dark:disabled:text-slate-500 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{isLoading ? 'Loading Quiz...' : `Attempt Quiz (${selectedFiles.length} Selected)`}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : !isFinished ? (
          <div className="flex-1 flex flex-col justify-between py-2 space-y-4 overflow-y-auto">
            <div>
              <div className="flex justify-between items-center text-xs font-semibold text-slate-400 dark:text-slate-500 mb-2">
                <span>QUESTION {currentIdx + 1} OF {activeQuestions.length}</span>
                <span>{selectedSubject}</span>
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-slate-800 dark:text-slate-100 mb-3 sm:mb-4">
                {activeQuestions[currentIdx]?.question}
              </h3>

              <div className="space-y-2">
                {activeQuestions[currentIdx]?.options?.map((opt, optIdx) => {
                  const isSelected = userAnswers[currentIdx] === optIdx;
                  const isCorrect = activeQuestions[currentIdx].correctAnswer === optIdx;

                  let btnStyle = 'border-slate-200 hover:bg-slate-50 text-slate-700 dark:border-slate-800 dark:hover:bg-slate-800/60 dark:text-slate-200';
                  if (isSelected && !isCurrentSubmitted) {
                    btnStyle = 'border-indigo-600 bg-indigo-50/40 text-indigo-900 dark:border-indigo-500 dark:bg-indigo-950/50 dark:text-indigo-200 font-medium';
                  }
                  if (isCurrentSubmitted) {
                    if (isCorrect) btnStyle = 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:border-emerald-600/80 dark:bg-emerald-950/40 dark:text-emerald-300 font-medium';
                    else if (isSelected) btnStyle = 'border-rose-500 bg-rose-50 text-rose-800 dark:border-rose-600/80 dark:bg-rose-950/40 dark:text-rose-300 font-medium';
                  }

                  return (
                    <button
                      key={optIdx}
                      onClick={() => handleSelectOption(optIdx)}
                      disabled={isCurrentSubmitted}
                      className={`w-full text-left p-2.5 sm:p-3 rounded-xl border text-xs sm:text-sm transition-all flex items-center justify-between cursor-pointer ${btnStyle}`}
                    >
                      <span>{String.fromCharCode(65 + optIdx)}. {opt}</span>
                      {isCurrentSubmitted && isCorrect && <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />}
                      {isCurrentSubmitted && isSelected && !isCorrect && <XCircle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 text-rose-600 dark:text-rose-400" />}
                    </button>
                  );
                })}
              </div>

              {!isCurrentSubmitted && (
                <div className="mt-3 sm:mt-4 flex justify-end">
                  <button
                    disabled={!hasSelectedOption}
                    onClick={handleSubmitCurrentAnswer}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900 text-white disabled:bg-slate-200 dark:disabled:bg-slate-800 dark:disabled:text-slate-600 font-medium rounded-lg text-xs transition-all shadow-sm cursor-pointer"
                  >
                    Submit Answer
                  </button>
                </div>
              )}

              {isCurrentSubmitted && activeQuestions[currentIdx]?.explanation && (
                <div className="mt-3 sm:mt-4 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl text-xs text-amber-800 dark:text-amber-300">
                  <span className="font-bold">Explanation: </span>
                  {activeQuestions[currentIdx].explanation}
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800 mt-2 sm:mt-4">
              <button
                disabled={currentIdx === 0}
                onClick={() => setCurrentIdx(currentIdx - 1)}
                className="px-3 sm:px-4 py-2 text-xs sm:text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 rounded-lg disabled:opacity-40"
              >
                Previous
              </button>
              {currentIdx < activeQuestions.length - 1 ? (
                <button
                  disabled={!isCurrentSubmitted}
                  onClick={() => setCurrentIdx(currentIdx + 1)}
                  className="px-4 sm:px-5 py-2 bg-indigo-600 text-white rounded-lg text-xs sm:text-sm font-semibold hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 dark:disabled:text-slate-500"
                >
                  Next
                </button>
              ) : (
                <button
                  disabled={!isCurrentSubmitted}
                  onClick={() => setIsFinished(true)}
                  className="px-4 sm:px-5 py-2 bg-emerald-600 text-white rounded-lg text-xs sm:text-sm font-semibold hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 dark:disabled:text-slate-500"
                >
                  Finish & See Score
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-6 sm:py-8 space-y-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center">
              <CheckCircle className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100">Quiz Completed!</h3>
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300">
              You scored <span className="font-bold text-indigo-600 dark:text-indigo-400">{calculateScore()}</span> out of{' '}
              <span className="font-bold">{activeQuestions.length}</span>
            </p>
            <button
              onClick={resetState}
              className="px-5 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 flex items-center gap-2 text-xs sm:text-sm"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Back to Selection</span>
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};