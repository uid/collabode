package collabode.testing;

import java.io.IOException;

import org.eclipse.core.runtime.CoreException;
import org.eclipse.core.runtime.FileLocator;
import org.eclipse.core.runtime.IPath;
import org.eclipse.core.runtime.Path;
import org.eclipse.jdt.core.*;

import collabode.Application;
import collabode.Debug;

public class AnnotationsInitializer extends ClasspathContainerInitializer {
    
    private final String libPath;
    
    public AnnotationsInitializer() throws IOException {
        Debug.here();
        libPath = FileLocator.toFileURL(Application.BUNDLE.getResource("inject-bin")).getPath(); // XXX
    }

    public void initialize(final IPath containerPath, IJavaProject project) throws CoreException {
        Debug.here();
        final IClasspathEntry[] entry = {
                JavaCore.newLibraryEntry(new Path(libPath), null, null)
        };
        IClasspathContainer[] container = {
                new IClasspathContainer() {
                    public IClasspathEntry[] getClasspathEntries() {
                        return entry;
                    }
                    public String getDescription() {
                        return "Collabode Annotations";
                    }
                    public int getKind() {
                        return IClasspathContainer.K_APPLICATION;
                    }
                    public IPath getPath() {
                        return containerPath;
                    }
                }
        };
        JavaCore.setClasspathContainer(containerPath, new IJavaProject[] { project }, container, null);
    }
}
