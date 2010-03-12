package collabode;

import java.util.Iterator;

import org.eclipse.core.resources.IFile;
import org.eclipse.core.resources.IProject;

import scala.Function3;
import scala.Function4;
import collabode.testing.Test;
import collabode.testing.TestResult;

public class PadFunctions {
    
    public static Function3<String,IFile,String,Boolean> create;
    //static Function3<String,IFile,String,Boolean> setContents;
    public static Function3<String,IFile,Object[],Boolean> reportProblems;
    public static Function4<String,IFile,Integer,Iterator<?>,Boolean> updateStyle;
    public static Function3<IProject,Test,TestResult,Boolean> reportTestResult;
    
    /**
     * Bind JavaScript functions that will be called from Java.
     * Should be called exactly once during setup.
     */
    public static void bind(Function3<String,IFile,String,Boolean> padCreate,
                            //Function3<String,IFile,String,Boolean> padSetContents,
                            Function3<String,IFile,Object[],Boolean> padReportProblems,
                            Function4<String,IFile,Integer,Iterator<?>,Boolean> padUpdateStyle,
                            Function3<IProject,Test,TestResult,Boolean> projReportTestResult) {
        create = padCreate;
        //setContents = padSetContents;
        reportProblems = padReportProblems;
        updateStyle = padUpdateStyle;
        reportTestResult = projReportTestResult;
    }
}
