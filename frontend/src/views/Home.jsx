import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Zap, Folder, MoreVertical } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import ConfirmDialog from '../components/ConfirmDialog';
import { useProjectStore } from '../stores/projectStore';
import { useUISize } from '../hooks/useUISize';
import { useTranslation } from '../hooks/useTranslation';

function Home() {
  const navigate = useNavigate();
  const { text, spacing, button, input, card } = useUISize();
  const { projects, loading, fetchProjects, createProject, updateProject, deleteProject } = useProjectStore();
  const { t } = useTranslation();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [newProject, setNewProject] = useState({ name: '', description: '' });
  const [editProject, setEditProject] = useState({ id: null, name: '', description: '' });

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const handleCreateProject = async () => {
    if (!newProject.name.trim()) return;
    
    try {
      const project = await createProject(newProject);
      setShowCreateDialog(false);
      setNewProject({ name: '', description: '' });
      navigate(`/project/${project.id}`);
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  const handleCancelCreate = () => {
    setShowCreateDialog(false);
    setNewProject({ name: '', description: '' });
  };

  const handleShowProjectMenu = (project, event) => {
    setSelectedProject(project);
    setMenuPosition({ x: event.clientX, y: event.clientY });
    setShowMenu(true);
  };

  const handleEditProject = () => {
    if (!selectedProject) return;
    
    setEditProject({
      id: selectedProject.id,
      name: selectedProject.name,
      description: selectedProject.description || ''
    });
    setShowMenu(false);
    setShowEditDialog(true);
  };

  const handleUpdateProject = async () => {
    if (!editProject.name.trim()) return;
    
    try {
      await updateProject(editProject.id, {
        name: editProject.name,
        description: editProject.description
      });
      setShowEditDialog(false);
      setEditProject({ id: null, name: '', description: '' });
      setSelectedProject(null);
    } catch (error) {
      console.error('Failed to update project:', error);
    }
  };

  const handleCancelEdit = () => {
    setShowEditDialog(false);
    setEditProject({ id: null, name: '', description: '' });
  };

  const handleDeleteProject = () => {
    if (!selectedProject) return;
    
    setShowMenu(false);
    setShowConfirmDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedProject) return;
    
    try {
      await deleteProject(selectedProject.id);
      setSelectedProject(null);
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  };

  const handleMenuClose = () => {
    setShowMenu(false);
  };

  return (
    <div className="w-full">
      {/* Empty State or Project List */}
      {projects.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center h-full py-20">
          <div className="text-center space-y-6 max-w-md">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <Zap className="h-8 w-8 text-primary" />
            </div>
            
            <div className="space-y-2">
              <h1 className={`${text('2xl')} font-semibold text-foreground`}>{t('app.welcome')}</h1>
              <p className={`${text('base')} text-muted-foreground`}>
                {t('app.welcomeDescription')}
              </p>
            </div>

            <Button onClick={() => setShowCreateDialog(true)} className={`mt-6 ${button}`}>
              <Plus className="h-4 w-4 mr-2" />
              {t('project.create')}
            </Button>
          </div>
        </div>
      )}

      {/* Projects Grid */}
      {(projects.length > 0 || loading) && (
        <div className={spacing(6)}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className={`${text('2xl')} font-semibold text-foreground`}>{t('common.projects')}</h1>
              <p className={`${text('base')} text-muted-foreground`}>{t('project.allProjects')}</p>
            </div>
          </div>

          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, n) => (
                <div key={n} className="animate-pulse">
                  <div className="bg-muted rounded-lg h-32"></div>
                </div>
              ))}
            </div>
          )}

          {!loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className={`group relative ${card} hover:shadow-md transition-all cursor-pointer hover:border-border/80 border border-border rounded-lg p-4`}
                  onClick={() => navigate(`/project/${project.id}`)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Folder className="h-5 w-5 text-primary" />
                    </div>
                    
                    <button
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-muted rounded transition-all"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShowProjectMenu(project, e);
                      }}
                    >
                      <MoreVertical className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    <h3 className={`${text('base')} font-medium text-foreground group-hover:text-primary transition-colors`}>
                      {project.name}
                    </h3>
                    <p className={`${text('sm')} text-muted-foreground line-clamp-2`}>
                      {project.description || 'No description provided'}
                    </p>
                    <p className={`${text('xs')} text-muted-foreground`}>
                      Created {formatDate(project.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Project Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="bg-card p-6 rounded-lg shadow-lg border border-border w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">{t('project.create')}</h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">{t('project.projectName')}</label>
                <Input
                  value={newProject.name}
                  onChange={(e) => setNewProject({...newProject, name: e.target.value})}
                  placeholder={t('project.projectNamePlaceholder')}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">{t('project.projectDescription')}</label>
                <Textarea
                  value={newProject.description}
                  onChange={(e) => setNewProject({...newProject, description: e.target.value})}
                  placeholder={t('project.projectDescriptionPlaceholder')}
                  className="w-full"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 mt-6">
              <Button variant="ghost" onClick={handleCancelCreate}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleCreateProject} disabled={!newProject.name.trim()}>
                {t('common.create')} {t('common.project')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Project Dialog */}
      {showEditDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="bg-card p-6 rounded-lg shadow-lg border border-border w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">{t('common.edit')} {t('common.project')}</h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">{t('project.projectName')}</label>
                <Input
                  value={editProject.name}
                  onChange={(e) => setEditProject({...editProject, name: e.target.value})}
                  placeholder={t('project.projectNamePlaceholder')}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">{t('project.projectDescription')}</label>
                <Textarea
                  value={editProject.description}
                  onChange={(e) => setEditProject({...editProject, description: e.target.value})}
                  placeholder={t('project.projectDescriptionPlaceholder')}
                  className="w-full"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 mt-6">
              <Button variant="ghost" onClick={handleCancelEdit}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleUpdateProject} disabled={!editProject.name.trim()}>
                {t('common.save')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Project Actions Menu */}
      {showMenu && (
        <div className="fixed inset-0 z-50" onClick={handleMenuClose}>
          <div 
            className="absolute bg-card border border-border rounded-md shadow-lg py-1 min-w-[120px]"
            style={{ left: menuPosition.x + 'px', top: menuPosition.y + 'px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="w-full px-3 py-2 text-sm text-left hover:bg-muted transition-colors"
              onClick={handleEditProject}
            >
              {t('common.edit')} {t('common.project')}
            </button>
            <button
              className="w-full px-3 py-2 text-sm text-left hover:bg-muted text-destructive transition-colors"
              onClick={handleDeleteProject}
            >
              {t('project.deleteProject')}
            </button>
          </div>
        </div>
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={handleConfirmDelete}
        title={t('project.deleteProject')}
        message={`${t('project.deleteProjectConfirm')} "${selectedProject?.name}"?`}
        confirmText={t('common.delete')}
        variant="danger"
      />
    </div>
  );
}

export default Home;