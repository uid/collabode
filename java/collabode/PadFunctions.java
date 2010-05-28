package collabode;

import java.util.Iterator;

import org.eclipse.core.resources.IFile;
import org.eclipse.core.resources.IProject;

import scala.Function3;
import scala.Function4;
import collabode.testing.Test;
import collabode.testing.TestResult;

public class PadFunctions {
    
    public static Function3<String,IFile,String,Boolean> syncText;
    public static Function4<String,IFile,Integer,Iterator<?>,Boolean> syncStyle;
    public static Function3<String,IFile,Object[],Boolean> reportProblems;
    public static Function3<IProject,Test,TestResult,Boolean> reportTestResult;
    
    /**
     * Bind JavaScript functions that will be called from Java.
     * Should be called exactly once during setup.
     */
    public static void bind(Function3<String,IFile,String,Boolean> pdsyncPadText,
                            Function4<String,IFile,Integer,Iterator<?>,Boolean> pdsyncPadStyle,
                            Function3<String,IFile,Object[],Boolean> reportPadProblems,
                            Function3<IProject,Test,TestResult,Boolean> projReportTestResult) {
        syncText = pdsyncPadText;
        syncStyle = pdsyncPadStyle;
        reportProblems = reportPadProblems;
        reportTestResult = projReportTestResult;
    }
}
