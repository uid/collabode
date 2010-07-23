package collabode;

import org.eclipse.core.resources.IFile;

import scala.Function3;

public class PadFunctions {
    
    public static Function3<String,IFile,String,Boolean> syncText;
    
    /**
     * Bind JavaScript functions that will be called from Java.
     * Should be called exactly once during setup.
     */
    public static void bind(Function3<String,IFile,String,Boolean> pdsyncPadText) {
        syncText = pdsyncPadText;
    }
}
