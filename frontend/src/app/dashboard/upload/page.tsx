"use client";

import { useEffect, useState, useRef } from "react";
import { UploadCloud, FileText, Trash2, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import api from "@/services/api";

export default function UploadCenterPage() {
  const [files, setFiles] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    setLoading(true);
    try {
      const data = await api.documents.list();
      setFiles(data);
    } catch (e) {
      console.error("Failed to load documents", e);
    } finally {
      setLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      await uploadFile(droppedFiles[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      await uploadFile(selectedFiles[0]);
    }
  };

  const uploadFile = async (file: File) => {
    const allowedExtensions = [".pdf", ".docx", ".pptx"];
    const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    
    if (!allowedExtensions.includes(ext)) {
      setStatusMsg({
        type: "error",
        text: `Invalid file extension. Please upload PDF, DOCX, or PPTX files.`
      });
      return;
    }

    setUploading(true);
    setStatusMsg(null);

    try {
      await api.documents.upload(file);
      setStatusMsg({
        type: "success",
        text: `"${file.name}" uploaded successfully! Document is parsed and ready.`
      });
      loadFiles();
    } catch (e: any) {
      setStatusMsg({
        type: "error",
        text: e.message || "Failed to upload document"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.documents.delete(id);
      setFiles(files.filter(f => f._id !== id));
      setStatusMsg({
        type: "success",
        text: "Document deleted successfully."
      });
    } catch (e) {
      setStatusMsg({
        type: "error",
        text: "Failed to delete document."
      });
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="flex flex-col gap-6 text-white max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-white">Upload Center</h1>
        <p className="text-sm text-muted-text mt-0.5">Ingest study syllabus, notes, or previous exam papers to build the AI core vector index.</p>
      </div>

      {/* Status Messages */}
      {statusMsg && (
        <div className={`p-4 rounded-xl flex items-center gap-3 border ${
          statusMsg.type === "success" 
            ? "bg-success/10 border-success/30 text-success" 
            : "bg-danger/10 border-danger/30 text-danger"
        }`}>
          {statusMsg.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="text-xs font-semibold">{statusMsg.text}</span>
        </div>
      )}

      {/* Drag Zone */}
      <Card 
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className="border-dashed border-2 border-white/10 hover:border-primary-indigo/40 transition-colors"
      >
        <CardContent className="p-10 flex flex-col items-center justify-center text-center">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
            accept=".pdf,.docx,.pptx"
          />
          <div className="p-4 rounded-full bg-white/[0.03] border border-white/5 text-primary-indigo mb-4 animate-bounce">
            <UploadCloud className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-white text-base">Drag & Drop Syllabus or Notes Here</h3>
          <p className="text-xs text-muted-text mt-1 max-w-xs leading-relaxed">Supports PDF, Word (.docx), and PowerPoint (.pptx) up to 20MB</p>
          <Button 
            variant="primary" 
            size="sm" 
            className="mt-6 font-bold" 
            onClick={triggerFileInput}
            disabled={uploading}
          >
            {uploading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Parsing File...
              </>
            ) : (
              "Browse Local Files"
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Uploaded Documents List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between border-b border-white/[0.04] pb-4">
          <CardTitle>Ingested Documents</CardTitle>
          <span className="text-xs font-bold text-muted-text uppercase tracking-wider">{files.length} indexed files</span>
        </CardHeader>
        <CardContent className="p-6">
          {loading ? (
            <div className="text-center py-6 text-muted-text">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto" />
            </div>
          ) : files.length > 0 ? (
            <div className="flex flex-col gap-3">
              {files.map((file) => (
                <div 
                  key={file._id}
                  className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="p-2.5 rounded-lg bg-primary-indigo/10 border border-primary-indigo/20 text-primary-indigo shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-white truncate max-w-[250px] md:max-w-[400px]">{file.filename}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-muted-text uppercase font-bold">{file.file_type}</span>
                        <span className="w-1 h-1 rounded-full bg-white/20" />
                        <span className="text-[10px] text-muted-text">{formatBytes(file.file_size)}</span>
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-muted-text hover:text-danger p-2 h-fit"
                    onClick={() => handleDelete(file._id)}
                  >
                    <Trash2 className="w-4.5 h-4.5" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <p className="text-sm text-muted-text">No documents indexed yet. Drag a file above to begin.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
