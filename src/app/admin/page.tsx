'use client';
import { useState, useActionState, useRef, type ChangeEvent } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { UploadCloud, FileJson, CheckCircle, AlertTriangle, Loader } from 'lucide-react';
import { addDigilockerRecords } from '@/app/actions';

const initialState = { success: false, message: '' };

export default function AdminPage() {
  const [state, formAction, isPending] = useActionState(addDigilockerRecords, initialState);
  const [file, setFile] = useState<File | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/json') {
      setFile(selectedFile);
    } else {
      setFile(null);
      alert('Please select a valid JSON file.');
    }
  };

  const resetForm = () => {
    setFile(null);
    if(formRef.current) {
        formRef.current.reset();
    }
  }

  return (
    <div className="main-container">
      <Card className="max-w-4xl mx-auto bg-card shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-3">
            <UploadCloud /> Admin Dashboard
          </CardTitle>
           <CardDescription>
            Manage institutional records by uploading them in bulk.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground mb-4">
              Upload a JSON file containing an array of DigiLocker certificate records. The new records will be appended to the existing database.
            </p>
            <form action={formAction} ref={formRef} className="space-y-6">
              <div>
                <label htmlFor="json-upload" className="block text-sm font-medium text-foreground mb-2">
                  JSON File
                </label>
                <Input
                  id="json-upload"
                  name="jsonFile"
                  type="file"
                  accept="application/json"
                  onChange={handleFileChange}
                  required
                  className="file:text-primary file:font-semibold"
                />
              </div>

              {file && (
                <div className="p-3 border rounded-lg bg-background flex items-center space-x-3">
                  <FileJson className="w-8 h-8 text-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{file.name}</p>
                    <p className="text-sm text-muted-foreground">{(file.size / 1024).toFixed(2)} KB</p>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button type="submit" size="lg" disabled={!file || isPending}>
                  {isPending ? (
                    <>
                      <Loader className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    'Upload Records'
                  )}
                </Button>
              </div>
            </form>
            
            {state.message && !isPending && (
              <Alert variant={state.success ? 'default' : 'destructive'} className={`mt-6 ${state.success ? 'border-accent' : ''}`}>
                {state.success ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                <AlertTitle>{state.success ? 'Success' : 'Error'}</AlertTitle>
                <AlertDescription>{state.message}</AlertDescription>
              </Alert>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
