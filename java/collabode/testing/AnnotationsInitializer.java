package collabode.testing;

import java.io.IOException;

import org.eclipse.core.runtime.*;
import org.eclipse.jdt.core.*;

import collabode.Application;

public class AnnotationsInitializer extends ClasspathContainerInitializer {
    
    public static final IPath PATH = new Path("collabode.ANNOTATIONS_CONTAINER");
    
    private final String libPath;
    
    public AnnotationsInitializer() throws IOException {
        libPath = Application.bundleResourcePath("inject-bin"); // XXX
    }

    public void initialize(final IPath containerPath, IJavaProject project) throws CoreException {
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
