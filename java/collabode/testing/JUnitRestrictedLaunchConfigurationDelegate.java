package collabode.testing;

import java.io.*;
import java.util.Iterator;
import java.util.List;

import org.eclipse.core.runtime.CoreException;
import org.eclipse.core.runtime.IProgressMonitor;
import org.eclipse.debug.core.ILaunch;
import org.eclipse.debug.core.ILaunchConfiguration;
import org.eclipse.jdt.junit.launcher.JUnitLaunchConfigurationDelegate;
import org.eclipse.jdt.launching.IVMRunner;
import org.eclipse.jdt.launching.VMRunnerConfiguration;

/**
 * Launch configuration delegate for JUnit tests with restricted security permissions.
 */
@SuppressWarnings({ "rawtypes", "unchecked" })
public class JUnitRestrictedLaunchConfigurationDelegate extends JUnitLaunchConfigurationDelegate {
    
    private static final String MANAGER_ARG = "-Djava.security.manager";
    private static final String POLICY_ARG = "-Djava.security.policy==";
    private static final String PREFIX = "testing";
    private static final String SUFFIX = ".policy";
    
    /**
     * Collects all VM and program arguments. Adds arguments to enable the Java security manager.
     */
    @Override protected void collectExecutionArguments(ILaunchConfiguration configuration, List vmArguments, List programArguments) throws CoreException {
        super.collectExecutionArguments(configuration, vmArguments, programArguments);
        
        if ( ! vmArguments.contains(MANAGER_ARG)) {
            vmArguments.add(MANAGER_ARG);
        }
        try {
            int port = Integer.parseInt((String)programArguments.get(programArguments.indexOf("-port")+1));
            
            File policy = File.createTempFile(PREFIX, SUFFIX);
            policy.deleteOnExit();
            
            PrintWriter out = new PrintWriter(new OutputStreamWriter(new FileOutputStream(policy)));
            // reflection to find tests
            out.println("grant { permission java.lang.RuntimePermission \"accessDeclaredMembers\"; };");
            // sending results back to remote test runner
            out.println("grant { permission java.net.SocketPermission \"localhost:" + port + "\", \"connect\"; };");
            out.close();
            
            for (Iterator it = vmArguments.iterator(); it.hasNext(); ) {
                if (((String)it.next()).startsWith(POLICY_ARG)) { it.remove(); }
            }
            
            vmArguments.add(POLICY_ARG + policy.getCanonicalPath());
        } catch (IOException ioe) {
            ioe.printStackTrace(); // XXX
        }
    }
    
    /*
     * XXX Override so we can delete the temporary policy file, since
     * {@link File#deleteOnExit()} doesn't run when the VM is terminated.
     */
    @Override public IVMRunner getVMRunner(ILaunchConfiguration configuration, String mode) throws CoreException {
        final IVMRunner runner = super.getVMRunner(configuration, mode);
        return new IVMRunner() {
            private VMRunnerConfiguration configuration;
            public void run(VMRunnerConfiguration configuration, ILaunch launch, IProgressMonitor monitor) throws CoreException {
                this.configuration = configuration;
                runner.run(configuration, launch, monitor);
            }
            @Override protected void finalize() throws Throwable {
                if (configuration == null) { return; }
                for (String arg : configuration.getVMArguments()) {
                    if (arg.matches("^" + POLICY_ARG + ".*" + PREFIX + ".*" + SUFFIX + "$")) {
                        new File(arg.substring(POLICY_ARG.length())).delete();
                    }
                }
            }
        };
    }
}
