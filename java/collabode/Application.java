package collabode;

import java.io.File;
import java.io.IOException;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.Scanner;

import org.eclipse.core.resources.*;
import org.eclipse.core.runtime.CoreException;
import org.eclipse.core.runtime.FileLocator;
import org.eclipse.core.runtime.Platform;
import org.eclipse.equinox.app.IApplication;
import org.eclipse.equinox.app.IApplicationContext;
import org.osgi.framework.Bundle;

import scala.Console;

import collabode.testing.ContinuousTesting;

public class Application implements IApplication {
    
    /**
     * The Collabode bundle.
     */
    public static Bundle BUNDLE;

    public Object start(IApplicationContext context) throws Exception {
        BUNDLE = Platform.getBundle("collabode.etherpad");
        
        setupDatabase();
        net.appjet.oui.main.main(new String[] {
                "--modulePath=" + bundleResourcePath("src"),
                "--useVirtualFileRoot=" + bundleResourcePath("src"),
                "--configFile=" + bundleResourcePath("config/collabode.properties") });
        setupTesting();
        
        while ( ! "quit".equals(Console.readLine())); // XXX
        
        return null;
    }

    public void stop() {
    }
    
    public static String bundleResourcePath(String relativePath) throws IOException {
        return FileLocator.toFileURL(BUNDLE.getResource(relativePath)).getPath();
    }
    
    private void setupDatabase() throws Exception {
        Class.forName("org.apache.derby.jdbc.EmbeddedDriver");
        Connection db = DriverManager.getConnection("jdbc:derby:pads;create=true");
        Scanner schema = new Scanner(new File(bundleResourcePath("config/schema.sql"))).useDelimiter(";");
        while (schema.hasNext()) {
            String stmt = schema.next().trim();
            if (stmt.isEmpty()) {
                continue;
            }
            try {
                db.createStatement().execute(stmt);
            } catch (SQLException sqle) {
                if (!sqle.getSQLState().equals("X0Y32")) {
                    System.out.println(stmt);
                    throw sqle;
                }
            }
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
