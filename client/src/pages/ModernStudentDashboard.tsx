import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  GraduationCap, 
  BookOpen, 
  Download, 
  FileText, 
  ClipboardList, 
  LogOut, 
  MapPin, 
  School,
  FileDown,
  ExternalLink,
  Play,
  LayoutDashboard,
  Wallet,
  Calendar,
  Bell,
  Search,
  Menu,
  X
} from 'lucide-react';
import { toast } from 'sonner';

import { ProgramFeeStructurePanel } from '@/components/panels/ProgramFeeStructurePanel';

export function ModernStudentDashboard() {
  const { logout } = useAuth();
  const [student, setStudent] = useState<any>(null);
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Custom sidebar state
  const [location, setLocation] = useLocation();
  const pathParts = location.split('/');
  
  useEffect(() => {
    if (location === '/' || location === '/student' || location === '/student/') {
      setLocation('/student/dashboard');
    }
  }, [location, setLocation]);

  const defaultTab = 'dashboard';
  const activeTab = (pathParts[1] === 'student' && pathParts[2]) ? pathParts[2] : defaultTab;
  
  const setActiveTab = (tab: string) => {
    setLocation(`/student/${tab}`);
  };
  const [activeVideo, setActiveVideo] = useState<any>(null);
  const [activeExamMode, setActiveExamMode] = useState<any>(null);
  const [examQuestions, setExamQuestions] = useState<any[]>([]);
  const [examAnswers, setExamAnswers] = useState<Record<string, string>>({});
  const [examStatus, setExamStatus] = useState<'not_started' | 'in_progress' | 'submitted' | 'graded'>('not_started');
  const [examScore, setExamScore] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetchStudentData();
  }, []);

  const fetchStudentData = async () => {
    setLoading(true);
    try {
      // getStudents returns only the logged-in student's record
      const studentRes = await api.get('/students');
      if (studentRes.data.data && studentRes.data.data.length > 0) {
        const studentInfo = studentRes.data.data[0];
        setStudent(studentInfo);
        
        // Fetch materials for their program
        if (studentInfo.program?.id) {
          const materialsRes = await api.get(`/operations/programs/${studentInfo.program.id}/materials`);
          setMaterials(materialsRes.data.data || []);
        }
      }
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  
  const handleStartExam = async (m: any) => {
    try {
      const res = await api.get(`/students/exams/${m.id}/details`);
      const { exam, submission } = res.data.data;
      
      setActiveExamMode(exam);
      setExamQuestions(exam.questions || []);
      
      if (submission) {
        setExamStatus(submission.status);
        setExamScore(submission.score);
        // Pre-fill answers
        const prefilled: Record<string, string> = {};
        submission.answers?.forEach((ans: any) => {
          prefilled[ans.questionId] = ans.answerText || '';
        });
        setExamAnswers(prefilled);
        if (submission.status === 'in_progress' && exam.durationMinutes) {
          const started = new Date(submission.startedAt).getTime();
          const elapsedSeconds = Math.floor((Date.now() - started) / 1000);
          const remaining = (exam.durationMinutes * 60) - elapsedSeconds;
          setTimeRemaining(remaining > 0 ? remaining : 0);
        } else {
          setTimeRemaining(null);
        }
      } else {
        // Init exam
        const startRes = await api.post(`/students/exams/${m.id}/start`);
        setExamStatus('in_progress');
        setExamAnswers({});
        setExamScore(null);
        if (exam.durationMinutes) {
          setTimeRemaining(exam.durationMinutes * 60);
        } else {
          setTimeRemaining(null);
        }
      }
    } catch (error) {
      toast.error('Could not load exam details. The exam might not be properly configured.');
    }
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (examStatus === 'in_progress' && timeRemaining !== null && timeRemaining > 0) {
      timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(timer);
            handleSubmitExam();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [examStatus, timeRemaining]);

  const handleSubmitExam = async () => {
    if (!activeExamMode) return;
    try {
      const formattedAnswers = Object.keys(examAnswers).map(questionId => ({
        questionId,
        answerText: examAnswers[questionId]
      }));

      const res = await api.post(`/students/exams/${activeExamMode.materialId}/submit`, { answers: formattedAnswers });
      toast.success('Exam submitted successfully!');
      
      const updatedSubmission = res.data.data;
      setExamStatus(updatedSubmission.status);
      if (updatedSubmission.score !== null) {
        setExamScore(updatedSubmission.score);
      }
    } catch (error) {
      toast.error('Failed to submit exam');
    }
  };

  const handleDownload = (m: any) => {
    const isExternalUrl = m.fileUrl && m.fileUrl.startsWith('http');
    if (isExternalUrl) {
      window.open(m.fileUrl, '_blank');
      return;
    }
    const apiBase = import.meta.env.VITE_API_URL || '/api/v1';
    const serverUrl = apiBase.replace('/api/v1', '');
    const url = `${serverUrl}${m.fileUrl}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = m.fileName;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F4F7FE] dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1A2B6D]" />
          <p className="text-muted-foreground text-sm font-medium">Loading your Student Portal...</p>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background p-4">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <CardTitle className="text-red-500">Profile Not Found</CardTitle>
            <CardDescription>We could not retrieve your active student record.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Please contact your study center or operations department to ensure your enrollment has been fully verified and promoted to an active student account.
            </p>
            <Button variant="outline" className="w-full" onClick={logout}>
              <LogOut className="w-4 h-4 mr-2" /> Log Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Helper to determine year suffix
  const getYearSuffix = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.getFullYear().toString();
  };

  // Finance calculations (mocked from fee structure or enrollments if available)
  let totalPayable = 0;
  let totalPaid = 0;
  
  if (student.enrollments && student.enrollments.length > 0) {
    student.enrollments.forEach((enr: any) => {
      // Base fee calculation
      if (enr.totalFee) totalPayable += Number(enr.totalFee);
      // Extra fees
      if (enr.extraFees && Array.isArray(enr.extraFees)) {
        enr.extraFees.forEach((ef: any) => {
          totalPayable += Number(ef.amount || 0);
        });
      }
      // Payments
      if (enr.studentFeeReceipts && Array.isArray(enr.studentFeeReceipts)) {
        enr.studentFeeReceipts.forEach((receipt: any) => {
          if (receipt.status === 'approved' || receipt.status === 'completed' || receipt.status === 'success' || !receipt.status) {
            totalPaid += Number(receipt.amount || 0);
          }
        });
      }
    });
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'payment_info', label: 'Payment Info', icon: Wallet },
    { id: 'classes', label: 'Video Classes', icon: Play },
    { id: 'examination', label: 'Examination', icon: FileText },
    { id: 'ebooks', label: 'E-Books', icon: BookOpen },
    { id: 'result', label: 'Result', icon: GraduationCap },
    { id: 'notice', label: 'Notice', icon: Bell },
    { id: 'schedule', label: 'Schedule', icon: Calendar },
  ];

  if (activeExamMode) {
    return (
      <div className="fixed inset-0 z-[100] bg-[#F4F7FE] dark:bg-slate-950 overflow-y-auto">
        <div className="max-w-4xl mx-auto py-8 px-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="bg-white dark:bg-slate-900 border-b px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">{activeExamMode.material?.title || 'Examination'}</h2>
                <p className="text-sm text-muted-foreground capitalize">{activeExamMode.type} Exam</p>
              </div>
              <div className="flex items-center gap-4 self-end sm:self-auto">
                {examStatus === 'in_progress' && timeRemaining !== null && (
                  <div className="flex items-center text-rose-600 bg-rose-50 dark:bg-rose-900/20 px-3 py-1.5 rounded-md font-semibold">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                  </div>
                )}
                {examStatus === 'in_progress' && (
                  <Button onClick={handleSubmitExam} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    Submit Exam
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={() => { setActiveExamMode(null); fetchStudentData(); }}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            <div className="p-6">
              {examStatus === 'not_started' && (
                <div className="text-center py-12">
                  <h3 className="text-xl font-bold mb-4">Ready to begin?</h3>
                  <p className="text-muted-foreground mb-6">Once you start, your timer will begin. Do not close this window.</p>
                  <Button onClick={() => handleStartExam(activeExamMode.material)} size="lg" className="bg-[#1A2B6D] hover:bg-[#111C43]">
                    Start Exam Now
                  </Button>
                </div>
              )}

              {examStatus === 'in_progress' && (
                <div className="space-y-8">
                  {examQuestions.map((q: any, index: number) => (
                    <div key={q.id} className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-slate-100 dark:border-slate-800">
                      <div className="flex justify-between items-start mb-4">
                        <h4 className="font-semibold text-lg text-slate-800 dark:text-slate-200">
                          <span className="text-[#1A2B6D] mr-2">Q{index + 1}.</span> 
                          {q.questionText}
                        </h4>
                        <span className="text-sm font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 px-2.5 py-1 rounded-full whitespace-nowrap">
                          {q.marks} Marks
                        </span>
                      </div>
                      
                      {q.questionType === 'multiple_choice' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                          {q.options?.map((opt: string, i: number) => (
                            <button
                              key={i}
                              onClick={() => setExamAnswers({...examAnswers, [q.id]: opt})}
                              className={`p-4 rounded-xl border text-left transition-all ${
                                examAnswers[q.id] === opt 
                                  ? 'bg-[#1A2B6D]/5 border-[#1A2B6D] ring-1 ring-[#1A2B6D]' 
                                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-[#1A2B6D]/50'
                              }`}
                            >
                              <div className="flex items-center">
                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center mr-3 ${
                                  examAnswers[q.id] === opt ? 'border-[#1A2B6D] bg-[#1A2B6D]' : 'border-slate-300'
                                }`}>
                                  {examAnswers[q.id] === opt && <div className="w-2 h-2 rounded-full bg-white" />}
                                </div>
                                <span>{opt}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-4">
                          <textarea 
                            className="w-full min-h-[150px] p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-[#1A2B6D] focus:outline-none transition-all resize-y"
                            placeholder="Type your answer here..."
                            value={examAnswers[q.id] || ''}
                            onChange={(e) => setExamAnswers({...examAnswers, [q.id]: e.target.value})}
                          ></textarea>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {examStatus === 'submitted' && (
                <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 p-8 rounded-2xl text-center border border-blue-100 dark:border-blue-900 shadow-sm">
                  <div className="w-16 h-16 bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-200 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Exam Submitted Successfully</h3>
                  <p className="text-blue-700/80 dark:text-blue-300/80 mb-6">Your answers have been securely recorded.</p>
                  
                  {examScore !== null && (
                    <div className="inline-block bg-white dark:bg-slate-900 px-8 py-4 rounded-xl border shadow-sm">
                      <p className="text-sm text-muted-foreground font-medium mb-1">Your Objective Score</p>
                      <p className="text-4xl font-bold text-[#1A2B6D]">{examScore} / {activeExamMode.totalMarks || '-'}</p>
                    </div>
                  )}
                  {examScore === null && (
                    <div className="inline-block bg-white dark:bg-slate-900 px-8 py-4 rounded-xl border shadow-sm">
                      <p className="text-sm font-medium">Pending Review</p>
                      <p className="text-xs text-muted-foreground mt-1">Your subjective exam is pending manual grading by your instructor.</p>
                    </div>
                  )}
                </div>
              )}

              {examStatus === 'graded' && (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300 p-8 rounded-2xl text-center border border-emerald-100 dark:border-emerald-900 shadow-sm">
                  <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-800 text-emerald-600 dark:text-emerald-200 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Exam Graded</h3>
                  
                  <div className="inline-block bg-white dark:bg-slate-900 px-8 py-4 rounded-xl border shadow-sm mt-4">
                    <p className="text-sm text-muted-foreground font-medium mb-1">Final Score</p>
                    <p className="text-4xl font-bold text-emerald-600">{examScore} / {activeExamMode.totalMarks || '-'}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const renderMaterialsContent = (categories: string[]) => {
    const filteredMaterials = materials.filter(m => categories.includes(m.category));
    
    if (filteredMaterials.length === 0) {
      return (
        <Card className="border-none shadow-sm mt-4">
          <CardContent className="flex flex-col items-center justify-center p-10">
            <FileDown className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
            <p className="text-muted-foreground text-center">No materials available currently.</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
        {filteredMaterials.map((m) => (
          <Card key={m.id} className="border-none shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg line-clamp-2">{m.title}</CardTitle>
              <CardDescription>Semester {m.semester}</CardDescription>
            </CardHeader>
            <CardContent>
              {m.category === 'video_class' && m.fileUrl && (m.fileUrl.includes('youtube.com') || m.fileUrl.includes('youtu.be')) ? (
                <div className="aspect-video w-full rounded-md overflow-hidden bg-slate-100">
                  <iframe 
                    width="100%" 
                    height="100%" 
                    src={m.fileUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')} 
                    title="YouTube video player" 
                    frameBorder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen>
                  </iframe>
                </div>
              ) : (
                <Button 
                  variant="default" 
                  className="w-full bg-[#1A2B6D] hover:bg-[#111C43]"
                  onClick={() => {
                    const isExam = ['exam_subjective', 'exam_objective', 'Subjective Exam', 'Objective Exam'].includes(m.category);
                    if (isExam) {
                      handleStartExam(m);
                    } else {
                      handleDownload(m);
                    }
                  }}
                >
                  {(() => {
                    const isExam = ['exam_subjective', 'exam_objective', 'Subjective Exam', 'Objective Exam'].includes(m.category);
                    const isEbook = ['ebook', 'E-Book'].includes(m.category);
                    if (isExam) {
                      return <><Play className="w-4 h-4 mr-2" /> Start Exam</>;
                    }
                    if (isEbook) {
                      return <><BookOpen className="w-4 h-4 mr-2" /> View Book</>;
                    }
                    if (m.fileUrl && m.fileUrl.startsWith('http')) {
                      return <><ExternalLink className="w-4 h-4 mr-2" /> View Resource</>;
                    }
                    return <><Download className="w-4 h-4 mr-2" /> Download</>;
                  })()}
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-[#F4F7FE] dark:bg-slate-950 font-sans overflow-hidden">
      
      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-[#111C43] text-white transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:relative lg:translate-x-0 flex flex-col rounded-r-3xl
      `}>
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2 rounded-xl">
              <GraduationCap className="h-8 w-8 text-white" />
            </div>
            <div className="font-bold text-xl tracking-wide hidden lg:block">Portal</div>
          </div>
          <Button variant="ghost" size="icon" className="lg:hidden text-white hover:bg-white/10" onClick={() => setIsMobileMenuOpen(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="flex-1 px-4 py-6 overflow-y-auto space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 text-sm font-medium
                  ${isActive 
                    ? 'bg-white/10 text-white shadow-sm' 
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                  }
                `}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-white/60'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 mt-auto mb-4">
          <button
            onClick={logout}
            className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 text-sm font-medium text-white/60 hover:text-white hover:bg-white/5"
          >
            <LogOut className="h-5 w-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* Header */}
        <header className="h-20 px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4 flex-1">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setIsMobileMenuOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            
            <div className="relative max-w-md w-full hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Search..." 
                className="w-full h-10 pl-10 pr-4 rounded-full bg-white dark:bg-slate-900 border-none shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1A2B6D]/20 text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{student.name}</span>
              <span className="text-xs text-muted-foreground">Enrolled Student</span>
            </div>
            <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-[#1A2B6D] to-[#3a5bd6] flex items-center justify-center text-white font-bold shadow-md cursor-pointer">
              {student.name ? student.name.charAt(0).toUpperCase() : 'S'}
            </div>
          </div>
        </header>

        {/* Dynamic Content */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-8">
          
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Hero Banner */}
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#111C43] to-[#1A2B6D] text-white shadow-lg h-64 md:h-72">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
                <div className="p-8 md:p-12 h-full flex flex-col justify-center relative z-10 w-2/3">
                  <div className="text-sm text-white/70 mb-2 font-medium">
                    {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </div>
                  <h1 className="text-3xl md:text-5xl font-bold mb-3">Welcome back, {student.name.split(' ')[0]}!</h1>
                  <p className="text-lg text-white/80 max-w-md">Always stay updated in your student portal.</p>
                </div>
                
                {/* 3D Character (Placeholder structure - using standard img if available or a styling block) */}
                <div className="absolute right-0 bottom-0 top-0 w-1/3 hidden md:flex items-end justify-center pointer-events-none">
                  {/* Using an external high quality 3d illustration placeholder that matches the vibe */}
                  <img src="https://cdni.iconscout.com/illustration/premium/thumb/student-graduating-from-university-4995964-4159586.png" alt="Student" className="h-[120%] object-contain origin-bottom" style={{ transform: 'translateY(10%)' }} />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  {/* Finance Overview */}
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">Finance</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
                        <CardContent className="p-6">
                          <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4">
                            <Wallet className="h-6 w-6" />
                          </div>
                          <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">₹ {totalPayable.toLocaleString()}</p>
                          <p className="text-sm text-muted-foreground font-medium">Total Payable</p>
                        </CardContent>
                      </Card>
                      
                      <Card className="border-2 border-[#1A2B6D] shadow-md rounded-2xl overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-2">
                          <CheckCircle className="h-5 w-5 text-[#1A2B6D]" />
                        </div>
                        <CardContent className="p-6">
                          <div className="h-12 w-12 bg-[#1A2B6D]/10 text-[#1A2B6D] rounded-xl flex items-center justify-center mb-4">
                            <Wallet className="h-6 w-6" />
                          </div>
                          <p className="text-2xl font-bold text-[#1A2B6D]">₹ {totalPaid.toLocaleString()}</p>
                          <p className="text-sm text-[#1A2B6D]/70 font-medium">Total Paid</p>
                        </CardContent>
                      </Card>

                      <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
                        <CardContent className="p-6">
                          <div className="h-12 w-12 bg-slate-50 text-slate-600 rounded-xl flex items-center justify-center mb-4">
                            <Wallet className="h-6 w-6" />
                          </div>
                          <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">₹ {(totalPayable - totalPaid).toLocaleString()}</p>
                          <p className="text-sm text-muted-foreground font-medium">Balance</p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  {/* Enrolled Program summary */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Enrolled Program</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card className="border-none shadow-sm bg-indigo-50/50 dark:bg-indigo-950/20 rounded-2xl">
                        <CardContent className="p-6 flex flex-col items-start h-full justify-between">
                          <div className="space-y-1 mb-4">
                            <h4 className="font-bold text-indigo-900 dark:text-indigo-200 text-lg">{student.program?.name || 'Program Not Found'}</h4>
                            <p className="text-indigo-700/70 dark:text-indigo-300 text-sm font-medium">{student.program?.code}</p>
                          </div>
                          <Button className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white border-none shadow-sm px-6" onClick={() => setActiveTab('classes')}>
                            View Materials
                          </Button>
                        </CardContent>
                      </Card>

                      <Card className="border-none shadow-sm bg-blue-50/50 dark:bg-blue-950/20 rounded-2xl">
                         <CardContent className="p-6 flex flex-col items-start h-full justify-between">
                          <div className="space-y-1 mb-4">
                            <h4 className="font-bold text-blue-900 dark:text-blue-200 text-lg">Study Center</h4>
                            <p className="text-blue-700/70 dark:text-blue-300 text-sm font-medium">{student.center?.name || 'Direct / Online'}</p>
                            {student.center?.code && (
                               <p className="text-blue-700/70 dark:text-blue-300 text-xs mt-1">Code: {student.center.code}</p>
                            )}
                          </div>
                          <Button className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white border-none shadow-sm px-6" variant="default" onClick={() => setActiveTab('payment_info')}>
                            View Fees
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Daily Notice */}
                  <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Daily notice</h3>
                      <button className="text-sm font-bold text-[#1A2B6D] hover:underline">See all</button>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="pb-4 border-b border-slate-100 dark:border-slate-800 last:border-0 last:pb-0">
                        <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-1">Welcome to the New Portal</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Your student portal has been completely redesigned for a better experience. Access your classes and materials directly from the sidebar.
                        </p>
                      </div>
                      <div className="pb-4 border-b border-slate-100 dark:border-slate-800 last:border-0 last:pb-0">
                        <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-1">Fee Payment Guidelines</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Please ensure your semester fees are cleared to unlock your examination materials.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Info Card */}
                  <div className="bg-[#1A2B6D] text-white rounded-3xl p-6 shadow-sm relative overflow-hidden">
                     <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
                     <h3 className="font-bold text-lg mb-2">Need Help?</h3>
                     <p className="text-sm text-white/80 mb-4">Contact your study center coordinator for any assistance with your program.</p>
                     <p className="text-sm font-bold">{student.center?.email || 'support@iits.edu'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'payment_info' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Payment History</h2>
                <p className="text-muted-foreground">View your fee payments and receipts.</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                 <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
                    <CardContent className="p-6">
                      <p className="text-sm text-muted-foreground font-medium mb-1">Total Course Fee</p>
                      <p className="text-3xl font-bold text-slate-800 dark:text-slate-200">₹ {totalPayable.toLocaleString()}</p>
                    </CardContent>
                  </Card>
                  <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
                    <CardContent className="p-6">
                      <p className="text-sm text-muted-foreground font-medium mb-1">Total Paid</p>
                      <p className="text-3xl font-bold text-[#1A2B6D]">₹ {totalPaid.toLocaleString()}</p>
                    </CardContent>
                  </Card>
                  <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
                    <CardContent className="p-6">
                      <p className="text-sm text-muted-foreground font-medium mb-1">Remaining Balance</p>
                      <p className="text-3xl font-bold text-rose-600">₹ {(totalPayable - totalPaid).toLocaleString()}</p>
                    </CardContent>
                  </Card>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm">
                <h3 className="text-lg font-bold mb-4">Transaction History</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-muted-foreground uppercase bg-slate-50 dark:bg-slate-800/50">
                      <tr>
                        <th className="px-6 py-4 font-semibold rounded-tl-xl">Receipt No</th>
                        <th className="px-6 py-4 font-semibold">Date</th>
                        <th className="px-6 py-4 font-semibold">Amount</th>
                        <th className="px-6 py-4 font-semibold">Payment Method</th>
                        <th className="px-6 py-4 font-semibold rounded-tr-xl">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {student.enrollments?.map((enr: any) => 
                        enr.studentFeeReceipts?.map((receipt: any, idx: number) => (
                          <tr key={receipt.id} className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="px-6 py-4 font-medium">{receipt.receiptNumber || `RCPT-${idx+1}`}</td>
                            <td className="px-6 py-4 text-muted-foreground">{new Date(receipt.receiptDate).toLocaleDateString()}</td>
                            <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">₹ {Number(receipt.amount).toLocaleString()}</td>
                            <td className="px-6 py-4 capitalize text-muted-foreground">{receipt.paymentMethod?.replace('_', ' ') || '-'}</td>
                            <td className="px-6 py-4">
                               <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${receipt.status === 'rejected' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                 {receipt.status || 'Success'}
                               </span>
                            </td>
                          </tr>
                        ))
                      )}
                      
                      {(!student.enrollments || student.enrollments.every((enr: any) => !enr.studentFeeReceipts || enr.studentFeeReceipts.length === 0)) && (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                            No payment history found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'classes' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Video Classes</h2>
                <p className="text-muted-foreground">Access your program video lectures.</p>
              </div>
              
              {(() => {
                const videoMaterials = materials.filter(m => ['video_class', 'Video Class'].includes(m.category));
                
                if (videoMaterials.length === 0) {
                  return (
                    <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 border-dashed">
                      <p className="text-muted-foreground">No video classes available for your program yet.</p>
                    </div>
                  );
                }

                // Default to first video if none selected
                const currentVideo = activeVideo || videoMaterials[0];
                const isYouTube = currentVideo.fileUrl && (currentVideo.fileUrl.includes('youtube.com') || currentVideo.fileUrl.includes('youtu.be'));

                return (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Player */}
                    <div className="lg:col-span-2 space-y-4">
                      <div className="bg-white dark:bg-slate-900 rounded-xl overflow-hidden shadow-sm border border-slate-100 dark:border-slate-800">
                        {isYouTube ? (
                          <div className="aspect-video w-full bg-slate-100">
                            <iframe 
                              width="100%" 
                              height="100%" 
                              src={currentVideo.fileUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')} 
                              title="YouTube video player" 
                              frameBorder="0" 
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                              allowFullScreen>
                            </iframe>
                          </div>
                        ) : (
                          <div className="aspect-video w-full bg-slate-900 flex items-center justify-center text-slate-400">
                             <p>Unsupported video format</p>
                          </div>
                        )}
                        <div className="p-6">
                          <h3 className="text-xl font-bold mb-2">{currentVideo.title}</h3>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                            <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">Semester {currentVideo.semester}</span>
                          </div>
                          
                          {isYouTube && (
                            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                              <p className="text-sm text-muted-foreground mb-3">If the video is unavailable due to playback restrictions, you can watch it directly on YouTube.</p>
                              <Button 
                                variant="outline" 
                                className="w-full sm:w-auto"
                                onClick={() => window.open(currentVideo.fileUrl, '_blank')}
                              >
                                <ExternalLink className="w-4 h-4 mr-2" /> Watch on YouTube
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Playlist / Classes List */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col h-[600px]">
                      <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                        <h3 className="font-bold text-lg">All Classes ({videoMaterials.length})</h3>
                      </div>
                      <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {videoMaterials.map(m => (
                          <div 
                            key={m.id}
                            onClick={() => setActiveVideo(m)}
                            className={`p-3 rounded-lg cursor-pointer transition-colors ${currentVideo.id === m.id ? 'bg-[#1A2B6D]/10 border border-[#1A2B6D]/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent'}`}
                          >
                            <h4 className={`font-medium text-sm line-clamp-2 ${currentVideo.id === m.id ? 'text-[#1A2B6D]' : ''}`}>
                              {m.title}
                            </h4>
                            <p className="text-xs text-muted-foreground mt-1">Semester {m.semester}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {activeTab === 'examination' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Examinations</h2>
                <p className="text-muted-foreground">Access your examinations.</p>
              </div>
              <div className="space-y-8">
                {renderMaterialsContent(['exam_subjective', 'Subjective Exam', 'exam_objective', 'Objective Exam'])}
              </div>
            </div>
          )}

          {activeTab === 'ebooks' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">E-Books</h2>
                <p className="text-muted-foreground">Download electronic books for your subjects.</p>
              </div>
              {renderMaterialsContent(['ebook', 'E-Book'])}
            </div>
          )}
          
          {['result', 'notice', 'schedule'].includes(activeTab) && (
            <div className="flex flex-col items-center justify-center h-[50vh] text-center">
              <div className="bg-white p-6 rounded-full shadow-sm mb-4">
                <LayoutDashboard className="h-10 w-10 text-[#1A2B6D] opacity-20" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Coming Soon</h2>
              <p className="text-muted-foreground max-w-sm mt-2">This module is currently under development and will be available soon.</p>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

// Simple check circle component since lucide icon was missing from imports
function CheckCircle(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
