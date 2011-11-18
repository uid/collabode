package collabode;

import java.io.*;
import java.net.URL;
import java.sql.*;
import java.util.*;

import org.eclipse.core.resources.IResourceChangeEvent;
import org.eclipse.core.runtime.FileLocator;
import org.eclipse.core.runtime.Platform;
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
    public static Map<String, String> CONFIG;

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
        setConfig(config);
        
        setupDatabase();
        startAppjet("--modulePath=" + bundleResourcePath("src"),
                    "--useVirtualFileRoot=" + bundleResourcePath("src"),
                    "--configFile=" + configFile);
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
    
    @SuppressWarnings({ "rawtypes", "unchecked" })
    public static void setConfig(Map config) {
        CONFIG = Collections.unmodifiableMap(config);
    }
    
    public static void setupDatabase() throws Exception {
        Class.forName(CONFIG.get("dbDriver"));
        Connection db = DriverManager.getConnection(CONFIG.get("dbURL"), "u", "");
        Scanner schema = new Scanner(new File(bundleResourcePath("config/schema.sql"))).useDelimiter(";");
        String alreadyExists = CONFIG.get("dbAlreadyExists");
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
    
    public static void startAppjet(String... args) {
        net.appjet.oui.main.main(args);
    }
    
    public static void setupTesting() {
        ContinuousTesting tester = ContinuousTesting.getTester();
        new Thread(tester, "continuous testing").start();
        
        if ("true".equals(CONFIG.get("continuousTesting"))) {
            Workspace.getWorkspace().addResourceChangeListener(tester.listener, IResourceChangeEvent.POST_CHANGE);
        }
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
