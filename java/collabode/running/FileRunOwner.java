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
    // fast-terminating launches may not be in `launches` yet when `launchesTerminated` is called
    private IFile currentFile = null;
    private ILaunch currentLaunch = null;
    
    private FileRunOwner(String rusername) {
        this.username = rusername;
        DebugPlugin.getDefault().getLaunchManager().addLaunchListener(new ILaunchesListener2() {
            public void launchesRemoved(ILaunch[] launches) { }
            public void launchesAdded(ILaunch[] launches) { }
            public void launchesChanged(ILaunch[] launches) { }
            public void launchesTerminated(ILaunch[] terminated) {
                for (ILaunch launch : terminated) {
                    if (launch == currentLaunch) {
                        Workspace.scheduleTask("runningStateChange", username, currentFile, "terminated");
                    } else if (launches.containsValue(launch)) {
                        IFile file = (IFile)Workspace.getWorkspace().getRoot().findMember(launch.getAttribute(PATH));
                        Workspace.scheduleTask("runningStateChange", username, file, "terminated");
                    }
                }
            }
        });
    }
    
    /**
     * Run the main method of the primary class in a file.
     */
    public synchronized void run(String path) throws CoreException, IOException {
        if (launches.containsKey(path) && ! launches.get(path).isTerminated()) {
            System.err.println("Already running " + path); // XXX
            return;
        }
        
        currentFile = (IFile)Workspace.getWorkspace().getRoot().findMember(path);
        
        Workspace.scheduleTask("runningStateChange", username, currentFile, "launching");
        
        IType main = ((ICompilationUnit)JavaCore.create(currentFile)).findPrimaryType();
        ILaunchManager mgr = DebugPlugin.getDefault().getLaunchManager();
        ILaunchConfigurationType type = mgr.getLaunchConfigurationType(IJavaLaunchConfigurationConstants.ID_JAVA_APPLICATION);
        ILaunchConfigurationWorkingCopy config = type.newInstance(null, username + " Run " + main.getTypeQualifiedName());
        config.setAttribute(IJavaLaunchConfigurationConstants.ATTR_PROJECT_NAME, currentFile.getProject().getName());
        config.setAttribute(IJavaLaunchConfigurationConstants.ATTR_MAIN_TYPE_NAME, main.getFullyQualifiedName());
        
        String policy = "'" + Application.bundleResourcePath("config/security.policy") + "'";
        config.setAttribute(IJavaLaunchConfigurationConstants.ATTR_VM_ARGUMENTS,
                "-Dorg.eclipse.osgi.framework.internal.core.FrameworkSecurityManager " + // XXX does nothing?
                "-Djava.security.manager -Djava.security.policy=" + policy + " -ea");
        
        currentLaunch = config.launch(ILaunchManager.RUN_MODE, null);
        currentLaunch.setAttribute(PATH, path);
        
        Workspace.scheduleTask("runningStateChange", username, currentFile, "launched");
        
        for (IProcess proc : currentLaunch.getProcesses()) {
            new StreamListener(proc.getStreamsProxy().getOutputStreamMonitor(), currentFile, STDOUT);
            new StreamListener(proc.getStreamsProxy().getErrorStreamMonitor(), currentFile, STDERR);
        }
        launches.put(path, currentLaunch);
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
            if (text == null || text.length() == 0) {
                return;
            }
            write(text);
        }
        
        private void write(String text) {
            Workspace.scheduleTask("runningOutput", username, file, text, attribs);
        }
    }
}
