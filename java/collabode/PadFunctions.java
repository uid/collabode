package collabode;

import java.util.Iterator;

import org.eclipse.core.resources.IFile;

import scala.Function3;
import scala.Function4;

public class PadFunctions {
    
    static Function3<String,IFile,String,Boolean> create;
    //static Function3<String,IFile,String,Boolean> setContents;
    static Function3<String,IFile,Object[],Boolean> reportProblems;
    static Function4<String,IFile,Integer,Iterator<?>,Boolean> updateStyle;
    
    /**
     * Bind JavaScript functions that will be called from Java.
     * Should be called exactly once during setup.
     */
    public static void bind(Function3<String,IFile,String,Boolean> padCreate,
                            //Function3<String,IFile,String,Boolean> padSetContents,
                            Function3<String,IFile,Object[],Boolean> padReportProblems,
                            Function4<String,IFile,Integer,Iterator<?>,Boolean> padUpdateStyle) {
        create = padCreate;
        //setContents = padSetContents;
        reportProblems = padReportProblems;
        updateStyle = padUpdateStyle;
    }
}
