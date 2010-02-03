package collabode;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

import org.eclipse.core.resources.IFile;
import org.eclipse.jdt.core.IBuffer;
import org.eclipse.jdt.core.ICompilationUnit;
import org.eclipse.jdt.core.IProblemRequestor;
import org.eclipse.jdt.core.WorkingCopyOwner;

public class PadWorkingCopyOwner extends WorkingCopyOwner {
    
    private static final ConcurrentMap<String, PadWorkingCopyOwner> owners = new ConcurrentHashMap<String, PadWorkingCopyOwner>();
    
    public static PadWorkingCopyOwner of(String username) {
        if ( ! owners.containsKey(username)) {
            owners.putIfAbsent(username, new PadWorkingCopyOwner(username));
        }
        return owners.get(username);
    }
    
    final String username;
    private final ConcurrentMap<String, PadBuffer> buffers = new ConcurrentHashMap<String, PadBuffer>();
    
    private PadWorkingCopyOwner(String username) {
        //System.out.println("PadWorkingCopyOwner for " + username);
        this.username = username;
    }
    
    @Override public IBuffer createBuffer(final ICompilationUnit workingCopy) {
        System.out.println("createBuffer(ICompilationUnit " + workingCopy.getPath() + ")");
        PadBuffer buffer = new JavaPadBuffer(this, workingCopy);
        buffers.put(workingCopy.getPath().toString(), buffer);
        return buffer;
    }
    
    @Override public IProblemRequestor getProblemRequestor(ICompilationUnit workingCopy) {
        return buffers.get(workingCopy.getPath().toString()).problems;
    }
    
    public PadBuffer createBuffer(IFile file) {
        System.out.println("createBuffer(IFile " + file.getFullPath() + ")");
        PadBuffer buffer = new GenericPadBuffer(this, file);
        buffers.put(file.getFullPath().toString(), buffer);
        return buffer;
    }
    
    public PadBuffer getBuffer(String filename) {
        return buffers.get(filename);
    }
}
