package collabode;

import java.io.IOException;
import java.net.URL;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import net.appjet.oui.ResponseWrapper;

import org.eclipse.core.resources.IFile;
import org.eclipse.core.resources.IProject;
import org.eclipse.core.runtime.CoreException;
import org.eclipse.core.runtime.FileLocator;
import org.eclipse.core.runtime.IProgressMonitor;
import org.eclipse.core.runtime.Platform;
import org.eclipse.debug.core.*;
import org.eclipse.debug.core.model.IProcess;
import org.eclipse.debug.core.model.IStreamMonitor;
import org.eclipse.jdt.core.ICompilationUnit;
import org.eclipse.jdt.core.IType;
import org.eclipse.jdt.core.JavaCore;
import org.eclipse.jdt.core.JavaModelException;
import org.eclipse.jdt.junit.JUnitCore;
import org.eclipse.jdt.junit.TestRunListener;
import org.eclipse.jdt.junit.model.ITestCaseElement;
import org.eclipse.jdt.junit.model.ITestElement;
import org.eclipse.jdt.junit.model.ITestRunSession;
import org.eclipse.jdt.launching.IJavaLaunchConfigurationConstants;

/**
 * Run main methods and execute tests. XXX refactor?
 */
public class WorkspaceExec {
    
    // may need: Platform.getJobManager().join(ResourcesPlugin.FAMILY_AUTO_BUILD, null);
    
    private static final LaunchesListener LISTENER = new LaunchesListener();
    private static final TestsListener RESULTS = new TestsListener();
    
    public static String getClass(IProject project, IFile file) {
        return ((ICompilationUnit)JavaCore.create(file)).findPrimaryType().getFullyQualifiedName();
    }
    
    /**
     * Run a main method. XXX refactor?
     */
    public static void runClass(IProject project, String typename, ResponseWrapper response) throws CoreException {
        Debug.here();
        IType main = JavaCore.create(project).findType(typename, (IProgressMonitor)null);
        ILaunchManager mgr = DebugPlugin.getDefault().getLaunchManager();
        ILaunchConfigurationType type = mgr.getLaunchConfigurationType(IJavaLaunchConfigurationConstants.ID_JAVA_APPLICATION);
        ILaunchConfigurationWorkingCopy config = type.newInstance(null, "Run");
        config.setAttribute(IJavaLaunchConfigurationConstants.ATTR_PROJECT_NAME, project.getName());
        config.setAttribute(IJavaLaunchConfigurationConstants.ATTR_MAIN_TYPE_NAME, main.getFullyQualifiedName());
        config.setAttribute(IJavaLaunchConfigurationConstants.ATTR_VM_ARGUMENTS, "-Djava.security.manager");
        
        ILaunch launch = config.launch(ILaunchManager.RUN_MODE, null);
        for (IProcess proc : launch.getProcesses()) {
            new StreamListener(proc.getStreamsProxy().getOutputStreamMonitor(), response);
            new StreamListener(proc.getStreamsProxy().getErrorStreamMonitor(), response, new Decorator() {
                public String appended(String text) {
                    return "<b>" + text + "</b>";
                }
            });
        }
        
        LISTENER.waitForTermination(launch);
    }
    
    /**
     * Run a test suite. XXX unused since continuous testing.
     */
    public static void testClass(final IProject project, final String typename, final ResponseWrapper response) throws CoreException, IOException {
        Debug.here();
        final IType suite = JavaCore.create(project).findType(typename, (IProgressMonitor)null);
        ILaunchManager mgr = DebugPlugin.getDefault().getLaunchManager();
        ILaunchConfigurationType type = mgr.getLaunchConfigurationType("org.eclipse.jdt.junit.launchconfig");
        ILaunchConfigurationWorkingCopy config = type.newInstance(null, "Test " + typename);
        config.setAttribute(IJavaLaunchConfigurationConstants.ATTR_PROJECT_NAME, project.getName());
        config.setAttribute(IJavaLaunchConfigurationConstants.ATTR_MAIN_TYPE_NAME, suite.getFullyQualifiedName());
        config.setAttribute("org.eclipse.jdt.junit.KEEPRUNNING_ATTR", false);
        config.setAttribute("org.eclipse.jdt.junit.CONTAINER", "");
        config.setAttribute("org.eclipse.jdt.junit.TEST_KIND", "org.eclipse.jdt.junit.loader.junit4");
        
        // XXX this doesn't work for tests
        URL policyUrl = Platform.getBundle("collabode.etherpad").getResource("config/security.policy");
        String policy = "'" + FileLocator.toFileURL(policyUrl).getPath() + "'";
        config.setAttribute(IJavaLaunchConfigurationConstants.ATTR_VM_ARGUMENTS,
                "-Dorg.eclipse.osgi.framework.internal.core.FrameworkSecurityManager -Djava.security.policy=" + policy + " -ea");
        
        response.write("<h1>" + suite.getFullyQualifiedName() + "</h1>");
        RESULTS.addListeners(suite, new Decorator() {
            public String appended(String text) {
                response.write("<ul><li>" + text + " passed</li></ul>");
                return null;
            }
        }, new Decorator() {
            public String appended(String text) {
                response.write("<ul><li><b>" + text + " failed</b></li></ul>");
                return null;
            }
        });
        
        ILaunch launch = config.launch(ILaunchManager.RUN_MODE, null);
        for (IProcess proc : launch.getProcesses()) {
            System.out.println(proc);
            new StreamListener(proc.getStreamsProxy().getOutputStreamMonitor(), response);
            new StreamListener(proc.getStreamsProxy().getErrorStreamMonitor(), response, new Decorator() {
                public String appended(String text) {
                    return "<b>" + text + "</b>";
                }
            });
        }
        
        LISTENER.waitForTermination(launch);
    }
}

class TestsListener extends TestRunListener {
    Map<IType,Decorator> oks = new HashMap<IType,Decorator>();
    Map<IType,Decorator> errs = new HashMap<IType,Decorator>();
    
    TestsListener() {
        JUnitCore.addTestRunListener(this);
    }
    
    public void addListeners(IType suite, Decorator ok, Decorator err) {
        oks.put(suite, ok); // XXX never removed
        errs.put(suite, err);
    }
    
    @Override public void testCaseFinished(ITestCaseElement elt) {
        ITestRunSession sess = elt.getTestRunSession();
        try {
            IType suite = sess.getLaunchedProject().findType(elt.getTestClassName());
            if (elt.getTestResult(true) == ITestElement.Result.OK) {
                oks.get(suite).appended(elt.getTestMethodName());
            } else {
                errs.get(suite).appended(elt.getTestMethodName());
            }
        } catch (JavaModelException jme) {
            jme.printStackTrace(); // XXX
        }
    }
}

class LaunchesListener implements ILaunchesListener2 {
    private final Map<ILaunch,Object> flags = new ConcurrentHashMap<ILaunch,Object>();
    
    LaunchesListener() {
        DebugPlugin.getDefault().getLaunchManager().addLaunchListener(this);
    }

    public void launchesAdded(ILaunch[] launches) { }
    public void launchesChanged(ILaunch[] launches) { }
    public void launchesRemoved(ILaunch[] launches) { }
    public void launchesTerminated(ILaunch[] launches) {
        for (ILaunch terminated : launches) {
            if (flags.containsKey(terminated)) {
                Object flag = flags.get(terminated);
                synchronized (flag) {
                    flag.notify();
                }
            }
        }
    }
    
    void waitForTermination(ILaunch launch) {
        Object flag = new Object();
        flags.put(launch, flag);
        try {
            synchronized (flag) {
                if (launch.isTerminated()) {
                    return;
                }
                flag.wait();
            }
        } catch (InterruptedException ie) {
        } finally {
            flags.remove(launch);
        }
    }
}

class StreamListener implements IStreamListener {
    private final ResponseWrapper response;
    private final Decorator[] decorators;
    private boolean flushed = false;
    
    StreamListener(IStreamMonitor monitor, ResponseWrapper response, Decorator... decorators) {
        this.response = response;
        this.decorators = decorators;
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
        for (Decorator decorator : decorators) {
            text = decorator.appended(text);
        }
        response.write(text.replace("\n", "<br/>"));
    }
}

interface Decorator {
    String appended(String text);
}