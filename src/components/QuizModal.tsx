import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { Question } from '@/types/quiz';
import { parseQuizTxt } from '@/lib/quizParser';
import { BookOpen, CheckCircle, HelpCircle, XCircle, ArrowRight, RotateCcw, Check, AlertCircle } from 'lucide-react';
 
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
  const WORKER_URL = 'https://icse-file-proxy.bybro.workers.dev';
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

          // Transform flat quiz array or raw manifest structure safely
          const structuredCatalog: SubjectQuizData[] = [];
     

  // Inside your useEffect parsing loop:
  data.forEach((item) => {
    if (!item) return;
    const subjectName = item.subject || 'General';
    const chapterFileId = item.fileId || item.url ?? item.file ?? '';
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
        
        // 1. Fetch the secure Google Drive URL from your Worker proxy
        const proxyRes = await fetch(`${WORKER_URL}/file?id=${fileId}`);
        if (!proxyRes.ok) throw new Error(`Could not authorize file ID: ${fileId}`);
        const proxyData = await proxyRes.json();
        
        // 2. Fetch the actual text contents from the Google Drive URL
        const res = await fetch(proxyData.url);
        if (!res.ok) throw new Error(`Could not fetch quiz content for ID: ${fileId}`);
        const text = await res.text();
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
      setErrorMsg('Failed to load the selected quiz text file. Please check file formatting or permissions.');
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
      <DialogContent className="!max-w-[85vw] md:!max-w-3xl w-[90vw] max-h-[85vh] flex flex-col p-6 bg-white rounded-2xl shadow-2xl border-none">
        <DialogHeader className="border-b pb-3">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-800">
            <HelpCircle className="w-6 h-6 text-indigo-600" />
            <span>ICSE Interactive Quiz Engine</span>
            <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
              Experimental
            </span>
          </DialogTitle>
        </DialogHeader>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2 mt-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {!isAttempting ? (
          <div className="flex-1 flex flex-col min-h-0 space-y-4 pt-2">
            {quizCatalog.length > 0 ? (
              <>
                <div className="flex gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
                  {quizCatalog.map((item) => (
                    <button
                      key={item.subject}
                      onClick={() => { setSelectedSubject(item.subject); setSelectedFiles([]); }}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                        selectedSubject === item.subject
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {item.subject}
                    </button>
                  ))}
                </div>

                <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3 p-1">
                  {currentSubjectData?.chapters.map((chapter) => {
                    const isSelected = selectedFiles.includes(chapter.file);
                    return (
                      <div
                        key={chapter.file}
                        onClick={() => toggleSelectFile(chapter.file)}
                        className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/50 shadow-sm'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <BookOpen className={`w-5 h-5 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`} />
                          <span className="font-medium text-slate-700 text-sm">{chapter.name}</span>
                        </div>
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center border ${
                            isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-sm text-slate-400">
                No quizzes available in public/quizzes.json.
              </div>
            )}

            <div className="pt-2 flex justify-center border-t border-slate-100">
              <button
                disabled={selectedFiles.length === 0 || isLoading}
                onClick={handleStartQuiz}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-semibold text-sm rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>{isLoading ? 'Loading Quiz...' : `Attempt Quiz (${selectedFiles.length} Selected)`}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : !isFinished ? (
          <div className="flex-1 flex flex-col justify-between py-2 space-y-4 overflow-y-auto">
            <div>
              <div className="flex justify-between items-center text-xs font-semibold text-slate-400 mb-2">
                <span>QUESTION {currentIdx + 1} OF {activeQuestions.length}</span>
                <span>{selectedSubject}</span>
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-4">
                {activeQuestions[currentIdx]?.question}
              </h3>

              <div className="space-y-2.5">
                {activeQuestions[currentIdx]?.options?.map((opt, optIdx) => {
                  const isSelected = userAnswers[currentIdx] === optIdx;
                  const isCorrect = activeQuestions[currentIdx].correctAnswer === optIdx;

                  let btnStyle = 'border-slate-200 hover:bg-slate-50 text-slate-700';
                  if (isSelected && !isCurrentSubmitted) {
                    btnStyle = 'border-indigo-600 bg-indigo-50/40 text-indigo-900 font-medium';
                  }
                  if (isCurrentSubmitted) {
                    if (isCorrect) btnStyle = 'border-emerald-500 bg-emerald-50 text-emerald-800 font-medium';
                    else if (isSelected) btnStyle = 'border-rose-500 bg-rose-50 text-rose-800 font-medium';
                  }

                  return (
                    <button
                      key={optIdx}
                      onClick={() => handleSelectOption(optIdx)}
                      disabled={isCurrentSubmitted}
                      className={`w-full text-left p-3 rounded-xl border text-sm transition-all flex items-center justify-between cursor-pointer ${btnStyle}`}
                    >
                      <span>{String.fromCharCode(65 + optIdx)}. {opt}</span>
                      {isCurrentSubmitted && isCorrect && <CheckCircle className="w-5 h-5 text-emerald-600" />}
                      {isCurrentSubmitted && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-rose-600" />}
                    </button>
                  );
                })}
              </div>

              {!isCurrentSubmitted && (
                <div className="mt-4 flex justify-end">
                  <button
                    disabled={!hasSelectedOption}
                    onClick={handleSubmitCurrentAnswer}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 text-white font-medium rounded-lg text-xs transition-all shadow-sm cursor-pointer"
                  >
                    Submit Answer
                  </button>
                </div>
              )}

              {isCurrentSubmitted && activeQuestions[currentIdx]?.explanation && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                  <span className="font-bold">Explanation: </span>
                  {activeQuestions[currentIdx].explanation}
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-2 border-t mt-4">
              <button
                disabled={currentIdx === 0}
                onClick={() => setCurrentIdx(currentIdx - 1)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-40"
              >
                Previous
              </button>
              {currentIdx < activeQuestions.length - 1 ? (
                <button
                  disabled={!isCurrentSubmitted}
                  onClick={() => setCurrentIdx(currentIdx + 1)}
                  className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:bg-slate-300"
                >
                  Next
                </button>
              ) : (
                <button
                  disabled={!isCurrentSubmitted}
                  onClick={() => setIsFinished(true)}
                  className="px-5 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:bg-slate-300"
                >
                  Finish & See Score
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-8 space-y-4">
            <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800">Quiz Completed!</h3>
            <p className="text-lg text-slate-600">
              You scored <span className="font-bold text-indigo-600">{calculateScore()}</span> out of{' '}
              <span className="font-bold">{activeQuestions.length}</span>
            </p>
            <button
              onClick={resetState}
              className="px-6 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 flex items-center gap-2"
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
