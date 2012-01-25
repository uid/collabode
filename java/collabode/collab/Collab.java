package collabode.collab;

import java.io.IOException;
import java.util.*;
import java.util.concurrent.*;

import org.eclipse.core.resources.IFile;
import org.eclipse.core.resources.IProject;
import org.eclipse.core.runtime.CoreException;

import scala.Function1;
import collabode.PadDocument;

/**
 * A collaboration between users who share changes.
 */
public class Collab implements CollabListener {
    
    private static final Collab CHOIR = new Collab("choir");
    
    static {
        CHOIR.addListener(new CollabFeedback(CHOIR));
        CHOIR.addListener(new JavaReconciler(CHOIR)); // XXX should only operate on Java projects
        CHOIR.addListener(new JavaCommitter(CHOIR)); // XXX should only operate on Java projects
    }
    
    public static Collab of(String username) {
        return CHOIR;
    }
    
    public final String id;
    
    private final ConcurrentMap<String, CollabDocument> docsByPath = new ConcurrentHashMap<String, CollabDocument>();
    private final ConcurrentMap<String, List<CollabDocument>> docsByProj = new ConcurrentHashMap<String, List<CollabDocument>>();
    private final Set<CollabListener> listeners = new CopyOnWriteArraySet<CollabListener>();
    
    private Collab(String id) {
        this.id = id;
    }
    
    void addListener(CollabListener listener) {
        listeners.add(listener);
    }
    
    public boolean hasFile(IFile file) {
        return docsByPath.containsKey(file.getFullPath().toString());
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
        if ( ! docsByPath.containsKey(path)) {
            docsByPath.putIfAbsent(path, new CollabDocument(this, file, setPadText));
            String project = file.getProject().getFullPath().toString();
            docsByProj.putIfAbsent(project, new CopyOnWriteArrayList<CollabDocument>());
            docsByProj.get(project).add(docsByPath.get(path));
        }
        docsByPath.get(path).createPadDocument(userId);
    }
    
    public CollabDocument get(IFile file) {
        return docsByPath.get(file.getFullPath().toString());
    }
    
    public Collection<CollabDocument> get(IProject project) {
        return docsByProj.get(project.getFullPath().toString());
    }
    
    /**
     * Notify listeners that edits were synchronized from pad to documents.
     */
    public void updated(PadDocument doc) {
        for (CollabListener listener : listeners) {
            listener.updated(doc);
        }
    }
    
    /**
     * Notify listeners that edits were committed to disk.
     */
    public void committed(CollabDocument doc) {
        for (CollabListener listener : listeners) {
            listener.committed(doc);
        }
    }
    
    @Override public String toString() {
        return getClass().getSimpleName() + "<" + id + "," + docsByPath + ">";
    }
}
