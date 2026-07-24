import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  GraduationCap, 
  BookOpen, 
  Download, 
  FileText, 
  ClipboardList, 
  LogOut, 
  MapPin, 
  School,
  FileDown
} from 'lucide-react';
import { toast } from 'sonner';

export function ModernStudentDashboard({ initialTab, onNavigate }: { initialTab?: string, onNavigate?: (tab: string) => void }) {
  const { logout } = useAuth();
  const [student, setStudent] = useState<any>(null);
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSemester, setSelectedSemester] = useState<string>('1');

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

  const handleDownload = (m: any) => {
    const apiBase = import.meta.env.VITE_API_URL || '/api/v1';
    const serverUrl = apiBase.replace('/api/v1', '');
    const url = m.fileUrl.startsWith('http') ? m.fileUrl : `${serverUrl}${m.fileUrl}`;
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
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
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

  const program = student.program;
  const totalSemesters = program?.duration ? program.duration * 2 : 1;
  const semesterList = Array.from({ length: totalSemesters }, (_, i) => (i + 1).toString());

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'syllabus':
        return <FileText className="w-5 h-5 text-indigo-500" />;
      case 'question_paper':
        return <ClipboardList className="w-5 h-5 text-amber-500" />;
      default:
        return <BookOpen className="w-5 h-5 text-emerald-500" />;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'syllabus':
        return 'Syllabus';
      case 'question_paper':
        return 'Question Paper';
      default:
        return 'Study Material';
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 pb-12">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-primary" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight">Student Portal</span>
              <span className="hidden sm:inline-block ml-2 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full border">
                v1.0
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:block text-right">
              <p className="text-sm font-medium">{student.name}</p>
              <p className="text-xs text-muted-foreground">{student.enrollmentNo}</p>
            </div>
            <Button variant="outline" size="sm" onClick={logout} className="gap-2">
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Welcome Section */}
      <section className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold tracking-tight">Welcome back, {student.name}!</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Access your academic resources, syllabus, and study materials here.
          </p>
        </div>
      </section>

      {/* Main Grid Content */}
      <main className="container mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Academic & Center Details */}
        <div className="space-y-6">
          <Card className="border-none shadow-xl bg-card/60 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-lg">Academic Profile</CardTitle>
              <CardDescription>Your registered details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <School className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Enrolled Program</p>
                  <p className="font-semibold text-sm">{program?.name || 'N/A'}</p>
                  {program?.code && (
                    <Badge variant="secondary" className="mt-1">
                      {program.code}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Study Center</p>
                  <p className="font-semibold text-sm">{student.center?.name || 'N/A'}</p>
                  {student.center?.code && (
                    <span className="text-xs text-muted-foreground mt-0.5 block">Code: {student.center.code}</span>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Enrollment No:</span>
                  <span className="font-medium">{student.enrollmentNo}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Registered Email:</span>
                  <span className="font-medium">{student.email}</span>
                </div>
                {student.phone && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Phone Number:</span>
                    <span className="font-medium">{student.phone}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Program Duration:</span>
                  <span className="font-medium">{program?.duration || 0} Years</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Semesters & Materials */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none shadow-xl">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>Study Materials</CardTitle>
                <CardDescription>Select a semester to download files</CardDescription>
              </div>
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 self-start sm:self-center">
                Active Session
              </Badge>
            </CardHeader>
            <CardContent>
              {totalSemesters > 0 ? (
                <Tabs value={selectedSemester} onValueChange={setSelectedSemester} className="space-y-6">
                  <TabsList className="flex flex-wrap gap-1 bg-muted p-1 h-auto justify-start">
                    {semesterList.map((sem) => (
                      <TabsTrigger key={sem} value={sem} className="py-1.5 px-3">
                        Semester {sem}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {semesterList.map((sem) => {
                    const filteredMaterials = materials.filter(
                      (m) => m.semesterNumber === sem
                    );

                    return (
                      <TabsContent key={sem} value={sem} className="space-y-4 outline-none">
                        {filteredMaterials.length === 0 ? (
                          <div className="text-center py-12 border border-dashed rounded-xl bg-muted/10">
                            <FileDown className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                            <p className="font-semibold text-muted-foreground">No Materials Available</p>
                            <p className="text-xs text-muted-foreground/80 mt-1 max-w-sm mx-auto">
                              No study materials, syllabus, or question papers have been uploaded for Semester {sem} yet.
                            </p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filteredMaterials.map((m) => (
                              <div
                                key={m.id}
                                className="flex items-start justify-between p-4 border rounded-xl hover:bg-muted/30 transition-all duration-200 group"
                              >
                                <div className="flex gap-3">
                                  <div className="p-2.5 rounded-lg bg-background border mt-0.5">
                                    {getCategoryIcon(m.category)}
                                  </div>
                                  <div className="space-y-1">
                                    <h4 className="font-semibold text-sm line-clamp-1 leading-snug">
                                      {m.title}
                                    </h4>
                                    {m.description && (
                                      <p className="text-xs text-muted-foreground line-clamp-1">
                                        {m.description}
                                      </p>
                                    )}
                                    <div className="flex flex-wrap gap-2 pt-1.5">
                                      <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4">
                                        {getCategoryLabel(m.category)}
                                      </Badge>
                                      {m.uploader?.name && (
                                        <span className="text-[10px] text-muted-foreground">
                                          By {m.uploader.name}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDownload(m)}
                                  className="rounded-full opacity-60 hover:opacity-100 group-hover:bg-primary/10 group-hover:text-primary transition-all shrink-0"
                                  title="Download File"
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </TabsContent>
                    );
                  })}
                </Tabs>
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground text-sm">No semesters found in your program structure.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
