package collabode;

import org.eclipse.core.resources.IFile;
import org.eclipse.core.resources.IProject;

import scala.Function3;
import collabode.testing.Test;
import collabode.testing.TestResult;

public class PadFunctions {
    
    public static Function3<String,IFile,String,Boolean> syncText;
    public static Function3<String,IFile,Object[],Boolean> reportProblems;
    public static Function3<IProject,Test,TestResult,Boolean> reportTestResult;
    
    /**
     * Bind JavaScript functions that will be called from Java.
     * Should be called exactly once during setup.
     */
    public static void bind(Function3<String,IFile,String,Boolean> pdsyncPadText,
                            Function3<String,IFile,Object[],Boolean> reportPadProblems,
                            Function3<IProject,Test,TestResult,Boolean> projReportTestResult) {
        syncText = pdsyncPadText;
        reportProblems = reportPadProblems;
        reportTestResult = projReportTestResult;
    }
}
