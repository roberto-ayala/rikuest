import React, { useState, useRef } from 'react';
import { X, Upload, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from './ui/Button';
import { useUISize } from '../hooks/useUISize';
import { useTranslation } from '../hooks/useTranslation';
import { useRequestStore } from '../stores/requestStore';
import { useFolderStore } from '../stores/folderStore';
import { parseOpenAPI, convertToRequests } from '../utils/OpenAPIImporter';

const OpenAPIImportModal = ({ isOpen, onClose, projectId }) => {
  const { text, spacing, button } = useUISize();
  const { t } = useTranslation();
  const { createRequest, fetchRequests } = useRequestStore();
  const { createFolder, fetchFolders } = useFolderStore();
  const fileInputRef = useRef(null);
  
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);
  const [selectedEndpoints, setSelectedEndpoints] = useState(new Set());
  const [createFoldersFromTags, setCreateFoldersFromTags] = useState(true);
  const [importing, setImporting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const processFile = async (file) => {
    if (!file) return;

    setFile(file);
    setError(null);
    setLoading(true);
    setPreview(null);
    setSelectedEndpoints(new Set());

    try {
      const fileContent = await file.text();
      const parsed = await parseOpenAPI(fileContent);
      const requests = convertToRequests(parsed, projectId);
      
      if (requests.length === 0) {
        throw new Error(t('openapi.errors.noEndpoints'));
      }
      
      setPreview({
        info: parsed.info || {},
        requests: requests,
        total: requests.length
      });
      
      // Select all by default
      setSelectedEndpoints(new Set(requests.map((_, idx) => idx)));
    } catch (err) {
      setError(err.message || t('openapi.errors.parseFailed'));
      setFile(null);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    await processFile(selectedFile);
  };

  const handleImport = async () => {
    if (!preview || selectedEndpoints.size === 0) return;

    setImporting(true);
    setError(null);

    try {
      const requestsToImport = preview.requests.filter((_, idx) => 
        selectedEndpoints.has(idx)
      );

      // Create folders from tags if enabled
      const folderMap = new Map();
      if (createFoldersFromTags) {
        const tags = new Set();
        requestsToImport.forEach(req => {
          if (req.tag) tags.add(req.tag);
        });

        for (const tag of tags) {
          try {
            const folder = await createFolder({
              project_id: projectId,
              name: tag,
              parent_id: null
            });
            folderMap.set(tag, folder.id);
          } catch (folderError) {
            // Folder might already exist, continue
            console.warn(`Failed to create folder for tag "${tag}":`, folderError);
          }
        }
      }

      // Create requests
      let successCount = 0;
      let errorCount = 0;
      
      for (const request of requestsToImport) {
        try {
          const folderId = request.tag && folderMap.has(request.tag) 
            ? folderMap.get(request.tag) 
            : null;
          
          // Remove tag from request object before creating
          const { tag, ...requestData } = request;
          
          await createRequest({
            ...requestData,
            folder_id: folderId
          });
          successCount++;
        } catch (reqError) {
          console.error('Failed to create request:', reqError);
          errorCount++;
        }
      }

      // Refresh data
      await fetchRequests(projectId);
      await fetchFolders(projectId);

      // Show success message
      if (successCount > 0) {
        // Close modal on success
        onClose();
        // Reset state
        setFile(null);
        setPreview(null);
        setSelectedEndpoints(new Set());
      } else {
        setError(t('openapi.errors.importPartialFailed').replace('{count}', errorCount));
      }
    } catch (err) {
      setError(err.message || t('openapi.errors.importFailed'));
    } finally {
      setImporting(false);
    }
  };

  const toggleEndpoint = (idx) => {
    const newSet = new Set(selectedEndpoints);
    if (newSet.has(idx)) {
      newSet.delete(idx);
    } else {
      newSet.add(idx);
    }
    setSelectedEndpoints(newSet);
  };

  const toggleAll = () => {
    if (selectedEndpoints.size === preview.requests.length) {
      setSelectedEndpoints(new Set());
    } else {
      setSelectedEndpoints(new Set(preview.requests.map((_, idx) => idx)));
    }
  };

  const handleClose = () => {
    if (!importing) {
      setFile(null);
      setPreview(null);
      setSelectedEndpoints(new Set());
      setError(null);
      setIsDragging(false);
      onClose();
    }
  };

  // Drag and drop handlers
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set dragging to false if we're leaving the drop zone
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles && droppedFiles.length > 0) {
      const file = droppedFiles[0];
      // Check file extension
      const fileName = file.name.toLowerCase();
      if (fileName.endsWith('.json') || fileName.endsWith('.yaml') || fileName.endsWith('.yml')) {
        await processFile(file);
      } else {
        setError(t('openapi.errors.invalidFormat'));
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div 
        className="bg-card p-6 rounded-lg shadow-lg border border-border w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <h2 className={`${text('xl')} font-semibold text-foreground`}>
            {t('openapi.title')}
          </h2>
          <button 
            onClick={handleClose} 
            className="text-muted-foreground hover:text-foreground transition-colors"
            disabled={importing}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {!preview ? (
            <div className="space-y-4">
              <div 
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
                  isDragging 
                    ? 'border-primary bg-primary/5 scale-105' 
                    : 'border-border hover:border-primary/50'
                }`}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <Upload className={`h-12 w-12 mx-auto mb-4 transition-colors ${
                  isDragging ? 'text-primary' : 'text-muted-foreground'
                }`} />
                <p className={`${text('sm')} mb-4 transition-colors ${
                  isDragging ? 'text-primary font-medium' : 'text-muted-foreground'
                }`}>
                  {isDragging ? t('openapi.dropFile') || 'Drop file here' : t('openapi.selectFile')}
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,.yaml,.yml"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="openapi-file"
                  disabled={loading}
                />
                <Button 
                  type="button"
                  variant="outline" 
                  disabled={loading}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (fileInputRef.current && !loading) {
                      fileInputRef.current.click();
                    }
                  }}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t('openapi.parsing')}
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      {t('openapi.chooseFile')}
                    </>
                  )}
                </Button>
              </div>
              {error && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start">
                  <AlertCircle className="h-5 w-5 text-destructive mr-2 flex-shrink-0 mt-0.5" />
                  <p className={`${text('sm')} text-destructive flex-1`}>{error}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <h3 className={`${text('lg')} font-semibold mb-2 text-foreground`}>
                  {preview.info?.title || t('openapi.specification')}
                </h3>
                {preview.info?.description && (
                  <p className={`${text('sm')} text-muted-foreground mb-2`}>
                    {preview.info.description}
                  </p>
                )}
                <div className="flex items-center gap-4 mt-2">
                  <p className={`${text('xs')} text-muted-foreground`}>
                    {t('openapi.version')}: {preview.info?.version || 'N/A'}
                  </p>
                  <p className={`${text('xs')} text-muted-foreground`}>
                    {t('openapi.endpoints')}: {preview.total}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="create-folders"
                  checked={createFoldersFromTags}
                  onChange={(e) => setCreateFoldersFromTags(e.target.checked)}
                  className="rounded border-border"
                  disabled={importing}
                />
                <label 
                  htmlFor="create-folders" 
                  className={`${text('sm')} text-foreground cursor-pointer`}
                >
                  {t('openapi.createFoldersFromTags')}
                </label>
              </div>

              <div className="flex items-center justify-between mb-2">
                <p className={`${text('sm')} font-medium text-foreground`}>
                  {t('openapi.selectEndpoints')} ({selectedEndpoints.size} {t('openapi.selected')} {preview.requests.length})
                </p>
                <button
                  onClick={toggleAll}
                  className={`${text('xs')} text-primary hover:underline`}
                  disabled={importing}
                >
                  {selectedEndpoints.size === preview.requests.length ? t('openapi.deselectAll') : t('openapi.selectAll')}
                </button>
              </div>

              <div className="border border-border rounded-lg max-h-64 overflow-y-auto">
                <div className="divide-y divide-border">
                  {preview.requests.map((req, idx) => (
                    <div
                      key={idx}
                      className={`p-3 flex items-center space-x-3 hover:bg-muted/50 cursor-pointer transition-colors ${
                        selectedEndpoints.has(idx) ? 'bg-primary/5' : ''
                      }`}
                      onClick={() => !importing && toggleEndpoint(idx)}
                    >
                      <input
                        type="checkbox"
                        checked={selectedEndpoints.has(idx)}
                        onChange={() => toggleEndpoint(idx)}
                        className="rounded border-border"
                        onClick={(e) => e.stopPropagation()}
                        disabled={importing}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className={`${text('xs')} font-mono px-2 py-0.5 rounded bg-primary/10 text-primary font-semibold`}>
                            {req.method}
                          </span>
                          <span className={`${text('sm')} font-medium text-foreground truncate`}>
                            {req.name}
                          </span>
                          {req.tag && (
                            <span className={`${text('xs')} px-2 py-0.5 rounded bg-muted text-muted-foreground`}>
                              {req.tag}
                            </span>
                          )}
                        </div>
                        <p className={`${text('xs')} text-muted-foreground truncate font-mono`}>
                          {req.url}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {error && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start">
                  <AlertCircle className="h-5 w-5 text-destructive mr-2 flex-shrink-0 mt-0.5" />
                  <p className={`${text('sm')} text-destructive flex-1`}>{error}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {preview && (
          <div className="flex justify-end space-x-2 mt-4 pt-4 border-t border-border flex-shrink-0">
            <Button 
              variant="ghost" 
              onClick={handleClose}
              disabled={importing}
            >
              {t('common.cancel')}
            </Button>
            <Button 
              onClick={handleImport}
              disabled={importing || selectedEndpoints.size === 0}
            >
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('openapi.importing')}
                </>
              ) : (
                selectedEndpoints.size === 1 
                  ? t('openapi.importButton').replace('{count}', selectedEndpoints.size)
                  : t('openapi.importButtonPlural').replace('{count}', selectedEndpoints.size)
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default OpenAPIImportModal;

