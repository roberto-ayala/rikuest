import React, { useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { Plus, Zap, Settings } from 'lucide-react';
import { Button } from './components/ui/Button';
import { Input } from './components/ui/Input';
import { Textarea } from './components/ui/Textarea';
import { useProjectStore } from './stores/projectStore';
import { useUIStore } from './stores/uiStore';
import { useUISize } from './hooks/useUISize';
import { useBackgroundColor } from './hooks/useBackgroundColor';
import { useTranslation } from './hooks/useTranslation';
import ThemeSelector from './components/ThemeSelector';
import LanguageSelector from './components/LanguageSelector';
import SettingsModal from './components/SettingsModal';
import Home from './views/Home';
import Project from './views/Project';

function App() {
  const navigate = useNavigate();
  const createProject = useProjectStore(state => state.createProject);
  const layout = useUIStore(state => state.layout);
  const { text, spacing, button, input, icon, iconButton, headerButton } = useUISize();
  const { t } = useTranslation();
  
  // Apply background colors
  useBackgroundColor();
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    description: ''
  });

  const handleCreateProject = async () => {
    if (!newProject.name.trim()) return;
    
    try {
      const project = await createProject(newProject);
      setShowNewProjectDialog(false);
      setNewProject({ name: '', description: '' });
      navigate(`/project/${project.id}`);
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  const handleCancelNewProject = () => {
    setShowNewProjectDialog(false);
    setNewProject({ name: '', description: '' });
  };

  return (
    <div className="h-screen text-foreground flex flex-col">
      {layout === 'default' ? (
        <>
          {/* Default Layout - Full Header */}
          <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
            <div className={`flex h-14 items-center ${spacing(4)}`}>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                    <Zap className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <h1 className={`font-semibold ${text('lg')}`}>Rikuest</h1>
                </div>
              </div>
              
              <div className="ml-auto flex items-center space-x-2">
                <Button onClick={() => setShowNewProjectDialog(true)} className={`${headerButton} ${text('sm')}`}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('navigation.newProject')}
                </Button>
                <ThemeSelector />
                <LanguageSelector />
                <Button 
                  variant="ghost"
                  onClick={() => setShowSettingsModal(true)} 
                  className={`${iconButton} bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground`}
                  title={t('common.settings')}
                >
                  <Settings className={icon} />
                </Button>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <div className="flex-1 flex overflow-hidden w-full min-h-0">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/project/:id" element={<Project />} />
            </Routes>
          </div>
        </>
      ) : (
        <>
          {/* Compact Layout - No header for project view, compact header for home */}
          <Routes>
            <Route path="/" element={
              <>
                <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
                  <div className={`flex h-14 items-center ${spacing(4)}`}>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                          <Zap className="h-4 w-4 text-primary-foreground" />
                        </div>
                        <h1 className={`font-semibold ${text('lg')}`}>Rikuest</h1>
                      </div>
                    </div>
                    
                    <div className="ml-auto flex items-center space-x-2">
                      <Button onClick={() => setShowNewProjectDialog(true)} className={`${headerButton} ${text('sm')}`}>
                        <Plus className="h-4 w-4 mr-2" />
                        {t('navigation.newProject')}
                      </Button>
                      <ThemeSelector />
                      <LanguageSelector />
                      <Button 
                        variant="ghost"
                        onClick={() => setShowSettingsModal(true)} 
                        className={`${iconButton} bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground`}
                        title={t('common.settings')}
                      >
                        <Settings className={icon} />
                      </Button>
                    </div>
                  </div>
                </header>
                <div className="flex-1 flex overflow-hidden w-full min-h-0">
                  <Home />
                </div>
              </>
            } />
            <Route path="/project/:id" element={<Project layout={layout} onNewProject={() => setShowNewProjectDialog(true)} onSettings={() => setShowSettingsModal(true)} />} />
          </Routes>
        </>
      )}

      {/* New Project Dialog */}
      {showNewProjectDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className={`bg-card ${spacing(6)} rounded-lg shadow-lg border border-border w-full max-w-md`}>
            <h2 className={`${text('lg')} font-semibold mb-4`}>{t('project.create')}</h2>
            
            <div className="space-y-4">
              <div>
                <label className={`${text('sm')} font-medium mb-2 block`}>{t('project.projectName')}</label>
                <Input
                  value={newProject.name}
                  onChange={(e) => setNewProject({...newProject, name: e.target.value})}
                  placeholder={t('project.projectNamePlaceholder')}
                  className={`w-full ${input}`}
                />
              </div>
              
              <div>
                <label className={`${text('sm')} font-medium mb-2 block`}>{t('project.projectDescription')}</label>
                <Textarea
                  value={newProject.description}
                  onChange={(e) => setNewProject({...newProject, description: e.target.value})}
                  placeholder={t('project.projectDescriptionPlaceholder')}
                  className={`w-full ${input}`}
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 mt-6">
              <Button variant="ghost" onClick={handleCancelNewProject} className={button}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleCreateProject} disabled={!newProject.name.trim()} className={button}>
                {t('common.create')} {t('common.project')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      <SettingsModal 
        isOpen={showSettingsModal} 
        onClose={() => setShowSettingsModal(false)} 
      />
    </div>
  );
}

export default App;