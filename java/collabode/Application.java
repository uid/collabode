package collabode;

import java.io.*;
import java.net.URL;
import java.sql.*;
import java.util.Properties;
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
import org.osgi.framework.BundleException;

import collabode.testing.ContinuousTesting;

public class Application implements IApplication {
    
    /**
     * The Collabode bundle.
     */
    public static Bundle BUNDLE;
    public static Shell SHELL;

    public Object start(IApplicationContext context) throws Exception {
        BUNDLE = Platform.getBundle("collabode.etherpad");
        
        String configFile;
        try {
            configFile = bundleResourcePath("config/collabode.properties");
        } catch (FileNotFoundException fnfe) {
            System.err.println("Missing config file: " + fnfe.getMessage());
            throw fnfe;
        }
        Properties config = new Properties();
        config.load(new FileInputStream(configFile));
        
        setupDatabase(config);
        net.appjet.oui.main.main(new String[] {
                "--modulePath=" + bundleResourcePath("src"),
                "--useVirtualFileRoot=" + bundleResourcePath("src"),
                "--configFile=" + configFile });
        setupTesting();
        setupShutdown();
        
        final Display display = PlatformUI.createDisplay();
        PlatformUI.createAndRunWorkbench(display, new WorkbenchAdvisor() {
            @Override public boolean openWindows() { return true; } // XXX no window
            public String getInitialWindowPerspectiveId() { return null; }
            @Override public void postStartup() {
                SHELL = new Shell(display); // XXX maybe one window
                try {
                    Platform.getBundle("org.eclipse.jdt.ui").start();
                } catch (BundleException be) {
                    be.printStackTrace(); // XXX
                }
            }
        });
        
        return IApplication.EXIT_OK;
    }

    public void stop() {
    }
    
    public static String bundleResourcePath(String relativePath) throws IOException {
        URL url = BUNDLE.getResource(relativePath);
        if (url == null) { throw new FileNotFoundException("bundle resource: " + relativePath); }
        return FileLocator.toFileURL(url).getPath();
    }
    
    private void setupDatabase(Properties config) throws Exception {
        Class.forName(config.getProperty("dbDriver"));
        Connection db = DriverManager.getConnection(config.getProperty("dbURL"), "u", "");
        Scanner schema = new Scanner(new File(bundleResourcePath("config/schema.sql"))).useDelimiter(";");
        String alreadyExists = config.getProperty("dbAlreadyExists");
        while (schema.hasNext()) {
            String stmt = schema.next().trim();
            if (stmt.isEmpty()) { continue; }
            try {
                db.createStatement().execute(stmt);
            } catch (SQLException sqle) {
                if ( ! sqle.getSQLState().equals(alreadyExists)) {
                    System.err.println(stmt);
                    System.err.println(sqle.getSQLState());
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
    
    private void setupShutdown() {
        new Thread(new Runnable() {
            public void run() {
                BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
                String line;
                try {
                    while ((line = br.readLine()) != null) {
                        if (line.equals("quit")) {
                            Workspace.scheduleTask("willShutdown");
                            PlatformUI.getWorkbench().getDisplay().syncExec(new Runnable() {
                                public void run() { PlatformUI.getWorkbench().close(); }
                            });
                        }
                    }
                } catch (IOException ioe) {
                    ioe.printStackTrace(); // XXX
                }
            }
        }, "console input").start();
    }
}
