package collabode;

import org.eclipse.core.resources.IFile;

import scala.Function3;

public class PadFunctions {
    
    static Function3<String,IFile,String,Boolean> create;
    static Function3<String,IFile,String,Boolean> setContents;
    static Function3<String,IFile,Object[],Boolean> reportProblems;
    
    public static void bind(Function3<String,IFile,String,Boolean> padCreate,
                            Function3<String,IFile,String,Boolean> padSetContents,
                            Function3<String,IFile,Object[],Boolean> padReportProblems) {
        create = padCreate;
        setContents = padSetContents;
        reportProblems = padReportProblems;
    }
}
