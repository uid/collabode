package collabode.testing;

import java.io.*;
import java.util.*;

import org.eclipse.core.runtime.*;
import org.eclipse.debug.core.*;
import org.eclipse.jdt.core.IJavaProject;
import org.eclipse.jdt.junit.launcher.JUnitLaunchConfigurationDelegate;
import org.eclipse.jdt.launching.IVMRunner;
import org.eclipse.jdt.launching.VMRunnerConfiguration;
import org.mortbay.util.IO;

import collabode.Application;

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
            File policy = File.createTempFile(PREFIX, SUFFIX);
            policy.deleteOnExit();
            
            PrintWriter out = new PrintWriter(new OutputStreamWriter(new FileOutputStream(policy)));
            
            // baseline permissions
            InputStream run = new FileInputStream(Application.bundleResourcePath("config/export/security.run.policy"));
            IO.copy(new InputStreamReader(run), out);
            
            IJavaProject proj = getJavaProject(configuration);
            String bin = proj.getProject().getWorkspace().getRoot().getFile(proj.getOutputLocation()).getRawLocation() + "/-";
            
            out.println("grant codeBase \"file:" + FileLocator.toFileURL(Platform.getBundle("org.junit").getEntry("/junit.jar")).getPath() + "\" {");
            out.println("  permission java.io.FilePermission \"" + bin + "\", \"read\";"); // XXX secure?
            out.println("};");
            
            out.println("grant codeBase \"file:" + FileLocator.toFileURL(Platform.getBundle("org.eclipse.jdt.junit4.runtime").getEntry("/")).getPath() + "\" {");
            out.println("  permission java.io.FilePermission \"" + bin + "\", \"read\";"); // XXX secure?
            out.println("};");
            
            String junit = FileLocator.toFileURL(Platform.getBundle("org.eclipse.jdt.junit.runtime").getEntry("/")).getPath();
            out.println("grant codeBase \"file:" + junit + "\" {");
            out.println("  permission java.io.FilePermission \"" + bin + "\", \"read\";"); // XXX secure?
            // discovering test classes
            if (programArguments.contains("-testNameFile")) {
                String testNameFile = (String)programArguments.get(programArguments.indexOf("-testNameFile")+1);
                out.println("  permission java.io.FilePermission \"" + testNameFile + "\", \"read\";"); // XXX secure?
            }
            // sending results back to remote test runner
            int junitPort = Integer.parseInt((String)programArguments.get(programArguments.indexOf("-port")+1));
            out.println("  permission java.net.SocketPermission \"localhost:" + junitPort + "\", \"connect\";");
            out.println("};");
            
            // reflection to find tests
            out.println("grant { permission java.lang.RuntimePermission \"accessDeclaredMembers\"; };");
            
            Map<String, String> env = configuration.getAttribute(ILaunchManager.ATTR_ENVIRONMENT_VARIABLES, (Map)null);
            int coverPort = Integer.parseInt(env.get(Coverage.PORT));
            // weaving
            out.println("grant { permission java.util.PropertyPermission \"java.class.version\", \"read\"; };");
            out.println("grant { permission java.util.PropertyPermission \"org.aspectj.*\", \"read\"; };");
            out.println("grant codeBase \"file:" + TestSupportInitializer.weaverPath() + "\" {");
            out.println("  permission java.io.FilePermission \"<<ALL FILES>>\", \"read\";"); // XXX secure?
            out.println("  permission java.lang.RuntimePermission \"getClassLoader\";");
            out.println("  permission java.util.PropertyPermission \"*\", \"read\";");
            out.println("};");
            
            // sending coverage results
            out.println("grant { permission java.lang.RuntimePermission \"getenv." + Coverage.PORT + "\"; };");
            out.println("grant { permission java.net.SocketPermission \"localhost:" + coverPort + "\", \"connect\"; };");
            
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
