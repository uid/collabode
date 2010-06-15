package collabode;

import java.io.IOException;
import java.util.Hashtable;

import net.appjet.ajstdlib.execution;

import org.eclipse.core.resources.*;
import org.eclipse.core.runtime.CoreException;
import org.eclipse.core.runtime.IProgressMonitor;
import org.eclipse.core.runtime.preferences.InstanceScope;
import org.eclipse.jdt.core.*;
import org.eclipse.jdt.launching.JavaRuntime;

public class Workspace {
    private static IWorkspace WORKSPACE;
    
    public static synchronized IWorkspace getWorkspace() {
        if (WORKSPACE == null) {
            new InstanceScope().getNode(ResourcesPlugin.PI_RESOURCES).putBoolean(ResourcesPlugin.PREF_AUTO_REFRESH, true);
            Hashtable<String,String> options = getJavaCoreOptions();
            options.put(JavaCore.CODEASSIST_VISIBILITY_CHECK, "enabled");
            options.put(JavaCore.CODEASSIST_FORBIDDEN_REFERENCE_CHECK, "enabled");
            JavaCore.setOptions(options);
            WORKSPACE = ResourcesPlugin.getWorkspace();
        }
        return WORKSPACE;
    }
    
    @SuppressWarnings("unchecked")
    public static Hashtable<String,String> getJavaCoreOptions() {
        return JavaCore.getOptions();
    }
    
    public static IProject[] listProjects() {
        return getWorkspace().getRoot().getProjects();
    }
    
    public static IProject accessProject(String projectname) {
        return getWorkspace().getRoot().getProject(projectname);
    }
    
    public static IProject createProject(String projectname) throws CoreException {
        final IProject project = getWorkspace().getRoot().getProject(projectname);
        if ( ! project.exists()) {
            getWorkspace().run(new IWorkspaceRunnable() {
                public void run(IProgressMonitor monitor) throws CoreException {
                    project.create(null);
                    project.open(null);
                    addJavaNature(project);
                    setupJavaClasspath(project);
                }
            }, null);
        }
        return project;
    }
    
    public static void createDocument(String username, IFile file) throws IOException, JavaModelException {
        PadDocumentOwner.of(username).create(file);
    }
    
    private static void addJavaNature(IProject project) throws CoreException {
        IProjectDescription description = project.getDescription();
        String[] prevNatures = description.getNatureIds();
        String[] newNatures = new String[prevNatures.length + 1];
        System.arraycopy(prevNatures, 0, newNatures, 0, prevNatures.length);
        newNatures[prevNatures.length] = JavaCore.NATURE_ID;
        description.setNatureIds(newNatures);
        project.setDescription(description, null);
    }

    private static void setupJavaClasspath(IProject project) throws CoreException {
        IFolder srcFolder = project.getFolder("src");
        srcFolder.create(true, true, null);
        IFolder binFolder = project.getFolder("bin");
        if ( ! binFolder.exists()) {
            binFolder.create(true, true, null);
        }
        IJavaProject javaProject = JavaCore.create(project);
        javaProject.setOutputLocation(binFolder.getFullPath(), null);
        IClasspathEntry[] entries = new IClasspathEntry[] {
                JavaRuntime.getDefaultJREContainerEntry(),
                JavaCore.newSourceEntry(srcFolder.getFullPath())
                // XXX JUnit 4
                // XXX collabode inject
        };
        javaProject.setRawClasspath(entries, null);
    }
    
    /**
     * Schedule a JavaScript task for execution with no delay.
     */
    public static void scheduleTask(String taskName, Object... args) {
        execution.scheduleTaskInPool("dbwriter_infreq", taskName, 0, args); // XXX maybe a different pool?
    }
}
