package collabode.orgimport;

import java.util.concurrent.*;

import org.eclipse.core.resources.IFile;
import org.eclipse.core.runtime.CoreException;
import org.eclipse.core.runtime.OperationCanceledException;
import org.eclipse.jdt.core.ICompilationUnit;
import org.eclipse.jdt.core.ISourceRange;
import org.eclipse.jdt.core.search.TypeNameMatch;
import org.eclipse.jdt.internal.corext.codemanipulation.OrganizeImportsOperation;
import org.eclipse.jdt.internal.corext.codemanipulation.OrganizeImportsOperation.IChooseImportQuery;
import org.eclipse.text.edits.TextEdit;

import collabode.Debug;
import collabode.Workspace;

@SuppressWarnings("restriction")
public class PadImportOrganizer {
    
    private static final ConcurrentMap<String, PadImportOrganizer> ORGANIZERS = new ConcurrentHashMap<String, PadImportOrganizer>();
    
    private static final TypeNameMatch[] CANCEL = new TypeNameMatch[0];
    
    public static PadImportOrganizer of(String connectionId) {
        Debug.here(); // XXX
        if ( ! ORGANIZERS.containsKey(connectionId)) {
            ORGANIZERS.put(connectionId, new PadImportOrganizer(connectionId));
        }
        return ORGANIZERS.get(connectionId);
    }
    
    private final String connectionId;
    private final BlockingQueue<TypeNameMatch[]> choices = new ArrayBlockingQueue<TypeNameMatch[]>(1);
    
    private PadImportOrganizer(String connectionId) {
        this.connectionId = connectionId;
    }
    
    /**
     * Returns the text edit that organizes imports.
     * May block waiting for a call to {@link #chose} with user resolutions
     * of ambiguous names.
     * XXX change prompter signature if TypeNameMatch or ISourceRange not appropriate to pass around
     */
    public TextEdit createTextEdit(ICompilationUnit cu) throws CoreException, OperationCanceledException {
        Debug.here(); // XXX
        IChooseImportQuery query = new IChooseImportQuery() {
            public TypeNameMatch[] chooseImports(TypeNameMatch[][] openChoices, ISourceRange[] ranges) {
                Debug.here(); // XXX
                choices.clear();
                // XXX maybe munge openChoices or ranges first, etc.
                Workspace.scheduleTask("orgImportsPrompt", connectionId, openChoices, ranges);
                try {
                    TypeNameMatch[] userChoices = choices.poll(1, TimeUnit.MINUTES);
                    return userChoices == CANCEL ? null : userChoices;
                } catch (InterruptedException ie) {
                    return null;
                }
            }
        };
        OrganizeImportsOperation op = new OrganizeImportsOperation(cu, null, true, false, true, query);
        return op.createTextEdit(null);
    }
    
    /**
     * Report user resolutions of ambiguous class names.
     * XXX change signature if TypeNameMatch not appropriate to pass in
     */
    public void chose(TypeNameMatch[] userChoices) {
        Debug.here(); // XXX
        if (userChoices == null) {
            userChoices = CANCEL;
        }
        choices.add(userChoices);
    }
}
