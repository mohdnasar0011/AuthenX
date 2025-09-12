'use client';

import { useState, useActionState, useEffect, useRef, type ChangeEvent } from 'react';
import Image from 'next/image';
import {
  UploadCloud,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ScanLine,
  Database,
  ShieldAlert,
  FileText,
  BadgeCheck,
  FolderOpen,
  FileSearch,
  BookCheck,
  Info,
  Fingerprint,
  Loader,
  PlusCircle,
  QrCode,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { verifyCertificate, addToBlockchain, type VerificationState, type CertificateRecord } from '@/app/actions';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

const initialState: VerificationState = { error: 'empty' };

export function CertitrustClient() {
  const [state, formAction, isPending] = useActionState(verifyCertificate, initialState);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageDataUri, setImageDataUri] = useState<string>('');
  const formRef = useRef<HTMLFormElement>(null);


  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);

      const reader = new FileReader();
      reader.onload = () => {
        const dataUri = reader.result as string;
        setImageDataUri(dataUri);
      };
      reader.readAsDataURL(selectedFile);
    }
  };
  
  const handleReset = () => {
    setFile(null);
    setPreviewUrl(null);
    setImageDataUri('');
    if (formRef.current) {
        formRef.current.reset();
    }
    // A simple way to reset the action state without complex logic
    window.location.reload(); 
  }

  const showReport = state.verdict && previewUrl && !isPending;
  
  const renderContent = () => {
    if (isPending) return <VerificationProgress />;
    if (showReport) return <ReportView state={state} previewUrl={previewUrl} file={file} onReset={handleReset} />;
    return <UploadView formRef={formRef} handleFileChange={handleFileChange} previewUrl={previewUrl} imageDataUri={imageDataUri} file={file} error={state.error !== 'empty' ? state.error : undefined} />;
  }

  return (
    <>
      <Card className="w-full bg-card shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-3"><UploadCloud /> Upload Certificate</CardTitle>
        </CardHeader>
        <CardContent>
           <form action={formAction} ref={formRef}>
             {renderContent()}
           </form>
        </CardContent>
      </Card>

      {(isPending || showReport) && (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 mt-8">
            {showReport && state.details?.ocr && <OcrResultsView details={state.details} />}
            {showReport && <VerificationResultsView state={state} onReset={handleReset} />}
        </div>
      )}
    </>
  );
}

function UploadView({ formRef, handleFileChange, imageDataUri, file, error }: { formRef: React.RefObject<HTMLFormElement>, handleFileChange: (e: ChangeEvent<HTMLInputElement>) => void, previewUrl: string | null, imageDataUri: string, file: File | null, error?: string }) {
    return (
        <>
             <input type="hidden" name="imageDataUri" value={imageDataUri} />
            <div className="p-8 text-center border-2 border-dashed rounded-lg cursor-pointer bg-background/50 border-border hover:border-primary hover:bg-primary/5 transition-colors" onClick={() => document.getElementById(`fileInput`)?.click()}>
                <UploadCloud className="w-16 h-16 mx-auto mb-4 text-primary/80" />
                <h3 className="font-semibold text-foreground">Click to upload or drag and drop</h3>
                <p className="text-sm text-muted-foreground">Select a certificate file from your device</p>
                <p className="inline-block px-3 py-1 mt-4 text-xs rounded-full bg-primary/10 text-muted-foreground">Supported: PDF, JPG, PNG</p>
                <input type="file" id={`fileInput`} accept=".pdf,.jpg,.jpeg,.png" hidden onChange={handleFileChange} />
            </div>

            {file && (
                <div className="max-w-md p-3 mx-auto mt-4 border rounded-lg bg-background">
                    <div className="flex items-center space-x-3">
                        {file.type.startsWith('image/') ? (
                            <Image src={URL.createObjectURL(file)} alt="Preview" width={40} height={40} className="object-cover rounded" />
                        ) : (
                            <FileText className="w-10 h-10 text-muted-foreground" />
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold truncate">{file.name}</p>
                            <p className="text-sm text-muted-foreground">{((file.size ?? 0) / 1024).toFixed(2)} KB</p>
                        </div>
                    </div>
                </div>
            )}

            {error && (
                <Alert variant="destructive" className="mt-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Verification Failed</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <div className="flex justify-center mt-6">
                <Button type="submit" size="lg" disabled={!file}>
                     Verify Certificate
                </Button>
            </div>
        </>
    );
}

function VerificationProgress() {
    const steps = [
        { name: 'Uploading file...', icon: <FolderOpen /> },
        { name: 'Extracting text with OCR...', icon: <ScanLine /> },
        { name: 'Generating Shell ID...', icon: <Fingerprint /> },
        { name: 'Searching local Blockchain...', icon: <Database /> },
        { name: 'Comparing with DigiLocker records...', icon: <FileSearch /> },
        { name: 'Analyzing for tampering...', icon: <ShieldAlert /> },
    ];
    const [currentStep, setCurrentStep] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentStep(prev => {
                if (prev >= steps.length - 1) {
                    clearInterval(interval);
                    return prev;
                }
                return prev + 1;
            });
        }, 1200); 

        return () => clearInterval(interval);
    }, [steps.length]);

    return (
        <div className="w-full p-4 mx-auto">
            <h3 className="mb-4 text-lg font-semibold text-center text-foreground">Processing Certificate...</h3>
            <div className="h-2 mb-6 overflow-hidden rounded-full bg-muted">
                <div className="w-full h-full bg-gradient-to-r from-primary to-accent" style={{ animation: `progress ${steps.length * 1.2}s ease-in-out forwards` }}></div>
            </div>
            <div className="grid gap-3">
                {steps.map((step, index) => (
                    <div key={step.name} className={cn("flex items-center gap-4 p-3 text-sm rounded-md border transition-all",
                        index < currentStep && "bg-accent/10 border-accent/30",
                        index === currentStep && "bg-primary/10 border-primary/50",
                        index > currentStep && "bg-muted/50 border-border"
                    )}>
                        <div className="flex items-center justify-center w-6 h-6 text-primary">
                           {index < currentStep ? <CheckCircle className="text-accent" /> : step.icon}
                        </div>
                        <span className="font-medium">{step.name}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function OcrResultsView({ details }: { details: VerificationState['details'] }) {
  const [showRawJson, setShowRawJson] = useState(false);
  
  if (!details) return null;

  const { ocr: { data: ocrData } } = details;
  const ocrJson = JSON.stringify(ocrData, null, 2);

  return (
    <Card className="bg-card shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-3">
            <FileText /> OCR Extraction Results
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <OcrField label="Name" value={ocrData.name} />
            <OcrField label="Roll Number" value={ocrData.rollNumber} />
            <OcrField label="Certificate ID" value={ocrData.certificateId} />
            {ocrData.dateOfBirth && <OcrField label="Date of Birth" value={ocrData.dateOfBirth} />}
            {ocrData.fathersName && <OcrField label="Father's Name" value={ocrData.fathersName} />}
            {ocrData.mothersName && <OcrField label="Mother's Name" value={ocrData.mothersName} />}
        </div>
        <div className="grid grid-cols-1 gap-4 mt-4">
          {details.source.unverifiedShellId && <ShellIdView label="Unverified Shell ID" id={details.source.unverifiedShellId}/>}
          {details.source.verifiedShellId && <ShellIdView label="Verified Shell ID" id={details.source.verifiedShellId} match={details.source.unverifiedShellId === details.source.verifiedShellId} />}
        </div>
         <div className="mt-6">
            <Button variant="outline" onClick={() => setShowRawJson(!showRawJson)}>
                {showRawJson ? "Hide" : "Show"} Raw JSON
            </Button>
            {showRawJson && (
                <div className="p-3 mt-4 overflow-x-auto text-xs border rounded-md bg-background font-mono max-h-48">
                    <pre><code>{ocrJson}</code></pre>
                </div>
            )}
        </div>
      </CardContent>
    </Card>
  );
}

function OcrField({label, value}: {label: string, value: string | null | undefined}) {
    return (
        <div className="p-3 border rounded-md bg-background/50">
            <p className="text-xs tracking-wider uppercase text-muted-foreground">{label}</p>
            <p className="font-semibold text-foreground">{value || "Not found"}</p>
        </div>
    )
}

function ShellIdView({ label, id, match }: { label: string; id: string; match?: boolean }) {
  return (
    <div className="p-3 border rounded-md bg-background/50">
      <p className="text-xs tracking-wider uppercase text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2">
        <p className="font-mono text-xs text-foreground truncate">{id}</p>
        {match !== undefined && (match ? <CheckCircle className="w-4 h-4 text-accent" /> : <XCircle className="w-4 h-4 text-destructive" />)}
      </div>
    </div>
  );
}

function AddToBlockchainButton({ certificateData }: { certificateData: CertificateRecord }) {
    const { toast } = useToast();
    const [isAdding, setIsAdding] = useState(false);
    const [isAdded, setIsAdded] = useState(false);

    const handleClick = async () => {
        setIsAdding(true);
        const result = await addToBlockchain(certificateData);
        if (result.success) {
            toast({
                title: 'Success',
                description: result.message,
                variant: 'default',
            });
            setIsAdded(true);
        } else {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: result.message,
            });
        }
        setIsAdding(false);
    };

    if (isAdded) {
        return (
            <Button size="lg" disabled>
                <CheckCircle className="mr-2 h-4 w-4" />
                Added to Blockchain
            </Button>
        );
    }

    return (
        <Button size="lg" onClick={handleClick} disabled={isAdding}>
            {isAdding ? (
                <Loader className="mr-2 h-4 w-4 animate-spin" />
            ) : (
                <PlusCircle className="mr-2 h-4 w-4" />
            )}
            Add to Blockchain
        </Button>
    );
}

function VerificationResultsView({ state, onReset }: { state: VerificationState, onReset: () => void }) {
  if (!state.verdict || !state.details) return null;

  const verdictConfig = {
    Valid: {
      color: "hsl(var(--accent))",
      badgeClass: "bg-accent/20 text-accent border border-accent/50",
      message: "This certificate appears to be authentic and valid.",
      recommendations: ["This certificate is valid."]
    },
    Suspicious: {
      color: "hsl(var(--warning))",
      badgeClass: "bg-warning/20 text-warning border border-warning/50",
      message: "Some inconsistencies were found. Please review the details carefully.",
      recommendations: ["Manually verify the OCR results against the document.", "Check for visible signs of tampering on the image."]
    },
    Forged: {
      color: "hsl(var(--destructive))",
      badgeClass: "bg-destructive/20 text-destructive border border-destructive/50",
      message: "This certificate shows strong indications of being forged or altered.",
      recommendations: ["Do not trust this document.", "Report this certificate to the issuing authority if necessary."]
    },
  };
  const currentVerdict = verdictConfig[state.verdict];
  const trustScore = state.trustScore ?? 0;
  const circumference = 2 * Math.PI * 54;
  const strokeDashoffset = circumference - (trustScore / 100) * circumference;
  const sourceName = state.details.source.name;

  return (
    <Card className="bg-card shadow-lg">
        <CardHeader>
            <CardTitle className="text-xl flex items-center gap-3"><BadgeCheck /> Verification Results</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="grid items-center grid-cols-1 gap-6 md:grid-cols-2">
                <div className="relative w-32 h-32 mx-auto">
                    <svg className="w-full h-full" viewBox="0 0 120 120">
                        <circle cx="60" cy="60" r="54" fill="none" stroke="hsl(var(--border))" strokeWidth="12"/>
                        <circle cx="60" cy="60" r="54" fill="none" stroke={currentVerdict.color} strokeWidth="12" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} transform="rotate(-90 60 60)" className="transition-[stroke-dashoffset] duration-1000 ease-out"/>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-bold text-foreground">{trustScore}</span>
                        <span className="text-xs uppercase text-muted-foreground">Trust Score</span>
                    </div>
                </div>

                <div>
                    <Badge className={cn("text-sm font-bold uppercase", currentVerdict.badgeClass)}>{state.verdict}</Badge>
                    <p className="mt-2 text-muted-foreground">{currentVerdict.message}</p>
                    {sourceName !== 'None' && (
                        <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                            {sourceName === 'Blockchain' ? <Database className="w-4 h-4 text-primary" /> : <BookCheck className="w-4 h-4 text-blue-400" />}
                            <span>Verified against <span className="font-semibold text-foreground">{sourceName}</span> record.</span>
                        </div>
                    )}
                    <div className="flex flex-wrap gap-2 mt-3">
                        <MatchBadge label="Shell ID Match" match={state.details.source.verifiedShellId === state.details.source.unverifiedShellId} />
                        <MatchBadge label="On Blockchain" match={state.details.blockchain.verified} />
                        <MatchBadge label="Forgery Test" match={state.details.tampering.score < 0.5} />
                    </div>
                </div>
            </div>
            
            <div className="p-4 mt-6 border rounded-lg bg-background/30">
                 <h4 className="font-semibold flex items-center gap-2"><Info className="w-5 h-5 text-blue-400"/> AI Analysis</h4>
                 <p className="mt-2 text-sm text-muted-foreground">{state.details.tampering.explanation}</p>
            </div>

            <div className="p-4 mt-4 border rounded-lg bg-background/30">
                 <h4 className="font-semibold text-primary">📌 Recommendations</h4>
                 <ul className="mt-2 ml-4 text-sm list-disc list-inside text-muted-foreground">
                    {currentVerdict.recommendations.map(rec => <li key={rec}>{rec}</li>)}
                 </ul>
            </div>
            
             <div className="flex flex-col items-center gap-4 mt-6 sm:flex-row sm:justify-center">
                <Button onClick={onReset} variant="outline" size="lg">Verify Another</Button>
                 {state.verdict === 'Valid' && !state.details.blockchain.verified && (
                    <AddToBlockchainButton certificateData={state.details.ocr.data} />
                )}
            </div>
        </CardContent>
    </Card>
  );
}

function MatchBadge({label, match}: {label: string, match: boolean}) {
    return (
        <Badge variant="outline" className={cn("text-xs border-dashed", match ? "text-accent/80 border-accent/50" : "text-destructive/80 border-destructive/50")}>
            {match ? <CheckCircle className="w-3 h-3 mr-1"/> : <XCircle className="w-3 h-3 mr-1" />}
            {label}: {match ? "Pass" : "Fail"}
        </Badge>
    );
}

function ReportView({ state, previewUrl, file, onReset }: { state: VerificationState, previewUrl: string, file: File | null, onReset: () => void}) {
     if (!state.verdict || !state.details) return null;
    return (
        <div className="p-4 space-y-4 text-center border-2 border-dashed rounded-lg border-border">
            {previewUrl && file?.type.startsWith('image/') && (
                <div className="relative w-full mx-auto overflow-hidden rounded-lg shadow-md aspect-video max-w-lg">
                    <Image src={previewUrl} alt="Certificate preview" fill style={{objectFit: 'contain'}} />
                </div>
            )}
             {previewUrl && file?.type === 'application/pdf' && (
                 <div className="flex items-center justify-center p-4 space-x-4 border rounded-lg max-w-lg mx-auto bg-background">
                    <FileText className="w-10 h-10 text-muted-foreground" />
                    <div>
                        <p className="font-semibold">{file?.name}</p>
                        <p className="text-sm text-muted-foreground">{((file?.size ?? 0) / 1024).toFixed(2)} KB</p>
                    </div>
                </div>
            )}
        </div>
    )
}
