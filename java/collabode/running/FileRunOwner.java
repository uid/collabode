package collabode.running;

import java.io.IOException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

import org.eclipse.core.resources.IFile;
import org.eclipse.core.runtime.CoreException;
import org.eclipse.debug.core.*;
import org.eclipse.debug.core.model.IProcess;
import org.eclipse.debug.core.model.IStreamMonitor;
import org.eclipse.jdt.core.*;
import org.eclipse.jdt.launching.IJavaLaunchConfigurationConstants;

import collabode.Application;
import collabode.Workspace;

/**
 * Keeps track of launches.
 */
public class FileRunOwner {
    
    private static final ConcurrentMap<String, FileRunOwner> RUNNERS = new ConcurrentHashMap<String, FileRunOwner>();
    private static final String PATH = "collabode.running.PATH";
    private static final String[][] STDOUT = new String[0][];
    private static final String[][] STDERR = new String[][] { { "foreground", "200,0,0" } };
    
    public static FileRunOwner of(String id) {
        if ( ! RUNNERS.containsKey(id)) {
            RUNNERS.putIfAbsent(id, new FileRunOwner(id));
        }
        return RUNNERS.get(id);
    }
    
    final String id;
    private final ConcurrentMap<String, ILaunch> launches = new ConcurrentHashMap<String, ILaunch>();
    
    private FileRunOwner(String id) {
        this.id = id;
        DebugPlugin.getDefault().getLaunchManager().addLaunchListener(new ILaunchesListener2() {
            public void launchesRemoved(ILaunch[] launches) { }
            public void launchesAdded(ILaunch[] launches) { }
            public void launchesChanged(ILaunch[] launches) { }
            public void launchesTerminated(ILaunch[] terminated) {
                FileRunOwner.this.launchesTerminated(terminated);
            }
        });
    }
    
    private void launchesTerminated(ILaunch[] terminated) {
        for (ILaunch launch : terminated) {
            String path = launch.getAttribute(PATH);
            if (path != null && launches.remove(path) == launch) {
                IFile file = (IFile)Workspace.getWorkspace().getRoot().findMember(path);
                state(file, "terminated");
            }
        }
    }
    
    private void state(IFile file, String state) {
        Workspace.scheduleTask("runningStateChange", id, file, state);
    }
    
    /**
     * Run a file, for appropriate definition of run.
     */
    public synchronized void run(String path) {
        if (launches.containsKey(path) && ! launches.get(path).isTerminated()) {
            System.err.println("Already running " + path); // XXX
            return;
        }
        
        IFile file = (IFile)Workspace.getWorkspace().getRoot().findMember(path);
        ILaunchConfiguration config;
        if (file.getFileExtension().equals("launch")) {
            if ("true".equals(Application.CONFIG.get("unsafeLaunches"))) {
                config = DebugPlugin.getDefault().getLaunchManager().getLaunchConfiguration(file);
            } else {
                System.err.println("Unsafe launches disabled: cannot run " + file); // XXX
                state(file, "failed");
                return;
            }
        } else {
            try {
                config = javaMainLaunchConfig(file);
            } catch (Exception e) {
                e.printStackTrace(); // XXX
                state(file, "failed");
                return;
            }
        }
        
        state(file, "launching");
        
        ILaunch launch;
        try {
            launch = config.launch(ILaunchManager.RUN_MODE, null);
        } catch (CoreException ce) {
            ce.printStackTrace(); // XXX
            state(file, "failed");
            return;
        }
        launch.setAttribute(PATH, path);
        
        state(file, "launched");
        
        for (IProcess proc : launch.getProcesses()) {
            new StreamListener(proc.getStreamsProxy().getOutputStreamMonitor(), file, "STDOUT", STDOUT);
            new StreamListener(proc.getStreamsProxy().getErrorStreamMonitor(), file, "STDERR", STDERR);
        }
        
        launches.put(path, launch);
        if (launch.isTerminated()) {
            launchesTerminated(new ILaunch[] { launch });
        }
    }
    
    /**
     * Run the main method of the primary class in a file.
     */
    private ILaunchConfigurationWorkingCopy javaMainLaunchConfig(IFile file) throws CoreException, IOException {
        IType main = ((ICompilationUnit)JavaCore.create(file)).findPrimaryType();
        ILaunchManager mgr = DebugPlugin.getDefault().getLaunchManager();
        ILaunchConfigurationType type = mgr.getLaunchConfigurationType(IJavaLaunchConfigurationConstants.ID_JAVA_APPLICATION);
        ILaunchConfigurationWorkingCopy config = type.newInstance(null, id + " Run " + main.getTypeQualifiedName());
        config.setAttribute(IJavaLaunchConfigurationConstants.ATTR_PROJECT_NAME, file.getProject().getName());
        config.setAttribute(IJavaLaunchConfigurationConstants.ATTR_MAIN_TYPE_NAME, main.getFullyQualifiedName());
        
        String policy = '"' + Application.bundleResourcePath("config/export/security.run.policy") + '"';
        config.setAttribute(IJavaLaunchConfigurationConstants.ATTR_VM_ARGUMENTS,
                "-Dorg.eclipse.osgi.framework.internal.core.FrameworkSecurityManager " + // XXX does nothing?
                "-Djava.security.manager -Djava.security.policy==" + policy + " -ea");
        
        return config;
    }
    
    /**
     * Returns the current launch state of a file.
     */
    public synchronized String state(String path) {
        return launches.containsKey(path) && ! launches.get(path).isTerminated() ? "launched" : "terminated";
    }
    
    /**
     * Terminate the launch associated with a file, if any.
     */
    public synchronized void stop(String path) throws DebugException {
        if (launches.containsKey(path)) {
            launches.get(path).terminate();
        }
    }
    
    class StreamListener implements IStreamListener {
        
        private final IFile file;
        private final String type;
        private final String[][] attribs;
        // some output may already have been generated before we are attached
        private boolean flushed = false;
        
        StreamListener(IStreamMonitor monitor, IFile file, String type, String[][] attribs) {
            this.file = file;
            this.type = type;
            this.attribs = attribs;
            monitor.addListener(this);
            streamAppended(null, monitor);
        }
        
        public void streamAppended(String text, IStreamMonitor monitor) {
            if ( ! flushed) {
                flushed = true;
                write(monitor.getContents());
                return;
            }
            write(text);
        }
        
        private void write(String text) {
            if (text == null || text.length() == 0) { return; }
            Workspace.scheduleTask("runningOutput", id, file, text, this.type, attribs);
        }
    }
}
