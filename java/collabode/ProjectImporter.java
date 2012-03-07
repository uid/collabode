package collabode;

import java.io.File;
import java.lang.reflect.Field;
import java.lang.reflect.InvocationTargetException;
import java.util.ArrayList;
import java.util.List;

import org.eclipse.core.resources.IProject;
import org.eclipse.core.resources.IProjectDescription;
import org.eclipse.core.runtime.*;
import org.eclipse.jface.operation.IRunnableWithProgress;
import org.eclipse.jface.wizard.*;
import org.eclipse.swt.SWT;
import org.eclipse.swt.widgets.Button;
import org.eclipse.ui.PlatformUI;
import org.eclipse.ui.internal.wizards.datatransfer.WizardProjectsImportPage;

@SuppressWarnings("restriction")
public class ProjectImporter extends WizardProjectsImportPage {
    
    private static final Field RADIO;
    private static final Field DESCRIPTION;
    static {
        try {
            RADIO = WizardProjectsImportPage.class.getDeclaredField("projectFromDirectoryRadio");
            RADIO.setAccessible(true);
            DESCRIPTION = ProjectRecord.class.getDeclaredField("description");
            DESCRIPTION.setAccessible(true);
        } catch (Exception e) {
            throw new Error(e); // XXX
        }
    }
    
    static class ImporterRunnable implements Runnable {
        private final File source;
        private final List<IProject> imported = new ArrayList<IProject>();
        
        ImporterRunnable(File source) {
            this.source = source;
        }
        
        public void run() {
            try {
                ProjectImporter page = new ProjectImporter();
                page.updateProjectsList(source.getCanonicalPath());
                imported.addAll(page.importProjects());
            } catch (Exception e) {
                throw new Error(e); // XXX
            }
        }
    }
    
    public static List<IProject> importProjects(String path) {
        path = new Path(null, path).makeAbsolute().makeRelative().toOSString(); // sanitize
        File source = new File(Workspace.getWorkspace().getRoot().getLocation().toFile(), path);
        ImporterRunnable run = new ImporterRunnable(source);
        PlatformUI.getWorkbench().getDisplay().syncExec(run);
        return run.imported;
    }
    
    ProjectImporter() throws IllegalArgumentException, IllegalAccessException {
        Button radio = new Button(Application.SHELL, SWT.RADIO);
        radio.setSelection(true);
        RADIO.set(this, radio);
        
        IWizard wizard = new Wizard() {
            public boolean performFinish() { return false; }
        };
        IWizardContainer dialog = new WizardDialog(Application.SHELL, wizard) {
            @Override public void run(boolean fork, boolean cancelable, IRunnableWithProgress runnable) throws InvocationTargetException, InterruptedException {
                runnable.run(new NullProgressMonitor());
            };
        };
        wizard.setContainer(dialog);
        setWizard(wizard);
    }
    
    @Override public void updateProjectsList(String path) {
        try {
            super.updateProjectsList(path);
        } catch (NullPointerException npe) {
            // XXX expected on: projectsList.refresh(true)
        }
    }
    
    List<IProject> importProjects() throws IllegalArgumentException, IllegalAccessException, CoreException {
        List<IProject> projects = new ArrayList<IProject>();
        for (ProjectRecord record : getProjectRecords()) {
            if (record.hasConflicts()) { continue; }
            IProject project = Workspace.accessProject(record.getProjectName());
            IProjectDescription description = (IProjectDescription)DESCRIPTION.get(record);
            description.setName(record.getProjectName());
            project.create(description, null);
            projects.add(project);
        }
        return projects;
    }
}
