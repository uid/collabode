package collabode;

import java.io.IOException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

import org.eclipse.core.resources.IFile;
import org.eclipse.jdt.core.*;

/**
 * Stores users' in-memory versions of documents.
 * Also acts as a {@link WorkingCopyOwner} for {@linkplain ICompilationUnit working copies}.
 */
public class PadDocumentOwner extends WorkingCopyOwner {
    
    private static final ConcurrentMap<String, PadDocumentOwner> owners = new ConcurrentHashMap<String, PadDocumentOwner>();
    
    /**
     * Obtain the document owner for the given user. Creates one if none.
     */
    public static PadDocumentOwner of(String username) {
        if ( ! owners.containsKey(username)) {
            owners.putIfAbsent(username, new PadDocumentOwner(username));
        }
        return owners.get(username);
    }
    
    final String username;
    final PadPresentationReconciler presenter = new PadSourceViewerConfig().getPresentationReconciler();
    private final ConcurrentMap<String, PadDocument> documents = new ConcurrentHashMap<String, PadDocument>();
    
    private PadDocumentOwner(String username) {
        this.username = username;
    }
    
    /**
     * Create an in-memory EtherPad-synced document for the given file.
     * @param file file to edit
     */
    public synchronized void create(IFile file) throws IOException, JavaModelException {
        String path = file.getFullPath().toString();
        if (documents.containsKey(path)) {
            return;
        }
        
        if (JavaCore.isJavaLikeFileName(file.getName())) {
            JavaCore.createCompilationUnitFrom(file).getWorkingCopy(this, null);
        } else {
            documents.put(path, new PadDocument(this, file));
        }
        
        PadFunctions.create.apply(username, file, documents.get(path).get());
    }
    
    @Override public synchronized IBuffer createBuffer(final ICompilationUnit workingCopy) {
        String path = workingCopy.getPath().toString();
        if (documents.containsKey(path)) {
            return (JavaPadDocument)documents.get(path);
        }
        
        JavaPadDocument doc;
        IFile file = workingCopy.getResource() instanceof IFile ? (IFile)workingCopy.getResource() : null;
        try {
            documents.put(workingCopy.getPath().toString(), doc = new JavaPadDocument(this, file, workingCopy));
        } catch (IOException ioe) {
            ioe.printStackTrace(); // XXX
            throw new Error(ioe); // XXX
        }
        return doc;
    }
    
    @Override public IProblemRequestor getProblemRequestor(ICompilationUnit workingCopy) {
        return ((JavaPadDocument)documents.get(workingCopy.getPath().toString())).problems;
    }
    
    /**
     * Obtain the document for the given path.
     * Must already have been {@link #create}d.
     */
    public PadDocument get(String path) throws IOException {
        return documents.get(path);
    }
}