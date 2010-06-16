package collabode;

import java.io.File;
import java.io.IOException;
import java.sql.*;
import java.util.Scanner;

import org.eclipse.core.resources.*;
import org.eclipse.core.runtime.*;
import org.eclipse.equinox.app.IApplication;
import org.eclipse.equinox.app.IApplicationContext;
import org.eclipse.swt.widgets.Display;
import org.eclipse.swt.widgets.Shell;
import org.eclipse.ui.PlatformUI;
import org.eclipse.ui.application.WorkbenchAdvisor;
import org.osgi.framework.Bundle;

import collabode.testing.ContinuousTesting;

public class Application implements IApplication {
    
    /**
     * The Collabode bundle.
     */
    public static Bundle BUNDLE;
    public static Shell SHELL;

    public Object start(IApplicationContext context) throws Exception {
        BUNDLE = Platform.getBundle("collabode.etherpad");
        
        setupDatabase();
        net.appjet.oui.main.main(new String[] {
                "--modulePath=" + bundleResourcePath("src"),
                "--useVirtualFileRoot=" + bundleResourcePath("src"),
                "--configFile=" + bundleResourcePath("config/collabode.properties") });
        setupTesting();
        
        final Display display = PlatformUI.createDisplay();
        PlatformUI.createAndRunWorkbench(display, new WorkbenchAdvisor() {
            @Override public boolean openWindows() { return true; } // XXX no window
            public String getInitialWindowPerspectiveId() { return null; }
            @Override public void postStartup() { SHELL = new Shell(display); } // XXX maybe one window
        });
        
        return IApplication.EXIT_OK;
    }

    public void stop() {
    }
    
    public static String bundleResourcePath(String relativePath) throws IOException {
        return FileLocator.toFileURL(BUNDLE.getResource(relativePath)).getPath();
    }
    
    private void setupDatabase() throws Exception {
        Class.forName("org.hsqldb.jdbc.JDBCDriver");
        Connection db = DriverManager.getConnection("jdbc:hsqldb:mem:pads", "u", "");
        Scanner schema = new Scanner(new File(bundleResourcePath("config/schema.sql"))).useDelimiter(";");
        while (schema.hasNext()) {
            String stmt = schema.next().trim();
            if (stmt.isEmpty()) { continue; }
            db.createStatement().execute(stmt);
        }
        db.close();
    }
    
    private void setupTesting() {
        new Thread(ContinuousTesting.getTester(), "continuous testing").start();
        
        Workspace.getWorkspace().addResourceChangeListener(new IResourceChangeListener() {
            public void resourceChanged(IResourceChangeEvent event) {
                try {
                    event.getDelta().accept(new IResourceDeltaVisitor() {
                        public boolean visit(IResourceDelta delta) throws CoreException {
                            IProject project = delta.getResource().getProject();
                            if (project == null) {
                                return true;
                            }
                            ContinuousTesting.getTester().runTests(project);
                            return false;
                        }
                    });
                } catch (CoreException ce) {
                    ce.printStackTrace(); // XXX
                }
            }
        }, IResourceChangeEvent.POST_CHANGE);
    }
}
