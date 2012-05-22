package collabode.testing;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;

import org.eclipse.core.runtime.*;
import org.eclipse.jdt.core.*;

import collabode.Application;

public class TestSupportInitializer extends ClasspathContainerInitializer {
    
    public static final String PACKAGE = "collabode";
    
    public static final List<String> STATUSES = Arrays.asList(new String[] { "New", "NeedsImpl", "NeedsReview", "Accepted" });
    
    public static final IPath PATH = new Path("collabode.TEST_SUPPORT_CONTAINER");
    
    public static String weaverPath() throws IOException {
        return Application.bundleResourcePath("lib/aspectjweaver.jar");
    }
    
    private final String annotationsPath;
    private final String coveragePath;
    
    public TestSupportInitializer() throws IOException {
        annotationsPath = Application.bundleResourcePath("inject-bin");
        coveragePath = Application.bundleResourcePath("lib/jacto.jar");
    }

    public void initialize(final IPath containerPath, IJavaProject project) throws CoreException {
        final IClasspathEntry[] entries = {
                JavaCore.newLibraryEntry(new Path(annotationsPath), null, null),
                JavaCore.newLibraryEntry(new Path(coveragePath), null, null)
        };
        IClasspathContainer[] container = {
                new IClasspathContainer() {
                    public IClasspathEntry[] getClasspathEntries() {
                        return entries;
                    }
                    public String getDescription() {
                        return "Collabode Test Support";
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
