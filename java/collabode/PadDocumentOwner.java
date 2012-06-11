package collabode;

import java.io.IOException;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

import org.eclipse.core.resources.IFile;
import org.eclipse.jdt.core.*;

import collabode.collab.Collab;
import collabode.hilite.PadSemanticHighlighter;

/**
 * Stores users' in-memory versions of documents.
 * Also acts as a {@link WorkingCopyOwner} for {@linkplain ICompilationUnit working copies}.
 */
public class PadDocumentOwner extends WorkingCopyOwner {
    
    private static final ConcurrentMap<String, PadDocumentOwner> OWNERS = new ConcurrentHashMap<String, PadDocumentOwner>();
    
    /**
     * Obtain the document owner for the given user. Creates one if none.
     */
    public static PadDocumentOwner of(String username) {
        if ( ! OWNERS.containsKey(username)) {
            OWNERS.putIfAbsent(username, new PadDocumentOwner(username));
        }
        return OWNERS.get(username);
    }
    
    public final String username;
    private final Collab collaboration;
    private final ConcurrentMap<String, PadDocument> documents = new ConcurrentHashMap<String, PadDocument>();
    
    private PadDocumentOwner(String username) {
        this.username = username;
        this.collaboration = Collab.of(username);
    }
    
    /**
     * Create an in-memory document for the given file and user iff one does not exist.
     * @param file file to edit
     */
    public synchronized PadDocument create(IFile file) throws IOException, JavaModelException {
        String path = file.getFullPath().toString();
        if (documents.containsKey(path)) {
            return get(path);
        }
        
        if (JavaCore.isJavaLikeFileName(file.getName())) {
            JavaCore.createCompilationUnitFrom(file).getWorkingCopy(this, null);
            // now that the Java model is settled, install the highlighter, which causes reconciliation
            new PadSemanticHighlighter(get(path, JavaPadDocument.class));
        } else {
            documents.put(path, new PadDocument(this, collaboration.get(file)));
        }
        
        return get(path);
    }
    
    @Override public synchronized IBuffer createBuffer(final ICompilationUnit workingCopy) {
        String path = workingCopy.getPath().toString();
        if (documents.containsKey(path)) {
            return get(path, JavaPadDocument.class);
        }
        
        JavaPadDocument doc;
        IFile file = workingCopy.getResource() instanceof IFile ? (IFile)workingCopy.getResource() : null;
        try {
            documents.put(workingCopy.getPath().toString(), doc = new JavaPadDocument(this, collaboration.get(file), workingCopy));
        } catch (IOException ioe) {
            ioe.printStackTrace(); // XXX
            throw new Error(ioe); // XXX
        }
        return doc;
    }
    
    @Override public IProblemRequestor getProblemRequestor(ICompilationUnit workingCopy) {
        return get(workingCopy.getPath().toString(), JavaPadDocument.class).problems;
    }
    
    /**
     * Obtain the document for the given path.
     * Must already have been {@link #create}d.
     */
    public PadDocument get(String path) throws IOException {
        return documents.get(path);
    }
    
    /**
     * Remove the document at the given path.
     * @param path
     */
    public void remove(String path) {
        documents.remove(path);
    }
    
    /**
     * Obtain the document of a known type for the given path.
     * Must already have been {@link #create}d, and of this type.
     */
    @SuppressWarnings("unchecked")
    public <T extends PadDocument> T get(String path, Class<T> clazz) {
        return (T)documents.get(path);
    }
    
    /**
     * Obtain all the documents owned by this owner.
     */
    public PadDocument[] documents() {
        return documents.values().toArray(new PadDocument[0]);
    }
    
    /**
     * Obtain all the documents of a known type owned by this owner.
     */
    @SuppressWarnings("unchecked")
    public <T extends PadDocument> Collection<T> documents(Class<T> clazz) {
        List<T> filtered = new ArrayList<T>();
        for (PadDocument doc : documents.values()) {
            if (clazz.isInstance(doc)) {
                filtered.add((T)doc);
            }
        }
        return filtered;
    }
}
