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
    
    public static FileRunOwner of(String username) {
        if ( ! RUNNERS.containsKey(username)) {
            RUNNERS.putIfAbsent(username, new FileRunOwner(username));
        }
        return RUNNERS.get(username);
    }
    
    final String username;
    private final ConcurrentMap<String, ILaunch> launches = new ConcurrentHashMap<String, ILaunch>();
    
    private FileRunOwner(String rusername) {
        this.username = rusername;
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
                Workspace.scheduleTask("runningStateChange", username, file, "terminated");
            }
        }
    }
    
    /**
     * Run the main method of the primary class in a file.
     */
    public synchronized void run(String path) throws CoreException, IOException {
        if (launches.containsKey(path) && ! launches.get(path).isTerminated()) {
            System.err.println("Already running " + path); // XXX
            return;
        }
        
        IFile file = (IFile)Workspace.getWorkspace().getRoot().findMember(path);
        
        Workspace.scheduleTask("runningStateChange", username, file, "launching");
        
        IType main = ((ICompilationUnit)JavaCore.create(file)).findPrimaryType();
        ILaunchManager mgr = DebugPlugin.getDefault().getLaunchManager();
        ILaunchConfigurationType type = mgr.getLaunchConfigurationType(IJavaLaunchConfigurationConstants.ID_JAVA_APPLICATION);
        ILaunchConfigurationWorkingCopy config = type.newInstance(null, username + " Run " + main.getTypeQualifiedName());
        config.setAttribute(IJavaLaunchConfigurationConstants.ATTR_PROJECT_NAME, file.getProject().getName());
        config.setAttribute(IJavaLaunchConfigurationConstants.ATTR_MAIN_TYPE_NAME, main.getFullyQualifiedName());
        
        String policy = "'" + Application.bundleResourcePath("config/security.policy") + "'";
        config.setAttribute(IJavaLaunchConfigurationConstants.ATTR_VM_ARGUMENTS,
                "-Dorg.eclipse.osgi.framework.internal.core.FrameworkSecurityManager " + // XXX does nothing?
                "-Djava.security.manager -Djava.security.policy=" + policy + " -ea");
        
        ILaunch launch = config.launch(ILaunchManager.RUN_MODE, null);
        launch.setAttribute(PATH, path);
        
        Workspace.scheduleTask("runningStateChange", username, file, "launched");
        
        for (IProcess proc : launch.getProcesses()) {
            new StreamListener(proc.getStreamsProxy().getOutputStreamMonitor(), file, STDOUT);
            new StreamListener(proc.getStreamsProxy().getErrorStreamMonitor(), file, STDERR);
        }
        
        launches.put(path, launch);
        if (launch.isTerminated()) {
            launchesTerminated(new ILaunch[] { launch });
        }
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
        private final String[][] attribs;
        // some output may already have been generated before we are attached
        private boolean flushed = false;
        
        StreamListener(IStreamMonitor monitor, IFile file, String[][] attribs) {
            this.file = file;
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
            Workspace.scheduleTask("runningOutput", username, file, text, attribs);
        }
    }
}
