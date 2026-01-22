import React, { useState, useEffect, useCallback } from 'react';
import { User, CheckCircle, XCircle, ChevronDown, LogOut, Printer, Maximize2, Minimize2 } from 'lucide-react';

// --- CONFIGURATION ---
const EXAM_TIME_MINUTES = 180;
const TOTAL_QUESTIONS = 75;

const SECTIONS = [
  { id: 'math_a', label: 'Mathematics Section A', start: 1, end: 20, type: 'mcq', subject: 'Mathematics' },
  { id: 'math_b', label: 'Mathematics Section B', start: 21, end: 25, type: 'numeric', subject: 'Mathematics' },
  { id: 'phys_a', label: 'Physics Section A', start: 26, end: 45, type: 'mcq', subject: 'Physics' },
  { id: 'phys_b', label: 'Physics Section B', start: 46, end: 50, type: 'numeric', subject: 'Physics' },
  { id: 'chem_a', label: 'Chemistry Section A', start: 51, end: 70, type: 'mcq', subject: 'Chemistry' },
  { id: 'chem_b', label: 'Chemistry Section B', start: 71, end: 75, type: 'numeric', subject: 'Chemistry' },
];

const STATUS = {
  NOT_VISITED: 'not-visited',
  NOT_ANSWERED: 'not-answered',
  ANSWERED: 'answered',
  MARKED: 'marked',
  ANSWERED_MARKED: 'answered-marked',
};

const ExamPlatform = () => {
  const [view, setView] = useState('landing'); // landing, instructions, exam, post_submit_stats, evaluation, result
  const [examName, setExamName] = useState('JEE (Main) - 2026');
  const [candidateName, setCandidateName] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(EXAM_TIME_MINUTES * 60);
  const [timeTakenSeconds, setTimeTakenSeconds] = useState(0);
  const [activeTab, setActiveTab] = useState('math_a');
  const [evaluationResults, setEvaluationResults] = useState<Record<number, boolean>>({});
  const [showSubmitMenu, setShowSubmitMenu] = useState(false);
  const [declarationChecked, setDeclarationChecked] = useState(false);
  const [pdfHeight, setPdfHeight] = useState(400);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // --- HANDLERS (Defined early to avoid reference errors) ---
  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const toggleFullScreen = useCallback(() => {
    if (!document.fullscreenElement) {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        elem.requestFullscreen().catch(() => {});
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
    setShowSubmitMenu(false);
  }, []);

  const handleSubmitExam = useCallback(() => {
    setTimeTakenSeconds((EXAM_TIME_MINUTES * 60) - timeLeft);
    setShowSubmitMenu(false);
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    setView('post_submit_stats');
  }, [timeLeft]);

  // --- FULLSCREEN LISTENER ---
  useEffect(() => {
    const handleFsChange = () => setIsFullScreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // --- INITIALIZATION ---
  useEffect(() => {
    const qs = Array.from({ length: TOTAL_QUESTIONS }, (_, i) => {
      const num = i + 1;
      const section = SECTIONS.find(s => num >= s.start && num <= s.end);
      return {
        id: num,
        section: section?.id,
        subject: section?.subject,
        type: section?.type,
        status: STATUS.NOT_VISITED,
        selectedOption: null,
        numericValue: "",
      };
    });
    setQuestions(qs);
  }, []);

  // --- TIMER ---
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (view === 'exam' && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            handleSubmitExam();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [view, timeLeft, handleSubmitExam]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatTimeTaken = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
      setPdfUrl(URL.createObjectURL(file));
    }
  };

  const handleQuestionAction = (action: string) => {
    const updatedQs = [...questions];
    const q = updatedQs[currentIndex];
    const hasValue = q.type === 'mcq' ? q.selectedOption !== null : q.numericValue !== "";

    switch (action) {
      case 'SAVE_NEXT':
        q.status = hasValue ? STATUS.ANSWERED : STATUS.NOT_ANSWERED;
        moveToNext();
        break;
      case 'MARK_REVIEW':
        q.status = hasValue ? STATUS.ANSWERED_MARKED : STATUS.MARKED;
        moveToNext();
        break;
      case 'CLEAR':
        q.selectedOption = null;
        q.numericValue = "";
        q.status = STATUS.NOT_ANSWERED;
        break;
      default:
        break;
    }
    setQuestions(updatedQs);
  };

  const moveToNext = () => {
    if (currentIndex < TOTAL_QUESTIONS - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      const qNum = nextIndex + 1;
      const section = SECTIONS.find(s => qNum >= s.start && qNum <= s.end);
      if (section) setActiveTab(section.id);
    }
  };

  const getStatusShape = (status: string, isSelected = false) => {
    const base = "w-9 h-8 flex items-center justify-center text-[12px] font-bold border transition-all cursor-pointer ";
    const ring = isSelected ? "ring-2 ring-orange-400 ring-offset-1 z-10 " : "";
    switch (status) {
      case STATUS.NOT_VISITED: return base + ring + "bg-white border-gray-300 text-black";
      case STATUS.NOT_ANSWERED: return base + ring + "bg-[#e15147] border-[#e15147] text-white rounded-b-xl";
      case STATUS.ANSWERED: return base + ring + "bg-[#2ba55d] border-[#2ba55d] text-white rounded-t-xl";
      case STATUS.MARKED: return base + ring + "bg-[#5c68b6] border-[#5c68b6] text-white rounded-full";
      case STATUS.ANSWERED_MARKED: return base + ring + "bg-[#5c68b6] border-[#5c68b6] text-white rounded-full relative after:content-[''] after:absolute after:bottom-0 after:right-0 after:w-3.5 after:h-3.5 after:bg-[#2ba55d] after:rounded-full after:border after:border-white";
      default: return base + ring;
    }
  };

  const getCount = (status: string) => questions.filter(q => q.status === status).length;

  // --- SUB-VIEWS ---

  if (view === 'landing') {
    return (
      <div className="min-h-screen bg-[#f3f7f8] flex flex-col items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-white shadow-2xl rounded-lg overflow-hidden border">
          <div className="bg-[#337ab7] p-6 text-white text-center">
            <h1 className="text-xl font-bold uppercase tracking-widest">Candidate Login</h1>
          </div>
          <div className="p-8 space-y-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Exam Name</label>
              <input type="text" value={examName} onChange={(e) => setExamName(e.target.value)} className="w-full p-3 border rounded-lg bg-gray-50 outline-none focus:ring-2 focus:ring-[#337ab7]" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Candidate Name</label>
              <input type="text" placeholder="Enter name" value={candidateName} onChange={(e) => setCandidateName(e.target.value)} className="w-full p-3 border rounded-lg bg-gray-50 outline-none focus:ring-2 focus:ring-[#337ab7]" />
            </div>
            <div className="border-2 border-dashed border-gray-200 p-4 rounded-lg bg-gray-50 group hover:border-blue-400 transition-colors">
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Select Question Paper PDF (Optional)</label>
              <input type="file" accept="application/pdf" onChange={handlePdfUpload} className="text-xs w-full file:bg-blue-50 file:border-0 file:rounded-full file:px-4 file:py-2 file:text-blue-700 font-bold" />
              {pdfFile && <p className="text-[10px] text-green-600 mt-2 font-bold">{pdfFile.name}</p>}
            </div>
            <button disabled={!candidateName} onClick={() => setView('instructions')} className="w-full bg-[#337ab7] hover:bg-blue-700 disabled:bg-gray-300 text-white font-bold py-4 rounded uppercase transition-all shadow-md cursor-pointer">Login</button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'instructions') {
    return (
      <div className="min-h-screen bg-white flex flex-col font-sans">
        <div className="bg-[#337ab7] p-4 text-white font-bold flex justify-between items-center shrink-0">
          <span>General Instructions</span>
          <span className="text-xs uppercase">English</span>
        </div>
        <div className="flex-1 p-8 overflow-y-auto max-w-5xl mx-auto space-y-6 text-sm text-gray-700">
           <h2 className="text-lg font-bold border-b pb-2 text-black underline uppercase tracking-tight">Read instructions before starting</h2>
           <div className="space-y-4">
             <p className="font-bold text-blue-800">1. Exam Timing:</p>
             <p>The total duration is 180 minutes. The clock is located at the top right.</p>
             <p className="font-bold text-blue-800">2. Palette Symbols:</p>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-2">
                <div className="flex items-center gap-3"><div className={getStatusShape(STATUS.NOT_VISITED)}>01</div> <span>Not Visited</span></div>
                <div className="flex items-center gap-3"><div className={getStatusShape(STATUS.ANSWERED)}>05</div> <span>Answered</span></div>
                <div className="flex items-center gap-3"><div className={getStatusShape(STATUS.ANSWERED_MARKED)}>09</div> <span>Marked for Evaluation</span></div>
             </div>
             <p className="font-bold text-blue-800 uppercase text-xs">Marking Scheme:</p>
             <table className="w-full border text-center text-xs">
               <thead className="bg-gray-50"><tr><th className="border p-2">Section</th><th className="border p-2">Questions</th><th className="border p-2">Correct</th><th className="border p-2">Wrong</th></tr></thead>
               <tbody>
                 <tr><td className="border p-2 font-bold">Section A (MCQ)</td><td className="border p-2">20</td><td className="border p-2 text-green-600">+4</td><td className="border p-2 text-red-600">-1</td></tr>
                 <tr><td className="border p-2 font-bold">Section B (Numerical)</td><td className="border p-2">5</td><td className="border p-2 text-green-600">+4</td><td className="border p-2 text-red-600">-1</td></tr>
               </tbody>
             </table>
           </div>
        </div>
        <div className="p-6 border-t bg-gray-50 flex flex-col items-center shadow-lg shrink-0">
           <div className="flex items-start gap-4 max-w-4xl w-full mb-4 p-4 border rounded bg-white">
              <input type="checkbox" id="declare" checked={declarationChecked} onChange={(e) => setDeclarationChecked(e.target.checked)} className="mt-1 w-5 h-5 accent-blue-600" />
              <label htmlFor="declare" className="text-[11px] font-medium cursor-pointer text-gray-600 leading-tight">
                I have read and understood all instructions. I understand that any violation will result in disqualification.
              </label>
           </div>
           <button disabled={!declarationChecked} onClick={() => { if(!document.fullscreenElement) document.documentElement.requestFullscreen().catch(()=>{}); setView('exam'); }} className={`px-16 py-3 font-black uppercase tracking-widest rounded shadow-md transition-all ${declarationChecked ? 'bg-[#337ab7] text-white cursor-pointer' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>I am ready to begin</button>
        </div>
      </div>
    );
  }

  if (view === 'post_submit_stats') {
    return (
      <div className="min-h-screen bg-[#f3f7f8] flex items-center justify-center p-4 font-sans">
        <div className="bg-white shadow-2xl rounded-lg max-w-xl w-full border overflow-hidden">
          <div className="bg-[#337ab7] text-white p-4 font-bold text-center uppercase">Exam Summary</div>
          <div className="p-8">
            <table className="w-full text-sm border rounded overflow-hidden mb-6">
              <tbody>
                <tr className="border-b"><td className="p-3 font-bold">Total Answered</td><td className="p-3 text-center font-black text-green-600">{getCount(STATUS.ANSWERED) + getCount(STATUS.ANSWERED_MARKED)}</td></tr>
                <tr className="border-b"><td className="p-3 font-bold">Not Answered</td><td className="p-3 text-center font-black text-red-600">{getCount(STATUS.NOT_ANSWERED)}</td></tr>
                <tr><td className="p-3 font-bold">Time Spent</td><td className="p-3 text-center font-black text-blue-600">{formatTime(timeTakenSeconds)}</td></tr>
              </tbody>
            </table>
            <button onClick={() => setView('evaluation')} className="w-full bg-[#337ab7] hover:bg-blue-700 text-white font-black py-4 rounded uppercase shadow-lg cursor-pointer">Confirm and Evaluate</button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'evaluation') {
    const attemptedQs = questions.filter(q => q.status === STATUS.ANSWERED || q.status === STATUS.ANSWERED_MARKED);
    const allChecked = attemptedQs.every(q => evaluationResults[q.id - 1] !== undefined);
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center p-8 font-sans">
        <div className="w-full max-w-4xl bg-white shadow-xl border rounded overflow-hidden flex flex-col max-h-[85vh]">
          <div className="bg-gray-800 p-4 text-white font-bold flex justify-between items-center">
             <span className="uppercase">Verification Mode</span>
             <span className="text-xs bg-white/10 px-3 py-1 rounded">Qs to Grade: {attemptedQs.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            <table className="w-full text-left">
              <thead><tr className="border-b text-[10px] text-gray-400 uppercase"><th className="p-3">Q.No</th><th className="p-3">Bubble</th><th className="p-3 text-center">Correct (+4)</th><th className="p-3 text-center">Wrong (-1)</th></tr></thead>
              <tbody>
                {attemptedQs.map(q => {
                  const idx = q.id - 1;
                  return (
                    <tr key={q.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 py-4">
                        <div className="flex items-center gap-3">
                           <div className={getStatusShape(q.status)}></div>
                           <div><p className="font-black text-gray-800">Q {q.id}</p><p className="text-[9px] text-gray-400 uppercase">{q.subject}</p></div>
                        </div>
                      </td>
                      <td className="p-3"><span className="bg-blue-600 text-white px-3 py-1 rounded text-xs font-black">{q.type === 'mcq' ? `Opt ${q.selectedOption}` : q.numericValue}</span></td>
                      <td className="p-3"><button onClick={() => setEvaluationResults(p => ({...p, [idx]: true}))} className={`w-full py-2.5 rounded-lg transition-all cursor-pointer ${evaluationResults[idx] === true ? 'bg-green-600 text-white shadow-md' : 'bg-gray-100 text-gray-300'}`}><CheckCircle size={20}/></button></td>
                      <td className="p-3"><button onClick={() => setEvaluationResults(p => ({...p, [idx]: false}))} className={`w-full py-2.5 rounded-lg transition-all cursor-pointer ${evaluationResults[idx] === false ? 'bg-red-600 text-white shadow-md' : 'bg-gray-100 text-gray-300'}`}><XCircle size={20}/></button></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="p-6 border-t bg-gray-50 flex justify-between items-center">
             {!allChecked ? <span className="text-red-600 text-xs font-black animate-pulse">! Grade all questions to proceed</span> : <span className="text-green-600 text-xs font-black">Ready for scorecard</span>}
             <button disabled={!allChecked} onClick={() => setView('result')} className={`px-12 py-3 rounded-lg font-black transition-all ${allChecked ? 'bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>GENERATE RESULT</button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'result') {
    const overallStats: any = {
      attempted: questions.filter(q => q.status === STATUS.ANSWERED || q.status === STATUS.ANSWERED_MARKED).length,
      correct: Object.values(evaluationResults).filter(v => v === true).length,
      incorrect: Object.values(evaluationResults).filter(v => v === false).length,
    };
    overallStats.marks = (overallStats.correct * 4) - (overallStats.incorrect * 1);
    
    const getSub = (n: string) => {
      const subQs = questions.filter(q => q.subject === n);
      const attempted = subQs.filter(q => q.status === STATUS.ANSWERED || q.status === STATUS.ANSWERED_MARKED);
      const correct = attempted.filter(q => evaluationResults[q.id-1] === true).length;
      const incorrect = attempted.filter(q => evaluationResults[q.id-1] === false).length;
      return { score: (correct*4)-(incorrect), correct, incorrect, attempted: attempted.length };
    };
    const subjects = ['Mathematics', 'Physics', 'Chemistry'].map(n => ({ name: n, ...getSub(n) }));

    return (
      <div className="min-h-screen bg-gray-100 p-4 md:p-12 overflow-y-auto font-sans">
        <style>{`@media print { .no-print { display: none !important; } .printable-area { border: 2px solid #337ab7 !important; padding: 20px !important; box-shadow: none !important; width: 100%; margin: 0; } }`}</style>
        <div className="max-w-4xl mx-auto printable-area bg-white border shadow-2xl rounded-2xl overflow-hidden">
           <div className="bg-[#337ab7] p-8 text-white flex justify-between items-end">
             <div><h1 className="text-3xl font-black italic uppercase">NTA Score Card</h1><p className="text-xl font-bold uppercase">{candidateName}</p><p className="text-xs opacity-75">{examName}</p></div>
             <button onClick={handlePrint} className="no-print bg-white/20 hover:bg-white/30 p-3 rounded-lg border border-white/30 font-black text-sm transition-all cursor-pointer"><Printer size={18}/> PRINT RESULT</button>
           </div>
           <div className="p-10">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
                 <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 text-center shadow-sm">
                    <p className="text-[10px] font-black text-blue-600 uppercase mb-2 tracking-widest">Grand Score</p>
                    <p className="text-5xl font-black text-blue-800">{overallStats.marks}</p>
                 </div>
                 <div className="bg-orange-50 border border-orange-100 rounded-2xl p-6 text-center shadow-sm">
                    <p className="text-[10px] font-black text-orange-600 uppercase mb-2 tracking-widest">Time Spent</p>
                    <p className="text-4xl font-black text-orange-800">{formatTimeTaken(timeTakenSeconds)}</p>
                 </div>
                 <div className="bg-green-50 border border-green-100 rounded-2xl p-6 text-center shadow-sm">
                    <p className="text-[10px] font-black text-green-600 uppercase mb-2 tracking-widest">Correct</p>
                    <p className="text-4xl font-black text-green-700">{overallStats.correct}</p>
                 </div>
                 <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-center shadow-sm">
                    <p className="text-[10px] font-black text-red-600 uppercase mb-2 tracking-widest">Wrong</p>
                    <p className="text-4xl font-black text-red-600">{overallStats.incorrect}</p>
                 </div>
              </div>
              <h3 className="text-lg font-black text-[#337ab7] border-b-4 border-[#337ab7] pb-2 uppercase tracking-wide mb-6">Analysis</h3>
              <table className="w-full border mb-10 text-sm">
                 <thead className="bg-gray-50 uppercase text-[10px] text-gray-400"><tr><th className="p-4 text-left">Subject</th><th className="p-4 text-center">Attempted</th><th className="p-4 text-center">Correct</th><th className="p-4 text-center text-blue-800">Score</th></tr></thead>
                 <tbody>
                    {subjects.map(s => (
                      <tr key={s.name} className="border-b font-bold"><td className="p-4">{s.name}</td><td className="p-4 text-center">{s.attempted}</td><td className="p-4 text-center text-green-600">{s.correct}</td><td className="p-4 text-center text-blue-900 text-lg">{s.score}</td></tr>
                    ))}
                 </tbody>
              </table>
              <button onClick={() => window.location.reload()} className="no-print w-full bg-gray-900 text-white font-black py-4 rounded-xl shadow-lg hover:bg-black uppercase tracking-widest active:scale-95 transition-all cursor-pointer">Restart Session</button>
           </div>
        </div>
      </div>
    );
  }

  // --- EXAM RENDER ---
  const currentQ = questions[currentIndex];
  const currentSection = SECTIONS.find(s => s.id === activeTab);

  if (!currentSection) return null;

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden text-[#333] font-sans">
      <div className="h-16 border-b flex justify-between items-center px-6 bg-white shrink-0 relative z-50">
        <div className="flex items-center gap-3"><h1 className="font-black text-lg text-gray-600 uppercase tracking-tight">{examName}</h1></div>
        <div className="flex items-center gap-6">
           <div className="flex items-center gap-2 bg-[#eeeeee] px-4 py-1.5 border border-gray-300 rounded-sm">
             <span className="text-[11px] font-bold text-gray-500 uppercase">Time Left:</span>
             <span className="text-xl font-mono font-black text-blue-900 w-24 text-center">{formatTime(timeLeft)}</span>
           </div>
           <div className="relative">
             <button onClick={() => setShowSubmitMenu(!showSubmitMenu)} className="flex items-center gap-3 border-l pl-6 py-2 group hover:bg-gray-50 cursor-pointer">
               <div className="text-right"><p className="text-[9px] text-gray-400 font-black uppercase">Candidate</p><p className="text-sm font-bold uppercase tracking-tight">{candidateName || 'Guest'}</p></div>
               <div className="w-10 h-10 bg-[#ddd] rounded border border-gray-400 flex items-center justify-center text-gray-600 group-hover:bg-blue-600 group-hover:text-white transition-all"><User size={24} /></div>
               <ChevronDown size={14} className="text-gray-400" />
             </button>
             {showSubmitMenu && (
               <div className="absolute right-0 top-full mt-1 w-60 bg-white border shadow-2xl rounded-lg overflow-hidden z-50">
                 <button onClick={toggleFullScreen} className="w-full flex items-center gap-3 px-5 py-4 text-gray-700 hover:bg-gray-50 font-black text-[11px] uppercase border-b cursor-pointer">
                   {isFullScreen ? <Minimize2 size={18}/> : <Maximize2 size={18}/>}
                   {isFullScreen ? 'Exit Full Screen' : 'Enter Full Screen'}
                 </button>
                 <button onClick={handleSubmitExam} className="w-full flex items-center gap-3 px-5 py-5 text-red-600 hover:bg-red-50 font-black text-sm uppercase tracking-widest active:bg-red-100 cursor-pointer">
                   <LogOut size={20} /> Submit Exam
                 </button>
               </div>
             )}
           </div>
        </div>
      </div>

      <div className="bg-[#337ab7] text-white px-6 py-1.5 flex justify-between items-center shrink-0">
         <span className="text-[11px] font-bold uppercase tracking-wider">{examName} - Computer Based Simulation</span>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden border-r bg-[#f4f7f9]">
          <div className="flex border-b bg-white shrink-0 overflow-x-auto no-scrollbar">
            {SECTIONS.map(sec => (
              <button key={sec.id} onClick={() => { setActiveTab(sec.id); setCurrentIndex(sec.start - 1); }} className={`px-7 py-4 text-[11px] font-black uppercase transition-all border-r whitespace-nowrap cursor-pointer ${activeTab === sec.id ? 'bg-[#337ab7] text-white shadow-inner' : 'text-gray-400 hover:bg-gray-50'}`}>
                {sec.label}
              </button>
            ))}
          </div>

          <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
            <div className="bg-white rounded-lg border border-gray-300 min-h-full shadow-sm flex flex-col">
              <div className="p-3 border-b flex justify-between bg-[#f8f9fa] shrink-0 items-center">
                <div className="flex items-center gap-4">
                  <span className="font-black text-blue-900 text-lg">Question No: {currentQ?.id}</span>
                  <div className="flex items-center gap-2 text-[10px] font-black bg-white px-3 py-1 border rounded shadow-sm">
                     <span className="text-green-600 uppercase">Correct: +4</span> | <span className="text-red-500 uppercase">Incorrect: -1</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {pdfUrl && (
                    <div className="flex items-center gap-1">
                      <button onClick={() => setPdfHeight(h => Math.max(200, h - 100))} className="p-1 hover:bg-gray-200 rounded transition-colors cursor-pointer"><Minimize2 size={14}/></button>
                      <button onClick={() => setPdfHeight(h => Math.min(1200, h + 100))} className="p-1 hover:bg-gray-200 rounded transition-colors cursor-pointer"><Maximize2 size={14}/></button>
                    </div>
                  )}
                  <span className="text-[9px] bg-white px-3 py-1 border rounded font-black text-gray-400 uppercase tracking-widest">{currentQ?.subject}</span>
                </div>
              </div>
              
              <div className="flex-1 flex flex-col p-8">
                {pdfUrl ? (
                  <div className="flex flex-col mb-6">
                    <div className="relative border-2 border-blue-50 rounded-xl overflow-hidden shadow-inner" style={{ height: `${pdfHeight}px` }}>
                       <iframe src={`${pdfUrl}#toolbar=1&navpanes=0`} className="w-full h-full" title="Question Paper" />
                    </div>
                    <div className="mt-2 flex justify-between items-center px-1">
                       <p className="text-[10px] text-gray-400 font-bold uppercase italic">Scroll inside PDF to see Question {currentQ?.id}</p>
                       <div className="bg-orange-50 text-orange-700 px-3 py-1 rounded-full text-[10px] font-black animate-pulse border border-orange-200 uppercase">Check question correctly before ticking answer</div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#e7f3ff] border border-[#b8daff] p-6 rounded-xl text-[#004085] mb-10 font-medium italic text-lg leading-relaxed shadow-sm">
                     Please read <span className="font-black underline text-blue-700 uppercase">Question Number {currentQ?.id}</span> from your booklet.
                     <div className="mt-4 text-[11px] font-black text-orange-600 uppercase tracking-wide flex items-center gap-2">! Check question correctly before ticking answer</div>
                  </div>
                )}

                <div className="mt-auto">
                  {currentQ?.type === 'mcq' ? (
                    <div className="flex flex-col gap-3 max-w-2xl">
                      {[1, 2, 3, 4].map(num => (
                        <label key={num} className={`flex items-center gap-5 p-5 border-2 rounded-xl cursor-pointer transition-all ${currentQ.selectedOption === num ? 'bg-[#e7f3ff] border-blue-500 ring-2 border-blue-500 shadow-md' : 'hover:bg-gray-50 border-gray-100'}`}>
                          <input type="radio" checked={currentQ.selectedOption === num} onChange={() => { const u = [...questions]; u[currentIndex].selectedOption = num; setQuestions(u); }} className="w-6 h-6 accent-blue-700" />
                          <span className="font-black text-gray-700 text-xl">Option {num}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="max-w-xs">
                      <p className="text-[10px] font-black mb-4 text-gray-400 uppercase tracking-widest">Type Numerical Response</p>
                      <input type="text" value={currentQ?.numericValue || ""} readOnly className="w-full p-4 border-2 border-blue-100 rounded-2xl text-4xl font-black text-center text-blue-900 bg-gray-50 mb-6 shadow-inner" />
                      <div className="grid grid-cols-4 gap-3">
                        {['1','2','3','4','5','6','7','8','9','0','.','-'].map(k => (
                          <button key={k} onClick={() => { const u = [...questions]; u[currentIndex].numericValue += k; setQuestions(u); }} className="p-4 bg-white border-2 border-gray-100 font-black hover:bg-blue-600 hover:text-white rounded-xl text-lg shadow-sm transition-all hover:scale-105 cursor-pointer">{k}</button>
                        ))}
                        <button onClick={()=>{ const u = [...questions]; u[currentIndex].numericValue = u[currentIndex].numericValue.slice(0, -1); setQuestions(u); }} className="col-span-2 p-4 bg-red-50 text-red-600 font-black border-2 border-red-100 rounded-xl text-[10px] uppercase cursor-pointer">Backspace</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="h-18 bg-white border-t flex items-center justify-between px-8 shrink-0 py-4 shadow-sm">
             <div className="flex gap-4">
               <button onClick={() => handleQuestionAction('MARK_REVIEW')} className="px-6 py-2.5 border-2 border-[#337ab7] text-[#337ab7] font-black text-[11px] rounded-lg hover:bg-blue-50 uppercase tracking-tighter transition-all cursor-pointer">Mark for Review & Next</button>
               <button onClick={() => handleQuestionAction('CLEAR')} className="px-6 py-2.5 border-2 border-gray-200 text-gray-500 font-black text-[11px] rounded-lg hover:bg-gray-100 uppercase tracking-tighter transition-all cursor-pointer">Clear Response</button>
             </div>
             <button onClick={() => handleQuestionAction('SAVE_NEXT')} className="px-14 py-3 bg-[#337ab7] text-white font-black text-sm rounded-xl hover:bg-blue-800 uppercase shadow-xl transition-all active:scale-95 tracking-widest cursor-pointer">Save & Next</button>
          </div>
        </div>

        <div className="w-[340px] flex flex-col bg-white border-l shrink-0">
          <div className="p-5 grid grid-cols-2 gap-y-4 gap-x-2 border-b bg-gray-50 shrink-0">
             <div className="flex items-center gap-3 text-[10px] font-black"><div className={getStatusShape(STATUS.ANSWERED)}>0</div> <span>Answered</span></div>
             <div className="flex items-center gap-3 text-[10px] font-black"><div className={getStatusShape(STATUS.NOT_ANSWERED)}>0</div> <span>Not Answered</span></div>
             <div className="flex items-center gap-3 text-[10px] font-black"><div className={getStatusShape(STATUS.NOT_VISITED)}>0</div> <span>Not Visited</span></div>
             <div className="flex items-center gap-3 text-[10px] font-black"><div className={getStatusShape(STATUS.MARKED)}>0</div> <span>Marked for Review</span></div>
             <div className="flex items-center gap-3 text-[10px] font-black col-span-2"><div className={getStatusShape(STATUS.ANSWERED_MARKED)}>0</div> <span>Answered & Marked (Evaluation)</span></div>
          </div>
          <div className="bg-[#337ab7] text-white p-3 text-[10px] font-black text-center uppercase tracking-widest shrink-0">Palette</div>
          <div className="p-5 overflow-y-auto flex-1 bg-white no-scrollbar">
            <div className="grid grid-cols-5 gap-3">
              {questions.map((q, idx) => {
                if (q.id < currentSection.start || q.id > currentSection.end) return null;
                return <button key={idx} onClick={() => setCurrentIndex(idx)} className={getStatusShape(q.status, currentIndex === idx)}>{q.id}</button>;
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExamPlatform;
