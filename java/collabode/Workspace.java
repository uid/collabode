package collabode;

import java.io.IOException;

import org.eclipse.core.resources.*;
import org.eclipse.core.runtime.CoreException;
import org.eclipse.core.runtime.preferences.InstanceScope;
import org.eclipse.jdt.core.JavaCore;
import org.mortbay.util.IO;

public class Workspace {
    private static final Workspace THIS = new Workspace();
    
    private static IWorkspace WORKSPACE;
    
    public static synchronized IWorkspace initWorkspace() {
        if (WORKSPACE == null) {
            new InstanceScope().getNode(ResourcesPlugin.PI_RESOURCES).putBoolean(ResourcesPlugin.PREF_AUTO_REFRESH, true);
            WORKSPACE = ResourcesPlugin.getWorkspace();
            //WORKSPACE.addResourceChangeListener(new Changes(), IResourceChangeEvent.POST_BUILD);
        }
        return WORKSPACE;
    }
    
    public static IProject accessProject(final String projectname) {
        return THIS.getWorkspace().getRoot().getProject(projectname);
    }
    
    public static void createWorkingCopy(String username, IFile file) throws IOException, CoreException {
        //System.out.println("createWorkingCopy");
        if (JavaCore.isJavaLikeFileName(file.getName())) {
            JavaCore.createCompilationUnitFrom(file).getWorkingCopy(PadWorkingCopyOwner.of(username), null);
            // working copy initializes buffer contents
        } else {
            PadBuffer buffer = PadWorkingCopyOwner.of(username).createBuffer(file);
            buffer.setContents(IO.toString(file.getContents()));
        }
    }
    
    private IWorkspace workspace;
    
    private IWorkspace getWorkspace() {
        if (workspace == null) {
            workspace = initWorkspace();
        }
        return workspace;
    }
}
