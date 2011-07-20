package collabode.collab;

import java.io.IOException;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

import org.eclipse.core.resources.IFile;
import org.eclipse.core.runtime.CoreException;
import org.eclipse.text.edits.ReplaceEdit;

import scala.Function1;
import collabode.PadDocument;

/**
 * A collaboration between users who share changes.
 */
public class Collab {
    
    private static final Collab CHOIR = new Collab("choir");
    
    static {
        CHOIR.addListener(new CollabFeedback(CHOIR));
        CHOIR.addListener(new JavaCommitter(CHOIR)); // XXX should only operate on Java projects
    }
    
    public static Collab of(String username) {
        return CHOIR;
    }
    
    public final String id;
    
    private final ConcurrentMap<String, CollabDocument> docs = new ConcurrentHashMap<String, CollabDocument>();
    private final Set<CollabListener> listeners = new HashSet<CollabListener>();
    
    private Collab(String id) {
        this.id = id;
    }
    
    void addListener(CollabListener listener) {
        listeners.add(listener);
    }
    
    public boolean hasFile(IFile file) {
        return docs.containsKey(file.getFullPath().toString());
    }
    
    /**
     * Create a new document in the collaboration.
     * Creates a {@link CollabDocument} for the given file, and a {@link PadDocument} for the given user.
     * 
     * @param userId user ID
     * @param file file
     * @param rev current head revision number
     * @param setPadText function to set the pad text and obtain the new head revision number
     */
    public synchronized void createDocument(String userId, IFile file, int rev, Function1<String,Double> setPadText) throws IOException, CoreException {
        final String path = file.getFullPath().toString();
        if ( ! docs.containsKey(path)) {
            docs.putIfAbsent(path, new CollabDocument(this, file, setPadText));
        }
        docs.get(path).createPadDocument(userId);
    }
    
    public CollabDocument get(IFile file) {
        return docs.get(file.getFullPath().toString());
    }
    
    /**
     * Notify listeners that edits were synchronized from pad to documents.
     */
    synchronized void syncedUnionCoordinateEdits(PadDocument doc, Collection<ReplaceEdit> edits) {
        for (CollabListener listener : listeners) {
            listener.updated(doc);
        }
    }
    
    /**
     * Notify listeners that edits were committed to disk.
     */
    synchronized void committedDiskCoordinateEdits(CollabDocument doc, Collection<ReplaceEdit> edits) {
        for (CollabListener listener : listeners) {
            listener.committed(doc);
        }
    }
}

/**
 * Collaboration event listener.
 */
interface CollabListener {
    void updated(PadDocument doc);
    void committed(CollabDocument doc);
}
