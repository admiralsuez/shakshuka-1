"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Download, Trash2, RefreshCw, Eye, EyeOff } from "lucide-react";
import { getDeveloperLogger, type LogEntry } from "@/lib/developer-logger";

interface DeveloperLogViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeveloperLogViewer({ open, onOpenChange }: DeveloperLogViewerProps) {
  const [logs, setLogs] = useState<{ current: LogEntry[]; previous: LogEntry[] }>({
    current: [],
    previous: [],
  });
  const [showPreviousSession, setShowPreviousSession] = useState(true);
  const [showCurrentSession, setShowCurrentSession] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const logger = getDeveloperLogger();

  const refreshLogs = () => {
    setLogs(logger.getAllLogs());
  };

  useEffect(() => {
    if (open) {
      refreshLogs();
      
      if (autoRefresh) {
        const interval = setInterval(refreshLogs, 1000); // Refresh every second
        return () => clearInterval(interval);
      }
    }
  }, [open, autoRefresh]);

  const handleExport = () => {
    logger.downloadLogsAsFile();
  };

  const handleClearCurrent = () => {
    logger.clearCurrentSession();
    refreshLogs();
  };

  const handleClearPrevious = () => {
    logger.clearPreviousSession();
    refreshLogs();
  };

  const handleClearAll = () => {
    logger.clearAllLogs();
    refreshLogs();
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getLogLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'error': return 'destructive';
      case 'warn': return 'secondary';
      case 'info': return 'default';
      case 'debug': return 'outline';
      default: return 'default';
    }
  };

  const renderLogEntry = (log: LogEntry, index: number) => (
    <div key={`${log.sessionId}-${index}`} className="py-2 px-3 border-b border-border/50 last:border-b-0">
      <div className="flex items-start gap-2">
        <Badge variant={getLogLevelColor(log.level)} className="text-xs shrink-0">
          {log.level.toUpperCase()}
        </Badge>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-muted-foreground mb-1">
            {formatTimestamp(log.timestamp)}
          </div>
          <div className="text-sm font-mono break-words">
            {log.message}
          </div>
          {log.args && log.args.length > 0 && (
            <div className="mt-1 text-xs text-muted-foreground">
              <details>
                <summary className="cursor-pointer hover:text-foreground">Additional Args</summary>
                <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-x-auto">
                  {log.args.map((arg, i) => (
                    <div key={i}>
                      [{i}]: {typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)}
                    </div>
                  ))}
                </pre>
              </details>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Developer Logs
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshLogs}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export to TXT
          </Button>

          <Separator orientation="vertical" className="h-6" />

          <Button
            variant="outline"
            size="sm"
            onClick={handleClearCurrent}
            disabled={logs.current.length === 0}
          >
            Clear Current
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearPrevious}
            disabled={logs.previous.length === 0}
          >
            Clear Previous
          </Button>
          
          <Button
            variant="destructive"
            size="sm"
            onClick={handleClearAll}
            disabled={logs.current.length === 0 && logs.previous.length === 0}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Clear All
          </Button>

          <Separator orientation="vertical" className="h-6" />

          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
            Auto Refresh
          </Button>
        </div>

        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="space-y-4">
              {/* Previous Session */}
              {showPreviousSession && logs.previous.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center justify-between">
                      <span>Previous Session ({logs.previous.length} entries)</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowPreviousSession(!showPreviousSession)}
                      >
                        {showPreviousSession ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-64">
                      {logs.previous.map((log, index) => renderLogEntry(log, index))}
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}

              {/* Current Session */}
              {showCurrentSession && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center justify-between">
                      <span>Current Session ({logs.current.length} entries)</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowCurrentSession(!showCurrentSession)}
                      >
                        {showCurrentSession ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-64">
                      {logs.current.length > 0 ? (
                        logs.current.map((log, index) => renderLogEntry(log, index))
                      ) : (
                        <div className="p-4 text-center text-muted-foreground">
                          No logs captured yet
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}

              {/* Show toggle buttons if sessions are hidden */}
              {(!showPreviousSession || !showCurrentSession) && (
                <div className="flex gap-2 justify-center">
                  {!showPreviousSession && logs.previous.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPreviousSession(true)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Show Previous Session ({logs.previous.length})
                    </Button>
                  )}
                  {!showCurrentSession && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCurrentSession(true)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Show Current Session ({logs.current.length})
                    </Button>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground pt-2 border-t">
          <div>
            Total: {logs.current.length + logs.previous.length} entries
          </div>
          <div>
            Auto-refresh: {autoRefresh ? 'ON' : 'OFF'}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
